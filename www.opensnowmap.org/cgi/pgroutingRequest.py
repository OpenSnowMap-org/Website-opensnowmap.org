
import json
import psycopg2
import pprint
import pdb

pp = pprint.PrettyPrinter(indent=4)
DEBUG = True

def routes(query):
    resp={}

    db='pistes_api_osm2pgsql'
    global conn
    global cur
    # ~ try:
    conn = psycopg2.connect("dbname="+db+" user=osmuser")
    cur = conn.cursor()
    # ~ except:
        # ~ pass
        
    cs=query.split(';')
    coords=[]
    for c in cs:
        coord={}
        coord['lon']=float(c.split(',')[0])
        coord['lat']=float(c.split(',')[1])
        coords.append(coord)
    
    for c in coords:
        waypoint=snap(c)
        if waypoint:
            if 'waypoints' not in resp:
                resp['waypoints']=[]
            wpt={}
            wpt['edge_id'], wpt['way_osm_id'], wpt['coord'], wpt['ratio'] = waypoint
            resp['waypoints'].append(wpt)
        else:
            conn.close()
            return resp
    # ~ if (DEBUG):
      # ~ print(resp)
    
    for i in range(len(resp['waypoints']) -1):
        leg = route(resp['waypoints'][i],resp['waypoints'][i+1])
        if (DEBUG):
          print("leg: "+str(leg))
        if leg['geometry'] != '':
            if 'routes' not in resp:
                resp['routes']=[]
                resp['routes'].append({})
            if 'legs' not in resp['routes'][0]:
                resp['routes'][0]['legs']=[]
            resp['routes'][0]['legs'].append(leg)
        else:
            conn.close()
            return {}
    # ~ if (DEBUG):
      # ~ print(resp)
    # re-compute each step distance
    
    distance=0
    for leg in resp['routes'][0]['legs']:
        for step in leg['steps']:
            step['distance']=step['length']
            distance += step['length']
        leg['distance']=distance
    resp['routes'][0]['distance']=distance
            
    # compute the whole route geometry
    enc_pol_sql_cat=''
    distance=0
    for leg in resp['routes'][0]['legs']:
        geo = leg['geometry']
        if(DEBUG): pp.pprint(geo)
        enc_pol_sql_cat += 'ST_LineFromEncodedPolyline(\''+geo+'\'),'
    
    enc_pol_sql_cat = enc_pol_sql_cat[:-1]
    query= ("""
    SELECT ST_AsEncodedPolyline(ST_LineMerge(ST_Collect(ARRAY[%s])));
    """ % (enc_pol_sql_cat,))
    
    cur.execute(query)
    enc_pol = cur.fetchone()[0]
    resp['routes'][0]['geometry'] = enc_pol
    
    conn.close()
    if len(resp['routes']) == 1 and len(resp['routes'][0]['legs']) == len(resp['waypoints'])-1:
        return resp
    else:
        return {}

def route (wpt1, wpt2):
    leg={}
    leg['length']=0
    leg['steps']=[]
    leg['geometry']={}
    leg['geometry']=''
    query = ("""
    select * FROM pgr_trsp(
    'SELECT CAST(id AS INT4) AS id , CAST(source AS INT4), CAST(target AS INT4), cost, reverse_cost 
    FROM lines_noded
    WHERE geom && ST_Expand(
        (SELECT ST_Collect(geom) FROM lines_noded WHERE id IN( %s,%s ) ) , 0.1) 
    ',
     %s,%s,%s,%s, 
     true, true
    );
    """ % ( wpt1['edge_id'],
            wpt2['edge_id'],
            wpt1['edge_id'],
            wpt1['ratio'],
            wpt2['edge_id'],
            wpt2['ratio'], ))
    cur.execute(query)
    pgr = cur.fetchall()
    if(DEBUG): 
        print("pgr: \n")
        pp.pprint(pgr)

    """
    seq, id1 (node), id2 (edge), cost
    [(0, -1, 44640, 279.111767683319),
    (1, -2, -1, 0.0)]
 
    [   (0, -1, 44640, 407.395229956857),
    (1, 59439, 386348, 39.3195107816717),
    (2, -2, -1, 0.0)]
    
    [   (0, -1, 48415, 463.229257602512),
    (1, 45853, 48414, 1140.50141060662),
    (2, 42851, 34474, 816.039162049905),
    (3, 43909, 45001, 300.405949609085),
    (4, -2, -1, 0.0)]
    """  
        
        
    for p in pgr[:-1]:
        step={}
        query = ("""
        SELECT old_id
        FROM lines_noded
        WHERE id = %s
        ;
        """ % (p[2],) )
        
        cur.execute(query)
        osm_id = cur.fetchone()[0]
        if(DEBUG): 
            print(p[2], osm_id)
        
        step['way_osm_id']=osm_id
        step['name']=osm_id
        step['edge_id']=p[2]
        
        query = ("""
        SELECT length_m
        FROM lines_noded
        WHERE id = %s
        ;
        """ % (p[2],))
        cur.execute(query)
        l = cur.fetchone()[0]
            
        step['length']=l
        leg['steps'].append(step)
    
    edges_ids=''
    for p in pgr[:-1]:
        edges_ids += str(p[2])+','
    edges_ids = edges_ids[:-1]
    # Compute overall leg geometry
    if len(pgr) == 2 : # Routing along a single edge
        query = ("""
                SELECT ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)),
                       ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326))
                FROM lines_noded WHERE id = %s;
                """ % ( wpt1['coord']['lon'],
                        wpt1['coord']['lat'],
                        wpt2['coord']['lon'],
                        wpt2['coord']['lat'],
                        pgr[0][2]
                        ))
                        
        cur.execute(query)
        r1, r2 = cur.fetchone()
        if r2 > r1:
            ratio = str(r1) + ',' + str(r2)
        else:
            ratio = str(r2) + ',' + str(r1)
        query = ("""
                SELECT ST_AsEncodedPolyline(ST_LineSubstring(geom, %s)),
                    ST_AsText(ST_LineSubstring(geom, %s))
                FROM lines_noded WHERE id = %s;
                """ % ( ratio,
                        ratio,
                        pgr[0][2]
                        ))
        cur.execute(query)
        pol, wkt = cur.fetchone()
        leg['geometry']=pol
        
        leg['steps'][0]['length']= leg['steps'][0]['length'] * abs(r2-r1)
    
    if len(pgr) > 2 : # len(pgr) > 2
        # Fist computing first edge ratio, knowing that the edge is not neccessarily 
        # in the direction of the way:
        query = ("""
            WITH end_first_edge AS (
                SELECT ST_EndPoint(geom) 
                AS geom
                FROM lines_noded WHERE id = %s
                ),
                next_vertice AS (
                SELECT the_geom 
                AS geom
                FROM lines_noded_vertices_pgr WHERE id =  %s
                ),
                ratio AS (
                SELECT ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326))::float as r
                FROM lines_noded WHERE id = %s
                )
            SELECT CASE
            WHEN 
                ST_Equals(end_first_edge.geom, next_vertice.geom)
            THEN
                (ratio.r, 1.0)
            ELSE
                (0.0,ratio.r)
            END
            FROM end_first_edge CROSS JOIN next_vertice CROSS JOIN ratio;
                """ % ( pgr[0][2],
                        pgr[1][1],
                        wpt1['coord']['lon'],
                        wpt1['coord']['lat'],
                        pgr[0][2]))
        
        cur.execute(query)
        first_ratio = cur.fetchone()[0].strip('()')
        
        if first_ratio.find('0.0') != -1 :
            r = float(first_ratio[1:-2].split(',')[1])
            leg['steps'][0]['length']= leg['steps'][0]['length'] * r
        else:
            r = float(first_ratio[1:-2].split(',')[0])
            leg['steps'][0]['length']= leg['steps'][0]['length'] * ( 1 - r)
            
        # Same for last edge
        query = ("""
            WITH start_last_edge AS (
                SELECT ST_StartPoint(geom) 
                AS geom
                FROM lines_noded WHERE id = %s
                ),
                prev_vertice AS (
                SELECT the_geom 
                AS geom
                FROM lines_noded_vertices_pgr WHERE id =  %s
                ),
                ratio AS (
                SELECT ST_LineLocatePoint(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326))::float as r
                FROM lines_noded WHERE id = %s
                )
            SELECT CASE
            WHEN 
                ST_Equals(start_last_edge.geom, prev_vertice.geom)
            THEN
                (0.0,ratio.r)
            ELSE
                (ratio.r, 1.0)
            END
            FROM start_last_edge CROSS JOIN prev_vertice CROSS JOIN ratio;
                """ % ( pgr[-2][2],
                        pgr[-2][1],
                        wpt2['coord']['lon'],
                        wpt2['coord']['lat'],
                        pgr[-2][2]))
        
        cur.execute(query)
        last_ratio = cur.fetchone()[0].strip('()')
        
        if last_ratio.find('0.0') != -1:
            r = float(last_ratio[1:-2].split(',')[1])
            leg['steps'][-1]['length']= leg['steps'][-1]['length'] * r
        else:
            r = float(last_ratio[1:-2].split(',')[0])
            leg['steps'][-1]['length']= leg['steps'][-1]['length'] * ( 1 - r)
            
        if len(pgr) > 3:
            query = ("""
                WITH
                    start_edge AS (
                        SELECT ST_LineSubstring(ST_SnapToGrid(geom,0.0000001), %s)
                        AS geom
                        FROM lines_noded WHERE id = %s
                    ),
                    end_edge AS (
                        SELECT ST_LineSubstring(ST_SnapToGrid(geom,0.0000001), %s)
                        AS geom
                        FROM lines_noded WHERE id = %s
                    ),
                    middle_edges AS (
                        SELECT
                            ST_LineMerge(ST_Collect(ST_SnapToGrid(geom,0.0000001)))
                        AS geom
                        FROM lines_noded WHERE id IN (%s)
                    )
                SELECT 
                    ST_AsEncodedPolyline(
                            ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, middle_edges.geom, end_edge.geom]))
                    ),
                    ST_AsText(
                        ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, middle_edges.geom, end_edge.geom]))
                    )
                FROM start_edge , middle_edges , end_edge
                ;
                """ % ( first_ratio,
                        pgr[0][2],
                        last_ratio,
                        pgr[-2][2],
                        ','.join(edges_ids.split(',')[1:-1])
                        )
                )
            if (DEBUG): 
              print(query)
            cur.execute(query)
            pol, wkt = cur.fetchone()
            leg['geometry']=pol
            if (DEBUG): 
              print(wkt)
        else: # only two edges
            query = ("""
                WITH
                    start_edge AS (
                        SELECT ST_LineSubstring(ST_SnapToGrid(geom,0.0000001), %s)
                        AS geom
                        FROM lines_noded WHERE id = %s
                    ),
                    end_edge AS (
                        SELECT ST_LineSubstring(ST_SnapToGrid(geom,0.0000001), %s)
                        AS geom
                        FROM lines_noded WHERE id = %s
                    )
                SELECT 
                    ST_AsEncodedPolyline(
                            ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, middle_edges.geom, end_edge.geom]))
                    ),
                    ST_AsText(
                        ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, middle_edges.geom, end_edge.geom]))
                    )
                FROM start_edge CROSS JOIN end_edge
                ;
                """ % ( first_ratio,
                        pgr[0][2],
                        last_ratio,
                        pgr[-2][2]
                        )
                )
            cur.execute(query)
            pol, wkt = cur.fetchone()
            leg['geometry']=pol
    return leg
    
def snap(c):
    osmid=1
    coord={}
    ratio=1.0
    
    # define the bbox where requesting the data
    lon=c['lon']
    lat=c['lat']
    bottom=c['lat']-0.05
    top=c['lat']+0.05
    left=c['lon']-0.05
    right=c['lon']+0.05
    
    
    
    cur.execute("""
    select id, old_id, ST_LineLocatePoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
    FROM lines_noded
    WHERE geom && st_setsrid('BOX3D(%s %s,%s %s)'::box3d, 4326)  \
    ORDER BY ST_Distance(geom, ST_GeometryFromText('POINT(%s %s)', 4326)) LIMIT 1;
    """ % (lon, lat, left, bottom, right, top, lon, lat) )
    edid, osmid, ratio = cur.fetchone()
    
    cur.execute("""
    select ST_X(ST_LineInterpolatePoint(geom,%s)),
    ST_Y(ST_LineInterpolatePoint(geom,%s))
    FROM lines_noded
    WHERE id = %s  
    LIMIT 1;
    """ % (ratio,ratio,edid) )
    coord['lon'], coord['lat'] = cur.fetchone()
    return (edid, str(osmid), coord, ratio)


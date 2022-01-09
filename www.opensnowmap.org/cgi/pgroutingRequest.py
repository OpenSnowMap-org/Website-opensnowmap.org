# Python 3 server example

import json
import psycopg2
import pprint
import pdb

pp = pprint.PrettyPrinter(indent=4)
DEBUG = True

def routes(query):
    if (DEBUG): print('Query: '+query)
    resp={}

    db='routing'
    global conn
    global cur
    global pp
    pp = pprint.PrettyPrinter(indent=4)
    
    try:
        conn = psycopg2.connect("dbname="+db+" user=admin")
        cur = conn.cursor()
    except:
        return
        
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
    
    for i in range(len(resp['waypoints']) -1):
        leg = route(resp['waypoints'][i],resp['waypoints'][i+1])
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
    'SELECT CAST(gid AS INT4) AS id , CAST(source AS INT4), CAST(target AS INT4), cost, reverse_cost 
    FROM ways
    WHERE the_geom && ST_Expand(
        (SELECT ST_Collect(the_geom) FROM ways WHERE gid IN( %s,%s ) ) , 0.1) 
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
    if(DEBUG): pp.pprint(pgr)

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
        SELECT osm_id
        FROM ways
        WHERE gid = %s
        ;
        """ % (p[2],) )
        
        cur.execute(query)
        osm_id = cur.fetchone()[0]
        step['way_osm_id']=osm_id
        step['name']=osm_id
        step['edge_id']=p[2]
        
        query = ("""
        SELECT length_m
        FROM ways
        WHERE gid = %s
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
                SELECT ST_LineLocatePoint(the_geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)),
                       ST_LineLocatePoint(the_geom, ST_SetSRID(ST_MakePoint(%s,%s),4326))
                FROM ways WHERE gid = %s;
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
                SELECT ST_AsEncodedPolyline(ST_LineSubstring(the_geom, %s)),
                    ST_AsText(ST_LineSubstring(the_geom, %s))
                FROM ways WHERE gid = %s;
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
                SELECT ST_EndPoint(the_geom) 
                AS geom
                FROM ways WHERE gid = %s
                ),
                next_vertice AS (
                SELECT the_geom 
                AS geom
                FROM ways_vertices_pgr WHERE id =  %s
                ),
                ratio AS (
                SELECT ST_LineLocatePoint(the_geom, ST_SetSRID(ST_MakePoint(%s,%s),4326))::float as r
                FROM ways WHERE gid = %s
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
                SELECT ST_StartPoint(the_geom) 
                AS geom
                FROM ways WHERE gid = %s
                ),
                prev_vertice AS (
                SELECT the_geom 
                AS geom
                FROM ways_vertices_pgr WHERE id =  %s
                ),
                ratio AS (
                SELECT ST_LineLocatePoint(the_geom, ST_SetSRID(ST_MakePoint(%s,%s),4326))::float as r
                FROM ways WHERE gid = %s
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
                        SELECT ST_LineSubstring(the_geom, %s)
                        AS geom
                        FROM ways WHERE gid = %s
                    ),
                    end_edge AS (
                        SELECT ST_LineSubstring(the_geom, %s)
                        AS geom
                        FROM ways WHERE gid = %s
                    ),
                    middle_edges AS (
                        SELECT ST_LineMerge(ST_Collect(the_geom))
                        AS geom
                        FROM ways WHERE gid IN (%s)
                    )
                SELECT ST_AsEncodedPolyline(ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, middle_edges.geom, end_edge.geom]))),
                ST_AsText(ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, middle_edges.geom, end_edge.geom])))
                FROM start_edge CROSS JOIN middle_edges CROSS JOIN end_edge
                ;
                """ % ( first_ratio,
                        pgr[0][2],
                        last_ratio,
                        pgr[-2][2],
                        ','.join(edges_ids.split(',')[1:-1])
                        )
                )
            cur.execute(query)
            pol, wkt = cur.fetchone()
            leg['geometry']=pol
        else: # only two edges
            query = ("""
                WITH
                    start_edge AS (
                        SELECT ST_LineSubstring(the_geom, %s)
                        AS geom
                        FROM ways WHERE gid = %s
                    ),
                    end_edge AS (
                        SELECT ST_LineSubstring(the_geom, %s)
                        AS geom
                        FROM ways WHERE gid = %s
                    )
                SELECT ST_AsEncodedPolyline(ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, end_edge.geom]))),
                ST_AsText(ST_LineMerge(ST_Collect(ARRAY[start_edge.geom, end_edge.geom])))
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
    select gid, osm_id, ST_LineLocatePoint(the_geom, ST_GeometryFromText('POINT(%s %s)', 4326))
    FROM ways
    WHERE the_geom && st_setsrid('BOX3D(%s %s,%s %s)'::box3d, 4326)  \
    ORDER BY ST_Distance(the_geom, ST_GeometryFromText('POINT(%s %s)', 4326)) LIMIT 1;
    """ % (lon, lat, left, bottom, right, top, lon, lat) )
    edgid, osmid, ratio = cur.fetchone()
    
    cur.execute("""
    select ST_X(ST_LineInterpolatePoint(the_geom,%s)),
    ST_Y(ST_LineInterpolatePoint(the_geom,%s))
    FROM ways
    WHERE gid = %s  
    LIMIT 1;
    """ % (ratio,ratio,edgid) )
    coord['lon'], coord['lat'] = cur.fetchone()
    return (edgid, str(osmid), coord, ratio)


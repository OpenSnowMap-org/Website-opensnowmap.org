#!/usr/bin/python
#
#
# Piste search API

"""
Request type
	* name=xxx
		return pistes and sites whose name is or is close to 'xxx'. By default
		results are ordered ba orthographic similarity with the request.
	* bbox=left, bottom, right, top
		return pistes and sites whose bounding box intersects the bbox.
	* closest=lon, lat
		return the closest way to (lon, lat). Use after a click on the map, for 
		instance.
	* ids=id1, id2, ...
		return the sites and pistes in the osm_id list order. Usefull to create a 
		routing topo client-side, for instance
	* members=id
		return the pistes member of the relation osm_id (site or route relation)
		
Result type
At least one result type is mandatory
	* list=true
		return a rich json dictionnary with pistes attributes, bbox, ...
	* ids_only=true
		return a json dictionnary containing relations and ways osm_ids only
		
Request modifiers
	* limit=false
		By default, the server won't handle more than 50 osm ways or relations
		to ensure a fast (<5s) answer, and an informationnal message is given.
		Final results can be less than 50 if group=true is used. This limit can
		be overriden by limit=false.
	* sort_alpha=true
		sort the result in alphabetical order
	* group=true
		Ask the server to group the results as 'pistes': 
			Way members of a route relation are discarded if the relation is 
			part of the result.
			Ways that touches each other, have a name, share the same name and
			the same piste:type and piste:difficulty are stitched together.
			This allow to return simpler result hiding the osm data complexity.
		This add complexity and response time.
	* geo=true
		Return the results geometry as an arrray of encoded-polyline.
	* parent=true
		if 'members' request type, return the parent as first result.
	
"""

import psycopg2
import pdb
import re
import json
import urllib
from cStringIO import StringIO

import math

"""
http://beta.opensnowmap.org/search?name=Vourbey&ids_only=true
http://beta.opensnowmap.org/search?name=Pauvre Conche&ids_only=true
http://beta.opensnowmap.org/search?bbox=5,46,6,47&ids_only=true
http://beta.opensnowmap.org/search?bbox=6.05,46.38,6.11,46.42&ids_only=true
http://beta.opensnowmap.org/search?closest=5,46&ids_only=true
http://beta.opensnowmap.org/search?name=La%20Petite%20Grand&geo=true&list=true
http://beta.opensnowmap.org/search?group=true&geo=true&sort_alpha=true&list=true&ids=32235255,29283990,8216510
"""
LIMIT = 50
HARDLIMIT = 500

DEBUG=True

def requestPistes(request):

	db='pistes_osm2pgsql'
	global conn
	global cur
	# ~ try:
	conn = psycopg2.connect("dbname="+db+" user=yves")
	cur = conn.cursor()

	if (DEBUG): print(request)
	NAME=False
	CLOSEST=False
	BBOX=False
	ID_REQUEST=False
	MEMBERS_REQUEST=False
	PARENT_ID=False
	LIST=False
	TOPO_REQUEST=False
	SITE_STATS_REQUEST=False
	GEO=False
	IDS_ONLY=False
	SORT_ALPHA=False
	CONCAT=False
	global LIMIT 
	LIMIT_REACHED = False
	#==================================================
	# handle GET request paramaters
	
	if (DEBUG): print(request)
  
	if request.find('name=') !=-1:
		NAME = True
		SORT_ALPHA=False
		# query: ...name=someplace&...
		name=request.split('name=')[1]
		if name.find('&'): name=name.split('&')[0]
		#name='the%20blue slope'
		
	if request.find('closest=') !=-1:
		CLOSEST = True
		
		# query: ...closest=lon,lat&... or ...closest=lon; lat&...
		point=request.split('closest=')[1]
		if point.find('&'): point=point.split('&')[0].replace(';',',').replace(' ','')
		center={}
		center['lon']=float(point.split(',')[0])
		center['lat']=float(point.split(',')[1])
		# center={lat: 42.36, lon: 6.34}
		
	if request.find('ids=') !=-1:
		ID_REQUEST = True
		# query: ...ids=id1, id2, id3...
		ids=request.split('ids=')[1]
		if ids.find('&'): ids=ids.split('&')[0]
		# ids='id1, id2, ...'
		
	if request.find('ids_ways=') !=-1:
		TOPO_REQUEST = True
		# query: ...ids=id1, id2, id3...
		ids=request.split('ids_ways=')[1]
		if ids.find('&'): ids=ids.split('&')[0]
		# ids='id1, id2, ...'
		
	if request.find('members=') !=-1:
		MEMBERS_REQUEST = True
		# query: ...members=id1...
		ids=request.split('members=')[1]
		if ids.find('&'): ids=ids.split('&')[0]
		if request.find('parent=true') !=-1:
			PARENT_ID = ids
	
	if request.find('site-stats=') !=-1:
		SITE_STATS_REQUEST = True
		# query: ...members=id1...
		ids=request.split('site-stats=')[1]
		if ids.find('&'): ids=ids.split('&')[0]
	
	if request.find('bbox=') !=-1:
		BBOX = True
		# query: ...bbox=left, bottom, right, top&... 
		bbox=request.split('bbox=')[1]
		if bbox.find('&'): bbox=bbox.split('&')[0].replace(';',',').replace(' ','').split(',')
		for b in bbox: b=float(b)
		# bbox=[left, bottom, right, top]
		
	if request.find('group=true') !=-1:
		CONCAT = True
		# query: ...group=true... 
	
	if request.find('limit=false') !=-1:
		LIMIT = 100000000
	
	if request.find('ids_only=true') !=-1:
		IDS_ONLY = True
		# query: ...ids=true...
	
	elif request.find('topo=true') !=-1:
		TOPO_REQUEST = True
		# query: ...list=true... 
		if request.find('geo=true') !=-1:
			GEO = True
			# query: ...geo=true... 
	
	elif request.find('list=true') !=-1:
		LIST = True
		# query: ...list=true... 
		if request.find('geo=true') !=-1:
			GEO = True
			# query: ...geo=true... 
		if request.find('sort_alpha=true') !=-1:
			SORT_ALPHA = True
		
	
	#==================================================
	# basic queries: create the dict of elements osm ids corresponding to the query
	if ID_REQUEST: 
		site_ids, route_ids, way_ids = queryByIds(ids)
	elif TOPO_REQUEST:
		site_ids=[]
		route_ids=[]
		way_ids = ids.split(',')
	elif MEMBERS_REQUEST: 
		site_ids, route_ids, way_ids = queryMembersById(ids, PARENT_ID)
	elif BBOX:
		site_ids, route_ids, way_ids, LIMIT_REACHED= queryByBbox(bbox)
	elif CLOSEST:
		site_ids, route_ids, way_ids = queryClosest(center)
		snap={}
		snap['lon'], snap['lat'] = snapToWay(way_ids[0],center)
	elif NAME:
		site_ids, route_ids, way_ids, LIMIT_REACHED= queryByName(name)
	elif SITE_STATS_REQUEST:
		stats=getSiteStats(ids)
	else:
		
		response_body=json.dumps({request:environ['QUERY_STRING']}, sort_keys=True, indent=4)
		status = '400 Bad Request'
		
		return [response_body]
	
	if TOPO_REQUEST:
		IDS = {}
		way_ids=[[w] for w in way_ids]
		IDS['sites']=site_ids
		IDS['routes']=route_ids
		IDS['ways']=way_ids
	elif SITE_STATS_REQUEST: pass
	else:
		IDS=buildIds(site_ids, route_ids, way_ids, CONCAT)
		
	
	# Whatever the query was, we must now have an object like this:
	"""
	IDS={
		sites : [id, id, ...]
				
		routes : [id, id, ...]
		ways : [[id, id], ...] # ways can be grouped later if similar enough 
		(touches each other, same name, same type, same difficulty)
	}
	"""
	#==================================================
	# build the response
	
	if IDS_ONLY:
		IDS['generator']="Opensnowmap.org piste search API"
		IDS['copyright']= "The data included in this document is from www.openstreetmap.org. It is licenced under ODBL, and has there been collected by a large group of contributors."
		if LIMIT_REACHED:
			IDS['limit_reached']= True;
			IDS['info']= 'Your request size exceed the API limit, results are truncated';
		if CLOSEST:
			IDS['snap']=snap
		response_body=json.dumps(IDS, sort_keys=True, indent=4)
		status = '200 OK'
		
		cur.close()
		conn.close()
		return [response_body]
		
	elif LIST:
		topo=makeList(IDS,GEO)
		# sort by name
		if SORT_ALPHA:
			topo['sites'].sort(key=lambda k: nameSorter(k['name']))
			topo['pistes'].sort(key=lambda k: nameSorter(k['name']))
		
		# number the results
		i=0
		for s in topo['sites']:
			s['result_index']=i
			i+=1
		i=0
		for s in topo['pistes']:
			s['result_index']=i
			i+=1
		
		topo['generator']="Opensnowmap.org piste search API"
		topo['copyright']= "The data included in this document is from www.openstreetmap.org. It is licenced under ODBL, and has there been collected by a large group of contributors."
		
		if LIMIT_REACHED:
			topo['limit_reached']= True;
			topo['info']= 'Your request size exceed the API limit, results are truncated';
		
		if CLOSEST:
			topo['snap']=snap
		
		response_body=json.dumps(topo, sort_keys=True, indent=4)
		status = '200 OK'
		
		cur.close()
		conn.close()
		return [response_body]
	
	elif SITE_STATS_REQUEST:
		stats['generator']="Opensnowmap.org piste search API"
		stats['copyright']= "The data included in this document is from www.openstreetmap.org. It is licenced under ODBL, and has there been collected by a large group of contributors."
		
		response_body=json.dumps(stats, sort_keys=True, indent=4)
		status = '200 OK'
		cur.close()
		conn.close()
		return [response_body]
		
	elif TOPO_REQUEST :
		topo=makeList(IDS,GEO)
		
		topo=concatWaysByAttributes(topo)
		
		# number the results
		i=0
		for s in topo['sites']:
			s['result_index']=i
			i+=1
		i=0
		for s in topo['pistes']:
			s['result_index']=i
			i+=1
		
		topo['generator']="Opensnowmap.org piste search API"
		topo['copyright']= "The data included in this document is from www.openstreetmap.org. It is licenced under ODBL, and has there been collected by a large group of contributors."
		
		if LIMIT_REACHED:
			topo['limit_reached']= True;
			topo['info']= 'Your request size exceed the API limit, results are truncated';
		
		
		status = '200 OK'
		response_body=json.dumps(topo, sort_keys=True, indent=4)
		cur.close()
		conn.close()
		return [response_body]
	else:
		response_body=json.dumps({'request': environ['QUERY_STRING']}, sort_keys=True, indent=4)
		status = '400 Bad Request'
		
		cur.close()
		conn.close()
		return [response_body]

#==================================================
def queryMembersById(ids, PARENT_ID):
	
	
	cur.execute("""
	SELECT member_id FROM relations 
	WHERE relation_id in (%s);
	"""
	% (ids,))
	ids = cur.fetchall()
	ids = ','.join([str(long(x[0])) for x in ids])
	
	conn.commit()
	if PARENT_ID:
		print PARENT_ID
		ids=PARENT_ID+','+ids #insert the parent osm_id in the list
	site_ids, route_ids, way_ids=queryByIds(ids)
	
	return site_ids, route_ids, way_ids
	
def queryByIds(ids):
	
	cur.execute("""
	SELECT osm_id FROM sites 
	WHERE osm_id in (%s)
	"""
	% (ids,))
	site_ids = cur.fetchall()
	site_ids = [x[0] for x in site_ids]
	conn.commit()
	
	cur.execute("""
	SELECT osm_id FROM routes 
	WHERE osm_id in (%s)
	"""
	% (ids,))
	route_ids = cur.fetchall()
	route_ids = [x[0] for x in route_ids]
	conn.commit()
	
	cur.execute("""
	SELECT osm_id FROM lines
	WHERE osm_id in (%s);
	"""
	% (ids,))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	conn.commit()
	
	
	return site_ids, route_ids, way_ids

def queryByName(name):
	LIMIT_REACHED = False
	name=name.replace(' ','&').replace('%20','&').replace('"', '&').replace("'", "&")
	
	# set limit for pg_trgm
	cur.execute("""select set_limit(0.4);""")
	conn.commit()
	
	cur.execute("""
	SELECT osm_id FROM sites 
	WHERE name %% '%s'
	ORDER by similarity(name,'%s');
	"""
	% (name,name))
	site_ids = cur.fetchall()
	site_ids = [x[0] for x in site_ids]
	conn.commit()
	
	cur.execute("""
	SELECT osm_id FROM routes 
	WHERE name %% '%s'
	ORDER by similarity(name,'%s');
	"""
	% (name,name))
	route_ids = cur.fetchall()
	route_ids = [x[0] for x in route_ids]
	conn.commit()
	
	cur.execute("""
	SELECT osm_id FROM lines
	WHERE name %% '%s'
	ORDER by similarity(name,'%s');
	"""
	% (name,name))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	conn.commit()
	# TODO also add areas
	
	if len(site_ids) > LIMIT:
		site_ids=site_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(route_ids) > LIMIT:
		route_ids=route_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(way_ids) > LIMIT:
		way_ids=way_ids[:LIMIT]
		LIMIT_REACHED = True
	
	return site_ids, route_ids, way_ids, LIMIT_REACHED

def queryClosest(center):
	
	cur.execute("""
	SELECT osm_id FROM lines
	ORDER BY 
	ST_Distance(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)) ASC
	LIMIT 1;
	"""
	
	# ~ WHERE (tags::json->>'site' is null) AND (tags::json->>'landuse' is null)
	% (center['lon'],center['lat']))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	
	
	return [], [], way_ids

def snapToWay(ID, center):
	
	
	cur.execute("""
	SELECT
		ST_X(
			ST_LineInterpolatePoint(geom,
				st_linelocatepoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
			)
		),
		ST_Y(
			ST_LineInterpolatePoint(geom,
				st_linelocatepoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
			)
		)
	FROM lines
	WHERE osm_id=%s;
	"""
	% (center['lon'],center['lat'],center['lon'],center['lat'],ID))
	way_ids = cur.fetchall()
	
	
	return way_ids[0][0],way_ids[0][1]

def queryByBbox(bbox):
	LIMIT_REACHED = False
	if (LIMIT < HARDLIMIT): 
		l=LIMIT
	else:
		l=HARDLIMIT
	site_ids=[]
	route_ids=[]
	
	cur.execute("""
	SELECT osm_id FROM sites 
	WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
	LIMIT %s;
	"""
	% (bbox[0],bbox[1],bbox[2],bbox[3],l))
	site_ids = cur.fetchall()
	site_ids = [x[0] for x in site_ids]
	cur.execute("""
	SELECT osm_id FROM routes 
	WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
	LIMIT %s;
	"""
	% (bbox[0],bbox[1],bbox[2],bbox[3],l))
	route_ids = cur.fetchall()
	route_ids = [x[0] for x in route_ids]
	
	cur.execute("""
	SELECT osm_id FROM lines
	WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
	LIMIT %s;
	"""
	% (bbox[0],bbox[1],bbox[2],bbox[3],l))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	conn.commit()
	
	if len(site_ids) >= LIMIT:
		site_ids=site_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(route_ids) >= LIMIT:
		route_ids=route_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(way_ids) >= LIMIT:
		way_ids=way_ids[:LIMIT]
		LIMIT_REACHED = True
	
	return site_ids, route_ids, way_ids, LIMIT_REACHED

def buildIds(site_ids, route_ids, way_ids, CONCAT):
	
	if CONCAT:
		if len(way_ids):
			# remove duplicates: way member of a route #of same piste:type
			wayList = ','.join([str(long(i)) for i in way_ids])
			to_remove=[]
			for i in route_ids:
				
				cur.execute(
				"""
				SELECT osm_id FROM lines
				WHERE 
				(osm_id in (
						SELECT member_id FROM relations 
						WHERE relation_id =%s and member_id in (%s)
						)
					AND
						piste_type = (
							SELECT piste_type FROM routes
							WHERE osm_id = %s
							))
				OR (
					piste_type is null
					AND lift_type is null
				);
				"""
				%(long(i),wayList,long(i)))
				
				to_remove.extend(cur.fetchall())
				conn.commit()
			to_remove=[t[0] for t in to_remove] 
			clean_way_ids=[]
			for wid in way_ids:
				if wid not in to_remove: clean_way_ids.append(wid)
			way_ids=clean_way_ids
		if len(way_ids)==1 : way_ids=[way_ids]
		if len(way_ids)>1:	# group ways
			
			wayList = ','.join([str(long(i)) for i in way_ids])
			cur.execute(
			"""
			SELECT distinct array_agg(distinct a.osm_id)
			FROM lines as a, lines as b
			WHERE 
				a.osm_id in (%s)
				and b.osm_id in (%s)
				and (a.name <> '')
			GROUP BY 
				a.name,
				ST_touches(a.geom,b.geom),
				a.tags::json->>'piste:difficulty',
				a.tags::json->>'piste:grooming',
				a.lift_type
			HAVING
				ST_touches(a.geom,b.geom)
			"""
			%(wayList,wayList))
			way_ids=cur.fetchall()
			conn.commit()
			
			way_ids = [list(set(x[0])) for x in way_ids]
			
			cur.execute(
			"""
			SELECT osm_id
			FROM lines
			WHERE
				osm_id in (%s);
			"""
			%(wayList,))
			way_ids2=cur.fetchall()
			conn.commit()
			
			if len(way_ids2):
				way_ids2 = [[x[0]] for x in way_ids2]
			
			way_ids.extend(way_ids2)
			
			# ST_Touches() does not extend beyond nearest neighbors, nor the first 
			# query magical, we have now to re-group further by id
			#~ way_ids=list(concatPistes(way_ids))
			way_ids=concatPistes(way_ids)
	else: way_ids=[[w] for w in way_ids]
	IDS = {}
	IDS['sites']=site_ids
	IDS['routes']=route_ids
	IDS['ways']=way_ids
	
	return IDS

def makeList(IDS, GEO):
	
	if GEO: geomS=',ST_AsText(ST_buffer(geom,0.01))'
	else: geomS=''
	if GEO: geomR=',ST_AsText(geom)'
	else: geomR=''
	if GEO: geomW=',ST_AsText(ST_Collect(ST_LineMerge(geom)))'
	else: geomW=''

	topo={}

	## SITES
	topo['sites']=[]
	for osm_id in IDS['sites']:
		osm_id=str(long(osm_id))
		cur.execute("""
		SELECT 
			osm_id,
			name,
			piste_type,
			ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
			site_type,
			box2d(geom)
			%s
		FROM sites 
		WHERE osm_id=%s;
		"""
		% (geomS,osm_id))
		site=cur.fetchone()
		conn.commit()
		
		s={}
		if site:
			s['ids']=[site[0]]
			s['name']=site[1]
			s['pistetype']=site[2]
			s['center']=[site[3],site[4]]
			s['type']=site[5]
			s['bbox']=site[6]
			if GEO: s['geometry']=encodeWKT(site[7])
			
		topo['sites'].append(s)
	
	## ROUTES
	topo['pistes']=[]
	for osm_id in IDS['routes']:
		osm_id=str(long(osm_id))
		cur.execute("""
		SELECT 
			osm_id,
			name,
			relation_piste_type,
			COALESCE(tags::json->>'color',tags::json->>'colour',''),
			COALESCE( 
				array_to_string(array(SELECT distinct tags::json->>'piste:difficulty' FROM lines
				WHERE osm_id in (
					SELECT member_id FROM relations 
					WHERE relation_id =%s )
					),',')
				,tags::json->>'piste:difficulty'),
			COALESCE( 
				array_to_string(array(SELECT distinct tags::json->>'piste:grooming' FROM lines
				WHERE osm_id in (
					SELECT member_id FROM relations 
					WHERE relation_id =%s )
					),',')
				,tags::json->>'piste:grooming'),
			ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
			box2d(geom)
			%s
		FROM routes 
		WHERE osm_id=%s;
		"""
		% (osm_id,osm_id,geomR,osm_id))
		piste=cur.fetchone()
		conn.commit()
		
		s={}
		if piste:
			s['ids']=[piste[0]]
			s['type']='relation'
			s['name']=piste[1]
			s['pistetype']=piste[2]
			s['color']=piste[3]
			s['difficulty']=piste[4]
			s['grooming']=piste[5]
			s['aerialway']=None
			s['center']=[piste[6],piste[7]]
			s['bbox']=piste[8]
			if GEO: s['geometry']=encodeWKT(piste[9])
			s['in_sites']=[]
			s['in_routes']=[]
			
		
		#look for sites
		cur.execute("""
		SELECT
			osm_id,
			name,
			piste_type,
			ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
			box2d(geom)
			%s
		FROM sites 
		WHERE osm_id in (
			SELECT 
			relation_id
			FROM relations 
			WHERE member_id in (%s));
		"""
		% (geomS,osm_id))
		sites=cur.fetchall()
		conn.commit()
		if sites:
			s['in_sites']=[]
			for site in sites:
				tmp={}
				tmp['id']=site[0]
				tmp['type']='relation'
				tmp['name']=site[1]
				tmp['pistetype']=site[2]
				tmp['center']=[site[3],site[4]]
				tmp['bbox']=site[5]
				if GEO: tmp['geometry']=encodeWKT(site[6])
				s['in_sites'].append(tmp)
		
		topo['pistes'].append(s)
	
	## WAYS
	for osm_ids in IDS['ways']:
		
		osm_id=str(long(osm_ids[0]))
		
		cur.execute("""
		SELECT 
			osm_id,
			name,
			piste_type,
			tags::json->>'piste:difficulty',
			lift_type,
			tags::json->>'piste:grooming'
		FROM lines
		WHERE osm_id=%s;
		"""
		% (osm_id,))
		piste=cur.fetchone()
		conn.commit()
		
		s={}
		if piste:
			s['ids']=osm_ids
			s['type']='way'
			s['name']=piste[1]
			s['pistetype']=piste[2]
			s['color']=''
			s['difficulty']=piste[3]
			s['aerialway']=piste[4]
			s['grooming']=piste[5]
			s['in_sites']=[]
			s['in_routes']=[]
		
		way_list=','.join([str(long(i)) for i in osm_ids])
		cur.execute("""
		SELECT 
			ST_X(ST_Centroid(ST_Collect(geom))),
			ST_Y(ST_Centroid(ST_Collect(geom))),
			box2d(ST_Collect(geom))
			%s
		FROM lines
		WHERE osm_id in (%s);
		"""
		% (geomW,way_list))
		piste=cur.fetchone()
		conn.commit()
		if piste:
			s['center']=[piste[0],piste[1]]
			s['bbox']=piste[2]
			if GEO: s['geometry']=encodeWKT(piste[3])
		
		#look for routes
		cur.execute("""
		SELECT
			osm_id,
			name,
      relation_piste_type,
			COALESCE(tags::json->>'color',tags::json->>'colour',''),
			ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
			box2d(geom)
			%s
		FROM routes 
		WHERE osm_id in (
			SELECT 
			relation_id
			FROM relations
			WHERE member_id=%s)
		"""
		% (geomR,osm_id))
		routes=cur.fetchall()
		conn.commit()
		
		route_ids=[]
		if routes:
			s['in_routes']=[]
			for route in routes:
				tmp={}
				tmp['id']=route[0]
				tmp['type']='relation'
				route_ids.append(tmp['id'])
				tmp['name']=route[1]
				tmp['pistetype']=route[2]
				tmp['color']=route[3]
				tmp['center']=[route[4],route[5]]
				tmp['bbox']=route[6]
				if GEO: tmp['geometry']=encodeWKT(route[7])
				s['in_routes'].append(tmp)
		
		#look for sites
		route_ids=[str(long(i)) for i in route_ids]
		route_ids.append(osm_id)
		ids=','.join(route_ids)
		cur.execute("""
		SELECT
			osm_id,
			name,
			piste_type,
			ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
			box2d(geom)
			%s
		FROM sites 
		WHERE osm_id in (
			SELECT 
			relation_id
			FROM relations 
			WHERE member_id in (%s))
		"""
		% (geomS,ids))
		sites=cur.fetchall()
		conn.commit()
		
		if sites:
			s['in_sites']=[]
			for site in sites:
				tmp={}
				tmp['id']=site[0]
				tmp['type']='relation'
				tmp['name']=site[1]
				tmp['pistetype']=site[2]
				tmp['center']=[site[3],site[4]]
				tmp['bbox']=site[5]
				if GEO: tmp['geometry']=encodeWKT(site[6])
				s['in_sites'].append(tmp)
		
		topo['pistes'].append(s)
	
	return topo

def concatWaysByAttributes(topo):
	concatTopo={}
	concatTopo['sites']=topo['sites']
	concatTopo['pistes']=[topo['pistes'][0]]
	for p in topo['pistes'][1:]:
		if compareAttributes(p, concatTopo['pistes'][-1]):
			concatTopo['pistes'][-1]['geometry'].extend(p['geometry'])
			concatTopo['pistes'][-1]['ids'].extend(p['ids'])
			
		else:
			concatTopo['pistes'].append(p)
	return concatTopo
	
def compareAttributes(piste1, piste2):
	for att in piste1:
		if att not in ('geometry','ids','result_index','bbox','center'):
			if piste1[att]==piste2[att]:
				continue
			else :
				return False
	return True
	
def nameSorter(name):
	if not name: return 'zzzzzzzzzzzz'
	name=name.strip(' ')
	if name !='': return name
	else: return 'zzzzzzzzzzzz'

def concatPistes(ways_ids):
	
	ways_ids_copy = [set(elem) for elem in ways_ids]
	result = []
	i = 0
	
	# use `while` to avoid `for` problems (you're deleting list elems)
	while i < len(ways_ids_copy) :
		result.append(ways_ids_copy[i])
		j = i + 1
		while j < len(ways_ids_copy) :
			if result[i] & ways_ids_copy[j] :
				result[i] |= ways_ids_copy[j]
				del ways_ids_copy[j]
				j = i + 1
			else :
				j += 1
		i += 1
	result = [list(r) for r in result]
	
	return result
	#~ seen = set()
	#~ for i, item in enumerate(ways_ids):
		#~ rest = ways_ids[:i] + ways_ids[i+1:]
		#~ s = set(item)
		#~ for x in rest:
			#~ if not s.isdisjoint(x):
				#~ s.update(s.symmetric_difference(x))
		#~ f = frozenset(s)
		#~ if f not in seen:
			#~ seen.add(f)
			#~ yield list(f)
def getSiteStats(ID):
	
	
	stats={}
	stats['site']=ID
	
	sql="""select sum(ST_LengthSpheroid(geom,'SPHEROID["GRS_1980",6378137,298.257222101]'))
	from (
		SELECT DISTINCT geom FROM lines
		WHERE osm_id in (
			SELECT member_id FROM relations 
			WHERE relation_id in (
				SELECT member_id FROM relations 
				WHERE relation_id in (%s)
				AND (relation_type='landuse' AND member_type='w'
				OR relation_type='site')
				)
			)
		and piste_Type LIKE %s
		UNION ALL
		
		SELECT DISTINCT geom FROM lines
		WHERE osm_id in (
			SELECT member_id FROM relations 
			WHERE relation_id in (%s)
			AND (relation_type='landuse' AND member_type='w'
				OR relation_type='site')
			)
		and piste_type LIKE %s
		) as geom;"""
	
	cur.execute(sql% (ID,"'nordic'",ID,"'nordic'"))
	stats['nordic']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'downhill'",ID,"'downhill'"))
	print(sql% (ID,"'downhill'",ID,"'downhill'"))
	
	stats['downhill']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'skitour'",ID,"'skitour'"))
	stats['skitour']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'hike'",ID,"'hike'"))
	stats['hike']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'sled'",ID,"'sled'"))
	stats['sled']=cur.fetchone()[0]
	
	sql=""" select count(*)
	from (
		SELECT DISTINCT * FROM lines
		WHERE osm_id in (
			SELECT member_id FROM relations 
			WHERE relation_id in (
				SELECT member_id FROM relations 
				WHERE relation_id in (%s)
				AND (relation_type='landuse' AND member_type='w'
				OR relation_type='site')
				)
			)
		and piste_type LIKE %s
		UNION ALL
		
		SELECT DISTINCT * FROM lines
		WHERE osm_id in (
			SELECT member_id FROM relations 
			WHERE relation_id in (%s)
			AND (relation_type='landuse' AND member_type='w'
				OR relation_type='site')
			)
		and piste_type LIKE %s
		) as geom;"""
	
	cur.execute(sql% (ID,"'snow_park'",ID,"'snow_park'"))
	stats['snow_park']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'playground'",ID,"'playground'"))
	stats['playground']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'sleigh'",ID,"'sleigh'"))
	stats['sleigh']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'ski_jump'",ID,"'ski_jump'"))
	stats['jump']=cur.fetchone()[0]
	cur.execute(sql% (ID,"'skating'",ID,"'skating'"))
	stats['ice_skate']=cur.fetchone()[0]
	
	sql="""select sum(ST_LengthSpheroid(geom,'SPHEROID["GRS_1980",6378137,298.257222101]'))
	from (
		SELECT DISTINCT geom FROM lines
		WHERE osm_id in (
			SELECT member_id FROM relations 
			WHERE relation_id in (
				SELECT member_id FROM relations 
				WHERE relation_id in (%s)
				AND (relation_type='landuse' AND member_type='w'
				OR relation_type='site')
				)
			)
		and lift_type <>''
		UNION ALL
		
		SELECT DISTINCT geom FROM lines
		WHERE osm_id in (
			SELECT member_id FROM relations 
			WHERE relation_id in (%s)
			AND (relation_type='landuse' AND member_type='w'
				OR relation_type='site')
			)
		and lift_type <>''
		) as geom;"""
	print(sql% (ID,ID))
	cur.execute(sql% (ID,ID))
	stats['lifts']=cur.fetchone()[0]
	for  p in stats:
		if not stats[p]:stats[p]=0
	return stats
	
def encodeWKT(wkt):
	if (wkt):
		encoder = GPolyEncoder(threshold=0.00001)
		lines = re.findall('\([-0-9., ]+\)',wkt)
		tracks=[]
		for line in lines:
			track=()
			# split the line into a list of lon lat
			lon_lat = line.replace('(','').replace(')','').split(',')
			for i in range(0,len(lon_lat)):
				lon=float(lon_lat[i].split(' ')[0])
				lat=float(lon_lat[i].split(' ')[1])
				track= track + ((lon, lat),)
			
			encoded=encoder.encode(track)
			tracks.append(encoded['points'])
		return tracks
	else:
		return ''

#~ Copyright (c) 2009, Koordinates Limited
#~ All rights reserved.
#~ 
#~ Redistribution and use in source and binary forms, with or without 
#~ modification, are permitted provided that the following conditions are met:
#~ 
#~ * Redistributions of source code must retain the above copyright notice, this 
#~ list of conditions and the following disclaimer.
#~ * Redistributions in binary form must reproduce the above copyright notice, 
#~ this list of conditions and the following disclaimer in the documentation 
#~ and/or other materials provided with the distribution.
#~ * Neither the name of the Koordinates Limited nor the names of its 
#~ contributors may be used to endorse or promote products derived from this 
#~ software without specific prior written permission.
#~ 
#~ THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
#~ AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
#~ IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
#~ ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
#~ LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
#~ CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
#~ SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
#~ INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
#~ CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
#~ ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
#~ THE POSSIBILITY OF SUCH DAMAGE.


class GPolyEncoder(object):
	def __init__(self, num_levels=18, zoom_factor=2, threshold=0.00001, force_endpoints=True):
		self._num_levels = num_levels
		self._zoom_factor = zoom_factor
		self._threshold = threshold
		self._force_endpoints = force_endpoints
		
		self._zoom_level_breaks = []
		for i in range(num_levels):
			self._zoom_level_breaks.append(threshold * (zoom_factor ** (num_levels - i - 1)))
	
	def encode(self, points):
		dists = {}
		# simplify using Douglas-Peucker
		max_dist = 0
		abs_max_dist = 0
		stack = []
		if (len(points) > 2):
			stack.append((0, len(points)-1))
			while len(stack):
				current = stack.pop()
				max_dist = 0
				
				for i in range(current[0]+1, current[1]):
					temp = self._distance(points[i], points[current[0]], points[current[1]])
					if temp > max_dist:
						max_dist = temp
						max_loc = i
						abs_max_dist = max(abs_max_dist, max_dist)
				
				if max_dist > self._threshold:
					dists[max_loc] = max_dist
					stack.append((current[0], max_loc))
					stack.append((max_loc, current[1]))
		
		enc_points, enc_levels = self._encode(points, dists, abs_max_dist)
		r = {
			'points': enc_points,
			'levels': enc_levels,
			'zoomFactor': self._zoom_factor,
			'numLevels': self._num_levels,
		}
		return r
	
	def _encode(self, points, dists, abs_max_dist):
		encoded_levels = StringIO()
		encoded_points = StringIO()

		plat = 0
		plng = 0

		if (self._force_endpoints):
			encoded_levels.write(self._encode_number(self._num_levels - 1))
		else:
			encoded_levels.write(self._encode_number(self._num_levels - self._compute_level(abs_max_dist) - 1))

		n_points = len(points)
		for i,p in enumerate(points):
			if (i > 0) and (i < n_points-1) and (i in dists):
				encoded_levels.write(self._encode_number(self._num_levels - self._compute_level(dists[i]) -1))
				
			if (i in dists) or (i == 0) or (i == n_points-1):
				late5 = int(math.floor(p[1] * 1E5))
				lnge5 = int(math.floor(p[0] * 1E5))
				dlat = late5 - plat
				dlng = lnge5 - plng
				plat = late5
				plng = lnge5
				encoded_points.write(self._encode_signed_number(dlat))
				encoded_points.write(self._encode_signed_number(dlng))

		if (self._force_endpoints):
			encoded_levels.write(self._encode_number(self._num_levels - 1))
		else:
			encoded_levels.write(self._encode_number(self._num_levels - self._compute_level(abs_max_dist) - 1))
		
		return (
			encoded_points.getvalue(), #.replace("\\", "\\\\"), 
			encoded_levels.getvalue()
		)
	
	def _compute_level(self, abs_max_dist):
		lev = 0
		if abs_max_dist > self._threshold:
			while abs_max_dist < self._zoom_level_breaks[lev]:
				lev += 1
		return lev

	def _encode_signed_number(self, num):
		sgn_num = num << 1
		if num < 0:
			sgn_num = ~sgn_num
		return self._encode_number(sgn_num)
	
	def _encode_number(self, num):
		s = StringIO()
		while num >= 0x20:
			next_val = (0x20 | (num & 0x1f)) + 63
			s.write(chr(next_val))
			num >>= 5
		num += 63
		s.write(chr(num))
		return s.getvalue()

	def _distance(self, p0, p1, p2):
		out = 0.0

		if (p1[1] == p2[1] and p1[0] == p2[0]):
			out = math.sqrt((p2[1] - p0[1]) ** 2 + (p2[0] - p0[0]) ** 2)
		else:
			u = ((p0[1] - p1[1]) * (p2[1] - p1[1]) + (p0[0] - p1[0]) * (p2[0] - p1[0])) \
					/ ((p2[1] - p1[1]) ** 2 + (p2[0] - p1[0]) ** 2)

			if u <= 0:
				out = math.sqrt((p0[1] - p1[1]) ** 2 + (p0[0] - p1[0]) ** 2)
			elif u >= 1:
				out = math.sqrt((p0[1] - p2[1]) ** 2 + (p0[0] - p2[0]) ** 2)
			elif (0 < u) and (u < 1):
				out = math.sqrt((p0[1] - p1[1] - u * (p2[1] - p1[1])) ** 2 \
						+ (p0[0] - p1[0] - u * (p2[0] - p1[0])) ** 2)
		
		return out
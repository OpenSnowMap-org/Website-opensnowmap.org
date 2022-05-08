#!/usr/bin/python
#
#
# Piste search API

# TODO also add areas
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
import time
from cStringIO import StringIO

import math

"""
http://beta.opensnowmap.org/search?name=Vourbey&ids_only=true
http://beta.opensnowmap.org/search?name=Pauvre Conche&ids_only=true
http://beta.opensnowmap.org/search?bbox=5,46,6,47&ids_only=true
http://beta.opensnowmap.org/search?bbox=6.05,46.38,6.11,46.42&ids_only=true
http://beta.opensnowmap.org/searchwhen clicking on 'inRouteElement'?closest=5,46&ids_only=true
http://beta.opensnowmap.org/search?name=La%20Petite%20Grand&geo=true&list=true
http://beta.opensnowmap.org/search?group=true&geo=true&sort_alpha=true&list=true&ids=32235255,29283990,8216510
"""
"""
function getMembersById(id) 
when clicking on 'inSiteElement' for a piste or 'getMemberListButton' for a site => always with a siteid
"geo=true&list=true&sort_alpha=true&group=true&members=" + id;
==> "siteMembers="+id

function getTopoById(ids) 
DONE in pisteList when clicking on 'inRouteElement' => always with a single route Id
"geo=true&topo=true&ids=" + ids;
==> useless, everything should be in the in_routes:[n] object

function getTopoByViewport() 
"group=true&geo=true&list=true&sort_alpha=true&bbox=" + bb[0] + ',' + bb[1] + ',' + bb[2] + ',' + bb[3];
==> "bbox=" + bb[0] + ',' + bb[1] + ',' + bb[2] + ',' + bb[3]

function getRouteTopoByWaysId(ids, lengths, routeLength, routeWKT) 
"geo=true&topo=true&ids_ways=" + ids;
==> "topoByWayId=" +  ids;

RouteSnap(point)
"geo=true&list=true&closest=" + ll[0] + ',' + ll[1];
==> "closest=" +  ids;

function getByName(name)
"group=true&geo=true&list=true&name=" + name;
==> "name=" +  ids;

function showSiteStats(div, id, element_type) 
 "site-stats=" + id;
==> "siteStats=" +  ids;
"""
LIMIT = 50
HARDLIMIT = 500

DEBUG=False
SPEEDDEBUG=True
def requestPistes(request):

	db='pistes_osm2pgsql'
	global conn
	global cur
	conn = psycopg2.connect("dbname="+db+" user=yves")
	cur = conn.cursor()
	if (DEBUG): print(request)
	GEO=False
	global LIMIT 
	LIMIT_REACHED = False
	#==================================================
	# handle GET request paramaters
	
	if (DEBUG): print(request)
	if request.find('name=') !=-1:
				name=request.split('name=')[1]
				if name.find('&'): name=name.split('&')[0]
				#name='the%20blue slope'
				# ~ NAME = True
				site_ids, route_ids, way_ids, area_ids, LIMIT_REACHED= queryByName(name)
				IDS=buildIds(site_ids, route_ids, way_ids, area_ids, True)
				topo=makeList(IDS,True)
				# sort by name
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
				response_body=json.dumps(topo, sort_keys=True, indent=4)
				status = 200
				
				cur.close()
				conn.close()
				return status, [response_body]
		
	elif request.find('closest=') !=-1:
		# query: ...closest=lon,lat&... or ...closest=lon; lat&...
		point=request.split('closest=')[1]
		if point.find('&'): point=point.split('&')[0].replace(';',',').replace(' ','')
		center={}
		center['lon']=float(point.split(',')[0])
		center['lat']=float(point.split(',')[1])
		site_ids, route_ids, way_ids, area_ids = queryClosest(center)
		snap={}
		print(way_ids, area_ids)
		if way_ids:
			snap['lon'], snap['lat'] = snapToWay(way_ids[0],center)
		else:
			snap['lon'], snap['lat'] = snapToArea(area_ids[0],center)
		IDS=buildIds(site_ids, route_ids, way_ids, area_ids, True)
		topo=makeList(IDS,True)
		topo['snap']=snap
		
		# sort by name
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
		response_body=json.dumps(topo, sort_keys=True, indent=4)
		status = 200
		
		cur.close()
		conn.close()
		return status, [response_body]
		
	elif request.find('siteStats=') !=-1:
		# query: ...members=id1...
		ids=request.split('siteStats=')[1]
		if ids.find('&'): ids=ids.split('&')[0]
		stats=getSiteStats(ids)
		
		stats['generator']="Opensnowmap.org piste search API"
		stats['copyright']= "The data included in this document is from www.openstreetmap.org. It is licenced under ODBL, and has there been collected by a large group of contributors."
		
		response_body=json.dumps(stats, sort_keys=True, indent=4)
		status = 200
		cur.close()
		conn.close()
		return status, [response_body]
		
	elif request.find('bbox=') !=-1:
				# query: ...bbox=left, bottom, right, top&... 
				bbox=request.split('bbox=')[1]
				if bbox.find('&'): bbox=bbox.split('&')[0].replace(';',',').replace(' ','').split(',')
				for b in bbox: b=float(b)
				# ~ BBOX = True
				site_ids, route_ids, way_ids, area_ids,LIMIT_REACHED= queryByBbox(bbox, True)
				IDS=buildIds(site_ids, route_ids, way_ids,area_ids, False)
				topo=makeList(IDS,True)
				# sort by name
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
				response_body=json.dumps(topo, sort_keys=True, indent=4)
				status = 200
				
				cur.close()
				conn.close()
				return status, [response_body]
		
	elif request.find('siteMembers=') !=-1:
				# query: ...members=id1...
				ids=request.split('siteMembers=')[1]
				if ids.find('&'): ids=ids.split('&')[0]
				# ~ if request.find('parent=true') !=-1:
					# ~ PARENT_ID = ids
				# ~ MEMBERS_REQUEST = True
				site_ids, route_ids, way_ids, area_ids = queryMembersById(ids, True)
				IDS=buildIds(site_ids, route_ids, way_ids, area_ids,True)
				topo=makeList(IDS,True)
				# sort by name
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
				response_body=json.dumps(topo, sort_keys=True, indent=4)
				status = 200
				
				cur.close()
				conn.close()
				return status, [response_body]
		
	elif request.find('topoByWayIds=') !=-1:
				# query: ...ids=id1, id2, id3...
				ids=request.split('topoByWayIds=')[1]
				if ids.find('&'): ids=ids.split('&')[0]
				# ids='id1, id2, ...'
				
				site_ids = []
				route_ids = []
				area_ids = []
				way_ids = ids.split(',')
				
				IDS = {}
				way_ids=[[w] for w in way_ids]
				IDS['sites']=site_ids
				IDS['routes']=route_ids
				IDS['ways']=way_ids
				IDS['areas']=area_ids
				topo=makeList(IDS,True)
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
				response_body=json.dumps(topo, sort_keys=True, indent=4)
				status = 200
				
				cur.close()
				conn.close()
				return status, [response_body]
	
	else:
				response_body="Bad Request"
				status = 400
				
				return status, [response_body]

#==================================================
#==================================================
def queryMembersById(id, PARENT_ID):
	start_time=time.time()
	
	cur.execute("""
	SELECT member_id FROM relations 
	WHERE relation_id in (%s);
	"""
	% (id,))
	ids = cur.fetchall()
	ids = ','.join([str(long(x[0])) for x in ids])
	
	conn.commit()
	if PARENT_ID:
		ids=id+','+ids #insert the parent osm_id in the list
	site_ids, route_ids, way_ids, areas_ids=queryByIds(ids)
	
	if(SPEEDDEBUG): print("queryMembersById took: " + str(time.time()-start_time))
	return site_ids, route_ids, way_ids, areas_ids
	
def queryByIds(ids):
	start_time=time.time()
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
	
	cur.execute("""
	SELECT osm_id FROM areas
	WHERE osm_id in (%s);
	"""
	% (ids,))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	conn.commit()
	
	
	if(SPEEDDEBUG): print("queryByIds took: " + str(time.time()-start_time))
	return site_ids, route_ids, way_ids, areas_ids

def queryByName(name):
	start_time=time.time()
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
	ORDER by similarity(name,'%s')
	;
	"""
	% (name,name))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	conn.commit()
	
	cur.execute("""
	SELECT osm_id FROM areas
	WHERE name %% '%s'
	ORDER by similarity(name,'%s')
	;
	"""
	% (name,name))
	areas_ids = cur.fetchall()
	areas_ids = [x[0] for x in areas_ids]
	conn.commit()
	
	if len(site_ids) > LIMIT:
		site_ids=site_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(route_ids) > LIMIT:
		route_ids=route_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(way_ids) > LIMIT:
		way_ids=way_ids[:LIMIT]
		LIMIT_REACHED = True
	if len(areas_ids) > LIMIT:
		areas_ids=areas_ids[:LIMIT]
		LIMIT_REACHED = True
	if(SPEEDDEBUG): print("queryByName took: " + str(time.time()-start_time))
	return site_ids, route_ids, way_ids, areas_ids, LIMIT_REACHED

def queryClosest(center):
	
	cur.execute("""
	SELECT ST_Distance_Sphere(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)), osm_id FROM lines
	ORDER BY 
	ST_Distance(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)) ASC
	LIMIT 1;
	"""	% (center['lon'],center['lat'],center['lon'],center['lat']))
	resp = cur.fetchall()
	dist_way= resp[0][0]
	way_ids = resp[0][1]
	
	cur.execute("""
	SELECT ST_Distance_Sphere(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)), osm_id FROM areas
	ORDER BY 
	ST_Distance(geom, ST_SetSRID(ST_MakePoint(%s,%s),4326)) ASC
	LIMIT 1;
	"""	% (center['lon'],center['lat'],center['lon'],center['lat']))
	resp = cur.fetchall()
	print(resp)
	dist_area= resp[0][0]
	area_ids = resp[0][1]
	if (dist_area == 0.0): dist_area = 10 # Try to snap to central way if exist and <10m
	
	if dist_way < dist_area:
		return [], [], [way_ids], []
	else :
		return [], [], [], [area_ids]

def snapToWay(ID, center):
	
	cur.execute("""
	SELECT
		ST_X(
			ST_ClosestPoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
		),
		ST_Y(
			ST_ClosestPoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
		)
	FROM lines
	WHERE osm_id=%s;
	"""
	% (center['lon'],center['lat'],center['lon'],center['lat'],ID))
	way_ids = cur.fetchall()
	
	
	return way_ids[0][0],way_ids[0][1]
	
def snapToArea(ID, center):
	
	cur.execute("""
	SELECT
		ST_X(
			ST_ClosestPoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
		),
		ST_Y(
			ST_ClosestPoint(geom, ST_GeometryFromText('POINT(%s %s)', 4326))
		)
	FROM areas
	WHERE osm_id=%s;
	"""
	% (center['lon'],center['lat'],center['lon'],center['lat'],ID))
	way_ids = cur.fetchall()
	
	
	return way_ids[0][0],way_ids[0][1]

def queryByBbox(bbox, CONCAT):
	start_time=time.time()
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
	
	if(CONCAT) :
		# Better filtering before than haviong to group afterward
		# for ways having same type than their parent relations
		query="""
		SELECT osm_id FROM lines
		WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
		AND position(piste_type in relation_piste_type) = 0
		LIMIT %s;
		"""% (bbox[0],bbox[1],bbox[2],bbox[3],l)
	else:
		query="""
		SELECT osm_id FROM lines
		WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
		LIMIT %s;
		"""% (bbox[0],bbox[1],bbox[2],bbox[3],l)
		
	cur.execute(query)
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	conn.commit()
	
	query="""
	SELECT osm_id FROM areas
	WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
	LIMIT %s;
	"""% (bbox[0],bbox[1],bbox[2],bbox[3],l)
	
	cur.execute(query)
	area_ids = cur.fetchall()
	area_ids = [x[0] for x in area_ids]
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
	if len(area_ids) > LIMIT:
		area_ids=areas_ids[:LIMIT]
		LIMIT_REACHED = True
	if(SPEEDDEBUG): print("queryByBbox took: " + str(time.time()-start_time))
	return site_ids, route_ids, way_ids, area_ids, LIMIT_REACHED

def buildIds(site_ids, route_ids, way_ids, area_ids, CONCAT):
	# Whatever the query was, we must return an object like this:
	"""
	IDS={
		sites : [id, id, ...]
				
		routes : [id, id, ...]
		ways : [[id, id], ...] # ways can be grouped later if similar enough 
		(touches each other, same name, same type, same difficulty)
		areas : [[id, id], ...] # ways can be grouped later if similar enough 
		(touches each other, same name, same type, same difficulty)
	}
	"""
	
	start_time=time.time()
	if CONCAT:
		
		if len(way_ids):
			# remove duplicates: way member of a route #of same piste:type
			# already useless when from BBOX
			wayList = ','.join([str(long(i)) for i in way_ids])
			to_remove=[]
			int_time=time.time()
			for i in route_ids:
				query="""
				SELECT osm_id FROM lines
				WHERE %s = ANY (routes_ids)
				AND osm_id in (%s)
				AND
						piste_type = (
							SELECT relation_piste_type FROM routes
							WHERE osm_id = %s
							)
				OR (
					piste_type is null
					AND lift_type is null
				);
				"""%(long(i),wayList,long(i))
				
				cur.execute(query)
				to_remove.extend(cur.fetchall())
				conn.commit()
			if(SPEEDDEBUG): print("buildIds - remove duplicates took: " + str(time.time()-int_time))
			to_remove=[t[0] for t in to_remove] 
			clean_way_ids=[]
			for wid in way_ids:
				if wid not in to_remove: clean_way_ids.append(wid)
			way_ids=clean_way_ids
		if len(way_ids)==1 : way_ids=[way_ids]
		if len(way_ids)>1:	# group ways
			int_time=time.time()
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
			if(SPEEDDEBUG): print("buildIds - groupWays took: " + str(time.time()-int_time))
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
	IDS['areas']=area_ids
	if(SPEEDDEBUG): print("buildIds took: " + str(time.time()-start_time))
	return IDS

def makeList(IDS, GEO):
	start_time=time.time()
	if GEO: geomS=',ST_AsText(ST_buffer(geom,0.01))'
	else: geomS=''
	if GEO: geomR=',ST_AsText(geom)'
	else: geomR=''
	if GEO: geomW=',ST_AsText(ST_Collect(ST_LineMerge(geom)))'
	else: geomW=''
	if GEO: geomA=',ST_AsText(ST_Collect(ST_ExteriorRing(geom)))'
	else: geomW=''

	topo={}

	## SITES
	tmp_time=time.time()
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
	if(SPEEDDEBUG): print("For sites, makeList took: " + str(time.time()-tmp_time))
	## ROUTES
	tmp_time=time.time()
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
	if(SPEEDDEBUG): print("For routes, makeList took: " + str(time.time()-tmp_time))
	
	## WAYS
	tmp_time=time.time()
	# ~ IDS['ways']=[['144553388'], ['144553402'], ['144553370'], ['144553373'], ['397844436'], ['397844438'], ['466148245'], ['401260522'], ['87063832'], ['726870373'], ['466148244'], ['87063829'], ['469934990'], ['76835033'], ['401260516'], ['469934992'], ['469934991']]
	# list of first ids
	# Todo: faire une seule requetes sur lines, route et piste en un seul coup
	# avec IN (first_ids_list) puis a partir de deux liste de tous les parents.
	# Looper sur les resultats pour faire la liste, une seule requete
	# sera plus rapide.
	# Ensuite, completer la liste avec autant de requetes que necessaires
	# pour la geometrie pour les ways qui doivent etre merged.
	first_ids_list=','.join(str(r[0]) for r in IDS['ways'])
	all_parent_routes=''
	all_parent_sites=''
	if len(first_ids_list):
		query = """
			SELECT 
				osm_id,
				name,
				piste_type,
				tags::json->>'piste:difficulty',
				lift_type,
				tags::json->>'piste:grooming',
				array_to_string(routes_ids,','),
				array_to_string(array_cat(sites_ids, landuses_ids),','),
				ST_X(ST_Centroid(ST_Collect(geom))),
				ST_Y(ST_Centroid(ST_Collect(geom))),
				box2d(ST_Collect(geom))
				%s
			FROM lines
			WHERE osm_id in (%s)
			GROUP BY 
				osm_id,
				name,
				piste_type,
				tags::json->>'piste:difficulty',
				lift_type,
				tags::json->>'piste:grooming',
				array_to_string(routes_ids,','),
				array_to_string(array_cat(sites_ids, landuses_ids),',')
			;""" % (geomW,first_ids_list)
		# Note: the request ways_ids order is lost, then rebuilt later
		cur.execute(query)
		pistes=cur.fetchall()
		all_pistes={}
		for piste in pistes:

			in_routes=''
			in_sites=''
			s={}
			if piste:
				s['ids']=[piste[0]] # temporary, this will be set to the original id list at the end
				s['type']='way'
				s['name']=piste[1]
				s['pistetype']=piste[2]
				s['color']=''
				s['difficulty']=piste[3]
				s['aerialway']=piste[4]
				s['grooming']=piste[5]
				s['in_sites']=[]
				s['in_routes']=[]
				if (piste[6]):
					in_routes=str(piste[6])
				if (piste[7]):
					in_sites=str(piste[7]) # not used, we want also sites only routes are member of
				s['parent_routes_ids']=in_routes
				s['parent_sites_ids']=in_sites
				
				s['center']=[piste[8],piste[9]]
				s['bbox']=piste[10]
				if GEO: s['geometry']=encodeWKT(piste[11])
				if in_routes:
					all_parent_routes+=','+in_routes
				if in_sites:
					all_parent_sites+=','+in_sites
				all_pistes[str(piste[0])]=s
			
		if(SPEEDDEBUG): print("For ways, makeList took: " + str(time.time()-tmp_time))
		#look for in_routes
		all_parent_routes = all_parent_routes.strip(',')
		all_routes={}
		if len(all_parent_routes) :
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
			WHERE osm_id in (%s)
			"""
			% (geomR,all_parent_routes))
			routes=cur.fetchall()
			conn.commit()
			
			route_ids=[]
			if routes:
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
					all_routes[str(tmp['id'])]=tmp
		if(SPEEDDEBUG): print("For in_routes, makeList took: " + str(time.time()-tmp_time))
		
		#look for in_sites
		all_parent_sites = all_parent_sites.strip(',')
		all_sites={}
		if len(all_parent_sites) :
			cur.execute("""
			SELECT
				osm_id,
				name,
				piste_type,
				ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
				box2d(geom)
				%s
			FROM sites 
			WHERE osm_id in (%s)
			""" % (geomS,all_parent_sites))
			sites=cur.fetchall()
			conn.commit()
			
			if sites:
				for site in sites:
					tmp={}
					tmp['id']=site[0]
					tmp['type']='relation'
					tmp['name']=site[1]
					tmp['pistetype']=site[2]
					tmp['center']=[site[3],site[4]]
					tmp['bbox']=site[5]
					if GEO: tmp['geometry']=encodeWKT(site[6])
					all_sites[str(tmp['id'])]=tmp
		if(SPEEDDEBUG): print("For insites, makeList took: " + str(time.time()-tmp_time))
		
		# ~ Looping trough the piste list all_pistes to populate
		# ~ the in_routes and in_sites fields.
		for p in all_pistes:
			piste=all_pistes[p]
			if piste['parent_routes_ids']:
				ar = str(piste['parent_routes_ids']).split(",")
				ar=list(set(ar))
				for routeId in sorted(ar) :
					piste['in_routes'].append(all_routes[routeId])
			if piste['parent_sites_ids']:
				ar = str(piste['parent_sites_ids']).split(",")
				ar=list(set(ar))
				for siteId in sorted(ar) :
					piste['in_sites'].append(all_sites[siteId])
		
		# ~ We  re-order the list in the initial request order.
		ordered_ids = first_ids_list.split(',')
		for i in range(0, len(ordered_ids)):
			idx=ordered_ids[i]
			piste=all_pistes[idx]
			
			# ~ Check if the id is singular, otherwise get the right geometry
			# ~ when pistes are already concatenated
			# ~ Check a list view request around 690949555L, 690949556L
			if len(IDS['ways'][i]) > 1:
				if (DEBUG): print("composed ways : "+str(IDS['ways'][i]))
				id_list=','.join([str(long(j)) for j in IDS['ways'][i]])
				cur.execute("""
				SELECT 
					ST_X(ST_Centroid(ST_Collect(geom))),
					ST_Y(ST_Centroid(ST_Collect(geom))),
					box2d(ST_Collect(geom))
					%s
				FROM lines 
				WHERE osm_id in (%s);
				"""
				% (geomW,id_list))
				p=cur.fetchone()
				conn.commit()
				if p:
					piste['ids']=IDS['ways'][i]
					piste['center']=[p[0],p[1]]
					piste['bbox']=p[2]
					if GEO: piste['geometry']=encodeWKT(p[3])
			
			topo['pistes'].append(piste)
		
		if(SPEEDDEBUG): print("For ways, makeList took: " + str(time.time()-tmp_time))
		
		
		
	## AREAS
	tmp_time=time.time()
	# ~ IDS['ways']=[['144553388'], ['144553402'], ['144553370'], ['144553373'], ['397844436'], ['397844438'], ['466148245'], ['401260522'], ['87063832'], ['726870373'], ['466148244'], ['87063829'], ['469934990'], ['76835033'], ['401260516'], ['469934992'], ['469934991']]
	# list of first ids
	# Todo: faire une seule requetes sur lines, route et piste en un seul coup
	# avec IN (first_ids_list) puis a partir de deux liste de tous les parents.
	# Looper sur les resultats pour faire la liste, une seule requete
	# sera plus rapide.
	# Ensuite, completer la liste avec autant de requetes que necessaires
	# pour la geometrie pour les ways qui doivent etre merged.
	first_ids_list=','.join(str(r) for r in IDS['areas'])
	all_parent_routes=''
	all_parent_sites=''
	if len(first_ids_list):
		query = """
			SELECT 
				osm_id,
				name,
				piste_type,
				tags::json->>'piste:difficulty',
				'' as lift_type,
				tags::json->>'piste:grooming',
				array_to_string(routes_ids,','),
				array_to_string(array_cat(sites_ids, landuses_ids),','),
				ST_X(ST_Centroid(ST_Collect(geom))),
				ST_Y(ST_Centroid(ST_Collect(geom))),
				box2d(ST_Collect(geom))
				%s
			FROM areas
			WHERE osm_id in (%s)
			GROUP BY 
				osm_id,
				name,
				piste_type,
				lift_type,
				tags::json->>'piste:difficulty',
				tags::json->>'piste:grooming',
				array_to_string(routes_ids,','),
				array_to_string(array_cat(sites_ids, landuses_ids),',')
			;""" % (geomA,first_ids_list)
		# Note: the request ways_ids order is lost, then rebuilt later
		cur.execute(query)
		pistes=cur.fetchall()
		all_pistes={}
		for piste in pistes:

			in_routes=''
			in_sites=''
			s={}
			if piste:
				s['ids']=[piste[0]] # temporary, this will be set to the original id list at the end
				s['type']='area'
				s['name']=piste[1]
				s['pistetype']=piste[2]
				s['color']=''
				s['difficulty']=piste[3]
				s['aerialway']=''
				s['grooming']=piste[5]
				s['in_sites']=[]
				s['in_routes']=[]
				if (piste[6]):
					in_routes=str(piste[6])
				if (piste[7]):
					in_sites=str(piste[7]) # not used, we want also sites only routes are member of
				s['parent_routes_ids']=in_routes
				s['parent_sites_ids']=in_sites
				
				s['center']=[piste[8],piste[9]]
				s['bbox']=piste[10]
				if GEO: s['geometry']=encodeWKT(piste[11])
				if in_routes:
					all_parent_routes+=','+in_routes
				if in_sites:
					all_parent_sites+=','+in_sites
				all_pistes[str(piste[0])]=s
			
		if(SPEEDDEBUG): print("For areas, makeList took: " + str(time.time()-tmp_time))
		#don't look for in_routes
		
		#look for in_sites
		all_parent_sites = all_parent_sites.strip(',')
		all_sites={}
		if len(all_parent_sites) :
			cur.execute("""
			SELECT
				osm_id,
				name,
				piste_type,
				ST_X(ST_Centroid(geom)),ST_Y(ST_Centroid(geom)),
				box2d(geom)
				%s
			FROM sites 
			WHERE osm_id in (%s)
			""" % (geomS,all_parent_sites))
			sites=cur.fetchall()
			conn.commit()
			
			if sites:
				for site in sites:
					tmp={}
					tmp['id']=site[0]
					tmp['type']='relation'
					tmp['name']=site[1]
					tmp['pistetype']=site[2]
					tmp['center']=[site[3],site[4]]
					tmp['bbox']=site[5]
					if GEO: tmp['geometry']=encodeWKT(site[6])
					all_sites[str(tmp['id'])]=tmp
		if(SPEEDDEBUG): print("For insites, makeList took: " + str(time.time()-tmp_time))
		
		# ~ Looping trough the piste list all_pistes to populate
		# ~ the in_routes and in_sites fields.
		for p in all_pistes:
			piste=all_pistes[p]
			
			if piste['parent_sites_ids']:
				ar = str(piste['parent_sites_ids']).split(",")
				ar=list(set(ar))
				for siteId in sorted(ar) :
					piste['in_sites'].append(all_sites[siteId])
		
		# ~ We  don't re-order the list in the initial request order.
			
			topo['pistes'].append(piste)
		
		if(SPEEDDEBUG): print("For ways, makeList took: " + str(time.time()-tmp_time))
		
		
		
		if(SPEEDDEBUG): print("makeList took: " + str(time.time()-start_time))
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

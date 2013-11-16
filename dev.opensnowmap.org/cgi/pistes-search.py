#!/usr/bin/python
#
#
# todo:
# Don't return pistes that are member of a route relation (Vourbey)
# ST_union pistes with same ID (milles sapins)
# ST_union touching pistes with same attributes (pauvre conche)

import psycopg2
import pdb
import sys, os
from lxml import etree
import json
import cgi
import urllib
"""
http://beta.opensnowmap.org/search?name=Vourbey&ids_only=true
http://beta.opensnowmap.org/search?name=Pauvre Conche&ids_only=true
http://beta.opensnowmap.org/search?bbox=5,46,6,47&ids_only=true
http://beta.opensnowmap.org/search?closest=5,46&ids_only=true
"""

con = psycopg2.connect("dbname=pistes-pgsnapshot user=website")

def application(environ,start_response):
	
	NAME=False
	CLOSEST=False
	BBOX=False
	ID_REQUEST=False
	TOPO=False
	GEO=False
	IDS_ONLY=False
	
	#==================================================
	# handle GET request paramaters
	request = urllib.unquote(environ['QUERY_STRING'])
	
	if request.find('name=') !=-1:
		NAME = True
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
		if ids.find('&'): ids=ids.split('&')[0].split(',')
		# ids=[id1, id2, ...]
		
	if request.find('bbox=') !=-1:
		BBOX = True
		# query: ...bbox=left, bottom, right, top&... 
		bbox=request.split('bbox=')[1]
		if bbox.find('&'): bbox=bbox.split('&')[0].replace(';',',').replace(' ','').split(',')
		for b in bbox: b=float(b)
		# bbox=[left, bottom, right, top]
		
	if request.find('ids_only=true') !=-1:
		IDS_ONLY = True
		# query: ...ids=true... 
		
	elif request.find('topo=true') !=-1:
		TOPO = True
		# query: ...topo=true... 
		if request.find('geo=true') !=-1:
			GEO = True
			# query: ...geo=true... 
	
	#==================================================
	# basic queries: create the dict of elements osm ids corresponding to the query
	if ID_REQUEST: 
		site_ids, route_ids, way_ids= queryByIds(ids)
		IDS=buildIds(site_ids, route_ids, way_ids)
	elif BBOX:
		site_ids, route_ids, way_ids= queryByBbox(bbox)
		IDS=buildIds(site_ids, route_ids, way_ids)
	elif CLOSEST:
		site_ids, route_ids, way_ids= queryClosest(center)
		IDS=buildIds(site_ids, route_ids, way_ids)
	elif NAME:
		site_ids, route_ids, way_ids= queryByName(name)
		IDS=buildIds(site_ids, route_ids, way_ids)
	else:
		response_body=json.dumps({}, sort_keys=True, indent=4)
		status = '400 Bad Request'
		response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		con.close()
		return [response_body]
	
	# Whatever the query was, we must now have an object like this:
	"""
	IDS={
		sites : {
					ids:[id, id, ...]
				}
		routes : {
					ids:[id, id, ...]
					in_site:[id, id, ...]
				}
		ways : {
					ids:[[id, id], ...] # ways can be grouped if similar enough (touches each other, same name, same type, same difficulty)
					in_site:[id, id, ...]
					in_route:[id, id, ...]
				}
	}
	"""
	#==================================================
	# build the response
	if IDS_ONLY:
		IDS['generator']="Opensnowmap.org piste search API"
		IDS['copyright']= "The data included in this document is from www.openstreetmap.org. It is licenced under ODBL, and has there been collected by a large group of contributors."
		response_body=json.dumps(IDS, sort_keys=True, indent=4)
		status = '200 OK'
		response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		con.close()
		return [response_body]
		
	elif TOPO:
		if GEO:
			topo=makeTopo(IDS,True)
			response_body=json.dumps(topo, sort_keys=True, indent=4)
		else:
			topo=makeTopo(IDS,False)
			response_body=json.dumps(topo, sort_keys=True, indent=4)
		status = '200 OK'
		response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		con.close()
		return [response_body]
	
	else:
		response_body=json.dumps({}, sort_keys=True, indent=4)
		status = '400 Bad Request'
		response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		con.close()
		return [response_body]
	
#==================================================
def queryByName(name):
	cur = con.cursor()
	name=name.replace(' ','&').replace('%20','&').replace('"', '&').replace("'", "&")
	
	cur.execute("""
	SELECT id FROM relations 
	WHERE
	to_tsvector(
	COALESCE(tags->'name','')||' '||
	COALESCE(tags->'piste:name','')
	)@@ to_tsquery('%s')
	and (tags->'type' = 'site');
	"""
	% (name,))
	site_ids = cur.fetchall()
	site_ids = [x[0] for x in site_ids]
	con.commit()
	
	cur.execute("""
	SELECT id FROM relations 
	WHERE
	to_tsvector(
	COALESCE(tags->'name','')||' '||
	COALESCE(tags->'piste:name','')
	)@@ to_tsquery('%s')
	and (tags->'route' = 'piste' or tags->'route' = 'ski');
	"""
	% (name,))
	route_ids = cur.fetchall()
	route_ids = [x[0] for x in route_ids]
	con.commit()
	
	cur.execute("""
	SELECT id FROM ways 
	WHERE
	to_tsvector(
	COALESCE(tags->'name','')||' '||
	COALESCE(tags->'piste:name','')
	)@@ to_tsquery('%s');
	"""
	% (name,))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	con.commit()
	
	cur.close()
	
	return site_ids, route_ids, way_ids
	
def queryClosest(center):
	cur = con.cursor()
	
	cur.execute("""
	SELECT id FROM ways 
	ORDER BY 
	ST_Distance(linestring, ST_SetSRID(ST_MakePoint(%s,%s),4326)) ASC
	LIMIT 1;
	"""
	% (center['lon'],center['lat']))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	
	
	con.commit()
	cur.close()
	
	return [], [], way_ids
	
def queryByBbox(bbox):
	cur = con.cursor()
	site_ids=[]
	route_ids=[]
	
	#~ Need to build a geometryfor relations ...
	cur.execute("""
	SELECT id FROM relations 
	WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
	and (tags->'type' = 'site');
	"""
	% (bbox[0],bbox[1],bbox[2],bbox[3]))
	site_ids = cur.fetchall()
	site_ids = [x[0] for x in site_ids]
	cur.close()
	cur = con.cursor()
	cur.execute("""
	SELECT id FROM relations 
	WHERE geom && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326)
	and (tags->'route' = 'piste' or tags->'route' = 'ski');
	"""
	% (bbox[0],bbox[1],bbox[2],bbox[3]))
	route_ids = cur.fetchall()
	route_ids = [x[0] for x in route_ids]
	
	cur.close()
	cur = con.cursor()
	cur.execute("""
	SELECT id FROM ways 
	WHERE linestring && st_setsrid('BOX(%s %s,%s %s)'::box2d, 4326);
	"""
	% (bbox[0],bbox[1],bbox[2],bbox[3]))
	way_ids = cur.fetchall()
	way_ids = [x[0] for x in way_ids]
	con.commit()
	
	
	cur.close()
	
	return site_ids, route_ids, way_ids
	
def buildIds(site_ids, route_ids, way_ids):
	cur = con.cursor()
	if len(way_ids):
		# remove duplicates: way member of a route of same piste:type
		wayList = ','.join([str(long(i)) for i in way_ids])
		to_remove=[]
		for i in route_ids:
			cur.execute(
			"""
			SELECT id FROM ways
			WHERE id in (
				SELECT member_id FROM relation_members 
				WHERE relation_id =%s and member_id in (%s)
				)
			AND
				tags->'piste:type' = (
					SELECT tags->'piste:type' FROM relations
					WHERE id = %s
					);
			"""
			%(long(i),wayList,long(i)))
			
			to_remove.extend(cur.fetchall())
			con.commit()
		
		clean_way_ids=[]
		for wid in way_ids:
			if wid not in to_remove: clean_way_ids.append(wid)
		way_ids=clean_way_ids
	
	if len(way_ids)>1:
	# group ways
		wayList = ','.join([str(long(i)) for i in way_ids])
		cur.execute(
		"""
		SELECT distinct array_agg(distinct a.id)
		FROM ways as a, ways as b
		WHERE 
			a.id in (%s)
			and b.id in (%s)
			and (a.tags->'name' <>'' or a.tags->'piste:name' <> '')
		GROUP BY (COALESCE(a.tags->'name','')||' '|| COALESCE(a.tags->'piste:name','')) 
				= (COALESCE(b.tags->'name','')||' '|| COALESCE(b.tags->'piste:name',''))
				, ST_touches(a.linestring,b.linestring) , a.tags->'piste:difficulty';
		"""
		%(wayList,wayList))
		way_ids=cur.fetchall()
		con.commit()
		way_ids = [list(set(x[0])) for x in way_ids]
		
		# ST_Touches() does not extend beyond nearest neighbors, we have now 
		# to re-group further by id
		grouped_ways_ids=[way_ids[0]]
		print "ways:" 
		for w in way_ids: print w
		breakabove=False
		for ids in way_ids:
			for grouped_ids in grouped_ways_ids:
				if grouped_ids == ids: continue
				if set(grouped_ids).intersection(ids):
					grouped_ids.extend(ids)
					grouped_ids=list(set(grouped_ids))
					break
				else: 
					grouped_ways_ids.append(ids)
		way_ids=grouped_ways_ids
	
	IDS = {}
	IDS['sites']=site_ids
	IDS['routes']=route_ids
	IDS['ways']=way_ids
	
	cur.close()
	
	return IDS

def makeTopo(IDS, GEO):
	cur = con.cursor()
	topo={}
	topo['sites']=[]
	for osm_id in IDS['sites']:
		osm_id=str(long(osm_id))
		cur.execute("""
		SELECT 
		id,
		tags->'name'
		FROM relations 
		WHERE id=%s;
		"""
		% (osm_id,))
		site=cur.fetchone()
		con.commit()
		
		s={}
		if site:
			s['id']=site[0]
			s['name']=site[1]
		topo['sites'].append(s)
	cur.close()
	
	cur = con.cursor()
	topo['pistes']=[]
	for osm_id in IDS['routes']:
		osm_id=str(long(osm_id))
		cur.execute("""
		SELECT 
		id,
		COALESCE(tags->'name','')||' '||COALESCE(tags->'piste:name',''),
		tags->'piste:type',
		tags->'color',
		tags->'colour'
		FROM relations 
		WHERE id=%s;
		"""
		% (osm_id,))
		piste=cur.fetchone()
		con.commit()
		
		s={}
		if piste:
			s['ids']=[piste[0]]
			s['name']=piste[1]
			s['pistetype']=piste[2]
			if piste[3]:
				s['color']=piste[3]
			else :
				s['color']=piste[4]
			s['difficulty']=None
			s['aerialway']=None
		topo['pistes'].append(s)
	cur.close()
	
	cur = con.cursor()
	for osm_ids in IDS['ways']:
		#~ osm_ids=[str(long(i)) for i in osm_id]
		osm_id=str(long(osm_ids[0]))
		cur.execute("""
		SELECT 
		id,
		COALESCE(tags->'name','')||' '||COALESCE(tags->'piste:name',''),
		tags->'piste:type',
		tags->'piste:difficulty',
		tags->'aerialway'
		FROM ways 
		WHERE id=%s;
		"""
		% (osm_id,))
		piste=cur.fetchone()
		con.commit()
		
		s={}
		if piste:
			s['ids']=osm_ids
			s['name']=piste[1]
			s['pistetype']=piste[2]
			s['color']=''
			s['difficulty']=piste[3]
			s['aerialway']=piste[4]
		topo['pistes'].append(s)
	cur.close()
	
	return topo

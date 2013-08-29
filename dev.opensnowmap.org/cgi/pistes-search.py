#!/usr/bin/python
#
#

import psycopg2
import pdb
import sys, os
from lxml import etree
import json
import cgi
import urllib

def application(environ,start_response):
	request = urllib.unquote(environ['QUERY_STRING'])
	name=''
	point=''
	radius=''
	
	full = False
	if request.find('full=true') !=-1:
		full = True
	if request.find('ids=') !=-1:
		ids=request.split('ids=')[1]
		if ids.find('&'):
			ids=ids.split('&')[0]
			response={}
			response=query_topo(ids)
			response_body=json.dumps(response, sort_keys=True, indent=4)
			status = '200 OK'
			response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
			start_response(status, response_headers)
			return [response_body]
		
	if request.find('name=') !=-1:
		name=request.split('name=')[1]
		if name.find('&'): name=name.split('&')[0]
	if request.find('point=') !=-1:
		point=request.split('point=')[1]
		if point.find('&'): point=point.split('&')[0].replace(';',',')
	if request.find('radius=') !=-1:
		radius=request.split('radius=')[1]
		if radius.find('&'): radius=radius.split('&')[0]
	sites, entrances, routes, ways = query_ids(name,point,radius)
	response=[]
	response.extend(query_sites(sites))
	response.extend(query_routes(routes, full))
	response.extend(query_ways(ways,full))
	response.extend(query_aerialways(ways,full))
	response_body=json.dumps(response, sort_keys=True, indent=4)
	status = '200 OK'
	response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	return [response_body]
	
def query_ids(name='', point='', radius=''):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	
	sites_ids=[]
	entrances_ids=[]
	routes_ids=[]
	ways_ids=[]
	
	# Query db, looking for 'name'
	if name != '':
		name=name.replace(' ','&').replace('%20','&').replace('"', '&').replace("'", "&")
		
		cur.execute("select osm_id from planet_osm_point where to_tsvector(site_name) @@ to_tsquery('%s');"\
			%(name))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			if idx < 0: sites_ids.append(str(idx))
			else: entrances_ids.append(str(idx))
			
		cur.execute("select osm_id from planet_osm_line where \
		to_tsvector(COALESCE(route_name,'')||' '||COALESCE(name,'')||' '||COALESCE(\"piste:name\",'')) @@ to_tsquery('%s');"\
			%(name))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			if idx < 0: routes_ids.append(str(idx))
			else: ways_ids.append(str(idx))
		
	if point != '' and radius != '':
		radius=float(radius)*1000
		if radius > 500000: radius = 500000
		cur.execute("select osm_id from planet_osm_point where ST_DWithin(ST_Transform(ST_SetSRID(ST_MakePoint(%s),4326),900913), way, %s);"\
		%(point, str(radius)))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			if idx < 0: sites_ids.append(str(idx))
			else: entrances_ids.append(str(idx))
		
		cur.execute("select osm_id from planet_osm_line where ST_DWithin(ST_Transform(ST_SetSRID(ST_MakePoint(%s),4326),900913), way, %s);"\
		%(point, str(radius)))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			if idx < 0: routes_ids.append(str(idx))
			else: ways_ids.append(str(idx))
	elif point != '' :
		radius = 50
		cur.execute(" \
		SELECT osm_id \
		FROM \
		  planet_osm_line \
		ORDER BY \
		  ST_Distance(way, ST_Transform(ST_SetSRID(ST_MakePoint(%s),4326),900913)) ASC\
		LIMIT 1;" %(point,))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			if idx < 0: routes_ids.append(str(idx))
			else: ways_ids.append(str(idx))
		ids=ids[0]
	
	con.close()
	return sites_ids, entrances_ids, routes_ids, ways_ids
	
def query_topo(str_id):
	ids=str_id.split(',')
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	topo={}
	
	i=0 # we want to keep json order
	for idx in ids:
		i+=1
		cur.execute("select \
		\"piste:type\", \
		\"piste:difficulty\", \
		\"piste:grooming\", \
		COALESCE(route_name,'')||' '||COALESCE(name,'')||' '||COALESCE(\"piste:name\",''), \
		member_of, \
		\"aerialway\" \
		from planet_osm_line where osm_id = %s" % (idx))
		s=cur.fetchone()
		if s:
			topo[i]={}
			#topo[i]['id']=idx
			if s[0]:
				topo[i]['type']=s[0]
			else:
				topo[i]['type']=s[5]
			topo[i]['difficulty']=s[1]
			topo[i]['grooming']=s[2]
			topo[i]['piste_name']=s[3]
			topo[i]['member_of']=[]
			if s[4]:
				for m in s[4]:
					cur.execute("select \
					route_name, COALESCE(color,'')||''||COALESCE(colour,'') \
					from planet_osm_line where osm_id = -%s" % (m))
					topo[i]['member_of'].append(cur.fetchone())
			topo[i]['aerialway']=s[5]
		else : i-=1
	
	#remove duplicates
	clean_topo={}
	clean_topo[1]=topo[1]
	j=1
	for i in topo:
		if not equal(topo[i],clean_topo[j]):
			j+=1
			clean_topo[j]=topo[i]
	
	con.close()
	return clean_topo
	
def equal(d1,d2):
	for i in d1:
		if d1[i] != d2[i]: return False
	return True
	
def query_sites(sites_ids):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	sites=[]
	for idx in sites_ids:
		site={}
		cur.execute("select site_name, \"piste:type\", ST_AsLatLonText(ST_Transform(way,4326), 'D.DDDDD') \
		from planet_osm_point where osm_id = %s and \"piste:type\" is not null;"\
		%(idx))
		resp=cur.fetchall()
		for s in resp:
			if s:
				site['id']=idx
				site['type']='site'
				site['name']=s[0]
				site['types']=s[1]
				site['center']=s[2].split(' ')[1]+','+s[2].split(' ')[0]
		if len(site) != 0: sites.append(site)
	con.close()
	return sites
	
def query_routes(routes_ids, full):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	routes=[]
	for idx in routes_ids:
		route={}
		cur.execute("select \
				route_name, \
				\"piste:type\", \
				ST_AsLatLonText(st_centroid(ST_Transform(way,4326)),'D.DDDDD'), \
				color, \
				colour \
			from planet_osm_line where osm_id = %s and \"piste:type\" is not null"\
			%(idx))
		resp=cur.fetchall()
		for s in resp:
			if s:
				route['id']=idx
				route['type']='route'
				route['name']=s[0]
				route['types']=s[1]
				route['center']=s[2].split(' ')[1]+','+s[2].split(' ')[0]
				if not s[3]: route['color']=s[4]
				else:  route['color']=s[3]
		if full:
			cur.execute("select in_site \
				from planet_osm_line where osm_id = %s and \"piste:type\" is not null"\
				%(idx))
			resp=cur.fetchall()
			try :
				# only the first site is taken into account
				site_id=-resp[0][0][0]
				cur.execute("select site_name,  \
					ST_AsLatLonText(st_centroid(ST_Transform(way,4326)),'D.DDDDD') \
					from planet_osm_point where osm_id = %s and site_name is not null"\
					%(site_id))
				resp2=cur.fetchall()
				route['site_id']=-site_id
				route['site_name']=resp2[0][0]
				route['site_center']=resp2[0][1].split(' ')[1]+','+resp2[0][1].split(' ')[0]
			except:
				pass
		if len(route) !=0 :routes.append(route)
	con.close()
	return routes
	
def query_ways(ways_ids,full):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	ways=[]
	for idx in ways_ids:
		way={}
		cur.execute("select COALESCE(name,'')||' '||COALESCE(\"piste:name\",''), \"piste:type\", \
		ST_AsLatLonText(st_centroid(ST_Transform(way,4326)), 'D.DDDDD'), \"piste:difficulty\", \"piste:grooming\", \"piste:lit\" \
		from planet_osm_line where osm_id = %s and \"piste:type\" is not null;"\
		%(idx))
		resp=cur.fetchall()
		for s in resp:
			if s:
				way['id']=idx
				way['type']='piste'
				way['name']=s[0]
				way['types']=s[1]
				way['center']=s[2].split(' ')[1]+','+s[2].split(' ')[0]
				way['difficulty']=s[3]
				way['grooming']=s[4]
				way['lit']=s[5]
		if full:
			cur.execute("select in_site \
				from planet_osm_line where osm_id = %s and \"piste:type\" is not null"\
				%(idx))
			resp=cur.fetchall()
			try :
				# only the first site is taken into account
				site_id=-resp[0][0][0]
				cur.execute("select site_name,  \
					ST_AsLatLonText(st_centroid(ST_Transform(way,4326)),'D.DDDDD') \
					from planet_osm_point where osm_id = %s and site_name is not null"\
					%(site_id))
				resp2=cur.fetchall()
				way['site_id']=-site_id
				way['site_name']=resp2[0][0]
				way['site_center']=resp2[0][1].split(' ')[1]+','+resp2[0][1].split(' ')[0]
			except:
				pass
		if len(way) !=0 : ways.append(way)
	con.close()
	return ways

def query_aerialways(ways_ids,full):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	aerialways=[]
	for idx in ways_ids:
		aerialway={}
		cur.execute("select name, aerialway, ST_AsLatLonText(st_centroid(ST_Transform(way,4326)), 'D.DDDDD') from planet_osm_line where osm_id = %s and aerialway is not null;"\
		%(idx))
		resp=cur.fetchall()
		for s in resp:
			if s:
				aerialway['id']=idx
				aerialway['type']='aerialway'
				aerialway['name']=s[0]
				aerialway['types']=s[1]
				aerialway['center']=s[2].split(' ')[1]+','+s[2].split(' ')[0]
		if full:
			cur.execute("select in_site \
				from planet_osm_line where osm_id = %s and \"piste:type\" is not null"\
				%(idx))
			resp=cur.fetchall()
			try :
				# only the first site is taken into account
				s=-resp[0][0][0]
				cur.execute("select site_name,  \
					ST_AsLatLonText(st_centroid(ST_Transform(way,4326)),'D.DDDDD') \
					from planet_osm_point where osm_id = %s and site_name is not null"\
					%(s))
				resp2=cur.fetchall()
				aerialway['site_name']=resp2[0][0]
				aerialway['site_center']=resp2[0][1].split(' ')[1]+','+resp2[0][1].split(' ')[0]
			except:
				pass
		
		if len(aerialway) !=0 : aerialways.append(aerialway)
	con.close()
	return aerialways
#6.46,46.83
#~ n=sys.argv[1]
#~ r=sys.argv[2]
#~ sites, entrances, routes, ways = query_ids('',n,r)
#~ print query_sites(sites)
#~ print query_routes(routes)
#~ print query_ways(ways)
#~ print query_aerialways(ways)


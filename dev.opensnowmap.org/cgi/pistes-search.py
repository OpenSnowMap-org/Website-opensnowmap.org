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

def application(environ,start_response):
	request = urllib.unquote(environ['QUERY_STRING'])
	name=''
	point=''
	radius=''
	
	full = True
	if request.find('full=true') !=-1:
		full = True
	if request.find('ids=') !=-1:
		ids=request.split('ids=')[1]
		if ids.find('&'):
			ids=ids.split('&')[0].split(',')
			response=query_ids(ids,full)
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
	ids= query(name,point)
	response=query_ids(ids,full)
	response_body=json.dumps(response, sort_keys=True, indent=4)
	status = '200 OK'
	response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	return [response_body]
	
def query(name='', point=''):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	
	oms_ids=[]
	
	# Query db, looking for 'name'
	if name != '':
		name=name.replace(' ','&').replace('%20','&').replace('"', '&').replace("'", "&")
		
		cur.execute("select osm_id from planet_osm_point \
					where to_tsvector(site_name) @@ to_tsquery('%s');"\
			%(name))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			oms_ids.append(str(idx))
			
		cur.execute("select osm_id from planet_osm_line where \
					to_tsvector(COALESCE(route_name,'')||' '||COALESCE(name,'')||' '||COALESCE(\"piste:name\",'')) \
					@@ to_tsquery('%s');"\
			%(name))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			oms_ids.append(str(idx))
			
	elif point != '' :
		cur.execute(" \
		SELECT a.osm_id  \
			FROM ( \
			SELECT osm_id, way \
			FROM planet_osm_polygon \
			UNION ALL  \
			SELECT osm_id, way \
			FROM planet_osm_line where osm_id > 0 \
			 ) as a \
		ORDER BY \
		  ST_Distance(a.way, ST_Transform(ST_SetSRID(ST_MakePoint(%s),4326),900913)) ASC\
		LIMIT 1;" %(point,))
		ids=cur.fetchall()
		for i in ids:
			idx=long(i[0])
			oms_ids.append(str(idx))
		ids=ids[0]
	
	con.close()
	return oms_ids
	
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
		from planet_osm_line where osm_id = %s\
		UNION ALL \
		from planet_osm_polygon where osm_id = %s;" % (idx,idx))
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
					if m > 0: m =-m
					cur.execute("select \
					route_name, COALESCE(color,'')||''||COALESCE(colour,'') \
					from planet_osm_line where osm_id = %s\
					UNION ALL \
					from planet_osm_polygon where osm_id = %s;" % (m,m))
					topo[i]['member_of'].append(cur.fetchone())
			topo[i]['aerialway']=s[5]
	
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
	
def query_ids(ids,full):
	con = psycopg2.connect("dbname=pistes-mapnik user=mapnik")
	cur = con.cursor()
	elements=[]
	for idx in ids:
		relidx=-long(idx)
		element={}
		element['id']=''
		element['name']=''
		element['pistetype']=''
		element['center'] =''
		element['pistedifficulty'] =''
		element['pistegrooming']=''
		element['pistelit']=''
		element['color']=''
		element['aerialway']=''
		element['member_of'] =''
		element['in_site']=''
		element['sites']=''
		element['routes']=''
		element['route_name']=''
		element['site_name']=''
		# ways and routes
		# 
		query = "select \
			a.name, \
			a.\"piste:name\", \
			a.\"piste:type\", \
			ST_AsLatLonText(st_centroid(ST_Transform(a.way,4326)), 'D.DDDDD'), \
			a.\"piste:difficulty\",\
			a.\"piste:grooming\",\
			a.\"piste:lit\", \
			a.route_name, \
			a.color, \
			a.colour, \
			a.aerialway, \
			a.member_of, \
			a.in_site \
			from (\
				select way,\
					name, \
					\"piste:name\",\
					\"piste:type\", \
					ST_AsLatLonText(st_centroid(ST_Transform(way,4326)), 'D.DDDDD'), \
					\"piste:difficulty\",\
					\"piste:grooming\",\
					\"piste:lit\", \
					route_name, \
					color, \
					colour, \
					aerialway, \
					member_of, \
					in_site \
				 from planet_osm_line where osm_id = %s or osm_id = %s \
				UNION ALL \
				select way,\
					name, \
					\"piste:name\",\
					\"piste:type\", \
					ST_AsLatLonText(st_centroid(ST_Transform(way,4326)), 'D.DDDDD'), \
					\"piste:difficulty\",\
					\"piste:grooming\",\
					\"piste:lit\", \
					route_name, \
					color, \
					colour, \
					aerialway, \
					member_of, \
					in_site  \
				from planet_osm_polygon where osm_id = %s or osm_id = %s \
				) as a;"
		cur.execute(query %(idx,relidx,idx,relidx))
		resp=cur.fetchall()
		for s in resp:
			if s:
				element['id']=idx
				if s[7]: element['name'] = s[7]
				elif s[1]: element['name'] = s[1]
				elif s[0]: element['name'] = s[0]
				element['pistetype'] = s[2]
				element['center'] = s[3].split(' ')[1]+','+s[3].split(' ')[0]
				element['pistedifficulty'] = s[4]
				element['pistegrooming'] = s[5]
				element['pistelit'] = s[6]
				element['route_name'] = s[7]
				if s[8]: element['color'] = s[8]
				elif s[9]: element['color'] = s[9]
				element['aerialway'] = s[10]
				element['member_of'] = s[11]
				element['in_site'] = s[12]
				if full:
					if element['in_site']:
						element['sites']=[]
						for i in element['in_site']:
							site_id=-long(i)
							site={}
							cur.execute("select site_name,  \
								ST_AsLatLonText(st_centroid(ST_Transform(way,4326)),'D.DDDDD') \
								from planet_osm_point where osm_id = %s and site_name is not null;"\
								%(site_id))
							resp2=cur.fetchall()
							if resp2:
								site['site_name']=resp2[0][0]
								site['site_center']=resp2[0][1].split(' ')[1]+','+resp2[0][1].split(' ')[0]
								element['sites'].append(site)
					if element['member_of']:
						element['routes']=[]
						for i in element['member_of']:
							route_id=-long(i)
							route={}
							cur.execute("select route_name, \
								ST_AsLatLonText(st_centroid(ST_Transform(way,4326)),'D.DDDDD'), \
								COALESCE(color,colour) \
								from planet_osm_line where osm_id = %s and route_name is not null;"\
								%(route_id))
							resp2=cur.fetchall()
							if resp2:
								route['route_name']=resp2[0][0]
								route['route_center']=resp2[0][1].split(' ')[1]+','+resp2[0][1].split(' ')[0]
								if resp2[0][2]: route['color'] = resp2[0][2]
								element['routes'].append(route)
		
		# sites
		# 
		if long(idx) < 0:
			cur.execute("select site_name, \"piste:type\", ST_AsLatLonText(ST_Transform(way,4326), 'D.DDDDD') \
			from planet_osm_point where osm_id = %s and \"piste:type\" is not null;"\
			%(idx))
			resp=cur.fetchall()
			for s in resp:
				if s:
					element['id']=idx
					element['site_name']=s[0]
					element['pistetype']=s[1]
					element['center']=s[2].split(' ')[1]+','+s[2].split(' ')[0]
		if len(element) !=0 : elements.append(element)
	con.close()
	return element_sort(elements)

def element_sort(elements):
	
	for element in elements:
		element['type']=''
		if element['site_name'] and long(element['id']) < 0 : element['type']='SITE'
		elif element['route_name'] and long(element['id']) < 0: element['type']='ROUTE'
		elif element['aerialway']: element['type']='AERIALWAY'
		else : element['type']='PISTE'
	sorted_elements=[]
	for element in elements:
		if element['type']=='SITE' and element['id']: sorted_elements.append(element)
	for element in elements:
		if element['type']=='ROUTE'and element['id']: sorted_elements.append(element)
	for element in elements:
		if element['type']=='PISTE' and element['id']: sorted_elements.append(element)
	for element in elements: 
		if element['type']=='AERIALWAY' and element['id']: sorted_elements.append(element)
	
	return sorted_elements
		
#6.46,46.83
#~ n=sys.argv[1]
#~ r=sys.argv[2]
#~ sites, entrances, routes, ways = query_ids('',n,r)
#~ print query_sites(sites)
#~ print query_routes(routes)
#~ print query_ways(ways)
#~ print query_aerialways(ways)


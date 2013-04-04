#!/usr/bin/python
# list route relation from bbox

import psycopg2
import re

#bbox   5.9614204326416,46.349855875071,6.2106727519774,46.452608286789

def application(environ,start_response):
	request = environ['QUERY_STRING']
	bbox = request.split('bbox=')[1]
	check=bbox.split(',')
	
	left=check[0]
	bottom=check[1]
	right=check[2]
	top=check[3]
	
	db='pistes-mapnik'
	conn = psycopg2.connect("dbname="+db+" user=mapnik")
	cur = conn.cursor()
	cur.execute(" \
			SELECT route_name, color, colour, osm_id \
			FROM planet_osm_line WHERE \
			st_intersects(\
					planet_osm_line.way,\
					st_transform( \
							ST_MakeEnvelope(%s,%s,%s,%s, 900913),\
							900913)) \
			 and osm_id <0 group by osm_id, route_name, color, colour; "\
			, (left, bottom, right, top))
	result=cur.fetchall()
	cur.close()
	conn.close()
	string=''
	for r in result:
		route_name=str(r[0])
		if (str(r[1]) == 'None'): color=str(r[2])
		else : color=str(r[1])
		osm_id=str(r[3])
		string+=route_name+':'+color+':'+osm_id+'|'
	
	response_body=string
	status = '200 OK'
	response_headers = [('Content-Type', 'text/plain'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	return [response_body]


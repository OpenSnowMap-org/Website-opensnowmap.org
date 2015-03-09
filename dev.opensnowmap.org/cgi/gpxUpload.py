#!/usr/bin/env python
# Source is GPL

import sys
#from lxml import etree
import StringIO
import random

import os, os.path



GPXs_dir = '/var/www/gpxs/' 
#TODO:
# Clean and master the elevation code

# Make a ideal track with a point every 10m, to average
# slopes and cumulated climb over 100m
def goodbye():
    return 'goodbye'
    
def application(environ,start_response):
	try:
		request_body_size = int(environ.get('CONTENT_LENGTH', 0))
	except (ValueError):
		request_body_size = 0
	data = environ['wsgi.input'].read(request_body_size)
	print "gpx file lenght: ", len(data)
	if len(data) < 1000000:
		data = environ['wsgi.input'].read(request_body_size)
		f=open(GPXs_dir+str(random.randint(0,99999))+'.gpx','w')
		f.write(data)
		response_body = 'OK'
		status = '200 OK'
		response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		return [response_body]
	else:
		response_body = 'File too big (>10MB)'
		status = '400 Bad Request'
		response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		return [response_body]
		
	

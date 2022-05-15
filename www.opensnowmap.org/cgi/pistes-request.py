#!/usr/bin/env python

import StringIO
import psycopg2
import requestPistes
import pprint
import json
DEBUG=False
pp = pprint.PrettyPrinter(indent=4)

def application(environ,start_response):
            
	request = environ['QUERY_STRING']
	if (DEBUG): print('Query: '+request)
	if (request.find("name") !=-1 or request.find("closest") !=-1 or request.find("bbox") !=-1 or request.find("siteMembers") !=-1 or request.find("topoByWayIds") !=-1 or request.find("siteStats") !=-1 or request.find("routeById") !=-1 ) :
		query=request
		status, responseObject = requestPistes.requestPistes(query)
		if(DEBUG): pp.pprint(responseObject)
	else:
		status = '404 Not Found'
		responseObject = {}
		
	response=json.dumps(responseObject)
	response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response)))]
	start_response(status, response_headers)
	return response


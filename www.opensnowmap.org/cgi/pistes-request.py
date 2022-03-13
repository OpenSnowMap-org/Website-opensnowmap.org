#!/usr/bin/env python

import StringIO
import psycopg2
import requestPistes
import pprint
import json
DEBUG=True
pp = pprint.PrettyPrinter(indent=4)

def application(environ,start_response):
            
	request = urllib.unquote(environ['QUERY_STRING'])
	if (DEBUG): print('Query: '+request)
	if (request.find("request?") !=-1) :
		query=request[9:]
		responseObject = requestPistes.requestPistes(query)
		if(DEBUG): pp.pprint(responseObject)
		status = '200 OK'
	else:
		status = '404'
		
	response=json.dumps(topo, sort_keys=True, indent=4)
	response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response)))]
	start_response(status, response_headers)
	return response


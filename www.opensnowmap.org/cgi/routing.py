#!/usr/bin/env python

from io import StringIO
import psycopg2
import pgroutingRequest
import pprint
import json
DEBUG=True
pp = pprint.PrettyPrinter(indent=4)

def application(environ,start_response):
	# sent back:
	# an 'info' xml if only one coordiante set is posted to the server
	# a 'route' xml if successives coordinates are routable
	# an 'info' xml of the last coordinate set is successives coordinates are not routable
	# error 500 if no node is found
            
	request = environ['QUERY_STRING']
	if (DEBUG): print('Query: '+request)
	if (request.find("ski/") !=-1) :
		query=request[4:-1]
		responseObject = pgroutingRequest.routes(query)
		if(DEBUG): pp.pprint(responseObject)
		status = '200 OK'
	else:
		responseObject = {}
		status = '404 Not Found'
		
	response = json.dumps(responseObject)
	response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response)))]
	start_response(status+' ', response_headers)
	
	return [bytes(response, 'utf-8')]


#!/usr/bin/env python
#import cgi
import urllib2
import sys, os


def application(environ,start_response):
	request = environ['QUERY_STRING']
	
	#~ response_body = str(environ)
	#~ status = '200 OK'
	#~ response_headers = [('Content-Type', 'text/plain'),('Content-Length', str(len(response_body)))]
	#~ start_response(status, response_headers)
	#~ 
	#~ return [response_body]
	
	place=request.split('place=')[1]
	if place.find('&'): place=place.split('&')[0]
	
	baseUrl = 'http://open.mapquestapi.com/nominatim/v1/search?format=json&q='
	place = str(place).replace(' ','+').replace('%20','+')
	url= baseUrl+str(place)
	y = urllib2.urlopen(url)
	
	response_body=y.read()
	y.close()
	
	status = '200 OK'
	response_headers = [('Content-Type', 'application/json'),('Content-Length', str(len(response_body)))]
	
	start_response(status, response_headers)
	return [response_body]


    

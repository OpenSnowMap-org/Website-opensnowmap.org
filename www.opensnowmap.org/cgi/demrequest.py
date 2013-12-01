#!/usr/bin/env python


"""This is a blind proxy that we use to get around browser
restrictions that prevent the Javascript from loading pages not on the
same server as the Javascript.  This has several problems: it's less
efficient, it might break some sites, and it's a security risk because
people can use this proxy to browse the web and possibly do bad stuff
with it.  It only loads pages via http and https, but it can load any
content type. It supports GET and POST requests."""

import urllib2
import cgi
import sys, os
def application(environ,start_response):

	# Designed to prevent Open Proxy type stuff.
	
	allowedHosts = ['192.168.1.3:8080',
					'beta.opensnowmap.org', 'www.opensnowmap.org',
					'dev-yves.dyndns.org', 'www.pistes-nordiques.org',
					'beta.pistes-nordiques.org','dev.pistes-nordiques.org','open.mapquestapi.com']
	
	method = environ["REQUEST_METHOD"]
	url=environ["SCRIPT_FILENAME"]
	
	if method == "POST":
		try:
			request_body_size = int(environ.get('CONTENT_LENGTH', 0))
		except (ValueError):
			request_body_size = 0
		data = environ['wsgi.input'].read(request_body_size)
	else:
		response_body = ''
		status = '200 OK'
		response_headers = [('Content-Type', 'text/plain'),('Content-Length', str(len(response_body)))]
		start_response(status, response_headers)
		return [response_body]
		
		
	
	#~ try:
	host = environ["HTTP_HOST"]
	print host
	if allowedHosts and not host in allowedHosts:
		print "Status: 502 Bad Gateway"
		print "Content-Type: text/plain"
		print
		print "This proxy does not allow you to access that location (%s)." % (host,)
		print
		print environ

	length = int(environ["CONTENT_LENGTH"])
	headers = {"Content-Type": environ["CONTENT_TYPE"]}
	body = sys.stdin.read(length)
	r = urllib2.Request('http://www2.opensnowmap.org/profile?', data, headers)
	y = urllib2.urlopen(r)
	
	# print content type header
	i = y.info()
	if i.has_key("Content-Type"):
		print "Content-Type: %s" % (i["Content-Type"])
	else:
		print "Content-Type: text/plain"
	print
	
	response_body = y.read()
	status = '200 OK'
	response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	return [response_body]
	y.close()
	
	#~ except Exception, E:
		#~ response_body = 'Status: 500 Unexpected Error'
		#~ status = '500 ERROR'
		#~ response_headers = [('Content-Type', 'text/plain'),('Content-Length', str(len(response_body)))]
		#~ start_response(status, response_headers)
		#~ return [response_body]


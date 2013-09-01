#!/usr/bin/python

import Image
import ImageFile
import urllib2
import pdb
import numpy
import StringIO

pistes="http://tiles.opensnowmap.org/tiles-pistes"
hs="http://www2.opensnowmap.org/hillshading"
ct="http://www2.opensnowmap.org/tiles-contours"
modis="http://tiles2.pistes-nordiques.org/snow-cover"

def application(environ,start_response):
	request = environ['REQUEST_URI']
	null, null, z, x, y = request.split('/', 4)
	y, ext = y.split('.')
	z = int(z)
	x = int(x)
	y = int(y)
	response_body = genTile(x, y, z, ext)
	status = '200 OK'
	response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	
	return [response_body]
	
def genTile(x, y, z, ext):
	outTile = Image.new('RGBA', (256, 256),(255, 255, 255,0))
	black = Image.new('RGB', (256, 256),(0,0,0))
	
	if z <=6 :
		url=modis+'/'+str(z)+'/'+str(x)+'/'+str(y)+'.png'
		req = urllib2.Request(url,'')
		req.add_header('User-Agent', 'www.opensnowmap.org')
		response = urllib2.urlopen(req)
		tile = response.read()
		imgParser=ImageFile.Parser()
		imgParser.feed(tile)
		img =imgParser.close()
		img=img.convert('RGBA')
		r, g, b, a = img.split()
		mask = Image.merge("L", (a,))
		outTile.paste(img,None,mask)
		
	# Hillshade
	if z >=10 :
		yy= (2**z)-y-1
		url=hs+'/'+str(z)+'/'+str(x)+'/'+str(yy)+'.png'
		req = urllib2.Request(url,'')
		response = urllib2.urlopen(req)
		tile = response.read()
		imgParser=ImageFile.Parser()
		imgParser.feed(tile)
		img =imgParser.close()
		r, g, b, a = img.split()
		mask = Image.merge("L", (a,))
		v=numpy.asarray(mask)*0.7
		v=numpy.uint8(v)
		value=Image.fromarray(v)
		outTile=Image.composite(black,outTile,value)
	
	# Contours
	if z >=12 :
		url=ct+'/'+str(z)+'/'+str(x)+'/'+str(y)+'.png'
		req = urllib2.Request(url,'')
		response = urllib2.urlopen(req)
		tile = response.read()
		imgParser=ImageFile.Parser()
		imgParser.feed(tile)
		img =imgParser.close()
		img=img.convert('RGBA')
		r, g, b, a = img.split()
		mask = Image.merge("L", (a,))
		v=numpy.asarray(mask)*0.45
		v=numpy.uint8(v)
		value=Image.fromarray(v)
		outTile=Image.composite(img,outTile,value)
		
	url=pistes+'/'+str(z)+'/'+str(x)+'/'+str(y)+'.png'
	req = urllib2.Request(url,'')
	response = urllib2.urlopen(req)
	tile = response.read()
	imgParser=ImageFile.Parser()
	imgParser.feed(tile)
	img =imgParser.close()
	img=img.convert('RGBA')
	r, g, b, a = img.split()
	mask = Image.merge("L", (a,))
	if z >=9 :
		v=numpy.asarray(mask)*0.95
	else :
		v=numpy.asarray(mask)*0.85
	v=numpy.uint8(v)
	value=Image.fromarray(v)
	outTile=Image.composite(img,outTile,value)
	
	buf= StringIO.StringIO()
	outTile.save(buf, format= 'PNG')
	buf.seek(0)
	return str(buf.read())


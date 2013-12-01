##!/usr/bin/env python

import math
import ImageFile
import Image
import os
import re
import sqlite3
import StringIO
from cgi import parse_qs, escape
#

def deg2num(lat_deg, lon_deg, zoom):
	lat_rad = math.radians(lat_deg)
	n = 2.0 ** zoom
	x_tile = (lon_deg + 180.0) / 360.0 * n
	y_tile = (1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n
	#url = 'http://c.tile.openstreetmap.org/'+str(zoom)+'/'+str(xtile)+'/'+str(ytile)+'.png'
	y_tile = (2**zoom-1) -y_tile ##beware, TMS spec !
	return int(x_tile), int(y_tile) #, xtile - int(xtile), ytile - int(ytile)
# 
def num2deg(xtile, ytile, zoom):
	n = 2.0 ** zoom
	lon_deg = xtile / n * 360.0 - 180.0
	ytile = (2**zoom-1) -ytile ##beware, TMS spec !
	lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
	lat_deg = math.degrees(lat_rad)
	return(lat_deg, lon_deg)
#
def clamp(value, minvalue, maxvalue):
	return max(minvalue, min(value, maxvalue))
#
def application(environ,start_response):
	request = environ['REQUEST_URI']
	null, null, z, x, y = request.split('/', 4)
	y, ext = y.split('.')
	z = int(z)
	x = int(x)
	y = int(y)
	if z<11:
	  cache=True
	else:
	  cache=False
	
	response_body = genTile(x, y, z, ext, cache)
	status = '200 OK'
	response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	
	return [response_body]


def genTile(xtile, ytile, zoom, ext, cache):
	base_zoom = 11
	base_dir = '/home/website/tiles/hillshading/'
	db = sqlite3.connect(base_dir+'SRTM_V41_CGIAR_ASTER_hillshade.sqlitedb')
	#db = sqlite3.connect(base_dir+'SRTM_V41_CGIAR_ASTER_hillshade-compressed.sqlitedb')
	cur = db.cursor()
	cur.execute("select image from tiles where x=? and y=? and z=?", (xtile, ytile, zoom))
	res=cur.fetchone()
	if zoom <12:
		if res:
			return str(res[0])
		else:
			fd=open(base_dir +"none.png")
			return fd.read()
	else:
		if res:
			return str(res[0])
		else:

			zoomdelta = zoom - base_zoom
			LAT, LON = num2deg(xtile, ytile, zoom)
			##beware, TMS spec !
			#base_ytile = (2**base_zoom-1) - base_ytileOSM
			base_xtile = int(math.ceil(xtile / (2**zoomdelta)))
			base_ytile = int(math.ceil(ytile / (2**zoomdelta)))
			
			#Create Meta_tile
			canvasX = 3*256
			canvasY = 3*256
			
			stitch = Image.new('RGBA', (canvasX, canvasY))
			
			for x in [-1,0,1]:
				for y in [-1,0,1]:
					cur.execute("select image from tiles where x=? and y=? and z=?", (base_xtile+x, base_ytile+y, base_zoom))
					res=cur.fetchone()
					if res:
						buff = StringIO.StringIO()
						buff.write(str(res[0]))
						buff.seek(0)
						bas = Image.open(buff)
						#buff.close()
						base = bas.convert()
					else: 
						base = Image.open(base_dir +"none.png")
					box= ((x+1)*256, (-y+1)*256)
					stitch.paste(base,box)
			
			# in sub-tile space:
			base_xcorner = (base_xtile)*2**(zoom-base_zoom) 
			base_ycorner = (base_ytile)*2**(zoom-base_zoom) 
			
			delta_x=  xtile - base_xcorner 
			delta_y=  ytile - base_ycorner 
			
			box_size = (256)/(2**(zoom-base_zoom))
			box= (  delta_x*box_size+256 -box_size/2, \
					512-(delta_y+1)*box_size -box_size/2, \
					(delta_x+1)*box_size+256 +box_size/2, \
					512-delta_y*box_size +box_size/2)
			img= stitch.crop(box)
			big_tile=img.resize((2*256,2*256),Image.BILINEAR)
			
			box=(128,128,384,384)
			tile=big_tile.crop(box)
			
			buf= StringIO.StringIO()
			tile.save(buf, format= 'PNG')
			buf.seek(0)
			return str(buf.read())	
	

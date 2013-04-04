##!/usr/bin/env python
# Tile renderer for mapnik with mod_python
# From Sylvain Letuffe work, simplified for better comprehension

import math
import os
from mapnik import *
#

def deg2num(lat_deg, lon_deg, zoom):
	# from lon lat to tile names, see http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
	lat_rad = math.radians(lat_deg)
	n = 2.0 ** zoom
	x_tile = (lon_deg + 180.0) / 360.0 * n
	y_tile = (1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n
	#url = 'http://c.tile.openstreetmap.org/'+str(zoom)+'/'+str(xtile)+'/'+str(ytile)+'.png'
	y_tile = (2**zoom-1) -y_tile ##beware, TMS spec !
	return int(x_tile), int(y_tile) #, xtile - int(xtile), ytile - int(ytile)
# 
def num2deg(xtile, ytile, zoom):
	#from tilenames to lon lat , see http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
	n = 2.0 ** zoom
	lon_deg = xtile / n * 360.0 - 180.0
	ytile = (2**zoom-1) -ytile ##beware, TMS spec !
	lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
	lat_deg = math.degrees(lat_rad)
	return(lat_deg, lon_deg)
#
def num2bbox(xtile, ytile, zoom):
	#from tilenames to bbox , see http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
	# to center the tiles:
	
	xtile= xtile 
	ytile= ytile
	n = 2.0 ** (zoom)
	lon1_deg = xtile / n * 360.0 - 180.0
	#ytile = (2**zoom-1) -ytile ##beware, TMS spec !
	lat1_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
	lat1_deg = math.degrees(lat1_rad)
	
	xtile=xtile + 1
	ytile=ytile + 1
	lon2_deg = xtile / n * 360.0 - 180.0
	#ytile = (2**zoom-1) -ytile ##beware, TMS spec !
	lat2_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
	lat2_deg = math.degrees(lat2_rad)
	# SW, NE
	return(lon1_deg, lat2_deg, lon2_deg, lat1_deg)
#
def RepresentsInt(s):
    try: 
        int(s)
        return True
    except ValueError:
        return False
def application(environ,start_response):
	request = environ['QUERY_STRING']
	
	# decode the parameters given by url:
	rels, z, x, name = request.split('/', 4)
	y=name.split('.')[0]
	ext='png'
	
	z = int(z)
	x = int(x)
	y = int(y)
	
	# The size of the tile in pixel:
	sx = 256
	sy = 256
	
	outname = os.tmpnam()
	
	# Declare usefull projections
	lonlat = Projection('+proj=longlat +datum=WGS84')
	
	proj = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over"

	m = Map(sx,sy,proj)
	#load_map(m,mapfile)
	m.background = Color("transparent")
	# Database settings
	db_params = dict(
	dbname = 'pistes-mapnik',
	user = 'mapnik',
	table = 'planet_osm_line',
	password = 'mapnik',
	estimate_extent = True,
	host = 'localhost',
	port = 5432
	)
	
	offset=3
	i=0
	
	
	try :
		relations = rels.strip('|').split('|')
		for rel in relations:
			
			osm_id=rel.split(':')[0]
			of=int(rel.split(':')[1])
			col=rel.split(':')[2]
			if (col == 'None'):
				col='pink'
			
			if (RepresentsInt(osm_id) and RepresentsInt(of)):
				s = (Style())
				r=Rule()
				try: l = (LineSymbolizer(Color(col),3))
				except: 
					try: l = (LineSymbolizer(Color('#'+col),3))
					except : l = (LineSymbolizer(Color('black'),3))
				l.offset = of*offset
				r.symbols.append(l)
				s.rules.append(r)
				m.append_style('My Style'+str(i),s)
				lyr= Layer('shape'+str(i), proj)
				db_params['table']='(Select way from planet_osm_line where osm_id = %s) as mysubquery' % (osm_id)
				lyr.datasource = PostGIS(**db_params)
				lyr.styles.append('My Style'+str(i))
				m.layers.append(lyr)
				i+=1
	except: pass # maybe there's nothing in the viewport
	
	# compute the bbox corresponding to the requested tile
	ll = num2bbox(x, y, z)
	#return str(ll)
	prj= Projection(proj)
	c0 = prj.forward(Coord(ll[0],ll[1]))
	c1 = prj.forward(Coord(ll[2],ll[3]))
	bbox = Envelope(c0.x,c0.y,c1.x,c1.y)
	
	bbox.width(bbox.width() )
	bbox.height(bbox.height() )
	
	# zoom the map to the bbox
	m.zoom_to_box(bbox)
	
	# render the tile
	im = Image(sx, sy)
	render(m, im)
	view = im.view(0, 0, sx, sy)
	
	# save it on disk
	view.save(outname, ext)
	
	# reopen it as an image
	fd = open(outname)
	response_body = fd.read()
	fd.close()
	status = '200 OK'
	response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	
	return [response_body]

	
#


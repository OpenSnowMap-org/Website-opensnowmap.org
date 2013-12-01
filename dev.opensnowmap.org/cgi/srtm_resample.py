##!/usr/bin/env python

import math
import ImageFile
import Image
import os
import re
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
    #d=parse_qs(environ['REQUEST_URI'])
    #response_body=str(d)
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
    #response_headers = [('Content-Type', 'plain/text'),('Content-Length', str(len(response_body)))]
    start_response(status, response_headers)
    
    return [response_body]


def genTile(xtile, ytile, zoom, ext, cache):
    base_zoom = 11
    # By default, serve tiles compressed by pngnq:
    base_dir = '/home/website/tiles/hillshade/'
    outname = base_dir +'%d/%d/%d.%s'%( zoom, xtile, ytile, ext)
    testname = base_dir + "test"
    if os.path.exists(outname):
        fd = open(outname, 'r')
        return fd.read()
    else:
        # Get tiles non compressed with pngnq for resampling
        base_dir = '/home/website/tiles/hillshade/'
        #outname = base_dir +'%d/%d/%d.%s'%( zoom, xtile, ytile, ext)
        outname = '/tmp/' +'%d.%s'%( zoom+xtile+ytile, ext)
        zoomdelta = zoom - base_zoom
        
        tile_dir=base_dir+str(zoom)+'/'+str(xtile)
        if not os.path.isdir(base_dir+str(zoom)):
            os.mkdir(base_dir+str(zoom))
        if not os.path.isdir(tile_dir):
            os.mkdir(tile_dir)
        
        
        LAT, LON = num2deg(xtile, ytile, zoom)
        ##beware, TMS spec !
        #base_ytile = (2**base_zoom-1) - base_ytileOSM
        base_xtile = int(math.ceil(xtile / (2**zoomdelta)))
        base_ytile = int(math.ceil(ytile / (2**zoomdelta)))
        #print "requested : ", LAT, LON, xtile, ytile, zoom, base_xtile, base_ytile, base_zoom
        #print "base : ", base_xtile, base_ytile, zoom
        #base_filename = base_dir+str(base_zoom)+'/'+str(base_xtile)+'/'+str(base_ytile)+'.png'
        
        #try: base = Image.open(base_filename)
        #except:
            #fd = open(base_dir +"none.png", 'r')
            #return fd.read()
        
        #Create Meta_tile
        canvasX = 3*256
        canvasY = 3*256
        
        stitch = Image.new('RGBA', (canvasX, canvasY))
        
        for x in [-1,0,1]:
            for y in [-1,0,1]:
                base_filename = base_dir+str(base_zoom)+'/'+str(base_xtile+x)+'/'+str(base_ytile+y)+'.png'
                try:
                    bas = Image.open(base_filename)
                    base = bas.convert()
                except: 
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
        
        tile.save(outname)
        fd = open(outname, 'r')
        out = fd.read()
        fd.close()

        #if not cache:
        #    os.unlink(outname)
        return out
#pdb.set_trace()

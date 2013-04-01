#!/usr/bin/env python
# Source is GPL

import Image, ImageDraw, ImageFont
import sys
#from lxml import etree
import math
from math import floor, ceil, sqrt
import sys, random, re, zipfile
import StringIO

from osgeo import gdal, gdalnumeric

#from legen2Html import ...
import os, os.path
import random
import atexit

SRTMFilesDir='/home/website/SRTM-filled/'
PIL_images_dir = '/var/www/tmp/' 
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
    tracks=listTracks(data)
    
    for track in tracks:
        for d in track:
            if d['lat'] > 71.9999:
                response_body = 'Sorry, dataset does not contain elevation data beyond 72 deg. latitude'
                status = '200 OK'
                response_headers = [('Content-Type', 'text/plain'),('Content-Length', str(len(response_body)))]
                start_response(status, response_headers)
                return [response_body]

    tracks=processData(tracks)
    
    response_body = createPics(tracks)
    status = '200 OK'
    response_headers = [('Content-Type', 'image/png'),('Content-Length', str(len(response_body)))]
    start_response(status, response_headers)
    return [response_body]
    
def handle(req):
    from mod_python import apache, util
    #req.content_type = 'text/plain'
    
    #return data
    #return len(data)
    data= req.readline()
    tracks=listTracks(data)
    
    for track in tracks:
        for d in track:
            if d['lat'] > 71.9999:
                req.content_type = 'text/plain'
                req.write('Sorry, dataset does not contain elevation data beyond 72 deg. latitude')
                return apache.OK

    tracks=processData(tracks)
    req.content_type = 'image/png'
    req.write(createPics(tracks))
    #req.write(str(tracks))
    return apache.OK

#
def createPics(tracks):

    fontfile = os.path.join(os.path.dirname(__file__) , 'Fonts/FreeSans.ttf')

    randFilename = random.randrange(0, 100001, 2)
    #PIL_images_dir = os.path.join(os.path.dirname(__file__) , 'tmp/')
    profile_filename = 'profile'+str(randFilename)+'.png'
    
    # serialize tracks
    track=[]
    for t in tracks:
        track.extend(t)
        
    # set scales:
    maxDist=track[len(track)-1]['dist']
    
    minEle=track[0]['ele']
    maxEle=track[0]['ele']
    for t in track:
        if t['ele'] !=0: # discontinuities
            if t['ele'] < minEle: minEle=t['ele']
            if t['ele'] > maxEle: maxEle=t['ele']
    # Set format
    maxDistValue=" %.1fkm" % maxDist
    minEleValue=" %.fm" % minEle
    maxEleValue=" %.fm" % maxEle
    
    #print maxDistValue, minEleValue, maxEleValue
    
    minLat=track[0]['lat']
    maxLat=track[0]['lat']
    for t in track:
        if t['ele'] !=0: # discontinuities
            if t['lat'] < minLat: minLat=t['lat']
            if t['lat'] > maxLat: maxLat=t['lat']
    minLon=track[0]['lon']
    maxLon=track[0]['lon']
    for t in track:
        if t['ele'] !=0: # discontinuities
            if t['lon'] < minLon: minLon=t['lon']
            if t['lon'] > maxLon: maxLon=t['lon']
    
    # Set markers near the track fourth
    #~ markers=[]
    #~ for i in range(1, len(track)):
        #~ if track[i-1]['dist'] < maxDist/4 and track[i]['dist'] > maxDist/4:
             #~ markers.append(track[i])
        #~ if track[i-1]['dist'] < maxDist/2 and track[i]['dist'] > maxDist/2:
             #~ markers.append(track[i])
        #~ if track[i-1]['dist'] < maxDist*3/4 and track[i]['dist'] > maxDist*3/4:
             #~ markers.append(track[i])
             
    # Set the route points
    points=[]
    for t in tracks:
        points.append(t[-1])
    points=points[:-1]
    
    # Provide a reasonable scale for flat tracks
    if (maxEle - minEle) < 50:
        maxEle = (maxEle + minEle)/2 + 25
        minEle = (maxEle + minEle)/2 - 25
    
    #---------------------------------------------
    #------- draw the elevation profile ----------
    #---------------------------------------------
    
    # All sizes are *2 then we downsample for aliasing
    
    sans=ImageFont.truetype(fontfile,10*2)
    #sans=ImageFont.truetype('FreeSans.ttf',10*2) # XX
    width=250*2
    height=120*2
    margin=15
    marginLeft=sans.getsize(str(maxEleValue))[0]
    marginBottom=sans.getsize(str(maxDistValue))[1]
    plotHeight=height-2*margin-marginBottom
    plotWidth=width-2*margin-marginLeft
    
    im = Image.new('RGB',(width,height),'#FFFFFF')
    draw = ImageDraw.Draw(im)
    
    #Draw plot
    # draw elevation grid (20m)
    for i in range(int(minEle/20), int(maxEle/20)+1):
        if i*20 > minEle and i*20< maxEle:
            x1=margin+marginLeft
            y =height-marginBottom-(i*20-minEle)/(maxEle-minEle)*plotHeight
            x2=width-margin
            draw.line((x1,y,x2,y),fill='#BBBBBB',width=1)
    # draw profile
    for i in range(1, len(track)):
        x1=margin+marginLeft+track[i-1]['dist']/maxDist*plotWidth
        y1=height-marginBottom-(track[i-1]['ele']-minEle)/(maxEle-minEle)*plotHeight
        x2=margin+marginLeft+track[i]['dist']/maxDist*plotWidth
        y2=height-marginBottom-(track[i]['ele']-minEle)/(maxEle-minEle)*plotHeight
        if track[i]['ele'] == 0 or track[i-1]['ele'] == 0:
            # discontinuities
            draw.line((x1,y1,x2,y2),fill='#606060',width=1)
        else:
            draw.line((x1,y1,x2,y2),fill='#808080',width=3)
    # Draw point at start, end
    r = 15
    x1=margin+marginLeft+track[0]['dist']/maxDist*plotWidth
    y1=height-marginBottom-(track[0]['ele']-minEle)/(maxEle-minEle)*plotHeight
    x2=margin+marginLeft+track[len(track)-1]['dist']/maxDist*plotWidth
    y2=height-marginBottom-(track[len(track)-1]['ele']-minEle)/(maxEle-minEle)*plotHeight
    draw.ellipse((x1-r/2,y1-r/2,x1+r/2,y1+r/2), fill='#AAAAAA', outline='#000000')
    draw.ellipse((x2-r/2,y2-r/2,x2+r/2,y2+r/2), fill='#000000')
    
    # Draw points on route points
    r = 8
    for point in points:
        x1=margin+marginLeft+point['dist']/maxDist*plotWidth
        y1=height-marginBottom-(point['ele']-minEle)/(maxEle-minEle)*plotHeight
        draw.ellipse((x1-r/2,y1-r/2,x1+r/2,y1+r/2), fill='#FFFFFF', outline='#000000')
        
    # draw a white rectangle under the scales:
    x = 0
    y = height-marginBottom +2
    draw.rectangle((x,y,width,height),\
        fill='#EEEEEE', outline='#EEEEEE')
    draw.rectangle((0,0,marginLeft,height),\
        fill='#EEEEEE', outline='#EEEEEE')
    # Draw scales:
    #~ draw.text((margin+marginLeft,height-marginBottom),'0',fill='#000000',font=sans)
    #~ draw.text((width-sans.getsize(str(maxDistValue))[0],\
    #~ height-marginBottom),str(maxDistValue),fill='#000000',font=sans)
    draw.text((2,height-marginBottom - sans.getsize('1')[1]/2),minEleValue,fill='#000000',font=sans)
    draw.text((2,\
      height-marginBottom-plotHeight - sans.getsize('1')[1]/2),maxEleValue,fill='#000000',font=sans)
    #Draw markers
    #~ for m in markers:
        #~ mDist=" %.1fkm" % m['dist']
        #~ x=margin+marginLeft+m['dist']/maxDist*plotWidth\
         #~ -sans.getsize(str(m['dist']))[0]/2
        #~ y=height-marginBottom
        #~ draw.text((x,y),mDist,fill='#000000',font=sans)
    
    del draw 
    resolution=(int(width/2),int(height/2))
    im = im.resize(resolution,Image.ANTIALIAS)
    
    outname=PIL_images_dir + profile_filename
    im.save(outname, "PNG")
    return '<img src="/tmp/'+profile_filename+'">'
    
#
def gen_html(profile):
    htmlfile = StringIO.StringIO()
    
    htmlfile.write("<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.0 Transitional//EN\">\n\
    <HTML>\n<HEAD>\n\
    <META HTTP-EQUIV=\"CONTENT-TYPE\" CONTENT=\"text/html; charset=utf-8\">\n\
    <TITLE></TITLE>\n<META NAME=\"GENERATOR\" CONTENT=\"elevation profile computation via mod_python\">\n\
    </HEAD>\n\
    <BODY LANG=\"fr-CH\" DIR=\"LTR\">\n")
    #     <link rel=\"stylesheet\" type=\"text/css\" href=\"/test_ol_vec/profile.css\" >\n\
    
    htmlfile.write("<IMG SRC=\"http://dev-yves.dyndns.org/pistes-nordiques-frontend/images/"+profile+"\" ALIGN=ABSMIDDLE>")
                    #+"<IMG SRC=\"http://dev-yves.dyndns.org/pistes-nordiques-frontend/images/"+tour+"\" ALIGN=ABSMIDDLE>")
    htmlfile.write("</BODY>\n</HTML>")
    htmlfile.seek(0)
    return htmlfile
    
#
def bilinear_interpolation(tl, tr, bl, br, a, b):
    """
    Based on equation from:
    http://en.wikipedia.org/wiki/Bilinear_interpolation
    
    :Parameters:
        tl : int
            top-left
        tr : int
            top-right
        bl : int
            buttom-left
        br : int
            bottom-right
        a : float
            x distance to top-left
        b : float
            y distance to top-right

    :Returns: (float)
        interpolated value
    """
    b1 = tl
    b2 = bl - tl
    b3 = tr - tl
    b4 = tl - bl - tr + br

    return b1 + b2 * a + b3 * b + b4 * a * b


class SrtmTiff(object):
    """
    Provides an interface to SRTM elevation data stored in GeoTIFF file.
    
    Based on code from `eleserver` code by grahamjones139.
    http://code.google.com/p/eleserver/
    """
    tile = {}
    
    def __init__(self, filename):
        """
        Reads the GeoTIFF files into memory ready for processing.
        """
        self.tile = self.load_tile(filename)
    
    def load_tile(self, filename):
        """
        Loads a GeoTIFF tile from disk and returns a dictionary containing
        the file data, plus metadata about the tile.

        The dictionary returned by this function contains the following data:
            xsize - the width of the tile in pixels.
            ysize - the height of the tile in pixels.
            lat_origin - the latitude of the top left pixel in the tile.
            lon_origin - the longitude of the top left pixel in the tile.
            lat_pixel - the height of one pixel in degrees latitude.
            lon_pixel - the width of one pixel in degrees longitude.
            N, S, E, W - the bounding box for this tile in degrees.
            data - a two dimensional array containing the tile data.

        """
        dataset = gdal.Open(filename)
        geotransform = dataset.GetGeoTransform()
        xsize = dataset.RasterXSize
        ysize = dataset.RasterYSize
        lon_origin = geotransform[0]
        lat_origin = geotransform[3]
        lon_pixel = geotransform[1]
        lat_pixel = geotransform[5]
        
        retdict = {
            'xsize': xsize,
            'ysize': ysize,
            'lat_origin': lat_origin,
            'lon_origin': lon_origin,
            'lon_pixel': lon_pixel,
            'lat_pixel': lat_pixel,
            'N': lat_origin,
            'S': lat_origin + lat_pixel*ysize,
            'E': lon_origin + lon_pixel*xsize,
            'W': lon_origin,
            'dataset': dataset,
            }
        
        return retdict  

    def pos_from_lat_lon(self, lat, lon):
        """
        Converts coordinates (lat,lon) into the appropriate (row,column)
        position in the GeoTIFF tile data stored in td.
        """
        td = self.tile
        N = td['N']
        S = td['S']
        E = td['E']
        W = td['W']
        lat_pixel = td['lat_pixel']
        lon_pixel = td['lon_pixel']
        xsize = td['xsize']
        ysize = td['ysize']
        
        rowno_f = (lat-N)/lat_pixel
        colno_f = (lon-W)/lon_pixel
        rowno = int(floor(rowno_f))
        colno = int(floor(colno_f))

        # Error checking to correct any rounding errors.
        if (rowno<0):
            rowno = 0
        if (rowno>(xsize-1)):
            rowno = xsize-1
        if (colno<0):
            colno = 0
        if (colno>(ysize-1)):
            colno = xsize-1
            
        return (rowno, colno, rowno_f, colno_f)
    
    def get_elevation(self, lat, lon):
        """
        Returns the elevation in metres of point (lat, lon).
        
        Uses bilinar interpolation to interpolate the SRTM data to the
        required point.
        """
        row, col, row_f, col_f = self.pos_from_lat_lon(lat, lon)

        # NOTE - THIS IS A FIDDLE TO STOP ERRORS AT THE EDGE OF
        # TILES - IT IS NO CORRECT - WE SHOULD GET TWO POINTS 
        # FROM THE NEXT TILE.
        #if row==5999: row=5998
        #if col==5999: col=5998
        if row==1200: row=1199
        if col==1200: col=1199

        htarr = gdalnumeric.DatasetReadAsArray(self.tile['dataset'], col, row, 2, 2)

        height = bilinear_interpolation(htarr[0][0], htarr[0][1], htarr[1][0], htarr[1][1],
                                       row_f-row, col_f-col)

        return height


class SrtmLayer(object):
    """
    Provides an interface to SRTM elevation data stored in GeoTIFF files.
    
    Files are automaticly downloaded from mirror server and cached in
    `~/.gpxtools` directory.
    
    Sample usage:
    
        >>> lat = 52.25
        >>> lon = 16.75
        >>> srtm = SrtmLayer()
        >>> ele = srtm.get_elevation(lat, lon)
        >>> round(ele, 4)
        63.9979
        
    """
    _cache = {}
    
    def _unzip_srtm_tiff(self, srtm_path):
        """
        Download and unzip GeoTIFF file.
        """
        #insert unzip for hgt.zip
        z = zipfile.ZipFile(srtm_path+'.zip')
        out_file = open(srtm_path, 'w')
        out_file.write(z.read(os.path.basename(srtm_path)))
        
        z.close()
        out_file.close()
        
    def get_srtm_filename(self, lat, lon):
        """
        Filename of GeoTIFF file containing data with given coordinates.
        """
        """colmin = floor((6000 * (180 + lon)) / 5)
        rowmin = floor((6000 * (60 - lat)) / 5)
    
        ilon = ceil(colmin / 6000.0)
        ilat = ceil(rowmin / 6000.0)"""
        ilon = abs(floor(lon))
        ilat = abs(floor(lat))
        
        if lon > 0 and lat > 0 :return 'N%02dE%03d.tif' % (ilat, ilon)
        if lon < 0 and lat > 0 :return 'N%02dW%03d.tif' % (ilat, ilon)
        if lon > 0 and lat < 0 :return 'S%02dE%03d.tif' % (ilat, ilon)
        if lon < 0 and lat < 0 :return 'S%02dW%03d.tif' % (ilat, ilon)
    def get_elevation(self, lat, lon):
        """
        Returns the elevation in metres of point (lat, lon).
        """
        srtm_filename = self.get_srtm_filename(lat, lon)
        
        srtm_path = os.path.join(SRTMFilesDir, srtm_filename)
        if not os.path.isfile(srtm_path):
            self._unzip_srtm_tiff(srtm_path)
        
        srtm=SrtmTiff(srtm_path)
        return srtm.get_elevation(lat, lon)
#
def linearDist(lat1, lon1, lat2, lon2):

    # Convert latitude and longitude to 
    # spherical coordinates in radians.
    degrees_to_radians = math.pi/180.0
        
    # phi = 90 - latitude
    phi1 = (90.0 - lat1)*degrees_to_radians
    phi2 = (90.0 - lat2)*degrees_to_radians
        
    # theta = longitude
    theta1 = lon1*degrees_to_radians
    theta2 = lon2*degrees_to_radians
        
    # Compute spherical distance from spherical coordinates.
        
    # For two locations in spherical coordinates 
    # (1, theta, phi) and (1, theta, phi)
    # cosine( arc length ) = 
    #    sin phi sin phi' cos(theta-theta') + cos phi cos phi'
    # distance = rho * arc length
    
    cos = (math.sin(phi1)*math.sin(phi2)*math.cos(theta1 - theta2) + 
           math.cos(phi1)*math.cos(phi2))
    arc = math.acos( clamp(cos,-1,1)) # clamp will avoid rounding error that would lead cos outside of [-1,1] 'Math domain error'

    # Remember to multiply arc by the radius of the earth 
    # in your favorite set of units to get length.
    
    return arc*6371 #return km
    
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    
    d = math.acos(math.sin(lat1)*math.sin(lat2) + \
                  math.cos(lat1)*math.cos(lat2) * \
                  math.cos(lon2-lon1)) * 6371 
    return d
#
def clamp(value, minvalue, maxvalue):
    return max(minvalue, min(value, maxvalue))
#
def llDistance(ll1,ll2):
    return math.sqrt((ll2['lon']-ll1['lon'])**2+(ll2['lat']-ll1['lat'])**2)

def listTracks(data):
    # split the multiline into a list of line
    lines = re.findall('\([-0-9., ]+\)',data)
    tracks=[]
    for line in lines:
        track=[]
        # split the line into a list of lon lat
        lon_lat = line.replace('(','').replace(')','').split(',')
        
        track.append({'lon': float(lon_lat[0].split(' ')[0]), 
                      'lat':float(lon_lat[0].split(' ')[1])})
        
        for i in range(1,len(lon_lat)):
            t={'lon': float(lon_lat[i].split(' ')[0]), 
                'lat':float(lon_lat[i].split(' ')[1])}
            lim=0.02
            segLength=llDistance(track[i-1],t)
            if segLength < lim:
                track.append(t)
            else:
                # add a point every 0.002deg at least
                n = int(segLength/lim)
                print n
                lon1=track[-1]['lon']
                lat1=track[-1]['lat']
                lon2=t['lon']
                lat2=t['lat']
                a = (lat2-lat1)/(lon2-lon1)
                b= lat1-a*lon1
                DLON=(lon2-lon1)/float(n)
                for j in range(0,n+1):
                    LON=lon1+float(j)*DLON
                    LAT=a*LON+b
                    track.append({'lon': LON, 'lat':LAT})
                    
        tracks.append(track)
    return tracks

def processData(tracks):
    #outFile=open('out.csv','w') # XX
    
    _srtm = SrtmLayer()
    dist = 0
    for track in tracks:
        lstEle = 0
        for pt in track:
            if pt['lat'] == 0 and pt['lon'] ==0 : pt['ele']= 0
            else:
                pt['ele']=_srtm.get_elevation(float(pt['lat']),float(pt['lon']))
            
        track[0]['dist']=dist
    
        for i in range(1,len(track)):
                track[i]['dist']=track[i-1]['dist']+llDistance(track[i],track[i-1])
                dist=track[i]['dist']
        
    return tracks
#
def addtionnalComputation(track):
    # We'll see later accuracy problem and slope computation
    positiveSlope=0
    maxPositiveSlope=0
    positiveDistance=0
    negativeSlope=0
    negativeDistance=0
    maxNegativeSlope=0
    for i in range(1, len(track)):
        if track[i]['ele'] > track[i-1]['ele']:
            positiveSlope += track[i]['ele'] - track[i-1]['ele']
            positiveDistance += track[i]['dist'] - track[i-1]['dist']
            try:
                slope = (track[i]['ele'] - track[i-1]['ele'])/(track[i]['dist'] - track[i-1]['dist'])/10
                if slope > maxPositiveSlope: maxPositiveSlope = slope
            except: pass
        else:
            negativeSlope += track[i-1]['ele'] - track[i]['ele']
            negativeDistance += track[i]['dist'] - track[i-1]['dist']
            try:
                slope = (track[i-1]['ele'] - track[i]['ele'])/(track[i]['dist'] - track[i-1]['dist'])/10
                if slope > maxNegativeSlope: maxNegativeSlope = slope
            except: pass
    
    positiveSlopeValue=" %.fm" % positiveSlope
    maxPositiveSlopeValue=" %.f %%" % maxPositiveSlope
    positiveDistanceValue=" %.fkm" % positiveDistance
    negativeSlopeValue=" %.fm" % negativeSlope
    negativeDistanceValue=" %.fkm" % negativeDistance
    maxNegativeSlopeValue=" %.f %%" % maxNegativeSlope
    return None
#
if __name__ == "__main__":
    SRTMFilesDir=''
    PIL_images_dir = '/var/tmp/' 
    f=open(sys.argv[1],'r')
    data=f.read()
    tracks=listTracks(data)
    tracks=processData(tracks)
    print data
    for track in tracks:
        for d in track:
            if d['lat'] > 71.9999:
                print 'Sorry, dataset does not contain elevation data beyond 72 deg. latitude'
    createPics(tracks)

        

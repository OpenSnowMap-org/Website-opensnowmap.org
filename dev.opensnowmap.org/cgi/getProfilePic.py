#!/usr/bin/env python
# Source is GPL

test="""LINESTRING(6.44719 46.83028,6.44735 46.83045,6.44787 46.83108,6.44832 46.83157,6.44848 46.83172,6.45038
 46.83287,6.45048 46.83292,6.45079 46.83294,6.4516599999999995 46.832770000000004,6.4518699999999995
 46.83276,6.452229999999999 46.83279,6.454289999999999 46.83325,6.45459 46.83346,6.45496 46.83386,6.45534
 46.8345,6.4553899999999995 46.834849999999996,6.45517 46.83559999999999,6.4551 46.83575999999999,6.45473
 46.83619999999999,6.45407 46.83702999999999,6.45397 46.83724999999999,6.45395 46.83732999999999,6.45397
 46.83741999999999,6.45364 46.83751999999999,6.45361 46.837439999999994,6.453270000000001 46.83736,6
.452800000000001 46.83714,6.45234 46.83688,6.4516 46.83653,6.45134 46.83621,6.45107 46.835950000000004
,6.45069 46.83567000000001,6.44977 46.835100000000004,6.4495 46.834920000000004,6.44935 46.83476,6.44911
 46.83467,6.4488 46.83462,6.44845 46.834630000000004,6.44798 46.834590000000006,6.447690000000001 46
.834520000000005,6.447500000000001 46.834410000000005,6.447150000000001 46.834140000000005,6.446860000000001
 46.83395,6.446280000000001 46.83373,6.445970000000001 46.83368,6.445800000000001 46.8337,6.445630000000001
 46.83363,6.445440000000001 46.83347,6.445310000000001 46.8333,6.445130000000001 46.83299,6.445050000000001
 46.83268,6.444580000000001 46.83240000000001,6.444390000000001 46.832260000000005,6.4440300000000015
 46.83189000000001,6.443670000000002 46.831590000000006,6.443530000000002 46.83151000000001,6.443410000000002
 46.83137000000001,6.443410000000002 46.83128000000001,6.443620000000002 46.83072000000001,6.443620000000002
 46.83061000000001,6.443150000000002 46.83015000000001,6.443110000000002 46.83008000000001,6.443100000000002
 46.83000000000001,6.443210000000002 46.829920000000016,6.443340000000003 46.82989000000001,6.444230000000003
 46.829990000000016,6.4445200000000025 46.830030000000015,6.445090000000002 46.830230000000014,6.445510000000002
 46.830320000000015,6.447190000000003 46.830280000000016)"""
"""
tracks= [{'lat': 46.83028, 'dist': 0, 'lon': 6.44719, 'ele': 1095.3285854152914}, {'lat': 46.83045, 'dist': 0.00023345235059658522, 'lon': 6.44735, 'ele': 1095.8333890633241}, {'lat': 46.83108, 'dist': 0.0010503366753336508, 'lon': 6.44787, 'ele': 1100.4144731515669}, {'lat': 46.83157, 'dist': 0.0017156185704721586, 'lon': 6.44832, 'ele': 1100.4484384767977}, {'lat': 46.83172, 'dist': 0.0019349356924654344, 'lon': 6.44848, 'ele': 1099.9968500421558}, {'lat': 46.83287, 'dist': 0.004155858923918098, 'lon': 6.45038, 'ele': 1101.9574635434376}, {'lat': 46.83292, 'dist': 0.004267662322793622, 'lon': 6.45048, 'ele': 1102.2882424006871}, {'lat': 46.83294, 'dist': 0.004578306814133565, 'lon': 6.45079, 'ele': 1102.6460464336396}, {'lat': 46.832770000000004, 'dist': 0.005464760422620152, 'lon': 6.4516599999999995, 'ele': 1103.5910383634473}, {'lat': 46.83276, 'dist': 0.005674998383036633, 'lon': 6.4518699999999995, 'ele': 1103.7200637742753}, {'lat': 46.83279, 'dist': 0.006036246220400298, 'lon': 6.452229999999999, 'ele': 1103.9046482667306}, {'lat': 46.83325, 'dist': 0.008146980689725553, 'lon': 6.454289999999999, 'ele': 1109.9942773445403}, {'lat': 46.83346, 'dist': 0.00851317735819927, 'lon': 6.45459, 'ele': 1106.6761060576016}, {'lat': 46.83386, 'dist': 0.009058062667231736, 'lon': 6.45496, 'ele': 1103.4293250037092}, {'lat': 46.8345, 'dist': 0.009802374429866277, 'lon': 6.45534, 'ele': 1107.2786090394229}, {'lat': 46.834849999999996, 'dist': 0.010155927820456968, 'lon': 6.4553899999999995, 'ele': 1111.0103209047807}, {'lat': 46.83559999999999, 'dist': 0.010937528741640258, 'lon': 6.45517, 'ele': 1116.6959383251972}, {'lat': 46.83575999999999, 'dist': 0.011112171233606954, 'lon': 6.4551, 'ele': 1117.5630714592905}, {'lat': 46.83619999999999, 'dist': 0.011687062527677405, 'lon': 6.45473, 'ele': 1120.8134368000281}, {'lat': 46.83702999999999, 'dist': 0.012747486971002229, 'lon': 6.45407, 'ele': 1124.1127313579211}, {'lat': 46.83724999999999, 'dist': 0.01298914789047291, 'lon': 6.45397, 'ele': 1123.3607177712163}, {'lat': 46.83732999999999, 'dist': 0.013071610002982357, 'lon': 6.45395, 'ele': 1123.1331917945747}, {'lat': 46.83741999999999, 'dist': 0.013163805447555455, 'lon': 6.45397, 'ele': 1123.2893557988057}, {'lat': 46.83751999999999, 'dist': 0.013508624240547695, 'lon': 6.45364, 'ele': 1121.72902128188}, {'lat': 46.837439999999994, 'dist': 0.013594064277997947, 'lon': 6.45361, 'ele': 1121.4064871392463}, {'lat': 46.83736, 'dist': 0.013943349261928287, 'lon': 6.453270000000001, 'ele': 1120.1533295888867}, {'lat': 46.83714, 'dist': 0.014462290491740906, 'lon': 6.452800000000001, 'ele': 1121.0563342982862}, {'lat': 46.83688, 'dist': 0.014990684284284779, 'lon': 6.45234, 'ele': 1120.8741510684031}, {'lat': 46.83653, 'dist': 0.01580928064391435, 'lon': 6.4516, 'ele': 1120.1248692797451}, {'lat': 46.83621, 'dist': 0.016221591206477697, 'lon': 6.45134, 'ele': 1118.3513904925985}, {'lat': 46.835950000000004, 'dist': 0.01659642450275594, 'lon': 6.45107, 'ele': 1116.2885550780477}, {'lat': 46.83567000000001, 'dist': 0.017068441451601964, 'lon': 6.45069, 'ele': 1113.276877290702}, {'lat': 46.835100000000004, 'dist': 0.01815070759262431, 'lon': 6.44977, 'ele': 1112.2724062934565}, {'lat': 46.834920000000004, 'dist': 0.01847520720741659, 'lon': 6.4495, 'ele': 1112.5686509325471}, {'lat': 46.83476, 'dist': 0.01869452432941173, 'lon': 6.44935, 'ele': 1112.6970543015834}, {'lat': 46.83467, 'dist': 0.018950844441771118, 'lon': 6.44911, 'ele': 1114.1849888945108}, {'lat': 46.83462, 'dist': 0.019264850811133348, 'lon': 6.4488, 'ele': 1115.9226413114839}, {'lat': 46.834630000000004, 'dist': 0.019614993639133743, 'lon': 6.44845, 'ele': 1117.447421798576}, {'lat': 46.834590000000006, 'dist': 0.020086692695736416, 'lon': 6.44798, 'ele': 1118.0866126108249}, {'lat': 46.834520000000005, 'dist': 0.02038502137353984, 'lon': 6.447690000000001, 'ele': 1118.1804108694676}, {'lat': 46.834410000000005, 'dist': 0.02060456635754046, 'lon': 6.447500000000001, 'ele': 1117.9270839880255}, {'lat': 46.834140000000005, 'dist': 0.02104660707964679, 'lon': 6.447150000000001, 'ele': 1117.1129064113325}, {'lat': 46.83395, 'dist': 0.021393305796115616, 'lon': 6.446860000000001, 'ele': 1117.6629912367091}, {'lat': 46.83373, 'dist': 0.022013628292886247, 'lon': 6.446280000000001, 'ele': 1120.8318638462156}, {'lat': 46.83368, 'dist': 0.022327634662248477, 'lon': 6.445970000000001, 'ele': 1123.1524482800214}, {'lat': 46.8337, 'dist': 0.02249880708993441, 'lon': 6.445800000000001, 'ele': 1125.4451508364102}, {'lat': 46.83363, 'dist': 0.022682654853043053, 'lon': 6.445630000000001, 'ele': 1126.1432128193744}, {'lat': 46.83347, 'dist': 0.022931049700011145, 'lon': 6.445440000000001, 'ele': 1125.872839549178}, {'lat': 46.8333, 'dist': 0.02314505904559943, 'lon': 6.445310000000001, 'ele': 1126.2433440499433}, {'lat': 46.83299, 'dist': 0.02350352801217734, 'lon': 6.445130000000001, 'ele': 1126.7014267411153}, {'lat': 46.83268, 'dist': 0.02382368422404785, 'lon': 6.445050000000001, 'ele': 1124.7753354754659}, {'lat': 46.83240000000001, 'dist': 0.024370767398709633, 'lon': 6.444580000000001, 'ele': 1127.2507632000531}, {'lat': 46.832260000000005, 'dist': 0.024606775873134753, 'lon': 6.444390000000001, 'ele': 1127.1539242564343}, {'lat': 46.83189000000001, 'dist': 0.02512301225309775, 'lon': 6.4440300000000015, 'ele': 1124.0676179503153}, {'lat': 46.831590000000006, 'dist': 0.02559162723365374, 'lon': 6.443670000000002, 'ele': 1123.1740942003005}, {'lat': 46.83151000000001, 'dist': 0.025752872388618234, 'lon': 6.443530000000002, 'ele': 1123.7428208247934}, {'lat': 46.83137000000001, 'dist': 0.025937263277765396, 'lon': 6.443410000000002, 'ele': 1124.2500362168403}, {'lat': 46.83128000000001, 'dist': 0.02602726327776554, 'lon': 6.443410000000002, 'ele': 1123.6138413339038}, {'lat': 46.83072000000001, 'dist': 0.026625343539937892, 'lon': 6.443620000000002, 'ele': 1114.1977689133378}, {'lat': 46.83061000000001, 'dist': 0.02673534353993728, 'lon': 6.443620000000002, 'ele': 1112.5968133213864}, {'lat': 46.83015000000001, 'dist': 0.027392990861833316, 'lon': 6.443150000000002, 'ele': 1111.2183619181565}, {'lat': 46.83008000000001, 'dist': 0.027473613439317215, 'lon': 6.443110000000002, 'ele': 1111.0079919289042}, {'lat': 46.83000000000001, 'dist': 0.02755423601679715, 'lon': 6.443100000000002, 'ele': 1110.5466980007825}, {'lat': 46.829920000000016, 'dist': 0.027690250721882945, 'lon': 6.443210000000002, 'ele': 1109.5605976704892}, {'lat': 46.82989000000001, 'dist': 0.02782366736252515, 'lon': 6.443340000000003, 'ele': 1108.7946753107663}, {'lat': 46.829990000000016, 'dist': 0.02871926771982787, 'lon': 6.444230000000003, 'ele': 1103.5379685954933}, {'lat': 46.830030000000015, 'dist': 0.029012013343193435, 'lon': 6.4445200000000025, 'ele': 1103.3247167190295}, {'lat': 46.830230000000014, 'dist': 0.02961608287561459, 'lon': 6.445090000000002, 'ele': 1103.1545346264913}, {'lat': 46.830320000000015, 'dist': 0.030045617507512997, 'lon': 6.445510000000002, 'ele': 1101.9375523649474}, {'lat': 46.830280000000016, 'dist': 0.03172609363052131, 'lon': 6.447190000000003, 'ele': 1095.3285854153432}]
"""

import matplotlib
matplotlib.use('Agg')

import Image, ImageDraw, ImageFont
import sys
#from lxml import etree
import math
from math import floor, ceil, sqrt
import sys, random, re, zipfile
import StringIO
import urllib

from osgeo import gdal, gdalnumeric

#from legen2Html import ...
import os, os.path
import random
import atexit


import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

from matplotlib.collections import PolyCollection
from matplotlib.colors import colorConverter
from matplotlib import rc
import numpy as np


if os.path.isdir("/home/website"):
	SRTMFilesDir='/home/website/DEM/tiles/'
else:
	SRTMFilesDir='/home/admin/DEM2/tiles/'
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
    request =urllib.unquote(environ['QUERY_STRING'])
    size = 'small'
    if request.find('size=big') !=-1:
        size = 'big'
    
    color = 'black'
    if request.find('color=') !=-1:
        color=request.split('color=')[1]
        if color.find('&'): color=color.split('&')[0]
    
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
    
    response_body = createPics(tracks, size, color)
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
def createPics(tracks, size, color):

    fontfile = os.path.join(os.path.dirname(__file__) , 'Fonts/FreeSans.ttf')

    randFilename = random.randrange(0, 100001, 2)
    #PIL_images_dir = os.path.join(os.path.dirname(__file__) , 'tmp/')
    profile_filename = 'profile'+str(randFilename)
    
    # serialize tracks
    track=[]
    for t in tracks:
        
        track.extend(t)
        track.append({'lat': np.nan, 'dist': np.nan, 'lon': np.nan, 'ele': np.nan})
    
    
    """
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
    """
    lats=[]
    lons=[]
    eles=[]
    dists=[]
    
    
    for t in track:
        lats.append(t['lat'])
        lons.append(t['lon'])
        eles.append(t['ele'])
        dists.append(t['dist'])
    #~ plt.plot(lons,lats)
    #~ plt.show()
    
    #~ fig = plt.figure()
    #~ ax = fig.gca(projection='3d')
    #~ ax.fill(lons,lats,eles,'r')
    #~ plt.show()
    #~ exit(0)
    xs=lons
    ys=lats
    zs=eles
    ls=dists
    
    dpi=100
    width =200
    height=150
    if size == 'big':
        width=280
        height=200
        
    col = (0,0,0)
    try: col = colorConverter.to_rgb(color)
    except: pass # cheap colorparser
    
    ### 3D plot
    # Code to convert data in 3D polygons
    v = []
    h=min(zs)
    for k in range(0, len(xs) - 1):
        x = [xs[k], xs[k+1], xs[k+1], xs[k]]
        y = [ys[k], ys[k+1], ys[k+1], ys[k]]
        z = [zs[k], zs[k+1],       h,     h]
        v.append(zip(x, y, z))
    poly3dCollection = Poly3DCollection(v,facecolors=(0.0,0.,0.1,0.5),edgecolors='none')
    # Code to plot the 3D polygons
    plt.rcParams['axes.labelsize']= 1
    fig = plt.figure(figsize=(width/dpi,height/dpi),dpi=dpi)
    #~ ax = Axes3D(fig)
    ax = fig.gca(projection='3d')
    ax.add_collection3d(poly3dCollection)
    
    ax.set_zlim([min(zs), max(zs)])
    
    # set equal scale on x and y
    ex = max(xs)-min(xs)
    mx = (max(xs)+min(xs))/2
    ey = max(ys)-min(ys)
    my = (max(ys)+min(ys))/2
    if (ex > ey) :
        ax.set_ylim(my - ex/2 , my + ex/2)
        ax.set_xlim(mx - ex/2 , mx + ex/2)
    else :
        ax.set_xlim(mx - ey/2, mx + ey/2)
        ax.set_ylim(my - ey/2 , my + ey/2)
    
    #~ ax.set_axis_off()
    # Get rid of the spines
    #~ ax.w_xaxis.line.set_color((1.0, 1.0, 1.0, 0.0)) 
    #~ ax.w_yaxis.line.set_color((1.0, 1.0, 1.0, 0.0)) 
    # Get rid of the ticks 
    #~ ax.zaxis._axinfo['tick']['inward_factor'] = 0
    #~ ax.zaxis._axinfo['tick']['outward_factor'] = 0.2
    ax.set_xticks([])                               
    ax.set_yticks([])         
    ax.set_zticks([int(min(zs)), int(max(zs))])
    ax.set_zticks([])  
    zed = [tick.label.set_fontsize(7) for tick in ax.zaxis.get_major_ticks()]
    ax.elev=60
    plt.tight_layout(pad=0.1)
    #~ plt.axis('equal')
    fig.savefig(PIL_images_dir+profile_filename+'-3d.png',dpi=dpi)
    #plt.show()
    
    ### Way plot
    
    mercxs = [ merc_x(x) for x in xs]
    mercys = [ merc_y(y) for y in ys]
    
    fig, ax = plt.subplots()
    fig.set_size_inches(width/dpi,width/dpi, forward=True)
    fig.set_dpi(dpi)
    ax.set_xticks([])                               
    ax.set_yticks([])
    plt.axis('off')
    ax.plot(mercxs,mercys, alpha=0.6, linewidth=3, color=col)
    
    
    # set equal scale on x and y
    ex = (max(mercxs)-min(mercxs))*1.1
    mx = (max(mercxs)+min(mercxs))/2
    ey = (max(mercys)-min(mercys))*1.1
    my = (max(mercys)+min(mercys))/2
    
    ax.set_xlim([min(mercxs)-ex/10, max(mercxs)+ex/10])
    ax.set_ylim([min(mercys)-ey/10, max(mercys)+ey/10])
    if (ex > ey) :
        ax.set_ylim(my - ex/2 , my + ex/2)
    else :
        ax.set_xlim(mx - ey/2, mx + ey/2)
    
    for n in [int(len(mercxs)/4), 2*int(len(mercxs)/4), 3*int(len(mercxs)/4)] :
        if n < len(mercxs)-1:
            l=sqrt((max(mercxs)-min(mercxs))**2+((max(mercys)-min(mercys))**2))/30
            a=math.atan2((mercys[n+1]-mercys[n]),(mercxs[n+1]-mercxs[n]))
            y2=mercys[n]+math.sin(a)*l
            x2=mercxs[n]+math.cos(a)*l
            
            arrow=dict(facecolor=(0,0,0,0.7), edgecolor=(1,1,1,0), headwidth = 7, frac = 0.7, width=2)
            plt.annotate(s='',xy=(x2,y2),xytext=(mercxs[n],mercys[n]),arrowprops=arrow)
    ax.plot(mercxs[0],mercys[0],'o',color=(0,0,0), alpha=0.6)
    plt.tight_layout(pad=0.1)
    fig.savefig(PIL_images_dir+profile_filename+'-2d.png',dpi=dpi)
    #~ plt.show()
    
    
    ### profileplot
    
    #Add points to 'close' the profile
    zs.insert(0,min(zs))
    ls.insert(0,ls[0])
    
    zs.append(min(zs))
    ls.append(ls[-1])
    
    zs.append(zs[0])
    ls.append(ls[0])
    
    print zs
    while np.nan in zs:
        n = zs.index(np.nan)
        zs[n]=zs[n-1]
    while np.nan in ls:
        n = ls.index(np.nan)
        ls[n]=ls[n-1]
    
    v= list(zip(ls,zs))
    print v
    poly = PolyCollection([v],facecolors=(0.0,0.,0.1,0.3),edgecolors='none')
    
    
    fig, ax = plt.subplots()
    fig.set_size_inches(width/dpi,height/dpi, forward=True)
    fig.set_dpi(dpi)
    ax.set_xticks([])                               
    #~ ax.set_yticks([])
    #~ plt.axis('off')
    ax.spines['bottom'].set_color((1.0, 1.0, 1.0, 0.5)) 
    ax.spines['top'].set_color((1.0, 1.0, 1.0, 0)) 
    ax.spines['left'].set_color((1.0, 1.0, 1.0, 0)) 
    ax.spines['right'].set_color((1.0, 1.0, 1.0, 0)) 
    ax.tick_params(axis='y', colors=(0,0,0,0.7))
    ax.add_collection(poly)
    ax.set_xlim(min(ls),max(ls))
    ax.set_ylim(min(zs),max(zs))
    #~ ax.plot(ls,zs, alpha=0.6, linewidth=1, color=(0.5,0.5,0.5))
    
    
    #~ ax.fill_between(ls, min(zs), zs, facecolor=(0,0,0,0.3), interpolate=True)
    ax.set_yticks([int(min(zs)), int(max(zs))])
    
    zed = [tick.label.set_fontsize(7) for tick in ax.yaxis.get_major_ticks()]
    plt.tight_layout(pad=0.1)
    fig.savefig(PIL_images_dir+profile_filename+'-ele.png',dpi=dpi)
    
    
    return profile_filename
    
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
        self.geotransform=geotransform
        retdict = {
            'xsize': xsize,
            'ysize': ysize,
            'lat_origin': lat_origin,
            'lon_origin': lon_origin,
            'lon_pixel': lon_pixel,
            'lat_pixel': lat_pixel,
            'N': lat_origin - lat_pixel*ysize,
            'S': lat_origin,
            'W': lon_origin + lon_pixel*xsize,
            'E': lon_origin,
            'dataset': dataset,
            }
        
        return retdict  
    
    def get_elevation(self, lat, lon):
        """
        Returns the elevation in metres of point (lat, lon).
        
        Uses bilinar interpolation to interpolate the SRTM data to the
        required point.
        """
        
        
        col_f, row_f = gdal.ApplyGeoTransform(gdal.InvGeoTransform(self.geotransform)[1], lon, lat)
        
        col = int(col_f)
        row = int(row_f)
        
        # NOTE - THIS IS A FIDDLE TO STOP ERRORS AT THE EDGE OF
        # TILES - IT IS NO CORRECT - WE SHOULD GET TWO POINTS 
        # FROM THE NEXT TILE.
        #if row==5999: row=5998
        #if col==5999: col=5998
        if row>3600: row=3600
        if row>3600: row=3600
        if col>3600: col=3600
        if col>3600: col=3600
        
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
        ilon = (floor(lon))
        ilat = (floor(lat+1))
        
        #~ if lon > 0 and lat > 0 and lat <60 :return 'N%02dE%03d.tif' % (ilat, ilon)
        #~ if lon < 0 and lat > 0 and lat <60:return 'N%02dW%03d.tif' % (ilat, ilon)
        #~ if lon > 0 and lat < 0 :return 'S%02dE%03d.tif' % (ilat, ilon)
        #~ if lon < 0 and lat < 0 :return 'S%02dW%03d.tif' % (ilat, ilon)
        #~ if lon > 0 and lat > 0 and lat >=60 :return 'as_N%02dE%01d.tif' % (ilat, ilon)
        #~ if lon < 0 and lat > 0 and lat >=60:return 'as_N%02dE-%01d.tif' % (ilat, ilon)
        filename = 'out_dem/out_%01d-%01d.tif' % (ilat, ilon)
        
        return filename
        
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
def merc_x(lon):
  r_major=6378137.000
  return r_major*math.radians(lon)

def merc_y(lat):
  if lat>89.5:lat=89.5
  if lat<-89.5:lat=-89.5
  r_major=6378137.000
  r_minor=6356752.3142
  temp=r_minor/r_major
  eccent=math.sqrt(1-temp**2)
  phi=math.radians(lat)
  sinphi=math.sin(phi)
  con=eccent*sinphi
  com=eccent/2
  con=((1.0-con)/(1.0+con))**com
  ts=math.tan((math.pi/2-phi)/2)/con
  y=0-r_major*math.log(ts)
  return y
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
        #~ print tracks
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
    
    for track in tracks:
        for d in track:
            if d['lat'] > 71.9999:
                print 'Sorry, dataset does not contain elevation data beyond 72 deg. latitude'
    createPics(tracks)

        

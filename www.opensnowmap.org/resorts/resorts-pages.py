#!/usr/bin/python

import json
import cgi
import urllib
import locale
import os
import cgi
import codecs

here = os.path.dirname(__file__)
data=os.path.abspath(os.path.join(here, '../../data/resorts.json'))
template=os.path.abspath(os.path.join(here, 'resorts_tpl.html'))

def application(environ,start_response):
	
	request = environ['REQUEST_URI'].split('/')
	resort=''
	response_body=''
	if len(request) == 2:
		response_body=rootPage()
	if len(request) == 3:
		country=request[2]
		response_body=countryPage(urllib.unquote(country).decode('utf-8'))
	if len(request) == 4:
		resort=request[3]
		response_body=resortPage(urllib.unquote(resort).decode('utf-8'))
	
		
	status = '200 ok'
	response_headers = [('Content-Type', 'text/html'),( 'charset', 'utf-8'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	
	return [response_body]

def rootPage():
	json_data=open(data).read()
	resorts=json.loads(json_data)
	
	countries=[]
	for r in resorts:
		countries.append(resorts[r]['country'])
	countries=list(set(countries))
	countries=sorted(countries,cmp=locale.strcoll)
	
	html='<div id=list>\n'
	html+='<table class="tableList">\n'
	html+='<tr><td class="tdList">\n'
	i=0
	for c in countries:
		html+='<a href="/resorts/'+c+'" title="ski '+c+' "> . '+c+'</a><br/>\n'
		i+=1
		if i> len(countries)/3:
			i=0
			html+='</td><td class="tdList">\n'
	
	html+='</td></tr></table></div>\n'
	
	html+="""
		<iframe id="map" width="710" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
		src="http://www.opensnowmap.org/embed.html?zoom=2&lat=40&lon=-20"
		style="border: 0px">
		</iframe>
		"""
	tpl=open(template)
	page=tpl.read()
	tpl.close()
	
	page=page.replace('xxcontentxx',html)
	return page.encode('utf-8')

def countryPage(country):
	json_data=open(data).read()
	resorts=json.loads(json_data)
	
	resortList=[]
	for r in resorts:
		if (country == resorts[r]['country']):
			resortList.append(resorts[r])
		
	resortList=sorted(resortList,key=lambda k: k['name'])
	
	html='<div id=list>\n'
	html+='<table class="tableList">\n'
	html+='<tr><td class="tdList">\n'
	i=0
	lons=[]
	lats=[]
	for r in resortList:
		html+='<a href="/resorts/'+country+'/'+r['name']+'" title="ski '+r['name']+' ">'
		html+=' . '+r['name']+'</a><br/>\n'
		lons.append(float(r['lon']))
		lats.append(float(r['lat']))
		i+=1
		if i> len(resortList)/3:
			i=0
			html+='</td><td class="tdList">\n'
	
	html+='</td></tr></table></div>\n'
	
	lon= str(reduce(lambda x, y: x + y, lons) / len(lons))
	lat= str(reduce(lambda x, y: x + y, lats) / len(lats))
	print lon, lat
	
	html+="""
		<iframe id="map" width="710" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
		src="http://www.opensnowmap.org/embed.html?zoom=4&lat="""+lat+"""&lon="""+lon+""""
		style="border: 0px">
		</iframe>
		"""
	
	tpl=open(template)
	page=tpl.read()
	tpl.close()
	
	page=page.replace('xxcontentxx',html)
	return page.encode('utf-8')
	
def resortPage(resortName):
	
	json_data=open(data).read()
	resorts=json.loads(json_data)
	
	resort=''
	for r in resorts:
		if (resortName == resorts[r]['name']):
			resort=resorts[r]
			osm_id=r
	
	
	html='<h2 itemprop="name" title="ski '+resortName+'">'+resortName+'</h2>\n'
	
	lon= str(resort['lon'])
	lat= str(resort['lat'])
	html+='<span itemprop="map" content="http://www.opensnowmap.org/embed.html?zoom=12&lat='+lat+'&lon='+lon+'"></span>'
	
	html+= '<div id="stats"></div>'
	
	
	html+="""
		<iframe id="map" width="710" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
		src="http://www.opensnowmap.org/embed.html?zoom=12&lat="""+lat+"""&lon="""+lon+""""
		style="border: 0px">
		</iframe>
		"""
	
	
	html+='<p><a href="http://www.opensnowmap.org?zoom=12&lat='+lat+'&lon='+lon+'" title="ski map'+resortName+'">'
	html+=resortName+' on www.opensnowmap.org<img src="/pics/external-flat22.png"></img></a></p>'
	
	html+= '<div id="pisteList"></div>'
	
	html+= '<div><script>on_load('+osm_id+');</script></div>'
	
	html+= '<span itemprop="address" itemscope itemtype="http://schema.org/PostalAddress">'
	html+= '<meta itemprop="addressCountry" content="'+resort['country']+'">'
	html+= '<meta itemprop="addressRegion" content="'+resort['state']+'"></span>'
	
	tpl=open(template)
	page=tpl.read()
	tpl.close()
	
	page=page.replace('xxcontentxx',html)
	return page.encode('utf-8')

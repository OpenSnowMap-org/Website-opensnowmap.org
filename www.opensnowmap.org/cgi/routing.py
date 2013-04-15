#!/usr/bin/env python

#import cgi
import sys, os, os.path
import math, random
import StringIO
from xml.sax import make_parser, handler
import xml
import psycopg2
import re
from lxml import etree

def application(environ,start_response):
	# sent back:
	# an 'info' xml if only one coordiante set is posted to the server
	# a 'route' xml if successives coordinates are routable
	# an 'info' xml of the last coordinate set is successives coordinates are not routable
	# error 500 if no node is found
	
	request = environ['QUERY_STRING']
	
	coords = request.split(',')
	xml=''
	# if only one point is sent, returna small informative xml
	if len(coords) <=2:
		lat1=float(coords[0].split(';')[0])
		lon1=float(coords[0].split(';')[1])
		xml=info(lat1, lon1)
		
	else:
		# define the bbox where requesting the data
		minlat=float(coords[0].split(';')[0])
		minlon=float(coords[0].split(';')[1])
		maxlat=float(coords[0].split(';')[0])
		maxlon=float(coords[0].split(';')[1])
		
		for c in coords:
			if c :
				if (float(c.split(';')[0])<minlat):minlat=float(c.split(';')[0])
				if (float(c.split(';')[0])>maxlat):maxlat=float(c.split(';')[0])
				if (float(c.split(';')[1])<minlon):minlon=float(c.split(';')[1])
				if (float(c.split(';')[1])>maxlon):maxlon=float(c.split(';')[1])
		margin = 0.02
		left=str(minlon-margin)
		right=str(maxlon+margin)
		top=str(maxlat+margin)
		bottom=str(minlat-margin)
		s=getOsm(left, bottom, right, top)
		
		# Load data from the bbox
		data = LoadOsm(s)
		xml=xmlRoute(data, coords)
	
	status = '200 OK'
	response_body= xml
	response_headers = [('Content-Type', 'application/xml'),('Content-Length', str(len(response_body)))]
	start_response(status, response_headers)
	return [response_body]
	
def getOsm(left, bottom, right, top):
	db='pistes-xapi'
	conn = psycopg2.connect("dbname="+db+" user=xapi")
	
	cur = conn.cursor()
	#~ cur.execute(" \
					#~ SELECT id, nodes \
					#~ FROM ways WHERE \
					#~ st_intersects(\
							#~ ways.linestring,\
							#~ ST_MakeEnvelope(%s,%s,%s,%s, 4326)\
							#~ ) \
					 #~ and tags ? 'piste:type'; "\
					#~ , (left, bottom, right, top))
	cur.execute(" \
					SELECT id, nodes \
					FROM ways WHERE \
					st_intersects(\
							ways.linestring,\
							ST_MakeEnvelope(%s,%s,%s,%s, 4326)\
							); "\
					, (left, bottom, right, top))
	result=cur.fetchall()
	ways={}
	for r in result:
		ways[r[0]]=[]
		for i in range(len(r[1])):
			nid=r[1][i]
			cur.execute(" select st_x(geom), st_y(geom) from nodes where id=%s" % (nid))
			nll=cur.fetchone()
			ways[r[0]].append([nid,nll])
	
	root = etree.Element("osm")
	for wid in ways:
		nids=[]
		for node in ways[wid]:
			nid=node[0]
			lon=str(node[1][0])
			lat=str(node[1][1])
			nids.append(nid)
			node=etree.Element("node", id=str(nid), lon=lon, lat=lat)
			root.append(node)
		way=etree.Element("way", id=str(wid))
		for nid in nids:
			way.append(etree.Element("nd", ref=str(nid)))
		root.append(way)
	s=StringIO.StringIO()
	s.write(etree.tostring(root, pretty_print=True))
	s.seek(0)
	return s
	
def xmlRoute(data,coords):
	# Route between successive points send to the script:
	routeNodes = []
	routeWays = []
	for i in range(len(coords)-2):
		lon1 = float(coords[i].split(';')[1])
		lat1 = float(coords[i].split(';')[0])
		lon2 = float(coords[i+1].split(';')[1])
		lat2 = float(coords[i+1].split(';')[0])
		
		node1 = data.findNode(lat1, lon1)
		node2 = data.findNode(lat2, lon2)
		
		router = Router(data)
		result, route, nodes, ways= router.doRouteAsLL(node1, node2)
		
		routeNodes.append(nodes)
		routeWays.extend(ways)
		
		# if routing fails, we sent back last node informations
		if (result == 'success'): continue
		else:
			xml=info(lat2, lon2)
			return xml
	
	# create the WKT MultilineString:
	wkt='MULTILINESTRING(('
	for line in routeNodes:
		for n in line:
			wkt=wkt+str(data.nodes[int(n)][1])+ ' '+ str(data.nodes[int(n)][0]) +','
		wkt=wkt[:-2]+'),('
	wkt=wkt[:-3]+'))'
    
	# Create wayid list:
	way_ids=[]
	for r in routeWays:
		wid=r.split(',')[1]
		if len(way_ids) >=1:
			if wid != way_ids[-1] and wid!='0' : way_ids.append(wid)
		else : way_ids.append(wid)
	ids=','.join(way_ids[1:])
    
	# create XML:
	xml = '<?xml version="1.0" encoding="UTF-8" ?>\n  <route>\n'
	xml += '	<wkt>' + wkt + '\n	</wkt>\n'
	xml += '	<ids>' + ids + '\n	</ids>\n'
	xml += '	<length>' + lengthWkt(wkt) + '\n	</length>\n'
	xml += '  </route>\n'
	
	return xml
	
class Router:
	def __init__(self, data):
		self.data = data
	def distance(self,n1,n2):
		"""Calculate distance between two nodes"""
		lat1 = self.data.nodes[n1][0]
		lon1 = self.data.nodes[n1][1]
		lat2 = self.data.nodes[n2][0]
		lon2 = self.data.nodes[n2][1]
		# TODO: projection issues
		dlat = lat2 - lat1
		dlon = lon2 - lon1
		dist2 = dlat * dlat + dlon * dlon
		return(math.sqrt(dist2))
	def doRouteAsLL(self,start,end):
		result, nodes ,ways= self.doRoute(start,end)
		
		if(result != 'success'):
			return(result,[],[],[])
		pos = []
		for node in nodes:
			lat,lon = self.data.nodes[node]
			pos.append((lat,lon))
		return(result, pos, nodes, ways)
	def doRoute(self,start,end):
		"""Do the routing"""
		self.searchEnd = end
		closed = [start]
		self.queue = []
		
		# Start by queueing all outbound links from the start node
		#blankQueueItem = {'end':-1,'distance':0,'nodes':[(str(start),0)]}
		blankQueueItem = { \
						'end':-1,
						'distance':0,
						'nodes':str(start),
						'ways':str(start)+',0'}
		try:
			for i, wayid in self.data.routing[start].items():
				self.addToQueue(start,i, blankQueueItem, wayid)
		except KeyError:
			return('no_such_node',[],[])
		
		# Limit for how long it will search
		count = 0
		while count < 10000:
			count = count + 1
			try:
				nextItem = self.queue.pop(0)
			except IndexError:
				print "Queue is empty: failed"
				return('',[],[])
			x = nextItem['end']
			if x in closed:
				continue
			if x == end:
				# Found the end node - success
				#routeNodes = [int(i[0]) for i in nextItem['nodes']]
				routeNodes = [int(i) for i in nextItem['nodes'].split(",")]
				return('success', routeNodes, nextItem['ways'].split(";"))
			closed.append(x)
			try:
				for i, wayid in self.data.routing[x].items():
					if not i in closed:
						self.addToQueue(x,i,nextItem, wayid)
			except KeyError:
				pass
		else:
			return('gave_up',[],[])
	
	def addToQueue(self,start,end, queueSoFar, wayid):
		"""Add another potential route to the queue"""
		
		# If already in queue
		for test in self.queue:
			if test['end'] == end:
				return
		distance = self.distance(start, end)
		#if(weight == 0):
			#return
		#distance = distance / weight
		
		# Create a hash for all the route's attributes
		distanceSoFar = queueSoFar['distance']
		#try: nodes = queueSoFar['nodes'].append((str(end),str(wayid)))
		#except: pdb.set_trace()
		nodes= queueSoFar['nodes'] + "," + str(end)
		ways= queueSoFar['ways']+ ";" +str(end)+ "," +str(wayid)
		queueItem = { \
			'distance': distanceSoFar + distance,
			'maxdistance': distanceSoFar + self.distance(end, self.searchEnd),
			'nodes': nodes,
			'ways': ways,
			'end': end}
		
		# Try to insert, keeping the queue ordered by decreasing worst-case distance
		count = 0
		for test in self.queue:
			if test['maxdistance'] > queueItem['maxdistance']:
				self.queue.insert(count,queueItem)
				break
			count = count + 1
		else:
			self.queue.append(queueItem)

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
	#	sin phi sin phi' cos(theta-theta') + cos phi cos phi'
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

def info(lat1, lon1):
	db='pistes-mapnik'
	conn = psycopg2.connect("dbname="+db+" user=mapnik")
	cur = conn.cursor()
	box=0.0001
	## find the closestway
	cur.execute("SELECT osm_id, \
				  ST_Distance( \
					way, \
					st_transform(ST_GeometryFromText('POINT(%s %s)', 4326),900913)\
				  ) AS dist  \
				 FROM planet_osm_line   \
				 WHERE way && st_transform(st_setsrid('BOX3D(%s %s,%s %s)'::box3d, 4326),900913) and osm_id >0 \
				 ORDER BY dist LIMIT 1;" %(lon1, lat1, lon1-box, lat1-box, lon1+box, lat1+box))
	try: wayid=str(cur.fetchall()[0][0])
	# maybe there is not pistes nearby
	except: return None
	
	# create XML:
	xml = '<?xml version="1.0" encoding="UTF-8" ?>\n  <route>\n'
	xml += '<info>'+ wayid+'</info>'
	xml += '  </route>\n'
	return xml

def lengthWkt(wkt):
	length=0
	lines=re.findall('\([-0-9. ,]+\)',wkt)
	for l in lines:
		#le=0
		lonlat = re.findall('[-0-9. ]+',l)
		for i in range(len(lonlat)-1):
			flon1=float(lonlat[i].split(' ')[0])
			flat1=float(lonlat[i].split(' ')[1])
			flon2=float(lonlat[i+1].split(' ')[0])
			flat2=float(lonlat[i+1].split(' ')[1])
			length+=linearDist(flat1, flon1, flat2, flon2)
		#ls.append(str(le))
	return str(length)
#
def clamp(value, minvalue, maxvalue):
	return max(minvalue, min(value, maxvalue))
#
if __name__ == "__main__":
	
	handle("46.819861857936 6.3819670541344,46.827446755502 6.3980225909661,")#46.833474656204 6.4021853614751,")

#!/usr/bin/python
#----------------------------------------------------------------
# load OSM data file into memory
#
#------------------------------------------------------
# Usage: 
#	 data = LoadOsm(filename)
# or:
#	 loadOsm.py filename.osm
#------------------------------------------------------
# Copyright 2007, Oliver White
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.	If not, see <http://www.gnu.org/licenses/>.
#------------------------------------------------------
# Changelog:
#	2007-11-04	OJW	Modified from pyroute.py
#	2007-11-05	OJW	Multiple forms of transport
#------------------------------------------------------


class LoadOsm(handler.ContentHandler):
	"""Parse an OSM file looking for routing information, and do routing with it"""
	def __init__(self, filename, storeMap = 1):
		"""Initialise an OSM-file parser"""
		self.routing = {}
		self.routeableNodes = {}
		self.nodes = {}
		self.ways = {}
		self.relations = {}
		self.storeMap = storeMap
		
		if(filename == None):
			return
		self.loadOsm(filename)
		
	def loadOsm(self, filename):
		#~ if(not os.path.exists(filename)):
			#~ print "No such data file %s" % filename
			#~ return
		try:
			parser = make_parser()
			parser.setContentHandler(self)
			parser.parse(filename)
		except xml.sax._exceptions.SAXParseException:
			print "Error loading %s" % filename
		
	def report(self):
		"""Display some info about the loaded data"""
		report = "Loaded %d nodes,\n" % len(self.nodes.keys())
		report = report + "%d ways, and...\n" % len(self.ways)
		report = report + " %d routes\n" % ( \
			len(self.routing.keys()))
		return(report)
		
	def savebin(self,filename):
		self.newIDs = {}
		
		f = open(filename,"wb")
		f.write(pack('L',len(self.nodes.keys())))
		count = 0
		for id, n in self.nodes.items():
			self.newIDs[id] = count
			f.write(encodeLL(n[0],n[1]))
			count = count + 1
			
		errors = 0
		data = self.routing.items()
		f.write(pack('L', len(data)))
		for fr, destinations in data:
			try:
				f.write(pack('L', self.newIDs[fr]))
			except KeyError:
				f.write(pack('L', 0))
				errors = errors + 1
				continue
			f.write(pack('B', len(destinations.keys())))
			for to, weight in destinations.items():
				try:
					f.write(pack('Lf', self.newIDs[to], weight))
				except KeyError:
					f.write(pack('Lf', 0, 0))
					errors = errors + 1
			
		print "%d key errors" % errors
		f.close()
		
	def loadbin(self,filename):
		f = open(filename,"rb")
		n = unpack('L', f.read(4))[0]
		print "%u nodes" % n
		id = 0
		for i in range(n):
			lat,lon = decodeLL(f.read(8))
			#print "%u: %f, %f" % (id,lat,lon)
			id = id + 1

		numLinks = 0
		numHubs = unpack('L', f.read(4))[0]
		print numHubs
		for hub in range(numHubs):
			fr = unpack('L', f.read(4))[0]
			numDest = unpack('B', f.read(1))[0]
			for dest in range(numDest):
				to,weight = unpack('Lf', f.read(8))
				numLinks = numLinks + 1
			#print fr, to, weight
		print "	\"\" (%u segments)" % (numLinks)

		f.close()

	def startElement(self, name, attrs):
		"""Handle XML elements"""
		if name in('node','way','relation'):
			
			self.tags = {}
			self.waynodes = []
			self.relationmembers= []
			self.id = int(attrs.get('id'))
			if name == 'node':
				"""Nodes need to be stored"""
				id = int(attrs.get('id'))
				lat = float(attrs.get('lat'))
				lon = float(attrs.get('lon'))
				self.nodes[id] = (lat,lon)
			#if name == 'way':
				#self.id = int(attrs.get('id'))
		elif name == 'nd':
			"""Nodes within a way -- add them to a list, they can be stored later with storemap"""
			self.waynodes.append(int(attrs.get('ref')))
		elif name == 'member':
			"""Ways within a relation -- add them to a list, they can be stored later with storemap"""
			self.relationmembers.append(int(attrs.get('ref')))
			print attrs.get('ref')
		elif name == 'tag':
			"""Tags - store them in a hash"""
			k,v = (attrs.get('k'), attrs.get('v'))
			if not k in ('created_by'):
				self.tags[k] = v
	
	def endElement(self, name):
		"""Handle ways in the OSM data"""
		if name == 'way':
			
			# Store routing information
			last = -1
			for i in self.waynodes:
				if last != -1:
					weight = 1
					self.addLink(last, i, self.id)
					self.addLink(i, last, self.id)
				last = i
			
			# Store map information
			if(self.storeMap):
				wayType = self.WayType(self.tags)
				self.ways[self.id] = { \
					't':wayType,
					'n':self.waynodes,
					'tags':self.tags}
		if name == 'relation':
			if(self.storeMap):
				self.relations[self.id] = { \
					'n':self.relationmembers,
					'tags':self.tags}
	
	def addLink(self,fr,to, wayid):
		"""Add a routeable edge to the scenario"""
		self.routeablefrom(fr)
		try:
			if to in self.routing[fr].keys():
				return
			self.routing[fr][to] = wayid
		except KeyError:
			self.routing[fr] = {to: wayid}

	def WayType(self, tags):
		value = tags.get('piste:type', '')
		return value
		
	def routeablefrom(self,fr):
		self.routeableNodes[fr] = 1

	def findNode(self,lat,lon):
		"""Find the nearest node to a point.
		Filters for nodes which have a route leading from them"""
		maxDist = 1000
		nodeFound = None
		for id in self.routeableNodes.keys():
			if id not in self.nodes:
				print "Ignoring undefined node %s" % id
				continue
			n = self.nodes[id]
			dlat = n[0] - lat
			dlon = n[1] - lon
			dist = dlat * dlat + dlon * dlon
			if(dist < maxDist):
				maxDist = dist
				nodeFound = id
		return(nodeFound)
		
# Parse the supplied OSM file
if __name__ == "__main__":
	print "Loading data..."
	data = LoadOsm(sys.argv[1], True)
	print data.report()
	print "Saving binary..."
	data.savebin("data/routing.bin")
	print "Loading binary..."
	data2 = LoadOsm(None, False)
	data2.loadbin("data/routing.bin")
	print "Done"

Weightings = { \
  'motorway': {'car':10},
  'trunk':	{'car':10, 'cycle':0.05},
  'primary':  {'cycle': 0.3, 'car':2, 'foot':1, 'horse':0.1},
  'secondary': {'cycle': 1, 'car':1.5, 'foot':1, 'horse':0.2},
  'tertiary': {'cycle': 1, 'car':1, 'foot':1, 'horse':0.3},
  'unclassified': {'cycle': 1, 'car':1, 'foot':1, 'horse':1},
  'minor': {'cycle': 1, 'car':1, 'foot':1, 'horse':1},
  'cycleway': {'cycle': 3, 'foot':0.2},
  'residential': {'cycle': 3, 'car':0.7, 'foot':1, 'horse':1},
  'track': {'cycle': 1, 'car':1, 'foot':1, 'horse':1, 'mtb':3},
  'service': {'cycle': 1, 'car':1, 'foot':1, 'horse':1},
  'bridleway': {'cycle': 0.8, 'foot':1, 'horse':10, 'mtb':3},
  'footway': {'cycle': 0.2, 'foot':1},
  'steps': {'foot':1, 'cycle':0.3},
  'rail':{'train':1},
  'light_rail':{'train':1},
  'subway':{'train':1},
  'nordic':{'ski':1}
  }

def getWeight(transport, wayType):
  try:
	return(Weightings[wayType][transport])
  except KeyError:
	# Default: if no weighting is defined, then assume it can't be routed
	return(0)


def encodeLL(lat,lon):
  pLat = (lat + 90.0) / 180.0 
  pLon = (lon + 180.0) / 360.0 
  iLat = encodeP(pLat)
  iLon = encodeP(pLon)
  return(pack("II", iLat, iLon))
  
def encodeP(p):
  i = int(p * 4294967296.0)
  return(i)
  

def decodeLL(data):
  iLat,iLon = unpack("II", data)
  pLat = decodeP(iLat)
  pLon = decodeP(iLon)
  lat = pLat * 180.0 - 90.0
  lon = pLon * 360.0 - 180.0
  return(lat,lon)
  
def decodeP(i):
  p = float(i) / 4294967296.0
  return(p)
  

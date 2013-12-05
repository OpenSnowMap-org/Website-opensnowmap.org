var lon, lat, zoom, map, layer, vectorLayer,highlightLayer, PistesTiles;
var jsonPisteList={};
lat=46.41;
lon=6.06;
zoom=15;
var LIVE=true;

var icon = {
"downhill":'pics/alpine.png',
"cable_car":'pics/cable_car.png',
"chair_lift":'pics/chair_lift.png',
"drag_lift":'pics/drag_lift.png',
"funicular":'pics/funicular.png',
"gondola":'pics/gondola.png',
"jump":'pics/jump.png',
"magic_carpet":'pics/magic_carpet.png',
"mixed_lift":'pics/mixed_lift.png',
"nordic":'pics/nordic.png',
"skitour":'pics/skitour.png',
"hike":'pics/snowshoe.png',
"t-bar":'pics/drag_lift.png',
"j-bar":'pics/drag_lift.png',
"platter":'pics/drag_lift.png',
"rope_tow":'pics/drag_lift.png',
"station":'pics/station.png',
"playground":'pics/playground.png',
"sled":'pics/sled.png',
"snow_park":'pics/snow_park.png',
"ski_jump":'pics/jump.png'

}
var diffcolor = {
"novice":'green',
"easy":'blue',
"intermediate":'red',
"advanced":'black',
"expert":'orange',
"freeride":'yellow'
}


var vectorStyle = new OpenLayers.Style({
	strokeColor: "#000000", 
	strokeDashstyle : 'dot',
	strokeLinecap : 'round',
	strokeWidth: 1,
	pointRadius: 3
	});
var highlightStyle = new OpenLayers.Style({
	strokeColor:"${getStroke}",
	strokeLinecap : 'round',
	strokeOpacity: 0.5,
	strokeWidth: "${getWidth}",
	pointRadius: 10,
	fillColor:"#FFFFFF",
	fillOpacity:0.5
	
	},
	{context: {
		getStroke: function(feature) {
				if ( feature.attributes['polygon']) {return "#FFFFFF"}
				else {return "#FFFF00"}
				},
		getWidth: function(feature) {
				if ( feature.attributes['polygon']) {return 0}
				else {return 20}
				}
			}
	});
var styleMap = new OpenLayers.StyleMap({"default": vectorStyle});
var highlightStyleMap = new OpenLayers.StyleMap({"default": highlightStyle});

// Redirect permalink
if (location.search != "") {
	readPermalink(location.search);
}
function readPermalink(link) {
	//?zoom=13&lat=46.82272&lon=6.87183&layers=B0TT
	var x = link.substr(1).split("&")
	for (var i=0; i<x.length; i++)
	{
		if (x[i].split("=")[0] == 'zoom') {zoom=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'lon') {lon=x[i].split("=")[1];}
		if (x[i].split("=")[0] == 'lat') {lat=x[i].split("=")[1];}
	}
	//Then hopefully map_init() will do the job when the map is loaded
}

// Requests
function getByName(name) {
	LIVE=false;
	document.getElementById("search-results").innerHTML ='<p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" /></p>';
	var q = "http://beta.opensnowmap.org/search?group=true&geo=true&list=true&name="+name;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search-results').innerHTML=makeHTMLPistesList();
		}
	}
	XMLHttp.send();
}
function getPistesInViewport(){
	document.getElementById("search-results").innerHTML ='';
	document.getElementById("search-results").innerHTML ='<p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" /></p>';
	var bbox= map.getExtent().transform(
		new OpenLayers.Projection("EPSG:900913"),
		new OpenLayers.Projection("EPSG:4326")).toString();
	var q = "http://beta.opensnowmap.org/search?group=true&geo=true&sort_alpha=true&list=true&bbox="+bbox;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search-results').innerHTML=makeHTMLPistesList();
		}
	}
	XMLHttp.send();
}
function getClosestPistes(lonlat){
	document.getElementById("search-results").innerHTML ='<p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" /></p>';
	lonlat.transform(
		new OpenLayers.Projection("EPSG:900913"),
		new OpenLayers.Projection("EPSG:4326"));
	var q = "http://beta.opensnowmap.org/search?geo=true&list=true&closest="+lonlat.lon+','+lonlat.lat;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search-results').innerHTML=makeHTMLPistesList();
			drawPoint(jsonPisteList.snap);
		}
	}
	XMLHttp.send();
}
function getMembersById(id) {
	LIVE=false;
	document.getElementById("search-results").innerHTML ='<p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" /></p>';
	var q = "http://beta.opensnowmap.org/search?geo=true&list=true&sort_alpha=true&group=true&members="+id;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search-results').innerHTML=makeHTMLPistesList();
		}
	}
	XMLHttp.send();
}
function getTopoById(ids) {
	LIVE=false;
	document.getElementById("search-results").innerHTML ='<p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" /></p>';
	var q = "http://beta.opensnowmap.org/search?geo=true&topo=true&ids_ways="+ids;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search-results').innerHTML=makeHTMLPistesList();
		}
	}
	XMLHttp.send();
}


function get_osm_url(bounds) {
	var res = this.map.getResolution();
	var x = Math.round((bounds.left - this.map.maxExtent.left) / (res * this.map.tileSize.w));
	var y = Math.round((this.map.maxExtent.top - bounds.top) / (res * this.map.tileSize.h));
	var z = this.map.getZoom();
	var limit = Math.pow(2, z);

	if (y < 0 || y >= limit) {
		return OpenLayers.Util.getImagesLocation() + "404.png";
	} else {
		x = ((x % limit) + limit) % limit;
		return this.url + z + "/" + x + "/" + y + ".png";
	}
}
function showPistesInViewport() {
	LIVE=true;
	getPistesInViewport();
}
function makeHTMLPistesList() {
	var html='\n<div style="font-size:0.7em;">\n';
	
	html+='\n<hr>'
	if (jsonPisteList['sites'] != null) {
		
		for (p in jsonPisteList['sites']) {
			
			var site=jsonPisteList['sites'][p];
			var index;
			index=site.result_index;
			
			var osm_id;
			osm_id=site.ids.toString();
			
			var name = site.name;
			if (name==' '){name=' x ';}
			html+='<div class="sitesListElement pisteListButton" onClick="highlightElement('+osm_id+',\'sites\');getMembersById('+osm_id+');">\n';
			var pic;
			if (site.pistetype) {
				var types=site.pistetype.split(';');
				for (t in types) {
					pic =icon[types[t]];
					if (pic) {
						html+='	<div style="float:left;">&nbsp;<img src="../'+pic+'">&nbsp;</div>\n';
					}
				}
			}
			
			html+='	<div style="float:left;">&nbsp;&nbsp;<b style="color:#000000;font-weight:900;">Resort: '+name+'</b></div>\n';
			
		html+='\n<div class="clear"></div>'
		html+='\n</div>'
		}
	}
	html+='\n<hr>'
	if (jsonPisteList['pistes'] != null) {
		
		for (p in jsonPisteList['pistes']) {
			
			var piste=jsonPisteList['pistes'][p];
			
			var osm_ids;
			osm_ids=piste.ids.toString();
			
			var pic;
			if (piste.pistetype) {pic =icon[piste.pistetype];}
			else {pic =icon[piste.aerialway];}
			
			var color;
			if (piste.color) {color =piste.color;}
			else {color =diffcolor[piste.difficulty];}
			
			var name = piste.name;
			if (name==' '){name=' x ';}
			
			var lon = piste.center[0];
			var lat = piste.center[1];
			
			html+='<div class="pisteListElement" style="background-color:#EEEEEE; margin: 4px; padding:2px;">\n'
			
			html+='<div class="pisteElement pisteListButton" onClick="highlightElement('+osm_ids+',\'pistes\');">\n'
			
				if (pic) {
					html+='	<div style="float:left; ">&nbsp;<img src="../'+pic+'">&nbsp;</div>\n';
				}
				if (color){
				html+='	<div style="float:left;">&nbsp;&nbsp;<b style="color:'+color+';font-weight:900;">&nbsp;&#9679 </b>'+name+'</div>\n';
				} else {
				html+='	<div style="float:left;">&nbsp;&nbsp;<b style="color:#000000;font-weight:900;">x </b>'+name+'</div>\n';
				}
				html+='\n<div class="clear"></div>\n'
			
			html+='\n</div>'; //pisteElement
			
			html+='\n<div class="clear"></div>\n'
			// parent routes
			if (piste.in_routes.length != 0) {
				
				for (r in piste.in_routes) {
					html+='<div class="inRouteElement pisteListButton" style="float:left;" onClick="highlightParentRoute('+osm_ids+','+r+');">\n'
					var color;
					if (piste.in_routes[r].color) {color =piste.in_routes[r].color;}
					else {color =diffcolor[piste.in_routes[r].difficulty];}
					
					var name = piste.in_routes[r].name;
					if (name==' '){name=' ? ';}
					if (color){
					html+='	&nbsp;<b style="color:'+color+';font-weight:900;">&nbsp;&#9679 </b>'+name+'&nbsp;\n';
					} else {
					html+='	&nbsp;<b style="color:#000000;font-weight:900;">&nbsp;&#186; </b>'+name+'&nbsp;\n';
					}
					html+='</div>\n'; //inRouteElement
				}
				
			}
			html+='\n<div class="clear"></div>\n'
			// parent sites
			if (piste.in_sites.length != 0) {
				
				for (r in piste.in_sites) {
					
					html+='<div class="inSiteElement pisteListButton" style="float:left;" onClick="highlightParentSite('+osm_ids+','+r+');">\n'
					var name = piste.in_sites[r].name;
					if (name==' '){name=' ? ';}
					html+='<b>'+name+'&nbsp;<b/>\n';
					html+='</div>\n' // inSiteElement
				}
			}
		html+='\n<div class="clear"></div>\n';
		html+='\n</div>\n'; // pisteListElement
		}
	}
	
	if (jsonPisteList['limit_reached']) {
		html+='<p>'+jsonPisteList['info']+'</p>\n'
	}
	html+='\n</div>'
	
	return html
}
function highlightElement(osm_id, type){
	//type is either 'pistes' or 'sites'
	var element=null;
	for (p in jsonPisteList[type]) {
		if (jsonPisteList[type][p].ids.toString() == osm_id) {
			element=jsonPisteList[type][p];
			break;
		}
	}
	if (! element) {return false;}
	
	var bbox= element.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
	var encPol= new OpenLayers.Format.EncodedPolyline();
	var geometry=element.geometry;
	var features=[];
	for (g in geometry) {
		var escaped=geometry[g];
		
		if (type=='sites'){encPol.geometryType='polygon';}
		else {encPol.geometryType='linestring';}
		var feature = encPol.read(escaped);
		
		if (type=='sites'){feature.attributes.polygon=true;}
		
		feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		features.push(feature);
	}
	
	highlightLayer.destroyFeatures();
	highlightLayer.addFeatures(features);
	
}
function highlightParentSite(osm_id,r){
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		if (jsonPisteList['pistes'][p].ids.toString() == osm_id) {
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_sites[r];
	
	if (! parent) {return false;}
	
	var bbox= parent.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
	var encPol= new OpenLayers.Format.EncodedPolyline();
	var geometry=parent.geometry;
	var features=[];
	for (g in geometry) {
		var escaped=geometry[g];
		encPol.geometryType='polygon';
		var feature = encPol.read(escaped);
		feature.attributes.polygon=true;
		feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		features.push(feature);
	}
	
	highlightLayer.destroyFeatures();
	highlightLayer.addFeatures(features);
	
}
function highlightParentRoute(osm_id,r){
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		if (jsonPisteList['pistes'][p].ids.toString() == osm_id) {
			piste=jsonPisteList['pistes'][p];
			break;
		}
	}
	if (! piste) {return false;}
	
	var parent=piste.in_routes[r];
	
	if (! parent) {return false;}
	
	var bbox= parent.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
	var encPol= new OpenLayers.Format.EncodedPolyline();
	var geometry=parent.geometry;
	var features=[];
	for (g in geometry) {
		var escaped=geometry[g];
		var feature = encPol.read(escaped);
		feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		features.push(feature);
	}
	
	highlightLayer.destroyFeatures();
	highlightLayer.addFeatures(features);
	
}
function drawPoint(lonlat) {
	
	// create the point geometry
	var pt = new OpenLayers.Feature.Vector(
				new OpenLayers.Geometry.Point(lonlat.lon,lonlat.lat),
							{userpoint:true});
	// here we could request server to snap the point to a piste
	pt.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
	highlightLayer.destroyFeatures();
	highlightLayer.addFeatures([pt]);
}

function init(){
	map = new OpenLayers.Map ("map", {
		maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
		maxResolution: 156543.0399,
		numZoomLevels: 19,
		units: 'm',
		projection: new OpenLayers.Projection("EPSG:900913"),
		displayProjection: new OpenLayers.Projection("EPSG:4326")
	} );
	
	map.addControl(new OpenLayers.Control.Permalink());
	map.addControl(new OpenLayers.Control.LayerSwitcher());
	map.addControl(new OpenLayers.Control.MousePosition());
	
	map.events.on({ "moveend": function (e) {
		if (map.getZoom() >10 && LIVE){getPistesInViewport();}
		else if (map.getZoom() < 10 && !LIVE) {document.getElementById("search-results").innerHTML ='Please zoom in';}
		}
	});
	map.events.on({"click": function(e) {
		var lonlat = map.getLonLatFromPixel(e.xy);
		getClosestPistes(lonlat);
		}
	});
	
	layer = new OpenLayers.Layer.OSM( "Simple OSM Map");
	map.addLayer(layer);
	
	highlightLayer = new OpenLayers.Layer.Vector("highlight", {
				isBaseLayer: false,
				styleMap: highlightStyleMap,
				projection: new OpenLayers.Projection("EPSG:4326"),
				visibility: true
			}
		);
	map.addLayer(highlightLayer);
	
	PistesTiles = new OpenLayers.Layer.XYZ("Pistes Tiles",
	"http://tiles.opensnowmap.org/tiles-pistes/",{
			getURL: get_osm_url, 
			isBaseLayer: false,
			numZoomLevels: 19,
			visibility: true,
			transitionEffect: null
		});
	map.addLayer(PistesTiles);
	
	var vectorReader = new OpenLayers.Format.EncodedPolyline();
	
	vectorLayer = new OpenLayers.Layer.Vector("WKT", {
				isBaseLayer: false,
				styleMap: styleMap,
				projection: new OpenLayers.Projection("EPSG:4326"),
				maxResolution: 20,
				visibility: false,
				strategies:[new OpenLayers.Strategy.BBOX()],
				protocol: new OpenLayers.Protocol.HTTP({
					//~ url:'search.json',
					url: "http://beta.opensnowmap.org/search?limit=false&list=true&geo=true&",
					format: new OpenLayers.Format.JSON({
						read: function(jsonp) {
							var features = [];
							//document.getElementById('read').innerHTML=jsonp;
							var j=JSON.parse(jsonp);
							for (w in j.pistes) {
								for (g in j.pistes[w].geometry) {
									var feature = vectorReader.read(j.pistes[w].geometry[g]);
									//~ feature.geometry.transform(
										//~ new OpenLayers.Projection("EPSG:4326"), 
										//~ new OpenLayers.Projection("EPSG:900913"));
									features.push(feature);
								}
								
							}
							return features;
						}
					})
				})
			});
	map.addLayer(vectorLayer);
	
	map.setCenter(
		new OpenLayers.LonLat(lon,lat).transform(
			new OpenLayers.Projection("EPSG:4326"),
			map.getProjectionObject()
		), zoom
	);    
}


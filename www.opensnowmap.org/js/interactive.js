/*
pistes-nordiques.js
Javascript code for www.pistes-nordiques.org website
Copyright (C) 2011  Yves Cainaud

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/
var server="http://"+window.location.host+"/";

var routingPoints=new Array();
var routingGeom=new Array();
var routingFeatures=new Array();

var topo;

var routeStyle = new OpenLayers.Style({
			strokeColor: "${getColor}", 
			strokeDashstyle : "${getDash}",
			strokeLinecap : 'round',
			strokeOpacity: "${getOpacity}",
			graphicZIndex: 18,
			strokeWidth: "${getStroke}",
			pointRadius: 6,
			fillColor: '#ffffff'
			},{context: {
				getColor: function(feature) {
					if ( feature.attributes['userpoint'] == 'true' ) {return '#000000'}
					else {return '#000000'}
				},
				getStroke: function(feature) {
					if ( feature.attributes['userpoint'] == 'true' ) {return 1}
					else {return 2}
				},
				getDash: function(feature) {
					if ( feature.attributes['userpoint'] == 'true' ) {return 'solid'}
					else {return 'dash'}
				},
				getOpacity: function(feature) {
					if ( feature.attributes['userpoint'] == 'true' ) {return 0.5}
					else {return 1}
				}
			}
		});

function loadWait() {
	$("status").innerHTML = '<b style="color:#FFFFFF;">'+_('loading...')+'</b>'; 
	$("status").style.backgroundColor = '#FF7800';
	$("waiter").style.display = 'block';
}
function endWait() {
	 $("status").innerHTML = '';
	 $("status").style.backgroundColor = '#FFFFFF';
	 redrawRoute();
	$("waiter").style.display = 'none';
}
function getNodeText(node) {
	//workaround for browser limit to 4096 char in xml nodeValue
	var r = "";
	for (var x = 0;x < node.childNodes.length; x++) {
		r = r + node.childNodes[x].nodeValue;
	}
	return r;
}

function onClick(lonlat) {
	
	routingGeom.push(new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat));
	routingFeatures.push(new OpenLayers.Feature.Vector(routingGeom[routingGeom.length -1], {userpoint:'true'}));
	vectorLayer.addFeatures(routingFeatures);
	
	routingPoint = lonlat.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
	routingPoints.push(routingPoint);
	loadWait();
	if (routingPoints.length == 1) { requestInfo();}
	if (routingPoints.length > 1) { requestRoute();}
}
function requestInfo() {
	var q = '';
	for (pt in routingPoints) {
		q = q + routingPoints[pt].lon + ',' +routingPoints[pt].lat;
	};
	
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", server+'search?point=' + q);
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			endWait();
			show_profile_small();
			if($("topo_profile")){$("topo_profile").innerHTML ='';}
			var response = JSON.parse(XMLHttp.responseText);
			if (response==null){
				removeLastRoutePoint();
				return null
			}
			else {makeTopo(response,0);}
		}
	}
	XMLHttp.send();
}

function requestRoute() {
	var q = '';
	for (pt in routingPoints) {
		q = q + routingPoints[pt].lat + ';' +routingPoints[pt].lon + ',';
	};
	
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", server+'routing?' + q);
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			endWait();
			var responseXML=XMLHttp.responseXML;
			if (responseXML==null){
				removeLastRoutePoint();
				return null
			}
			if (responseXML.getElementsByTagName('info')[0]!=null) {
				show_profile_small();
				if($("topo_profile")){$("topo_profile").innerHTML ='';}
				var info=getNodeText(responseXML.getElementsByTagName('info')[0]);
				requestInfos(info,'');
				if (routingPoints.length > 1){clearRouteButLast();}
			}
			else if (responseXML.getElementsByTagName('wkt')[0]!=null) {
				var routeWKT = getNodeText(responseXML.getElementsByTagName('wkt')[0]);
				show_profile();
				var routeIds=getNodeText(responseXML.getElementsByTagName('ids')[0]);
				var routeLength = getNodeText(responseXML.getElementsByTagName('length')[0]);
				requestInfos(routeIds,routeLength);
				trace_route(routeWKT);
			}
			else {
				removeLastRoutePoint();
				show_profile_small();
				if($("topo_profile")){$("topo_profile").innerHTML ='';}
				$("topo_list").innerHTML = '\n'+_('no route');
				}
			}
		}
	XMLHttp.send();
}

function trace_route(wktroute) {
	// request the elevation profile
	document.getElementById('topo_profile').innerHTML='Loading ...';
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("POST", server+"demrequest?");
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			// cut when cgi is not able to work
			document.getElementById('topo_profile').innerHTML=XMLHttp.responseText;
		}
	}
	XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	XMLHttp.setRequestHeader("Content-length", wktroute.length);
	XMLHttp.setRequestHeader("Connection", "close");
	
	XMLHttp.send(wktroute);
	
	
	var routeT = new OpenLayers.Geometry.fromWKT(wktroute);
	var route900913 = routeT.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
	routingGeom.push(route900913);
	routingFeatures.push(new OpenLayers.Feature.Vector(routingGeom[routingGeom.length -1], {userroute:'true'}));
	vectorLayer.addFeatures(routingFeatures);
	
	
}

function redrawRoute() {
	vectorLayer.destroyFeatures(routingFeatures);
	routingFeatures =new Array();
	for (geom in routingGeom) {
		if (routingGeom[geom].CLASS_NAME == "OpenLayers.Geometry.Point") {
		routingFeatures.push(new OpenLayers.Feature.Vector(routingGeom[geom],
								{userpoint:'true'}));
		}
		if ((routingGeom[geom].CLASS_NAME == "OpenLayers.Geometry.LineString") 
		|| (routingGeom[geom].CLASS_NAME == "OpenLayers.Geometry.MultiLineString")){
		routingFeatures.push(new OpenLayers.Feature.Vector(routingGeom[geom],
								{userroute:'true'}));
		}
	}
	vectorLayer.addFeatures(routingFeatures);
}

function clearRoute() {
	routingPoints =new Array();
	vectorLayer.destroyFeatures(routingFeatures);
	routingFeatures =new Array();
	routingGeom =new Array();
}

function clearRouteButLast() {
	routingPoints=routingPoints.splice(-1);
	vectorLayer.destroyFeatures(routingFeatures);
	routingFeatures=routingFeatures.splice(-1);
	routingGeom=routingGeom.splice(-1);
	for (p in routingPoints){
		ll= new OpenLayers.LonLat(routingPoints[p].lon,routingPoints[p].lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		routingGeom.push(new OpenLayers.Geometry.Point(ll.lon,ll.lat));
	}
	redrawRoute();
}

function removeRoutePoint(feature) {
	if (routingPoints.length <= 1) {clearRoute(); return 0}
	var rp;
	var ll= new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y).transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
	for (p in routingPoints){
		rp=routingPoints[p]
		if (rp.equals(ll)) {
			routingPoints.splice(p,1);
			break;
		}
	}
	
	vectorLayer.destroyFeatures(routingFeatures);
	routingFeatures =new Array();
	routingGeom =new Array();
	for (p in routingPoints){
		ll= new OpenLayers.LonLat(routingPoints[p].lon,routingPoints[p].lat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		routingGeom.push(new OpenLayers.Geometry.Point(ll.lon,ll.lat));
	}
	redrawRoute();
	requestRoute();
}

function removeLastRoutePoint() {
	if (routingPoints.length <= 1) {clearRoute();}
	else {
		if (routingGeom[routingGeom.length-1].CLASS_NAME == "OpenLayers.Geometry.Point") {
			routingGeom.pop(routingGeom.length-1);
		}
		else if ((routingGeom[routingGeom.length-1].CLASS_NAME == "OpenLayers.Geometry.LineString") 
		|| (routingGeom[routingGeom.length-1].CLASS_NAME == "OpenLayers.Geometry.MultiLineString")) {
			routingGeom.pop(routingGeom.length-1);
			routingGeom.pop(routingGeom.length-1);
		}
		routingPoints.pop(routingPoints.length -1);
		redrawRoute();
	}
}

function requestInfos(ids,routeLength) {
	
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", server+'search?ids=' + ids);
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var topo = JSON.parse(XMLHttp.responseText);
			makeTopo(topo,routeLength);
			}
		}
	XMLHttp.send();
}

function makeTopo(topo,routeLength){
	var htmlResponse='\n'
			+'<a onclick="new_window()"'
			+' onmouseover="document.images[\'printPic\'].src=\'pics/print_hover.png\'"\n'
			+' onmouseout="document.images[\'printPic\'].src=\'pics/print.png\'">\n'
			+'<img name="printPic" src="pics/print.png"></a><br/>'
			
	htmlResponse+='\n<table border="0">\n';
	
	total=parseFloat(routeLength);
	for (r in topo) {
		if (topo[r] != null) {
			
			var type=topo[r].pistetype;
			if ( ! type) { type=topo[r].aerialway;}
			
			var grooming;
			var difficulty;
			var member_of;
			
			var name;
			name=topo[r].name;
			if ( ! name) { name='-';}
			
			htmlResponse += '<tr><td>&nbsp;<img src="'+icon[type]+'">&nbsp;<td>';
			
			if (type == 'nordic' || type == 'hike') {
				grooming=topo[r].pistegrooming;
				if (grooming == null){grooming='unknown';}
				difficulty=topo[r].pistedifficulty;
				if (difficulty == null){difficulty='unknown';}
			}
			if (type == 'downhill') {
				difficulty=topo[r].pistedifficulty;
				if (difficulty == null){difficulty='unknown';}
			}
			
			
			member_of=topo[r].routes;
			var rel='';
			if (member_of[0] != null) {
				rel='<br/><i>'+_('member_of')+':</i><br/>';
				for (m in member_of) {
					if (member_of[m] != null){
					rel+='&nbsp;&nbsp;<b style="color:'+member_of[m].color
					+';font-weight:900;">&nbsp;&#9679 </b>'+member_of[m].route_name+'<br/>';
					}
				}
			}
			htmlResponse += '<td>'
			if (name !=null) {htmlResponse +='<br/>&nbsp;'+name }
			if (difficulty !=null) {htmlResponse +='<br/><i>'+_('difficulty')+':</i>&nbsp;'+_(difficulty) }
			if (grooming !=null) {htmlResponse +='<br/><i>'+_('grooming')+':</i>&nbsp;'+_(grooming)+'.&nbsp;' }
			if (member_of != null) {htmlResponse +=rel};
			htmlResponse +='</td>';
		}
	
	}
	htmlResponse+='\n</table>\n';
	if (total != 0. && !isNaN(total)) {htmlResponse +='<p>'+total.toFixed(1)+' km</p>'}
	document.getElementById('topo_list').innerHTML = htmlResponse;
}
function new_window() {
printWindow=window.open('print.html');
printWindow.document.write(
'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html>\n'
+'<head>\n'
		+'<meta name="http-equiv" content="Content-type: text/html; charset=UTF-8"/>\n'
		+'<title>Topo Ski Nordique / Nordic Ski Topo</title>\n'
		+'<link rel="stylesheet" href="main.css" media="print" />\n'
		+'<link rel="stylesheet" href="main.css" media="screen" />\n'
+'</head>\n'
+'<body>\n');

printWindow.document.write(document.getElementById('sideBarContent').innerHTML);
//printWindow.document.write(document.getElementById('contextual2').innerHTML);
printWindow.document.write('<p></p><img src="pics/pistes-nordiques-238-45.png">');
printWindow.document.write(document.getElementById('Attributions').innerHTML);
printWindow.document.write('\n</body></html>');
}

var vectorLayer = new OpenLayers.Layer.Vector("Vector",{
		styleMap: new OpenLayers.StyleMap({
			"default": routeStyle,
			"highlight": new OpenLayers.Style({fillColor: "#4477EE",strokeColor: "#4477EE"})
			})
		});
map.addLayer(vectorLayer);
function onMapClick(e) {
	var lonlat = map.getLonLatFromPixel(e.xy);
	if (map.getZoom()>=11) {onClick(lonlat);}
}
map.events.register("click", map, onMapClick);

var selectCtrl = new OpenLayers.Control.SelectFeature(vectorLayer,{
	clickout: true,
	mutiple: false,
	onSelect: function(feature){
		if (feature.attributes['userpoint'] == 'true') {removeRoutePoint(feature)}
		}
	});
selectCtrl.handlers.feature.stopDown = false; // otherwise we have a confilct with pan
map.addControl(selectCtrl);
selectCtrl.activate();

/*
opensnowmap.js
Javascript code for www.opensnowmap.org website
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
// MODE
//TODO
// "NetworkError: 404 Not Found - http://beta.opensnowmap.org/data/modis-update.txt" X-server request ... bof
// http://beta.opensnowmap.org/search?name=puit&full=true 2 results ??
// concatenate piste search results
// Why aeriaways are at the topo's end ?

var server="http://"+window.location.host+"/";
var MARKER=false;
var LOC=false;
var LOC_ONCE=false;
var geoWatchID;
var zoomBar;
var map;
var lat=46.82084;
var lon=6.39942;
var zoom=3;//2
var position;


// a dummy proxy script is located in the directory to allow use of wfs
OpenLayers.ProxyHost = "cgi/proxy.cgi?url=";

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
"snow_park":'pics/snow_park.png'
}
var diffcolor = {
"novice":'green',
"easy":'blue',
"intermediate":'red',
"advanced":'black',
"expert":'orange',
"freeride":'yellow'
}
function get_page(url){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",url,false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	var response = oRequest.responseText;
	response = response.replace("../","");
	return response;
}

function getWinHeight(){
	  var myWidth = 0, myHeight = 0;
	  if( typeof( window.innerWidth ) == 'number' ) {
		//Non-IE
		myWidth = window.innerWidth;
		myHeight = window.innerHeight;
	  } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
		//IE 6+ in 'standards compliant mode'
		myWidth = document.documentElement.clientWidth;
		myHeight = document.documentElement.clientHeight;
	  } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
		//IE 4 compatible
		myWidth = document.body.clientWidth;
		myHeight = document.body.clientHeight;
	  }
	return parseInt(myHeight);
}
function resize_sideBar() {
	//~ if (SIDEBARSIZE=='full'){
		//~ document.getElementById('sideBar').style.height= (getWinHeight() - 80)+"px";
		//~ document.getElementById('sideBarContent').style.height= (getWinHeight() - 103-5)+"px";
	//~ } else {
		//~ document.getElementById('sideBar').style.display='inline';
		//~ document.getElementById('sideBar').style.height=SIDEBARSIZE+'px';
		//~ document.getElementById('sideBarContent').style.display='inline';
		//~ document.getElementById('sideBarContent').style.height=SIDEBARSIZE-33+'px';
	//~ }
	//~ return true
}
function show_live_edits(when,display) {
	if (display) {
		var DiffStyle = new OpenLayers.Style({
				pointRadius: 1.5,
				fillColor: "#FF1200",
				strokeColor:"#FF1200"})
		if (when == "daily") {
			var DailyLayer=new OpenLayers.Layer.Vector("Daily", {
						strategies: [new OpenLayers.Strategy.Fixed(),
									new OpenLayers.Strategy.Cluster()],
						protocol: new OpenLayers.Protocol.HTTP({
							url: "data/daily.tsv",
							format: new OpenLayers.Format.Text()
							}),
						styleMap: new OpenLayers.StyleMap({
							"default": DiffStyle
							}),
						projection: new OpenLayers.Projection("EPSG:4326")
					});
			map.addLayers([DailyLayer]);
		}
		if (when == "weekly") {
			var WeeklyLayer=new OpenLayers.Layer.Vector("Weekly", {
						strategies: [new OpenLayers.Strategy.Fixed(),
									new OpenLayers.Strategy.Cluster()],
						protocol: new OpenLayers.Protocol.HTTP({
							url: "data/weekly.tsv",
							format: new OpenLayers.Format.Text()
							}),
						styleMap: new OpenLayers.StyleMap({
							"default": DiffStyle
							}),
						projection: new OpenLayers.Projection("EPSG:4326")
					});
			map.addLayers([WeeklyLayer]);
		}
		if (when == "monthly") {
			var MonthlyLayer=new OpenLayers.Layer.Vector("Monthly", {
						strategies: [new OpenLayers.Strategy.Fixed(),
									new OpenLayers.Strategy.Cluster()],
						protocol: new OpenLayers.Protocol.HTTP({
							url: "data/monthly.tsv",
							format: new OpenLayers.Format.Text()
							}),
						styleMap: new OpenLayers.StyleMap({
							"default": DiffStyle
							}),
						projection: new OpenLayers.Projection("EPSG:4326")
					});
			map.addLayers([MonthlyLayer]);
		}
	} else {
		if (when == "daily") {map.getLayersByName("Daily")[0].destroy();}
		if (when == "weekly") {map.getLayersByName("Weekly")[0].destroy();}
		if (when == "monthly") {map.getLayersByName("Monthly")[0].destroy();}
		if (when == "none") {
			if (map.getLayersByName("Daily")[0]){map.getLayersByName("Daily")[0].destroy();}
			if (map.getLayersByName("Weekly")[0]){map.getLayersByName("Weekly")[0].destroy();}
			if (map.getLayersByName("Monthly")[0]){map.getLayersByName("Monthly")[0].destroy();}
			}
	}
}
function closecontent(){
	document.getElementById('content').style.display="none";
}
function showsearch() {
	document.getElementById('content').style.display='inline';
	hideexcept('search');
	document.getElementById('search').style.display='inline';
	document.getElementById('content_title').innerHTML='&nbsp;'+_('search_results');
	document.getElementById('content').scrollTop = 0;
}
function showmenu() {
	hideexcept('menu');
	document.getElementById('menu').style.display='inline';
	document.getElementById('content').style.display='inline';
	document.getElementById('content_title').innerHTML='';
	document.getElementById('content').scrollTop = 0;
}
function showlegend() {
	hideexcept('legend');
	document.getElementById('legend').style.display='inline';
	document.getElementById('content').style.display='inline';
	document.getElementById('content_title').innerHTML='&nbsp;'+_('map_key').replace('<br/>',' ');
	document.getElementById('content').scrollTop = 0;
}
function showabout() {
	hideexcept('about');
	url = server+'iframes/about.'+iframelocale+'.html';
	var html = get_page(url).replace('**update**',get_update()).replace('**length**',get_length());
	document.getElementById('content_title').innerHTML='&nbsp;'+_('about');
	document.getElementById('about').innerHTML = html;
	document.getElementById('about').style.display='inline';
	document.getElementById('content').style.display='inline';
	document.getElementById('content').scrollTop = 0;
}
function showlanguages() {
	hideexcept('languages');
	document.getElementById('content').style.display='inline';
	html = '<p>'
	for (l=0; l<locs.length; l++ ){
		
		html += '<div class="fastclick button" onclick="setlanguage(\''+locs[l]+'\');" ';
		html += 'style="border: solid 1px #EEE;margin: 10px 10px 10px 10px" >';
		html +='<img style="margin: 10px 4px 10px 4px" class="button-img" src="pics/flags/'+locs[l]+'.png">'+locs[l];
		html +='</div>&nbsp;';
	}
	html +='</p>'
	document.getElementById('languages').innerHTML=html;
	document.getElementById('languages').style.display='inline';
	document.getElementById('content').scrollTop = 0;
}

function hideexcept(div) {
	if (div != 'menu') {document.getElementById('menu').style.display='none';}
	if (div != 'search') {document.getElementById('search').style.display='none';}
	if (div != 'legend') {document.getElementById('legend').style.display='none';}
	if (div != 'about') {document.getElementById('about').style.display='none';}
	if (div != 'languages') {document.getElementById('languages').style.display='none';}
}

function toggleLocation() {
	if (LOC) {
		navigator.geolocation.clearWatch(geoWatchID);
		LOC=false;
		LOC_ONCE=false;
		document.getElementById('location').style.backgroundColor='#FAFAFA';
	} 
	else {
		if (navigator.geolocation){
			LOC=true;
			geoWatchID = navigator.geolocation.watchPosition(showLocation,errorLocation,{
				enableHighAccuracy: true, maximumAge: 300000, timeout: 20000,frequency: 15000});
		}
	}
}
function showLocation(position) {
	document.getElementById('location').style.backgroundColor='#DDD';
  var latitude = position.coords.latitude;
  var longitude = position.coords.longitude;
  //alert("Latitude : " + latitude + " Longitude: " + longitude);
  var nlonLat = new OpenLayers.LonLat(longitude, latitude).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
  if (LOC_ONCE) {
	  map.setCenter(nlonLat, map.getZoom());
	}
  else {
	map.setCenter(nlonLat, 16);
	LOC_ONCE=true;
  }
}
function errorLocation() {
	navigator.geolocation.clearWatch(geoWatchID);
	LOC=false;
	document.getElementById('location').style.backgroundColor='#FAFAFA';
}

//======================================================================
// INIT

function get_length(){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",server+'data/stats.json',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	var lengthes = JSON.parse(oRequest.responseText);
	var length= parseFloat(lengthes.downhill) + parseFloat(lengthes.nordic) + parseFloat(lengthes.aerialway) + parseFloat(lengthes.skitour) + parseFloat(lengthes.sled) + parseFloat(lengthes.snowshoeing);
	return length;
}
function get_stats(){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",server+'data/stats.json',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	var lengthes = JSON.parse(oRequest.responseText);
	html='<table border="0">'
	html+='<tr>'
	html+='<td><img src="'+icon['nordic']+'">&nbsp;<td>'
	html+='<td>'+(lengthes.nordic)+'&nbsp;km<td>'
	html+='<td><img src="'+icon['downhill']+'">&nbsp;<td>'
	html+='<td>'+(lengthes.downhill)+'&nbsp;km<td>'
	html+='</tr>'
	html+='<tr>'
	html+='<td><img src="'+icon['sled']+'">&nbsp;<td>'
	html+='<td>'+(lengthes.sled)+'&nbsp;km<td>'
	html+='<td><img src="'+icon['skitour']+'">&nbsp;<td>'
	html+='<td>'+(lengthes.skitour)+'&nbsp;km<td>'
	html+='</tr>'
	html+='<tr>'
	html+='<td><img src="'+icon['hike']+'">&nbsp;<td>'
	html+='<td>'+(lengthes.snowshoeing)+'&nbsp;km<td>'
	html+='<td><img src="'+icon['drag_lift']+'">&nbsp;<td>'
	html+='<td>'+(lengthes.aerialway)+'&nbsp;km<td>'
	html+='</tr>'
	html+='</table>'
	return html;
}
function get_update(){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",server+'data/stats.json',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	var stats = JSON.parse(oRequest.responseText);
	var date=stats.date;
	//~ var H=oRequest.responseText.split('T')[1].split(':')[0];
	//~ var M=oRequest.responseText.split('T')[1].split(':')[1];
	//~ var DHM=date +' '+ H+':'+M+'UTC';
	return date;
}
function get_modisupdate(){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",server+'data/modis-update.txt',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	var period=oRequest.responseText.split(' ')[5];
	return period;
}
function page_init(){
	updateZoom();
	initFlags();
	//~ resize_sideBar();
	
	document.getElementById('MQBaseLAyer').style.backgroundColor='#DDD';
	document.getElementById('OSMBaseLAyer').style.backgroundColor='#FFF';
	document.getElementById('dailyVector').style.backgroundColor='#FFF';
	document.getElementById('weekVector').style.backgroundColor='#FFF';
	document.getElementById('noVector').style.backgroundColor='#DDD';
}
function loadend(){
	
}
//======================================================================
// NOMINATIM
function setCenterMap(nlon, nlat, zoom) {
		nlonLat = new OpenLayers.LonLat(nlon, nlat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		map.setCenter(nlonLat, zoom);
		document.getElementById('content').style.display='none';
	}
function nominatimSearch(string) {
		if (string == '') {return false;};
		//~ close_sideBar();
		//~ SIDEBARSIZE=70;
		//~ document.getElementById('sideBar').style.display='inline';
		//~ document.getElementById('sideBar').style.height=SIDEBARSIZE+'px';
		//~ document.getElementById('sideBarContent').style.display='inline';
		//~ document.getElementById('sideBarContent').style.height=SIDEBARSIZE-33+'px';
		//~ document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('search_results');
		//~ document.getElementById("sideBarContent").innerHTML ='<p><img style="margin-left: 100px;" src="pics/snake_transparent.gif" /></p>';
		
		
		var html='<p><img style="text-align:center;" src="pics/snake_transparent.gif"></p>';
		document.getElementById("searchresult").innerHTML = html;
		
		var oRequest = new XMLHttpRequest();
		//oRequest.open("GET",'http://open.mapquestapi.com/nominatim/v1/search?format=xml&q='+string,false);
		oRequest.open("GET",server+'nominatim?format=json&place='+string,false);
		oRequest.setRequestHeader("User-Agent",navigator.userAgent);
		oRequest.send();
		setTimeout('',500);
		var nom = JSON.parse(oRequest.responseText);
		
		oRequest.open("GET",server+'search?name='+string+'&full=true',false);
		oRequest.setRequestHeader("User-Agent",navigator.userAgent);
		oRequest.send();
		setTimeout('',1000);
		var pist = JSON.parse(oRequest.responseText);
		
		var htmlResponse='';
		for (r in pist) {
			var elt = pist[r]
			if (elt.type == 'SITE') {
				htmlResponse += '<p>'
				types=elt.pistetype.split(';');
				for (t in  types) {
					htmlResponse +='&nbsp;<img style="margin-right:10px;" align="left" src="'+icon[types[t]]+'">';
				}
				htmlResponse += '<a onclick="setCenterMap('
				+ elt.center +','
				+ 12 +');" ><b style="font-weight:900;">'
				+ elt.site_name +'</b></a></p>\n<hr/>\n'
			}
			//htmlResponse += '</p><p>'
			if (elt.type == 'ROUTE') {
				type=elt.pistetype;
				color=elt.color;
				htmlResponse += '<p><b style="color:'+color+';font-weight:900;">&#9679 </b>'
				+'&nbsp;<img style="margin-right:10px;" align="left" src="'+icon[type]+'">'
				+'<a onclick="setCenterMap('
				+ elt.center +','
				+ 15 +');">'
				+ elt.route_name +'</a>\n'
				+'<br/>'
				if (elt.sites[0]) {
					if (elt.sites[0].site_name){
						htmlResponse += '<a style="font-size: 0.75em;vertical-align:super;" onclick="setCenterMap('
						+ elt.sites[0].site_center +','
						+ 12 +');">'
						+elt.sites[0].site_name+'</a>'
					}
				}
				else {htmlResponse +='-'}
				htmlResponse +='</p>\n';
			}
			//htmlResponse += '</p><p>'
			if (elt.type == 'PISTE'){
				type=elt.pistetype;
				htmlResponse += '<p>'
				+'&nbsp;<img style="margin-right:10px;" align="left" src="'+icon[type]+'">'
				+'<a onclick="setCenterMap('
				+ elt.center +','
				+ 15 +');">'
				+ elt.name +'</a>'
				+'<b style="color:'+diffcolor[elt.pistedifficulty]+';font-weight:900;">&nbsp;&#9830 </b>'
				+'<br/>'
				if (elt.sites[0]) {
					if (elt.sites[0].site_name){
						htmlResponse += '<a style="font-size: 0.75em;vertical-align:super;" onclick="setCenterMap('
						+ elt.sites[0].site_center +','
						+ 12 +');">'
						+elt.sites[0].site_name+'</a>\n'
					}
				}
				else {htmlResponse +='-'}
				htmlResponse +='</p>\n';
			}
			//htmlResponse += '</p><p>'
			if (elt.type == 'AERIALWAY') {
				type=elt.aerialway;
				htmlResponse += '<p>'
				+'&nbsp;<img style="margin-right:10px;" align="left" src="'+icon[type]+'">'
				+'<a onclick="setCenterMap('
				+ elt.center +','
				+ 15 +');">'
				+ elt.name +'</a>'
				+'<br/>'
				if (elt.sites[0]) {
					if (elt.sites[0].site_name){
						htmlResponse += '<a style="font-size: 0.75em;vertical-align:super;" onclick="setCenterMap('
						+ elt.sites[0].site_center +','
						+ 12 +');">'
						+elt.sites[0].site_name+'</a>\n'
					}
				}
				else {htmlResponse +='-'}
				htmlResponse += '</p>\n'
			}
			//htmlResponse += '</p>'
		}
		htmlResponse += '<hr/>\n'
		htmlResponse += '<ul>\n'
		for (var i=0;i<nom.length;i++) {
			htmlResponse += '<li><a onclick="setCenterMap('
			+ nom[i].lon +','
			+ nom[i].lat +','
			+ 14 +');">'
			+ nom[i].display_name +'</a></li><br/>\n';
		}
		htmlResponse += '</ul> \n <p>Nominatim Search Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"></p>';
		
		//~ document.getElementById("sideBarContent").innerHTML = htmlResponse;
		//~ SIDEBARSIZE='full';
		//~ resize_sideBar();
		document.getElementById("searchresult").innerHTML = htmlResponse;
	}

//======================================================================
// MAP

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
		if (x[i].split("=")[0] == 'marker' && x[i].split("=")[1] == 'true') { MARKER = true;}
		if (x[i].split("=")[0] == 'e') {
			var ext=x[i].split("=")[1];
			if (ext == 'false'){EXT_MENU=false;}
			else if (ext == 'true'){EXT_MENU=true;}
			else {EXT_MENU=false;}
		}
	}
	//Then hopefully map_init() will do the job when the map is loaded
}
function updateZoom() {
	document.getElementById('zoom').innerHTML= map.getZoom();
}
function onZoomEnd(){
}
function get_osm_url(bounds) {
	var res = this.map.getResolution();
	var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
	var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
	var z = this.map.getZoom();
	var limit = Math.pow(2, z);

	if (y < 0 || y >= limit) {
		return OpenLayers.Util.getImagesLocation() + "404.png";
	} else {
		x = ((x % limit) + limit) % limit;
		return this.url + z + "/" + x + "/" + y + ".png";
	}
}
function get_tms_url(bounds) {
		var res = this.map.getResolution();
		var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
		var y = Math.round((bounds.bottom - this.tileOrigin.lat) / (res * this.tileSize.h));
		var z = this.map.getZoom();
		var limit = Math.pow(2, z);
		//if (mapBounds.intersectsBounds( bounds ) && z >= mapMinZoom && z <= mapMaxZoom ) {
	  if (y < 0 || y >= limit)
		{
		  return null;
		}
	  else
		{
		  return this.url + z + "/" + x + "/" + y + ".png"; 
		}
	} 
function toggleBaseLayer(){
	var mq=map.getLayersByName("MapQuest")[0];
	var osm=map.getLayersByName("OSM")[0];
	if (mq) {
		map.removeLayer(mq);
		var mapnik = new OpenLayers.Layer.OSM("OSM");
		map.addLayer(mapnik);

	} else {
		map.removeLayer(osm);
		var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
			"http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
			"http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
			"http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
		var mapquest = new OpenLayers.Layer.OSM("MapQuest",arrayMapQuest,{visibility: true});
		map.addLayer(mapquest);	}
}
function baseLayers() {

// Layer 1.5
	var mapnik = new OpenLayers.Layer.OSM("OSM",{transitionEffect: null});
	//map.addLayer(mapnik);
// Layer 0
	var snowCover = new OpenLayers.Layer.TMS( "Snow Cover",
					"http://tiles2.pistes-nordiques.org/snow-cover/",
					{   
					getURL: get_osm_url,
					isBaseLayer: false, visibility: true, maxScale: 6000000,
				transitionEffect: null
					});
	map.addLayer(snowCover);
// Layer 1
	var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
	var mapquest = new OpenLayers.Layer.OSM("MapQuest",
				arrayMapQuest,
				{transitionEffect: null});
	map.addLayer(mapquest);
//~ // Layer 2
	//~ var layerGTOPO30 = new OpenLayers.Layer.TMS( "GTOPO30", "http://tiles2.pistes-nordiques.org/gtopo30/",{   
				//~ type: 'png', getURL: get_tms_url, alpha: true, opacity: 0.3,
				//~ isBaseLayer: false, visibility: true, maxScale: 3000000, minScale: 8000000
			//~ });
	//~ map.addLayer(layerGTOPO30);

// Layer 5
	var PistesTilesLowZoom = new OpenLayers.Layer.XYZ("Pistes Tiles LZ",
	"http://tiles.opensnowmap.org/tiles-pistes/",{
			getURL: get_osm_url, 
			isBaseLayer: false, numZoomLevels: 19,
			visibility: true, opacity: 0.8,
			maxScale: 250000,
				transitionEffect: null
		});
	map.addLayer(PistesTilesLowZoom);
// Layer 6
	var PistesTiles = new OpenLayers.Layer.XYZ("Pistes Tiles",
	"http://tiles.opensnowmap.org/tiles-pistes/",{
			getURL: get_osm_url, 
			isBaseLayer: false, numZoomLevels: 19,
			visibility: true, opacity: 0.95,
			minScale: 250000,
				transitionEffect: null
		});
	map.addLayer(PistesTiles);
// layer 4
	var layerContours = new OpenLayers.Layer.XYZ("Contour",
	"http://www2.opensnowmap.org/tiles-contours/",{
			getURL: get_osm_url,
			numZoomLevels: 18, isBaseLayer: false,
			transparent: true, buffer: 1,opacity: 0.9,
			minScale: 200000, visibility: true ,
				transitionEffect: null
		});
	map.addLayer(layerContours);
// layer 3
	var layerHillshade = new OpenLayers.Layer.TMS( "Hillshade", "http://www2.opensnowmap.org/hillshading/",{ 
				type: 'png', getURL: get_tms_url, alpha: true, 
				buffer: 1,
				isBaseLayer: false, 
				opacity: 0.4,minScale: 3000000, visibility: true,
				transitionEffect: null
			});
	map.addLayer(layerHillshade);
}
function permalink3Args() {
	var args = 
		OpenLayers.Control.Permalink.prototype.createParams.apply(
			this, arguments
		);
	args['marker'] = 'true';
	return args;
}
function permalink0Args() {
	var args = 
		OpenLayers.Control.Permalink.prototype.createParams.apply(
			this, arguments
		);
	args['layers']='';
	//args['e'] = EXT_MENU;
	//~ args['marker'] = 'false';
	return args;
}

function map_init(){
	map = new OpenLayers.Map ("map", {
	zoomMethod: null,
	panMethod: null,
	controls:[
		new OpenLayers.Control.TouchNavigation({
                dragPanOptions: {
                    enableKinetic: true
                }
		}),
		new OpenLayers.Control.Zoom({
            zoomInId: "customZoomIn",
            zoomOutId: "customZoomOut"
        })
		],
		maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
		maxResolution: 156543.0399,
		numZoomLevels: 19,
		units: 'm',
		projection: new OpenLayers.Projection("EPSG:900913"),
		displayProjection: new OpenLayers.Projection("EPSG:4326")
	} );
	//zoomBar = new zoomSlider({'div':document.getElementById("paneldiv")});
	//zoomBar.zoomStopWidth=24;
	//map.addControl(zoomBar);
	
	permalink_simple = new OpenLayers.Control.Permalink("permalink",
	server+'mobile.html',{'createParams': permalink0Args});
	map.addControl(permalink_simple);
	
	baseLayers();
// Switch base layer
	map.events.on({ "zoomend": function (e) {
		updateZoom();
		onZoomEnd();
	}
	});

	//################################
	var lonLat = new OpenLayers.LonLat(lon, lat).transform(
		new OpenLayers.Projection("EPSG:4326"),
		new OpenLayers.Projection("EPSG:900913"));
	map.setCenter (lonLat, zoom); 
	//map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.top=0;
	//map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.left=0;
	// map.setCenter moved after the strategy.bbox, otherwise it won't load the wfs layer at first load
	map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
	if (MARKER) {
		markerIcon = new OpenLayers.Icon('pics/marker.png',new OpenLayers.Size(20,25),new OpenLayers.Pixel(-12,-30)) 
		var markers = new OpenLayers.Layer.Markers( "Markers" );
		map.addLayer(markers);
		markers.addMarker(new OpenLayers.Marker(map.getCenter(), markerIcon));
	}
	loadend();
}

//======================================================================
// I18N
var locs = [ "cz","de","en","es","cat","fi","fr","hu","it","nl","no","ru","se"];
var iloc= 0;
var locale;
var iframelocale;
//localization

// Get the locale first: from cookie if set
if (getCookie("l10n")!="") {
	locale = getCookie("l10n");
}
// No cookie, check for browser locale
else {locale = get_locale().split('-')[0];} //return only 'en' from 'en-us'

// only a few iframe content pages are translated:
if (locale != 'en' && locale !='fr') { iframelocale = 'en';}
else { iframelocale = locale;}

// Load the localized strings
var oRequest = new XMLHttpRequest();
oRequest.open("GET",'i18n/'+locale+'.json',false);
oRequest.setRequestHeader("User-Agent",navigator.userAgent);
oRequest.send();
var i18n = eval('('+oRequest.responseText+')');

// Translating function
function _(s) {
	if (typeof(i18n)!='undefined' && i18n[s]) {
		return i18n[s];
	}
	return s;
}

// this get the browser install language, not the one set in preference
function get_locale() {
	var loc="en";
	if ( navigator ) {
		if ( navigator.language) {
			loc= navigator.language;
		}
		else if ( navigator.browserLanguage) {
			loc= navigator.browserLanguage;
		}
		else if ( navigator.systemLanguage) {
			loc= navigator.systemLanguage;
		}
		else if ( navigator.userLanguage) {
			loc= navigator.userLanguage;
		}
		else {loc = 'en';}
	}
	else {loc = 'en';}
	
	// use the locale only if string file is available!
	if (loc == 'en' | loc =='fr' | loc == 'de'){
		return loc;
	}
	else {return 'en';}
}

function getCookie(c_name){
	if (document.cookie.length>0)
	  {
	  var c_start=document.cookie.indexOf(c_name + "=");
	  if (c_start!=-1)
		{
		c_start=c_start + c_name.length+1;
		var c_end=document.cookie.indexOf(";",c_start);
		if (c_end==-1) c_end=document.cookie.length;
		return unescape(document.cookie.substring(c_start,c_end));
		}
	  }
	return "";
}

//set the language in a cookie, then reload
function setlanguage(what){
	document.cookie="l10n="+what;
	var linkto = document.getElementById('permalink').href;
	window.location.href = linkto;
}
// Show langage bar
function initFlags(){
	var max=4;
	var html='';
	//~ html+= '<a id="" onclick="show_languages();">'
		//~ +'<img style="margin: 0 4px 0 4px;" src="pics/flags/'+locale+'.png"></a>';
	//~ html+='<a onclick="show_languages();" '
		//~ + 'style="margin: 0 2px 0 2px;font-size:1.5em;font-weight:200;">&#187;</a>';
	document.getElementById('flag').src = 'pics/flags/'+locale+'.png';
}

function show_languages() {
	SIDEBARSIZE=150;
	document.getElementById('sideBar').style.display='inline';
	document.getElementById('sideBar').style.height=SIDEBARSIZE+'px';
	document.getElementById('sideBarContent').style.display='inline';
	document.getElementById('sideBarContent').style.height=SIDEBARSIZE-33+'px';
	document.getElementById('sideBarTitle').innerHTML='<img style="margin: 2px 4px 2px 4px;vertical-align: middle;" src="pics/flags/'+locale+'.png">'+_('lang').replace('<br/>',' ');
	html = ''
	for (l=0; l<locs.length; l++ ){
		html += '<a id="" onclick="setlanguage(\''+locs[l]+'\');">'
			 +'<img style="margin: 10px 2px 10px 20px;vertical-align: middle;" src="pics/flags/'+locs[l]+'.png">'+locs[l]+'</a>';
	}
	document.getElementById('sideBarContent').innerHTML=html;
}


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
if (! window.location.host) {
	server=window.location.pathname.replace("index.html",'');
}

//~ var hillshade_URL="http://www.opensnowmap.org/hillshading/"
//~ var contours_URL="http://www2.opensnowmap.org/tiles-contours/"
var pistes_overlay_URL="http://www.opensnowmap.org/opensnowmap-overlay/"
//~ var snow_cover_URL="http://www2.opensnowmap.org/snow-cover/"

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
var lengthes;
var today=new Date();
var update;

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
"sleigh":'pics/sleigh.png',
"snow_park":'pics/snow_park.png',
"ski_jump":'pics/jump.png'

}
var diffcolor = {
"novice":'green',
"easy":'blue',
"intermediate":'red',
"advanced":'black',
"expert":'orange',
"freeride":'E9C900'
}
var diffcolorUS = {
"novice":'green',
"easy":'green',
"intermediate":'blue',
"advanced":'black',
"expert":'black',
"freeride":'#E9C900'
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
	var full_length = parseFloat(lengthes.downhill) + parseFloat(lengthes.nordic) + parseFloat(lengthes.aerialway) + parseFloat(lengthes.skitour) + parseFloat(lengthes.sled) + parseFloat(lengthes.snowshoeing);
	
	var content = get_page(url).replace('**update**',update)
	.replace('**nordic**',lengthes.nordic)
	.replace('**downhill**',lengthes.downhill)
	.replace('**aerialway**',lengthes.aerialway)
	.replace('**skitour**',lengthes.skitour)
	.replace('**sled**',lengthes.sled)
	.replace('**snowshoeing**',lengthes.snowshoeing);
	document.getElementById('content_title').innerHTML='&nbsp;'+_('about');
	document.getElementById('about').innerHTML = content;
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

//======================================================================
// LOCATION
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
function errorLocation(error) {
	alert(error.message);
	navigator.geolocation.clearWatch(geoWatchID);
	LOC=false;
	document.getElementById('location').style.backgroundColor='#FAFAFA';
}

//======================================================================
// INIT

function get_stats(){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",server+'data/stats.json',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	lengthes = JSON.parse(oRequest.responseText);
}
function get_update(){
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",server+'data/stats.json',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.send();
	var stats = JSON.parse(oRequest.responseText);
	update=stats.date;
}function get_modisupdate(){
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
	get_stats();
	get_update();
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

function highlightElement(osm_id, type){
	closecontent();
	//type is either 'pistes' or 'sites'
	var element=null;
	for (p in jsonPisteList[type]) {
		var ids=jsonPisteList[type][p].ids.join('_').toString();
		if (ids == osm_id ){
			element=jsonPisteList[type][p];
			break;
		}
	}
	if (! element) {return false;}
	
	var bbox= element.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
	bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
	map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
	
	//~ var encPol= new OpenLayers.Format.EncodedPolyline();
	//~ var geometry=element.geometry;
	//~ var features=[];
	//~ for (g in geometry) {
		//~ var escaped=geometry[g];
		//~ 
		//~ if (type=='sites'){encPol.geometryType='polygon';}
		//~ else {encPol.geometryType='linestring';}
		//~ var feature = encPol.read(escaped);
		//~ 
		//~ if (type=='sites'){feature.attributes.polygon=true;}
		//~ 
		//~ feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		//~ features.push(feature);
	//~ }
	//~ 
	//~ highlightLayer.destroyFeatures();
	//~ highlightLayer.addFeatures(features);
	
}
function highlightParentSite(osm_id,r){
	closecontent();
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
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
	
	//~ var encPol= new OpenLayers.Format.EncodedPolyline();
	//~ var geometry=parent.geometry;
	//~ var features=[];
	//~ for (g in geometry) {
		//~ var escaped=geometry[g];
		//~ encPol.geometryType='polygon';
		//~ var feature = encPol.read(escaped);
		//~ feature.attributes.polygon=true;
		//~ feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		//~ features.push(feature);
	//~ }
	//~ 
	//~ highlightLayer.destroyFeatures();
	//~ highlightLayer.addFeatures(features);
	
}
function highlightParentRoute(osm_id,r){
	closecontent();
	var piste=null;
	for (p in jsonPisteList['pistes']) {
		var ids=jsonPisteList['pistes'][p].ids.join('_').toString();
		if (ids == osm_id ){
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
	
	//~ var encPol= new OpenLayers.Format.EncodedPolyline();
	//~ var geometry=parent.geometry;
	//~ var features=[];
	//~ for (g in geometry) {
		//~ var escaped=geometry[g];
		//~ var feature = encPol.read(escaped);
		//~ feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		//~ features.push(feature);
	//~ }
	//~ 
	//~ highlightLayer.destroyFeatures();
	//~ highlightLayer.addFeatures(features);
	
}
function getMembersById(id) {
	document.getElementById("search_results").innerHTML ='<p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" /></p>';
	var q = server+"request?geo=true&list=true&sort_alpha=true&group=true&members="+id;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search_results').innerHTML=makeHTMLPistesList();
		}
	}
	XMLHttp.send();
}
function getByName(name) {
	var q = server+"request?group=true&geo=true&list=true&name="+name;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById('search_results').innerHTML=makeHTMLPistesList();
		}
	}
	XMLHttp.send();
	return true;
}
function nominatimSearch(name) {
	var q = server+'nominatim?format=json&place='+name;
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var nom = JSON.parse(XMLHttp.responseText);
			htmlResponse = '<hr/><ul>\n'
			for (var i=0;i<nom.length;i++) {
				htmlResponse += '<li><a onclick="setCenterMap('
				+ nom[i].lon +','
				+ nom[i].lat +','
				+ 14 +');">'
				+ nom[i].display_name +'</a></li><br/>\n';
			}
			htmlResponse += '</ul> \n <p>Nominatim Search Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"></p>';
			
			document.getElementById('nominatim_results').innerHTML=htmlResponse;
		}
	}
	XMLHttp.send();
	return true;
}
function SearchByName(name) {
	if (name == '') {return false;};
	document.getElementById("searchresult").innerHTML ='<div id="search_results"><p><img style="margin-left: 100px;" src="pics/snake_transparent.gif" /></p></div>';
	document.getElementById("searchresult").innerHTML +='<div id="nominatim_results"></div>';
	
	document.search.nom_search.value='';
	getByName(name);
	nominatimSearch(name);
}
function makeHTMLPistesList() {
	var html='\n<div style="font-size:0.7em;">\n';
	html+='\n<div class="clear"></div>'
	//~ html+='\n'
			//~ +'<a onclick="new_window()"'
			//~ +' onmouseover="document.images[\'printPic\'].src=\'pics/print_hover.png\'"\n'
			//~ +' onmouseout="document.images[\'printPic\'].src=\'pics/print.png\'">\n'
			//~ +'<img name="printPic" src="pics/print.png"></a><br/>';
	
	html+='\n'
	if (jsonPisteList['sites'] != null) {
		
		for (p in jsonPisteList['sites']) {
			
			var site=jsonPisteList['sites'][p];
			var index;
			index=site.result_index;
			
			var osm_id;
			osm_id=site.ids.join('_').toString();
			
			var name = site.name;
			if (name==' '){name=' x ';}
			html+='<div class="sitesListElement pisteListButton fastclick" onClick="highlightElement(\''+osm_id+'\',\'sites\');getMembersById('+osm_id+');">\n';
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
			
			html+='	<div style="float:left;">&nbsp;&nbsp;<b style="color:#000000;font-weight:900;">'+name+'</b></div>\n';
			
		html+='\n<div class="clear"></div>'
		html+='\n</div>'
		}
	}
	html+='\n<hr>'
	if (jsonPisteList['pistes'] != null) {
		
		for (p in jsonPisteList['pistes']) {
			
			var piste=jsonPisteList['pistes'][p];
			
			var osm_ids;
			osm_ids=piste.ids.join('_').toString();
			
			var pic;
			if (piste.pistetype) {pic =icon[piste.pistetype];}
			else {pic =icon[piste.aerialway];}
			
			var color='';
			if (piste.color) {
				color ='&nbsp;<b style="color:'+piste.color+';font-weight:900;">&nbsp;&#9679; </b>';
			}
			
			var lon = piste.center[0];
			var lat = piste.center[1];
			
			var difficulty='';
			if (piste.difficulty) {
				var marker = '&#9679;'
				if (lat>0 && lon <-40) {
					if (piste.difficulty =='expert') {marker = '&diams;';}
					if (piste.difficulty =='advanced') {marker = '&diams;&diams;';}
					if (piste.difficulty =='freeride') {marker = '!!';}
					difficulty='&nbsp;('+_(piste.difficulty)+'<b style="color:'+diffcolorUS[piste.difficulty]+';font-weight:900;">&nbsp;'+marker+'&nbsp;</b>)';
				}
				else {
					if (piste.difficulty =='freeride') {marker = '!';}
					difficulty='&nbsp;('+_(piste.difficulty)+'<b style="color:'+diffcolor[piste.difficulty]+';font-weight:900;">&nbsp;'+marker+'&nbsp;</b>)';
				}
			}
			
			var name = piste.name;
			if (name==' '){name=' - ';}
			
			html+='<div class="pisteListElement">\n'
			
			html+='<div class="pisteElement pisteListButton fastclick" onClick="highlightElement(\''+osm_ids+'\',\'pistes\');">\n'
			
				if (pic) {
					html+='	<div style="float:left; ">&nbsp;<img src="../'+pic+'">&nbsp;</div>\n';
				}
				
				html+='	<div style="float:left;">&nbsp;'+color+name+difficulty+'</div>\n';
				
				html+='\n<div class="clear"></div>\n'
			
			html+='\n</div>'; //pisteElement
			
			html+='\n<div class="clear"></div>\n'
			// parent routes
			if (piste.in_routes.length != 0) {
				
				for (r in piste.in_routes) {
					html+='<div class="inRouteElement pisteListButton fastclick" style="float:left;" onClick="highlightParentRoute(\''+osm_ids+'\','+r+');">\n'
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
					
					html+='<div class="inSiteElement pisteListButton fastclick" style="float:right;" onClick="highlightParentSite(\''+osm_ids+'\','+r+');">\n'
					var name = piste.in_sites[r].name;
					if (name==' '){name=' ? ';}
					html+='<b>'+name+'&nbsp;</b>\n';
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


/*function nominatimSearch(string) {
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
*/
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
// Layer 1
	var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
		"http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
	var mapquest = new OpenLayers.Layer.OSM("MapQuest",
				arrayMapQuest,
				{transitionEffect: null});
	map.addLayer(mapquest);
// Layer 5
	var PistesTiles = new OpenLayers.Layer.XYZ("Pistes Tiles LZ",
	pistes_overlay_URL,{
			getURL: get_osm_url, 
			isBaseLayer: false, numZoomLevels: 19,
			visibility: true, opacity: 1,
				transitionEffect: null
		});
	map.addLayer(PistesTiles);

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
var locs = [ "cz","de","en","es","cat","fi","fr","hu","it","jp","nl","no","ru","se"];
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


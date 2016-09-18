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


var server = "http://" + window.location.host + "/";
if (!window.location.host) {
    server = window.location.pathname.replace("index.html", '');
    server=window.location.pathname.replace("mobile.html",'');
}
if (server.search('home') != -1){ server = "http://beta.opensnowmap.org/";}

//~ var hillshade_URL="http://www.opensnowmap.org/hillshading/"
//~ var contours_URL="http://www2.opensnowmap.org/tiles-contours/"
var pistes_and_relief_overlay_URL="http://www.opensnowmap.org/opensnowmap-overlay/";
var pistes_only_overlay_HDPI_URL="http://www.opensnowmap.org/tiles-pistes-high-dpi/";
var pistes_only_overlay_URL="http://www.opensnowmap.org/tiles-pistes/";
var snow_base_layer_URL ="http://www5.opensnowmap.org/base_snow_map/";
var snow_base_layer_HDPI_URL ="http://www5.opensnowmap.org/base_snow_map/";
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
var data = {};
var BASELAYER = 'snowbase';
var INIT = false;
var HDPI = false; //will be turned to true at map_init()

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

};
var diffcolor = {
"novice":'green',
"easy":'blue',
"intermediate":'red',
"advanced":'black',
"expert":'orange',
"freeride":'E9C900'
};
var diffcolorUS = {
"novice":'green',
"easy":'green',
"intermediate":'blue',
"advanced":'black',
"expert":'black',
"freeride":'#E9C900'
};

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
                strokeColor:"#FF1200"});
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
    var aboutDiv = document.getElementById('about');
    aboutDiv.style.display='inline';
    document.getElementById('content').style.maxWidth="80%";
    document.getElementById('content').style.width="80%";

    var XMLHttp = new XMLHttpRequest();
    url = server + 'iframes/about.' + iframelocale + '.html';
    XMLHttp.open("GET", url);
    XMLHttp.setRequestHeader("Content-type", "text/html; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            //var full_length = parseFloat(data.downhill) + parseFloat(data.nordic) + parseFloat(data.aerialway) + parseFloat(data.skitour) + parseFloat(data.sled) + parseFloat(data.snowshoeing);

            var content = XMLHttp.responseText;
            content = content.replace('**update**', data.date)
            .replace('**nordic**', data.nordic)
            .replace('**downhill**', data.downhill)
            .replace('**aerialway**', data.aerialway)
            .replace('**skitour**', data.skitour)
            .replace('**sled**', data.sled)
            .replace('**snowshoeing**', data.snowshoeing);
            aboutDiv.innerHTML = content;
            
    document.getElementById('content_title').innerHTML='&nbsp;'+_('ABOUT');
    document.getElementById('about').innerHTML = content;
    document.getElementById('about').style.display='inline';
    document.getElementById('content').style.display='inline';
    document.getElementById('content').scrollTop = 0;
            //aboutDiv.style.display='inline';
            //cacheInHistory(aboutDiv);
        }
    };
    XMLHttp.send();
    //~ return true;
    //~ var content = get_page(url).replace('**update**',update)
    //~ .replace('**nordic**',lengthes.nordic)
    //~ .replace('**downhill**',lengthes.downhill)
    //~ .replace('**aerialway**',lengthes.aerialway)
    //~ .replace('**skitour**',lengthes.skitour)
    //~ .replace('**sled**',lengthes.sled)
    //~ .replace('**snowshoeing**',lengthes.snowshoeing);
}

function show_languages() {
    hideexcept('languages');
    document.getElementById('languages').style.display='inline';
    
    var languageDiv = document.getElementById('languages');
    languageDiv.innerHTML='';

    for (l = 0; l < locs.length; l++){

        var flagdiv = document.getElementById('flagsLinksProto').cloneNode(true);
        while (flagdiv.firstChild) {
            flagdiv.removeChild(flagdiv.firstChild);
        } //clear previous list

        flagdiv.removeAttribute("id");
        flagdiv.setAttribute('loc', locs[l]);

        flagdiv.onclick = function () {
            setlanguage(this.getAttribute('loc'));
        };

        var img2 = document.createElement('img');
        img2.src = 'pics/flags/' + locs[l] + '.png';
        img2.className = ('flagMenuImg');
        flagdiv.appendChild(img2);

        var link = document.createElement('a');
        link.innerHTML = '&nbsp;' + eval(locs[l]).lang;
        flagdiv.appendChild(link);

        languageDiv.appendChild(flagdiv);
        var cleardiv = document.getElementById('clearProto').cloneNode(true);
        cleardiv.removeAttribute("id");
        languageDiv.appendChild(cleardiv);
        }
    
}

function hideexcept(div) {
    document.getElementById('content').style.maxWidth="210px";
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
document.onkeydown = checkKey;
document.onkeypress = stopRKey; 

// register 'enter' and 'esc' keyboard hit
function checkKey(e) {
    var keynum;
    if (window.event) {keynum = window.event.keyCode;} //IE
    else if (e) {
        keynum = e.which;
        if (keynum === undefined)
        {
        e.preventDefault();
        keynum = e.keyCode;
        }
    }
    if(keynum == 13) {
        // fires nominatim search
        SearchByName(document.search.nom_search.value);
        }
}

function stopRKey(evt) {
    // disable the enter key action in a form.
  evt = (evt) ? evt : ((event) ? event : null);
  var node = (evt.target) ? evt.target : ((evt.srcElement) ? evt.srcElement : null);
  if ((evt.keyCode == 13) && (node.type=="text"))  {return false;}
}
function get_stats() {
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", server + 'data/stats.json');
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var lengthes = JSON.parse(XMLHttp.responseText);
            for (k = 0; k < Object.keys(lengthes).length; k++) {
                data[Object.keys(lengthes)[k]] = lengthes[Object.keys(lengthes)[k]];
            }
        }
    };
    XMLHttp.send();
    return true;

}

function page_init(){
    document.addEventListener('DOMContentLoaded', function () {
    var button = document.querySelector(".fastclick");
    new FastClick(document.body);
    });
    updateZoom();
    initFlags();
    //get_stats();
    document.getElementById('dailyVector').style.backgroundColor='#FFF';
    document.getElementById('weekVector').style.backgroundColor='#FFF';
    document.getElementById('noVector').style.backgroundColor='#DDD';
    
    document.getElementById('menuButton').onclick= function() {
        showmenu();
        };
    document.getElementById('location').onclick= function() {
        closecontent();
        toggleLocation();
        };
    document.getElementById('searchButton').onclick= function() {
        showsearch();
    };
    
    document.getElementById('reduceButton').onclick= function() {
        closecontent();
    };
    document.getElementById('doSearch').onclick= function() {
        SearchByName(document.search.nom_search.value);
        };
    document.getElementById('listViewportButton').onclick= function() {
        getTopoByViewport();
        };
    document.getElementById('dolistViewport').onclick= function() {
        getTopoByViewport();
        };
    document.getElementById('mobileswitch').onclick= function() {
        document.cookie='version=mobile';
        };
    document.getElementById('desktopswitch').onclick= function() {
        document.cookie='version=desktop';
        window.open(document.getElementById('permalink').href.replace('mobile','index'));
        };
    
    document.getElementById('permalinkButton').onclick= function() {
        location.href=document.getElementById('permalink').href;
        };
    document.getElementById('permalink.marker').onclick= function() {
        location.href=document.getElementById('permalink').href+'&marker=true';
        };
    document.getElementById('langs').onclick= function() {
        show_languages();
        };
    
    document.getElementById('OSMBaseLAyer').onclick= function() {
        setBaseLayer('osm');
        };
    document.getElementById('SnowBaseLAyer').onclick= function() {
        setBaseLayer('snowbase');
        };
    document.getElementById('high_dpi').onclick= function() {
        setHighDpi();
        };
        
    document.getElementById('dailyVector').onclick= function() {
        show_live_edits('daily',true);
        document.getElementById('dailyVector').style.backgroundColor='#DDD';
        document.getElementById('weekVector').style.backgroundColor='#FFF';
        document.getElementById('noVector').style.backgroundColor='#FFF';
        };
    document.getElementById('weekVector').onclick= function() {
        show_live_edits('weekly',true);
        document.getElementById('dailyVector').style.backgroundColor='#FFF';
        document.getElementById('weekVector').style.backgroundColor='#DDD';
        document.getElementById('noVector').style.backgroundColor='#FFF';
        };
    document.getElementById('noVector').onclick= function() {
        show_live_edits('none',false);
        document.getElementById('dailyVector').style.backgroundColor='#FFF';
        document.getElementById('weekVector').style.backgroundColor='#FFF';
        document.getElementById('noVector').style.backgroundColor='#DDD';
        };
        
    document.getElementById('legendButton').onclick= function() { 
        showlegend();
        };
    document.getElementById('blogButton').onclick= function() {
        window.open('http://blog.opensnowmap.org');
        };
    document.getElementById('dataButton').onclick= function() {
        window.open('iframes/data.html');
        };
    document.getElementById('aboutButton').onclick= function() {
        showabout();
        };
    document.getElementById('donateButton').onclick= function() {
        window.open('iframes/donate.html');
        };
        
    translateDiv('body');
}

//======================================================================
// NOMINATIM
function setCenterMap(nlon, nlat, zoom) {
        nlonLat = new OpenLayers.LonLat(nlon, nlat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
        map.setCenter(nlonLat, zoom);
        //document.getElementById('content').style.display='none';
    }
function zoomToElement(osm_id, type) {
    //type is either 'pistes' or 'sites'
    var element = null;
    for (p = 0; p < jsonPisteList[type].length; p++) {
        var ids = jsonPisteList[type][p].ids.join('_').toString();
        if (ids == osm_id){
            element = jsonPisteList[type][p];
            break;
        }
    }
    if (!element) {return false;}

    var bbox = element.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
    bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
    map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'), new OpenLayers.Projection('EPSG:900913')));

}
function highlightElement(osm_id, type){
    
    //type is either 'pistes' or 'sites'
    var element=null;
    for (p =0; p< jsonPisteList[type].length; p++) {
        var ids=jsonPisteList[type][p].ids.join('_').toString();
        if (ids == osm_id ){
            element=jsonPisteList[type][p];
            break;
        }
    }
    if (! element) {return false;}
    
    var bbox= element.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
    bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
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
    
    var piste=null;
    for (p =0; p< jsonPisteList.pistes.length; p++) {
        var ids=jsonPisteList.pistes[p].ids.join('_').toString();
        if (ids == osm_id ){
            piste=jsonPisteList.pistes[p];
            break;
        }
    }
    if (! piste) {return false;}
    
    var parent=piste.in_sites[r];
    
    if (! parent) {return false;}
    
    var bbox= parent.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
    bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
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
    
    var piste=null;
    for (p =0; p< jsonPisteList.pistes.length; p++) {
        var ids=jsonPisteList.pistes[p].ids.join('_').toString();
        if (ids == osm_id ){
            piste=jsonPisteList.pistes[p];
            break;
        }
    }
    if (! piste) {return false;}
    
    var parent=piste.in_routes[r];
    
    if (! parent) {return false;}
    
    var bbox= parent.bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
    bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
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
function zoomToParentSite(osm_id,r) {
    var piste = null;
    for (p = 0; p < jsonPisteList.pistes.length; p++) {
        var ids = jsonPisteList.pistes[p].ids.join('_').toString();
        if (ids == osm_id){
            piste = jsonPisteList.pistes[p];
            break;
        }
    }
    if (!piste) {return false;}

    var parent = piste.in_sites[r];

    if (!parent) {return false;}

    var bbox = parent.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
    bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
    map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'), new OpenLayers.Projection('EPSG:900913')));

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
function showPisteProfile(osm_id, type, div, color) {
    //if (mode == "raster") {infoMode();}
    var parent;
    var alreadyShown = div.getElementsByClassName('profilePic');
    if (alreadyShown.length >0) { // hide existing profile and exit
        while (alreadyShown.length > 0) {
            parent = alreadyShown[alreadyShown.length-1].parentNode;
            parent.removeChild(alreadyShown[alreadyShown.length-1]);
        }
        return true;
    }
    var pics = document.getElementsByClassName('profilePic');
    while (pics.length > 0) { // hide any existing profiles in the list
        parent = pics[pics.length-1].parentNode;
        parent.removeChild(pics[pics.length-1]);
    }
    
    var waiter = document.getElementById('waiterProto').cloneNode(true);
    div.appendChild(waiter);
    waiter.className = waiter.className.replace('hidden', 'shown');
    
    //type is either 'pistes' or 'sites'
    var element = null;
    for (p = 0; p < jsonPisteList[type].length; p++) {
        var ids = jsonPisteList[type][p].ids.join('_').toString();
        if (ids == osm_id){
            element = jsonPisteList[type][p];
            break;
        }
    }
    if (!element) {
        waiter.className = waiter.className.replace('shown', 'hidden');
        return false;
    }

    //drawGeomAsRoute(element.geometry, 'piste');
    var wkt = encpolArray2WKT(element.geometry);
    var routeLength = wkt.length_km;

// request the elevation profile

    var XMLHttp = new XMLHttpRequest();

    //GetProfileXHR.push(XMLHttp); // keep the request to allow aborting

    XMLHttp.open("POST", server + "demrequest?size=small&color="+color);
    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {

            var profileDiv = div;
            while (profileDiv.firstChild) {
                profileDiv.removeChild(profileDiv.firstChild);
            } //clear previous list
            waiter.className = waiter.className.replace('shown', 'hidden');

            cleardiv = document.getElementById('clearProto').cloneNode(true);
            cleardiv.removeAttribute("id");      
            
            var l = document.createElement('span');
            l.innerHTML = parseFloat(routeLength).toFixed(1)+'&nbsp;km';
            
            var img = document.createElement('img');
            img.src = server+'tmp/' + XMLHttp.responseText+'-3d.png';
            var img2 = document.createElement('img');
            img2.src = server+'tmp/' + XMLHttp.responseText+'-2d.png';
            var img3 = document.createElement('img');
            img3.src = server+'tmp/' + XMLHttp.responseText+'-ele.png';
            
            //document.getElementById('profileWaiter').className = document.getElementById('profileWaiter').className.replace('shown', 'hidden');
            //document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('hidden', 'shown');
            profileDiv.appendChild(cleardiv);      
            profileDiv.appendChild(l);
            profileDiv.appendChild(img);
            profileDiv.appendChild(img2);
            profileDiv.appendChild(img3);
        }
    };
    XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    //XMLHttp.setRequestHeader("Content-length", wktroute.length);
    //XMLHttp.setRequestHeader("Connection", "close");

    XMLHttp.send(wkt.geom);
    return true;
}
function getMembersById(id) {
    document.getElementById("waiterResults").style.display='inline';
    

    var list = document.getElementsByClassName('nominatimLi')[0];
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    } //clear previous list
    document.getElementById('piste_search_results').innerHTML='';
    
    var q = server+"request?geo=true&list=true&sort_alpha=true&group=true&members="+id;
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    
    XMLHttp.onreadystatechange= function () {
        if (XMLHttp.readyState == 4) {
            var resp=XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById("waiterResults").style.display='none';
            showHTMLPistesList(document.getElementById('piste_search_results'));
        }
    };
    XMLHttp.send();
}
function getTopoByViewport() { //DONE in pisteList
    document.getElementById("waiterResults").style.display='inline';
    

    var list = document.getElementsByClassName('nominatimLi')[0];
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    } //clear previous list
    document.getElementById('piste_search_results').innerHTML='';
    

    var bb = map.getExtent().transform(
        new OpenLayers.Projection("EPSG:900913"),
        new OpenLayers.Projection("EPSG:4326"));
    var q = server + "request?group=true&geo=true&list=true&sort_alpha=true&bbox=" + bb.left + ',' + bb.top + ',' + bb.right + ',' + bb.bottom;
    var XMLHttp = new XMLHttpRequest();

    //PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById("waiterResults").style.display='none';
            showHTMLPistesList(document.getElementById('piste_search_results'));
        }
    };
    XMLHttp.send();
    return true;
}
function getByName(name) {
    document.getElementById("waiterResults").style.display='inline';
    document.getElementById('piste_search_results').innerHTML='';
    var q = server+"request?group=true&geo=true&list=true&name="+name;
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    
    XMLHttp.onreadystatechange= function () {
        if (XMLHttp.readyState == 4) {
            var resp=XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById("waiterResults").style.display='none';
            showHTMLPistesList(document.getElementById('piste_search_results'));
        }
    };
    XMLHttp.send();
    return true;
}
function nominatimSearch(name) {
    document.getElementById("waiterNominatim").style.display='inline';
    var list = document.getElementsByClassName('nominatimLi')[0];
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    } //clear previous list
    var q = server+'nominatim?format=json&place='+name;
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
    
    XMLHttp.onreadystatechange= function () {
        if (XMLHttp.readyState == 4) {
            var nom = JSON.parse(XMLHttp.responseText);
            document.getElementById("waiterNominatim").style.display='none';
            
            var Ul = document.getElementsByClassName('nominatimLi')[0];
            for (var i = 0;i < nom.length;i++) {
                var resultli = document.getElementById('nominatim_result_list_proto').cloneNode(true);
                resultli.removeAttribute("id");
                resultli.setAttribute('lon', nom[i].lon);
                resultli.setAttribute('lat', nom[i].lat);
                resultli.onclick = function () {
                    setCenterMap(this.getAttribute('lon'), this.getAttribute('lat'), 14);
                };
                resultli.getElementsByTagName('a')[0].innerHTML = nom[i].display_name;
                Ul.appendChild(resultli);
            }
        }
    };
    XMLHttp.send();
    return true;
}
function SearchByName(name) {
    if (name === '') {return false;}
    
    document.search.nom_search.value='';
    getByName(name);
    nominatimSearch(name);
}
function encpolArray2WKT(encpol) {
    var wktGeom;
    var l = 0;
    var encPol = new OpenLayers.Format.EncodedPolyline();
    encPol.geometryType = 'linestring';

    var wkt = new OpenLayers.Format.WKT();
    var feature;
    if (encpol.length == 1) {
        feature = encPol.read(encpol[0]);
        wktGeom = wkt.write(feature);
        l += feature.geometry.getGeodesicLength(new OpenLayers.Projection("EPSG:4326")) / 1000;
    } else if (encpol.length > 1) {
        wktGeom = 'MULTILINESTRING(';
        for (i = 0; i < encpol.length; i++) {
            feature = encPol.read(encpol[i]);
            var linestring = wkt.write(feature);
            wktGeom += linestring.replace('LINESTRING', '') + ',';
            l += feature.geometry.getGeodesicLength(new OpenLayers.Projection("EPSG:4326")) / 1000;
        }
        wktGeom = wktGeom.substring(0, wktGeom.length - 1) + ')';
    }

    return {geom: wktGeom, length_km: l};
}
function showHTMLPistesList(Div) {

    while (Div.firstChild) {
        Div.removeChild(Div.firstChild);
    } //clear previous list
    var site
    , piste
    , index;
    var name
    ,osm_id
    ,element_type
    ,types
    ,difficulty
    ,marker
    ,routeName
    ,siteId
    ,siteName;
    var sitediv
    ,pistediv
    ,spans
    ,span
    ,pic
    ,picDiv
    ,hrDiv
    ,hrsDiv
    ,cleardiv
    ,buttonDiv
    ,inroutediv
    ,insitediv
    ,footer;

    if (jsonPisteList.sites !== null) {

        for (p = 0 ; p < jsonPisteList.sites.length; p++) {


            site = jsonPisteList.sites[p];
            index = site.result_index;


            //console.log('ids: ' + site.ids);
            osm_id = site.ids.join('_').toString(); // What to do with that '_' for sites ??

            name = site.name;
            if (name == ' '){name = ' x ';}

            element_type = '';

            if (site.type) {element_type = site.type;}

            sitediv = document.getElementById('pisteListElementProto').cloneNode(true);

            sitediv.removeAttribute("id");
            sitediv.setAttribute('osm_id', osm_id);
            sitediv.setAttribute('element_type', element_type);

            sitediv.getElementsByClassName("getProfileButton")[0].style.display = 'none';

            sitediv.getElementsByClassName("moreInfoButton")[0].onclick = function (e) {
                showSiteStats(this.parentNode.parentNode,
                    this.parentNode.parentNode.getAttribute('osm_id'),
                    this.parentNode.parentNode.getAttribute('element_type'));
            };

            sitediv.getElementsByClassName("getMemberListButton")[0].onclick = function (e) {
                getMembersById(this.parentNode.parentNode.getAttribute('osm_id'));
            };

            /*sitediv.onmouseout = function () {
                deHighlight();
            };

            sitediv.onmouseover = function () {
                highlightElement(this.getAttribute('osm_id'), 'sites');
            };*/

            sitediv.onclick = function () {
                zoomToElement(this.getAttribute('osm_id'), 'sites');
                map.moveByPx(-105,0);
                //deHighlight();
            };
            Div.appendChild(sitediv);

            spans = sitediv.getElementsByTagName('span');
            for (i = 0; i < spans.length; i++) {
                span = spans[i];
                if (span.className == "routeColorSpan") {span.style.display = 'none';}
                if (span.className == "pisteNameSpan") {span.style.display = 'none';}
                if (span.className == "siteNameSpan") {
                    span.innerHTML = name;//+' '+osm_id;
                }
                if (span.className == "difficultySpan") {span.style.display = 'none';}
                if (span.className == "difficultyColorSpan") {span.style.display = 'none';}
            }


            picDiv = sitediv.getElementsByClassName("pisteIconDiv")[0];
            picDiv.innerHTML = '';
            if (site.pistetype) {
                types = '';
                types = site.pistetype.split(';');
                for (t = 0; t < types.length; t++) {
                    pic = icon[types[t]];
                    if (pic) {
                        img = document.createElement('img');
                        img.src = pic;
                        img.className = 'pisteIcon';
                        picDiv.appendChild(img);
                    }
                }
            }

            sitediv.getElementsByClassName("diffInfos")[0].style.display = 'none';

            cleardiv = document.getElementById('clearProto').cloneNode(true);
            cleardiv.removeAttribute("id");
            Div.appendChild(cleardiv);
            
            hrDiv = document.getElementById('hrLightProto').cloneNode(true);
            hrDiv.removeAttribute("id");
            Div.appendChild(hrDiv);

        }
    }
    
    
    if (jsonPisteList.pistes !== null) {

        for (p = 0; p < jsonPisteList.pistes.length; p++) {
            piste = jsonPisteList.pistes[p];

            osm_ids = piste.ids.join('_').toString();

            if (piste.type) {element_type = piste.type;}
            color = '';
            if (piste.color) {
                color = piste.color;
            }

            lon = piste.center[0];
            lat = piste.center[1];

            difficulty = '';
            if (piste.difficulty) {difficulty = piste.difficulty;}

            name = piste.name;
            if (name == ' '){name = ' - ';}

            pistediv = document.getElementById('pisteListElementProto').cloneNode(true);

            pistediv.removeAttribute("id");
            
            
            pistediv.setAttribute('osm_id', osm_ids);
            pistediv.setAttribute('element_type', element_type);
            if (color !== '') {
                pistediv.setAttribute('element_color', escape(color));
            } else {
                if (lat > 0 && lon < -40) {
                    pistediv.setAttribute('element_color', escape(diffcolorUS[piste.difficulty]));
                } else {
                    pistediv.setAttribute('element_color', escape(diffcolor[piste.difficulty]));
                }
            }

            pistediv.getElementsByClassName("getProfileButton")[0].onclick = function (e) {
                zoomToElement(this.parentNode.parentNode.getAttribute('osm_id'), 'pistes');
                
                map.moveByPx(-105,0);
                var profileDiv = this.parentNode.parentNode.getElementsByClassName("profile")[0];
                showPisteProfile(this.parentNode.parentNode.getAttribute('osm_id'), 'pistes',profileDiv, this.parentNode.parentNode.getAttribute('element_color'));
            };

            pistediv.getElementsByClassName("moreInfoButton")[0].style.display = 'none';
            /*onclick = function (e) {
                showExtLink(this.parentNode, this.parentNode.getAttribute('osm_id')
                    , this.parentNode.getAttribute('element_type'));
            };*/

            pistediv.getElementsByClassName("getMemberListButton")[0].style.display = 'none';

            buttondiv = pistediv.getElementsByClassName("pisteListButton")[0];
            /*buttondiv.onmouseout = function () {
                deHighlight();
            };*/

            /*buttondiv.onmouseover = function () {
                highlightElement(this.parentNode.getAttribute('osm_id'), 'pistes');
            };*/

            buttondiv.onclick = function () {
                zoomToElement(this.parentNode.getAttribute('osm_id'), 'pistes');
                map.moveByPx(-105,0);
                //deHighlight();
            };
            Div.appendChild(pistediv);

            footer = pistediv.getElementsByClassName("pisteListElementFooter")[0];
            spans = pistediv.getElementsByTagName('span');
            for (i = 0; i < spans.length; i++) {
                span = spans[i];
                if (span.className == "routeColorSpan") {
                    if (piste.color) {span.style.color = piste.color;} else {span.style.display = 'none';}
                }
                if (span.className == "pisteNameSpan") {
                    span.innerHTML = name;
                }
                if (span.className == "siteNameSpan") {span.style.display = 'none';}
                if (span.className == "difficultySpan") {
                    span.innerHTML = _(piste.difficulty);
                }
                if (span.className == "difficultyColorSpan") {
                    if (piste.difficulty) {
                        marker = '&#9679;';
                        if (piste.difficulty == 'freeride') {marker = '!';}
                        if (lat > 0 && lon < -40) {
                            if (piste.difficulty == 'expert') {marker = '&diams;';}
                            if (piste.difficulty == 'advanced') {marker = '&diams;&diams;';}
                            if (piste.difficulty == 'freeride') {marker = '!!';}
                            span.style.color = diffcolorUS[piste.difficulty];
                        } else {
                            span.style.color = diffcolor[piste.difficulty];
                        }
                        span.innerHTML = marker;

                    } else {span.style.display = 'none';}
                }
            }


            picDiv = pistediv.getElementsByClassName("pisteIconDiv")[0];
            picDiv.innerHTML = '';
            pic = null;
            if (piste.pistetype) {
                pic = icon[piste.pistetype];
            } else {
                pic = icon[piste.aerialway];
            }
            if (pic) {
                img = document.createElement('img');
                img.src = pic;
                img.className = 'pisteIcon';
                picDiv.appendChild(img);
            }

            if (!piste.pistetype) {
                pistediv.getElementsByClassName("diffInfos")[0].style.display = 'none';
            }
            if (piste.difficulty && piste.difficulty.split(',').length > 1) {
                pistediv.getElementsByClassName("diffInfos")[0].style.display = 'none';
            }
            
            cleardiv = document.getElementById('clearProto').cloneNode(true);
            cleardiv.removeAttribute("id");
            pistediv.appendChild(cleardiv);
            hrsDiv = document.getElementById('hrSuperLightProto').cloneNode(true);
            hrsDiv.removeAttribute("id");
            pistediv.appendChild(hrsDiv);
            

            // parent sites
            if (piste.in_sites.length !== 0) {

                for (r = 0; r < piste.in_sites.length; r++) {
                    siteId = piste.in_sites[r].id;
                    siteName = piste.in_sites[r].name;
                    insitediv = document.getElementById('inSiteElementProto').cloneNode(true);

                    insitediv.removeAttribute("id");
                    insitediv.setAttribute('osm_id', osm_ids);
                    insitediv.setAttribute('parent_site_id', siteId);
                    insitediv.setAttribute('element_type', element_type);
                    insitediv.setAttribute('r', r);

                    /*insitediv.onmouseout = function () {
                        //deHighlight();
                    };

                    insitediv.onmouseover = function () {
                        highlightParentSite(this.getAttribute('osm_id'), this.getAttribute('r'));
                    };*/

                    insitediv.onclick = function () {
                        zoomToParentSite(this.getAttribute('osm_id'), this.getAttribute('r'));
                        map.moveByPx(-105,0);
                        //deHighlight();
                        getMembersById(this.getAttribute('parent_site_id'));
                    };
                    footer.appendChild(insitediv);
                    spans = pistediv.getElementsByTagName('span');
                    for (i = 0; i < spans.length; i++) {
                        span = spans[i];
                        if (span.className == "siteNameSpan") {
                            span.innerHTML = siteName;
                        }
                    }
                }
            }
            
            // parent routes
            if (piste.in_routes.length !== 0) {

                for (r = 0; r < piste.in_routes.length; r++) {

                    color = '';
                    if (piste.in_routes[r].color) {color = piste.in_routes[r].color;} else {color = diffcolor[piste.in_routes[r].difficulty];}

                    routeName = piste.in_routes[r].name;
                    inroutediv = document.getElementById('inRouteElementProto').cloneNode(true);

                    inroutediv.removeAttribute("id");
                    inroutediv.setAttribute('osm_id', osm_ids);
                    inroutediv.setAttribute('element_type', element_type);
                    inroutediv.setAttribute('r', r);

                    /*inroutediv.onmouseout = function () {
                        //deHighlight();
                    };

                    inroutediv.onmouseover = function () {
                        highlightParentRoute(this.getAttribute('osm_id'), this.getAttribute('r'));
                    };*/

                    inroutediv.onclick = function () {
                        showProfileFromGeometryParentRoute(this.getAttribute('osm_id'), this.getAttribute('r'));
                        //deHighlight();
                    };
                    footer.appendChild(inroutediv);

                    spans = inroutediv.getElementsByTagName('span');
                    for (i = 0; i < spans.length; i++) {
                        span = spans[i];
                        if (span.className == "routeNameSpan") {
                            span.innerHTML = routeName;
                        }
                        if (span.className == "routeColorSpan") {
                            if (color !== '') {span.style.color = color;} else {span.style.display = 'none';}
                        }
                    }

                }


            }

            cleardiv = document.getElementById('clearProto').cloneNode(true);
            cleardiv.removeAttribute("id");
            Div.appendChild(cleardiv);

            hrDiv = document.getElementById('hrLightProto').cloneNode(true);
            hrDiv.removeAttribute("id");
            Div.appendChild(hrDiv);

        } // end for

    }

}
function showSiteStats(div, id, element_type) { // fix for normal ways

    var child = div.getElementsByClassName('siteStats')[0];
    if (child === undefined) {
        var statsdiv = document.getElementById('siteStatsProto').cloneNode(true);
        statsdiv.removeAttribute("id");
        div.appendChild(statsdiv);
        
        //abortXHR('PisteAPI'); // abort another request if any

        var q = server + "request?site-stats=" + id;
        var XMLHttp = new XMLHttpRequest();

        //PisteAPIXHR.push(XMLHttp);

        XMLHttp.open("GET", q);
        XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

        XMLHttp.onreadystatechange = function () {
            if (XMLHttp.readyState == 4) {
                var resp = XMLHttp.responseText;
                var jsonStats = JSON.parse(resp);
                statsdiv.getElementsByClassName('stats')[0].className.replace('hidden', 'shown');

                fillHTMLStats(jsonStats, statsdiv, id, element_type);
            }
        };
        XMLHttp.send();
    } else {
        child.parentNode.removeChild(child);
    }
}
function fillHTMLStats(jsonStats, div, element_type) {


    spans = div.getElementsByClassName('data');
    for (i = 0; i < spans.length; i++) {
        var data = spans[i].getAttribute('dataText');
        if (jsonStats.site !== null) {
            if (['downhill','nordic','skitour','sled','lifts','hike'].indexOf(data) != -1) {
                spans[i].innerHTML = (parseFloat(jsonStats[data]) / 1000).toFixed(1);
            }
            if (['snow_park','jump','playground','sleigh','ice_skate'].indexOf(data) != -1){
                if (jsonStats[data] !== 0) {
                    spans[i].innerHTML = '&#9679;';
                    spans[i].style.color = 'green';
                } else {
                    spans[i].innerHTML = 'x';
                    spans[i].style.color = 'red';
                }
            }
        }
        if (data == 'siteUrl'){
            spans[i].href = "http://openstreetmap.org/browse/" + element_type + "/" + id;
        }
        if (data == 'siteId'){
            spans[i].innerHTML = id;
        }
        if (data == 'siteType'){
            spans[i].innerHTML = element_type; //way or relation
        }
    }

}

//======================================================================
// MAP

// Redirect permalink
if (location.search !== "") {
    readPermalink(location.search);
}
function readPermalink(link) {
    //?zoom=13&lat=46.82272&lon=6.87183&layers=B0TT
    var x = link.substr(1).split("&");
    for (var i = 0; i < x.length; i++)
    {
        if (x[i].split("=")[0] == 'zoom') {zoom = x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'lon') {lon = x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'lat') {lat = x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'layers') {BASELAYER = x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'marker' && x[i].split("=")[1] == 'true') { MARKER = true;}
    }
    //Then hopefully map_init() will do the job when the map is loaded
}
function updateZoom() {
    document.getElementById('zoom').innerHTML= map.getZoom();
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
function setHighDpi(){
    if (HDPI){
        document.getElementById('high_dpi').style.backgroundColor='#FFF';
        HDPI = false;
    } else {
        document.getElementById('high_dpi').style.backgroundColor='#DDD';
        HDPI = true;
    }
    setBaseLayer(BASELAYER);
}
function removeLayerByName(name){
    while (map.getLayersByName(name).length >0){
        map.removeLayer(map.getLayersByName(name)[0]);
    }
}
function setBaseLayer(baseLayer) {
    removeLayerByName("OSM");
    removeLayerByName("SnowBase");
    removeLayerByName("PistesAndReliefTiles");
    removeLayerByName("PistesAndReliefTiles");
    
    if (baseLayer == "osm") {
        
        document.getElementById('SnowBaseLAyer').style.backgroundColor='#FFF';
        document.getElementById('OSMBaseLAyer').style.backgroundColor='#DDD';
        
        var arrayOSM = ["http://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
            "http://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
            "http://c.tile.openstreetmap.org/${z}/${x}/${y}.png"];
        var mapnik = new OpenLayers.Layer.OSM("OSM",arrayOSM,
            {   visibility: true,
                isBaseLayer: true,
                transitionEffect: null
            });
        map.addLayer(mapnik);
        
        var PistesAndReliefTiles = new OpenLayers.Layer.XYZ("PistesAndReliefTiles",
        pistes_and_relief_overlay_URL,{
            getURL: get_osm_url, 
            isBaseLayer: false,
            numZoomLevels: 19,
            visibility: true,
            opacity: 0.95,
            transitionEffect: null
            });
        map.addLayer(PistesAndReliefTiles);
            
        if (HDPI){
            try{
                document.getElementsByClassName("olMapViewport")[0].style.transform = 'scale(1.5)';
                }catch(err){console.log(err.message);}
        } else {
            try{
                document.getElementsByClassName("olMapViewport")[0].style.transform = 'scale(1)';
                }catch(err){console.log(err.message);}
        }
        
        BASELAYER = 'osm';
    }
    if (baseLayer == "snowbase") {
        
        document.getElementById('SnowBaseLAyer').style.backgroundColor='#DDD';
        document.getElementById('OSMBaseLAyer').style.backgroundColor='#FFF';
        
        if (HDPI){
            var arraySnowBase = [snow_base_layer_HDPI_URL+"${z}/${x}/${y}.png"];
            var snowbaseLayer = new OpenLayers.Layer.OSM("SnowBase",
                arraySnowBase,
                {   visibility: true,
                    isBaseLayer: true,                    
                    //tileSize: new OpenLayers.Size(512,512),
                    transitionEffect: null
                });
            map.addLayer(snowbaseLayer);
            
            var PistesOnlyTiles = new OpenLayers.Layer.XYZ("PistesOnlyTiles",
            pistes_only_overlay_HDPI_URL,{
                    getURL: get_osm_url, 
                    isBaseLayer: false,
                    numZoomLevels: 19,
                    visibility: true,
                    opacity: 0.95,
                    minResolution: 0.001,
                    maxResolution: 500,
                //tileSize: new OpenLayers.Size(512,512),
                    transitionEffect: null
                });
            map.addLayer(PistesOnlyTiles);
            
            try{
                document.getElementsByClassName("olMapViewport")[0].style.transform = 'scale(1.5)';
                }catch(err){console.log(err.message);}
        } else {
            var arraySnowBase = [snow_base_layer_URL+"${z}/${x}/${y}.png"];
            var snowbaseLayer = new OpenLayers.Layer.OSM("SnowBase",
                arraySnowBase,
                {   visibility: true,
                    isBaseLayer: true,
                    transitionEffect: null
                });
            map.addLayer(snowbaseLayer);
            
            var PistesOnlyTiles = new OpenLayers.Layer.XYZ("PistesOnlyTiles",
            pistes_only_overlay_URL,{
                    getURL: get_osm_url, 
                    isBaseLayer: false,
                    numZoomLevels: 19,
                    visibility: true,
                    opacity: 0.95,
                    minResolution: 0.001,
                    maxResolution: 500,
                    transitionEffect: null
                });
            map.addLayer(PistesOnlyTiles);
            
            try{
                document.getElementsByClassName("olMapViewport")[0].style.transform = 'scale(1)';
                }catch(err){console.log(err.message);}
        }
        BASELAYER = 'snowbase';
    }
    // forces redraw of element above the map after scaling, still something bad with zooms on mobile
    document.getElementById("header").style.zIndex=10;
    document.getElementById("map").style.zIndex=0;
    document.getElementById("customZoom").style.zIndex=1001;
    document.getElementById("customZoomIn").style.zIndex=1002;
    document.getElementById("customZoomOut").style.zIndex=1002;

    var permalinks = map.getControlsByClass("OpenLayers.Control.Permalink");
    for (p = 0; p < permalinks.length; p++){
        permalinks[p].updateLink();
    }
}
function baseLayers() {
    // Default to SnowBaseLayer
        if (HDPI){
            
            var arraySnowBase = [snow_base_layer_HDPI_URL+"${z}/${x}/${y}.png"];
            var snowbaseLayer = new OpenLayers.Layer.OSM("SnowBase",
                arraySnowBase,
                {   visibility: true,
                    isBaseLayer: true,                    
                    //tileSize: new OpenLayers.Size(512,512),
                    transitionEffect: null
                });
            map.addLayer(snowbaseLayer);
            

                var PistesOnlyTiles = new OpenLayers.Layer.XYZ("PistesOnlyTiles",
                pistes_only_overlay_HDPI_URL,{
                        getURL: get_osm_url, 
                        isBaseLayer: false,
                        numZoomLevels: 19,
                        visibility: true,
                        opacity: 0.95,
                        minResolution: 0.001,
                        maxResolution: 500,
                    //tileSize: new OpenLayers.Size(512,512),
                        transitionEffect: null
                    });
                map.addLayer(PistesOnlyTiles);

            
            try{
                document.getElementsByClassName("olMapViewport")[0].style.transform = 'scale(1.5)';
                document.getElementById("header").style.zIndex=10;
                document.getElementById("map").style.zIndex=0;
                
                }catch(err){console.log(err.message);}
        } else {
            
            var arraySnowBase = [snow_base_layer_URL+"${z}/${x}/${y}.png"];
            var snowbaseLayer = new OpenLayers.Layer.OSM("SnowBase",
                arraySnowBase,
                {   visibility: true,
                    isBaseLayer: true,
                    transitionEffect: null
                });
            map.addLayer(snowbaseLayer);
            

                var PistesOnlyTiles = new OpenLayers.Layer.XYZ("PistesOnlyTiles",
                pistes_only_overlay_URL,{
                        getURL: get_osm_url, 
                        isBaseLayer: false,
                        numZoomLevels: 19,
                        visibility: true,
                        opacity: 0.95,
                        minResolution: 0.001,
                        maxResolution: 500,
                        transitionEffect: null
                    });
                map.addLayer(PistesOnlyTiles);
               
            
            try{
                document.getElementById("map").style.transform = 'scale(1)';
                                document.getElementById("header").style.zIndex=10;
                document.getElementById("map").style.zIndex=0;;
                }catch(err){console.log(err.message);}
        }

/* // Default to OSM
    var arrayOSM = ["http://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
        "http://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
        "http://c.tile.openstreetmap.org/${z}/${x}/${y}.png"];
    var mapnik = new OpenLayers.Layer.OSM("OSM",arrayOSM,
        {   visibility: true,
            isBaseLayer: true,
            transitionEffect: null
        });
    map.addLayer(mapnik);
    


    var PistesAndReliefTiles = new OpenLayers.Layer.XYZ("PistesAndReliefTiles",
    pistes_and_relief_overlay_URL,{
                getURL: get_osm_url, 
                isBaseLayer: false,
                numZoomLevels: 19,
                visibility: true,
                opacity: 0.95,
                transitionEffect: null
        });
    map.addLayer(PistesAndReliefTiles);
    */

}
function permalink3Args() {
    var args = 
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args.marker = 'true';
    args.layers = BASELAYER;
    return args;
}
function permalink0Args() {
    var args = 
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    
    args.layers = BASELAYER;
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
                },
                pinchZoomOptions: {
                preserveCenter: false
                }
        }),
        new OpenLayers.Control.Zoom({
            zoomInId: "customZoomIn",
            zoomOutId: "customZoomOut"
        }),
        new OpenLayers.Control.LayerSwitcher()
        ],
        maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
        maxResolution: 156543.0399,
        numZoomLevels: 19,
        units: 'm',
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326")
    } );
    
    permalink_simple = new OpenLayers.Control.Permalink("permalink",
    server+'mobile.html',{'createParams': permalink0Args});
    map.addControl(permalink_simple);
    
    //baseLayers();
    
    setHighDpi();
    setBaseLayer(BASELAYER);
    
    map.events.on({ "zoomend": function (e) {
        updateZoom();
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
        markerIcon = new OpenLayers.Icon('pics/marker.png',new OpenLayers.Size(20,25),new OpenLayers.Pixel(-12,-30)) ;
        var markers = new OpenLayers.Layer.Markers( "Markers" );
        map.addLayer(markers);
        markers.addMarker(new OpenLayers.Marker(map.getCenter(), markerIcon));
    }
}

//======================================================================
// I18N
var locs = ["ast","cze","deu","eng","spa","cat","fin","fra","hun","ita","jpa","nld","nno","rus","swe","ukr"];
var iloc = 0;
var locale;
var iframelocale;
var found = false;
locale = "eng"; //set default
//localization

// Get the locale first: from localstorage if set
if (localStorage.l10n) {
    locale = localStorage.l10n;
}
// No localstorage, check for browser locale
//else {locale = get_locale().split('-')[0];} //return only 'en' from 'en-us'

for (i = 0; i < locs.length; i++) {
    found = false;
    if (locale == locs[i]) {found = true; break;}
}
if (!found) {locale = 'eng';}

// only a few iframe content pages are translated:
if (locale != 'eng' && locale != 'fra') { iframelocale = 'eng';} else { iframelocale = locale;}

var i18n = eval(locale);
var i18nDefault = eng;

// Translating function
function _(s) {
    if (typeof(i18n) !== 'undefined' && i18n[s] && i18n[s] !== '') {
        return i18n[s];
    }
    if (typeof(i18n) == 'undefined' && typeof(i18nDefault) == 'undefined') {
        return s;
    }
    return i18nDefault[s];
}

function translateDiv(divID) {
    var div = document.getElementById(divID);
    var elements = div.getElementsByClassName('i18n');
    for (i = 0; i < elements.length; i++) {
        elements[i].innerHTML = _(elements[i].getAttribute('i18nText'));
    }
    return true;
}
// this get the browser install language, not the one set in preference
/*function get_locale() {
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
}*/

//set the language in a localstorage, then reload
function setlanguage(what) {
    for (i = 0; i < locs.length; i++) {
        found = false;
        if (what == locs[i]) {found = true; locale=what; break;}
    }
    if (!found) {locale = 'eng';}
    localStorage.l10n = locale;
    i18n = eval(locale);
    if (locale != 'eng' && locale != 'fra') { iframelocale = 'eng';} else { iframelocale = locale;}
    translateDiv('body');
    initFlags();
    //close_sideBar();
    showmenu();
}
// Set flag button
function initFlags() {
    var img = document.createElement('img');
    img.src = 'pics/flags/' + locale + '.png';
    img.className = ('flagMenuImg');
    document.getElementById('langs').innerHTML='';
    document.getElementById('langs').appendChild(img);
}


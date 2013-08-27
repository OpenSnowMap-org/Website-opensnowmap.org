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
var server="http://"+window.location.host+"/";

var mode="raster";
var EXT_MENU=false;
var EDIT_SHOWED=false;
var CATCHER;
var permalink_potlatch2;
var permalink_potlatch;
var zoomBar;
var PRINT_TYPE= 'small';
var ONCE=false;
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
function infoMode(){
    var m=''
    if (mode == "raster") {
        show_helper();
        if (map.getZoom()>=11) {
            loadjscssfile("js/interactive.js", "js");
            m="vector";
            map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
            map.div.style.cursor='pointer';
            document.images['pointPic'].src='pics/pistes-pointer-on.png';
        }
        else {m="raster";}
    }
    if (mode == "vector") {
        // first destroy the select and highlight controls
        document.getElementById('sideBarContent').innerHTML='';
        document.getElementById('sideBar').style.display='none';
        
        map.events.unregister("click", map, onMapClick);
        var ctrls= map.getControlsByClass("OpenLayers.Control.SelectFeature");
        for (var c in ctrls) {ctrls[c].destroy();}
        // then layers
        var lays = map.getLayersByClass("OpenLayers.Layer.Vector");
        for (var l in lays) {lays[l].destroy();}
        var marks = map.getLayersByClass("OpenLayers.Layer.Markers");
        for (var m in marks) {marks[m].destroy();}

        removejscssfile("js/interactive.js", "js");
        
        m="raster";
        map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
        close_helper();
        document.images['pointPic'].src='pics/pistes-pointer.png';
        map.div.style.cursor='default';
    }
    mode=m;
}
function loadjscssfile(filename, filetype){
 if (filetype=="js"){ //if filename is a external JavaScript file
  var fileref=document.createElement('script')
  fileref.setAttribute("type","text/javascript")
  fileref.setAttribute("src", filename)
 }
 else if (filetype=="css"){ //if filename is an external CSS file
  var fileref=document.createElement("link")
  fileref.setAttribute("rel", "stylesheet")
  fileref.setAttribute("type", "text/css")
  fileref.setAttribute("href", filename)
 }
 if (typeof fileref!="undefined")
  document.getElementsByTagName("head")[0].appendChild(fileref)
}
function removejscssfile(filename, filetype){
 var targetelement=(filetype=="js")? "script" : (filetype=="css")? "link" : "none" //determine element type to create nodelist from
 var targetattr=(filetype=="js")? "src" : (filetype=="css")? "href" : "none" //determine corresponding attribute to test for
 var allsuspects=document.getElementsByTagName(targetelement)
 for (var i=allsuspects.length; i>=0; i--){ //search backwards within nodelist for matching elements to remove
  if (allsuspects[i] && allsuspects[i].getAttribute(targetattr)!=null && allsuspects[i].getAttribute(targetattr).indexOf(filename)!=-1)
   allsuspects[i].parentNode.removeChild(allsuspects[i]) //remove element by calling parentNode.removeChild()
 }
}
function get_page(url){
    var oRequest = new XMLHttpRequest();
    oRequest.open("GET",url,false);
    oRequest.setRequestHeader("User-Agent",navigator.userAgent);
    oRequest.send();
    response = oRequest.responseText;
    response = response.replace("../","");
    return response;
}
function toggleMenu() {
    var em = document.getElementById('extendedmenu');
    // At loadtime, m.style.display=""
    if (em.style.display == "none" || em.style.display == "") {
        em.style.display ='inline';
        EXT_MENU=true;
        }
    else if (em.style.display == "inline") {
        em.style.display = 'none';
        EXT_MENU=false;
        }
    map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
    return true;
    
}
function showMenu() {
    var em = document.getElementById('extendedmenu');
    em.style.display ='inline';
    EXT_MENU=true;
    return true;
}
function closeMenu() {
    var em = document.getElementById('extendedmenu');
    em.style.display ='none';
    EXT_MENU=false;
    return true;
}
function close_sideBar() {
    document.getElementById('sideBarTitle').innerHTML='';
    document.getElementById('sideBarContent').innerHTML='';
    document.getElementById('sideBar').style.height='33px';
    document.getElementById('sideBarContent').style.height='10px';
    
    document.getElementById('sideBar').style.display='none';
    EDIT_SHOWED = false;
}
function close_helper(){
    close_sideBar();
}
function show_catcher(){
    CATCHER=true;
	//~ var XMLHttp = new XMLHttpRequest();
	//~ oRequest.open("GET",server+'data/stats.json',false);
	//~ XMLHttp.onreadystatechange= function () {
		//~ if (XMLHttp.readyState == 4) {
			//~ var topo = JSON.parse(XMLHttp.responseText);
			//~ makeTopo(topo,routeLength);
			//~ }
		//~ }
	//~ XMLHttp.send();
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBar').style.height='180px';
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBarContent').style.height='147px';
    document.getElementById('sideBarTitle').innerHTML='';
        var html='<a href="http://wiki.openstreetmap.org" target="blank"><img src="pics/osm-pistes-nordiques_logo-80px.png" style="float: left;margin: 5px;"></img></a>';
        html+='<p>';
        html+=get_length()+' '+_('piste_length');
        html+=_('you');
        html+='</p>';
        html+='<p>';
        html+='<a class="amenu" href="javascript:void(0);" onclick="close_sideBar();show_edit();return false;">';
        html+=_('edit');
        html+='</a>';
        html+='</p>';
    html+=get_stats();
    document.getElementById('sideBarContent').innerHTML=html;
    
}
function show_helper(){
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBar').style.height='300px';
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBarContent').style.height='277px';
    document.getElementById('sideBarTitle').innerHTML='';
    
    var html='<div id="zoomin-helper" style="font-size: 1.2em;font-weight:600;">'+_('zoom_in')+'</div>';
    html+='<img style="margin-left: 3px;"src="pics/interactive-help.png"/><br/>'
    document.getElementById('sideBarContent').innerHTML=html;
    
    if (map.getZoom()<11){
        document.getElementById('zoomin-helper').style.display = 'inline';
    } else {
        document.getElementById('zoomin-helper').style.display = 'none';
    }
}
function show_about() {
    resize_sideBar();
    document.getElementById('sideBar').style.display='inline';
    url = server+'iframes/about.'+iframelocale+'.html';
    content = get_page(url).replace('**update**',get_update()).replace('**length**',get_length()).replace('**modis-update**',get_modisupdate());
    document.getElementById('sideBarContent').innerHTML = content;
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('about');
}
function show_help() {
    document.getElementById('sideBar').style.display='inline';
    url = server+'iframes/quickhelp.'+iframelocale+'.html';
    content = get_page(url);
    document.getElementById('sideBarContent').innerHTML = content;
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('help');
}
function show_edit() {
    resize_sideBar();
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('edit').replace('<br/>',' ');
    
    html = '<div style="font-size:1.5em; font-weight:800;" id="edit_zoom_in"></div>'
     +'<p>&nbsp;'+_('edit_the_map_using')+'</p>'
     +'<p>&nbsp;'+_('edit_the_map_explain')+'</p>'
     +'<hr class="hrmenu">'
     +'<p><a href="iframes/how-to-'+iframelocale+'.html" target="blank">'+_('how_to')+'</a></p>'
     +'<hr class="hrmenu">'
     +'<p style="text-align:center;">'
     +'<a id="permalink.potlatch" href="" target="blank"><img src="pics/potlatch.png" id="potlatch_pic"></a>'
     +'</p><p style="text-align:center;">'
     +'<a id="permalink.potlatch2" href="" target="blank"><img src="pics/potlatch2.png" id="potlatch2_pic"></a>'
     +'</p>'
     +'<hr class="hrmenu">'
     +'<p>&nbsp;'+_('offseter_explain')+'</p>'
     +'</p><p style="text-align:center;">'
     +'<a id="permalink.ofsetter" href="" target="blank"><img src="pics/offseter-fuzzy.png" ></a>'
     +'</p>'
     +'<hr class="hrmenu">';
    document.getElementById('sideBarContent').innerHTML=html;
    EDIT_SHOWED = true;
    permalink_potlatch = new OpenLayers.Control.Permalink("permalink.potlatch",
    "http://www.openstreetmap.org/edit",{'createParams': permalink1Args});
    map.addControl(permalink_potlatch);
    permalink_potlatch2 = new OpenLayers.Control.Permalink("permalink.potlatch2",
    "http://www.openstreetmap.org/edit",{'createParams': permalink2Args});
    map.addControl(permalink_potlatch2);
    var permalink_ofsetter = new OpenLayers.Control.Permalink("permalink.ofsetter",
        "offseter");
    map.addControl(permalink_ofsetter);
    
    if (map.getZoom() < 13) {
        document.getElementById('edit_zoom_in').innerHTML='&nbsp;'+_('zoom_in');
        document.getElementById('permalink.potlatch').href = "javascript:void(0)";  
        document.getElementById('permalink.potlatch').target="";
        document.getElementById('potlatch_pic').src="pics/potlatch-disabled.png";
        document.getElementById('permalink.potlatch2').href = "javascript:void(0)";
        document.getElementById('permalink.potlatch2').target="";
        document.getElementById('potlatch2_pic').src="pics/potlatch2-disabled.png";
    }else {
        document.getElementById('edit_zoom_in').innerHTML='';
    }
}
function show_profile() {
    resize_sideBar();
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('TOPO');
    if (mode=="raster") {
        document.getElementById('sideBarContent').innerHTML=_('vector_help');
    }else if (map.getZoom() > 10) {
        document.getElementById('sideBarContent').innerHTML='<div id="topo_profile" style="display:inline"></div><div id="topo_list" style="display:inline"></div>';
    }else if (map.getZoom() <= 10) {
        document.getElementById('sideBarContent').innerHTML=_('zoom_in');
    }
}
function show_profile_small() {
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBar').style.height='150px';
    document.getElementById('sideBarContent').style.height='127px';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('TOPO');
    if (map.getZoom() > 10) {
        document.getElementById('sideBarContent').innerHTML='<div id="topo_profile" style="display:inline"></div><div id="topo_list" style="display:inline"></div>';
    }else if (map.getZoom() <= 10) {
        document.getElementById('sideBarContent').innerHTML=_('zoom_in');
    }
}
function show_legend() {
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('map_key').replace('<br/>',' ');
    html =  '<p><img style="position: relative; left: 20px;" src="pics/mapkey.png"></p>'
    +'<p>'+_('key-color')
    + '<a target="blank" href="http://wiki.openstreetmap.org/wiki/Proposed_features/Tag:route%3Dpiste"> (1)</a>.</p>'
    +'<p>'+_('learn-difficulties')
    +'<a target="blank" href="http://wiki.openstreetmap.org/wiki/Proposed_features/Piste_Maps#Difficulty"> (2)</a>.</p>'         +'<hr class="hrmenu">'
         +'<p><a href="iframes/how-to-en.html" target="blank">'+_('how_to')+'</a></p>'
         +'<hr class="hrmenu">';
    document.getElementById('sideBarContent').innerHTML=html;
    resize_sideBar();
}
function show_settings() {
    document.getElementById('sideBar').style.display='inline';
    document.getElementById('sideBarContent').style.display='inline';
    document.getElementById('sideBar').style.height='200px';
    document.getElementById('sideBarContent').style.height='177px';
    document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('settings').replace('<br/>',' ');
    html = '';
    html +=' <input type="radio" id="mode_radio2" class="radio"';
    html +=' name="basemap" value="mapnik"  onClick="toggleBaseLayer()" />';
    html +=' <label>Openstreetmap&nbsp;'+_('base_map')+'</label>';
    html +=' <br/>';
    html +=' <input type="radio" id="mode_radio1" class="radio" checked="yes"';
    html +=' name="basemap" value="Mapquest" onClick="toggleBaseLayer()"   />';
    html +=' <label>OpenMapquest&nbsp;'+_('base_map')+'</label>';
    html +=' <br/>';
                    
    html +=' <hr class="hrmenu">';
    html +=' <p>'+_('last_edits')+'</p>';
    html +=' <input type="checkbox" id="check1" class="radio" "';
    html +=' name="live" value="daily" onClick="show_live_edits(value,checked)"   />';
    html +=' <label style="margin-top: 10px;">'+_('yesterday')+'</label>';
    html +=' <input type="checkbox" id="check2" class="radio" "';
    html +=' name="live" value="weekly" onClick="show_live_edits(value,checked)"   />';
    html +=' <label>'+_('weekly')+'</label>';
    html +=' <br/>';
    html +=' <input type="checkbox" id="check2" class="radio" ';
    html +=' name="live" value="monthly" onClick="show_live_edits(value,checked)"   />';
    html +=' <label>'+_('monthly')+'</label>';
    html +=' <br/>';
    html +=' <hr class="hrmenu">';
    html +=' <div id="vector-help">';
    html +='    <table style="border:0px;"><tr><td><a onclick="infoMode()"';
    html +='    onmouseover="document.images[\'pointPic\'].src=\'pics/pistes-pointer-hover.png\'"';
    html +='    onmouseout="if (mode == \'vector\') {document.images[\'pointPic\'].src=\'pics/pistes-pointer-on.png\';}';
    html +='                else {document.images[\'pointPic\'].src=\'pics/pistes-pointer.png\'}">';
    html +='    <img style="margin: 2px 2px 2px 2px;display: block;" name="pointPic" src="pics/pistes-pointer.png"></a></td><td>';
    html +=_('vector_help');
    html +=' </td></table></div>';
    document.getElementById('sideBarContent').innerHTML=html;
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
    document.getElementById('sideBar').style.height= (getWinHeight() - 80)+"px";
    document.getElementById('sideBarContent').style.height= (getWinHeight() - 103)+"px";
    return true
    //document.getElementById('search_result').style.height= getWinHeight()-25-110-40;
    //document.getElementById('snow_info').style.height= getWinHeight()-25-110-40;
    //document.getElementById('add_link').style.height= getWinHeight()-25-110-40;
    //document.getElementById('topo').style.height= getWinHeight()-25-110-40;
    //document.getElementById('edit').style.height= getWinHeight()-25-110-40;
    //document.getElementById('about').style.height= getWinHeight()-25-110-40;
    //document.getElementById('help').style.height= getWinHeight()-25-110-40;
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
    }
}
//======================================================================
// INIT

document.onkeydown = checkKey;

// register 'enter' and 'esc' keyboard hit
function checkKey(e) {
    var keynum;
    if (window.event) keynum = window.event.keyCode; //IE
    else if (e) {
        keynum = e.which;
        if (keynum == undefined)
        {
        e.preventDefault();
        keynum = e.keyCode
        }
    }
    if(keynum == 27) {
        echap();
        }
    if(keynum == 13) {
        // fires nominatim search
        nominatimSearch(document.search.nom_search.value);
        }
}
function echap() {
        close_sideBar();
        close_printSettings();
        // close extendedmenu
        var em = document.getElementById('extendedmenu');
        if (em.style.display == "inline") {
        em.style.display = 'none';
        }
        clearRoute();
}
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
function stopRKey(evt) {
    // disable the enter key action in a form.
  var evt = (evt) ? evt : ((event) ? event : null);
  var node = (evt.target) ? evt.target : ((evt.srcElement) ? evt.srcElement : null);
  if ((evt.keyCode == 13) && (node.type=="text"))  {return false;}
}

function page_init(){
        document.onkeypress = stopRKey; 
        updateZoom();
        initFlags();
        resize_sideBar();
        window.onresize = function(){resize_sideBar();}
}

function loadend(){
    if (EXT_MENU) {showMenu();}
    else {closeMenu();}
    
}
//======================================================================
// NOMINATIM
    function setCenterMap(nlon, nlat, zoom) {
        nlonLat = new OpenLayers.LonLat(nlon, nlat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
        map.setCenter(nlonLat, zoom);
        document.getElementById('sideBar').style.display='none';
    }

    function nominatimSearch(string) {
        if (string == '') {return false;};
        close_sideBar();
        document.getElementById("sideBarContent").innerHTML ='<p><img style="margin-left: 100px;" src="pics/snake_transparent.gif" /></p>';
        
        document.search.nom_search.value='';
        document.getElementById('sideBar').style.display='inline';
        //document.getElementById('search_result').style.display='inline';
        document.getElementById('sideBarTitle').innerHTML='&nbsp;'+_('search_results');
        
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
        
        htmlResponse='<p><ul>'
        for (r in pist.sites) {
            types=pist.sites[r].types.split(';');
            htmlResponse += '<li><a onclick="setCenterMap('
            + pist.sites[r].center +','
            + 12 +');">'
            + pist.sites[r].name +'</a>'
            for (t in  types) {
                htmlResponse +='&nbsp;<img src="'+icon[types[t]]+'"></li>';
            }
        }
        htmlResponse += '</p></ul><p><ul>'
        for (r in pist.routes) {
            type=pist.routes[r].types;
            color=pist.routes[r].color;
            htmlResponse += '<li><b style="color:'+color+';font-weight:900;">&#9679 </b>'
            +'<a onclick="setCenterMap('
            + pist.routes[r].center +','
            + 15 +');">'
            + pist.routes[r].name +'</a>'
            +'&nbsp;<img src="'+icon[type]+'">'
            +'</br>'
            +'<a style="font-size: 0.75em;" onclick="setCenterMap('
            + pist.routes[r].site_center +','
            + 12 +');">'
            +pist.routes[r].site_name+'</a>'
            +'</li>';
        }
        htmlResponse += '</ul></p><p><ul>'
        for (r in pist.pistes) {
            type=pist.pistes[r].types;
            htmlResponse += '<li><a onclick="setCenterMap('
            + pist.pistes[r].center +','
            + 15 +');">'
            + pist.pistes[r].name +'</a>'
            +'<b style="color:'+diffcolor[pist.pistes[r].difficulty]+';font-weight:900;">&nbsp;&#9830 </b>'
            +'&nbsp;<img src="'+icon[type]+'">'
            +'</br>'
            +'<a style="font-size: 0.75em;" onclick="setCenterMap('
            + pist.pistes[r].site_center +','
            + 12 +');">'
            +pist.pistes[r].site_name+'</a>'
            +'</li>';
        }
        htmlResponse += '</ul></p><p><ul>'
        for (r in pist.aerialways) {
            type=pist.aerialways[r].types;
            htmlResponse += '<li><a onclick="setCenterMap('
            + pist.aerialways[r].center +','
            + 15 +');">'
            + pist.aerialways[r].name +'</a>'
            +'&nbsp;<img src="'+icon[type]+'">'
            +'</br>'
            +'<a style="font-size: 0.75em;" onclick="setCenterMap('
            + pist.aerialways[r].site_center +','
            + 12 +');">'
            +pist.aerialways[r].site_name+'</a>'
            +'</li>';
        }
        htmlResponse += '</ul></p>'
        
        htmlResponse += '<hr/>'
        htmlResponse += '<p><ul>'
        for (var i=0;i<nom.length;i++) {
            htmlResponse += '<li><a onclick="setCenterMap('
            + nom[i].lon +','
            + nom[i].lat +','
            + 14 +');">'
            + nom[i].display_name +'</a></li><br/>';
        }
        htmlResponse += '</p></ul> <p>Nominatim Search Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"></p>';
        
        document.getElementById("sideBarContent").innerHTML = htmlResponse;
        resize_sideBar();
    }

//======================================================================
// MAP

var lat=46.82084;
var lon=6.39942;
var zoom=2;//2
var map;

var highlightCtrl, selectCtrl;

// a dummy proxy script is located in the directory to allow use of wfs
OpenLayers.ProxyHost = "cgi/proxy.cgi?url=";

// Redirect permalink
if (location.search != "") {
    //?zoom=13&lat=46.82272&lon=6.87183&layers=B0TT
    var x = location.search.substr(1).split("&")
    for (var i=0; i<x.length; i++)
    {
        if (x[i].split("=")[0] == 'zoom') {zoom=x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'lon') {lon=x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'lat') {lat=x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'm') {m=x[i].split("=")[1];} // not used
        if (x[i].split("=")[0] == 'e') {
            var ext=x[i].split("=")[1];
            if (ext == 'false'){EXT_MENU=false;}
            else if (ext == 'true'){EXT_MENU=true;}
            else {EXT_MENU=false;}
        }
    }
    //Then hopefully map_init() will do the job when the map is loaded
}

function zoomSlider(options) {

    this.control = new OpenLayers.Control.PanZoomBar(options);

    OpenLayers.Util.extend(this.control,{
        draw: function(px) {
            // initialize our internal div
            OpenLayers.Control.prototype.draw.apply(this, arguments);
            px = this.position.clone();

            // place the controls
            this.buttons = [];

            var sz = new OpenLayers.Size(24,24);
            var centered = new OpenLayers.Pixel(px.x+sz.w/2, px.y);
            this._addButton("zoomin", "zoom-plus-mini.png", centered.add(0, 5), sz);
            centered = this._addZoomBar(centered.add(0, sz.h + 5));
            this._addButton("zoomout", "zoom-minus-mini.png", centered, sz);
            return this.div;
        }
    });
    return this.control;
}

function updateZoom() {
    $('zoom').innerHTML= map.getZoom();
}
function onZoomEnd(){
    
    ONCE=true;
    if(CATCHER && ONCE){close_sideBar();CATCHER=false;}
    if (map.getZoom()<11){
        if (document.getElementById('zoomin-helper')) {
        document.getElementById('zoomin-helper').style.display = 'inline';}
    } else {
        if (document.getElementById('zoomin-helper')) {
        document.getElementById('zoomin-helper').style.display = 'none';}
    }
    if (EDIT_SHOWED){
        if (map.getZoom() < 13) {
            document.getElementById('edit_zoom_in').innerHTML='&nbsp;'+_('zoom_in');
            document.getElementById('permalink.potlatch').href = "javascript:void(0)";  
            document.getElementById('permalink.potlatch').target="";
            document.getElementById('potlatch_pic').src="pics/potlatch-disabled.png";
            document.getElementById('permalink.potlatch2').href = "javascript:void(0)";
            document.getElementById('permalink.potlatch2').target="";
            document.getElementById('potlatch2_pic').src="pics/potlatch2-disabled.png";
        }else {
            document.getElementById('edit_zoom_in').innerHTML='';
            permalink_potlatch.updateLink();
            document.getElementById('permalink.potlatch').target="blank";
            document.getElementById('potlatch_pic').src="pics/potlatch.png";
            permalink_potlatch2.updateLink();
            document.getElementById('permalink.potlatch2').target="blank";
            document.getElementById('potlatch2_pic').src="pics/potlatch2.png";
        }
    }
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
        map.addLayer(mapquest);    }
}

function baseLayers() {

// Layer 1.5
    var mapnik = new OpenLayers.Layer.OSM("OSM");
    //map.addLayer(mapnik);
// Layer 0
    //~ var snowCover = new OpenLayers.Layer.TMS( "Snow Cover",
                    //~ "http://tiles2.pistes-nordiques.org/snow-cover/",
                    //~ {   
                    //~ getURL: get_osm_url,
                    //~ isBaseLayer: false, visibility: true, maxScale: 6000000
                    //~ });
    //~ map.addLayer(snowCover);
// Layer 1
    var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
        "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
        "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
        "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
    var mapquest = new OpenLayers.Layer.OSM("MapQuest",arrayMapQuest);
    map.addLayer(mapquest);
// Layer 2
    //~ var layerGTOPO30 = new OpenLayers.Layer.TMS( "GTOPO30", "http://tiles2.pistes-nordiques.org/gtopo30/",{   
                //~ type: 'png', getURL: get_tms_url, alpha: true, opacity: 0.3,
                //~ isBaseLayer: false, visibility: true, maxScale: 3000000, minScale: 8000000
            //~ });
    //~ map.addLayer(layerGTOPO30);
//~ 
//~ // layer 3
    //~ var layerHillshade = new OpenLayers.Layer.TMS( "Hillshade", "http://www2.opensnowmap.org/hillshading/",{ 
                //~ type: 'png', getURL: get_tms_url, alpha: true, 
                //~ buffer: 0,
                //~ isBaseLayer: false, 
                //~ opacity: 0.4,minScale: 3000000, visibility: true
            //~ });
    //~ map.addLayer(layerHillshade);
//~ // layer 4
    //~ var layerContours = new OpenLayers.Layer.XYZ("Contour",
    //~ "http://www2.opensnowmap.org/tiles-contours/",{
            //~ getURL: get_osm_url,
            //~ numZoomLevels: 18, isBaseLayer: false,
            //~ transparent: true, buffer: 0,
            //~ minScale: 200000, visibility: true 
        //~ });
    //~ map.addLayer(layerContours);
//~ // Layer 5
    //~ var PistesTilesLowZoom = new OpenLayers.Layer.XYZ("Pistes Tiles LZ",
    //~ "http://tiles.opensnowmap.org/tiles-dev/",{
            //~ getURL: get_osm_url, 
            //~ isBaseLayer: false, numZoomLevels: 19,
            //~ visibility: true, opacity: 0.8,
            //~ maxScale: 250000
        //~ });
    //~ map.addLayer(PistesTilesLowZoom);
// Layer 6
    var PistesTiles = new OpenLayers.Layer.XYZ("Pistes Tiles",
    server+"assy/",{
            getURL: get_osm_url, 
            isBaseLayer: false, numZoomLevels: 19,
            visibility: true/*9, opacity: 0.95,
            minScale: 250000*/
        });
    map.addLayer(PistesTiles);

}

function permalink2Args() {
    var args = 
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args['editor'] = 'potlatch2';
    return args;
}

function permalink1Args() {
    var args = 
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args['editor'] = 'potlatch';
    return args;
}
function permalink0Args() {
    var args = 
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args['layers']='';
    args['e'] = EXT_MENU;
    args['m'] = mode;
    return args;
}

function map_init(){
    map = new OpenLayers.Map ("map", {
    controls:[
        //new OpenLayers.Control.PanZoomBar(),
        //to avoid shift+right click annoyance:
        new OpenLayers.Control.Navigation({'zoomBoxEnabled' : false }),
        new OpenLayers.Control.TouchNavigation(),
        new OpenLayers.Control.LayerSwitcher(),
        //new OpenLayers.Control.Attribution(),
        new OpenLayers.Control.Permalink('permalink',window.href,{'createParams': permalink0Args}),
        new OpenLayers.Control.MousePosition()],
        maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
        maxResolution: 156543.0399,
        numZoomLevels: 19,
        units: 'm',
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326")
    } );
    zoomBar = new zoomSlider({'div':document.getElementById("paneldiv")});
    zoomBar.zoomStopWidth=24;
    map.addControl(zoomBar);
    
    baseLayers();
// Switch base layer
    map.events.on({ "zoomend": function (e) {
        updateZoom();
        onZoomEnd();
        //~ if (map.getZoom() > 6) {
            //~ map.layers[1].setVisibility(true);
            //~ map.layers[1].redraw();
        //~ }
        //~ else {
            //~ map.layers[1].setVisibility(false);
        //~ }
    }
    });

    //################################
    var lonLat = new OpenLayers.LonLat(lon, lat).transform(
        new OpenLayers.Projection("EPSG:4326"),
        new OpenLayers.Projection("EPSG:900913"));
    map.setCenter (lonLat, zoom); 
    //map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.top=0;
    map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.left=0;
    // map.setCenter moved after the strategy.bbox, otherwise it won't load the wfs layer at first load
    map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
    loadend();
}

//======================================================================
// PRINT
function print() {
    // start print request
    var mq=map.getLayersByName("MapQuest")[0];
    var osm=map.getLayersByName("OSM")[0];
    if (mq) {var bg='mq';}
    else {var bg='osm';}
    
    var printLayer= map.getLayersByName("Print layer")[0];
    var b = printLayer.features[0].geometry.bounds;
    
    
    var b4326 = b.transform(
        new OpenLayers.Projection("EPSG:900913"),
        new OpenLayers.Projection("EPSG:4326"));
    var args=b4326.left+';'+b4326.right+';'+b4326.top+';'+b4326.bottom+';'+bg+';'+PRINT_TYPE;
    
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", server+"print?"+args);
    XMLHttp.onreadystatechange= function () {
        if (XMLHttp.readyState == 4) {
            // cut when cgi is not able to work
            document.getElementById('print_result').innerHTML='<p>&nbsp;&nbsp;<a style="text-align: center;" href="'+XMLHttp.responseText+'" target="blank">'+XMLHttp.responseText+'</a></p>';
        }
    }
    XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    
    XMLHttp.send();
    document.getElementById('print_result').innerHTML='<p><img style="margin-left: 100px;" src="pics/snake_transparent.gif" /></p>';
}
function close_printSettings(){
    document.getElementById('print-settings').style.display='none';
    document.getElementById('print_result').innerHTML='';
    var printLayer= map.getLayersByName("Print layer")[0];
    if (printLayer != null) {
        printLayer.destroyFeatures(printLayer.features);
        printLayer.destroy;
        map.removeLayer(printLayer);
    }
}
function show_printSettings(){
    document.getElementById('print-settings').style.display='block';
    var styleMap = new OpenLayers.StyleMap({
        'fillColor': '#ffffff',
        'fillOpacity' : 0.4,
        'strokeWidth': 5,
        'strokeColor': '#000000'
        });
    var printLayer = new OpenLayers.Layer.Vector("Print layer",{styleMap: styleMap});
    map.addLayers([printLayer]);
    var drag=new OpenLayers.Control.DragFeature(printLayer);
    map.addControls([drag]);
    drag.activate();
}
function setPrint(type) {
    var center = map.getCenter();
    var h;
    var v;
    if (type == 'vs') {h=5000;v=7000;PRINT_TYPE= 'small';}
    if (type == 'hs') {h=7000;v=5000;PRINT_TYPE= 'small';}
    //zoom 15
    if (type == 'vb') {h=14000;v=20000;PRINT_TYPE= 'big';}
    if (type == 'hb') {h=20000;v=14000;PRINT_TYPE= 'big';}
    // zoom 14
    var p1 = new OpenLayers.Geometry.Point(center.lon-h/2, center.lat-v/2);
    var p2 = new OpenLayers.Geometry.Point(center.lon-h/2, center.lat+v/2);
    var p3 = new OpenLayers.Geometry.Point(center.lon+h/2, center.lat+v/2);
    var p4 = new OpenLayers.Geometry.Point(center.lon+h/2, center.lat-v/2);
    var p5 = new OpenLayers.Geometry.Point(center.lon-h/2, center.lat-v/2);
    
    var pnt= [];
    pnt.push(p1,p2,p3,p4,p5);
    var ln = new OpenLayers.Geometry.LinearRing(pnt);
    var pf = new OpenLayers.Feature.Vector(ln);
    var printLayer= map.getLayersByName("Print layer")[0];
    printLayer.destroyFeatures(printLayer.features);
    printLayer.addFeatures([pf]);
}

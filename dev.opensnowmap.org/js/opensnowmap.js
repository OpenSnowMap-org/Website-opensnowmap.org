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

//
if (location.protocol != 'https:')
{
    protocol = 'http:';
} else
{
    protocol = 'https:';
}

var server = protocol+"//" + window.location.host + "/";
if (!window.location.host) {
    server = window.location.pathname.replace("index.html", '');
}
if (server.search('home') != -1){ server = protocol+"//beta.opensnowmap.org/";}

var pistes_and_relief_overlay_URL=protocol+"//www.opensnowmap.org/pistes-relief/";
var pistes_only_overlay_URL=protocol+"//www.opensnowmap.org/pistes/";
var snow_base_layer_URL =protocol+"//www.opensnowmap.org/base_snow_map/";

var mode = "raster";
var EXT_MENU = true;
var EDIT_SHOWED = false;
var CATCHER;
var MARKER = false;
var ONCE = false;
var DONATE_ONCE = true;
var BASELAYER = 'snowbase';
var permalink_id;
var permalink_ofsetter;
var zoomBar;
var PRINT_TYPE = 'small';
var map;
var lat = 0;
var lon = 0;
var zoom = 2;//2
var linesLayer;
var pointsLayer;
var highlightLayer;
var point_id = 0;
var modifyControl;
var highlightCtrl;
var selectCtrl;
var SIDEBARSIZE = 'full'; //persistent sidebar
var data = {};
var today = new Date();
var update;

var sideBarHistoryArray = []; // store sidebar content for History
var currentResult = -1; // index in history
var searchComplete = 0;

var GetProfileXHR = []; // to abort
var PisteAPIXHR = []; // to abort
var jsonPisteLists = [];
var jsonPisteList = {};

// a dummy proxy script is located in the directory to allow use of wfs
OpenLayers.ProxyHost = "cgi/proxy.cgi?url=";

var icon = {
    downhill:'pics/alpine.png',
    cable_car:'pics/cable_car.png',
    chair_lift:'pics/chair_lift.png',
    drag_lift:'pics/drag_lift.png',
    funicular:'pics/funicular.png',
    gondola:'pics/gondola.png',
    jump:'pics/jump.png',
    magic_carpet:'pics/magic_carpet.png',
    mixed_lift:'pics/mixed_lift.png',
    nordic:'pics/nordic.png',
    skitour:'pics/skitour.png',
    hike:'pics/snowshoe.png',
    "t-bar":'pics/drag_lift.png',
    "j-bar":'pics/drag_lift.png',
    platter:'pics/drag_lift.png',
    rope_tow:'pics/drag_lift.png',
    station:'pics/station.png',
    playground:'pics/playground.png',
    sled:'pics/sled.png',
    sleigh:'pics/sleigh.png',
    snow_park:'pics/snow_park.png',
    ski_jump:'pics/jump.png'

};
var diffcolor = {
    novice:'green',
    easy:'blue',
    intermediate:'red',
    advanced:'black',
    expert:'orange',
    freeride:'E9C900'
};
var diffcolorUS = {
    novice:'green',
    easy:'green',
    intermediate:'blue',
    advanced:'black',
    expert:'black',
    freeride:'#E9C900'
};
// IE fix
if (!document.getElementsByClassName) { // IE7 & IE8
    document.getElementsByClassName = function (cl) {
        var retnode = [];
        var elem = this.getElementsByTagName('*');
        for (i = 0; i < elem.length; i++) {
            if ((' ' + elem[i].className + ' ').indexOf(' ' + cl + ' ') > -1) {retnode.push(elem[i]);}
        }
        return retnode;
    };



}
if (!window.Element) // IE7
{
    Element = function () {};

    var __createElement = document.createElement;
    document.createElement = function (tagName)
    {
        var element = __createElement(tagName);
        if (element === null) {return null;}
        for (var k = 0; k < Element.prototype.length;k++){
            element[k] = Element.prototype[k];
        }
        return element;
    };

    var __getElementById = document.getElementById;
    document.getElementById = function (id)
    {
        var element = __getElementById(id);
        if (element === null) {return null;}
        for (var key in Element.prototype){
            element[key] = Element.prototype[key];
        }
        return element;
    };
}
if (!Element.prototype.getElementsByClassName){ //IE7 & IE8
    Element.prototype.getElementsByClassName = function (cl) {
        var retnode = [];
        var elem = this.getElementsByTagName('*');
        for (var i = 0; i < elem.length; i++) {
            if ((' ' + elem[i].className + ' ').indexOf(' ' + cl + ' ') > -1){
                retnode.push(elem[i]);
            }
        }
        return retnode;
    };
}

if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [];

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                keys.push(i);
            }
        }

        return keys;
    };
}
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj, start) {
        for (var i = (start || 0), j = this.length; i < j; i++) {
            if (this[i] === obj) { return i; }
        }
        return -1;
    };
}
// end of IE fix

function infoMode() {
    var m = '';
    if (mode == "raster") {
        /*show_helper();*/
        vectorLayers();
        m = "vector";
        map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
        map.div.style.cursor = 'pointer';
        //~ document.images['pointPic'].src='pics/pistes-pointer-on.png';
        document.getElementById('selectButton').style.backgroundColor = "#E65B3F";
        document.images.selectPic.src = 'pics/select-22-hover.png';
        document.getElementById('selectButton').onmouseout = function () { document.images.selectPic.src = 'pics/select-22-hover.png'; };
    }
    if (mode == "vector") {
        // first destroy the select and highlight controls
        close_sideBar();

        map.events.unregister("click", map, onMapClick);
        map.removeControl(modifyControl);
        map.removeLayer(linesLayer);
        map.removeLayer(pointsLayer);
        //~ map.removeLayer(highlightLayer);


        m = "raster";
        map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
        close_helper();
        //~ document.images['pointPic'].src='pics/pistes-pointer.png';
        map.div.style.cursor = 'default';
        document.getElementById('selectButton').style.backgroundColor = "#FDFDFD";
        document.images.selectPic.src = 'pics/select-22.png';
        document.getElementById('selectButton').onmouseout = function () { document.images.selectPic.src = 'pics/select-22.png'; };
    }
    mode = m;
    return true;
}
function showMenu() {
    document.getElementById('MenuBlock').style.display = 'block';
    document.getElementById('menuExt').style.display = 'none';
    EXT_MENU = true;
    resize_sideBar();
    return true;
}
function closeMenu() {
    document.getElementById('MenuBlock').style.display = 'none';
    document.getElementById('menuExt').style.display = 'block';
    EXT_MENU = false;
    resize_sideBar();
    return true;
}
function close_sideBar() {
    
    SIDEBARSIZE = 0;
    document.getElementById('sideBar').style.display = 'inline';
    document.getElementById('sideBar').style.height = SIDEBARSIZE + 'px';

    document.getElementById('sideBarHistory').className = document.getElementById('sideBarHistory').className.replace('shown', 'hidden');
    document.getElementById('sideBarHistory').innerHTML = ''; // Must prevent duplicate IDs
    document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown', 'hidden');
    document.getElementById('search_results').className = document.getElementById('search_results').className.replace('shown', 'hidden');
    document.getElementById('topo').className = document.getElementById('topo').className.replace('shown', 'hidden');
    document.getElementById('catcher').className = document.getElementById('catcher').className.replace('shown', 'hidden');
    document.getElementById('helper').className = document.getElementById('helper').className.replace('shown', 'hidden');
    document.getElementById('about').className = document.getElementById('about').className.replace('shown', 'hidden');
    document.getElementById('legend').className = document.getElementById('legend').className.replace('shown', 'hidden');
    document.getElementById('languages').className = document.getElementById('languages').className.replace('shown', 'hidden');
    document.getElementById('settings').className = document.getElementById('settings').className.replace('shown', 'hidden');
    document.getElementById('edit').className = document.getElementById('edit').className.replace('shown', 'hidden');

    document.getElementById('sideBar').style.display = 'none';
    EDIT_SHOWED = false;
    CATCHER = false;
    ONCE = true;
    
    if (DONATE_ONCE) {
        DONATE_ONCE = false;
    } else {
        close_donate();
    }

}
function close_helper() {
    close_sideBar();
}
function close_donate() {
    document.getElementById('donate-centering').style.display='none';
}
function show_catcher() {
    close_sideBar();
    document.getElementById('sideBar').style.display = 'inline';
    CATCHER = true;
    SIDEBARSIZE = 240;
    resize_sideBar();

    //~ var title = document.createElement('i');
    //~ title.innerHTML = '&nbsp;&nbsp;' + today.getDate() + '.' + (today.getMonth() + 1) + '.' + today.getFullYear() + '&nbsp';
    //~ document.getElementById('sideBarTitle').appendChild(title);

    var catcherDiv = document.getElementById('catcher');
    catcherDiv.className = catcherDiv.className.replace('hidden', 'shown');

    var full_length = parseFloat(data.downhill) + parseFloat(data.nordic) + parseFloat(data.aerialway) + parseFloat(data.skitour) + parseFloat(data.sled) + parseFloat(data.snowshoeing);
    document.getElementById('full_length').innerHTML = full_length;

    translateDiv('catcher');
    fillData('catcher');
    cacheInHistory(catcherDiv);
}
function show_helper() {
    close_sideBar();
    document.getElementById('sideBar').style.display = 'inline';
    SIDEBARSIZE = 'full';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '';

    var helperDiv = document.getElementById('helper');
    helperDiv.className = helperDiv.className.replace('hidden', 'shown');
    cacheInHistory(helperDiv);

    //~ if (map.getZoom()<11){
    //~ document.getElementById('zoomin-helper').style.display = 'inline';
    //~ } else {
    //~ document.getElementById('zoomin-helper').style.display = 'none';
    //~ }
}
function show_about() {
    close_sideBar();
    document.getElementById('sideBar').style.display = 'inline';
    SIDEBARSIZE = 'full';
    resize_sideBar();
    document.getElementById('sideBar').style.display = 'inline';
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('ABOUT');

    var aboutDiv = document.getElementById('about');
    aboutDiv.className = aboutDiv.className.replace('hidden', 'shown');

    var XMLHttp = new XMLHttpRequest();
    url = server + 'iframes/about.' + iframelocale + '.html';
    XMLHttp.open("GET", url);
    XMLHttp.setRequestHeader("Content-type", "text/html; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var full_length = parseFloat(data.downhill) + parseFloat(data.nordic) + parseFloat(data.aerialway) + parseFloat(data.skitour) + parseFloat(data.sled) + parseFloat(data.snowshoeing);

            var content = XMLHttp.responseText;
            content = content.replace('**update**', data.date)
            .replace('**nordic**', data.nordic)
            .replace('**downhill**', data.downhill)
            .replace('**aerialway**', data.aerialway)
            .replace('**skitour**', data.skitour)
            .replace('**sled**', data.sled)
            .replace('**snowshoeing**', data.snowshoeing);
            aboutDiv.innerHTML = content;
            //aboutDiv.style.display='inline';
            cacheInHistory(aboutDiv);
        }
    };
    XMLHttp.send();
    return true;
}
function show_edit() {

    document.getElementById('sideBar').style.display = 'inline';
    SIDEBARSIZE = 'full';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('EDIT').replace('<br/>', ' ');

    var editDiv = document.getElementById('edit');
    editDiv.className = editDiv.className.replace('hidden', 'shown');
    var link = editDiv.getElementsByClassName('localizedIframe')[0];
    link.href='iframes/how-to-' + iframelocale + '.html';
    translateDiv('edit');
    cacheInHistory(editDiv);

    permalink_id = new OpenLayers.Control.Permalink("permalink.id",
    protocol+"//www.openstreetmap.org/edit",{createParams: permalink1Args});
    map.addControl(permalink_id);
    permalink_ofsetter = new OpenLayers.Control.Permalink("permalink.offseter",
        "offseter");
    map.addControl(permalink_ofsetter);

    if (map.getZoom() < 13) {
        document.getElementById('edit_zoom_in').innerHTML = '&nbsp;' + _('zoom_in');
        document.getElementById('permalink.id').href = "javascript:void(0)";
        document.getElementById('permalink.id').target = "";
        document.getElementById('permalink.offseter').href = "javascript:void(0)";
        document.getElementById('permalink.offseter').target = "";
        document.getElementById('id_pic').src = "pics/id-grey-48.png";
        document.getElementById('josm_pic').src = "pics/josm-grey-48.png";
        document.getElementById('offseter_pic').src = "pics/offseter-grey-48.png";
    }else {
        document.getElementById('edit_zoom_in').innerHTML = '';
    }
    EDIT_SHOWED = true;
}
function show_legend() {
    close_sideBar();
    document.getElementById('sideBar').style.display = 'inline';
    SIDEBARSIZE = 'full';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('MAP_KEY').replace('<br/>', ' ');

    var legendDiv = document.getElementById('legend');
    legendDiv.className = legendDiv.className.replace('hidden', 'shown');
    var link = legendDiv.getElementsByClassName('localizedIframe')[0];
    link.href='iframes/how-to-' + iframelocale + '.html';
    translateDiv('legend');
    cacheInHistory(legendDiv);
}
function show_settings() {
    document.getElementById('sideBar').style.display = 'inline';
    SIDEBARSIZE = 'full';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('SETTINGS').replace('<br/>', ' ');

    var settingDiv = document.getElementById('settings');
    settingDiv.className = settingDiv.className.replace('hidden', 'shown');

    // highlight current base layer
    //~ var mq = map.getLayersByName("MapQuest")[0];
    var osm = map.getLayersByName("OSM")[0];
    if (osm) {
        document.getElementById('setOSMLayer').style.border = "solid #AAA 2px";
        //~ document.getElementById('setMQLayer').style.border = "solid #CCCCCC 1px";
    }
    //~ if (mq) {
        //~ document.getElementById('setMQLayer').style.border = "solid #AAA 2px";
        //~ document.getElementById('setOSMLayer').style.border = "solid #CCCCCC 1px";
    //~ }
    // check for currently displayed layers
    var d = map.getLayersByName("Daily")[0];
    var w = map.getLayersByName("Weekly")[0];
    //~ var m=map.getLayersByName("Monthly")[0];
    if (d) {
        document.getElementById('checkD').checked = true;
    }
    if (w) {
        document.getElementById('checkW').checked = true;
    }
    translateDiv('settings');
    //~ if (m) {
    //~ document.getElementById('checkM').checked=true;
    //~ }
}
function getWinHeight() {
    var myWidth = 0, myHeight = 0;
    if (typeof(window.innerWidth) == 'number') {
        //Non-IE
        myWidth = window.innerWidth;
        myHeight = window.innerHeight;
    } else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
        //IE 6+ in 'standards compliant mode'
        myWidth = document.documentElement.clientWidth;
        myHeight = document.documentElement.clientHeight;
    } else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
        //IE 4 compatible
        myWidth = document.body.clientWidth;
        myHeight = document.body.clientHeight;
    }
    return parseInt(myHeight);
}
function resize_sideBar() {
    if (document.getElementById('sideBar').style.display !== 'none') {
        document.getElementById('sideBar').style.bottom = 10 + document.getElementById("MainBlock").clientHeight + 'px';
        var sidebars = document.getElementsByClassName('sideBarContent');
        if (SIDEBARSIZE == 'full'){
            document.getElementById('sideBar').style.height = (getWinHeight() - document.getElementById("MainBlock").clientHeight - 35) + "px";
            document.getElementById('sideBar').style.display = 'inline';

            for (i = 0; i < sidebars.length; i++) {
                sidebars[i].style.height = (document.getElementById("sideBar").clientHeight - 33) + "px";
            }
            document.getElementById('sideBarInBox').style.height = (document.getElementById("sideBar").clientHeight - 33) + "px";
        } else {
            document.getElementById('sideBar').style.display = 'inline';
            document.getElementById('sideBar').style.height = SIDEBARSIZE + 'px';


            for (i = 0; i < sidebars.length; i++) {
                sidebars[i].style.height = SIDEBARSIZE - 35 + 'px';
            }
            document.getElementById('sideBarInBox').style.height = SIDEBARSIZE - 35 + 'px';
        }
    }
    return true;
}
function show_live_edits(when,display) {
    if (display) {
        var DiffStyle = new OpenLayers.Style({
                pointRadius: 1.5,
                fillColor: "#FF1200",
                strokeColor:"#FF1200"});
        if (when == "daily") {
            var DailyLayer = new OpenLayers.Layer.Vector("Daily", {
                        strategies: [new OpenLayers.Strategy.Fixed(),
                                    new OpenLayers.Strategy.Cluster()],
                        protocol: new OpenLayers.Protocol.HTTP({
                            url: "data/daily.tsv",
                            format: new OpenLayers.Format.Text()
                        }),
                        styleMap: new OpenLayers.StyleMap({
                            'default': DiffStyle
                        }),
                        projection: new OpenLayers.Projection("EPSG:4326")
                    });
            map.addLayers([DailyLayer]);
        }
        if (when == "weekly") {
            var WeeklyLayer = new OpenLayers.Layer.Vector("Weekly", {
                        strategies: [new OpenLayers.Strategy.Fixed(),
                                    new OpenLayers.Strategy.Cluster()],
                        protocol: new OpenLayers.Protocol.HTTP({
                            url: "data/weekly.tsv",
                            format: new OpenLayers.Format.Text()
                        }),
                        styleMap: new OpenLayers.StyleMap({
                            'default': DiffStyle
                        }),
                        projection: new OpenLayers.Projection("EPSG:4326")
                    });
            map.addLayers([WeeklyLayer]);
        }
        if (when == "monthly") {
            var MonthlyLayer = new OpenLayers.Layer.Vector("Monthly", {
                        strategies: [new OpenLayers.Strategy.Fixed(),
                                    new OpenLayers.Strategy.Cluster()],
                        protocol: new OpenLayers.Protocol.HTTP({
                            url: "data/monthly.tsv",
                            format: new OpenLayers.Format.Text()
                        }),
                        styleMap: new OpenLayers.StyleMap({
                            'default': DiffStyle
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
function show_languages() {
    var languageDiv = document.getElementById('languages');
    if ( (' ' + languageDiv.className + ' ').indexOf('shown') > -1) {
        languageDiv.innerHTML='';
        close_sideBar();
    } else {
    close_sideBar();
    document.getElementById('sideBar').style.display = 'inline';
    SIDEBARSIZE = 250;
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '';

    var t = document.createTextNode('  ' + _('lang').replace('<br/>', ' '));
    document.getElementById('sideBarTitle').appendChild(t);

    var img = document.createElement('img');
    img.src = 'pics/flags/' + locale + '.png';
    img.className = 'flagImg';

    document.getElementById('sideBarTitle').appendChild(img);
    
    languageDiv.className = languageDiv.className.replace('hidden', 'shown');


    //~ html = ''
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
        img2.className = ('flagImg');
        flagdiv.appendChild(img2);

        var link = document.createElement('a');
        link.innerHTML = '&nbsp;' + eval(locs[l]).lang;
        flagdiv.appendChild(link);

        languageDiv.appendChild(flagdiv);
        var cleardiv = document.getElementById('clearProto').cloneNode(true);
        cleardiv.removeAttribute("id");
        languageDiv.appendChild(cleardiv);
        }
    cacheInHistory(languageDiv);
    }
}
//======================================================================
// SideBar history
function cacheInHistory(div) {

    sideBarHistoryArray.push(cloneNodeAndEvents(div, true, true));
    jsonPisteLists.push(jsonPisteList);
    currentResult = sideBarHistoryArray.length - 1;
    if (sideBarHistoryArray.length > 5) {
        sideBarHistoryArray.splice(0, 1);
        jsonPisteLists.splice(0, 1);
        currentResult -= 1;
    }
    if (currentResult == sideBarHistoryArray.length - 1) {
        document.getElementById("next").style.color = '#AAA';
    }else {
        document.getElementById("next").style.color = '#444444';
    }
    if (currentResult <= 0) {
        document.getElementById("prev").style.color = '#AAA';
    }else {
        document.getElementById("prev").style.color = '#444444';
    }
    return true;
}
function prevResult() {
    if (sideBarHistoryArray.length >= currentResult - 1 && currentResult > 0) {
        close_sideBar();
        document.getElementById('sideBar').style.display = 'inline';
        SIDEBARSIZE = 'full';
        resize_sideBar();
        document.getElementById('sideBar').style.display = 'inline';
        document.getElementById('sideBarTitle').innerHTML = '';

        var historyDiv = document.getElementById('sideBarHistory');
        historyDiv.appendChild(cloneNodeAndEvents(sideBarHistoryArray[currentResult - 1]));
        historyDiv.className = historyDiv.className.replace('hidden', 'shown');
        jsonPisteList = jsonPisteLists[currentResult - 1];
        currentResult -= 1;
    }
    if (currentResult == sideBarHistoryArray.length - 1) {
        document.getElementById("next").style.color = '#AAA';
    }else {
        document.getElementById("next").style.color = '#444444';
    }
    if (currentResult <= 0) {
        document.getElementById("prev").style.color = '#AAA';
    }else {
        document.getElementById("prev").style.color = '#444444';
    }
    return true;
}
function nextResult() {
    if (currentResult < sideBarHistoryArray.length - 1) {
        close_sideBar();
        document.getElementById('sideBar').style.display = 'inline';
        SIDEBARSIZE = 'full';
        resize_sideBar();
        document.getElementById('sideBar').style.display = 'inline';
        document.getElementById('sideBarTitle').innerHTML = '';

        var historyDiv = document.getElementById('sideBarHistory');
        historyDiv.appendChild(cloneNodeAndEvents(sideBarHistoryArray[currentResult + 1]));
        historyDiv.className = historyDiv.className.replace('hidden', 'shown');
        jsonPisteList = jsonPisteLists[currentResult + 1];
        currentResult += 1;
    }
    if (currentResult == sideBarHistoryArray.length - 1) {
        document.getElementById("next").style.color = '#AAA';
    }else {
        document.getElementById("next").style.color = '#444444';
    }
    if (currentResult <= 0) {
        document.getElementById("prev").style.color = '#AAA';
    }else {
        document.getElementById("prev").style.color = '#444444';
    }
    return true;
}
//======================================================================
// INIT

document.onkeydown = checkKey;

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
    if (keynum == 27) {
        echap();
    }
    if (keynum == 13) {
        // fires nominatim search
        SearchByName(document.search.nom_search.value);
    }
}
function echap() {
    
    close_sideBar();
    // close extendedmenu
    //~ var em = document.getElementById('extendedmenu');
    //~ if (em.style.display == "inline") {
    //~ em.style.display = 'none';
    //~ }
    clearRoute();
    deHighlight();
    abortXHR('GetProfile'); // abort another request if any
    abortXHR('PisteAPI'); // abort another request if any
}
function stopRKey(evt) {
    // disable the enter key action in a form.
    evt = (evt) ? evt : ((event) ? event : null);
    var node = (evt.target) ? evt.target : ((evt.srcElement) ? evt.srcElement : null);
    if ((evt.keyCode == 13) && (node.type == "text"))  {return false;}
}
function page_init() {
    document.onkeypress = stopRKey;
    get_stats();
    updateZoom();
    initFlags();
    resize_sideBar();
    window.onresize = function () {
        resize_sideBar();
        document.getElementsByClassName('olControlPanZoomBar')[0].style.top="38px"; 
        document.getElementsByClassName('olControlPanZoomBar')[0].style.left="0px";
        };
    translateDiv('body');
    updateTooltips();
    document.getElementById("desktopswitch").style.backgroundColor='#CCC';
    document.getElementsByClassName('olControlPanZoomBar')[0].style.top="38px"; 
    document.getElementsByClassName('olControlPanZoomBar')[0].style.left="0px";

}
//~ function loadend() {
    //~ 
    //~ if (EXT_MENU) {showMenu();} else {closeMenu();}
//~ 
//~ }
//======================================================================
// REQUESTS
function abortXHR(type) {
    // Abort ongoing requests before sending a new one
    // Failing this, long requests results would be displayed over newer faster
    // ones.
    var i;
    if (type == 'GetProfile') {
        for (i = 0; i < GetProfileXHR.length; i++) {
            GetProfileXHR[i].abort();
        }
        GetProfileXHR.length = 0;
    } else if (type == 'PisteAPI') {
        for (i = 0; i < PisteAPIXHR.length; i++) {
            PisteAPIXHR[i].abort();
        }
        PisteAPIXHR.length = 0;
    }
    return true;
}

function setCenterMap(nlon, nlat, zoom) {
    nlonLat = new OpenLayers.LonLat(nlon, nlat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
    map.setCenter(nlonLat, zoom);
    //document.getElementById('sideBar').style.display='inline';
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
            show_catcher();
        }
    };
    XMLHttp.send();
    return true;

}

function getByName(name) {
    document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden', 'shown');
    var q = server + "request?group=true&geo=true&list=true&name=" + name;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown', 'hidden');
            document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden', 'shown');
            document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('hidden', 'shown');
            showHTMLPistesList(document.getElementById('piste_search_results'));
            SIDEBARSIZE = 'full';
            resize_sideBar();
            searchComplete += 1;
            if (searchComplete == 2) {
                cacheInHistory(document.getElementById('search_results'));
                searchComplete = 0;
            }
        }
    };
    XMLHttp.send();
    return true;
}
function nominatimSearch(name) {
    document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden', 'shown');
    var q = server + 'nominatim?format=json&place=' + name;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var nom = JSON.parse(XMLHttp.responseText);

            document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown', 'hidden');
            document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden', 'shown');
            document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('hidden', 'shown');

            var List = document.getElementsByTagName('ul')[0];
            for (var i = 0;i < nom.length;i++) {
                var resultli = document.getElementById('nominatim_result_list_proto').cloneNode(true);
                resultli.removeAttribute("id");
                resultli.setAttribute('lon', nom[i].lon);
                resultli.setAttribute('lat', nom[i].lat);
                resultli.onclick = function () {
                    setCenterMap(this.getAttribute('lon'), this.getAttribute('lat'), 14);
                };
                resultli.getElementsByTagName('a')[0].innerHTML = nom[i].display_name;
                List.appendChild(resultli);
            }


            SIDEBARSIZE = 'full';
            resize_sideBar();
            searchComplete += 1;
            if (searchComplete == 2) {
                cacheInHistory(document.getElementById('search_results'));
                searchComplete = 0;
            }
        }
    };
    XMLHttp.send();
    return true;
}
function SearchByName(name) {

    if (document.getElementById('searchDiv').style.display === 'none' || document.getElementById('searchDiv').style.display === '') {
        document.getElementById('searchDiv').style.display = 'block';
        document.getElementById("search_input").focus();
        return false;
    }
    if (name === '') {
        document.getElementById('searchDiv').style.display = 'none';
        return false;
    }

    close_sideBar();
    abortXHR('PisteAPI'); // abort another request if any
    abortXHR('GetProfile'); // abort another request if any
    searchComplete = 0;

    SIDEBARSIZE = 100;
    document.getElementById('sideBar').style.display = 'inline';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('search_results');
    document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('shown', 'hidden');
    document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('shown', 'hidden');
    document.search.nom_search.value = '';
    getByName(name);
    nominatimSearch(name);
    return true;
}

function getTopoByViewport() { //DONE in pisteList
    close_sideBar();
    abortXHR('PisteAPI'); // abort another request if any
    abortXHR('GetProfile'); // abort another request if any
    SIDEBARSIZE = 100;
    document.getElementById('sideBar').style.display = 'inline';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('search_results');
    document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden', 'shown');
    document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('shown', 'hidden');
    document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('shown', 'hidden');

    var bb = map.getExtent().transform(
        new OpenLayers.Projection("EPSG:900913"),
        new OpenLayers.Projection("EPSG:4326"));
    var q = server + "request?group=true&geo=true&list=true&sort_alpha=true&bbox=" + bb.left + ',' + bb.top + ',' + bb.right + ',' + bb.bottom;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown', 'hidden');
            document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden', 'shown');
            document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('hidden', 'shown');
            showHTMLPistesList(document.getElementById('piste_search_results'));
            //document.getElementById('piste_search_results').innerHTML=showHTMLPistesList();
            SIDEBARSIZE = 'full';
            resize_sideBar();
            cacheInHistory(document.getElementById('search_results'));
        }
    };
    XMLHttp.send();
    return true;
}
function getMembersById(id) { //DONE in pisteList
    close_sideBar();
    abortXHR('PisteAPI'); // abort another request if any

    SIDEBARSIZE = 100;
    document.getElementById('sideBar').style.display = 'inline';
    resize_sideBar();
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('search_results');
    document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('hidden', 'shown');
    document.getElementById('nominatim_results').className = document.getElementById('nominatim_results').className.replace('shown', 'hidden');
    document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('shown', 'hidden');

    var q = server + "request?parent=true&geo=true&list=true&sort_alpha=true&group=true&members=" + id;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById('requestWaiter').className = document.getElementById('requestWaiter').className.replace('shown', 'hidden');
            document.getElementById('search_results').className = document.getElementById('search_results').className.replace('hidden', 'shown');
            document.getElementById('piste_search_results').className = document.getElementById('piste_search_results').className.replace('hidden', 'shown');
            showHTMLPistesList(document.getElementById('piste_search_results'));
            SIDEBARSIZE = 'full';
            resize_sideBar();
            cacheInHistory(document.getElementById('search_results'));
            resize_sideBar();
        }
    };
    XMLHttp.send();

}
function getRouteTopoByWaysId(ids,routeLength) {//DONE in pisteList
    close_sideBar();
    abortXHR('PisteAPI'); // abort another request if any
    SIDEBARSIZE = 150;
    document.getElementById('sideBar').style.display = 'inline';
    resize_sideBar();
    document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('hidden', 'shown');
    document.getElementById('route_list').className = document.getElementById('route_list').className.replace('shown', 'hidden');
    document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden', 'shown');
    translateDiv('topo');
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('TOPO');

    spans = document.getElementById('topo').getElementsByClassName('data');
    var data;
    for (i = 0; i < spans.length; i++) {
        data = spans[i].getAttribute('dataText');
        if (data == 'route_length') {
            spans[i].innerHTML = parseFloat(routeLength).toFixed(1);
        }
    }

    var q = server + "request?geo=true&topo=true&ids_ways=" + ids;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            SIDEBARSIZE = 'full';
            document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('shown', 'hidden');
            document.getElementById('route_list').className = document.getElementById('route_list').className.replace('hidden', 'shown');
            showHTMLPistesList(document.getElementById('route_list'));
            resize_sideBar();
            searchComplete += 1;
            if (searchComplete == 2) {
                cacheInHistory(document.getElementById('topo'));
                searchComplete = 0;
            }
        }
    };
    XMLHttp.send();
    return true;
}
function getTopoById(ids,routeLength) {//DONE in pisteList
    close_sideBar();
    abortXHR('PisteAPI'); // abort another request if any
    SIDEBARSIZE = 150;
    document.getElementById('sideBar').style.display = 'inline';
    resize_sideBar();
    document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('hidden', 'shown');
    document.getElementById('route_list').className = document.getElementById('route_list').className.replace('shown', 'hidden');
    document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden', 'shown');
    translateDiv('topo');
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('TOPO');

    spans = document.getElementById('topo').getElementsByClassName('data');
    var data;
    for (i = 0; i < spans.length; i++) {
        data = spans[i].getAttribute('dataText');
        if (data == 'route_length') {
            spans[i].innerHTML = parseFloat(routeLength).toFixed(1);
        }
    }

    var q = server + "request?geo=true&topo=true&ids=" + ids;
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            SIDEBARSIZE = 'full';
            document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('shown', 'hidden');
            document.getElementById('route_list').className = document.getElementById('route_list').className.replace('hidden', 'shown');
            showHTMLPistesList(document.getElementById('route_list'));
            resize_sideBar();
            searchComplete += 1;
            if (searchComplete == 2) {
                cacheInHistory(document.getElementById('topo'));
                searchComplete = 0;
            }
        }
    };
    XMLHttp.send();
    return true;
}

function getClosestPistes(lonlat) {//DONE in pisteList


    abortXHR('PisteAPI'); // abort another request if any


    if (SIDEBARSIZE != 'full') {
        close_sideBar();
        SIDEBARSIZE = 150;
    } else {
        close_sideBar();
        SIDEBARSIZE = 'full';
    }
    document.getElementById('sideBar').style.display = 'inline';
    resize_sideBar();
    document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('hidden', 'shown');
    document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('shown', 'hidden');
    document.getElementById('route_list').className = document.getElementById('route_list').className.replace('shown', 'hidden');
    document.getElementById('routing_title').className = document.getElementById('routing_title').className.replace('shown', 'hidden');
    document.getElementById('profile_title').className = document.getElementById('profile_title').className.replace('shown', 'hidden');
    document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden', 'shown');
    translateDiv('topo');
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('TOPO');
    resize_sideBar();

    lonlat.transform(
        new OpenLayers.Projection("EPSG:900913"),
        new OpenLayers.Projection("EPSG:4326"));
    var q = server + "request?geo=true&list=true&closest=" + lonlat.lon + ',' + lonlat.lat;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            document.getElementById('routeWaiter').className = document.getElementById('routeWaiter').className.replace('shown', 'hidden');
            addPoint(jsonPisteList.snap);
        }
    };
    XMLHttp.send();
    return true;
}

function getProfile(wktroute, color) {//DONE in pisteList
    SIDEBARSIZE = 'full';
    abortXHR('GetProfile'); // abort another request if any
    resize_sideBar();
    var Div = document.getElementById('route_profile_image');
    while (Div.firstChild) {
        Div.removeChild(Div.firstChild);
    } //clear previous list
    document.getElementById('profileWaiter').className = document.getElementById('profileWaiter').className.replace('hidden', 'shown');
    document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('hidden', 'shown');

    document.getElementById('topo').className = document.getElementById('topo').className.replace('hidden', 'shown');
    translateDiv('topo');
    document.getElementById('sideBarTitle').innerHTML = '&nbsp;' + _('TOPO');

    // request the elevation profile

    var XMLHttp = new XMLHttpRequest();

    GetProfileXHR.push(XMLHttp); // keep the request to allow aborting

    XMLHttp.open("POST", server + "demrequest?size=big&color="+color);
    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {

            var profileDiv = document.getElementById('route_profile_image');
            while (profileDiv.firstChild) {
                profileDiv.removeChild(profileDiv.firstChild);
            } //clear previous list

            var img = document.createElement('img');
            img.src = server+'tmp/' + XMLHttp.responseText+'-3d.png';
            var img2 = document.createElement('img');
            img2.src = server+'tmp/' + XMLHttp.responseText+'-2d.png';
            var img3 = document.createElement('img');
            img3.src = server+'tmp/' + XMLHttp.responseText+'-ele.png';

            SIDEBARSIZE = 'full';
            document.getElementById('profileWaiter').className = document.getElementById('profileWaiter').className.replace('shown', 'hidden');
            //document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('hidden','shown');
            document.getElementById('route_profile').className = document.getElementById('route_profile').className.replace('hidden', 'shown');
            profileDiv.appendChild(img);
            profileDiv.appendChild(img2);
            profileDiv.appendChild(img3);
            resize_sideBar();
            searchComplete += 1;
            if (searchComplete == 2) {
                cacheInHistory(document.getElementById('topo'));
                searchComplete = 0;
            }
        }
    };
    XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    //XMLHttp.setRequestHeader("Content-length", wktroute.length);
    //XMLHttp.setRequestHeader("Connection", "close");

    XMLHttp.send(wktroute);
    return true;
}
function route() {

    abortXHR('PisteAPI'); // abort another request if any
    searchComplete = 0;

    var lls = {};
    var lonlats = [];
    for (f = 0; f < pointsLayer.features.length; f++) {
        if (pointsLayer.features[f].attributes.userpoint){
            var wgs84 = new OpenLayers.LonLat(
                pointsLayer.features[f].geometry.x,
                pointsLayer.features[f].geometry.y).transform(
                    new OpenLayers.Projection("EPSG:900913"),
                    new OpenLayers.Projection("EPSG:4326"));
            lls[pointsLayer.features[f].attributes.point_id] = [wgs84.lon,wgs84.lat];
        }
    }
    // order points in an array
    for (i = 1;i <= point_id;i++) {
        var lonlat = {};
        if (lls[i]){
            lonlat.lon = lls[i][0];
            lonlat.lat = lls[i][1];
            lonlats.push(lonlat);
        }
    }
    linesLayer.destroyFeatures();

    var q = '';
    for (pt = 0; pt < lonlats.length; pt++) {
        q = q + lonlats[pt].lat + ';' + lonlats[pt].lon + ',';
    }

    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", server + 'routing?' + q);
    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {

            var responseXML = XMLHttp.responseXML;
            if (responseXML === null){
                //removeLastRoutePoint();
                return null;
            }
            if (responseXML.getElementsByTagName('wkt')[0] !== null) {

                SIDEBARSIZE = 'full';
                resize_sideBar();

                document.getElementById('routing_title').className = document.getElementById('routing_title').className.replace('hidden', 'shown');
                document.getElementById('profile_title').className = document.getElementById('profile_title').className.replace('hidden', 'shown');
                var routeWKT = getNodeText(responseXML.getElementsByTagName('wkt')[0]);

                var routeIds = getNodeText(responseXML.getElementsByTagName('ids')[0]);
                var routeLength = getNodeText(responseXML.getElementsByTagName('length')[0]);

                getRouteTopoByWaysId(routeIds, routeLength);

                // show route
                var routeT = new OpenLayers.Geometry.fromWKT(routeWKT);
                var route900913 = routeT.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
                linesLayer.addFeatures(new OpenLayers.Feature.Vector(route900913, {userroute:'true'}));
                //requestInfos(routeIds,routeLength);

                getProfile(routeWKT);
            } else {

                SIDEBARSIZE = 'full';
                resize_sideBar();

                document.getElementById('routing_title').className = document.getElementById('routing_title').className.replace('shown', 'hidden');
                document.getElementById('profile_title').className = document.getElementById('profile_title').className.replace('shown', 'hidden');
                clearRouteButLast(); // if no route is found, start a new one
            }
        }
    };
    XMLHttp.send();
    return true;
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
        if (x[i].split("=")[0] == 'e') {
            var ext = x[i].split("=")[1];
            if (ext == 'false'){EXT_MENU = false;} else if (ext == 'true'){EXT_MENU = true;} else {EXT_MENU = false;}
        }
    }
    //Then hopefully map_init() will do the job when the map is loaded
}
function zoomSlider(options) {

    this.control = new OpenLayers.Control.PanZoomBar(options);

    OpenLayers.Util.extend(this.control, {
        draw: function (px) {
            // initialize our internal div
            OpenLayers.Control.prototype.draw.apply(this, arguments);
            px = this.position.clone();

            // place the controls
            this.buttons = [];

            var sz = new OpenLayers.Size(24,24);
            var centered = new OpenLayers.Pixel(px.x + sz.w / 2, px.y);
            this._addButton("zoomin", "zoom-plus-mini.png", centered.add(0, 5), sz);
            centered = this._addZoomBar(centered.add(0, sz.h + 5));
            this._addButton("zoomout", "zoom-minus-mini.png", centered, sz);
            return this.div;
        }
    });
    return this.control;
}
function updateZoom() {
    document.getElementById('zoom').innerHTML= map.getZoom();

}
function onZoomEnd() {

    ONCE = true;
    if (CATCHER && ONCE){
        close_sideBar();
        document.getElementById('donate-centering').style.display='none';
        CATCHER = false;
        }
    //~ if (map.getZoom()<11){
    //~ if (document.getElementById('zoomin-helper')) {
    //~ document.getElementById('zoomin-helper').style.display = 'inline';}
    //~ } else {
    //~ if (document.getElementById('zoomin-helper')) {
    //~ document.getElementById('zoomin-helper').style.display = 'none';}
    //~ }
    if (EDIT_SHOWED){
        if (map.getZoom() < 13) {
            document.getElementById('edit_zoom_in').innerHTML = '&nbsp;' + _('zoom_in');
            document.getElementById('permalink.id').href = "javascript:void(0)";
            document.getElementById('permalink.id').target = "";
            document.getElementById('id_pic').src = "pics/id-grey-48.png";
            document.getElementById('josm_pic').src = "pics/josm-grey-48.png";
            document.getElementById('offseter_pic').src = "pics/offseter-grey-48.png";
        }else {
            document.getElementById('edit_zoom_in').innerHTML = '';
            document.getElementById('permalink.id').href = "";
            document.getElementById('permalink.id').target = "blank";
            permalink_id.updateLink();
            document.getElementById('permalink.offseter').href = "";
            document.getElementById('permalink.offseter').target = "blank";
            permalink_ofsetter.updateLink();
            document.getElementById('id_pic').src = "pics/id-48.png";
            document.getElementById('josm_pic').src = "pics/josm-48.png";
            document.getElementById('offseter_pic').src = "pics/offseter-48.png";
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
        if (y < 0 || y >= limit)
          {
            return null;
        }        else
        {
            return this.url + z + "/" + x + "/" + y + ".png";
        }
    }
function setBaseLayer(baseLayer) {
    var snowbase = map.getLayersByName("SnowBase")[0];
    var osm = map.getLayersByName("OSM")[0];
    
    if (baseLayer == "osm" && snowbase) {
        map.removeLayer(snowbase);
        var arrayOSM = [protocol+"//a.tile.openstreetmap.org/${z}/${x}/${y}.png",
            protocol+"//b.tile.openstreetmap.org/${z}/${x}/${y}.png",
            protocol+"//c.tile.openstreetmap.org/${z}/${x}/${y}.png"];
        var mapnik = new OpenLayers.Layer.OSM("OSM",arrayOSM,
            {   visibility: true,
                isBaseLayer: true,
                transitionEffect: null
            });
        map.addLayer(mapnik);
        
        if (map.getLayersByName("PistesOnlyTiles")[0])
        {
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
            map.removeLayer(map.getLayersByName("PistesOnlyTiles")[0]);
        }
        
        if (document.getElementById('setOSMLayer'))
        {
            document.getElementById('setOSMLayer').style.border = "solid #AAA 2px";
            document.getElementById('setSnowBaseLayer').style.border = "solid #CCCCCC 1px";
        }

        BASELAYER = 'osm';
    }
    if (baseLayer == "snowbase" && osm) {
        map.removeLayer(osm);
        var arraySnowBase = [snow_base_layer_URL+"${z}/${x}/${y}.png"];
        var snowbaseLayer = new OpenLayers.Layer.OSM("SnowBase",
            arraySnowBase,
            {   visibility: true,
                isBaseLayer: true,
                transitionEffect: null
            });
        map.addLayer(snowbaseLayer);
        
        if (map.getLayersByName("PistesAndReliefTiles")[0])
        {
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
            map.removeLayer(map.getLayersByName("PistesAndReliefTiles")[0]);
        }
        if (document.getElementById('setSnowBaseLayer')) 
        {
            document.getElementById('setSnowBaseLayer').style.border = "solid #AAA 2px";
            document.getElementById('setOSMLayer').style.border = "solid #CCCCCC 1px";
        }

        BASELAYER = 'snowbase';
    }

    var permalinks = map.getControlsByClass("OpenLayers.Control.Permalink");
    for (p = 0; p < permalinks.length; p++){
        permalinks[p].updateLink();
    }
}
function baseLayers() {
    // Default to SnowBaseLayer
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

}
function permalink3Args() {
    var args =
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args.layers = BASELAYER;
    args.marker = 'true';
    return args;
}
function permalink2Args() {
    var args =
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args.editor = 'potlatch2';
    return args;
}
function permalink1Args() {
    var args =
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args.editor = 'id';
    return args;
}
function permalink0Args() {
    var args =
        OpenLayers.Control.Permalink.prototype.createParams.apply(
            this, arguments
        );
    args.layers = BASELAYER;

    //args['e'] = EXT_MENU;
    args.marker = 'false';
    return args;
}
function josmRemote() {
    var bb = map.getExtent().transform(
        new OpenLayers.Projection("EPSG:900913"),
        new OpenLayers.Projection("EPSG:4326"));
    var q = 'http://127.0.0.1:8111/load_and_zoom?left=' + bb.left + '&top=' + bb.top + '&right=' + bb.right + '&bottom=' + bb.bottom;
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", q, true);
    XMLHttp.send();

}
function map_init() {
    map = new OpenLayers.Map ("map", {
        zoomMethod: null,
        panMethod: null,
        controls:[
            //new OpenLayers.Control.PanZoomBar(),
            //to avoid shift+right click annoyance:
            new OpenLayers.Control.Navigation({zoomBoxEnabled: false}),
            new OpenLayers.Control.TouchNavigation(),
            new OpenLayers.Control.LayerSwitcher(),
            //new OpenLayers.Control.Attribution(),
            new OpenLayers.Control.Permalink('permalink',window.href,{createParams: permalink0Args}),
            new OpenLayers.Control.MousePosition()],
        maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
        maxResolution: 156543.0399,
        numZoomLevels: 19,
        units: 'm',
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326")
    });
    zoomBar = new zoomSlider({div:document.getElementById("paneldiv")});
    zoomBar.zoomStopWidth = 24;
    map.addControl(zoomBar);

    permalink_marker = new OpenLayers.Control.Permalink("permalink.marker",
    server + 'index.html',{createParams: permalink3Args});
    map.addControl(permalink_marker);
    permalink_simple = new OpenLayers.Control.Permalink("permalink.simple",
    server + 'index.html',{createParams: permalink0Args});
    map.addControl(permalink_simple);

    baseLayers();
    setBaseLayer(BASELAYER);
    
    highlightLayer = new OpenLayers.Layer.Vector("highlight", {styleMap: HLStyleMap});
    map.addLayer(highlightLayer);
    
    
    // Switch base layer
    map.events.on({zoomend: function (e) {
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
    map.getControlsByClass("OpenLayers.Control.PanZoomBar")[0].div.style.left = 0;
    // map.setCenter moved after the strategy.bbox, otherwise it won't load the wfs layer at first load
    map.getControlsByClass("OpenLayers.Control.Permalink")[0].updateLink();
    if (MARKER) {
        markerIcon = new OpenLayers.Icon('pics/marker.png',new OpenLayers.Size(20,25),new OpenLayers.Pixel(-12,-30));
        var markers = new OpenLayers.Layer.Markers("Markers");
        map.addLayer(markers);
        markers.addMarker(new OpenLayers.Marker(map.getCenter(), markerIcon));
    }
    
}

//======================================================================
// PRINT
function show_printSettings() {
    var z = map.getZoom();
    var center = map.getCenter().transform(new OpenLayers.Projection('EPSG:900913'), new OpenLayers.Projection('EPSG:4326'));
    //#map=4/6/42/0
    var hash = "#map="+z+'/'+center.lon+'/'+center.lat+'&base='+BASELAYER;
    window.open("print.html" + hash, "_blank", "height=480,width=685");
}

//======================================================================
// MAP


var routeStyle = new OpenLayers.Style(
    {
        strokeColor: "${getColor}",
        strokeDashstyle: "${getDash}",
        strokeLinecap: 'round',
        strokeOpacity: "${getOpacity}",
        graphicZIndex: 18,
        strokeWidth: "${getStroke}",
        pointRadius: "${getSize}",
        fillColor: "${getFill}",
        rotation: "${getRotation}",
        graphicName: "${getSymbol}"
    },
    {context: {
        getColor: function (feature) {
            if (feature.attributes.userpoint) {return '#000000';} else {return '#000000';}
        },
        getStroke: function (feature) {
            if (feature.attributes.userpoint) {return 1;} else {return 2;}
        },
        getDash: function (feature) {
            if (feature.attributes.userpoint) {return 'solid';} else {return 'dash';}
        },
        getOpacity: function (feature) {
            if (feature.attributes.userpoint) {return 0.5;} else {return 1;}
        },
        getFill: function (feature) {
            if (feature.attributes.start) {return '#AAAAAA';} else if (feature.attributes.end) {return '#000000';} else if (feature.attributes.angle) {return '#000000';} else {return '#ffffff';}
        },
        getRotation: function (feature) {
            if (feature.attributes.angle) {return feature.attributes.angle;} else {return 0;}
        },
        getSymbol: function (feature) {
            if (feature.attributes.angle) {return "triangle";} else {return "circle";}
        },
        getSize: function (feature) {
            if (feature.attributes.angle) {return 5;} else {return 6;}
        }
    }
});
var defStyle = new OpenLayers.Style({strokeColor: "#FF0000", strokeWidth: 2, fillColor: "#FF0000", pointRadius: 5});
var tmpStyle = new OpenLayers.Style({display: "none"});
var myStyleMap = new OpenLayers.StyleMap({'default': routeStyle, temporary: tmpStyle});

var HLStyle = new OpenLayers.Style({
    strokeColor: "#26CDFF",
    strokeWidth: 20,
    fillColor: "#FFFFFF",
    strokeOpacity:"${getOpacity}",
    fillOpacity:0.3
},{
    context: {
        getOpacity: function (feature) {
            if (map.getZoom() > 10) {return 0.3;} else {return 0.7;}
        }
    }
});
var HLStyleMap = new OpenLayers.StyleMap({'default': HLStyle});

function getNodeText(node) {
    //workaround for browser limit to 4096 char in xml nodeValue
    var r = "";
    for (var x = 0;x < node.childNodes.length; x++) {
        r = r + node.childNodes[x].nodeValue;
    }
    return r;
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
function zoomToParentRoute(osm_id,r) {
    var piste = null;
    for (p = 0; p < jsonPisteList.pistes.length; p++) {
        var ids = jsonPisteList.pistes[p].ids.join('_').toString();
        if (ids == osm_id){
            piste = jsonPisteList.pistes[p];
            break;
        }
    }
    if (!piste) {return false;}

    var parent = piste.in_routes[r];

    if (!parent) {return false;}

    var bbox = parent.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
    bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3]);
    map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'), new OpenLayers.Projection('EPSG:900913')));

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

function deHighlight() {
    if (highlightLayer) {highlightLayer.destroyFeatures();}
    return true;
}
function highlightElement(osm_id, type) {
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
    highlightGeom(element.geometry, 'piste');
    return true;
}
function highlightParentSite(osm_id,r) {
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
    highlightGeom(parent.geometry, 'site');
    return true;

}
function highlightParentRoute(osm_id,r) {
    var piste = null;
    for (p = 0; p < jsonPisteList.pistes.length; p++) {
        var ids = jsonPisteList.pistes[p].ids.join('_').toString();
        if (ids == osm_id){
            piste = jsonPisteList.pistes[p];
            break;
        }
    }
    if (!piste) {return false;}

    var parent = piste.in_routes[r];

    if (!parent) {return false;}
    highlightGeom(parent.geometry, 'route');
    return true;

}

function highlightGeom(geometry, type) {

    var encPol = new OpenLayers.Format.EncodedPolyline();
    var features = [];
    for (g = 0; g < geometry.length; g++) {
        var escaped = geometry[g];

        if (type == 'sites'){encPol.geometryType = 'polygon';} else {encPol.geometryType = 'linestring';}
        var feature = encPol.read(escaped);

        if (type == 'sites'){feature.attributes.polygon = true;}

        feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
        features.push(feature);
    }

    highlightLayer.destroyFeatures();
    highlightLayer.addFeatures(features);
    return true;
}

function drawGeomAsRoute(geometry, type) {
    if (mode == "raster") {infoMode();}

    var encPol = new OpenLayers.Format.EncodedPolyline();
    var features = [];
    for (g = 0; g < geometry.length; g++) {
        var escaped = geometry[g];

        encPol.geometryType = 'linestring';
        var feature = encPol.read(escaped);

        feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
        features.push(feature);

        if (g === 0) {
            var angle = 0;
            var pts = feature.geometry.getVertices();
            pointsLayer.destroyFeatures();
            var start = new OpenLayers.Feature.Vector(pts[0],{userpoint:true, point_id: point_id + 1, start: true});
            point_id = point_id + 1;
            var end = new OpenLayers.Feature.Vector(pts[pts.length - 1],{userpoint:true, point_id: point_id + 1, end: true});
            point_id = point_id + 1;


            if (pts[1].y > pts[0].y) {
                angle =  Math.atan((pts[0].x - pts[1].x) / (pts[0].y - pts[1].y)) * 180 / 3.1416;
            } else {
                angle = 180 + Math.atan((pts[0].x - pts[1].x) / (pts[0].y - pts[1].y)) * 180 / 3.1416;
            }// atan give a result between -pi/2 and pi/2


            var dir = new OpenLayers.Feature.Vector(pts[1],{userpoint:true, angle: angle});

            pointsLayer.addFeatures([start,end, dir]);

        }
    }

    linesLayer.destroyFeatures();
    linesLayer.addFeatures(features, {userroute:'true'});
    return true;

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
function showProfileFromGeometryParentRoute(osm_id,r) {
    if (mode == "raster") {infoMode();}
    var piste = null;
    for (p = 0; p < jsonPisteList.pistes.length; p++) {
        var ids = jsonPisteList.pistes[p].ids.join('_').toString();
        if (ids == osm_id){
            piste = jsonPisteList.pistes[p];
            break;
        }
    }
    if (!piste) {return false;}

    var parent = piste.in_routes[r];

    if (!parent) {return false;}


    drawGeomAsRoute(parent.geometry, 'route');

    var wkt = encpolArray2WKT(parent.geometry);


    searchComplete = 0;
    document.getElementById('routing_title').className = document.getElementById('routing_title').className.replace('hidden', 'shown');
    document.getElementById('profile_title').className = document.getElementById('profile_title').className.replace('hidden', 'shown');
    getTopoById(parent.id, wkt.length_km);
    getProfile(wkt.geom);
    return true;
}
function showProfileFromGeometry(osm_id, type, div, color) {
    if (mode == "raster") {infoMode();}

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

    drawGeomAsRoute(element.geometry, 'piste');

    var wkt = encpolArray2WKT(element.geometry);


    searchComplete = 0;
    
    document.getElementById('routing_title').className = document.getElementById('routing_title').className.replace('hidden', 'shown');
    document.getElementById('profile_title').className = document.getElementById('profile_title').className.replace('hidden', 'shown');
    
    getTopoById(osm_id.split('_').join(','), wkt.length_km);
    getProfile(wkt.geom, color);
    return true;
}

function addPoint(lonlat) {

    abortXHR('GetProfile'); // abort another request if any
    abortXHR('PisteAPI'); // abort another request if any

    // create the point geometry
    var pt = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Point(lonlat.lon,lonlat.lat).transform(
                    new OpenLayers.Projection("EPSG:4326"),
                    new OpenLayers.Projection("EPSG:900913")),
                            {userpoint:true, point_id: point_id + 1, end: true});

    if (pointsLayer.features.length === 0){pt.attributes.start = true;} else {pointsLayer.features[pointsLayer.features.length - 1].attributes.end = false;}

    pointsLayer.addFeatures([pt]);
    pointsLayer.redraw();
    point_id = point_id + 1;

    if (pointsLayer.features.length > 1){route();} else {
        document.getElementById('route_list').className = document.getElementById('route_list').className.replace('hidden', 'shown');
        showHTMLPistesList(document.getElementById('route_list'));
        cacheInHistory(document.getElementById('topo'));
    }
    return true;
}

function removePoint(f) {
    var id = f.attributes.point_id;
    f.destroy();
    route();
}

function clearRoute() {
    if (pointsLayer) {pointsLayer.destroyFeatures();}
    if (linesLayer) {linesLayer.destroyFeatures();}
    return true;
}
function clearRouteButLast() {
    var tokeep;
    for (f = 0; f < pointsLayer.features.length; f++) {
        if (pointsLayer.features[f].attributes.point_id == point_id){
            tokeep = new OpenLayers.LonLat(
                pointsLayer.features[f].geometry.x,
                pointsLayer.features[f].geometry.y);
        }
    }
    clearRoute();
    addPoint(tokeep.transform(
                    new OpenLayers.Projection("EPSG:900913"),
                    new OpenLayers.Projection("EPSG:4326")));
    return true;
}

function new_window() {
    printWindow = window.open('print.html');
    printWindow.document.write(
    '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html>\n'
    + '<head>\n'
            + '<meta name="http-equiv" content="Content-type: text/html; charset=UTF-8"/>\n'
            + '<title>Topo Ski Nordique / Nordic Ski Topo</title>\n'
            + '<link rel="stylesheet" href="main.css" media="print" />\n'
            + '<link rel="stylesheet" href="main.css" media="screen" />\n'
    + '</head>\n'
    + '<body>\n');

    printWindow.document.write(document.getElementById('topo').innerHTML);
    //printWindow.document.write(document.getElementById('contextual2').innerHTML);
    printWindow.document.write('<p></p><img src="pics/pistes-nordiques-238-45.png">');
    printWindow.document.write(document.getElementById('attributions').innerHTML);
    printWindow.document.write('\n</body></html>');
}

function onMapClick(e) {
    if (map.getZoom() > 10) {
        var lonlat = map.getLonLatFromPixel(e.xy);
        //first check pixel distance with existing features to robustify
        var px = map.getViewPortPxFromLonLat(lonlat);
        for (f = 0; f < pointsLayer.features.length; f++) {
            var fx = map.getViewPortPxFromLonLat(new OpenLayers.LonLat([
                pointsLayer.features[f].geometry.x,
                pointsLayer.features[f].geometry.y
                ]));
            if (Math.abs(fx.x - px.x) + Math.abs(fx.y - px.y) < 10){return false;}
        }

        getClosestPistes(lonlat);
    } /*else {
        show_helper();
    }*/
}
function vectorLayers() {

    linesLayer = new OpenLayers.Layer.Vector("lines", {styleMap: myStyleMap});
    map.addLayer(linesLayer);

    pointsLayer = new OpenLayers.Layer.Vector("points", {styleMap: myStyleMap});
    map.addLayer(pointsLayer);

    modifyControl = new OpenLayers.Control.ModifyFeature(
        pointsLayer, {autoActivate: true}
    );

    map.addControl(modifyControl);
    modifyControl.activate();

    modifyControlLines = new OpenLayers.Control.ModifyFeature(
        linesLayer, {autoActivate: true}
    );

    map.addControl(modifyControlLines);
    modifyControlLines.activate();

    pointsLayer.events.on({
    featuremodified: function (f) {
                            if (map.getZoom() > 10) {route();}
                        }
});

    var deleteHandler = new OpenLayers.Handler.Click(
        modifyControl,  // The select control
    {dblclick: function (evt) {
        if (map.getZoom() > 10) {
            var feat = this.layer.getFeatureFromEvent(evt);
            if (feat){removePoint(feat);}
        }
    }
},
{single: false,
    double: true,
    stopDouble: true,
    stopSingle: false
}
);
    deleteHandler.activate();

    map.events.register("click", map, onMapClick);
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
    ,insitediv;

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
                showSiteStats(this.parentNode,
                    this.parentNode.getAttribute('osm_id'),
                    this.parentNode.getAttribute('element_type'));
                showExtLink(this.parentNode,
                    this.parentNode.getAttribute('osm_id'),
                    this.parentNode.getAttribute('element_type'));
            };

            sitediv.getElementsByClassName("getMemberListButton")[0].onclick = function (e) {
                getMembersById(this.parentNode.getAttribute('osm_id'));
            };

            sitediv.onmouseout = function () {
                deHighlight();
            };

            sitediv.onmouseover = function () {
                highlightElement(this.getAttribute('osm_id'), 'sites');
            };

            sitediv.onclick = function () {
                zoomToElement(this.getAttribute('osm_id'), 'sites');
                map.moveByPx(125,0);
                deHighlight();
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
                zoomToElement(this.parentNode.getAttribute('osm_id'), 'pistes');
                map.moveByPx(125,0);
                showProfileFromGeometry(this.parentNode.getAttribute('osm_id'), 'pistes',null, this.parentNode.getAttribute('element_color'));
            };

            pistediv.getElementsByClassName("moreInfoButton")[0].onclick = function (e) {
                showExtLink(this.parentNode, this.parentNode.getAttribute('osm_id')
                    , this.parentNode.getAttribute('element_type'));
            };

            pistediv.getElementsByClassName("getMemberListButton")[0].style.display = 'none';

            buttondiv = pistediv.getElementsByClassName("pisteListButton")[0];
            buttondiv.onmouseout = function () {
                deHighlight();
            };

            buttondiv.onmouseover = function () {
                highlightElement(this.parentNode.getAttribute('osm_id'), 'pistes');
            };

            buttondiv.onclick = function () {
                zoomToElement(this.parentNode.getAttribute('osm_id'), 'pistes');
                map.moveByPx(125,0);
                deHighlight();
            };
            Div.appendChild(pistediv);

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
                            if (piste.difficulty == 'expert') {marker = '&diams;&diams;';}
                            if (piste.difficulty == 'advanced') {marker = '&diams;';}
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

                    insitediv.onmouseout = function () {
                        deHighlight();
                    };

                    insitediv.onmouseover = function () {
                        highlightParentSite(this.getAttribute('osm_id'), this.getAttribute('r'));
                    };

                    insitediv.onclick = function () {
                        zoomToParentSite(this.getAttribute('osm_id'), this.getAttribute('r'));
                        deHighlight();
                        getMembersById(this.getAttribute('parent_site_id'));
                    };
                    pistediv.appendChild(insitediv);
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

                    inroutediv.onmouseout = function () {
                        deHighlight();
                    };

                    inroutediv.onmouseover = function () {
                        highlightParentRoute(this.getAttribute('osm_id'), this.getAttribute('r'));
                    };

                    inroutediv.onclick = function () {
                        showProfileFromGeometryParentRoute(this.getAttribute('osm_id'), this.getAttribute('r'));
                        deHighlight();
                    };
                    pistediv.appendChild(inroutediv);

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
        
        abortXHR('PisteAPI'); // abort another request if any

        var q = server + "request?site-stats=" + id;
        var XMLHttp = new XMLHttpRequest();

        PisteAPIXHR.push(XMLHttp);

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
            spans[i].href = protocol+"//openstreetmap.org/browse/" + element_type + "/" + id;
        }
        if (data == 'siteId'){
            spans[i].innerHTML = id;
        }
        if (data == 'siteType'){
            spans[i].innerHTML = element_type; //way or relation
        }
    }

}

function showExtLink(div, ids, element_type) {

    var child = div.getElementsByClassName('elementExtLink')[0];
    if (child === undefined) {

        ids = ids.split('_');

        for (k = 0; k < ids.length; k++) {
            var id = ids[k];
            
            var linkdiv = document.getElementById('elementExtLinkProto').cloneNode(true);
            linkdiv.removeAttribute("id");
            div.appendChild(linkdiv);
            linkdiv.className.replace('shown', 'hidden');
            
            if (element_type == 'relation') {
                linkdiv.getElementsByClassName('analyse')[0].className.replace('hidden', 'shown');
                linkdiv.getElementsByClassName('analyse')[0].style.display = 'inline';
            }
            spans = linkdiv.getElementsByClassName('data');
            for (i = 0; i < spans.length; i++) {
                var data = spans[i].getAttribute('dataText');

                if (data == 'siteUrl'){
                    spans[i].href = protocol+"//openstreetmap.org/browse/" + element_type + "/" + id;
                }
                if (data == 'siteId'){
                    spans[i].innerHTML = id;
                }

                if (data == 'siteType'){
                    spans[i].innerHTML = element_type; //way or relation
                }
                if (data == 'analyseUrl'){
                    spans[i].href = "http://ra.osmsurround.org/analyzeRelation?relationId=+" + id;
                }
            }

        }

    } else {
        child.parentNode.removeChild(child);
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
function fillData(divID) {
    var div = document.getElementById(divID);
    var elements = div.getElementsByClassName('data');
    for (i = 0; i < elements.length; i++) {
        elements[i].innerHTML = data[elements[i].getAttribute('dataText')];
        if (elements[i].getAttribute('dataText') == 'date'){
            elements[i].innerHTML = data[elements[i].getAttribute('dataText')].split("T")[0];
        }
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
    close_sideBar();
}
// Set flag button
function initFlags() {
    var img = document.createElement('img');
    img.src = 'pics/flags/' + locale + '.png';
    img.className = ('flagMenuImg');
    document.getElementById('langs').innerHTML='';
    document.getElementById('langs').appendChild(img);
}

function updateTooltips() {
    document.getElementById("settingsMenuButton").setAttribute('title', _('settings-tooltip'));
    document.getElementById("mapkeyMenuButton").setAttribute('title', _('MAP_KEY'));
    document.getElementById("editMenuButton").setAttribute('title', _('edit_the_map_using'));
    document.getElementById("aboutMenuButton").setAttribute('title', _('ABOUT'));
    document.getElementById("blogMenuButton").setAttribute('title', _('blog.opensnowmap.org'));
    document.getElementById("dataMenuButton").setAttribute('title', _('data-tooltip'));

    document.getElementById("langs").setAttribute('title', _('lang-tooltip'));
    document.getElementById("printMenuButton").setAttribute('title', _('print-tooltip'));
    document.getElementById("permalink.marker").setAttribute('title', _('marker-tooltip'));
    document.getElementById("permalink.simple").setAttribute('title', _('link-tooltip'));
    document.getElementById("desktopswitch").setAttribute('title', _('desktop-tooltip'));
    document.getElementById("mobileswitch").setAttribute('title', _('mobile-tooltip'));
    document.getElementById("listPistesMenuButton").setAttribute('title', _('list_pistes-tooltip'));

    document.getElementById("selectButton").setAttribute('title', _('interactive-tooltip'));
    document.getElementById("searchMenuButton").setAttribute('title', _('search-tooltip'));
}

function cloneNodeAndEvents(oldNode) {
    var
    oldSubElements
    , newNode
    , newSubElements
    , n1, n2

    ,allEvents = ['onabort','onbeforecopy','onbeforecut','onbeforepaste','onblur','onchange','onclick',
    'oncontextmenu','oncopy','ondblclick','ondrag','ondragend','ondragenter', 'ondragleave',
    'ondragover','ondragstart', 'ondrop','onerror','onfocus','oninput','oninvalid','onkeydown',
    'onkeypress', 'onkeyup','onload','onmousedown','onmousemove','onmouseout',
    'onmouseover','onmouseup', 'onmousewheel', 'onpaste','onreset', 'onresize','onscroll','onsearch', 'onselect','onselectstart','onsubmit','onunload'];



    // clone
    newNode = oldNode.cloneNode(true);

    // events

    oldSubElements = oldNode.getElementsByTagName('*');
    newSubElements = newNode.getElementsByTagName('*');

    // The node root
    for (n2 = 0; n2 < allEvents.length; n2++) {
        if (oldNode[allEvents[n2]]) {
            newNode[allEvents[n2]] = oldNode[allEvents[n2]];
        }
    }

    // Node descendants
    for (n1 = 0; n1 < oldSubElements.length; n1++) {
        for (n2 = 0; n2 < allEvents.length; n2++) {
            if (oldSubElements[n1][allEvents[n2]]) {
                newSubElements[n1][allEvents[n2]] = oldSubElements[n1][allEvents[n2]];
            }
        }
    }


    return newNode;
}

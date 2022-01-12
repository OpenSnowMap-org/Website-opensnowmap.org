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
if (location.protocol != 'https:') {
  protocol = 'http:';
} else {
  protocol = 'https:';
}

var server = protocol + "//" + window.location.host + "/";
if (!window.location.host) {
  server = window.location.pathname.replace("index.html", '');
  server = window.location.pathname.replace("mobile.html", '');
}
if (server.search('home') != -1) {
  server = protocol + "//beta.opensnowmap.org/";
}


var pistes_and_relief_overlay_URL = protocol + "//tiles.opensnowmap.org/pistes-relief/";
var pistes_only_overlay_HDPI_URL = protocol + "//tiles.opensnowmap.org/pistes-high-dpi/";
var pistes_only_overlay_URL = protocol + "//tiles.opensnowmap.org/pistes/";
var snow_base_layer_URL = protocol + "//tiles.opensnowmap.org/base_snow_map/";
var snow_base_layer_HDPI_URL = protocol + "//tiles.opensnowmap.org/base_snow_map_high_dpi/";


var MARKER = false;
var LOC = false;
var map;
var lat = 30;
var lon = 0;
var zoom = 1; //2
var center = ol.proj.toLonLat([lon, lat], 'EPSG:4326');
var lengthes;
var data = {};
var BASELAYER = 'snowmap';
var HDPI = false; 
var shouldUpdateHashPermalink = true;
var geoLoc = null;
/* piste query */
var PISTELISTMODE = false;
var QUERYMODE = false;
var NOTEMODE = false;
var modifyPoints;
var drawPoints;
var Pointsfeatures = new ol.Collection();
var sourcePoints = new ol.source.Vector({
  features: Pointsfeatures
})

/* Routing*/
var ROUTEMODE = false;
var pointID = 0;
var lineID = 0;
  // Features collections and layers where the app add calculated routes
var routePointsfeatures = new ol.Collection();
var routeSourcePoints = new ol.source.Vector({
  features: routePointsfeatures
});
var routeLinesfeatures = new ol.Collection();
var routeSourceLines = new ol.source.Vector({
  features: routeLinesfeatures
});

var RouteInteractionDragCoordinate_;
var RouteInteractionDragOrigin_;

var RouteInteractionDraggableFeature_=false; // 
var RouteInteractionInserting_=false;
var RouteInteractionPanning_=false;
var RouteInteractionStopDownEvent = false;
var routeIteraction; 
var ROUTING = false; // not sure what is the best way to handle unfinished route requests, a queue would be best

/* Openstreetmap changes */
var deletedNodesSource = new ol.source.Vector();
var deletedWaysSource = new ol.source.Vector();
var deletedRelationsSource = new ol.source.Vector();
var modifiedNodesSource = new ol.source.Vector();
var modifiedWaysSource = new ol.source.Vector();
var modifiedRelationsSource = new ol.source.Vector();
var addedNodesSource = new ol.source.Vector();
var addedWaysSource = new ol.source.Vector();
var addedRelationsSource = new ol.source.Vector();
// a dummy proxy script is located in the directory to allow use of wfs
//~ OpenLayers.ProxyHost = "cgi/proxy.cgi?url=";

// Permalink and URL handling
if (window.location.hash !== '') {
  readHashPermalink();
}

function readHashPermalink() {

  var hash = window.location.hash.replace('#map=', '')
  while (hash.search('&') > -1) {
    hash = hash.replace('&', '/');
  }
  var parts = hash.split('/');
  if (parts.length >= 4) {
    zoom = parseInt(parts[0], 10);
    center = [
      parseFloat(parts[1]),
      parseFloat(parts[2]),
      parseFloat(parts[3])
    ];
    center = ol.proj.toLonLat(center, 'EPSG:4326');

    parts.forEach(function(part) {
      if (part.search('m=true') > -1) {
        MARKER = true;
      }
      if (part.search('b=snowmap') > -1) {
        BASELAYER = 'snowmap';
      }
      if (part.search('b=osm') > -1) {
        BASELAYER = 'osm';
      }
      if (part.search('h=true') > -1) {
        HDPI = true;
      }
    });
  }
  //Then hopefully map_init() will do the job when the map is loaded
}

var updateHashPermalink = function() {

  if (!shouldUpdateHashPermalink) {
    // do not update the URL when the view was changed in the 'popstate' handler
    shouldUpdateHashPermalink = true;
    return;
  }

  var view = map.getView();
  var zoom = view.getZoom();
  var center = view.getCenter();

  center = ol.proj.fromLonLat(ol.proj.toLonLat(center, 'EPSG:3857'), 'EPSG:4326')
  var hash = '#map=' +
    zoom + '/' +
    Math.round(center[0] * 1000) / 1000 + '/' +
    Math.round(center[1] * 1000) / 1000 +
    '&b=' + BASELAYER +
    '&m=' + MARKER +
    '&h=' + HDPI;
  var state = {
    zoom: zoom,
    center: center,
    rotation: view.getRotation()
  };
  document.getElementById('zoom').innerHTML = zoom;
  window.history.pushState(state, 'map', hash);
  //~ document.getElementsByClassName('ol-zoomslider-thumb')[0].innerHTML=zoom;
  return true;
};

var updateZoomContent = function() {
  updateHashPermalink();
  
  var zoom = view.getZoom();
  if (zoom > 12) {
    document.getElementById('note_input').placeholder = _('note-disclaimer');
    document.getElementById('note_input').disabled=false;
    document.getElementById('doSubmit').style.display='inline';
  }
  else {
    document.getElementById('note_input').placeholder = _('note_zoom_in');
    document.getElementById('note_input').disabled=true;
    document.getElementById('doSubmit').style.display='none';
  }
  return true;
};
var extent = ol.proj.get('EPSG:3857').getExtent();
var tileSizePixels = 384;
var tileSizeMtrs = ol.extent.getWidth(extent) / 384;
var resolutions = [];
for (var i = -1; i <= 20; i++) {
  resolutions[i] = tileSizeMtrs / (Math.pow(2, i));
}

var viewHDPI = new ol.View({
  center: ol.proj.fromLonLat(center, 'EPSG:3857'),
  zoom: zoom,
  constrainResolution: true,
  zoom: zoom,
  maxResolution: 40075016.68557849 / 384,
  maxZoom: 18,
  moveTolerance: 1,
});

var view = new ol.View({
  center: ol.proj.fromLonLat(center, 'EPSG:3857'),
  zoom: zoom,
  constrainResolution: true,
  maxZoom: 18,
  moveTolerance: 1,
  // default to maxResolution : 40075016.68557849 / 256
});

var icon = {
  "downhill": 'pics/downhill_20.svg',
  "cable_car": 'pics/cable_car_20.svg',
  "chair_lift": 'pics/chair_lift_20.svg',
  "drag_lift": 'pics/drag_lift_20.svg',
  "funicular": 'pics/funicular_20.svg',
  "gondola": 'pics/gondola_20.svg',
  "jump": 'pics/jump_20.svg',
  "magic_carpet": 'pics/magic_carpet_20.svg',
  "mixed_lift": 'pics/mixed_lift_20.svg',
  "nordic": 'pics/classic_20.svg',
  "classic": 'pics/classic_20.svg',
  "skating": 'pics/skating_20.svg',
  "crosscountry": 'pics/crosscountry_20.svg',
  "skitour": 'pics/skitour_20.svg',
  "snowshoe": 'pics/snowshoe_20.svg',
  "hike": 'pics/hike_20.svg',
  "t-bar": 'pics/drag_lift_20.svg',
  "j-bar": 'pics/drag_lift_20.svg',
  "platter": 'pics/drag_lift_20.svg',
  "rope_tow": 'pics/drag_lift_20.svg',
  "station": 'pics/station.png',
  "playground": 'pics/playground_20.svg',
  "sled": 'pics/sled_20.svg',
  "sleigh": 'pics/sleigh_20.svg',
  "snow_park": 'pics/snow_park_20.svg',
  "ski_jump": 'pics/jump_20.svg'

};
var diffcolor = {
  "novice": 'green',
  "easy": 'blue',
  "intermediate": 'red',
  "advanced": 'black',
  "expert": 'orange',
  "freeride": 'E9C900'
};
var diffcolorUS = {
  "novice": 'green',
  "easy": 'green',
  "intermediate": 'blue',
  "advanced": 'black',
  "expert": 'black',
  "freeride": '#E9C900'
};

var setCanvasScale = function(evt) {
  if (BASELAYER == 'osm' && HDPI) {
    if (map.getViewport().getElementsByTagName('canvas')[0]) {
      var w = Math.floor((map.getViewport().getElementsByTagName('canvas')[0].width - 1) / 4);
      var h = Math.floor((map.getViewport().getElementsByTagName('canvas')[0].height - 1) / 4);
      map.getViewport().getElementsByTagName('canvas')[0].getContext("2d").setTransform(1.5, 0, 0, 1.5, -w, -h);
    }
  } else {
    if (map.getViewport().getElementsByTagName('canvas')[0])
      map.getViewport().getElementsByTagName('canvas')[0].getContext("2d").setTransform(1, 0, 0, 1, 0, 0);
  }
  map.render();
  return true;
};

function getWinHeight() {
  var myWidth = 0,
    myHeight = 0;
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

function getChangeFiles(file, source) {
  var XMLHttp = new XMLHttpRequest();
  XMLHttp.open("GET", server + file);
  XMLHttp.setRequestHeader("Content-type", "text/plain; charset=utf-8");

  XMLHttp.onreadystatechange = function() { // no way to pass args in the callback
    if (XMLHttp.readyState == 4) {
      if (XMLHttp.responseText != "") {
        var csv = XMLHttp.responseText;
        var features = [];
        var prevIndex = csv.indexOf('\n') + 1; // scan past the header line
        var curIndex;
        while ((curIndex = csv.indexOf('\n', prevIndex)) != -1) {
          line = csv.substr(prevIndex, curIndex - prevIndex).split(',');
          prevIndex = curIndex + 1;

          coords = ol.proj.fromLonLat([parseFloat(line[1]), parseFloat(line[0])]);
          if (isNaN(coords[0]) || isNaN(coords[1])) {
            // guard against bad data
            continue;
          }
          features.push(new ol.Feature({
            geometry: new ol.geom.Point(coords)
          }));
        }
        source.addFeatures(features);
      }
    }
  };
  XMLHttp.send();
  return true;
}

function show_live_edits(when) {

  var deletedNodesStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 2.5,
      stroke: new ol.style.Stroke({
        color: '#00000000',
        width: 0,
      }),
      fill: new ol.style.Fill({
        color: '#FF1200'
      })
    })
  });
  var deletedWaysStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 4,
      stroke: new ol.style.Stroke({
        color: '#00000000',
        width: 0,
      }),
      fill: new ol.style.Fill({
        color: '#FF1200'
      })
    })
  });
  var deletedRelationsStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 5.5,
      stroke: new ol.style.Stroke({
        color: '#FF1200',
        width: 3,
      }),
      fill: new ol.style.Fill({
        color: '#FF120000'
      })
    })
  });
  var modifiedNodesStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 2.5,
      stroke: new ol.style.Stroke({
        color: '#00000000',
        width: 0,
      }),
      fill: new ol.style.Fill({
        color: '#FFA600'
      })
    })
  });
  var modifiedWaysStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 4,
      stroke: new ol.style.Stroke({
        color: '#00000000',
        width: 0,
      }),
      fill: new ol.style.Fill({
        color: '#FFA600'
      })
    })
  });
  var modifiedRelationsStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 5.5,
      stroke: new ol.style.Stroke({
        color: '#FFA600',
        width: 3,
      }),
      fill: new ol.style.Fill({
        color: '#FFA60000'
      })
    })
  });
  var addedNodesStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 2.5,
      stroke: new ol.style.Stroke({
        color: '#00000000',
        width: 0,
      }),
      fill: new ol.style.Fill({
        color: '#33FF00'
      })
    })
  });
  var addedWaysStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 4,
      stroke: new ol.style.Stroke({
        color: '#00000000',
        width: 0,
      }),
      fill: new ol.style.Fill({
        color: '#33FF00'
      })
    })
  });
  var addedRelationsStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 5.5,
      stroke: new ol.style.Stroke({
        color: '#33FF00',
        width: 3,
      }),
      fill: new ol.style.Fill({
        color: '#33FF0000'
      })
    })
  });

  styles = [
    deletedNodesStyle,
    deletedWaysStyle,
    deletedRelationsStyle,
    modifiedNodesStyle,
    modifiedWaysStyle,
    modifiedRelationsStyle,
    addedNodesStyle,
    addedWaysStyle,
    addedRelationsStyle
  ];

  sources = [
    deletedNodesSource,
    deletedWaysSource,
    deletedRelationsSource,
    modifiedNodesSource,
    modifiedWaysSource,
    modifiedRelationsSource,
    addedNodesSource,
    addedWaysSource,
    addedRelationsSource
  ];

  layerNames = [
    "deletedNodesLayer",
    "deletedWaysLayer",
    "deletedRelationsLayer",
    "modifiedNodesLayer",
    "modifiedWaysLayer",
    "modifiedRelationsLayer",
    "addedNodesLayer",
    "addedWaysLayer",
    "addedRelationsLayer"
  ];

  /*
  deletedNodesStyle
  deletedWaysStyle
  deletedRelationsStyle
  modifiedNodesStyle
  modifiedWaysStyle
  modifiedRelationsStyle
  addedNodesStyle
  addedWaysStyle
  addedRelationsStyle
  * */
  for (i = 0; i < 9; i++) {
    map.removeLayer(getLayerByName(layerNames[i]));
    sources[i].clear({
      fast: true
    });
  }

  if (when == "daily") {


    files = ["data/daily_nodes_deleted.csv",
      "data/daily_ways_deleted.csv",
      "data/daily_relations_deleted.csv",
      "data/daily_nodes_modified.csv",
      "data/daily_ways_modified.csv",
      "data/daily_relations_modified.csv",
      "data/daily_nodes_added.csv",
      "data/daily_ways_added.csv",
      "data/daily_relations_added.csv"
    ];

    for (i = 0; i < 9; i++) {
      map.addLayer(
        new ol.layer.Vector({
          name: layerNames[9 - i],
          source: sources[9 - i],
          style: styles[9 - i],
          declutter: false
        })
      );
    }
    for (i = 0; i < 9; i++) {
      getChangeFiles(files[i], sources[i]);
    }
  }
  if (when == "weekly") {

    files = ["data/weekly_nodes_deleted.csv",
      "data/weekly_ways_deleted.csv",
      "data/weekly_relations_deleted.csv",
      "data/weekly_nodes_modified.csv",
      "data/weekly_ways_modified.csv",
      "data/weekly_relations_modified.csv",
      "data/weekly_nodes_added.csv",
      "data/weekly_ways_added.csv",
      "data/weekly_relations_added.csv"
    ];

    for (i = 0; i < 9; i++) {
      map.addLayer(
        new ol.layer.Vector({
          name: layerNames[9 - i],
          source: sources[9 - i],
          style: styles[9 - i],
          declutter: false
        })
      );
    }
    for (i = 0; i < 9; i++) {
      getChangeFiles(files[i], sources[i]);
    }
  }
  if (when == "none") {
    // layers already removed
  }
}

function clearResultList() {
  document.getElementById('piste_search_results').innerHTML = '';
  document.getElementById('nominatimLi').innerHTML = '';
  
}
function toggleQueriesHints(){
  if (document.getElementById('dorouteButton').style.display == 'none')
    document.getElementById('dorouteButton').style.display = 'block';
  else
    document.getElementById('dorouteButton').style.display = 'none';
  if (document.getElementById('doQueryPistesButton').style.display == 'none')
    document.getElementById('doQueryPistesButton').style.display = 'block';
  else
    document.getElementById('doQueryPistesButton').style.display = 'none';
  if (document.getElementById('listViewportButton').style.display == 'none')
    document.getElementById('listViewportButton').style.display = 'block';
  else
    document.getElementById('listViewportButton').style.display = 'none';
    
    
    
}

var closeContent = function() {
  if(!QUERYMODE && !ROUTEMODE && !NOTEMODE) {
    closecontent();
  }
}

function closecontent() {
    document.getElementById('content-outer').style.display = "none";
    document.getElementById('content').style.display = "none";
    if (ROUTEMODE || QUERYMODE || NOTEMODE) {
      document.getElementById('content-control-closed').style.display = "inline";
    } else {
      document.getElementById('content-control-closed').style.display = "none";      
    }
}

function showMapSettings() {
  var dd = document.getElementsByClassName('menuDropDownContent');
  var content = document.getElementById('mapSettingsDropDownContent');

  if (content.style.display == 'none') {
    for (var d = 0; d < dd.length; d++)
      dd[d].style.display = 'none';
    content.style.display = 'inline';
  } else
    content.style.display = 'none';
  return true;
}

function showLastEditsSettings() {
  var dd = document.getElementsByClassName('menuDropDownContent');
  var content = document.getElementById('lastEditsDropDownContent');

  if (content.style.display == 'none') {
    for (var d = 0; d < dd.length; d++)
      dd[d].style.display = 'none';
    content.style.display = 'inline';
  } else
    content.style.display = 'none';
  return true;

}

function showMapEditSettings() {
  
  var dd = document.getElementsByClassName('menuDropDownContent');
  var content = document.getElementById('mapEditDropDownContent');
  var link = content.getElementsByClassName('localizedIframe')[0];
  link.href='iframes/how-to-' + iframelocale + '.html';

  if (content.style.display == 'none') {
    for (var d = 0; d < dd.length; d++)
      dd[d].style.display = 'none';
    content.style.display = 'inline';
  } else
    content.style.display = 'none';
  return true;
}

function show_printSettings() {
  var c = ol.proj.fromLonLat(ol.proj.toLonLat(map.getView().getCenter(), 'EPSG:3857'), 'EPSG:4326');
  var hash = "#map="+map.getView().getZoom()+'/'+c[0]+'/'+c[1]+'&base='+BASELAYER;
    //~ var center = map.getCenter().transform(new OpenLayers.Projection('EPSG:900913'), new OpenLayers.Projection('EPSG:4326'));
    //~ //#map=4/6/42/0
    //~ var hash = "#map="+z+'/'+center.lon+'/'+center.lat+'&base='+BASELAYER;
    console.log(hash);
  window.open("print.html" + hash, "_blank", "height=480,width=685");
}

function showmenu() {
  hideexcept('menu');
  document.getElementById('menu').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '';
  document.getElementById('content-outer').scrollTop = 0;

}

function showlegend() {
  hideexcept('legend');
  document.getElementById('legend').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '&nbsp;' + _('MAP_KEY').replace('<br/>', ' ');
  document.getElementById('content-outer').scrollTop = 0;
}
function showsearch() {
  hideexcept('search');
  document.getElementById('search').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '&nbsp;' + _('Search_title');
  document.getElementById('content-outer').scrollTop = 0;
  //~ document.getElementById('search_input').focus();
}
function shownote() {
  hideexcept('note');
  document.getElementById('note').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '&nbsp;' + _('Note_title');
  document.getElementById('content-outer').scrollTop = 0;
  //~ document.getElementById('search_input').focus();
}

function showroute() {
  hideexcept('route');
  document.getElementById('route').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '&nbsp;' + _('routing_title');
  document.getElementById('content-outer').scrollTop = 0;
}

function showquery() {
  hideexcept('query');
  document.getElementById('query').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '&nbsp;' + _('Query_pistes_title');
  document.getElementById('content-outer').scrollTop = 0;
}

function showpisteList() {
  hideexcept('pisteList');
  document.getElementById('pisteList').style.display = 'inline';
  document.getElementById('content-outer').style.display = 'inline';
  document.getElementById('content').style.display = 'inline';
  document.getElementById('content-control').style.display = 'inline';
  document.getElementById('content_title').innerHTML = '&nbsp;' + _('List_pistes_title');
  document.getElementById('content-outer').scrollTop = 0;
}
function showabout() {
  hideexcept('about');
  var aboutDiv = document.getElementById('about');
  aboutDiv.style.display = 'inline';
  document.getElementById('content-outer').style.maxWidth = "80%";
  document.getElementById('content-outer').style.width = "80%";

  var XMLHttp = new XMLHttpRequest();
  url = server + 'iframes/about.' + iframelocale + '.html';
  XMLHttp.open("GET", url);
  XMLHttp.setRequestHeader("Content-type", "text/html; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
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

      document.getElementById('content_title').innerHTML = '&nbsp;' + _('ABOUT');
      document.getElementById('about').innerHTML = content;
      document.getElementById('about').style.display = 'inline';
      document.getElementById('content-outer').style.display = 'inline';
      document.getElementById('content').style.display = 'inline';
      document.getElementById('content-control').style.display = 'inline';
      document.getElementById('content-outer').scrollTop = 0;
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
  document.getElementById('languages').style.display = 'inline';

  var languageDiv = document.getElementById('languages');
  languageDiv.innerHTML = '';

  for (l = 0; l < locs.length; l++) {

    var flagdiv = document.getElementById('flagsLinksProto').cloneNode(true);
    while (flagdiv.firstChild) {
      flagdiv.removeChild(flagdiv.firstChild);
    } //clear previous list

    flagdiv.removeAttribute("id");
    flagdiv.setAttribute('loc', locs[l]);

    flagdiv.onclick = function() {
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
  PISTELISTMODE =true;
  document.getElementById('content-outer').style.maxWidth = "240px";
  if (div != 'menu') {
    document.getElementById('menu').style.display = 'none';
  }
  if (div != 'note') {
    document.getElementById('note').style.display = 'none';
  }
  if (div != 'search') {
    document.getElementById('search').style.display = 'none';
  }
  if (div != 'query') {
    document.getElementById('query').style.display = 'none';
  }
  if (div != 'route') {
    document.getElementById('route').style.display = 'none';
  }
  if (div != 'pisteList') {
    PISTELISTMODE =false;
    document.getElementById('pisteList').style.display = 'none';
  }
  if (div != 'legend') {
    document.getElementById('legend').style.display = 'none';
  }
  if (div != 'about') {
    document.getElementById('about').style.display = 'none';
  }
  if (div != 'languages') {
    document.getElementById('languages').style.display = 'none';
  }
}

//======================================================================
// LOCATION
function toggleLocation() {
  document.getElementById('location').style.backgroundColor = '#FDFDFD';
  if (LOC) {
    geoLoc.setTracking(false);
    LOC = false;
    document.getElementById('locationSwitchImg').src = 'pics/localisation_thin.svg';
    document.getElementById('locationSwitchImg').classList.remove("blink-image");
  } else {
    LOC = true;
    geoLoc = null;
    
    geoLoc = new ol.Geolocation({
      tracking: true,
      // enableHighAccuracy must be set to true to have the heading value.
      trackingOptions: {
        enableHighAccuracy: true,
      },
      projection: map.getView().getProjection(),
    });
    document.getElementById('locationSwitchImg').src = "pics/snake_transparent.gif";

    geoLoc.on('change', function() {      
      map.getView().setCenter(geoLoc.getPosition());
      if (map.getView().getZoom() < 12) {
        map.getView().setZoom(12);
      }
      LOC = true;
      document.getElementById('locationSwitchImg').src = 'pics/localisation_blue_thin.svg';
      document.getElementById('locationSwitchImg').classList.add("blink-image");
    });
    geoLoc.on('error', function(error) {
      document.getElementById('locationSwitchImg').src = 'pics/localisation_red_thin.svg';
      alert(error.message);
      LOC = false;
      document.getElementById('locationSwitchImg').classList.remove("blink-image");
    });
  }
}

//======================================================================
// INIT
document.onkeydown = checkKey;
document.onkeypress = stopRKey;

// register 'enter' and 'esc' keyboard hit
function checkKey(e) {
  var keynum;
  if (window.event) {
    keynum = window.event.keyCode;
  } //IE
  else if (e) {
    keynum = e.which;
    if (keynum === undefined) {
      e.preventDefault();
      keynum = e.keyCode;
    }
  }
  if (keynum == 13) {
    // fires nominatim search
    SearchByName(document.search.nom_search.value);
  }
}

function stopRKey(evt) {
  // disable the enter key action in a form.
  evt = (evt) ? evt : ((event) ? event : null);
  var node = (evt.target) ? evt.target : ((evt.srcElement) ? evt.srcElement : null);
  if ((evt.keyCode == 13) && (node.type == "text")) {
    return false;
  }
}

function get_stats() {
  var XMLHttp = new XMLHttpRequest();
  XMLHttp.open("GET", server + 'data/stats.json');
  XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {
      if (XMLHttp.responseText != "") {
        var lengthes = JSON.parse(XMLHttp.responseText);
        for (k = 0; k < Object.keys(lengthes).length; k++) {
          data[Object.keys(lengthes)[k]] = lengthes[Object.keys(lengthes)[k]];
        }

        fillData('menu');
      }
    }
  };
  XMLHttp.send();
  return true;

}

function page_init() {
  document.addEventListener('DOMContentLoaded', function() {
    var button = document.querySelector(".fastclick");
    new FastClick(document.body);

  });

  initFlags();
  get_stats();
  document.getElementById('dailyVector').style.backgroundColor = '#FFF';
  document.getElementById('weekVector').style.backgroundColor = '#FFF';
  document.getElementById('noVector').style.backgroundColor = '#DDD';

  document.getElementById('menuButton').onclick = function() {
    showmenu();
  };
  document.getElementById('location').onclick = function() {
    closecontent();
    toggleLocation();
  };
  document.getElementById('searchButtonHeader').onclick = function() {
    showsearch();
  };

  document.getElementById('reduceButton').onclick = function() {
    closecontent();
  };
  document.getElementById('doSearch').onclick = function() {
    SearchByName(document.search.nom_search.value);
  };
  document.getElementById('doClearSearch').onclick = function() {
    clearResultList();
  };
  document.getElementById('listViewportButton').onclick = function() {
    getTopoByViewport();
  };
  document.getElementById('dolistViewport').onclick = function() {
    getTopoByViewport();
  };
  document.getElementById('doQueryPistes').onclick = function() {
    if (QUERYMODE) {switchDrawMode('');}
    else {switchDrawMode('QUERYMODE');}
  };
  document.getElementById('doQueryPistesButton').onclick = function() {
    if (QUERYMODE) {switchDrawMode('');}
    else {switchDrawMode('QUERYMODE');}
  };
  document.getElementById('doRouteButton').onclick = function() {
    if (ROUTEMODE) {switchDrawMode('');}
    else {switchDrawMode('ROUTEMODE');}
  };
  document.getElementById('doRoute').onclick = function() {
    if (ROUTEMODE) {switchDrawMode('');}
    else {switchDrawMode('ROUTEMODE');}
  };
  //~ document.getElementById('mobileswitch').onclick = function() {
    //~ document.cookie = 'version=mobile';
  //~ };
  //~ document.getElementById('desktopswitch').onclick = function() {
    //~ document.cookie = 'version=desktop';
    //~ url=window.location.href.replace('mobile', 'index');
    //~ window.open(server+'index.html');
  //~ };

  document.getElementById('shareLinkButton').onclick = function() {
    document.getElementById('copyLink').style.display='inline';
    document.getElementById('linkText').value = window.location.href;
  };
  document.getElementById('setMarker').onclick = function() {
    MARKER = !MARKER;
    setMarker();
  };
  document.getElementById('printMenuButton').onclick = function() {
    show_printSettings();
  };
  document.getElementById('langs').onclick = function() {
    show_languages();
  };

  var dd = document.getElementsByClassName('menuDropDownContent');
  for (var d = 0; d < dd.length; d++)
    dd[d].style.display = 'none';

  document.getElementById('mapSettingsDropDown').onclick = function() {
    showMapSettings();
  };
  document.getElementById('lastEditsDropDown').onclick = function() {
    showLastEditsSettings();
  };
  document.getElementById('mapEditDropDown').onclick = function() {
    showMapEditSettings();
  };
  document.getElementById('OSMBaseLAyer').onclick = function() {
    BASELAYER = 'osm';
    setBaseLayer();
  };
  document.getElementById('SnowBaseLAyer').onclick = function() {
    BASELAYER = 'snowmap';
    setBaseLayer();
  };
  document.getElementById('high_dpi').onclick = function() {
    setHighDpi();
    setBaseLayer();
  };
  document.getElementById('viewSwitch').onclick = function() {
    setHighDpi();
    setBaseLayer();
  };

  document.getElementById('dailyVector').onclick = function() {
    show_live_edits('daily');
    document.getElementById('dailyVector').style.backgroundColor = '#DDD';
    document.getElementById('weekVector').style.backgroundColor = '#FFF';
    document.getElementById('noVector').style.backgroundColor = '#FFF';
  };
  document.getElementById('weekVector').onclick = function() {
    show_live_edits('weekly');
    document.getElementById('dailyVector').style.backgroundColor = '#FFF';
    document.getElementById('weekVector').style.backgroundColor = '#DDD';
    document.getElementById('noVector').style.backgroundColor = '#FFF';
  };
  document.getElementById('noVector').onclick = function() {
    show_live_edits('none');
    document.getElementById('dailyVector').style.backgroundColor = '#FFF';
    document.getElementById('weekVector').style.backgroundColor = '#FFF';
    document.getElementById('noVector').style.backgroundColor = '#DDD';
  };

  document.getElementById('changesButton').onclick = function() {
    window.open('https://www.opensnowmap.org/qa/Pistes_changes/web/');
  };
  document.getElementById('searchMenuButton').onclick = function() {
    showsearch();
  };
  document.getElementById('routingMenuButton').onclick = function() {
    showroute();
    if (!ROUTEMODE) {switchDrawMode('ROUTEMODE');}
  };
  document.getElementById('queryMenuButton').onclick = function() {
    showquery();
    if (!QUERYMODE) {switchDrawMode('QUERYMODE');}
  };
  document.getElementById('addNoteMenuButton').onclick = function() {
    shownote();
    if (!NOTEMODE) {switchDrawMode('NOTEMODE');}
  };
  document.getElementById('notesExternalLink').onclick = function() {
    var url = "https://ent8r.github.io/NotesReview/?view=map&map=2%2F18.3128%2F-0.1758&query=opensnowmap"
    window.open(url);
  };
  document.getElementById('content-control-closed').onclick = function() {
    if (QUERYMODE) {showquery();}
    if (ROUTEMODE) {showroute();}
    if (NOTEMODE) {shownote();}
  };
  document.getElementById('pisteListMenuButton').onclick = function() {
    showpisteList();
    getTopoByViewport();
  };
  document.getElementById('legendButton').onclick = function() {
    showlegend();
  };
  document.getElementById('blogButton').onclick = function() {
    window.open('https://blog.opensnowmap.org');
  };
  document.getElementById('dataButton').onclick = function() {
    window.open('iframes/data.html');
  };
  document.getElementById('aboutButton').onclick = function() {
    showabout();
  };
  document.getElementById('donateButton').onclick = function() {
    window.open('iframes/donate.html');
  };
  document.getElementById('legacyButton').onclick = function() {
    window.open('https://www.opensnowmap.org/legacy.html');
  };
  document.getElementById('EditVespucci').onclick = function() {
  var c = ol.proj.fromLonLat(ol.proj.toLonLat(map.getView().getCenter(), 'EPSG:3857'), 'EPSG:4326');
  var url = "geo:"+c[1]+","+c[0]
    window.open(url);
  };
  document.getElementById('EditId').onclick = function() {
  var c = ol.proj.fromLonLat(ol.proj.toLonLat(map.getView().getCenter(), 'EPSG:3857'), 'EPSG:4326');
  var url = "https://www.openstreetmap.org/edit?zoom="+map.getView().getZoom()+"&amp;lat="+c[1]+"&amp;lon="+c[0]+"&amp;layers=BTT&amp;editor=id"
    window.open(url);
  };
  document.getElementById('EditJOSM').onclick = function() {
    josmRemote();
  };
  document.getElementById('EditOffset').onclick = function() {
  var c = ol.proj.fromLonLat(ol.proj.toLonLat(map.getView().getCenter(), 'EPSG:3857'), 'EPSG:4326');
  var hash = "#map="+map.getView().getZoom()+'/'+c[0]+'/'+c[1];
  window.open("http://www.opensnowmap.org/offseter/index.html" + hash, "_blank");
  };
  
  // Control elements for routing
  // Overlay controls
  document.getElementById('close_popup').onclick = function() {
    getOverlayByName("deletePoint").setPosition(undefined);
  };
  document.getElementById('delete_all').onclick = function() {
    RouteClear();
  }
  document.getElementById('delete_point').onclick = function() {
    var id= getOverlayByName("deletePoint").getProperties().pointID; 
    RouteRemovePointById(id);
    getOverlayByName("deletePoint").setPosition(undefined);
  };
  
  translateDiv('body');
}

//======================================================================
// NOMINATIM
function setCenterMap(nlon, nlat, zoom) {
  //~ nlonLat = new OpenLayers.LonLat(nlon, nlat).transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
  //~ map.setCenter(nlonLat, zoom);
  var c = ol.proj.fromLonLat(ol.proj.toLonLat([nlon,nlat], 'EPSG:4326'), 'EPSG:3857')
  map.getView().setCenter(c);
  map.getView().setZoom(zoom);
}

function zoomToElement(osm_id, type) {
  //type is either 'pistes' or 'sites'
  var element = null;
  for (p = 0; p < jsonPisteList[type].length; p++) {
    var ids = jsonPisteList[type][p].ids.join('_').toString();
    if (ids == osm_id) {
      element = jsonPisteList[type][p];
      break;
    }
  }
  if (!element) {
    return false;
  }

  var bbox = element.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
  var bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
  var newExtent;
  newExtent = ol.extent.applyTransform(bounds, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'), undefined);
  map.getView().fit(newExtent);
}

function highlightElement(osm_id, type) {

  //type is either 'pistes' or 'sites'
  var element = null;
  for (p = 0; p < jsonPisteList[type].length; p++) {
    var ids = jsonPisteList[type][p].ids.join('_').toString();
    if (ids == osm_id) {
      element = jsonPisteList[type][p];
      break;
    }
  }
  if (!element) {
    return false;
  }

  var bbox = element.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
  var bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
  var newExtent;
  newExtent = ol.extent.applyTransform(bounds, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'), undefined);
  map.getView().fit(newExtent);

}

function highlightParentSite(osm_id, r) {

  var piste = null;
  for (p = 0; p < jsonPisteList.pistes.length; p++) {
    var ids = jsonPisteList.pistes[p].ids.join('_').toString();
    if (ids == osm_id) {
      piste = jsonPisteList.pistes[p];
      break;
    }
  }
  if (!piste) {
    return false;
  }

  var parent = piste.in_sites[r];

  if (!parent) {
    return false;
  }

  var bbox = parent.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
  var bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
  var newExtent;
  newExtent = ol.extent.applyTransform(bounds, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'), undefined);
  map.getView().fit(newExtent);

}

function highlightParentRoute(osm_id, r) {

  var piste = null;
  for (p = 0; p < jsonPisteList.pistes.length; p++) {
    var ids = jsonPisteList.pistes[p].ids.join('_').toString();
    if (ids == osm_id) {
      piste = jsonPisteList.pistes[p];
      break;
    }
  }
  if (!piste) {
    return false;
  }

  var parent = piste.in_routes[r];

  if (!parent) {
    return false;
  }

  var bbox = parent.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
  var bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
  var newExtent;
  newExtent = ol.extent.applyTransform(bounds, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'), undefined);
  map.getView().fit(newExtent);

}

function zoomToParentSite(osm_id, r) {
  var piste = null;
  for (p = 0; p < jsonPisteList.pistes.length; p++) {
    var ids = jsonPisteList.pistes[p].ids.join('_').toString();
    if (ids == osm_id) {
      piste = jsonPisteList.pistes[p];
      break;
    }
  }
  if (!piste) {
    return false;
  }

  var parent = piste.in_sites[r];

  if (!parent) {
    return false;
  }

  var bbox = parent.bbox.replace('BOX', '').replace('(', '').replace(')', '').replace(' ', ',').replace(' ', ',').split(',');
  var bounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
  var newExtent;
  newExtent = ol.extent.applyTransform(bounds, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'), undefined);
  map.getView().fit(newExtent);


}

function showPisteProfile(osm_id, type, div, color) {
  //if (mode == "raster") {infoMode();}
  var parent;
  var alreadyShown = div.getElementsByClassName('profilePic');
  if (alreadyShown.length > 0) { // hide existing profile and exit
    while (alreadyShown.length > 0) {
      parent = alreadyShown[alreadyShown.length - 1].parentNode;
      parent.removeChild(alreadyShown[alreadyShown.length - 1]);
    }
    return true;
  }
  var pics = document.getElementsByClassName('profilePic');
  while (pics.length > 0) { // hide any existing profiles in the list
    parent = pics[pics.length - 1].parentNode;
    parent.removeChild(pics[pics.length - 1]);
  }

  var waiter = document.getElementById('waiterProto').cloneNode(true);
  div.appendChild(waiter);
  waiter.className = waiter.className.replace('hidden', 'shown');

  //type is either 'pistes' or 'sites'
  var element = null;
  for (p = 0; p < jsonPisteList[type].length; p++) {
    var ids = jsonPisteList[type][p].ids.join('_').toString();
    if (ids == osm_id) {
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

  XMLHttp.open("POST", server + "demrequest?size=small&color=" + color);
  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {

      var profileDiv = div;
      while (profileDiv.firstChild) {
        profileDiv.removeChild(profileDiv.firstChild);
      } //clear previous list
      waiter.className = waiter.className.replace('shown', 'hidden');

      cleardiv = document.getElementById('clearProto').cloneNode(true);
      cleardiv.removeAttribute("id");

      var l = document.createElement('span');
      l.innerHTML = parseFloat(routeLength).toFixed(1) + '&nbsp;km';

      var img = document.createElement('img');
      img.src = server + 'tmp/' + XMLHttp.responseText + '-3d.png';
      var img2 = document.createElement('img');
      img2.src = server + 'tmp/' + XMLHttp.responseText + '-2d.png';
      var img3 = document.createElement('img');
      img3.src = server + 'tmp/' + XMLHttp.responseText + '-ele.png';

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
function showRouteProfile(wkt, div, color) {
  var parent;
  var alreadyShown = div.getElementsByClassName('imgSlider');
  if (alreadyShown.length > 0) { // hide existing profile and exit
    while (alreadyShown.length > 0) {
      parent = alreadyShown[alreadyShown.length - 1].parentNode;
      parent.removeChild(alreadyShown[alreadyShown.length - 1]);
    }
    return true;
  }

  var waiter = document.getElementById('waiterProto').cloneNode(true);
  div.appendChild(waiter);
  waiter.className = waiter.className.replace('hidden', 'shown');
  
  // request the elevation profile
  var XMLHttp = new XMLHttpRequest();

  //GetProfileXHR.push(XMLHttp); // keep the request to allow aborting

  XMLHttp.open("POST", server + "demrequest?size=small&color=" + color);
  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {

      var profileDiv = div;
      while (profileDiv.firstChild) {
        profileDiv.removeChild(profileDiv.firstChild);
      } //clear previous list
      waiter.className = waiter.className.replace('shown', 'hidden');

      cleardiv = document.getElementById('clearProto').cloneNode(true);
      cleardiv.removeAttribute("id");
      
      slider = document.getElementById('imgSliderProto').cloneNode(true);
      profileDiv.appendChild(cleardiv);
      profileDiv.appendChild(slider);
      
      var img = document.getElementById('elePic');
      img.src = server + 'tmp/' + XMLHttp.responseText + '-ele.png';
      var img2 = document.getElementById('2dPic');
      img2.src = server + 'tmp/' + XMLHttp.responseText + '-2d.png';
      var img3 = document.getElementById('3dPic');
      img3.src = server + 'tmp/' + XMLHttp.responseText + '-3d.png';
      
    }
  };
  XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  //XMLHttp.setRequestHeader("Content-length", wktroute.length);
  //XMLHttp.setRequestHeader("Connection", "close");

  XMLHttp.send(wkt);
  return true;
}
function getMembersById(id) {
  if (QUERYMODE) {
    document.getElementById("queryWaiterResults").style.display = 'inline';
  } else if (PISTELISTMODE) {
    document.getElementById("listWaiterResults").style.display = 'inline';
  } else {
    document.getElementById("searchWaiterResults").style.display = 'inline';
  }

  var list = document.getElementsByClassName('nominatimLi')[0];
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  } //clear previous list
  document.getElementById('piste_search_results').innerHTML = '';

  var q = server + "request?geo=true&list=true&sort_alpha=true&group=true&members=" + id;
  var XMLHttp = new XMLHttpRequest();
  XMLHttp.open("GET", q);
  XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {
      var resp = XMLHttp.responseText;
      jsonPisteList = JSON.parse(resp);
      document.getElementById("searchWaiterResults").style.display = 'none';
      if (QUERYMODE) {
        document.getElementById("queryWaiterResults").style.display = 'none';
        showHTMLPistesList(document.getElementById('query_results'));
      } else if (PISTELISTMODE) {
        document.getElementById("listWaiterResults").style.display = 'none';
        showHTMLPistesList(document.getElementById('pisteList_results'));
      } else {
        document.getElementById("searchWaiterResults").style.display = 'none';
        showHTMLPistesList(document.getElementById('piste_search_results'));
      }
    }
  };
  XMLHttp.send();
}

function getTopoByViewport() { //DONE in pisteList
  document.getElementById("listWaiterResults").style.display = 'inline';


  var list = document.getElementsByClassName('nominatimLi')[0];
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  } //clear previous list
  document.getElementById('piste_search_results').innerHTML = '';



  var bb = ol.extent.applyTransform(map.getView().calculateExtent(), ol.proj.getTransform('EPSG:3857', 'EPSG:4326'), undefined);
  var q = server + "request?group=true&geo=true&list=true&sort_alpha=true&bbox=" + bb[0] + ',' + bb[1] + ',' + bb[2] + ',' + bb[3];
  var XMLHttp = new XMLHttpRequest();

  //PisteAPIXHR.push(XMLHttp);

  XMLHttp.open("GET", q);
  XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {
      document.getElementById("listWaiterResults").style.display = 'none';
      var resp = XMLHttp.responseText;
      jsonPisteList = JSON.parse(resp);
      showHTMLPistesList(document.getElementById('pisteList_results'));
    }
  };
  XMLHttp.send();
  return true;
}
function getRouteTopoByWaysId(ids, lengths, routeLength, routeWKT) {
    //close_sideBar();
    document.getElementById("routeWaiterResults").style.display = 'inline';
    abortXHR('PisteAPI'); // abort another request if any

    var q = server + "request?geo=true&topo=true&ids_ways=" + ids;
    var XMLHttp = new XMLHttpRequest();

    PisteAPIXHR.push(XMLHttp);

    XMLHttp.open("GET", q);
    XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

    XMLHttp.onreadystatechange = function () {
        if (XMLHttp.readyState == 4) {
            document.getElementById("routeWaiterResults").style.display = 'none';
            var resp = XMLHttp.responseText;
            jsonPisteList = JSON.parse(resp);
            RouteInjectLenghts(lengths);
            showHTMLRoute(document.getElementById('route_results'), routeLength, routeWKT)
        }
    };
    XMLHttp.send();
    return true;
}
function RouteInjectLenghts(lengths) {
  d=0.0;
  if (jsonPisteList.pistes !== null) {
    for (p = 0; p < jsonPisteList.pistes.length; p++) {
      jsonPisteList.pistes[p]["distance"]=d;
      
      //~ Remove duplicated ids in topo json:
      pisteIds = jsonPisteList.pistes[p].ids;
      uniqueArray = pisteIds.filter(function(item, pos) {
          return pisteIds.indexOf(item) == pos;
      })
      for (i = 0; i < uniqueArray.length; i ++) {
          //~ pistes are concatenated in jsonPisteList, we need
          //~ to progress in the lengths array accordingly
          d+=parseFloat(lengths[uniqueArray[i]])
        }
    }
  }
}
function getTopoById(ids) { //DONE in pisteList
  document.getElementById("queryWaiterResults").style.display = 'inline';


  var list = document.getElementsByClassName('nominatimLi')[0];
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  } //clear previous list
  document.getElementById('piste_search_results').innerHTML = '';

  var q = server + "request?geo=true&topo=true&ids=" + ids;
  var XMLHttp = new XMLHttpRequest();

  //PisteAPIXHR.push(XMLHttp);

  XMLHttp.open("GET", q);
  XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {
      var resp = XMLHttp.responseText;
      jsonPisteList = JSON.parse(resp);
      document.getElementById("queryWaiterResults").style.display = 'none';
      if (QUERYMODE) {
        showHTMLPistesList(document.getElementById('query_results'));
      } else if (PISTELISTMODE) {
        showHTMLPistesList(document.getElementById('pisteList_results'));
      } else {
        showHTMLPistesList(document.getElementById('piste_search_results'));
      }
    }
  };
  XMLHttp.send();
  return true;
}

var PisteAPIXHR =[];
function setMarker(){
  if (MARKER) {
    window.location.hash.replace('m=false', 'm=true');
    window.location.replace(window.location.href.replace('m=false', 'm=true'));
    
    var iconFeature = new ol.Feature({
    geometry: new ol.geom.Point(map.getView().getCenter()),
    name: 'Marker'
    });
    
    var iconStyle = new ol.style.Style({
    image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
      anchor: [0.5, 46],
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      opacity: 0.75,
      src: 'pics/marker.png'
    }))
    });
    
    iconFeature.setStyle(iconStyle);
    
    var vectorSource = new ol.source.Vector({
    features: [iconFeature]
    });
    
    var markerLayer = new ol.layer.Vector({
    source: vectorSource,
    name: 'Marker'
    });
    
    map.addLayer(markerLayer);
  } else {
    window.location.hash.replace('m=true', 'm=false');
    window.location.replace(window.location.href.replace('m=true', 'm=false'));
    if (getLayerByName('Marker')) {
      getLayerByName('Marker').getSource().clear();
      map.removeLayer(getLayerByName('Marker'));
    }
  }
  
}

/* Styling route waypoints */
function RoutePointStyle() {
  var s = new ol.style.Style({
                image: new ol.style.Circle({
                    stroke: new ol.style.Stroke({
                        color: 'black',
                        width: 2
                        }),
                    fill: new ol.style.Fill({
                        color: 'rgba(200, 200, 255, 0.5)'
                        }),
                    radius: 8,
                    })
                });
  return s;
}
function RouteEndPointStyle() {
  var s = new ol.style.Style({
                
                image: new ol.style.Icon({
                    anchor: [0.5, 16+8],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    src: 'pics/route_goal.svg',
                    })
                });
  return s;
}
function RouteBadPointStyle() {
  var s = new ol.style.Style({
                
                image: new ol.style.Icon({
                    anchor: [0.5,0.5],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    src: 'pics/no_route.svg',
                    })
                });
  return s;
}
function RouteReStyle(){
  // re-Style all point from their properties, small flag at the end
  var max=0;
  var features = routeSourcePoints.getFeatures();
  if (features != null && features.length > 1) {
    for (f in features) {
      if (features[f].getProperties().id >max &&
      features[f].getProperties().routable) {
         max = features[f].getProperties().id
         };
    }
  }
  //~ console.log("max point id "+ max);
  routeSourcePoints.forEachFeature( function(f) {
    if (f.getProperties().type == "wayPoint" 
        && f.getProperties().routable){
     if (f.getProperties().id == max) {
       f.setStyle(RouteEndPointStyle()); // last point with flag
       }
     else {
       f.setStyle(RoutePointStyle()); // route point
       }
     }
     else {
       f.setStyle(RouteBadPointStyle()); // non-routable point
     }
   });
}

/* Routing interaction */
function RouteStopDown(evt) {
  /* 
   * return false; 
   * => don't propagate down event to allow feature dragging
   * return true; 
   * => propagate down event to allow map pan if no feature 
  *  is under the down event
  */
  return RouteInteractionStopDownEvent;
}
function RouteOnDown(evt) {
  RouteInteractionDragOrigin_=evt.pixel;
  //~ console.log('tapped !', RouteInteractionDragOrigin_);
  // record feature under mouse if any to be able to drag it
  var feature = map.forEachFeatureAtPixel(
            evt.pixel,
            function (feature) {
              return feature;
            },
            {hitTolerance: 40}
          );
  if (feature) {
    if (feature.getProperties().type == "wayPoint") {
      // Display popup near the waypoint
      // store the origin coordinate for dragging the waypoint
      RouteInteractionStopDownEvent = true;
      RouteInteractionDraggableFeature_ = feature;
      RouteInteractionDragCoordinate_=evt.coordinate;
      getOverlayByName("deletePoint").set('pointID',feature.getProperties().id);
      getOverlayByName("deletePoint").setPosition(evt.coordinate);
      return true;
    } else if (feature.getProperties().type == "routeSegment") {
      // Split the route segment and add a new waypoint
      RouteInteractionStopDownEvent = true;
      var id = feature.getProperties().id;
      RouteInteractionInserting_ = true;
      point = RouteInsertPointAt(feature, evt.coordinate);
      RouteSnap(point);
      getOverlayByName("deletePoint").set('pointID',point.getProperties().id);
      getOverlayByName("deletePoint").setPosition(evt.coordinate);
    } else {
      // Do nothing, allow map pan
      RouteInteractionStopDownEvent = false;
      RouteInteractionDraggableFeature_ = null;
      RouteInteractionDragCoordinate_=[0,0];
    }
  }
  else {
    // Do nothing, allow map pan
    RouteInteractionStopDownEvent = false;
    RouteInteractionDraggableFeature_ = null;
    RouteInteractionDragCoordinate_=[0,0];
  }
  return true;
}
function RouteOnDrag(evt) {
  // move the feature from the position recorded at handleDownEvent
  //~ console.log('dragged !');
  var deltaX = evt.coordinate[0] - RouteInteractionDragCoordinate_[0];
  var deltaY = evt.coordinate[1] - RouteInteractionDragCoordinate_[1];
  if (RouteInteractionDraggableFeature_) {
    var geometry = RouteInteractionDraggableFeature_.getGeometry();
    geometry.translate(deltaX, deltaY);
  }
  else {
    RouteInteractionPanning_ = true;
  }
  RouteInteractionDragCoordinate_[0] = evt.coordinate[0];
  RouteInteractionDragCoordinate_[1] = evt.coordinate[1];
  //~ console.log(deltaX, deltaY, RouteInteractionPanning_);
}
function RouteOnMove(evt) {
  //~ console.log('moved !');
}
function RouteOnUp(evt) {
  
  var deltaPxX = RouteInteractionDragOrigin_[0]-evt.pixel[0];
  var deltaPxY = RouteInteractionDragOrigin_[1]-evt.pixel[1];
  // Allow slight pan when tapping to add a point
  if (Math.abs(deltaPxX) + Math.abs(deltaPxY) < 10) {RouteInteractionPanning_=false;}
  //~ console.log('upped ! at ', deltaPxX, deltaPxY , RouteInteractionPanning_);
  
  // Disable draggable feature
  RouteInteractionDraggableFeature_ = null; 
  RouteInteractionDragCoordinate_=[0,0];
  
  /* if a feature is under the mouse, after a drag or insert, 
   * re-calculate a new route
   * */
  var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });
  if (feature) {
    if(feature.getProperties().type == "wayPoint") {
      feature.setProperties({'isSnapped': false, 'routable': true});
      RouteReStyle();
      RouteSnap(feature); 
      return false;
    }
    return false;
  }
  if (RouteInteractionInserting_ || RouteInteractionPanning_) { //reset flags
    RouteInteractionInserting_ = false;
    RouteInteractionPanning_ = false;
    return false;
  }

  /* if no feature is under the mouse, then add a new waypoint, 
   * re-calculate a new route
   * */
  pointID += 1;
  var feature = new ol.Feature({
    geometry: new ol.geom.Point(evt.coordinate),
    type: "wayPoint",
    id: pointID,
    isSnapped: false,
    routable: true, // hope so
  });
  routePointsfeatures.push(feature);
  getOverlayByName("deletePoint").set('pointID',feature.getProperties().id);
  getOverlayByName("deletePoint").setPosition(evt.coordinate);
  RouteReStyle();
  RouteSnap(feature);
  
  return false;
}

function requestRoute(thisPoint) {
  routeLinesfeatures.clear();
  var lineID = 0;
  var points=routeSourcePoints.getFeatures();
  
  var routingPointsNumber =0;
  for (f in routeSourcePoints.getFeatures()) {
    var point = routeSourcePoints.getFeatures()[f];
    if (point.getProperties().isSnapped && point.getProperties().routable)
     routingPointsNumber+=1;
  }
  if (routingPointsNumber <= 1) {return true;}
  
  var lls={};
  var lonlats=[];
  
   pointids = "";
  // Create an array with routing points coords, then build the query
  for (f in points) {
      if (points[f].getProperties().type == "wayPoint" &&
      points[f].getProperties().routable &&
      points[f].getProperties().isSnapped)
      {
        var coords = points[f].getGeometry().getCoordinates();
        var wgs84= ol.proj.toLonLat(coords,'EPSG:3857');
        lls[points[f].getProperties().id]=[wgs84[0],wgs84[1]];
        
        var lonlat={};
        lonlat['lon']=lls[points[f].getProperties().id][0];
        lonlat['lat']=lls[points[f].getProperties().id][1];
        lonlats.push(lonlat);
        pointids += points[f].getProperties().id+", ";
      }
  }
  //~ console.log("routing "+pointids);
  //~ if (thisPoint) {console.log("   after"+thisPoint.getProperties().id);}
  
  //~ var query = 'http://0.0.0.0:5105/route/ski/'; // to test locally
  var query =server+'routing?ski/'
  for (pt in lonlats) {
    query = query + lonlats[pt].lon + ',' +lonlats[pt].lat + ';';
  };
  query = query.slice(0, -1);
  //query += '?overview=full&annotations=false&steps=true&alternatives=true';
  ROUTING = true;
  fetch(query, {
                method: 'get',
                 })
  .then(function(response) {
    ROUTING = false;
    if (!response.ok) {
      throw new Error("HTTP error, status = " + response.status);
    }
    return response.json();
  })
  .then(function(data) {
    //const parser = new DOMParser();
    //const responseXML = parser.parseFromString(data, "application/xml");
    if(!data['routes']) {
      console.log("Routing failed, no route.");
      throw new Error("Routing failed, no route.");
    }
    if (data['routes'][0]!=null) {
        /*Check if waypoints close enough, no need to show a route 8km away*/
        var wps = data['waypoints'];
        for (var k=0; k < wps.length; k++) {
          if(wps[k]['distance'] > 500){
            console.log("Routing failed, waypoints too far away.");
            throw new Error("Routing failed, waypoints too far away.");
          }
        }
        /*parse resulting route*/
        var routePol = data['routes'][0]['geometry'];
            var encPol = new ol.format.Polyline();
            var wkt = new ol.format.WKT();
            var feature = encPol.readFeature(routePol);
            var routeWKT =  wkt.writeFeature(feature, {
              projection: 'EPSG:4326'
            });
            
        var routeLength = data['routes'][0]['distance'];
        var routeIds=[];
        for (var j = 0 ; j < data['routes'][0]['legs'].length; j++)
        {
          for (var i = 0 ; i < data['routes'][0]['legs'][j]['steps'].length; i++)
          {
            routeIds.push(data['routes'][0]['legs'][j]['steps'][i]['name']);
          }
        }
        var lengths={}; // this should be handled properly by the topo request call
        for (var j = 0 ; j < data['routes'][0]['legs'].length; j++)
        {
          for (var i = 0 ; i < data['routes'][0]['legs'][j]['steps'].length; i++)
          {
            if (lengths[data['routes'][0]['legs'][j]['steps'][i]['way_osm_id']]) {
              lengths[data['routes'][0]['legs'][j]['steps'][i]['way_osm_id']] += data['routes'][0]['legs'][j]['steps'][i]['distance'];
            } else {
              lengths[data['routes'][0]['legs'][j]['steps'][i]['way_osm_id']] = data['routes'][0]['legs'][j]['steps'][i]['distance'];
            }
          }
        }
        console.log(routeIds);
        // show profile
        getRouteTopoByWaysId(routeIds, lengths, routeLength, routeWKT);
        
        // show route
        var format = new ol.format.WKT();
        var route3857 = format.readFeature(routeWKT);
        var line;
        var segment;
        if (route3857.getGeometry().getType() == 'LineString') {
                line =route3857.getGeometry()
                line.transform('EPSG:4326', 'EPSG:3857');
                segment = new ol.Feature({geometry: line});
                segment.setProperties({'id': lineID, 'type': "routeSegment"});
                routeLinesfeatures.push(segment);
                lineID += 1;
        }
        else {
          for (i=0 ; i < route3857.getGeometry().getLineStrings().length; i++) 
                {
                  line =route3857.getGeometry().getLineStrings()[i]
                  line.transform('EPSG:4326', 'EPSG:3857');
                  segment = new ol.Feature({geometry: line});
                  segment.setProperties({'id': lineID, 'type': "routeSegment"});
                  routeLinesfeatures.push(segment);
                  lineID += 1;
              }
          }
      return true;
    }
    else {
      // onRouteFail(); maybe one day we'll do better than a 500 error
      console.log("Routing failed, empty route.");
      throw new Error("Routing failed, empty route.");
      return null;
    }
  })
  .catch(function(error) {
    /* re-route()*/
    console.log("routing failed.");
    thisPoint.setProperties({'routable': false});
    RouteReStyle();
    requestRoute();
    ROUTING = false;
  });
  return true;
}
function RouteClear(){
  if (getLayerByName('pointsLayer')) {
    getLayerByName('pointsLayer').getSource().clear();
    pointID = 0;
  }
  if (getLayerByName('linesLayer')) {
    getLayerByName('linesLayer').getSource().clear();
  }
  if (getOverlayByName('deletePoint')) {
    getOverlayByName('deletePoint').setPosition(undefined);
  }
  
    pointID = 0;
    lineID = 0;
    RouteReStyle();
}

function RouteInsertPointAt(line, coord) {
  // insert a routing point along a route
  //~ console.log("insert at" + line.getProperties().id);
  var idx = line.getProperties().id + 1;
  var pt = new ol.geom.Point(coord);
  var ptft = new ol.Feature(pt);
  pointID = pointID + 1;
  ptft.setProperties({'id': pointID, 'type': "wayPoint", 'isSnapped': false, 'routable': true});
  routePointsfeatures.insertAt(idx, ptft);
  var i = 0;
  //re-number features
  var features=routeSourcePoints.getFeatures();
  for (f in features) {
      features[f].setProperties({'id': i});
      i+=1;
  }
  i = 0;
  features=routeSourceLines.getFeatures();
  for (f in features) {
      features[f].setProperties({'id': i});
      i+=1;
  }
  // re-calculating route after waypoint insertion is handled onUp
  return ptft
}
function RouteRemovePointById(selectedpointID) {
  // Remove the selected point
  var features = routeSourcePoints.getFeatures();
  if (features != null && features.length > 0) {
    for (x in features) {
      var properties = features[x].getProperties();
      var id = properties.id;
      if (id == selectedpointID) {
        routeSourcePoints.removeFeature(features[x]);
        break;
      }
    }
  }
  if (getOverlayByName('deletePoint')) {
    getOverlayByName('deletePoint').setPosition(undefined);
  }
  var i = 0;
  //re-number features
  var features=routeSourcePoints.getFeatures();
  for (f in features) {
      features[f].setProperties({'id': i});
      i+=1;
  }
  i = 0;
  var lines=routeSourceLines.getFeatures();
  for (f in features) {
      if (lines[f]){
        lines[f].setProperties({'id': i});
        i+=1;
      }
  }
  RouteReStyle();
  // re-route on remaing points
  if (features != null && features.length > 1) {
    var lastPoint = features[features.length - 1];
    requestRoute(lastPoint);
  } else {
    getLayerByName('linesLayer').getSource().clear();
  }
  
}

function switchDrawMode(modeRequested) { 
  // Clear previous drawing layers and features by checking the active mode
  if (QUERYMODE) {
        pointID = 0;
        lineID = 0;
        // remove query mode features
        if (getLayerByName('pointsLayer')) {
          getLayerByName('pointsLayer').getSource().clear();
          map.removeLayer(getLayerByName('pointsLayer'));
          pointID = 0;
          map.removeInteraction(drawPoints);
          map.removeInteraction(modifyPoints);
        }
        QUERYMODE=false;
    } 
  // QUERYMODE feature cleared
  if (ROUTEMODE) {
        // remove route mode features
        pointID = 0;
        lineID = 0;
        if (getLayerByName('pointsLayer')) {
          getLayerByName('pointsLayer').getSource().clear();
          map.removeLayer(getLayerByName('pointsLayer'));
          map.removeInteraction(routeIteraction);
        }
        if (getLayerByName('linesLayer')) {
          getLayerByName('linesLayer').getSource().clear();
          map.removeLayer(getLayerByName('linesLayer'));
          lineID = 0;
          map.removeInteraction(routeIteraction);
        }
        if (getOverlayByName('deletePoint')) {
          document.getElementById('overlay_content').style.display='none';
          //map.removeOverlay(getOverlayByName('delete'));
        }
        ROUTEMODE=false;
    } 
  // ROUTEMODE feature cleared
  if (NOTEMODE) {
        pointID = 0;
        lineID = 0;
        // remove query mode features
        if (getLayerByName('pointsLayer')) {
          getLayerByName('pointsLayer').getSource().clear();
          map.removeLayer(getLayerByName('pointsLayer'));
          pointID = 0;
          map.removeInteraction(drawPoints);
          map.removeInteraction(modifyPoints);
        }  
        NOTEMODE=false;  
    } 
  // NOTEMODE feature cleared
  
  // Clear Mode feedback icons
      document.getElementById('routeSwitchImg').src = 'pics/route.svg';
      document.getElementById('routeSwitchImg').classList.remove("blink-image");
      document.getElementById('querySwitchImg').src = 'pics/query.svg';
      document.getElementById('querySwitchImg').classList.remove("blink-image");
      
      document.getElementById('routingButtonHeaderImg').src = 'pics/route.svg';
      document.getElementById('routingButtonHeaderImg').classList.remove("blink-image");
      document.getElementById('routingButtonHeader').style.display='none';
      
      document.getElementById('queryButtonHeaderImg').src = 'pics/query.svg';
      document.getElementById('queryButtonHeaderImg').classList.remove("blink-image");
      document.getElementById('queryButtonHeader').style.display='none';
      
      document.getElementById('noteButtonHeaderImg').src = 'pics/note.svg';
      document.getElementById('noteButtonHeaderImg').classList.remove("blink-image");
      document.getElementById('noteButtonHeader').style.display='none';
  
  // Re-create drawing layers and features for the requested mode
  if (modeRequested=='QUERYMODE') {
      QUERYMODE=true;
      ROUTEMODE=false;
      NOTEMODE=false;
      
      document.getElementById('querySwitchImg').src = 'pics/query_blue.svg';
      document.getElementById('querySwitchImg').classList.add("blink-image");
      document.getElementById('queryButtonHeaderImg').src = 'pics/query_blue.svg';
      document.getElementById('queryButtonHeaderImg').classList.add("blink-image");
      document.getElementById('queryButtonHeader').style.display='block';
      
      if (BASELAYER == 'osm' && HDPI) {
        // avoid this baselayer when draw interactions are there
        // still lacking user feedback
        BASELAYER = "snowmap";
        HDPI = true;
        setBaseLayer();
      }
      
      // Layer where the user add routing points
      var pointsLayer = new ol.layer.Vector({
        source: sourcePoints,
        name: 'pointsLayer',
        style:new ol.style.Style({
                  
                  image: new ol.style.Circle({
                      stroke: new ol.style.Stroke({
                          color: 'black',
                          width: 2
                          }),
                      fill: new ol.style.Fill({
                          color: 'rgba(200, 200, 255, 0.5)'
                          }),
                      radius: 8,
                      })
                  }),
      });
      map.addLayer(pointsLayer)

      //allow user to move points
      // modifyPoints after modifyLines for it to handle a point drag 
      // event instead of the later
      modifyPoints = new ol.interaction.Modify({
        features: Pointsfeatures,
        style : new ol.style.Style({
                  image: new ol.style.Circle({
                      stroke: new ol.style.Stroke({
                          color: 'black',
                          width: 2
                          }),
                      fill: new ol.style.Fill({
                          color: 'rgba(200, 200, 255, 0.5)'
                          }),
                      radius: 16
                      })
                  }),
        pixelTolerance: 40
      });
      map.addInteraction(modifyPoints);
      // snap and move the popup control when a point is moved
      modifyPoints.on('modifyend', function(event) {
        var coord = event.mapBrowserEvent.coordinate;
        map.forEachFeatureAtPixel(event.mapBrowserEvent.pixel, function(feature, layer) {
          
          feature.setProperties({
            'isSnapped': false,
            'routable': true,
          });
          RouteSnap(feature);
        });
      });

      //When adding a point, add an ID
      drawPoints = new ol.interaction.Draw({
        features: Pointsfeatures,
        type: /** @type {ol.geom.GeometryType} */ ('Point')
      });

      drawPoints.on('drawend', function(event) {
        //event.stopPropagation(); useless to avoid modifyend event
        pointID = pointID + 1;
        event.feature.setProperties({
          'id': pointID,
          'type': "queryPoint"
        });

        // remove previous points
        pointsLayer.getSource().forEachFeature(function(feature) {
          if (feature.id != pointID) {
            pointsLayer.getSource().removeFeature(feature);
          }
        });

        event.feature.setProperties({
          'isSnapped': false,
          'routable': true,
        }); // used to avoid snapping on modifyend
        RouteSnap(event.feature);
        var coord = event.feature.getGeometry().getCoordinates();

        /* sometimes a point was modifyed just after being drawn, to fix
         * Possible cause: request aborted, then onRouteFail()
         * Fixed in not sending routing call when one is running. 
         * Fix fail if route fail and another point is selected before 
         * routefail request finish*/
      });
      map.addInteraction(drawPoints);
      
      drawPoints.setActive(true)
      modifyPoints.setActive(true)
    }
  if (modeRequested=='ROUTEMODE') {
      QUERYMODE=false;
      ROUTEMODE=true;
      NOTEMODE=false;
      
      document.getElementById('routeSwitchImg').src = 'pics/route_blue.svg';
      document.getElementById('routeSwitchImg').classList.add("blink-image");
      document.getElementById('routingButtonHeaderImg').src = 'pics/route_blue.svg';
      document.getElementById('routingButtonHeaderImg').classList.add("blink-image");
      document.getElementById('routingButtonHeader').style.display='block';
      
      if (BASELAYER == 'osm' && HDPI) {
        // avoid this baselayer when draw interactions are there
        // still lacking user feedback
        BASELAYER = "snowmap";
        HDPI = true;
        setBaseLayer();
      }
      
      // Create popup control to modify points
      
      document.getElementById('overlay_content').style.display='block';
      var popup = new ol.Overlay({
        element: document.getElementById('overlay_content'),
        positioning: 'top-left',
        offset: [-20,-20],
      });
      popup.setPosition(undefined);
      popup.set('name', 'deletePoint');
      map.addOverlay(popup);

    // Layer where the app add calculated routes
      var linesLayer = new ol.layer.Vector({
        source: routeSourceLines, 
        name: 'linesLayer',
        style: new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: 'rgba(0, 0, 0, 0.7)',
                width: 3,
                lineCap: 'butt',
                lineDash: [8,6]
              }),
              fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.1)'
              }),
            image: new ol.style.Circle({
                stroke: new ol.style.Stroke({
                  color: 'black',
                  width: 2
                }),
                fill: new ol.style.Fill({
                  color: 'rgba(0, 0, 255, 0.5)'
                }),
              radius: 6
              })
            
            }),
      });
      map.addLayer(linesLayer);
      
      // Layer where the user add routing points, above lines for selection purpose
      var pointsLayer = new ol.layer.Vector({
        source: routeSourcePoints,
        name: 'pointsLayer',
        style : RoutePointStyle,
      });
      map.addLayer(pointsLayer)
      
      /*routeIteraction allows to :
      * - add waypoints
      * - drag existing waypoints
      * - select existing waypoints to display a popup allowing deletion
      * - split exiting route segments to add a waypoint
      * */
      RouteInteractionDragCoordinate_;
      RouteInteractionDraggableFeature_=false; 
      RouteInteractionInserting_=false;
      RouteInteractionPanning_=false;
      RouteInteractionStopDownEvent = false;
      
      routeIteraction = new ol.interaction.Pointer({
            layer: pointsLayer,
            handleDownEvent: RouteOnDown,
            handleDragEvent: RouteOnDrag,
            handleMoveEvent: RouteOnMove,
            handleUpEvent: RouteOnUp,
            stopDown: RouteStopDown,
            condition: function () {
              return this.getPointerCount() === 1
              },
          });
      map.addInteraction(routeIteraction);

      snapPoints = new ol.interaction.Snap({
        source: routeSourcePoints,
        pixelTolerance:20,
      });
      map.addInteraction(snapPoints);
    
    }
  if (modeRequested=='NOTEMODE') {
      QUERYMODE=false;
      ROUTEMODE=false;
      NOTEMODE=true;
      
      document.getElementById('noteButtonHeaderImg').src = 'pics/note_blue.svg';
      document.getElementById('noteButtonHeaderImg').classList.add("blink-image");
      document.getElementById('noteButtonHeader').style.display='block';
      
      if (BASELAYER == 'osm' && HDPI) {
        // avoid this baselayer when draw interactions are there
        // still lacking user feedback
        BASELAYER = "snowmap";
        HDPI = true;
        setBaseLayer();
      }
      
      // Layer where the user add routing points
      var pointsLayer = new ol.layer.Vector({
        source: sourcePoints,
        name: 'pointsLayer',
        style:new ol.style.Style({
                  
                  image: new ol.style.Circle({
                      stroke: new ol.style.Stroke({
                          color: 'black',
                          width: 2
                          }),
                      fill: new ol.style.Fill({
                          color: 'rgba(200, 200, 255, 0.5)'
                          }),
                      radius: 8,
                      })
                  }),
      });
      map.addLayer(pointsLayer)

      //allow user to move points
      // modifyPoints after modifyLines for it to handle a point drag 
      // event instead of the later
      modifyPoints = new ol.interaction.Modify({
        features: Pointsfeatures,
        style : new ol.style.Style({
                  image: new ol.style.Circle({
                      stroke: new ol.style.Stroke({
                          color: 'black',
                          width: 2
                          }),
                      fill: new ol.style.Fill({
                          color: 'rgba(200, 200, 255, 0.5)'
                          }),
                      radius: 16
                      })
                  }),
        pixelTolerance: 40
      });
      map.addInteraction(modifyPoints);

      drawPoints = new ol.interaction.Draw({
        features: Pointsfeatures,
        type: /** @type {ol.geom.GeometryType} */ ('Point')
      });
      drawPoints.on('drawend', function(event) {
        //event.stopPropagation(); useless to avoid modifyend event
        // remove previous points
        pointID = pointID + 1;
        event.feature.setProperties({
          'id': pointID,
          'type': "queryPoint"
        });

        // remove previous points
        pointsLayer.getSource().forEachFeature(function(feature) {
          if (feature.id != pointID) {
            pointsLayer.getSource().removeFeature(feature);
          }
        });
      });
      map.addInteraction(drawPoints);
      
      drawPoints.setActive(true)
      modifyPoints.setActive(true)
    }

}

function RouteSnap(point) {
  if (ROUTEMODE) {
    while (document.getElementById("route_results").firstChild) {
      document.getElementById("route_results").removeChild(document.getElementById("route_results").firstChild);
      }
    document.getElementById("routeWaiterResults").style.display = 'inline';
  }
  else {
    while (document.getElementById("query_results").firstChild) {
      document.getElementById("query_results").removeChild(document.getElementById("query_results").firstChild);
      }
    document.getElementById("queryWaiterResults").style.display = 'inline';
  }
  // count all routablepoints so that we can route when they're sanpped - useless ?
  /*var routableCnt=0;
  for (f in routeSourcePoints.getFeatures()) {
    var pt = routeSourcePoints.getFeatures()[f];
    if (pt.getProperties().routable) {
      routableCnt +=1;
    }
  }*/
  
  if (!point.getProperties().isSnapped && point.getProperties().routable) {
    var coords = point.getGeometry().getCoordinates();
    var ll = ol.proj.toLonLat(coords, 'EPSG:3857');
    var q = server 
          + "request?geo=true&list=true&closest=" 
          + ll[0] + ',' + ll[1];
          
    fetch(q)
    .then(function(response) {
      if (!response.ok) {
        throw new Error("HTTP error, status = " + response.status);
      }
      return response.json();
    })
    .then(function(json) {
      if (ROUTEMODE)
        document.getElementById("routeWaiterResults").style.display = 'none';
      else
        document.getElementById("queryWaiterResults").style.display = 'none';
      jsonPisteList = json;
      /* snap point*/
      ll = [json.snap.lon, json.snap.lat];
      llm = ol.proj.fromLonLat(ll, 'EPSG:3857');
      point.setProperties({
        'isSnapped': true
      }); 
      point.getGeometry().setCoordinates(llm); // We assign sanpped point coordinates but snap last point here
      if (! ol.extent.containsCoordinate(map.getView().calculateExtent(), llm))
      {
        map.getView().setCenter(llm);
      }
      if (getOverlayByName("deletePoint")) {getOverlayByName("deletePoint").setPosition(llm);}
      RouteReStyle();
      
      if (ROUTEMODE) {
        showHTMLPistesList(document.getElementById('route_results'));
      }
      else {
        showHTMLPistesList(document.getElementById('query_results'));
      }
      
      return true
    })
    .then(function (ok) {
      if (ROUTEMODE) {
        requestRoute(point); // pass last point as parameter to invalidate on routing fail
      }
      return true
    })
    .catch(function(error) {
      point.setProperties({'isSnapped': false, 'routable': false});
    });
  }
  return true
}

function getByName(name) {
  document.getElementById("searchWaiterResults").style.display = 'inline';
  document.getElementById('piste_search_results').innerHTML = '';
  var q = server + "request?group=true&geo=true&list=true&name=" + name;
  var XMLHttp = new XMLHttpRequest();
  XMLHttp.open("GET", q);
  XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {
      var resp = XMLHttp.responseText;
      jsonPisteList = JSON.parse(resp);
      document.getElementById("searchWaiterResults").style.display = 'none';
      showHTMLPistesList(document.getElementById('piste_search_results'));
    }
  };
  XMLHttp.send();
  return true;
}

function nominatimSearch(name) {
  document.getElementById("waiterNominatim").style.display = 'inline';
  var list = document.getElementsByClassName('nominatimLi')[0];
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  } //clear previous list
  var q = server + 'nominatim?format=json&place=' + name;
  var XMLHttp = new XMLHttpRequest();
  XMLHttp.open("GET", q);
  XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");

  XMLHttp.onreadystatechange = function() {
    if (XMLHttp.readyState == 4) {
      var nom = JSON.parse(XMLHttp.responseText);
      document.getElementById("waiterNominatim").style.display = 'none';

      var Ul = document.getElementsByClassName('nominatimLi')[0];
      for (var i = 0; i < nom.length; i++) {
        var resultli = document.getElementById('nominatim_result_list_proto').cloneNode(true);
        resultli.removeAttribute("id");
        resultli.setAttribute('lon', nom[i].lon);
        resultli.setAttribute('lat', nom[i].lat);
        resultli.onclick = function() {
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
  document.getElementById('body').focus(); // close keyboard on android
  document.getElementById('search_input').blur(); // close keyboard on android
  if (name === '') {
    return false;
  }

  document.search.nom_search.value = '';
  getByName(name);
  nominatimSearch(name);
}

function encpolArray2WKT(encpol) {
  var wktGeom;
  var l = 0;
  //var encPol = new OpenLayers.Format.EncodedPolyline();
  //encPol.geometryType = 'linestring';
  var encPol = new ol.format.Polyline();
  var wkt = new ol.format.WKT();
  //~ encpol = encpol.readFeatures(encpol);

  //var wkt = new OpenLayers.Format.WKT();
  var wkt;
  var feature;
  if (encpol.length == 1) {
    var feature = encPol.readFeatures(encpol[0])[0];
    wktGeom = wkt.writeFeature(feature, {
      projection: 'EPSG:4326'
    });
    g = feature.getGeometry();
    l += ol.sphere.getLength(g, {
      projection: 'EPSG:4326'
    }) / 1000;
  } else if (encpol.length > 1) {
    wktGeom = 'MULTILINESTRING(';
    for (i = 0; i < encpol.length; i++) {
      feature = encPol.readFeatures(encpol[i])[0];
      var linestring = wkt.writeFeature(feature, {
        projection: 'EPSG:4326'
      });
      wktGeom += linestring.replace('LINESTRING', '') + ',';
      g = feature.getGeometry();
      l += ol.sphere.getLength(g, {
        projection: 'EPSG:4326'
      }) / 1000;
    }
    wktGeom = wktGeom.substring(0, wktGeom.length - 1) + ')';
  }

  return {
    geom: wktGeom,
    length_km: l
  };
}

function showHTMLRoute(Div,routeLength, routeWKT) {
  while (Div.firstChild) {
    Div.removeChild(Div.firstChild);
  } //clear previous list
  var ProfileDiv = document.createElement('div');
  Div.appendChild(ProfileDiv);  
  
  var header = document.getElementById('routeHeaderProto').cloneNode(true);
  
  header.innerHTML= "<H1>" +_("routing_title") + " - " + (parseFloat(routeLength)/1000).toFixed(1) + " km";
  
  Div.appendChild(header);  
  
  
  showHTMLRouteList(Div);
  showRouteProfile(routeWKT, ProfileDiv, 'black');
}
function showHTMLRouteList(Div) {
  if (jsonPisteList.pistes !== null) {
    for (p = 0; p < jsonPisteList.pistes.length; p++) {
      
      pisteHTML = document.getElementById('singlePisteProto').cloneNode(true);
      
      piste = jsonPisteList.pistes[p];

      osm_ids = piste.ids.join('_').toString();
      
      var element_type='';
      if (piste.type) {
        element_type = piste.type;
      }
      var pistetype='';
      if (piste.pistetype) {
        pistetype = piste.pistetype;
      }
      if (piste.in_routes.length !== 0) {
        for (r = 0; r < piste.in_routes.length; r++) {
          // this info is not returned by the API yet
          if (piste.in_routes[r].pistetype) {
            pistetype += ";" + piste.in_routes[r].pistetype;
          }
        }
      }
      if (piste.aerialway) {
        pistetype += ";"+piste.aerialway;
      }
      
      var color = '';
      if (piste.color) {
        color = piste.color;
      }

      lon = piste.center[0];
      lat = piste.center[1];

      var difficulty = '';
      if (piste.difficulty) {
        difficulty = piste.difficulty;
      }
      
      // NAME DISPLAY
      var limitShort =18;
      var lengthLong =0;
      var char=0;
      nameHTML = "";
      shortNameHTML = "";
      
      if (pistetype.indexOf("downhill") > -1) {
        // downhill routes are not taken into account
        // Downhill name length is not taken into account;
        
        color = '';
        marker = '';
        if (lat > 0 && lon < -40) {
          if (piste.difficulty == 'expert') {
            marker = '&diams;&diams;';
          }
          if (piste.difficulty == 'advanced') {
            marker = '&diams;';
          }
          if (piste.difficulty == 'freeride') {
            marker = '!!';
          }
          color = diffcolorUS[piste.difficulty];
        } else {
          color = diffcolor[piste.difficulty];
        }
        if (marker) {
          nameHTML += marker +" ";
          nameHTML += piste.name;
        } else if (color) {
          nameHTML += " <span style=\"color:"+color+"\">●</span><span>";
          nameHTML += piste.name;
        }
      } else {
        nameHTML = piste.name;
        lengthLong += nameHTML.length;
        shortNameHTML = "";
      }
      
      if (piste.in_routes.length !== 0) {

        for (r = 0; r < piste.in_routes.length; r++) {

          color = 'black';
          if (piste.in_routes[r].color) {
            color = piste.in_routes[r].color;
          } else {
            color = diffcolor[piste.in_routes[r].difficulty];
          }
          routeName = piste.in_routes[r].name;
          nameHTML += " <span style=\"color:"+color+"\">●</span><span>"+routeName+"</span>";
          lengthLong += 2 + routeName.length;
          shortNameHTML += "&nbsp;<span style=\"color:"+color+"\">●</span>";
          char += 2;
        }
        
        shortNameHTML += piste.name.substring(0, limitShort-char)+"&nbsp;";
        char += piste.name.substring(0, limitShort-char).length;
        for (r = 0; r < piste.in_routes.length; r++) {
          if (char <=limitShort) {
            shortNameHTML += "&nbsp;"+piste.in_routes[r].name.substring(0, limitShort-char);
            char += piste.in_routes[r].name.substring(0, limitShort-char).length+1;
          }
        }
      }
      
      
      if (lengthLong <= limitShort) {shortNameHTML = nameHTML;}
      else {shortNameHTML += nameHTML.substring(0, limitShort-char)+"...  »"}
      
      var longNameDiv = pisteHTML.getElementsByClassName('singlePisteLongName')[0];
      var shortNameDiv = pisteHTML.getElementsByClassName('singlePisteShortName')[0];
      
      longNameDiv.innerHTML = nameHTML;
      shortNameDiv.innerHTML = shortNameHTML;
      longNameDiv.style.display="none";
      
      //PISTE:TYPE & GROOMING DISPLAY
      picDiv = pisteHTML.getElementsByClassName('singlePisteLeft')[0];
      picDiv.innerHTML = null;
      var pistetypes=  pistetype.split(";");
      for (e in pistetypes) {
        var t = pistetypes[e];
        var g = piste.grooming;

          if (t.indexOf("nordic") > -1) {
            var done = false;
            if (g) {
              if (g.indexOf("classic") > -1) {
                img = document.createElement('img');
                img.src = icon["classic"];
                img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
              }
              if (g.indexOf("skating") > -1) {
                img = document.createElement('img');
                img.src = icon["skating"];
                img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
              }
              if (g.indexOf("backcountry") > -1) {
                img = document.createElement('img');
                img.src = icon["crosscountry"];
                img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
              }
              if (g.indexOf("scooter") > -1) {
                img = document.createElement('img');
                img.src = icon["crosscountry"];
                img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
              }
            }
            if (! done) {
              img = document.createElement('img');
              img.src = icon["nordic"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }

          if (t.indexOf("hike") > -1) {
            var done = false;
            if (g) {
              if (g.indexOf("classic") > -1) {
                img = document.createElement('img');
                img.src = icon["hike"];
                img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
              }
              if (g.indexOf("backcountry") > -1) {
                img = document.createElement('img');
                img.src = icon["snowshoe"];
                img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
              }
            }
            if (! done) {
              img = document.createElement('img');
              img.src = icon["snowshoe"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
            
          if (t.indexOf("downhill") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["downhill"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("skitour") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["skitour"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("playground") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["playground"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("sled") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["sled"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("sleigh") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["sleigh"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("snow_park") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["snow_park"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("ski_jump") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["ski_jump"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("cable_car") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["cable_car"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("chair_lift") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["chair_lift"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("drag_lift") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["drag_lift"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("funicular") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["funicular"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("gondola") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["gondola"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("jump") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["ski_jump"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("magic_carpet") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["magic_carpet"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("mixed_lift") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["mixed_lift"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("t-bar") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["t-bar"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("j-bar") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["j-bar"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("platter") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["platter"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
          if (t.indexOf("rope_tow") > -1) {
            var done = false;
            if (! done) {
              img = document.createElement('img');
              img.src = icon["rope_tow"];
              img.className = 'pisteIcon';picDiv.appendChild(img);done = true;
            }
        }
        
      }
      
      //PISTE:DIFFICULTY DISPLAY
      var dist="km "+(parseFloat(piste["distance"])/1000).toFixed(1);
      var diffHTML =dist+' (';
      if (piste.difficulty) {
        diffHTML += _(piste.difficulty);
      }
      marker =_('difficulty')+' ?';
      if (pistetype.indexOf("downhill") > -1) {
        if (piste.difficulty) {
          marker = '&#9679;'; // bullet

          if (piste.difficulty == 'novice' ){
            marker = '&#9679;'; 
            color = diffcolor[piste.difficulty];
          }
          else if (piste.difficulty == 'easy' ){
            marker = '&#9679;'; 
            color = diffcolor[piste.difficulty];
          }
          else if (piste.difficulty == 'intermediate' ){
            marker = '&#9679;'; 
            color = diffcolor[piste.difficulty];
          }
          else if (piste.difficulty == 'advanced' ){
            marker = '&#9679;'; 
            color = diffcolor[piste.difficulty];
          }
          else if (piste.difficulty == 'expert' ){
            marker = '&#9888;'; // warning
            color = diffcolor[piste.difficulty];
          }
          else if (piste.difficulty == 'freeride' ){
            marker = '&#9888;'; // warning
            color = diffcolor[piste.difficulty];
          }
          else {
            marker = _('difficulty')+' ?'; // Question mark
            color ='black';
          }
          
          
          if (lat > 0 && lon < -40) {
            if (piste.difficulty == 'novice' ){
              marker = '&#9679;'; 
              color = diffcolorUS[piste.difficulty];
            }
            else if (piste.difficulty == 'easy' ){
              marker = '&#9679;'; 
              color = diffcolorUS[piste.difficulty];
            }
            else if (piste.difficulty == 'intermediate' ){
              marker = '&#9679;'; 
              color = diffcolorUS[piste.difficulty];
            }
            else if (piste.difficulty == 'advanced' ){
              marker = '&diams;';
              color = diffcolorUS[piste.difficulty];
            }
            else if (piste.difficulty == 'expert' ){
              marker = '&diams;&diams;';
              color = diffcolorUS[piste.difficulty];
            }
            else if (piste.difficulty == 'freeride' ){
              marker = '&#9888;'; // warning
              color = diffcolorUS[piste.difficulty];
            }
            else {
              marker = _('difficulty')+' ?'; // Question mark
              color ='black';
            }
          }
        } 
      }
      if (pistetype.indexOf("nordic") > -1) {
        marker = _('difficulty')+' ?'; // Question mark
        color ='black';
        if (piste.difficulty) {
          if (piste.difficulty == 'novice' ){
            marker = ''; // warning
            color ='black';
          }
          else if (piste.difficulty == 'easy' ){
            marker = ''; // warning
            color ='black';
          }
          else if (piste.difficulty == 'intermediate' ){
            marker = '&#9888;'; // warning
            color ='black';
          }
          else if (piste.difficulty == 'advanced' ){
            marker = '&#9888;'; // warning
            color = 'red';
          }
          else if (piste.difficulty == 'expert' ){
            marker = '&#9888;'; // warning
            color = 'red';
          }
          else if (piste.difficulty == 'freeride' ){
            marker = '&#9888;'; // warning
            color = 'red';
          }
          else {
            marker = _('difficulty')+' ?'; // Question mark
            color ='black';
          }
        } 
      }
      if (marker){        
          diffHTML += "&nbsp;<span style=\"color:"+color+"\">"+marker+"</span><span>";
      }
      diffHTML += ')';
      var diffDiv = pisteHTML.getElementsByClassName('singlePisteDiff')[0];
      if (diffHTML.length >2) {
        diffDiv.innerHTML=diffHTML;
      } else {
        diffDiv.innerHTML='';
      }
      
      
      Div.appendChild(pisteHTML);
    }
    Div.appendChild(document.createElement('br')); 
    Div.appendChild(document.createElement('br'));
    Div.appendChild(document.createElement('br'));
  }
}
function toggleShort(div) {
        var p = div.parentElement;
        p.getElementsByClassName('singlePisteLongName')[0].style.display="inline";
        p.getElementsByClassName('singlePisteShortName')[0].style.display="none";
      }
function toggleLong(div) {
        var p = div.parentElement;
        p.getElementsByClassName('singlePisteShortName')[0].style.display="inline";
        p.getElementsByClassName('singlePisteLongName')[0].style.display="none";
      };
function showHTMLPistesList(Div) {

  while (Div.firstChild) {
    Div.removeChild(Div.firstChild);
  } //clear previous list
  var site, piste, index;
  var name, osm_id, element_type, types, difficulty, marker, routeName, siteId, siteName;
  var sitediv, pistediv, spans, span, pic, picDiv, hrDiv, hrsDiv, cleardiv, buttonDiv, inroutediv, insitediv, footer;

  if (jsonPisteList.sites !== null) {

    for (p = 0; p < jsonPisteList.sites.length; p++) {


      site = jsonPisteList.sites[p];
      index = site.result_index;


      //console.log('ids: ' + site.ids);
      osm_id = site.ids.join('_').toString(); // What to do with that '_' for sites ??

      name = site.name;
      if (name == ' ') {
        name = ' x ';
      }

      element_type = '';

      if (site.type) {
        element_type = site.type;
      }

      sitediv = document.getElementById('pisteListElementProto').cloneNode(true);

      sitediv.removeAttribute("id");
      sitediv.setAttribute('osm_id', osm_id);
      sitediv.setAttribute('element_type', element_type);

      sitediv.getElementsByClassName("getProfileButton")[0].style.display = 'none';

      sitediv.getElementsByClassName("moreInfoButton")[0].onclick = function(e) {
        showSiteStats(this.parentNode.parentNode,
          this.parentNode.parentNode.getAttribute('osm_id'),
          this.parentNode.parentNode.getAttribute('element_type'));
      };

      sitediv.getElementsByClassName("getMemberListButton")[0].onclick = function(e) {
        getMembersById(this.parentNode.parentNode.getAttribute('osm_id'));
      };

      /*sitediv.onmouseout = function () {
          deHighlight();
      };

      sitediv.onmouseover = function () {
          highlightElement(this.getAttribute('osm_id'), 'sites');
      };*/

      sitediv.onclick = function() {
        zoomToElement(this.getAttribute('osm_id'), 'sites');

        var center = map.getView().getCenter();
        var resolution = map.getView().getResolution();
        map.getView().setCenter([center[0] - 105 * resolution, center[1]]);
        //deHighlight();
      };
      Div.appendChild(sitediv);

      spans = sitediv.getElementsByTagName('span');
      for (i = 0; i < spans.length; i++) {
        span = spans[i];
        if (span.className == "routeColorSpan") {
          span.style.display = 'none';
        }
        if (span.className == "pisteNameSpan") {
          span.style.display = 'none';
        }
        if (span.className == "siteNameSpan") {
          span.innerHTML = name; //+' '+osm_id;
        }
        if (span.className == "difficultySpan") {
          span.style.display = 'none';
        }
        if (span.className == "difficultyColorSpan") {
          span.style.display = 'none';
        }
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

      if (piste.type) {
        element_type = piste.type;
      }
      color = '';
      if (piste.color) {
        color = piste.color;
      }

      lon = piste.center[0];
      lat = piste.center[1];

      difficulty = '';
      if (piste.difficulty) {
        difficulty = piste.difficulty;
      }

      name = piste.name;
      if (name == ' ') {
        name = ' - ';
      }

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

      pistediv.getElementsByClassName("getProfileButton")[0].onclick = function(e) {
        zoomToElement(this.parentNode.parentNode.getAttribute('osm_id'), 'pistes');


        var center = map.getView().getCenter();
        var resolution = map.getView().getResolution();
        map.getView().setCenter([center[0] - 105 * resolution, center[1]]);
        var profileDiv = this.parentNode.parentNode.getElementsByClassName("profile")[0];
        showPisteProfile(this.parentNode.parentNode.getAttribute('osm_id'), 'pistes', profileDiv, this.parentNode.parentNode.getAttribute('element_color'));
      };

      //pistediv.getElementsByClassName("moreInfoButton")[0].style.display = 'none';
      pistediv.getElementsByClassName("moreInfoButton")[0].onclick = function(e) {
        showExtLink(this.parentNode, this.parentNode.parentNode.getAttribute('osm_id'), this.parentNode.parentNode.getAttribute('element_type'));
      };

      pistediv.getElementsByClassName("getMemberListButton")[0].style.display = 'none';

      buttondiv = pistediv.getElementsByClassName("pisteListButton")[0];
      /*buttondiv.onmouseout = function () {
          deHighlight();
      };*/

      /*buttondiv.onmouseover = function () {
          highlightElement(this.parentNode.getAttribute('osm_id'), 'pistes');
      };*/

      buttondiv.onclick = function() {
        zoomToElement(this.parentNode.getAttribute('osm_id'), 'pistes');

        var center = map.getView().getCenter();
        var resolution = map.getView().getResolution();
        map.getView().setCenter([center[0] - 105 * resolution, center[1]]);
        //deHighlight();
      };
      Div.appendChild(pistediv);

      footer = pistediv.getElementsByClassName("pisteListElementFooter")[0];
      spans = pistediv.getElementsByTagName('span');
      for (i = 0; i < spans.length; i++) {
        span = spans[i];
        if (span.className == "routeColorSpan") {
          if (piste.color) {
            span.style.color = piste.color;
          } else {
            span.style.display = 'none';
          }
        }
        if (span.className == "pisteNameSpan") {
          span.innerHTML = name;
        }
        if (span.className == "siteNameSpan") {
          span.style.display = 'none';
        }
        if (span.className == "difficultySpan") {
          span.innerHTML = _(piste.difficulty);
        }
        if (span.className == "difficultyColorSpan") {
          
          
          //PISTE:DIFFICULTY DISPLAY
          marker ='';
          color= 'black';
          if (piste.pistetype) {
            if (piste.pistetype.indexOf("downhill") > -1) {
              if (piste.difficulty) {
                marker = '&#9679;'; // bullet
                if (piste.difficulty == 'novice' ){
                  marker = '&#9679;'; 
                  color = diffcolor[piste.difficulty];
                }
                else if (piste.difficulty == 'easy' ){
                  marker = '&#9679;'; 
                  color = diffcolor[piste.difficulty];
                }
                else if (piste.difficulty == 'intermediate' ){
                  marker = '&#9679;'; 
                  color = diffcolor[piste.difficulty];
                }
                else if (piste.difficulty == 'advanced' ){
                  marker = '&#9679;'; 
                  color = diffcolor[piste.difficulty];
                }
                else if (piste.difficulty == 'expert' ){
                  marker = '&#9888;'; // warning
                  color = diffcolor[piste.difficulty];
                }
                else if (piste.difficulty == 'freeride' ){
                  marker = '&#9888;'; // warning
                  color = diffcolor[piste.difficulty];
                }
                else {
                  marker = '?'; // Question mark
                  color ='black';
                }
                
                if (lat > 0 && lon < -40) {
                  if (piste.difficulty == 'novice' ){
                    marker = '&#9679;'; 
                    color = diffcolorUS[piste.difficulty];
                  }
                  else if (piste.difficulty == 'easy' ){
                    marker = '&#9679;'; 
                    color = diffcolorUS[piste.difficulty];
                  }
                  else if (piste.difficulty == 'intermediate' ){
                    marker = '&#9679;'; 
                    color = diffcolorUS[piste.difficulty];
                  }
                  else if (piste.difficulty == 'advanced' ){
                    marker = '&diams;';
                    color = diffcolorUS[piste.difficulty];
                  }
                  else if (piste.difficulty == 'expert' ){
                    marker = '&diams;&diams;';
                    color = diffcolorUS[piste.difficulty];
                  }
                  else if (piste.difficulty == 'freeride' ){
                    marker = '&#9888;'; // warning
                    color = diffcolorUS[piste.difficulty];
                  }
                  else {
                    marker = '?'; // Question mark
                    color ='black';
                  }
                }
              } 
            }
            if (piste.pistetype.indexOf("nordic") > -1) {
              marker = '?'; // Question mark
              color ='black';
              if (piste.difficulty) {
                if (piste.difficulty == 'novice' ){
                  marker = ''; // warning
                  color ='black';
                }
                else if (piste.difficulty == 'easy' ){
                  marker = ''; // warning
                  color ='black';
                }
                else if (piste.difficulty == 'intermediate' ){
                  marker = '&#9888;'; // warning
                  color ='black';
                }
                else if (piste.difficulty == 'advanced' ){
                  marker = '&#9888;'; // warning
                  color = 'red';
                }
                else if (piste.difficulty == 'expert' ){
                  marker = '&#9888;'; // warning
                  color = 'red';
                }
                else if (piste.difficulty == 'freeride' ){
                  marker = '&#9888;'; // warning
                  color = 'red';
                }
                else {
                  marker = '?'; // Question mark
                  color ='black';
                }
              } 
            }
          }
          span.style.color = color;
          span.innerHTML = marker;
          
          
          
          /*if (piste.difficulty) {
            marker = '&#9679;';
            if (piste.difficulty == 'freeride') {
              marker = '!';
            }
            if (lat > 0 && lon < -40) {
              if (piste.difficulty == 'expert') {
                marker = '&diams;&diams;';
              }
              if (piste.difficulty == 'advanced') {
                marker = '&diams;';
              }
              if (piste.difficulty == 'freeride') {
                marker = '!!';
              }
              span.style.color = diffcolorUS[piste.difficulty];
            } else {
              span.style.color = diffcolor[piste.difficulty];
            }
            span.innerHTML = marker;

          } else {
            span.style.display = 'none';
          }*/
        } // difficultyColorSpan
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

          insitediv.onclick = function() {
            zoomToParentSite(this.getAttribute('osm_id'), this.getAttribute('r'));
            var center = map.getView().getCenter();
            var resolution = map.getView().getResolution();
            map.getView().setCenter([center[0] - 105 * resolution, center[1]]);
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
          if (piste.in_routes[r].color) {
            color = piste.in_routes[r].color;
          } else {
            color = diffcolor[piste.in_routes[r].difficulty];
          }

          routeName = piste.in_routes[r].name;
          osm_ids = piste.in_routes[r].id;
          element_type = piste.in_routes[r].type;
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

          inroutediv.onclick = function() {
            //~ showProfileFromGeometryParentRoute(this.getAttribute('osm_id'), this.getAttribute('r'));
            getTopoById(this.getAttribute('osm_id'));
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
              if (color !== '') {
                span.style.color = color;
              } else {
                span.style.display = 'none';
              }
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

        if (data == 'siteUrl') {
          spans[i].href = protocol + "//openstreetmap.org/browse/" + element_type + "/" + id;
        }
        if (data == 'siteId') {
          spans[i].innerHTML = id;
        }

        if (data == 'siteType') {
          spans[i].innerHTML = element_type; //way or relation
        }
        if (data == 'analyseUrl') {
          spans[i].href = "https://ra.osmsurround.org/analyzeRelation?relationId=+" + id;
        }
      }

    }

  } else {
    child.parentNode.removeChild(child);
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

    XMLHttp.onreadystatechange = function() {
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
      if (['downhill', 'nordic', 'skitour', 'sled', 'lifts', 'hike'].indexOf(data) != -1) {
        spans[i].innerHTML = (parseFloat(jsonStats[data]) / 1000).toFixed(1);
      }
      if (['snow_park', 'jump', 'playground', 'sleigh', 'ice_skate'].indexOf(data) != -1) {
        if (jsonStats[data] !== 0) {
          spans[i].innerHTML = '&#9679;';
          spans[i].style.color = 'green';
        } else {
          spans[i].innerHTML = 'x';
          spans[i].style.color = 'red';
        }
      }
    }
    if (data == 'siteUrl') {
      spans[i].href = protocol + "//openstreetmap.org/browse/" + element_type + "/" + id;
    }
    if (data == 'siteId') {
      spans[i].innerHTML = id;
    }
    if (data == 'siteType') {
      spans[i].innerHTML = element_type; //way or relation
    }
  }

}

//======================================================================
// MAP

function setHighDpi() {
  if (HDPI) {
    document.getElementById('high_dpi').style.backgroundColor = '#FFF';
    document.getElementById('viewSwitchImg').src = 'pics/plus_minus_5_64.svg';
    document.getElementById('viewSwitchImgMenu').src = 'pics/plus_minus_5_64.svg';
    HDPI = false;
  } else {
    document.getElementById('high_dpi').style.backgroundColor = '#DDD';
    document.getElementById('viewSwitchImg').src = 'pics/minus_plus_5_64.svg';
    document.getElementById('viewSwitchImgMenu').src = 'pics/minus_plus_5_64.svg';
    HDPI = true;
  }
}

function setBaseLayer() {
  var c = map.getView().getCenter();
  var z = map.getView().getZoom();
  var prevent_OSM_HDPI= false;
  
  if (getLayerByName("pointsLayer")) 
  {
    // avoid this baselayer when draw interactions are there
    // still lacking user feedback
    if (BASELAYER == 'osm' && HDPI) {
      BASELAYER = "osm";
      HDPI = false;
    }
  }
  //Switch base layer
  if (BASELAYER == 'osm' && !HDPI) {
    getLayerByName('osm').setVisible(true);
    getLayerByName('snowmap').setVisible(false);
    getLayerByName('pistes&relief').setVisible(true);
    getLayerByName('pistes').setVisible(false);
    getLayerByName('osm_HiDPI').setVisible(false);
    getLayerByName('snowmap_HiDPI').setVisible(false);
    getLayerByName('pistes&relief_HiDPI').setVisible(false);
    getLayerByName('pistes_HiDPI').setVisible(false);
    document.getElementById('SnowBaseLAyer').style.backgroundColor = '#FFF';
    document.getElementById('OSMBaseLAyer').style.backgroundColor = '#DDD';
    //~ document.getElementById('switch_to_snowmap_base_layer').style.textDecoration='none';
    //~ document.getElementById('switch_to_osm_base_layer').style.textDecoration='underline';
    //~ document.getElementById('switch_to_HDPI').style.textDecoration='none';
    map.setView(view);
  }
  else if (BASELAYER == 'osm' && HDPI) {
    getLayerByName('osm_HiDPI').setVisible(true);
    getLayerByName('snowmap_HiDPI').setVisible(false);
    getLayerByName('pistes&relief_HiDPI').setVisible(true);
    getLayerByName('pistes_HiDPI').setVisible(false);
    getLayerByName('osm').setVisible(false);
    getLayerByName('snowmap').setVisible(false);
    getLayerByName('pistes&relief').setVisible(false);
    getLayerByName('pistes').setVisible(false);
    document.getElementById('SnowBaseLAyer').style.backgroundColor = '#FFF';
    document.getElementById('OSMBaseLAyer').style.backgroundColor = '#DDD';
    //~ document.getElementById('switch_to_snowmap_base_layer').style.textDecoration='none';
    //~ document.getElementById('switch_to_osm_base_layer').style.textDecoration='underline';
    //~ document.getElementById('switch_to_HDPI').style.textDecoration='underline';
    map.setView(view);
  }
  else if (BASELAYER == 'snowmap' && HDPI) {
    getLayerByName('osm_HiDPI').setVisible(false);
    getLayerByName('snowmap_HiDPI').setVisible(true);
    getLayerByName('pistes&relief_HiDPI').setVisible(false);
    getLayerByName('pistes_HiDPI').setVisible(true);
    getLayerByName('osm').setVisible(false);
    getLayerByName('snowmap').setVisible(false);
    getLayerByName('pistes&relief').setVisible(false);
    getLayerByName('pistes').setVisible(false);
    document.getElementById('SnowBaseLAyer').style.backgroundColor = '#DDD';
    document.getElementById('OSMBaseLAyer').style.backgroundColor = '#FFF';
    //~ document.getElementById('switch_to_snowmap_base_layer').style.textDecoration='underline';
    //~ document.getElementById('switch_to_osm_base_layer').style.textDecoration='none';
    //~ document.getElementById('switch_to_HDPI').style.textDecoration='underline';
    map.setView(viewHDPI);
  }
  else { //BASELAYER == 'snowmap' && !HDPI
    BASELAYER ='snowmap';
    HDPI = false;
    getLayerByName('osm').setVisible(false);
    getLayerByName('snowmap').setVisible(true);
    getLayerByName('pistes&relief').setVisible(false);
    getLayerByName('pistes').setVisible(true);
    getLayerByName('osm_HiDPI').setVisible(false);
    getLayerByName('snowmap_HiDPI').setVisible(false);
    getLayerByName('pistes&relief_HiDPI').setVisible(false);
    getLayerByName('pistes_HiDPI').setVisible(false);
    document.getElementById('SnowBaseLAyer').style.backgroundColor = '#DDD';
    document.getElementById('OSMBaseLAyer').style.backgroundColor = '#FFF';
    //~ document.getElementById('switch_to_snowmap_base_layer').style.textDecoration='underline';
    //~ document.getElementById('switch_to_osm_base_layer').style.textDecoration='none';
    //~ document.getElementById('switch_to_HDPI').style.textDecoration='none';
    map.setView(view);
  }
  map.getView().setCenter(c);
  map.getView().setZoom(z);
  //~ updatePermalink();
  //~ map.render();
  // forces redraw of element above the map after scaling, still something bad with zooms on mobile
  //~ document.getElementById("header").style.zIndex=10;
  //~ document.getElementById("map").style.zIndex=0;
  //~ document.getElementById("customZoom").style.zIndex=1001;
  //~ document.getElementById("customZoomIn").style.zIndex=1002;
  //~ document.getElementById("customZoomOut").style.zIndex=1002;

  //~ var permalinks = map.getControlsByClass("OpenLayers.Control.Permalink");
  //~ for (p = 0; p < permalinks.length; p++){
  //~ permalinks[p].updateLink();
  //~ }
  //~ show_live_edits('none',false);
}

function map_init() {
  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        name: 'snowmap',
        source: new ol.source.XYZ({
          url: protocol + "//tiles.opensnowmap.org/base_snow_map/{z}/{x}/{y}.png?debug1",
        }),
        visible: false,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'osm',
        source: new ol.source.OSM(),
        visible: false,
        attributions: null,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'pistes&relief',
        source: new ol.source.XYZ({
          url: protocol + "//tiles.opensnowmap.org/pistes-relief/{z}/{x}/{y}.png?debug1",
        }),
        visible: false,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'pistes',
        source: new ol.source.XYZ({
          url: protocol + "//tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png?debug1",
        }),
        visible: false,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'snowmap_HiDPI',
        source: new ol.source.XYZ({
          url: protocol + "//tiles.opensnowmap.org/base_snow_map_high_dpi/{z}/{x}/{y}.png?debug1",
          tileSize: 384,
          tilePixelRatio: 1
        }),
        visible: false,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'osm_HiDPI',
        source: new ol.source.OSM(),
        visible: false,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'pistes&relief_HiDPI',
        source: new ol.source.XYZ({
          url: protocol + "//tiles.opensnowmap.org/pistes-relief/{z}/{x}/{y}.png?debug1",
        }),
        visible: false,
        maxZoom: 18
      }),

      new ol.layer.Tile({
        name: 'pistes_HiDPI',
        source: new ol.source.XYZ({
          url: protocol + "//tiles.opensnowmap.org/tiles-pistes-high-dpi/{z}/{x}/{y}.png?debug1",
          tileSize: 384,
          tilePixelRatio: 1
        }),
        visible: false,
        maxZoom: 18
      })
    ],
    target: 'map',
    view: view,
    logo: false,
    controls: ol.control.defaults({
      attribution: false
    }),
    interactions: ol.interaction.defaults({
      altShiftDragRotate: false,
      pinchRotate: false
    }),
    renderer: ('canvas')
  });

  setBaseLayer();
  //~ setMarker();
  map.on('moveend', updateZoomContent);
  map.on('precompose', setCanvasScale); // needed when we resize window
  map.on('click', closeContent);
  if (MARKER) {setMarker();}

}

//======================================================================
// I18N
var locs = ["ast", "cze", "deu", "eng", "spa", "cat", "fin", "fra", "hun", "ita", "jpa", "nld", "nno", "rus", "swe", "ukr"];
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
  if (locale == locs[i]) {
    found = true;
    break;
  }
}
if (!found) {
  locale = 'eng';
}

// only a few iframe content pages are translated:
if (locale != 'eng' && locale != 'fra') {
  iframelocale = 'eng';
} else {
  iframelocale = locale;
}

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
  if (typeof(i18nDefault[s]) !== 'undefined')
    return i18nDefault[s];
  else
    return s;
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
    if (elements[i].getAttribute('dataText') == 'date') {
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
    if (what == locs[i]) {
      found = true;
      locale = what;
      break;
    }
  }
  if (!found) {
    locale = 'eng';
  }
  localStorage.l10n = locale;
  i18n = eval(locale);
  if (locale != 'eng' && locale != 'fra') {
    iframelocale = 'eng';
  } else {
    iframelocale = locale;
  }
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
  document.getElementById('langs').innerHTML = '';
  document.getElementById('langs').appendChild(img);
}
//--------------
// Utilities
//--------------

function getLayerByName(name) {
  var l = null;
  map.getLayers().forEach(function(layer) {
    if (layer.get('name') == name) {
      l = layer;
    }
  });
  return l
}

function getOverlayByName(name) {
  var l = null;
  map.getOverlays().forEach(function(overlay) {
    if (overlay.get('name') == name) {
      l = overlay;
    }
  });
  return l
}
function getNodeText(node) {
  //workaround for browser limit to 4096 char in xml nodeValue
  var r = "";
  for (var x = 0;x < node.childNodes.length; x++) {
    r = r + node.childNodes[x].nodeValue;
  }
  return r;
}
function abortXHR(type) {
  // Abort ongoing requests before sending a new one
  // Failing this, long requests results would be displayed over newer faster
  // ones.
  if (type == 'Route') {
    for (var i = 0; i < RouteXHR.length; i++) {
      RouteXHR[i].abort();
    }
    RouteXHR.length = 0;
  }
  return true;
}
function josmRemote() {
    var bb = ol.extent.applyTransform(map.getView().calculateExtent(), ol.proj.getTransform('EPSG:3857', 'EPSG:4326'), undefined);
    var q = 'http://127.0.0.1:8111/load_and_zoom?left=' + bb[0] + '&top=' + bb[3] + '&right=' + bb[2] + '&bottom=' + bb[1];
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.open("GET", q, true);
    XMLHttp.send();

}

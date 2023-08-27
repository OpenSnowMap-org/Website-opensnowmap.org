var center= ol.proj.toLonLat([6.395,46.768],'EPSG:4326');
var zoom = 14;
var map;
var attribution;
var base_layer = "osm";
var jsonPisteList = {};
var vectorSource;


var relationOffsets={};
var relationList=[];
var OFFSET_DIR=1;

var lockRequest = false;

if (window.location.hash !== '') {
    //opensnowmap.org/offseter/new_offsetter.html#map=16/6.382/46.764/1482062:0:orange|1970150:0:blue|1970151:0:green|1970152:0:purple|1970153:0:purple|7921593:0:purple|2065811:0:blue|2726388:0:cyan|1982237:0:red|
    
    // try to restore center, zoom-level and rotation from the URL
    var hash = window.location.hash;
    //if no lonlat, look for a relation id
    if (hash.search('#map=') <0) { 
        searchLocation(hash);
        hash = '0/0/0/'+hash.substring(1);
    }
    else {
        hash = window.location.hash.replace('#map=', '');
    }
    
    while (hash.search('&')> -1) {
        hash=hash.replace('&','/');
    }
    var parts = hash.split('/');
    if (parts.length >= 3) {
        zoom = parseInt(parts[0], 10);
        center = [
        parseFloat(parts[1]),
        parseFloat(parts[2])
        ];
        center = ol.proj.toLonLat(center,'EPSG:4326');
        if (parts.length >= 4) {
            var off = parts[3].split('|');
            for (var o = 0; o < off.length -1 ; o++)
            {
                relationOffsets[off[o].split(':')[0]] = off[o].split(':')[1];
            }
        }
    }
    
}
function clearLock() {
  lockRequest = false;
}
function getLayerByName(name) {
	var l = null;
	map.getLayers().forEach(function(layer) {
		if (layer.get('name') == name) {l = layer;}
	});
	return l
}
function searchLocation(hash) {
    var id = hash.split('#')[1].split(':')[0];
    var url = '/request?ids='+id+','+id+'&list=true';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    var onError = function() {
      return true;
    }
    xhr.onerror = onError;
     
    xhr.onload = function() {
       if (xhr.status == 200) {
            var resp = xhr.responseText;
           var pisteList = JSON.parse(resp);
           var lonlat = pisteList.pistes[0].center;
           var zoom = 14;
           map.getView().setCenter(ol.proj.transform(lonlat, 'EPSG:4326','EPSG:3857'));
           map.getView().setZoom(zoom);
       }
       return true;
   }
   xhr.send();
   
   return true;
}
function requestRelations(extent, resolution, projection) {
    if (lockRequest) {return true;}
    lockRequest=true;
    setTimeout(clearLock, 200);
    
    if (map.getView().getZoom() < 12) {
      document.getElementById("zoomInPlease").style.display = 'inline';
      return true;
    } else {
      document.getElementById("zoomInPlease").style.display = 'none';
    }
    
    //~ vectorSource.clear(false);
     var proj = projection.getCode();
     var bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
     var url = 'https://www.opensnowmap.org/request?bboxOffsetter=' + bbox.join(',');
    document.getElementById("searchWaiterResults").style.display = 'inline';
    fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error("HTTP error, status = " + response.status);
      }
      return response.json();
    })
    .then(function(json) {
        
        relationList.length = 0;
        jsonPisteList = json;
        for (key in jsonPisteList.pistes) {
            var element = jsonPisteList.pistes[key];
            
            if (element.type == 'way'){
                
                var rel=[];
                rel['name']=element.name;
                rel['color']=element.nordic_route_colour.split(";")[0];
                rel['id'] =element.parent_routes_ids.replace('-','');
                rel['direction_to_route'] =element.direction_to_route;
                rel['length'] =element.nordic_route_length;
                
                if ( ! relationOffsets[ rel['id'] ]) {relationOffsets[ rel['id'] ] =0;}
                rel['of'] = relationOffsets[ rel['id'] ]; 
                
                relationList.push(rel);
                updateRelationList();
                
                var stroke= new ol.style.Stroke({
                           color: rel['color'],
                           width: 3
                         });
                var f = vectorSource.getFormat().readFeature(element.geometry[0],
                 {dataProjection: 'EPSG:4326',
                  featureProjection: 'EPSG:3857'
                });
                var line = f.getGeometry();
                //~ len += 0-Math.floor(line.getLength());
                var coords = [];
                var counter = 0;
                var dist = rel['direction_to_route'] * rel['of'] * (3+0.5) * map.getView().getResolution();
                line.forEachSegment(function(from, to) {
                  coord = offsetSegment(from, to, dist);
                  if (! coords.includes(coord[0])) {coords.push(coord[0]);}
                  if (! coords.includes(coord[1])) {coords.push(coord[1]);}
                });
                if(rel['id'] == 1970151) {
                  //~ console.log(coords);
                  //~ console.log(element.geometry[0]);
                     //~ member   |  osm_id  | geometrytype 
                  //~ ------------+----------+--------------
                    //~ 145732493 | -1970151 | LINESTRING
                    //~ 145732524 | -1970151 | LINESTRING
                    //~ 145732483 | -1970151 | LINESTRING
                   //~ 1590894265 | -1970151 | POINT

                }
                var geom = new ol.geom.LineString(coords);
                
                var style = new ol.style.Style({
                    stroke: stroke
                });
                var feature = new ol.Feature({
                    geometry: geom,
                    osm_id: rel['id']
                    });
                style.setZIndex(-rel['length']);
                feature.setStyle(style);
                
                vectorSource.addFeature(feature);
            }
        }
    })
    .then(function (ok) {
      document.getElementById("searchWaiterResults").style.display = 'none';
      
      lockRequest=false;
      return true
    })
    .catch(function(error) {
    });
    return true
}
function offsetSegment(from, to, dist) {
    var angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    var newFrom = [
        Math.sin(angle) * dist + from[0],
        -Math.cos(angle) * dist + from[1]
    ];
    var newTo = [
        Math.sin(angle) * dist + to[0],
        -Math.cos(angle) * dist + to[1]
    ];
    //~ coords.push(newFrom);
    //~ coords.push(newTo);
    return [newFrom, newTo];
  }
function map_init(){
    vectorSource = new ol.source.Vector ({
        format: new ol.format.Polyline(),
        loader: function(extent, resolution, projection){
            requestRelations(extent, resolution, projection);
            },
        strategy: ol.loadingstrategy.bbox
    });
                
	attribution = new ol.control.Attribution({
		collapsible: false, collapsed: false})
		
	map = new ol.Map({
		layers: [
				new ol.layer.Tile({
					name: 'snowmap',
					source: new ol.source.XYZ({
						url: "http://tiles.opensnowmap.org/base_snow_map/{z}/{x}/{y}.png?debug1",
						attributions: [
							new ol.Attribution({
							html: 'Opensnowmap.org CC-BY-SA' 
							+' - EU-DEM produced using Copernicus data and information funded by the EU. ' 
							+' - ASTER GDEM is a product of METI and NASA.'
							+' - data (c) OpenStreetMap.org & contributors'
							}),
							ol.source.OSM.ATTRIBUTION
							],
						}),
					visible: true,
					opacity: 0.7
				}),
				
				new ol.layer.Tile({
					name: 'pistes',
					source: new ol.source.XYZ({
						url: "http://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png",
						attributions: [
							new ol.Attribution({
							html: 'Opensnowmap.org CC-BY-SA' 
							+' - data (c) OpenStreetMap.org & contributors'
							}),
							ol.source.OSM.ATTRIBUTION
							],
						}),
                    maxResolution: 500,
					visible: true,
                    opacity: 0.8
				}), 
                
        new ol.layer.Vector ({
                    name: 'relations',
                    source: vectorSource,
                    visible: true,
                    opacity: 1
                })

		],
		target: 'map',
		view: new ol.View({
			center: ol.proj.fromLonLat(center, 'EPSG:3857'),
			zoom: zoom,
			maxZoom: 18
		}),
		logo: false,
		controls: ol.control.defaults({ attribution: false, rotate: false }).extend([attribution]),
		interactions: ol.interaction.defaults({altShiftDragRotate:false, pinchRotate:false})
		
	});
	// MAP EVENTS
	map.on('moveend', function(e) {
    vectorSource.clear(false); // Otherwise won't reload at zoomin, which is an issue if you get below z12. Bear with two load at zoomout & pan, or write your own strategy. A short lock in the request avoid most double calls.
    updatePermalink();
    });
    
    updatePermalink();
    styleLayerButtons();
}

var updatePermalink = function() {
	//~ vectorSource.clear(false);
    
	var view = map.getView();
	var zoom=view.getZoom();
	var center = view.getCenter();
	
	center = ol.proj.fromLonLat(ol.proj.toLonLat(center,'EPSG:3857'), 'EPSG:4326')
	var hash = '#map=' +
		zoom + '/' +
		Math.round(center[0] * 1000) / 1000 + '/' +
		Math.round(center[1] * 1000) / 1000 + '/';

    var relList="";
    for (var r in relationOffsets) {
        if (relationOffsets[r] !=0){
            relList+=r+":"+relationOffsets[r]+":|"
        }
    }
    relList=relList.replace(/#/g,'');
    
    hash+=relList;
    
	var state = {
		zoom: zoom,
		center: center,
		rotation: view.getRotation()
	};
	window.history.pushState(state, 'map', hash);
	//file:///home/yves/OPENSNOWMAP/www.git/dev.opensnowmap.org/offseter/new_offsetter.html#map=16/6.382/46.764/1482062:0:orange|1970150:0:blue|1970151:0:green|1970152:0:purple|1970153:0:purple|7921593:0:purple|2065811:0:blue|2726388:0:cyan|1982237:0:red|
};

function page_init() {

}

function showList(){
	// don't forget 'return false;' in onclick to avoid parent refresh
	text="";
	for (var r in relationOffsets) {
		if (relationOffsets[r] && relationOffsets[r] != 0){
			text+="-"+r+";"+relationOffsets[r]+"\n";
		}
	}
	var newtab = window.open('text/plain');
	newtab.document.write("\n<pre>");
	newtab.document.write("\n#"+Date()+"\n");
	newtab.document.write(text);
	newtab.document.write("</pre>"+"\n");
	newtab.document.write("<a href=\""+window.location+"\"> preview </a>");

}
function updateRelationList(){
	html = '';
  ids=[]
	for (var t=0;t<relationList.length;t++) {
    if (! ids.includes(relationList[t]['id']) ) {
      ids.push(relationList[t]['id'])
      html += '<div class="route"><p style="color:'+relationList[t]['color']+'">'
      +String(relationOffsets[relationList[t]['id']]).padStart(4, '\xa0') 
      +'&nbsp;&nbsp;'
      +'<a class="box" onClick="offset('+relationList[t]['id']
      +   ',15,\'left\');">&nbsp;&laquo;&nbsp;</a>&nbsp;'
      +'<a class="box" onClick="offset('+relationList[t]['id']
      +   ',15,\'right\');">&nbsp;&raquo;&nbsp;</a>&nbsp;'
      + relationList[t]['id'] 
      +'-'+relationList[t]['name']
      +'</p></div>';
    }
	}
	document.getElementById("content").innerHTML=html;
	return true;
}

function offset(id, of, side) {
	updateOffset(id,side);
	updatePermalink();
	return true;
}
function updateOffset(id,side) {
    ids=[]
    
    for ( var t=0;t < relationList.length; t++ ) {
      if (! ids.includes(id) ) {
        
        if(relationList[t]['id'] == id){
          ids.push(id);
          if(side =='right') {
              relationOffsets[id]+=1;
          }
          if(side =='left') {
              relationOffsets[id]-=1;
          }
          
        }
    }
  }
	//permalinkOffset.updateLink();
  vectorSource.clear(false); 
  updateRelationList();
	return true;
}
function reset() {
	console.log('reset');
    relationOffsets={};
    relationList.length=0;
    vectorSource.clear(false);
    updatePermalink();
    return false;
}
function showVector() {
  if ( getLayerByName('relations').getVisible() ) {
    getLayerByName('relations').setVisible(false);
  } else {
    getLayerByName('relations').setVisible(true);
  }
    
  styleLayerButtons();
}
function showOSnM() {
  if ( getLayerByName('pistes').getVisible() ) {
    getLayerByName('pistes').setVisible(false);
  } else {
    getLayerByName('pistes').setVisible(true);
  }
    
  styleLayerButtons();
}
function toggleLayers() {
  if ( getLayerByName('relations').getVisible() ) {
    getLayerByName('relations').setVisible(false);
    getLayerByName('pistes').setVisible(true);
  } else {
    getLayerByName('pistes').setVisible(false);
    getLayerByName('relations').setVisible(true);
  } 
  styleLayerButtons();
}
function styleLayerButtons() {
  if ( getLayerByName('relations').getVisible() ) {
    document.getElementById('showVector').style.backgroundColor = '#aaa';
  } else {
    document.getElementById('showVector').style.backgroundColor = '#efefef';
  }
  if ( getLayerByName('pistes').getVisible() ) {
    document.getElementById('showOSnM').style.backgroundColor = '#aaa';
  } else {
    document.getElementById('showOSnM').style.backgroundColor = '#efefef';
  }
}

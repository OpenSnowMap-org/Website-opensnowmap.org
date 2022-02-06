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
    if (map.getView().getZoom() < 12) {return true;}
    
    vectorSource.clear();
     var proj = projection.getCode();
     var bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
     var url = '/request?group=true&geo=true&list=true&sort_alpha=true' +
         '&bbox=' + bbox.join(',');
     var xhr = new XMLHttpRequest();
     xhr.open('GET', url);
     var onError = function() {
       //vectorSource.removeLoadedExtent(extent);
     }
     
     xhr.onerror = onError;
     
     xhr.onload = function() {
       if (xhr.status == 200) {
            relationList.length = 0;
            var resp = xhr.responseText;
            jsonPisteList = JSON.parse(resp);
            for (p = 0; p < jsonPisteList.pistes.length; p++) {
                var element = jsonPisteList.pistes[p];
                
                if (element.type == 'relation'){
                    
                    var rel=[];
                    rel['name']=element.name;
                    rel['color']=element.color.split(";")[0];
                    rel['id'] =element.ids[0];
                    
                    if ( ! relationOffsets[ rel['id'] ]) {relationOffsets[ rel['id'] ] =0;}
                    rel['of'] = relationOffsets[ rel['id'] ]; 
                    
                    relationList.push(rel);
                    updateRelationList();
                    
                    var stroke= new ol.style.Stroke({
                               color: element.color.split(";")[0],
                               width: 3
                             });
                    var style = new ol.style.Style({
                        stroke: stroke
                    });
                    var geom = new ol.geom.MultiLineString();
                    for (l=0; l < element.geometry.length; l++){
                        var f = vectorSource.getFormat().readFeature(element.geometry[l],
                         {dataProjection: 'EPSG:4326',
                          featureProjection: 'EPSG:3857'
                        });
                        var line = f.getGeometry();
                        var coords = [];
                        var counter = 0;
                        var dist = rel['of'] * (3+0.5) * map.getView().getResolution();
                        line.forEachSegment(function(from, to) {
                            var angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
                            var newFrom = [
                                Math.sin(angle) * dist + from[0],
                                -Math.cos(angle) * dist + from[1]
                            ];
                            var newTo = [
                                Math.sin(angle) * dist + to[0],
                                -Math.cos(angle) * dist + to[1]
                            ];
                            coords.push(newFrom);
                            coords.push(newTo);
                        });
                        
                        geom.appendLineString(new ol.geom.LineString(coords));
                    }
                    
                    var feature = new ol.Feature({
                        geometry: geom,
                        osm_id: element.ids[0]
                        });
                    feature.setStyle(style);
                    vectorSource.addFeature(feature);
                    
                    

                }
                }
        } else {
         onError();
       }
     };
     xhr.send();
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
					visible: true
				}),
				
				new ol.layer.Tile({
					name: 'pistes',
					source: new ol.source.XYZ({
						url: "http://tiles.opensnowmap.org/tiles-pistes/{z}/{x}/{y}.png",
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
                    opacity: 0.1
				}), 
                
                new ol.layer.Vector ({
                    name: 'relations',
                    source: vectorSource,
					visible: true
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
	map.on('moveend', updatePermalink);
    updatePermalink();
}

var updatePermalink = function() {
	
	vectorSource.clear();
    
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
	/*for (var t in relationList) 
    {
        if (relationOffsets[relationList[t]['id']] !=0) {
        relList+=relationList[t]['id']+":"
            +relationOffsets[relationList[t]['id']]
            +":"+relationList[t]['color']+"|";
        }
	}*/
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
	for (var t=0;t<relationList.length;t++) {
		html += '<p style="color:'+relationList[t]['color']+
		'">'+relationOffsets[relationList[t]['id']] +
		'&nbsp;&nbsp;<a class="box" onClick="offset('+relationList[t]['id']+',15,\'left\');">&nbsp;&laquo;&nbsp;</a>&nbsp;'+
		'<a class="box" onClick="offset('+relationList[t]['id']+',15,\'right\');">&nbsp;&raquo;&nbsp;</a>&nbsp;'+
		relationList[t]['id'] +'-'+relationList[t]['name']+'</p>';
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
    for ( var t=0;t < relationList.length; t++ ) {
        if(relationList[t]['id'] == id){
        if(side =='right') {
            relationOffsets[id]-=1;
        }
        if(side =='left') {
            relationOffsets[id]+=1;
        }
        }
  }
	//permalinkOffset.updateLink();
    updateRelationList();
	return true;
}
function reset() {
    relationOffsets={};
    relationList.length=0;
    vectorSource.clear();
    return false;
}

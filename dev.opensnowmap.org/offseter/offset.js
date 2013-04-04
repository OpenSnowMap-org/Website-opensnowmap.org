var server="http://"+window.location.host+"/";

var lon=6.1;
var lat=46.4;
var zoom= 8; 
var offsetArgs='';
var pistesLayer;
var tilesLayer;
var relationOffsets=[];
var relationList=[];
var OFFSET_DIR=1;
var map;
var permalinkOffset;
var permalinkReset;
var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
var toProjection   = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection

function permalinkOffsetArgs() {
	// create additionnal parameters in permalink
    var args = 
	OpenLayers.Control.Permalink.prototype.createParams.apply(this, arguments);
	var relList="";
	for (var t in relationList) {
		relList+=relationList[t]['id']+":"+relationOffsets[relationList[t]['id']]+":"+relationList[t]['color']+"|";
	}
	relList=relList.replace(/#/g,'');
	args['offsets']=relList;
    return args;
}
function permalinkResetArgs() {
	// delete additionnal parameters in permalink
    var args = 
	OpenLayers.Control.Permalink.prototype.createParams.apply(this, arguments);
	args['offsets']='';
    return args;
}

function showList(){
	// don't forget 'return false;' in onclick to avoid parent refresh
	text="";
	for (r in relationOffsets) {
		if (relationOffsets[r] != 0){
			text+=r+";"+relationOffsets[r]+"\n";
		}
	}
	var newtab = window.open('text/plain');
	newtab.document.write("\n<pre>");
	newtab.document.write("\n#"+Date()+"\n");
	newtab.document.write(text);
	newtab.document.write("</pre>"+"\n");
	newtab.document.write("<a href=\""+$("permalinkOffset").href+"\"> preview </a>");

}
function offset(id, of, side) {
	updateOffset(id,side);
	tilesLayer.redraw();
	return true;
}

function requestRelations() {
	var XMLHttp = new XMLHttpRequest();
	XMLHttp.open("GET", server+"offset-list_routes?bbox="+map.getExtent().toBBOX(), false);
	XMLHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	XMLHttp.send();
	if (XMLHttp.status === 200) {
		var text = XMLHttp.responseText;
		var rels = text.split('|');
		rels.pop();
		list_relations(rels);
	}

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
	permalinkOffset.updateLink();
  updateRelationList();
	return true;
}

function list_relations(rels) {
	relationList.length = 0;
	for(r in rels) {
		var rel=[];
		rel['name']=rels[r].split(':')[0];
		rel['color']=rels[r].split(':')[1];
		rel['id'] =rels[r].split(':')[2];
		if ( ! relationOffsets[ rel['id'] ]) {relationOffsets[ rel['id'] ] =0;}
		rel['of'] = relationOffsets[ rel['id'] ]; 
		relationList.push(rel);
	}
	updateRelationList();
	return true;
}
function buildRelationListFromArgs(offsetArgs) {
	relationOffsets.length = 0;
	var list=offsetArgs.split('|');
	for (var i=0; i < list.length-1; i++){
		var id = parseInt(list[i].split(':')[0]);
		relationOffsets[id] = parseInt(list[i].split(':')[1]);
	}
	
}
function updateRelationList(){
	html = '';
	for (var t=0;t<relationList.length;t++) {
		html += '<p style="color:'+relationList[t]['color']+
		'">'+relationOffsets[relationList[t]['id']] +
		'&nbsp;&nbsp;<a onClick="offset('+relationList[t]['id']+',15,\'left\');">--</a>&nbsp;'+
		'<a onClick="offset('+relationList[t]['id']+',15,\'right\');">++</a>&nbsp;'+
		relationList[t]['id'] +'-'+relationList[t]['name']+'</p>';
	}
	$("content").innerHTML=html;
	return true;
}
function get_extended_osm_url(bounds) {
	
	var relList="";
	for (var t in relationList) {
		relList+=relationList[t]['id']+":"+relationOffsets[relationList[t]['id']]+":"+relationList[t]['color']+"|";
	}
	relList=relList.replace(/#/g,'');
    var res = this.map.getResolution();
    var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
    var y = Math.round((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
    var z = this.map.getZoom();
    var limit = Math.pow(2, z);

    if (y < 0 || y >= limit) {
        return OpenLayers.Util.getImagesLocation() + "404.png";
    } else {
        x = ((x % limit) + limit) % limit;
        return this.url +relList+'/'+ z + "/" + x + "/" + y + ".png";
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


// Redirect permalink
if (location.search != "") {
    //?zoom=13&lat=46.82272&lon=6.87183&layers=B0TT
    var x = location.search.substr(1).split("&")
    for (var i=0; i<x.length; i++)
    {
        if (x[i].split("=")[0] == 'zoom') {zoom=x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'lon') {lon=x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'lat') {lat=x[i].split("=")[1];}
        if (x[i].split("=")[0] == 'offsets') {offsetArgs=unescape(x[i].split("=")[1]);}
    }
	if (offsetArgs.length !=0){buildRelationListFromArgs(offsetArgs);}
    //Then hopefully map_init() will do the job when the map is loaded
}

function init() {
map_init();
}

function map_init() {
	
	var options = {
	  controls: [
		new OpenLayers.Control.Navigation(),
		new OpenLayers.Control.PanZoomBar(),
		new OpenLayers.Control.Attribution(),
		new OpenLayers.Control.LayerSwitcher()
	  ],
	maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
	maxResolution: 156543.0399,
	numZoomLevels: 19,
	units: 'm',
	projection: new OpenLayers.Projection("EPSG:900913"),
	displayProjection: new OpenLayers.Projection("EPSG:4326")
	};
	
	map = new OpenLayers.Map("basicMap", options);
	
	
//	var mapnik         = new OpenLayers.Layer.OSM();
//	map.addLayer(mapnik);
	
	
	
	var arrayMapQuest = ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
						 "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
						 "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
						 "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"];
	var mapquest = new OpenLayers.Layer.OSM("MapQuest",arrayMapQuest);
	map.addLayer(mapquest);
	
	var position = new OpenLayers.LonLat(lon, lat).transform( fromProjection, toProjection);
	map.setCenter(position, zoom );
	
	requestRelations();
    var PistesTilesLowZoom = new OpenLayers.Layer.XYZ(
		  "Pistes Tiles LZ",
		  "http://tiles.pistes-nordiques.org/tiles-pistes/",{
		  getURL: get_osm_url, 
		  isBaseLayer: false, numZoomLevels: 19,
		  visibility: true, opacity: 0.8,
		  maxScale: 1000000
		  });
    map.addLayer(PistesTilesLowZoom);
	
	tilesLayer = new OpenLayers.Layer.XYZ("mapnik",
	server+"offset-renderer?",{
			getURL: get_extended_osm_url, 
			isBaseLayer: false,
			minScale: 1000000
	});
	map.addLayer(tilesLayer);	

	
	map.events.register("zoomend", null, 
						function() {
						requestRelations();
						});
	map.events.register("moveend", null, 
						function() {
						requestRelations();
						tilesLayer.redraw();
						});
	
	permalinkReset = new OpenLayers.Control.Permalink('permalinkReset',window.href,{'createParams': permalinkResetArgs})
	map.addControl(permalinkReset);
	
	permalinkOffset = new OpenLayers.Control.Permalink('permalinkOffset',window.href,{'createParams': permalinkOffsetArgs})
	map.addControl(permalinkOffset);
	
}


var server="http://"+window.location.host+"/";

var lon=6.1;
var lat=46.4;
var zoom= 8; 
var pistesLayer;
var vectorLayer;
var map;
var full_list;
var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
var toProjection   = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
var PisteAPIXHR=[]; // to abort
var jsonPisteList;
var site_div;

var draw;
var modify;

var blue = {
    fill: true,
    fillColor: "#ADD8E6",
    fillOpacity: 0.3,
    strokeColor: "#FF2C00",
    strokeWidth: 1
};
var red = {
    fill: true,
    strokeColor: "#FF2C00",
    strokeWidth: 5
};

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
    }
    //Then hopefully map_init() will do the job when the map is loaded
}

function init() {
map_init();
}
function abortXHR() {
	// Abort ongoing requests before sending a new one
	// Failing this, long requests results would be displayed over newer faster
	// ones.
		for (var i = 0; i < PisteAPIXHR.length; i++) {
			PisteAPIXHR[i].abort();
		
		PisteAPIXHR.length = 0;
	}
	return true;
}
function map_init() {
	
	var options = {
	  controls: [
		new OpenLayers.Control.Navigation(),
		new OpenLayers.Control.PanZoomBar(),
		new OpenLayers.Control.Attribution(),
		new OpenLayers.Control.LayerSwitcher(),
		new OpenLayers.Control.Permalink()
		
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
	
    pistesLayer = new OpenLayers.Layer.XYZ(
		  "Pistes Tiles LZ",
		  "http://www.opensnowmap.org/tiles-pistes/",{
		  getURL: get_osm_url, 
		  isBaseLayer: false, numZoomLevels: 19,
		  visibility: true, opacity: 1
		  });
	map.addLayer(pistesLayer);
	
	vectorLayer = new OpenLayers.Layer.Vector("vector");
	map.addLayer(vectorLayer);
	
	drawFeat = new OpenLayers.Control.DrawFeature(vectorLayer,OpenLayers.Handler.Polygon);
	map.addControl(drawFeat);
	
	drawFeat.events.register('featureadded', drawFeat, function (e) 
	{
		drawFeat.deactivate();
		modifyFeat.activate();
	}); 
	
	modifyFeat = new OpenLayers.Control.ModifyFeature(vectorLayer);
	map.addControl(modifyFeat);
	
	
}
function draw() {
	vectorLayer.destroyFeatures();
	drawFeat.activate();
	modifyFeat.deactivate();
}
function clearDrawings() {
	vectorLayer.destroyFeatures();
	modifyFeat.deactivate();
}


function findPistes() {
	if (vectorLayer.features.length == 1) {
		if (vectorLayer.features[0].geometry.getArea() < 5000000000){
			var wkt=new OpenLayers.Format.WKT();
			var wktPoly= vectorLayer.features[0].geometry.transform(toProjection, fromProjection).toString();
			document.getElementById("content").innerHTML=wktPoly;
			requestPisteInPoly(wktPoly);
		}
		else{
			alert('your polygon seems pretty big, please select it to refine.');
		}
	}
	else {
		alert('please draw a single polygon on the map.');
	}
}
function requestPisteInPoly(wktPoly) {
	abortXHR('PisteAPI'); // abort another request if any
	var q = server+"request?ids_only=true&limit=false&geo=true&group=true&poly="+wktPoly;
	var XMLHttp = new XMLHttpRequest();
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	document.getElementById("content").innerHTML ='<div id="search_results"><p><img style="margin-left: 100px;" src="../pics/snake_transparent.gif" />&nbsp;&nbsp;[Esc]</p></div>';
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			document.getElementById("content").innerHTML='<i>"'+resp+'"</i>';
		}
	}
	XMLHttp.send();
	return true;
}

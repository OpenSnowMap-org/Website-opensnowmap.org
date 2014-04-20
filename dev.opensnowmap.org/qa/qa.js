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
read_json();
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
}
function read_json() {
	var oRequest = new XMLHttpRequest();
	oRequest.open("GET",'result.json',false);
	oRequest.setRequestHeader("User-Agent",navigator.userAgent);
	oRequest.overrideMimeType("application/json");
	oRequest.send();
	full_list = JSON.parse(oRequest.responseText);
	
	var html = ''
	for (i in full_list) {
		html+='<div class="site" id="div_'+i+'">'
			html+='<div class="site_title">'
				html+='<b>'+full_list[i]['name']+'</b>'
				html+='('+i+'<img src="../pics/external-flat22.png"></img>)'
			html+='</div>'
			html+='\n<div class="clear"></div>'
			html+='<div  id="+_'+i+'" '
				html+='class="Button float-left" onclick="expandWayDiv('+i+');">'
				html+='&nbsp;+&nbsp;</div>'
			html+='<div id="-_'+i+'" '
				html+='class="Button float-left" onclick="collapseWayDiv('+i+');" style="display:none;">'
				html+='&nbsp;-&nbsp;</div>'
			html+='<div id="save_'+i+'" '
				html+='class="Button float-left" onclick="saveSite('+i+');" style="display:none;">'
				html+='<b>&nbsp;save&nbsp;</b></div>'
			html+='\n<div class="clear"></div>'
			html+='<div class="site_members" style="display:none;">'+'hidden'+'</div>'
		html+='</div>'
		html+='\n<div class="clear"></div>'
		
	document.getElementById('content').innerHTML=html;
	}
}
function expandWayDiv(id) {
	var html = ''
	for (w in full_list[id]['ways']) {
		var wayid=full_list[id]['ways'][w]
		html+='<div class="way">'
			html+='\n<div class="clear"></div>'
			html+='<div >'
				html+='Is way&nbsp;'+wayid+'<img src="../pics/external-flat22.png"></img>&nbsp;member of the relation&nbsp;'+id+'<img src="../pics/external-flat22.png"></img>&nbsp;?</br>'
			html+='</div>'
			html+='<div class="Button float-right" >'
		
	html +=' <input type="radio" id="a" class="radio" "';
	html +=' name="yes-no'+wayid+','+id+'" value="noidea,'+wayid+','+id+'" checked="true"/>';
	html +=' <label>I don\'t know</label>';
	
	html +=' <input type="radio" id="a" class="radio" "';
	html +=' name="yes-no'+wayid+','+id+'" value="is_in,'+wayid+','+id+'"/>';
	html +=' <label style="margin-top: 10px;">yes</label>';
	
	html +=' <input type="radio" id="a" class="radio" "';
	html +=' name="yes-no'+wayid+','+id+'" value="is_not_in,'+wayid+','+id+'"/>';
	html +=' <label>no</label>';
	
			html+='</div>'
			html+='<div class="Button float-right" onclick="getById(\''+id+','+wayid+'\')">'
			html+='&nbsp;see on map&nbsp;</div>'
		html+='</div>'
		html+='\n<div class="clear"></div>'
	}
	var site_div=document.getElementById('div_'+id);
	site_div.getElementsByClassName('site_members')[0].innerHTML=html;
	site_div.getElementsByClassName('site_members')[0].style.display='inline';
	document.getElementById('+_'+id).style.display='none';
	document.getElementById('save_'+id).style.display='inline';
	document.getElementById('-_'+id).style.display='inline';
	
}
function collapseWayDiv(id) {
	var site_div=document.getElementById('div_'+id);
	site_div.getElementsByClassName('site_members')[0].style.display='none';
	document.getElementById('+_'+id).style.display='inline';
	document.getElementById('save_'+id).style.display='none';
	document.getElementById('-_'+id).style.display='none';
}
function getById(ids) {
	
	abortXHR('PisteAPI'); // abort another request if any
	var q = server+"request?geo=true&topo=true&ids="+ids;
	var XMLHttp = new XMLHttpRequest();
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			jsonPisteList = JSON.parse(resp);
			var site=jsonPisteList.sites;
			var way=jsonPisteList.pistes;
			
			vectorLayer.destroyFeatures();
			
			var bbox= site[0].bbox.replace('BOX','').replace('(','').replace(')','').replace(' ',',').replace(' ',',').split(',');
			bounds = new OpenLayers.Bounds(bbox[0],bbox[1],bbox[2],bbox[3])
			map.zoomToExtent(bounds.scale(1.5).transform(new OpenLayers.Projection('EPSG:4326'),new OpenLayers.Projection('EPSG:900913')));
			
			var encPol= new OpenLayers.Format.EncodedPolyline();
			var features=[];
			var feature;
			encPol.geometryType='polygon';
			feature = encPol.read(site[0].geometry[0]);
			feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
			feature.style= blue;
			features.push(feature);
			
			encPol.geometryType='linestring';
			feature = encPol.read(way[0].geometry[0]);
			feature.geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
			feature.style= red;
			features.push(feature);
			
			vectorLayer.addFeatures(features);
		}
	}
	XMLHttp.send();
	return true;
}

function saveSite(id) {
	
	site_div=document.getElementById('div_'+id);
	var radios=site_div.getElementsByTagName('input');
	var results=[];
	
	for (r in radios) {
		if (radios[r].checked) {
			if (radios[r].value.search('noidea')==-1)
			{results.push(radios[r].value);}
		}
	}
	var text='you are about about to change OSM map as follow:\n'
	for (r in results) {
		result=results[r].split(',');
		text+='way '+result[1]+' '+result[0]+' relation '+result[2]+'\n';
	}
	var confirmed = confirm(text);
	if (confirmed) {
		alert('Change done (not working yet)');
		
		for (r in radios) {
			radios[r].disabled=true;
		}
	}
	
	
}

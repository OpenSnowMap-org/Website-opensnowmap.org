var center= ol.proj.toLonLat([7, 46],'EPSG:4326');
var zoom= 4;
var shouldUpdate = true;
var map;
var attribution;
var base_layer = "osm";

if (location.protocol != 'https:')
{
    protocol = 'http:';
} else
{
    protocol = 'https:';
}
var pistes_and_relief_overlay_URL=protocol+"//tiles.opensnowmap.org/pistes-relief/";
var pistes_only_overlay_URL=protocol+"//tiles.opensnowmap.org/pistes/";
var snow_base_layer_URL =protocol+"//tiles.opensnowmap.org/base_snow_map/";

if (window.location.hash !== '') {
	// try to restore center, zoom-level and rotation from the URL
	var hash = window.location.hash.replace('#map=', '')
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
	
		parts.forEach(function(part) {
			//~ if (part.search('marker=true') > -1) {MARKER = true;}
			if (part.search('base=snowmap') > -1) {base_layer = 'snowmap';}
			if (part.search('base=osm') > -1) {base_layer = 'osm';}
		});
	}
}
function load_print(){
	document.getElementById('controls').style.display='none';
	print();
	document.getElementById('controls').style.display='inline';
}
function switchBaseLayerTo(switchTo) {
	if (switchTo == 'osm') {
		getLayerByName('osm').setVisible(true);
		getLayerByName('snowmap').setVisible(false);
        getLayerByName('pistes&relief').setVisible(true);
        getLayerByName('pistes').setVisible(false);
		base_layer='osm';
		updatePermalink();
	}
	else if (switchTo == 'mapquest') {
		getLayerByName('osm').setVisible(false);
		getLayerByName('snowmap').setVisible(true);
            getLayerByName('pistes&relief').setVisible(false);
            getLayerByName('pistes').setVisible(true);
		base_layer='snowmap';
		updatePermalink();
	}
	
}
function getLayerByName(name) {
	var l = null;
	map.getLayers().forEach(function(layer) {
		if (layer.get('name') == name) {l = layer;}
	});
	return l
}

function map_init(){

	attribution = new ol.control.Attribution({
		collapsible: false, collapsed: false})
		
	map = new ol.Map({
		layers: [
				new ol.layer.Tile({
					name: 'snowmap',
					source: new ol.source.XYZ({
						url: snow_base_layer_URL+"{z}/{x}/{y}.png",
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
					name: 'osm',
					source: new ol.source.OSM(),
					visible: false
				}),
				
				new ol.layer.Tile({
					name: 'pistes&relief',
					source: new ol.source.XYZ({
						url: pistes_and_relief_overlay_URL+"{z}/{x}/{y}.png",
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
					visible: false
				}),
				
				new ol.layer.Tile({
					name: 'pistes',
					source: new ol.source.XYZ({
						url: pistes_only_overlay_URL+"{z}/{x}/{y}.png",
						attributions: [
							new ol.Attribution({
							html: 'Opensnowmap.org CC-BY-SA' 
							+' - data (c) OpenStreetMap.org & contributors'
							}),
							ol.source.OSM.ATTRIBUTION
							],
						}),
                    maxResolution: 500,
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
	

	switchBaseLayerTo(base_layer);

	// MAP EVENTS
	map.on('moveend', updatePermalink);
	
}

var updatePermalink = function() {
	
	if (!shouldUpdate) {
		// do not update the URL when the view was changed in the 'popstate' handler
		shouldUpdate = true;
		return;
	}
	
	var view = map.getView();
	var zoom=view.getZoom();
	var center = view.getCenter();
	
	center = ol.proj.fromLonLat(ol.proj.toLonLat(center,'EPSG:3857'), 'EPSG:4326')
	var hash = '#map=' +
		zoom + '/' +
		Math.round(center[0] * 1000) / 1000 + '/' +
		Math.round(center[1] * 1000) / 1000 + 
		'&base='+base_layer;
	var state = {
		zoom: zoom,
		center: center,
		rotation: view.getRotation()
	};
	window.history.pushState(state, 'map', hash);
	//~ document.getElementsByClassName('ol-zoomslider-thumb')[0].innerHTML=zoom;
};


function page_init() {
	
	var print_page = document.getElementById('print_map');
	print_page.addEventListener('click', function(e) {
		load_print();
	}, false);
	

	var portrait_big = document.getElementById('portrait_big');
	portrait_big.addEventListener('click', function(e) {
		window.resizeTo(window.outerWidth,window.outerWidth*30/21);
	}, false);
	
	var landscape_big = document.getElementById('landscape_big');
	landscape_big.addEventListener('click', function(e) {
		window.resizeTo(window.outerWidth,window.outerWidth*21/30);
	}, false);
	

}


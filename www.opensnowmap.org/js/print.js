var center= ol.proj.fromLonLat([6, 42]);
var zoom= 4;
var shouldUpdate = true;
var map;
var attribution;

if (window.location.hash !== '') {
  // try to restore center, zoom-level and rotation from the URL
  var hash = window.location.hash.replace('#map=', '');
  var parts = hash.split('/');
  if (parts.length === 4) {
    zoom = parseInt(parts[0], 10);
    center = [
      parseFloat(parts[1]),
      parseFloat(parts[2])
    ];
    center = ol.proj.fromLonLat(ol.proj.toLonLat(center,'EPSG:4326'), 'EPSG:3857')
    rotation = parseFloat(parts[3]);
  }
}
function load_print(){
	document.getElementById('controls').style.display='none';
	print();
	document.getElementById('controls').style.display='inline';
}


function map_init(){
	attribution = new ol.control.Attribution({
		collapsible: false, collapsed: false})
	
      map = new ol.Map({
        target: 'map',
        layers: [
          new ol.layer.Tile({
            source: new ol.source.XYZ({
				url: "http://otile{1-4}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.jpg",
				attributions: [new ol.Attribution({
					html:'<a target="_blank" href="http://www.mapquest.com/">MapQuest</a><img src="pics/mq_logo_xs.png">.'
					})],
					visible: false
				})
          }),
          new ol.layer.Tile({
            source: new ol.source.OSM(),
            visible: true
          }),
          new ol.layer.Tile({
            source: new ol.source.XYZ({
				url: "http://www.opensnowmap.org/opensnowmap-overlay/{z}/{x}/{y}.png",
				  attributions: [
					new ol.Attribution({
					html: '</br>EU-DEM produced using Copernicus data and information funded by the European Union. ' 
					+'ASTER GDEM is a product of METI and NASA.'
					}),
					ol.source.OSM.ATTRIBUTION
					],
				})
          })
        ],
        view: new ol.View({
          center: center,
          zoom: zoom,
          maxZoom: 18
        }),
        controls: ol.control.defaults({ attribution: false }).extend([attribution])
      });
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
	      Math.round(center[1] * 1000) / 1000 + '/' +
	      view.getRotation();
	  var state = {
	    zoom: zoom,
	    center: view.getCenter(),
	    rotation: view.getRotation()
	  };
	  window.history.pushState(state, 'map', hash);
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


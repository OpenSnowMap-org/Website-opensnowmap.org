
var PisteAPIXHR=[]; // to abort

var server="http://"+window.location.host+"/";

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
"sleigh":'pics/sleigh.png',
"snow_park":'pics/snow_park.png',
"ski_jump":'pics/jump.png'

}
var diffcolor = {
"novice":'green',
"easy":'blue',
"intermediate":'red',
"advanced":'black',
"expert":'orange',
"freeride":'E9C900'
}
var diffcolorUS = {
"novice":'green',
"easy":'green',
"intermediate":'blue',
"advanced":'black',
"expert":'black',
"freeride":'#E9C900'
}

function abortXHR(type) {
	// Abort ongoing requests before sending a new one
	// Failing this, long requests results would be displayed over newer faster
	// ones.
	if (type == 'GetProfile') {
		for (var i = 0; i < GetProfileXHR.length; i++) {
			GetProfileXHR[i].abort();
		}
		GetProfileXHR.length = 0;
	}
	else if (type == 'PisteAPI') {
		for (var i = 0; i < PisteAPIXHR.length; i++) {
			PisteAPIXHR[i].abort();
		}
		PisteAPIXHR.length = 0;
	}
	return true;
}

function on_load(osm_id) {

	var statsdiv = document.getElementById('stats');
	statsdiv.innerHTML='<p><img style="margin-left: 100px;" src="/pics/snake_transparent.gif" />&nbsp;&nbsp;</p>';
	
	abortXHR('PisteAPI'); // abort another request if any
	
	var q = server+"request?site-stats="+osm_id;
	var XMLHttp = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp);
	
	XMLHttp.open("GET", q);
	XMLHttp.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp.onreadystatechange= function () {
		if (XMLHttp.readyState == 4) {
			var resp=XMLHttp.responseText;
			var jsonStats = JSON.parse(resp);
			statsdiv.innerHTML=makeHTMLStats(jsonStats);
		}
	}
	XMLHttp.send();
	
	var listdiv = document.getElementById('pisteList');
	listdiv.innerHTML ='<p><img style="margin-left: 100px;" src="/pics/snake_transparent.gif" />&nbsp;&nbsp;</p>';
	
	var q2 = server+"request?parent=true&geo=true&list=true&sort_alpha=true&group=true&members="+osm_id;
	var XMLHttp2 = new XMLHttpRequest();
	
	PisteAPIXHR.push(XMLHttp2);
	
	XMLHttp2.open("GET", q2);
	XMLHttp2.setRequestHeader("Content-type", "application/json; charset=utf-8");
	
	XMLHttp2.onreadystatechange= function () {
		if (XMLHttp2.readyState == 4) {
			var resp2=XMLHttp2.responseText;
			var jsonPisteList = JSON.parse(resp2);
			listdiv.innerHTML=makeHTMLPistesList(jsonPisteList);
		}
	}
	XMLHttp2.send();
}

function makeHTMLStats(jsonStats) {
	var html='';
	if (jsonStats['site'] != null) {
		html+='<p><table class="tableStats" style="vertical-align: middle;text-align: center;">';
		
		html+='<tr><td class="tdStats">';
		html+='<img src="/pics/alpine-nb-20.png" >&nbsp;';
		html+=(parseFloat(jsonStats['downhill'])/1000).toFixed(1)+'&nbsp;km<br/>';
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/skitour-nb-20.png" >&nbsp;';
		html+=(parseFloat(jsonStats['skitour'])/1000).toFixed(1)+'&nbsp;km<br/>';
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/snowpark-nb-20.png" >&nbsp;';
		if (jsonStats['snow_park'] != 0) {html+='<font color="green">&nbsp;&#9679;<font/>';}
		else {html+='<font color="red">&nbsp;x<font/>';}
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/jump-nb-20.png" >&nbsp;';
		if (jsonStats['jump'] != 0) {html+='<font color="green">&nbsp;&#9679;<font/>';}
		else {html+='<font color="red">&nbsp;x<font/>';}
		html+='</td></tr>';
		
		html+='<tr><td class="tdStats">';
		html+='<img src="/pics/nordic-nb-20.png" >&nbsp;';
		html+=(parseFloat(jsonStats['nordic'])/1000).toFixed(1)+'&nbsp;km<br/>';
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/sled-nb-20.png" >&nbsp;';
		html+=(parseFloat(jsonStats['sled'])/1000).toFixed(1)+'&nbsp;km<br/>';
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/playground-nb-20.png" >&nbsp;';
		if (jsonStats['playground'] != 0) {html+='<font color="green">&nbsp;&#9679;<font/>';}
		else {html+='<font color="red">&nbsp;x<font/>';}
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/sleigh-nb-20.png" >&nbsp;';
		if (jsonStats['sleigh'] != 0) {html+='<font color="green">&nbsp;&#9679;<font/>';}
		else {html+='<font color="red">&nbsp;x<font/>';}
		html+='</td></tr>';
		
		html+='<tr><td class="tdStats">';
		html+='<img src="/pics/drag_lift-nb-20.png" >&nbsp;';
		html+=(parseFloat(jsonStats['lifts'])/1000).toFixed(1)+'&nbsp;km<br/>';
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/snowshoe-nb-20.png" >&nbsp;';
		html+=(parseFloat(jsonStats['hike'])/1000).toFixed(1)+'&nbsp;km<br/>';
		html+='</td><td class="tdStats">';
		html+='<img src="/pics/iceskate-nb-20.png" >&nbsp;';
		if (jsonStats['ice_skate'] != 0) {html+='<font color="green">&nbsp;&#9679;<font/>';}
		else {html+='<font color="red">&nbsp;x<font/>';}
		html+='</td></tr>';
		html+='</table></p>';
	}
	return html;
}

function makeHTMLPistesList(jsonPisteList) {
	var html='';
	if (jsonPisteList['sites'] != null) {
		for (p in jsonPisteList['sites']) {
			var site=jsonPisteList['sites'][p];
			var name = site.name;
			if (name==' '){name=' x ';}
			html+='<hr class="light">';
			html+='<div class="pisteListElement">\n ';
				var pic;
				if (site.pistetype) {
					var types=site.pistetype.split(';');
					for (t in types) {
						pic =icon[types[t]];
						if (pic) {
							html+='<img src="/'+pic+'" style="vertical-align: middle;">&nbsp;\n';
						}
					}
				}
				html+='	&nbsp;<b >'+name+'</b>\n';
			html+='\n</div>' //pisteListElement
			
		}
	}
	html+='<hr class="light">';
	
	if (jsonPisteList['pistes'] != null) {
		for (p in jsonPisteList['pistes']) {
			var piste=jsonPisteList['pistes'][p];
			var pic;
			if (piste.pistetype) {pic =icon[piste.pistetype];}
			else {pic =icon[piste.aerialway];}
			var color='';
			if (piste.color) {
				color ='&nbsp;<b style="color:'+piste.color+';font-weight:900;">&nbsp;&#9679; </b>';
			}
			var lon = piste.center[0];
			var lat = piste.center[1];
			var difficulty='';
			if (piste.difficulty) {
				var marker = '&#9679;'
				if (lat>0 && lon <-40) {
					if (piste.difficulty =='expert') {marker = '&diams;';}
					if (piste.difficulty =='advanced') {marker = '&diams;&diams;';}
					if (piste.difficulty =='freeride') {marker = '!!';}
					difficulty='&nbsp;('+_(piste.difficulty)+'<b style="color:'+diffcolorUS[piste.difficulty]+';font-weight:900;">&nbsp;'+marker+'&nbsp;</b>)';
				}
				else {
					if (piste.difficulty =='freeride') {marker = '!';}
					difficulty='&nbsp;('+_(piste.difficulty)+'<b style="color:'+diffcolor[piste.difficulty]+';font-weight:900;">&nbsp;'+marker+'&nbsp;</b>)';
				}
			}
			var name = piste.name;
			if (name==' '){name=' - ';}
			html+='<div class="pisteListElement">\n';
				if (pic) {
					html+='&nbsp;<img src="/'+pic+'" style="float:left;vertical-align: middle;">&nbsp;\n';
				}
				html+='	<div style="float:left;">&nbsp;'+color+name+difficulty+'</div>\n';
			html+='\n</div>\n'; // pisteListElement
			html+='<hr class="light">';
		}
	}
	
	if (jsonPisteList['limit_reached']) {
		html+='<p>'+jsonPisteList['info']+'</p>\n'
	}
	html+='\n</div>'
	return html
}

function _(a) {
	return a;
}

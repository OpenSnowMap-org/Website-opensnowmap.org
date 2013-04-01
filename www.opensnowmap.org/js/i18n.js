var locs = [ "cz","de","en","es","fi","fr","hu","it","nl","no","ru","se"];
var iloc= 0;
var locale;
var iframelocale;
//localization

// Get the locale first: from cookie if set
if (getCookie("l10n")!="") {
	locale = getCookie("l10n");
}
// No cookie, check for browser locale
else {locale = get_locale().split('-')[0];} //return only 'en' from 'en-us'

// only a few iframe content pages are translated:
if (locale != 'en' && locale !='fr') { iframelocale = 'en';}
else { iframelocale = locale;}

// Load the localized strings
var oRequest = new XMLHttpRequest();
oRequest.open("GET",'i18n/'+locale+'.json',false);
oRequest.setRequestHeader("User-Agent",navigator.userAgent);
oRequest.send();
var i18n = eval('('+oRequest.responseText+')');

// Translating function
function _(s) {
	if (typeof(i18n)!='undefined' && i18n[s]) {
		return i18n[s];
	}
	return s;
}

// this get the browser install language, not the one set in preference
function get_locale() {
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
}

function getCookie(c_name){
	if (document.cookie.length>0)
	  {
	  var c_start=document.cookie.indexOf(c_name + "=");
	  if (c_start!=-1)
		{
		c_start=c_start + c_name.length+1;
		var c_end=document.cookie.indexOf(";",c_start);
		if (c_end==-1) c_end=document.cookie.length;
		return unescape(document.cookie.substring(c_start,c_end));
		}
	  }
	return "";
}

//set the language in a cookie, then reload
function setlanguage(what){
	document.cookie="l10n="+what;
	var linkto = document.getElementById('permalink').href;
	window.location.href = linkto;
}
// Show langage bar
function initFlags(){
	var max=4;
	var html='';
	html+= '<a id="" onclick="show_languages();">'
		+'<img style="margin: 0 4px 0 4px;" src="pics/flags/'+locale+'.png"></a>';
	html+='<a onclick="show_languages();" '
		+ 'style="margin: 0 2px 0 2px;font-size:1.5em;font-weight:200;">&#187;</a>';
	document.getElementById('langs').innerHTML = html;
}

function show_languages() {
	document.getElementById('sideBar').style.display='inline';
	document.getElementById('sideBarContent').style.display='inline';
	document.getElementById('sideBarTitle').innerHTML='<img style="margin: 2px 4px 2px 4px;vertical-align: middle;" src="pics/flags/'+locale+'.png">'+_('lang').replace('<br/>',' ');
	html = ''
	for (l=0; l<locs.length; l++ ){
		html += '<a id="" onclick="setlanguage(\''+locs[l]+'\');">'
			 +'<img style="margin: 10px 2px 10px 20px;vertical-align: middle;" src="pics/flags/'+locs[l]+'.png">'+locs[l]+'</a>';
	}
	document.getElementById('sideBarContent').innerHTML=html;
}

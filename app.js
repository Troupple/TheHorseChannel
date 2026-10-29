const languageStorageKey="horse-channel-language-v2";
const savedLanguage=localStorage.getItem(languageStorageKey);
let languageMode=["fr","fr-en"].includes(savedLanguage)?savedLanguage:"en";
let language=languageMode==="fr-en"?"fr":languageMode;
let translations=null;
const translationsReady=fetch("/json/translations.json").then(response=>{
  if(!response.ok)throw new Error("Translation request failed ("+response.status+")");
  return response.json();
}).then(data=>{
  if(!data||!data.en||!data.fr||!data.en.strings||!data.fr.strings)throw new Error("Translation data must contain English and French strings.");
  translations=data;
}).catch(error=>{
  console.error("Could not load translations.",error);
});
function translationLanguage(){
  return language==="en"?"en":"fr";
}
function tr(key,values={},fallback=key){
  let text=translations&&translations[translationLanguage()].strings[key]||fallback;
  for(const [name,value] of Object.entries(values))text=text.replaceAll("{"+name+"}",String(value));
  return text;
}
function weatherTr(key,values={},fallback=key){
  return tr(key,values,fallback);
}
function applyLanguage(){
  document.documentElement.lang=language==="en"?"en":"fr";
  document.documentElement.dataset.language=language;
  document.title=tr("page-title",{},"The Horse Channel");
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=tr(el.dataset.i18n,{},el.textContent);});
  document.querySelectorAll("[data-weather-i18n]").forEach(el=>{el.textContent=weatherTr(el.dataset.weatherI18n,{},el.textContent);});
  for(const attr of ["aria-label","alt","placeholder"]){
    const dataKey="i18n"+attr.split("-").map(part=>part[0].toUpperCase()+part.slice(1)).join("");
    document.querySelectorAll("[data-i18n-"+attr+"]").forEach(el=>{el.setAttribute(attr,tr(el.dataset[dataKey],{},el.getAttribute(attr)));});
  }
  const languageEN=$("#languageEN"),languageFR=$("#languageFR"),languageFREN=$("#languageFREN");
  languageEN.setAttribute("aria-pressed",String(languageMode==="en"));
  languageFR.setAttribute("aria-pressed",String(languageMode==="fr"));
  languageFREN.setAttribute("aria-pressed",String(languageMode==="fr-en"));
  titles.splice(0,titles.length,
    tr("screen-weather-city",{},"Weather by city"),
    tr("screen-conditions",{},"Current Conditions"),
    tr("screen-almanac",{},"Almanac"),
    tr("screen-local-forecast",{},"Local Forecast"),
    tr("screen-extended-forecast",{},"Extended Forecast"),
    tr("horse-week",{},"Horse of the Week"),
    tr("hoofcast",{},"Hoofcast")
  );
  bars[5]=titles[5];
  bars[6]=titles[6];
  renderCities();
  renderMoons();
  tick();
  if(currentHorse)setHorseOfWeek(currentHorse);
  if(loadedCredits)renderCredits();
  if(configStatusMessage)setConfigStatus(configStatusMessage.key,configStatusMessage.values,configStatusMessage.fallback);
  if(lastTrack){
    const title=lastTrack.replace(/\.mp3$/i,""),artist=lastTrack==="Deviled Eggs.mp3"?"Celarb":"Bob James";
    updateMusicTicker(tr("now-playing",{title,artist},"Now playing: {title} - {artist}"));
  }else updateMusicTicker(tr("music-waiting",{},"Music: waiting for a selection"));
  showWeather();
}
const defaultCities=[["Winnipeg",49.8844,-97.147],["Brandon",49.8483,-99.9502],["Portage",49.9728,-98.2926],["Steinbach",49.5253,-96.6845],["Selkirk",50.1439,-96.8839],["Thompson",55.7435,-97.8551]];
const worldCities=[...defaultCities,
  ["Vancouver",49.2827,-123.1207],["Calgary",51.0447,-114.0719],["Toronto",43.6532,-79.3832],["New York",40.7128,-74.006],["Boston",42.3601,-71.0589],["Washington",38.9072,-77.0369],["Chicago",41.8781,-87.6298],["Denver",39.7392,-104.9903],["Seattle",47.6062,-122.3321],["Los Angeles",34.0522,-118.2437],["San Francisco",37.7749,-122.4194],["Las Vegas",36.1699,-115.1398],["Phoenix",33.4484,-112.074],["Dallas",32.7767,-96.797],["Houston",29.7604,-95.3698],["Miami",25.7617,-80.1918],["Anchorage",61.2181,-149.9003],["Honolulu",21.3099,-157.8581],
  ["Mexico City",19.4326,-99.1332],["Guatemala City",14.6349,-90.5069],["Havana",23.1136,-82.3666],["Panama City",8.9824,-79.5199],["Bogota",4.711,-74.0721],["Quito",-0.1807,-78.4678],["Lima",-12.0464,-77.0428],["La Paz",-16.4897,-68.1193],["Santiago",-33.4489,-70.6693],["Buenos Aires",-34.6037,-58.3816],["Montevideo",-34.9011,-56.1645],["Sao Paulo",-23.5505,-46.6333],["Rio de Janeiro",-22.9068,-43.1729],
  ["Reykjavik",64.1466,-21.9426],["Lisbon",38.7223,-9.1393],["Madrid",40.4168,-3.7038],["London",51.5072,-0.1276],["Dublin",53.3498,-6.2603],["Paris",48.8566,2.3522],["Amsterdam",52.3676,4.9041],["Brussels",50.8503,4.3517],["Berlin",52.52,13.405],["Hamburg",53.5511,9.9937],["Prague",50.0755,14.4378],["Warsaw",52.2297,21.0122],["Munich",48.1351,11.582],["Vienna",48.2082,16.3738],["Copenhagen",55.6761,12.5683],["Oslo",59.9139,10.7522],["Stockholm",59.3293,18.0686],["Helsinki",60.1699,24.9384],["Rome",41.9028,12.4964],["Athens",37.9838,23.7275],["Istanbul",41.0082,28.9784],["Kyiv",50.4501,30.5234],["Moscow",55.7558,37.6173],
  ["Cairo",30.0444,31.2357],["Lagos",6.5244,3.3792],["Accra",5.6037,-0.187],["Nairobi",-1.2921,36.8219],["Johannesburg",-26.2041,28.0473],["Cape Town",-33.9249,18.4241],["Casablanca",33.5731,-7.5898],["Dubai",25.2048,55.2708],["Riyadh",24.7136,46.6753],["Karachi",24.8607,67.0011],["Mumbai",19.076,72.8777],["Delhi",28.6139,77.209],["Dhaka",23.8103,90.4125],["Kathmandu",27.7172,85.324],
  ["Bangkok",13.7563,100.5018],["Singapore",1.3521,103.8198],["Jakarta",-6.2088,106.8456],["Manila",14.5995,120.9842],["Hong Kong",22.3193,114.1694],["Taipei",25.033,121.5654],["Beijing",39.9042,116.4074],["Shanghai",31.2304,121.4737],["Seoul",37.5665,126.978],["Tokyo",35.6762,139.6503],["Osaka",34.6937,135.5023],["Ulaanbaatar",47.9184,106.9177],
  ["Perth",-31.9505,115.8605],["Adelaide",-34.9285,138.6007],["Melbourne",-37.8136,144.9631],["Sydney",-33.8688,151.2093],["Brisbane",-27.4698,153.0251],["Auckland",-36.8509,174.7645],["Wellington",-41.2866,174.7756],["Suva",-18.1248,178.4501],["Whitehorse",60.7212,-135.0568],["Yellowknife",62.454,-114.3718],["Iqaluit",63.7467,-68.517]];
let cities=defaultCities;
const names={0:"Clear",1:"Fair",2:"P Cloudy",3:"Cloudy",45:"Fog",48:"Fog",51:"Drizzle",53:"Drizzle",55:"Drizzle",56:"Drizzle",57:"Drizzle",61:"Rain",63:"Rain",65:"Rain",66:"Rain",67:"Rain",71:"Snow",73:"Snow",75:"Snow",77:"Snow",80:"Shower",81:"Shower",82:"Shower",85:"Snow",86:"Snow",95:"T-storm",96:"T-storm",99:"T-storm"};
const long={0:"Clear",1:"Mostly Clear",2:"Partly Cloudy",3:"Cloudy",45:"Fog",48:"Fog",51:"Drizzle",53:"Drizzle",55:"Drizzle",56:"Drizzle",57:"Drizzle",61:"Light Rain",63:"Rain",65:"Heavy Rain",66:"Freezing Rain",67:"Freezing Rain",71:"Light Snow",73:"Snow",75:"Heavy Snow",77:"Snow",80:"Showers",81:"Showers",82:"Heavy Showers",85:"Snow Showers",86:"Snow Showers",95:"Thunderstorms",96:"Thunderstorms",99:"Thunderstorms"};
const dirs=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const $=s=>document.querySelector(s);

// Chunky icons
const CL='<circle cx="35" cy="58" r="16"/><circle cx="55" cy="47" r="22"/><circle cx="74" cy="60" r="14"/><rect x="35" y="58" width="40" height="16"/>';
function icon(c){
  const sun=(x,y,r)=>`<g stroke="#fffb35" stroke-width="5" stroke-linecap="round">${[0,45,90,135,180,225,270,315].map(a=>`<line x1="${x}" y1="${y-r-5}" x2="${x}" y2="${y-r-12}" transform="rotate(${a} ${x} ${y})"/>`).join("")}</g><circle cx="${x}" cy="${y}" r="${r}" fill="#fffb35"/>`;
  const cloud=f=>`<g fill="${f}">${CL}</g>`;
  let g;
  if(c<=1) g=sun(50,50,20);
  else if(c==2) g=sun(34,36,13)+cloud("#fcffff");
  else if(c==3) g=cloud("#dbe7ff");
  else if(c==45||c==48) g=[35,50,65].map(y=>`<rect x="15" y="${y}" width="70" height="8" rx="4" fill="#dbe7ff"/>`).join("");
  else if((c>=71&&c<=77)||c==85||c==86) g=cloud("#dbe7ff")+[38,55,72].map((x,i)=>`<circle cx="${x}" cy="${i==1?93:86}" r="4.5" fill="#fff"/>`).join("");
  else if(c>=95) g=cloud("#99a7d1")+'<polygon points="55,62 40,84 53,84 47,98 70,74 56,74 63,62" fill="#fffb35"/>';
  else g=cloud("#b8c8f0")+'<g stroke="#57c4ff" stroke-width="5" stroke-linecap="round">'+[38,55,72].map(x=>`<line x1="${x}" y1="80" x2="${x-4}" y2="93"/>`).join("")+'</g>';
  return `<svg viewBox="0 0 100 100">${g}</svg>`;
}
const moon=p=>`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="${p=="full"?"#fffffd":"#272b70"}" stroke="#e2edff" stroke-width="4"/>${p=="first"?'<path d="M50 10a40 40 0 0 1 0 80z" fill="#fffffd"/>':p=="last"?'<path d="M50 10a40 40 0 0 0 0 80z" fill="#fffffd"/>':""}</svg>`;
function moons(){const P=29.530588861,E=2451550.09766,nj=Date.now()/864e5+2440587.5;
  return [["New",0],["First",.25],["Full",.5],["Last",.75]].map(([n,p])=>{const k=Math.ceil((nj-E)/P-p);return [n,new Date((E+P*(k+p)-2440587.5)*864e5)]}).sort((a,b)=>a[1]-b[1]);}
let currentTimeZone="America/Winnipeg";
function renderMoons(){
  $("#moons").innerHTML=moons().map(([n,d])=>`<div class="mr">${moon(n.toLowerCase())}<span>${tr("moon-"+n.toLowerCase(),{},n)}</span><span>${d.toLocaleDateString(language==="en"?"en-US":"fr-FR",{month:"short",day:"numeric",timeZone:currentTimeZone})}</span></div>`).join("");
}
renderMoons();

function renderHoofcast(city,current){
  const temperature=current.temperature_2m;
  const windSpeed=current.wind_speed_10m;
  const humidity=current.relative_humidity_2m;
  const weatherCode=current.weather_code;
  const temperatureGood=temperature>=0;
  const conditionsGood=weatherCode<=3;
  const windGood=windSpeed<=25;
  const humidityGood=humidity<=85;
  const translatedWeather=translations&&translations[translationLanguage()].weatherLong;
  const stats=[
    {label:weatherTr("temperature",{},"Temperature"),value:Math.round(temperature)+"°C",good:temperatureGood},
    {label:weatherTr("conditions",{},"Conditions"),value:translatedWeather?.[weatherCode]||long[weatherCode]||tr("unknown",{},"Unknown"),good:conditionsGood},
    {label:weatherTr("wind-stat",{},"Wind"),value:Math.round(windSpeed)+" km/h",good:windGood},
    {label:weatherTr("humidity-stat",{},"Humidity"),value:Math.round(humidity)+"%",good:humidityGood}
  ];
  const goodCount=stats.filter(stat=>stat.good).length;
  const badCount=stats.length-goodCount;
  const isBad=badCount>goodCount;
  const isFrozen=temperature<0;
  const status=$("#hoofcastStatus");
  status.className="hoofcast-status "+(isBad||isFrozen?"bad":goodCount>badCount?"good":"mixed");
  status.textContent=isFrozen||isBad?tr("bad-grazing",{},"BAD GRAZING"):goodCount>badCount?tr("good-grazing",{},"GOOD GRAZING"):tr("mixed-grazing",{},"MIXED GRAZING");
  $("#hoofcastLocation").textContent=tr("weather-at",{city},"Weather at {city}");
  $("#hoofcastStats").replaceChildren(...stats.map(stat=>{
    const item=document.createElement("div");
    item.className="hoofcast-stat "+(stat.good?"good":"bad");
    item.textContent=stat.label+": "+stat.value;
    return item;
  }));
  const horse=$("#hoofcastImage");
  const showBadHorse=isFrozen||isBad;
  horse.src=showBadHorse?"/horses/BadHorse.webp":"/horses/GoodHorse.webp";
  horse.alt=showBadHorse?tr("sad-horse",{},"Sad horse"):tr("happy-horse",{},"Happy horse");
}

// Screen rotation
const titles=["Weather by city","Current Conditions","Almanac","Local Forecast","Extended Forecast","Horse of the Week","Hoofcast"];
const bars=["Weather by city","Conditions at Winnipeg","Almanac for Winnipeg","Winnipeg Local Forecast","Winnipeg Extended Forecast","Horse of the Week","Hoofcast"];
const screens=[...document.querySelectorAll(".screen")];let cur=0;
function visibleScreens(){return languageMode==="fr-en"?screens.flatMap(screen=>[screen,screen]):screens;}
function currentScreenIndex(){return languageMode==="fr-en"?Math.floor(cur/2):cur;}
function show(i){
  const sequence=visibleScreens();
  cur=(i+sequence.length)%sequence.length;
  const screenIndex=currentScreenIndex();
  language=languageMode==="fr-en"?(cur%2===0?"fr":"en"):languageMode;
  applyLanguage();
  screens.forEach((screen,index)=>screen.classList.toggle("on",index===screenIndex));
  $("#title").textContent=titles[screenIndex];
  $("#pressure").textContent=bars[screenIndex];
}
let rotationInterval=null;

// Location-based city selection uses the closest known world cities.
const configDialog=$("#configDialog"),locationToggle=$("#locationToggle"),locationInput=$("#locationInput"),configStatus=$("#configStatus");
let configStatusMessage=null;
function setConfigStatus(key,values={},fallback=key){
  configStatusMessage={key,values,fallback};
  configStatus.textContent=tr(key,values,fallback);
}
const disableTitleMenuToggle=$("#disableTitleMenuToggle");
disableTitleMenuToggle.checked=localStorage.getItem("horse-channel-disable-title-menu")==="true";
disableTitleMenuToggle.addEventListener("change",()=>{
  localStorage.setItem("horse-channel-disable-title-menu",String(disableTitleMenuToggle.checked));
});
$("#configClose").addEventListener("click",()=>configDialog.close());
const creditsDialog=$("#creditsDialog"),creditsContent=$("#creditsContent");
$("#showCredits").addEventListener("click",()=>creditsDialog.showModal());
$("#creditsClose").addEventListener("click",()=>creditsDialog.close());
$("#showSettings").addEventListener("click",()=>configDialog.showModal());
async function selectLanguageMode(nextMode){
  await translationsReady;
  if(!translations)return;
  const screenIndex=currentScreenIndex();
  languageMode=nextMode;
  localStorage.setItem(languageStorageKey,languageMode);
  show(languageMode==="fr-en"?screenIndex*2:screenIndex);
}
$("#languageEN").addEventListener("click",()=>selectLanguageMode("en"));
$("#languageFR").addEventListener("click",()=>selectLanguageMode("fr"));
$("#languageFREN").addEventListener("click",()=>selectLanguageMode("fr-en"));
let loadedCredits=null;
function renderCredits(){
  const localized=translations&&translations[translationLanguage()].credits;
  creditsContent.replaceChildren();
  loadedCredits.sections.forEach((section,sectionIndex)=>{
    const heading=document.createElement("h3");heading.textContent=localized?.sections?.[sectionIndex]||section.title;
    const list=document.createElement("ul");
    section.items.forEach((item,itemIndex)=>{
      const text=localized?.items?.[sectionIndex]?.[itemIndex]||item.text;
      const row=document.createElement("li");row.append(document.createTextNode(text));
      if(Array.isArray(item.links)){
        for(const link of item.links){
          if(typeof link.label!=="string"||typeof link.url!=="string")throw new Error("Credits data contains an invalid link.");
          row.append(document.createTextNode(" "));
          const anchor=document.createElement("a");anchor.textContent=link.label;anchor.href=link.url;anchor.target="_blank";anchor.rel="noopener noreferrer";
          row.append(anchor);
        }
      }
      list.append(row);
    });
    creditsContent.append(heading,list);
  });
}
async function loadCredits(){
  try{
    const response=await fetch("/json/credits.json");
    if(!response.ok)throw new Error("Credits request failed ("+response.status+")");
    const credits=await response.json();
    if(!Array.isArray(credits.sections))throw new Error("Credits data must contain sections.");
    for(const section of credits.sections){
      if(typeof section.title!=="string"||!Array.isArray(section.items))throw new Error("Credits data contains an invalid section.");
      for(const item of section.items){
        if(typeof item.text!=="string")throw new Error("Credits data contains an invalid entry.");
      }
    }
    loadedCredits=credits;
    renderCredits();
  }catch(error){
    console.error("Could not load credits.",error);
    creditsContent.textContent=tr("credits-load-error",{},"Credits could not be loaded. Please try again later.");
  }
}
loadCredits();
document.addEventListener("keydown",event=>{
  if(event.key.toLowerCase()==="c"&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.target.closest("input,textarea,select,[contenteditable=true]")){
    if(configDialog.open)configDialog.close();else configDialog.showModal();
  }else if(event.key==="Escape"&&configDialog.open)configDialog.close();
  else if((event.key==="ArrowRight"||event.key==="ArrowLeft")&&!configDialog.open&&introScreen.classList.contains("is-hidden")&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.target.closest("input,textarea,select,[contenteditable=true]")){
    event.preventDefault();
    completedCycles=0;
    const sequence=visibleScreens();
    show((cur+(event.key==="ArrowRight"?1:-1)+sequence.length)%sequence.length);
  }
});
let locationRequest=0;
let lastUpdated=null;
let weatherRequest=0;
let cachedWeatherData=null;
let cachedWeatherCities="";
let pendingWeatherData=null;
let pendingWeatherCities="";
let weatherRefreshTimeout=null;
const savedLocationPreference=localStorage.getItem("horse-channel-location");
let savedManualLocation=null;
try{
  const storedLocation=localStorage.getItem("horse-channel-manual-location");
  if(storedLocation){
    const parsed=JSON.parse(storedLocation);
    if(typeof parsed.name==="string"&&Number.isFinite(parsed.latitude)&&Number.isFinite(parsed.longitude)){
      parsed.name=[...new Set(parsed.name.split(",").map(city=>city.trim()).filter(Boolean))].join(", ");
      savedManualLocation=parsed;
    }else throw new Error("Saved city does not contain valid coordinates.");
  }
}catch(error){
  console.error("Could not load the saved city.",error);
  setConfigStatus("saved-city-error",{},"The saved city could not be loaded. Set it again in settings.");
}
locationToggle.checked=!savedManualLocation&&savedLocationPreference!=="false";
if(savedManualLocation){
  cities=[[savedManualLocation.name,savedManualLocation.latitude,savedManualLocation.longitude]];
  if(savedManualLocation.timezone)currentTimeZone=savedManualLocation.timezone;
  locationInput.value=savedManualLocation.name;
}
function renderCities(){
  $("#cityRows").innerHTML=cities.map(([name])=>`<span>${name}</span><span>--</span><span>--</span><span>--</span>`).join("");
  const city=cities[0][0];
  document.querySelectorAll(".ticker-city").forEach(el=>el.textContent=tr("weather-for",{city},"Weather for {city}"));
  bars[0]=tr("screen-weather-city",{},"Weather by city");
  bars[1]=tr("bar-conditions",{city},"Conditions at {city}");
  bars[2]=tr("bar-almanac",{city},"Almanac for {city}");
  bars[3]=tr("bar-local-forecast",{city},"{city} Local Forecast");
  bars[4]=tr("bar-extended-forecast",{city},"{city} Extended Forecast");
}
function distanceSquared(lat1,lon1,lat2,lon2){
  const x=(lon2-lon1)*Math.cos((lat1+lat2)*Math.PI/360);
  const y=lat2-lat1;
  return x*x+y*y;
}
function setCitiesNear(latitude,longitude,name,timezone,excludeCityName=""){
  const nearby=worldCities
    .filter(([cityName,cityLatitude,cityLongitude])=>cityName!==excludeCityName&&distanceSquared(latitude,longitude,cityLatitude,cityLongitude)>0.0001)
    .sort((a,b)=>distanceSquared(latitude,longitude,a[1],a[2])-distanceSquared(latitude,longitude,b[1],b[2]))
    .slice(0,5);
  cities=[[name,latitude,longitude],...nearby];
  if(timezone){
    try{new Intl.DateTimeFormat("en-US",{timeZone:timezone});currentTimeZone=timezone;tick();renderMoons();}
    catch(error){console.error("Could not apply the selected timezone.",error);}
  }
  renderCities();showWeather();
}
function updateCitiesFromBrowser(requestId){
  if(!navigator.geolocation){
    setConfigStatus("location-unavailable",{},"Browser location is unavailable. Enter a city instead.");
    return;
  }
  setConfigStatus("location-waiting",{},"Waiting for browser location permission...");
  navigator.geolocation.getCurrentPosition(position=>{
    if(requestId!==locationRequest||!locationToggle.checked)return;
    const {latitude,longitude}=position.coords;
    const closest=[...worldCities].sort((a,b)=>distanceSquared(latitude,longitude,a[1],a[2])-distanceSquared(latitude,longitude,b[1],b[2]))[0];
    if(!closest){
      setConfigStatus("location-not-found",{},"Could not find a nearby city. Enter a city instead.");
      return;
    }
    setCitiesNear(latitude,longitude,closest[0],null,closest[0]);
    setConfigStatus("location-using",{city:closest[0]},"Using browser location near {city}.");
  },error=>{
    if(requestId!==locationRequest||!locationToggle.checked)return;
    console.error("Browser location request failed.",error);
    const messages={
      1:["location-denied","Location permission was denied. Allow location access in your browser or enter a city instead."],
      2:["location-failed","Your browser could not determine your location. Try again or enter a city instead."],
      3:["location-timeout","Location request timed out. Try again or enter a city instead."]
    };
    const [key,fallback]=messages[error.code]||["location-error","Could not get your browser location. Enter a city instead."];
    setConfigStatus(key,{},fallback);
  },{enableHighAccuracy:false,timeout:15000,maximumAge:300000});
}
function requestLocation(){
  const requestId=++locationRequest;
  localStorage.setItem("horse-channel-location",String(locationToggle.checked));
  if(locationToggle.checked){
    localStorage.removeItem("horse-channel-manual-location");
    updateCitiesFromBrowser(requestId);return;
  }
  localStorage.removeItem("horse-channel-manual-location");
  cities=defaultCities;currentTimeZone="America/Winnipeg";
  setConfigStatus("default-cities",{},"Showing default cities.");
  tick();renderMoons();renderCities();showWeather();
}
locationToggle.addEventListener("change",requestLocation);
async function setManualLocation(){
  const query=locationInput.value.trim();
  if(!query){setConfigStatus("city-required",{},"Enter a city to set your location.");return;}
  const requestId=++locationRequest;
  locationToggle.checked=false;
  localStorage.setItem("horse-channel-location","false");
  setConfigStatus("finding-city",{city:query},"Finding {city}...");
  try{
    const response=await fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(query)+"&count=1&language=en&format=json");
    if(!response.ok)throw new Error("City search failed ("+response.status+")");
    const result=await response.json();
    const place=result.results&&result.results[0];
    if(!place||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude))throw new Error("No matching city was found.");
    if(requestId!==locationRequest)return;
    const name=[...new Set([place.name,place.admin1,place.country].filter(Boolean))].join(", ");
    savedManualLocation={name,latitude:place.latitude,longitude:place.longitude,timezone:place.timezone};
    localStorage.setItem("horse-channel-manual-location",JSON.stringify(savedManualLocation));
    currentTimeZone=place.timezone||"UTC";
    setCitiesNear(place.latitude,place.longitude,name,place.timezone);
    setConfigStatus("selected-location",{city:name},"Using selected location: {city}.");
  }catch(error){
    if(requestId!==locationRequest)return;
    console.error("Could not set the selected city.",error);
    setConfigStatus(error.message==="No matching city was found."?"city-not-found":"set-city-error",{},error.message==="No matching city was found."?"No matching city was found.":"Could not set that city. Check your connection and try again.");
  }
}
$("#setLocation").addEventListener("click",setManualLocation);
locationInput.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();setManualLocation();}});
renderCities();

// Clock
const dateEl=$(".date"),timeEl=$(".time");
function tick(){
  const locale=language==="en"?"en-US":"fr-FR";
  const d=new Date(),p=new Intl.DateTimeFormat(locale,{weekday:"short",month:"short",day:"numeric",timeZone:currentTimeZone}).formatToParts(d),g=t=>p.find(x=>x.type===t).value;
  dateEl.textContent=(g("weekday")+" "+g("month")+" "+g("day")).toUpperCase();
  timeEl.textContent=d.toLocaleTimeString(locale,{hour:"numeric",minute:"2-digit",second:"2-digit",timeZone:currentTimeZone});
}
tick();setInterval(tick,1000);
if(savedManualLocation)setCitiesNear(savedManualLocation.latitude,savedManualLocation.longitude,savedManualLocation.name,savedManualLocation.timezone);
else if(locationToggle.checked)requestLocation();

// Start the shuffled playlist
const musicTracks=["As It Happens.mp3","Deviled Eggs.mp3","Fugitive Life.mp3","Handara.mp3","Miniature.mp3","Movin' On.mp3","New York Samba.mp3","San Diego Stomp.mp3","Secret Wishes.mp3","So Much in Common.mp3","Terpsichore.mp3","The Night That Love Came Back.mp3","The Sponge.mp3"];
const player=new Audio();player.volume=.50;
const muteToggle=$("#muteToggle");
let muted=localStorage.getItem("horse-channel-muted")==="true";
muteToggle.checked=muted;player.muted=muted;
let shuffledTracks=[],lastTrack="";
const introScreen=$("#introScreen"),introVideo=$(".intro-video"),introCountdown=$("#introCountdown");
let secondsUntilBroadcast=180,countdownTimer=null,broadcastTimer=null,completedCycles=0;
let musicTickerText="Music: waiting for a selection";
function updateMusicTicker(text){
  musicTickerText=text;
  document.querySelectorAll(".ticker-music").forEach(el=>{el.textContent=musicTickerText;el.hidden=muted;});
}
muteToggle.addEventListener("change",()=>{
  muted=muteToggle.checked;player.muted=muted;
  localStorage.setItem("horse-channel-muted",String(muted));
  updateMusicTicker(musicTickerText);
});
function shuffleTracks(){
  const tracks=[...musicTracks];
  for(let i=tracks.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [tracks[i],tracks[j]]=[tracks[j],tracks[i]];
  }
  if(tracks[0]===lastTrack)[tracks[0],tracks[1]]=[tracks[1],tracks[0]];
  return tracks;
}
function playTrack(filename){
  lastTrack=filename;
  player.src="/music/"+encodeURIComponent(filename);
  const trackTitle=filename.replace(/\.mp3$/i,"");
  const artist=filename==="Deviled Eggs.mp3"?"Celarb":"Bob James";
  updateMusicTicker(tr("now-playing",{title:trackTitle,artist},"Now playing: {title} - {artist}"));
  player.play().catch(error=>{
    console.error("Music playback failed.",error);
    updateMusicTicker(tr("smooth-jazz-delayed",{},"Smooth jazz will start after the first interaction."));
  });
}
window.play=function(filename){
  if(typeof filename!=="string"){
    console.error(tr("play-help",{},"Use play(\"filename.mp3\") with a track from the playlist."));
    return;
  }
  const track=musicTracks.find(name=>name.toLowerCase()===filename.trim().toLowerCase());
  if(!track){
    console.error(tr("invalid-track",{tracks:musicTracks.join(", ")},"Track not found. Available tracks: {tracks}"));
    return;
  }
  shuffledTracks=shuffledTracks.filter(name=>name!==track);
  playTrack(track);
};
function nextTrack(){
  if(!shuffledTracks.length)shuffledTracks=shuffleTracks();
  playTrack(shuffledTracks.shift());
}
player.addEventListener("ended",nextTrack);
function startMusic(){
  if(!introScreen.classList.contains("is-hidden"))return;
  if(player.paused){if(!player.src)nextTrack();else player.play().catch(error=>console.error("Music playback failed.",error));}
  document.removeEventListener("pointerdown",startMusic);
  document.removeEventListener("keydown",startMusic);
}
document.addEventListener("pointerdown",startMusic);
document.addEventListener("keydown",startMusic);
function startIntroCountdown(){
  clearInterval(countdownTimer);clearTimeout(broadcastTimer);
  secondsUntilBroadcast=180;introCountdown.textContent="03:00";
  countdownTimer=setInterval(()=>{
    secondsUntilBroadcast=Math.max(0,secondsUntilBroadcast-1);
    const minutes=Math.floor(secondsUntilBroadcast/60),seconds=secondsUntilBroadcast%60;
    introCountdown.textContent=String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
  },1000);
  broadcastTimer=setTimeout(beginBroadcast,180000);
}
function beginBroadcast(){
  if(introScreen.classList.contains("is-hidden"))return;
  clearInterval(countdownTimer);
  clearTimeout(broadcastTimer);
  introScreen.classList.add("is-hidden");
  introVideo.pause();
  completedCycles=0;
  rotationInterval=setInterval(()=>{
    const sequence=visibleScreens();
    const next=(cur+1)%sequence.length;
    if(next===0){
      completedCycles++;
      if(completedCycles>=5){
        if(disableTitleMenuToggle.checked)completedCycles=0;
        else{restartBroadcast();return;}
      }
    }
    show(next);
  },20000); // Time till slide change
  nextTrack();
}
function restartBroadcast(){
  clearInterval(rotationInterval);rotationInterval=null;
  player.pause();
  show(0);
  introScreen.classList.remove("is-hidden");
  introVideo.currentTime=0;
  introVideo.play().catch(error=>console.error("Intro video playback failed.",error));
  startIntroCountdown();
}
startIntroCountdown();
$("#startNow").addEventListener("click",beginBroadcast);

async function loadHorseOfWeek(){
  const fallbackHorse={
    filepath:"/horses/HorseOfTheWeek.webp",
    subtext:"A few curious horses stop by to say hello.",
    subtextFr:"Quelques chevaux curieux viennent vous saluer."
  };
  try{
    const response=await fetch("/json/horse-of-week.json");
    if(!response.ok)throw new Error("Horse of the Week data request failed ("+response.status+")");
    const entries=await response.json();
    if(!Array.isArray(entries))throw new Error("Horse of the Week data must be a list.");
    const validEntries=entries.filter(entry=>entry&&typeof entry.filepath==="string"&&entry.filepath&&typeof entry.subtext==="string");
    if(!validEntries.length)throw new Error("Horse of the Week data contains no usable entries.");
    setHorseOfWeek(validEntries[Math.floor(Math.random()*validEntries.length)]);
  }catch(error){
    console.error("Could not load Horse of the Week.",error);
    setHorseOfWeek(fallbackHorse);
  }
}
function setHorseOfWeek(horse){
  currentHorse=horse;
  const image=$("#horseWeekImage");
  const subtext=language!=="en"&&typeof horse.subtextFr==="string"&&horse.subtextFr
    ?horse.subtextFr:horse.subtext;
  image.onerror=()=>{
    console.error("Horse of the Week image could not be loaded.",image.src);
    image.onerror=null;
    image.src="/horses/HorseOfTheWeek.webp";
  };
  image.src=horse.filepath;
  image.alt=subtext;
  $("#horseWeekSubtext").textContent=subtext;
}
let currentHorse=null;
loadHorseOfWeek();

// Live weather: Open-Meteo
async function showWeather(refresh=false){
  const requestedCities=[...cities],cityKey=JSON.stringify(requestedCities);
  const useCached=!refresh&&cachedWeatherData&&cachedWeatherCities===cityKey;
  const requestId=useCached?weatherRequest:++weatherRequest;
  const displayLanguage=language;
  const cells=[...document.querySelectorAll("#cityRows span")],rd=Math.round;
  const weatherLanguage=translationLanguage();
  const weatherShort=translations&&translations[weatherLanguage].weatherShort||names;
  const weatherLong=translations&&translations[weatherLanguage].weatherLong||long;
  const locale=language==="en"?"en-US":"fr-FR";
  if(refresh){
    clearTimeout(weatherRefreshTimeout);
    weatherRefreshTimeout=setTimeout(()=>showWeather(true),10*60*1000);
  }
  try{
    let data;
    if(useCached)data=cachedWeatherData;
    else{
      if(!pendingWeatherData||pendingWeatherCities!==cityKey){
        const url="https://api.open-meteo.com/v1/forecast?latitude="+requestedCities.map(c=>c[1]).join(",")+"&longitude="+requestedCities.map(c=>c[2]).join(",")+"&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,visibility&hourly=pressure_msl,weather_code&past_hours=3&forecast_hours=24&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max&forecast_days=5&timezone=auto";
        const pendingCityKey=cityKey;
        const request=fetch(url).then(async response=>{
          if(!response.ok)throw new Error(tr("weather-request-failed",{status:response.status},"Weather request failed ({status})"));
          let result=await response.json();if(!Array.isArray(result))result=[result];
          return result;
        });
        pendingWeatherCities=cityKey;
        pendingWeatherData=request;
        const clearPending=()=>{
          if(pendingWeatherData===request){
            pendingWeatherData=null;
            pendingWeatherCities="";
          }
        };
        request.then(clearPending,clearPending);
      }
      data=await pendingWeatherData;
      if(requestId!==weatherRequest)return;
      cachedWeatherData=data;
      cachedWeatherCities=cityKey;
      if(language!==displayLanguage){
        await showWeather();
        return;
      }
    }
    if(requestId!==weatherRequest)return;
    const wind=c=>{const s=rd(c.wind_speed_10m);return s<1?weatherTr("calm",{},"Calm"):dirs[rd(c.wind_direction_10m/22.5)%16]+" "+s};
    data.forEach((d,i)=>{const c=d.current;cells[i*4+1].textContent=rd(c.temperature_2m);cells[i*4+2].textContent=weatherShort[c.weather_code]||"--";cells[i*4+3].textContent=wind(c)});
    const d=data[0],c=d.current,D=d.daily,h=d.hourly.pressure_msl,df=h[3]-h[0];
    renderHoofcast(requestedCities[0][0],c);
    if(d.timezone){currentTimeZone=d.timezone;tick();renderMoons();}
    const kpa=new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(c.pressure_msl/10),trend=df>.5?weatherTr("rise",{},"Rise"):df<-.5?weatherTr("fall",{},"Fall"):weatherTr("steady",{},"Steady");
    bars[0]=tr("screen-weather-city",{},"Weather by city");
    $("#ci").innerHTML=icon(c.weather_code);$("#ct").textContent=rd(c.temperature_2m)+"°";$("#cc").textContent=weatherLong[c.weather_code]||"--";
    $("#cw").textContent=wind(c)+(c.wind_speed_10m<1?"":" km/h");$("#ch").textContent=rd(c.relative_humidity_2m)+"%";
    $("#cd").textContent=rd(c.dew_point_2m)+"°C";$("#cv").textContent=rd(c.visibility/1000)+" km";$("#cp").textContent=kpa+" "+trend;$("#cf").textContent=rd(c.apparent_temperature)+"°C";
    const temp=c.temperature_2m,windSpeed=c.wind_speed_10m;
    const chill=temp<=10&&windSpeed>4.8?13.12+.6215*temp-11.37*Math.pow(windSpeed,.16)+.3965*temp*Math.pow(windSpeed,.16):null;
    $("#windchill").textContent=chill===null?tr("not-available",{},"N/A"):rd(chill)+"°C";
    const t12=t=>{let[hh,mm]=t.slice(11,16).split(":");hh=+hh;return language!=="en"?String(hh).padStart(2,"0")+":"+mm:(hh%12||12)+":"+mm+(hh<12?" AM":" PM")};
    $("#sr0").textContent=t12(D.sunrise[0]);$("#sr1").textContent=t12(D.sunrise[1]);$("#ss0").textContent=t12(D.sunset[0]);$("#ss1").textContent=t12(D.sunset[1]);
    const day=(i,o)=>new Date(D.time[i]+"T12:00").toLocaleDateString(locale,{weekday:o}).replace(/^./u,letter=>letter.toLocaleUpperCase(locale));
    const pr=i=>D.precipitation_probability_max[i]>=30?weatherTr("precipitation",{chance:D.precipitation_probability_max[i]}," {chance}% chance of precipitation."):"";
    const wd=i=>weatherTr("wind-up-to",{speed:rd(D.wind_speed_10m_max[i])}," Winds up to {speed} km/h.");
    const tonightIndex=d.hourly.time.findIndex(t=>t.startsWith(D.time[0]+"T")&&+t.slice(11,13)>=18);
    const tonightCode=tonightIndex>=0?d.hourly.weather_code[tonightIndex]:c.weather_code;
    const lines=[
      tr("forecast-tonight",{label:tr("tonight",{},"Tonight"),condition:weatherLong[tonightCode]||"--",temperature:rd(D.temperature_2m_min[1]),precipitation:pr(0),wind:wd(0)},"{label}...{condition}. Low {temperature}°C.{precipitation}{wind}"),
      tr("forecast-tomorrow",{label:tr("tomorrow",{},"Tomorrow"),condition:weatherLong[D.weather_code[1]]||"--",temperature:rd(D.temperature_2m_max[1]),precipitation:pr(1),wind:wd(1)},"{label}...{condition}. High {temperature}°C.{precipitation}{wind}"),
      tr("forecast-night",{label:tr("tomorrow-night",{},"Tomorrow night"),temperature:rd(D.temperature_2m_min[2])},"{label}...Low {temperature}°C."),
      tr("forecast-day",{label:day(2,"long"),condition:weatherLong[D.weather_code[2]]||"--",temperature:rd(D.temperature_2m_max[2]),precipitation:pr(2)},"{label}...{condition}. High {temperature}°C.{precipitation}")
    ];
    $("#lf").innerHTML=lines.map(line=>`<p>${line}</p>`).join("");
    $("#ext").innerHTML=[1,2,3,4].map(i=>`<div class="day"><h3>${day(i,"short")}</h3>${icon(D.weather_code[i])}<p class="c">${weatherLong[D.weather_code[i]]||"--"}</p><p class="t"><span><span class="lo">${weatherTr("low",{},"Low")}</span> ${rd(D.temperature_2m_min[i])}°C</span><span><span class="hi">${weatherTr("high",{},"High")}</span> ${rd(D.temperature_2m_max[i])}°C</span></p></div>`).join("");
    lastUpdated=new Date();$(".panel").classList.remove("stale");
    const updated=lastUpdated.toLocaleTimeString(locale,{hour:"numeric",minute:"2-digit",timeZone:currentTimeZone});
    document.querySelectorAll(".ticker-update").forEach(el=>el.textContent=tr("ticker-update",{city:requestedCities[0][0],temperature:rd(c.temperature_2m),condition:weatherLong[c.weather_code]||"--",time:updated},"Update: {city} {temperature}°C, {condition}. Last updated {time}."));
    document.querySelectorAll(".ticker-alert").forEach(el=>{
      el.hidden=chill===null||chill>-40;
      el.textContent=tr("cold-warning",{temperature:rd(chill),city:requestedCities[0][0]},"Extreme cold warning criteria met (<= -40°C): wind chill {temperature}°C in {city}.");
    });
  }catch(e){
    if(requestId!==weatherRequest)return;
    if(language!==displayLanguage){
      await showWeather();
      return;
    }
    console.error("Weather refresh failed.",e);
    $(".panel").classList.add("stale");
    if(lastUpdated){
      const updated=lastUpdated.toLocaleTimeString(locale,{hour:"numeric",minute:"2-digit",timeZone:currentTimeZone});
      document.querySelectorAll(".ticker-update").forEach(el=>el.textContent=tr("ticker-refresh-failed",{time:updated},"Refresh failed; showing last successful data from {time}."));
    }else{
      bars[0]=tr("weather-unavailable",{},"Weather observations unavailable");
      $("#lf").textContent=tr("forecast-unavailable",{},"Forecast unavailable.");
      document.querySelectorAll(".ticker-update").forEach(el=>el.textContent=tr("weather-refresh-failed",{},"Weather refresh failed; data unavailable."));
    }
  }
  $("#pressure").textContent=bars[currentScreenIndex()];
}
showWeather(true);
translationsReady.then(()=>{
  const languageEN=$("#languageEN"),languageFR=$("#languageFR"),languageFREN=$("#languageFREN");
  languageFR.disabled=!translations;
  languageEN.disabled=!translations;
  languageFREN.disabled=!translations;
  if(translations)show(0);
  else{
    languageMode="en";
    language="en";
    languageEN.setAttribute("aria-pressed","true");
    languageFR.setAttribute("aria-pressed","false");
    languageFREN.setAttribute("aria-pressed","false");
    show(0);
  }
});

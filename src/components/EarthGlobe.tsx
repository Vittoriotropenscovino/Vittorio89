/**
 * TravelSphere - EarthGlobe Component
 * Globo 3D futuristico: hex/wireframe holografico con animazioni attraenti
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { EarthGlobeProps, Trip } from '../types';

const GLOBE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#050510;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
#globeViz{width:100%;height:100%}
#dbg{position:fixed;bottom:6px;left:6px;color:#0af;font:10px monospace;z-index:99;opacity:0.5}
canvas.stars{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none}
</style>
</head>
<body>
<canvas class="stars" id="starCanvas"></canvas>
<div id="globeViz"></div>
<div id="dbg">loading...</div>
<script>
var globe=null,_trips=[],_itineraries=[],_zoomFactor=1.0,_home=null,_ready=false,_showHomeLines=true;
var dbg=document.getElementById('dbg');
function L(m){if(dbg&&!_ready)dbg.textContent=m;S({type:'log',message:m});}
function S(d){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(d));}catch(e){}}
window.onerror=function(m){if(!_ready)L('ERR:'+m);};

// === STAR FIELD BACKGROUND ===
(function(){
  var c=document.getElementById('starCanvas'),ctx=c.getContext('2d');
  function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  var stars=[];
  for(var i=0;i<200;i++){
    stars.push({x:Math.random()*2000,y:Math.random()*2000,r:Math.random()*1.2+0.2,a:Math.random()*0.6+0.1,speed:Math.random()*0.003+0.001,phase:Math.random()*Math.PI*2});
  }
  function drawStars(){
    ctx.clearRect(0,0,c.width,c.height);
    var t=Date.now()*0.001;
    for(var i=0;i<stars.length;i++){
      var s=stars[i];
      var flicker=s.a*(0.6+0.4*Math.sin(t*s.speed*200+s.phase));
      ctx.beginPath();ctx.arc(s.x%c.width,s.y%c.height,s.r,0,6.28);
      ctx.fillStyle='rgba(180,220,255,'+flicker+')';ctx.fill();
    }
    requestAnimationFrame(drawStars);
  }
  drawStars();
})();

L('loading libs...');
loadJS('https://unpkg.com/topojson-client@3/dist/topojson-client.min.js',function(){
loadJS('https://unpkg.com/globe.gl@2/dist/globe.gl.min.js',function(){
  if(typeof Globe==='undefined'){L('Globe.gl fail');return;}
  L('libs ok, fetching map...');
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(function(r){return r.json();})
    .then(function(topo){
      var geo={type:'FeatureCollection',features:[]};
      try{
        if(typeof topojson!=='undefined'&&topo.objects){
          var k=topo.objects.countries?'countries':Object.keys(topo.objects)[0];
          geo=topojson.feature(topo,topo.objects[k]);
        }
      }catch(e){L('topo err:'+e.message);}
      go(geo);
    })
    .catch(function(){
      L('map fail, no countries');
      go({type:'FeatureCollection',features:[]});
    });
});
});

function loadJS(u,cb){var s=document.createElement('script');s.src=u;s.onload=cb;s.onerror=function(){L('script fail:'+u);cb();};document.head.appendChild(s);}

function go(countries){
  var el=document.getElementById('globeViz');
  var f=countries.features||[];
  L(f.length+' countries. rendering...');

  try{
    globe=Globe()
      .backgroundColor('rgba(0,0,0,0)')
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor('#00d4ff')
      .atmosphereAltitude(0.28)

      // COUNTRY HEX DOTS
      .hexPolygonsData(f)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.55)
      .hexPolygonColor(function(){return 'rgba(0,220,255,0.4)';})
      .hexPolygonAltitude(0.008)

      // COUNTRY BORDERS
      .polygonsData(f)
      .polygonCapColor(function(){return 'rgba(0,0,0,0)';})
      .polygonSideColor(function(){return 'rgba(0,200,255,0.08)';})
      .polygonStrokeColor(function(){return 'rgba(0,220,255,0.5)';})
      .polygonAltitude(0.009)

      // TRIP MARKERS - dynamic size based on zoom
      .pointsData([])
      .pointLat('lat').pointLng('lng')
      .pointColor(function(d){return d.color||'#ff6b6b';})
      .pointAltitude(function(){return 0.01+0.04*_zoomFactor;})
      .pointRadius(function(d){return d.isHome?0.25+0.2*_zoomFactor:0.12+0.18*_zoomFactor;})
      .pointResolution(12)

      // PULSING RINGS - dynamic size
      .ringsData([])
      .ringLat('lat').ringLng('lng')
      .ringColor(function(d){return function(t){
        var c=d.ringColor||'255,107,107';
        return 'rgba('+c+','+(1-t)*0.6+')';
      };})
      .ringMaxRadius(function(){return 1.0+1.8*_zoomFactor;})
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(1200)

      // LABELS - dynamic size, hidden when zoomed out
      .labelsData([])
      .labelLat('lat').labelLng('lng')
      .labelText(function(d){return _zoomFactor>1.15?'':d.label;})
      .labelSize(function(){return 0.2+0.35*_zoomFactor;})
      .labelDotRadius(function(){return 0.08+0.12*_zoomFactor;})
      .labelColor(function(d){return d.isHome?'rgba(255,215,0,0.95)':'rgba(0,220,255,0.95)';})
      .labelResolution(2)
      .labelAltitude(0.015)

      // ANIMATED ARCS
      .arcsData([])
      .arcColor(function(d){return d.colors||['rgba(0,220,255,0.9)','rgba(255,107,107,0.3)'];})
      .arcDashLength(0.5)
      .arcDashGap(0.1)
      .arcDashAnimateTime(2000)
      .arcStroke(0.8)
      .arcAltitudeAutoScale(0.45)

      // CUSTOM LAYER - floating particles
      .customLayerData([])
      .customThreeObject(function(d){
        if(typeof THREE==='undefined') return null;
        var g=new THREE.SphereGeometry(d.size||0.4,8,8);
        var m=new THREE.MeshBasicMaterial({color:new THREE.Color(d.color||'#00d4ff'),transparent:true,opacity:d.opacity||0.6});
        return new THREE.Mesh(g,m);
      })
      .customThreeObjectUpdate(function(obj,d){
        Object.assign(obj.position,globe.getCoords(d.lat,d.lng,d.alt||0.15));
      })

      .onPointClick(onPin)
      .onLabelClick(onPin)
      (el);

    // Globe material - lighter ocean
    try{
      var m=globe.globeMaterial();
      m.color.set('#0a1e3d');
      m.emissive.set('#0a2a4a');
      m.emissiveIntensity=0.3;
      m.shininess=0;
    }catch(e){}

    // Custom scene enhancements
    try{
      var scene=globe.scene();
      if(typeof THREE!=='undefined'){
        var rimLight=new THREE.DirectionalLight(0x00d4ff,0.35);
        rimLight.position.set(-200,0,-200);
        scene.add(rimLight);

        var ambLight=new THREE.AmbientLight(0x111133,0.3);
        scene.add(ambLight);

        var R=100.4;
        [-60,-30,0,30,60].forEach(function(lat){
          var phi=(90-lat)*Math.PI/180,v=[];
          for(var lo=0;lo<=360;lo+=2){var th=lo*Math.PI/180;v.push(R*Math.sin(phi)*Math.cos(th),R*Math.cos(phi),R*Math.sin(phi)*Math.sin(th));}
          var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
          scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.06})));
        });
        for(var lo=0;lo<360;lo+=30){
          var th=lo*Math.PI/180,v=[];
          for(var lt=-90;lt<=90;lt+=2){var p=(90-lt)*Math.PI/180;v.push(R*Math.sin(p)*Math.cos(th),R*Math.cos(p),R*Math.sin(p)*Math.sin(th));}
          var g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
          scene.add(new THREE.Line(g2,new THREE.LineBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.06})));
        }

        var scanRingGeo=new THREE.RingGeometry(100.2,100.8,64);
        var scanRingMat=new THREE.MeshBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.12,side:THREE.DoubleSide});
        var scanRing=new THREE.Mesh(scanRingGeo,scanRingMat);
        scanRing.rotation.x=Math.PI/2;
        scene.add(scanRing);

        function animateScanner(){
          requestAnimationFrame(animateScanner);
          scanRing.rotation.z+=0.003;
          scanRingMat.opacity=0.06+0.06*Math.sin(Date.now()*0.001);
        }
        animateScanner();
      }
    }catch(e){}

    // Camera controls
    var c=globe.controls();
    c.autoRotate=true;
    c.autoRotateSpeed=0.4;
    c.enableDamping=true;
    c.dampingFactor=0.12;
    c.rotateSpeed=0.8;
    c.zoomSpeed=1.0;
    c.minDistance=110;
    c.maxDistance=600;
    c.enablePan=false;

    // === ZOOM-ADAPTIVE MARKERS ===
    try{
      var lastZoomUpdate=0;
      c.addEventListener('change',function(){
        var now=Date.now();
        if(now-lastZoomUpdate<100)return;
        lastZoomUpdate=now;
        try{
          var dist=c.object.position.length();
          var f=Math.max(0.2,Math.min(1.5,(dist-100)/260));
          if(Math.abs(f-_zoomFactor)>0.03){
            _zoomFactor=f;
            if(_trips.length>0||_home){
              globe.pointsData(globe.pointsData());
              globe.ringsData(globe.ringsData());
              globe.labelsData(globe.labelsData());
            }
          }
        }catch(ze){}
      });
    }catch(e){}

    globe.width(window.innerWidth).height(window.innerHeight);
    window.addEventListener('resize',function(){if(globe)globe.width(window.innerWidth).height(window.innerHeight);});

    document.addEventListener('message',onMsg);
    window.addEventListener('message',onMsg);

    _ready=true;
    setTimeout(function(){if(dbg)dbg.style.display='none';},2000);
    S({type:'ready'});
    L('ready');
  }catch(e){L('INIT ERR:'+e.message);}
}

function onPin(p){if(p&&p.tripId&&p.tripId!=='__home__')S({type:'pinClick',tripId:p.tripId});}
function onMsg(e){try{handleCmd(JSON.parse(typeof e.data==='string'?e.data:''));}catch(x){}}
function handleMessageFromRN(d){if(typeof d==='string'){try{d=JSON.parse(d);}catch(e){return;}}handleCmd(d);}
function handleCmd(d){
  if(!d||!d.type)return;
  if(d.type==='updateTrips'){_itineraries=d.itineraries||[];updateTrips(d.trips);}
  else if(d.type==='updateHome'){_home=d.home||null;if(_trips.length>0)updateTrips(_trips);}
  else if(d.type==='updateHomeLines'){_showHomeLines=d.show!==false;if(_trips.length>0)updateTrips(_trips);}
  else if(d.type==='flyTo'&&globe)globe.pointOfView({lat:d.lat,lng:d.lng,altitude:1.8},1500);
}

var hueColors=['255,107,107','0,220,255','139,92,246','16,185,129','245,158,11','236,72,153'];
function updateTrips(t){
  if(!globe||!t)return;_trips=t;
  var p=t.map(function(x,i){
    var col=hueColors[i%hueColors.length];
    return{lat:x.latitude,lng:x.longitude,tripId:x.id,label:x.title,color:'rgb('+col+')',ringColor:col};
  });

  // Add home pin if set
  if(_home){
    p.push({lat:_home.latitude,lng:_home.longitude,tripId:'__home__',label:_home.name||'Home',color:'#FFD700',ringColor:'255,215,0',isHome:true});
  }

  globe.pointsData(p).ringsData(p).labelsData(p);

  // Generate arcs - itinerary from home
  if(t.length>0){
    var s=t.slice().sort(function(a,b){return a.createdAt-b.createdAt;});
    var a=[];

    if(_home&&_showHomeLines){
      // Smart filter: only connect home to trips WITHOUT an itinerary
      var freeTrips=s.filter(function(x){return !x.itineraryId;});
      if(freeTrips.length>0){
        // Arc from home to first free trip
        a.push({
          startLat:_home.latitude,startLng:_home.longitude,
          endLat:freeTrips[0].latitude,endLng:freeTrips[0].longitude,
          colors:['rgba(255,215,0,0.9)','rgba('+hueColors[0]+',0.6)']
        });
        // Arcs between consecutive free trips
        for(var i=0;i<freeTrips.length-1;i++){
          var col1=hueColors[i%hueColors.length];
          var col2=hueColors[(i+1)%hueColors.length];
          a.push({
            startLat:freeTrips[i].latitude,startLng:freeTrips[i].longitude,
            endLat:freeTrips[i+1].latitude,endLng:freeTrips[i+1].longitude,
            colors:['rgba('+col1+',0.9)','rgba('+col2+',0.4)']
          });
        }
        // Arc from last free trip back to home
        var lastCol=hueColors[(freeTrips.length-1)%hueColors.length];
        a.push({
          startLat:freeTrips[freeTrips.length-1].latitude,startLng:freeTrips[freeTrips.length-1].longitude,
          endLat:_home.latitude,endLng:_home.longitude,
          colors:['rgba('+lastCol+',0.6)','rgba(255,215,0,0.9)']
        });
      }
    }else if(!_home){
      // No home: consecutive arcs
      for(var i=0;i<s.length-1;i++){
        var col1=hueColors[i%hueColors.length];
        var col2=hueColors[(i+1)%hueColors.length];
        a.push({
          startLat:s[i].latitude,startLng:s[i].longitude,
          endLat:s[i+1].latitude,endLng:s[i+1].longitude,
          colors:['rgba('+col1+',0.9)','rgba('+col2+',0.4)']
        });
      }
      if(s.length>=3){
        var lastCol=hueColors[(s.length-1)%hueColors.length];
        a.push({
          startLat:s[s.length-1].latitude,startLng:s[s.length-1].longitude,
          endLat:s[0].latitude,endLng:s[0].longitude,
          colors:['rgba('+lastCol+',0.6)','rgba('+hueColors[0]+',0.3)']
        });
      }
    }
    // Add itinerary arcs (gold, thicker)
    if(_itineraries&&_itineraries.length>0){
      var tripMap={};
      t.forEach(function(x){tripMap[x.id]=x;});
      _itineraries.forEach(function(itin){
        var ids=itin.tripIds||[];
        for(var j=0;j<ids.length-1;j++){
          var t1=tripMap[ids[j]],t2=tripMap[ids[j+1]];
          if(t1&&t2){
            a.push({
              startLat:t1.latitude,startLng:t1.longitude,
              endLat:t2.latitude,endLng:t2.longitude,
              colors:['rgba(245,158,11,0.9)','rgba(245,158,11,0.5)']
            });
          }
        }
      });
    }
    globe.arcsData(a);
  }else globe.arcsData([]);

  // Floating particles
  var particles=[];
  t.forEach(function(x,i){
    var col=hueColors[i%hueColors.length];
    for(var j=0;j<3;j++){
      particles.push({
        lat:x.latitude+(Math.random()-0.5)*3,
        lng:x.longitude+(Math.random()-0.5)*3,
        alt:0.05+Math.random()*0.1,
        size:0.15+Math.random()*0.2,
        color:'rgb('+col+')',
        opacity:0.3+Math.random()*0.3
      });
    }
  });
  globe.customLayerData(particles);
}
<\/script>
</body>
</html>`;

export default function EarthGlobe({ trips, onPinClick, targetCoordinates, homeLocation, itineraries, showHomeLines }: EarthGlobeProps) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const pendingTrips = useRef<Trip[]>([]);

  const sendToWebView = useCallback((data: Record<string, unknown>) => {
    if (!webViewRef.current) return;
    const json = JSON.stringify(data);
    webViewRef.current.injectJavaScript(
      `try{handleMessageFromRN(${JSON.stringify(json)});}catch(e){}true;`
    );
  }, []);

  useEffect(() => {
    const td = trips.map((t) => ({
      id: t.id, title: t.title, latitude: t.latitude,
      longitude: t.longitude, createdAt: t.createdAt,
      itineraryId: t.itineraryId,
    }));
    const itinData = (itineraries || []).map((it) => ({
      id: it.id, name: it.name, tripIds: it.tripIds,
    }));
    if (isReady.current) {
      sendToWebView({ type: 'updateTrips', trips: td, itineraries: itinData });
    } else {
      pendingTrips.current = trips;
    }
  }, [trips, itineraries, sendToWebView]);

  useEffect(() => {
    if (isReady.current) {
      sendToWebView({ type: 'updateHome', home: homeLocation || null });
    }
  }, [homeLocation, sendToWebView]);

  useEffect(() => {
    if (isReady.current) {
      sendToWebView({ type: 'updateHomeLines', show: showHomeLines !== false });
    }
  }, [showHomeLines, sendToWebView]);

  useEffect(() => {
    if (targetCoordinates && isReady.current) {
      sendToWebView({ type: 'flyTo', lat: targetCoordinates.latitude, lng: targetCoordinates.longitude });
    }
  }, [targetCoordinates, sendToWebView]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') {
          isReady.current = true;
          const src = pendingTrips.current.length > 0 ? pendingTrips.current : trips;
          const itinData = (itineraries || []).map((it) => ({
            id: it.id, name: it.name, tripIds: it.tripIds,
          }));
          sendToWebView({ type: 'updateTrips', trips: src.map((t) => ({
            id: t.id, title: t.title, latitude: t.latitude,
            longitude: t.longitude, createdAt: t.createdAt,
            itineraryId: t.itineraryId,
          })), itineraries: itinData });
          if (homeLocation) {
            sendToWebView({ type: 'updateHome', home: homeLocation });
          }
          sendToWebView({ type: 'updateHomeLines', show: showHomeLines !== false });
          pendingTrips.current = [];
        } else if (data.type === 'pinClick') {
          const trip = trips.find((t) => t.id === data.tripId);
          if (trip) onPinClick(trip);
        }
      } catch (e) {}
    },
    [trips, itineraries, onPinClick, sendToWebView, homeLocation, showHomeLines]
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: GLOBE_HTML, baseUrl: 'https://unpkg.com' }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['https://*', 'about:*']}
        mixedContentMode="never"
        allowFileAccess
        scrollEnabled={false}
        overScrollMode="never"
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        nestedScrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  webview: { flex: 1, backgroundColor: '#050510' },
});

/**
 * TravelSphere - EarthGlobe Component
 * Globo 3D futuristico: hex/wireframe holografico con animazioni attraenti
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
var globe=null,_trips=[],_itineraries=[],_zoomFactor=1.0,_home=null,_ready=false,_showTravelLines=true,_pointsData=[];
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
  for(var i=0;i<150;i++){
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
      .pointRadius(function(d){if(d.isHome)return 0.25+0.2*_zoomFactor;if(d.isCluster)return 0.2+0.06*d.clusterCount+0.2*_zoomFactor;return 0.12+0.18*_zoomFactor;})
      .pointResolution(8)

      // PULSING RINGS - dynamic size
      .ringsData([])
      .ringLat('lat').ringLng('lng')
      .ringColor(function(d){return function(t){
        var c=d.ringColor||'255,107,107';
        return 'rgba('+c+','+(1-t)*0.6+')';
      };})
      .ringMaxRadius(function(){return 0.6+1.2*_zoomFactor;})
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(1200)

      // LABELS - dynamic size, hidden when zoomed out
      .labelsData([])
      .labelLat('lat').labelLng('lng')
      .labelText(function(d){if(_zoomFactor>1.15)return '';return d.label;})
      .labelSize(function(){return 0.2+0.35*_zoomFactor;})
      .labelDotRadius(function(){return 0.08+0.12*_zoomFactor;})
      .labelColor(function(d){if(d.isHome)return 'rgba(255,215,0,0.95)';if(d.isCluster)return 'rgba(0,220,255,1)';return 'rgba(0,220,255,0.95)';})
      .labelResolution(1)
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
        var g=new THREE.SphereGeometry(d.size||0.4,6,6);
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
          for(var lo=0;lo<=360;lo+=4){var th=lo*Math.PI/180;v.push(R*Math.sin(phi)*Math.cos(th),R*Math.cos(phi),R*Math.sin(phi)*Math.sin(th));}
          var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
          scene.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.06})));
        });
        for(var lo=0;lo<360;lo+=30){
          var th=lo*Math.PI/180,v=[];
          for(var lt=-90;lt<=90;lt+=4){var p=(90-lt)*Math.PI/180;v.push(R*Math.sin(p)*Math.cos(th),R*Math.cos(p),R*Math.sin(p)*Math.sin(th));}
          var g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
          scene.add(new THREE.Line(g2,new THREE.LineBasicMaterial({color:0x00d4ff,transparent:true,opacity:0.06})));
        }

        var scanRingGeo=new THREE.RingGeometry(100.2,100.8,48);
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
            // Adatta velocita rotazione allo zoom: lenta da vicino, normale da lontano
            c.autoRotateSpeed=0.4*Math.min(1,Math.max(0.05,(_zoomFactor-0.1)/1.0));
            if(_trips.length>0||_home){
              updateTrips(_trips);
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

function onPin(p){if(!p||!p.tripId)return;if(p.tripId.indexOf('__cluster_')===0){if(globe)globe.pointOfView({lat:p.lat,lng:p.lng,altitude:1.5},1000);return;}if(p.tripId!=='__home__')S({type:'pinClick',tripId:p.tripId});}
function onMsg(e){try{handleCmd(JSON.parse(typeof e.data==='string'?e.data:''));}catch(x){}}
function handleMessageFromRN(d){if(typeof d==='string'){try{d=JSON.parse(d);}catch(e){return;}}handleCmd(d);}
function handleCmd(d){
  if(!d||!d.type)return;
  if(d.type==='updateTrips'){_itineraries=d.itineraries||[];updateTrips(d.trips);}
  else if(d.type==='updateHome'){_home=d.home||null;if(_trips.length>0)updateTrips(_trips);}
  else if(d.type==='updateTravelLines'){_showTravelLines=d.show!==false;if(_trips.length>0)updateTrips(_trips);}
  else if(d.type==='flyTo'&&globe)globe.pointOfView({lat:d.lat,lng:d.lng,altitude:1.8},1500);
}

var hueColors=['255,107,107','0,220,255','139,92,246','16,185,129','245,158,11','236,72,153'];

// Clustering: raggruppa pin vicini in base allo zoom
function computeClusters(points){
  var minDist=1.5+5.0*_zoomFactor;
  var clusters=[];
  // Home sempre da solo
  for(var i=0;i<points.length;i++){
    if(points[i].isHome){
      clusters.push({lat:points[i].lat,lng:points[i].lng,count:1,members:[points[i]],isHome:true,color:points[i].color,ringColor:points[i].ringColor,label:points[i].label,tripId:points[i].tripId});
      break;
    }
  }
  for(var i=0;i<points.length;i++){
    var p=points[i];
    if(p.isHome)continue;
    var bestCluster=-1,bestDist=minDist;
    var cosLat=Math.cos(p.lat*0.01745);
    for(var k=0;k<clusters.length;k++){
      if(clusters[k].isHome)continue;
      var dlat=p.lat-clusters[k].lat;
      var dlng=(p.lng-clusters[k].lng)*cosLat;
      var dist=Math.sqrt(dlat*dlat+dlng*dlng);
      if(dist<bestDist){bestDist=dist;bestCluster=k;}
    }
    if(bestCluster>=0){
      var c=clusters[bestCluster];
      var w=c.count;
      c.lat=(c.lat*w+p.lat)/(w+1);
      c.lng=(c.lng*w+p.lng)/(w+1);
      c.count++;
      c.members.push(p);
    }else{
      clusters.push({lat:p.lat,lng:p.lng,count:1,members:[p],isHome:false,color:p.color,ringColor:p.ringColor,label:p.label,tripId:p.tripId});
    }
  }
  return clusters;
}

function updateTrips(t){
  if(!globe||!t)return;_trips=t;
  var rawPoints=t.map(function(x,i){
    var col=hueColors[i%hueColors.length];
    return{lat:x.latitude,lng:x.longitude,tripId:x.id,label:x.title,color:'rgb('+col+')',ringColor:col};
  });
  if(_home){
    rawPoints.push({lat:_home.latitude,lng:_home.longitude,tripId:'__home__',label:_home.name||'Home',color:'#FFD700',ringColor:'255,215,0',isHome:true});
  }
  _pointsData=rawPoints;

  var clusters=computeClusters(rawPoints);
  var dp=[],dr=[],dl=[];
  for(var i=0;i<clusters.length;i++){
    var cl=clusters[i];
    if(cl.count===1){
      var m=cl.members[0];
      dp.push({lat:m.lat,lng:m.lng,tripId:m.tripId,color:m.color,isHome:m.isHome||false,isCluster:false,clusterCount:1});
      dr.push({lat:m.lat,lng:m.lng,ringColor:m.ringColor});
      dl.push({lat:m.lat,lng:m.lng,tripId:m.tripId,label:m.label,isHome:m.isHome||false,isCluster:false});
    }else{
      dp.push({lat:cl.lat,lng:cl.lng,tripId:'__cluster_'+i,color:'rgba(0,220,255,0.95)',isHome:false,isCluster:true,clusterCount:cl.count});
      dr.push({lat:cl.lat,lng:cl.lng,ringColor:'0,220,255'});
      dl.push({lat:cl.lat,lng:cl.lng,tripId:'__cluster_'+i,label:cl.count+' viaggi',isHome:false,isCluster:true});
    }
  }
  globe.pointsData(dp).ringsData(dr).labelsData(dl);

  // Generate arcs - home-to-trip (per-trip) + itineraries (global toggle)
  if(t.length>0){
    var a=[];
    // Archi home→trip: solo per trip con showArc=true
    if(_home){
      var arcTrips=t.filter(function(x){return x.showArc;});
      arcTrips.forEach(function(x){
        var col=hueColors[t.indexOf(x)%hueColors.length];
        a.push({
          startLat:_home.latitude,startLng:_home.longitude,
          endLat:x.latitude,endLng:x.longitude,
          colors:['rgba(255,215,0,0.9)','rgba('+col+',0.6)']
        });
      });
    }
    // Archi itinerario (oro, controllati da toggle globale)
    if(_showTravelLines&&_itineraries&&_itineraries.length>0){
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
    for(var j=0;j<2;j++){
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

const ORIGIN_WHITELIST = ['https://*', 'about:*'];

function EarthGlobe({ trips, onPinClick, targetCoordinates, homeLocation, itineraries, showTravelLines }: EarthGlobeProps) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const pendingTrips = useRef<Trip[]>([]);

  const webViewSource = useMemo(() => ({ html: GLOBE_HTML, baseUrl: 'https://unpkg.com' }), []);

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
      showArc: t.showArc || false,
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
      sendToWebView({ type: 'updateTravelLines', show: showTravelLines !== false });
    }
  }, [showTravelLines, sendToWebView]);

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
            showArc: t.showArc || false,
          })), itineraries: itinData });
          if (homeLocation) {
            sendToWebView({ type: 'updateHome', home: homeLocation });
          }
          sendToWebView({ type: 'updateTravelLines', show: showTravelLines !== false });
          pendingTrips.current = [];
        } else if (data.type === 'pinClick') {
          const trip = trips.find((t) => t.id === data.tripId);
          if (trip) onPinClick(trip);
        }
      } catch (e) {}
    },
    [trips, itineraries, onPinClick, sendToWebView, homeLocation, showTravelLines]
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={webViewSource}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={ORIGIN_WHITELIST}
        mixedContentMode="never"
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
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

export default React.memo(EarthGlobe);

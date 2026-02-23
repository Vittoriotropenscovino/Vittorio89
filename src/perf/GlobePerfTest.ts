/**
 * TravelSphere - Globe WebView Performance Test
 *
 * HTML completo del globo di produzione + HUD performance + 6 test automatici.
 * Questa stringa sostituisce GLOBE_HTML quando si vuole profilare il rendering.
 */

export const GLOBE_PERF_HTML = `<!DOCTYPE html>
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

/* === PERF HUD === */
#perfHUD{position:fixed;top:8px;right:8px;z-index:10000;background:rgba(5,5,16,0.88);border:1px solid rgba(0,212,255,0.3);border-radius:8px;padding:10px 14px;font:11px/1.6 monospace;color:#b0e0ff;pointer-events:none;min-width:200px;backdrop-filter:blur(6px)}
#perfHUD .label{color:rgba(0,212,255,0.6);font-size:9px;text-transform:uppercase;letter-spacing:1px}
#perfHUD .value{color:#00d4ff;font-size:14px;font-weight:bold}
#perfHUD .warn{color:#f59e0b}
#perfHUD .bad{color:#ff6b6b}
#perfHUD .good{color:#10b981}
#perfHUD .test-name{color:#c084fc;font-size:10px;margin-top:4px}
#perfHUD .divider{border-top:1px solid rgba(0,212,255,0.15);margin:6px 0}

/* === CONTROLS === */
#perfControls{position:fixed;bottom:8px;right:8px;z-index:10000;display:flex;flex-direction:column;gap:4px;pointer-events:auto}
#perfControls button{background:rgba(5,5,16,0.9);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;font:10px monospace;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.2s}
#perfControls button:hover{background:rgba(0,212,255,0.15);border-color:#00d4ff}
#perfControls button:active{background:rgba(0,212,255,0.25)}
#perfControls button.running{border-color:#f59e0b;color:#f59e0b;cursor:wait}
#perfControls button.primary{background:rgba(0,212,255,0.12);font-size:12px;padding:8px 16px;font-weight:bold}

/* === SUMMARY OVERLAY === */
#perfSummary{position:fixed;top:0;left:0;width:100%;height:100%;z-index:20000;background:rgba(5,5,16,0.92);display:none;justify-content:center;align-items:center;backdrop-filter:blur(8px)}
#perfSummary .panel{background:rgba(10,10,30,0.95);border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:20px 28px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;font:11px monospace;color:#b0e0ff}
#perfSummary h2{color:#00d4ff;font-size:16px;margin-bottom:12px;text-align:center}
#perfSummary table{width:100%;border-collapse:collapse;margin:8px 0}
#perfSummary th{color:rgba(0,212,255,0.6);font-size:9px;text-transform:uppercase;letter-spacing:1px;text-align:left;padding:4px 6px;border-bottom:1px solid rgba(0,212,255,0.2)}
#perfSummary td{padding:5px 6px;border-bottom:1px solid rgba(0,212,255,0.08)}
#perfSummary .status{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
#perfSummary .status.pass{background:#10b981}
#perfSummary .status.warn{background:#f59e0b}
#perfSummary .status.fail{background:#ff6b6b}
#perfSummary .actions{display:flex;gap:8px;margin-top:14px;justify-content:center}
#perfSummary .actions button{background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;font:11px monospace;padding:8px 18px;border-radius:6px;cursor:pointer}
</style>
</head>
<body>
<canvas class="stars" id="starCanvas"></canvas>
<div id="globeViz"></div>
<div id="dbg">loading...</div>

<!-- PERF HUD -->
<div id="perfHUD">
  <div class="label">FPS</div>
  <div class="value" id="hud-fps">--</div>
  <div class="divider"></div>
  <div class="label">Frame Time (ms)</div>
  <div id="hud-frametime" style="font-size:10px">min -- / avg -- / max -- / p95 --</div>
  <div class="divider"></div>
  <div class="label">Trips</div>
  <div id="hud-trips" style="color:#c084fc">0</div>
  <div class="label">Jank Frames</div>
  <div id="hud-jank">0</div>
  <div class="label">Memory</div>
  <div id="hud-mem">N/A</div>
  <div class="divider"></div>
  <div class="label">Test</div>
  <div class="test-name" id="hud-test">idle</div>
</div>

<!-- CONTROLS -->
<div id="perfControls">
  <button class="primary" id="btn-runall" onclick="TestRunner.runAll()">RUN ALL TESTS</button>
  <button onclick="TestRunner.runSingle(0)">1. FPS Baseline</button>
  <button onclick="TestRunner.runSingle(1)">2. Render Stress</button>
  <button onclick="TestRunner.runSingle(2)">3. Animation</button>
  <button onclick="TestRunner.runSingle(3)">4. Throughput</button>
  <button onclick="TestRunner.runSingle(4)">5. Zoom Stress</button>
  <button onclick="TestRunner.runSingle(5)">6. Latency</button>
  <button onclick="TestRunner.exportJSON()">EXPORT JSON</button>
</div>

<!-- SUMMARY OVERLAY -->
<div id="perfSummary">
  <div class="panel" id="summary-panel"></div>
</div>

<script>
var globe=null,_trips=[],_itineraries=[],_zoomFactor=1.0,_home=null,_ready=false,_showHomeLines=true;
var dbg=document.getElementById('dbg');
function L(m){if(dbg&&!_ready)dbg.textContent=m;S({type:'log',message:m});}
function S(d){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(d));}catch(e){}}
window.onerror=function(m){if(!_ready)L('ERR:'+m);};

// ========================================
// PERF METRICS MODULE
// ========================================
var PerfMetrics={
  _frameDeltas:[],
  _jankCount:0,
  _lastFpsUpdate:0,
  _currentFps:0,
  _monitorActive:false,

  startFPSMonitor:function(){
    if(this._monitorActive)return;
    this._monitorActive=true;
    var self=this;
    var lastTime=performance.now();
    function tick(){
      var now=performance.now();
      var delta=now-lastTime;
      lastTime=now;
      if(delta>0&&delta<500){
        self._frameDeltas.push(delta);
        if(self._frameDeltas.length>120)self._frameDeltas.shift();
        if(delta>33.33)self._jankCount++;
      }
      if(now-self._lastFpsUpdate>500){
        self._lastFpsUpdate=now;
        if(self._frameDeltas.length>0){
          var avg=0;
          for(var i=0;i<self._frameDeltas.length;i++)avg+=self._frameDeltas[i];
          avg/=self._frameDeltas.length;
          self._currentFps=Math.round(1000/avg);
        }
        self._updateHUD();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },

  snapshot:function(){
    var deltas=this._frameDeltas.slice();
    var sorted=deltas.slice().sort(function(a,b){return a-b;});
    var avg=0;
    for(var i=0;i<deltas.length;i++)avg+=deltas[i];
    avg=deltas.length?avg/deltas.length:0;
    var mem=null;
    try{if(performance.memory)mem={used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit};}catch(e){}
    return{
      fps:this._currentFps,
      frameTimeAvg:Math.round(avg*100)/100,
      frameTimeMin:sorted.length?Math.round(sorted[0]*100)/100:0,
      frameTimeMax:sorted.length?Math.round(sorted[sorted.length-1]*100)/100:0,
      frameTimeP95:sorted.length?Math.round(sorted[Math.floor(sorted.length*0.95)]*100)/100:0,
      jankFrames:this._jankCount,
      memory:mem,
      tripCount:_trips.length,
      timestamp:Date.now()
    };
  },

  resetCounters:function(){
    this._frameDeltas=[];
    this._jankCount=0;
  },

  report:function(testName,data){
    S({type:'perfResult',test:testName,data:data,snapshot:this.snapshot()});
  },

  _updateHUD:function(){
    var s=this.snapshot();
    var fpsEl=document.getElementById('hud-fps');
    var ftEl=document.getElementById('hud-frametime');
    var tripsEl=document.getElementById('hud-trips');
    var jankEl=document.getElementById('hud-jank');
    var memEl=document.getElementById('hud-mem');
    if(fpsEl){
      fpsEl.textContent=s.fps;
      fpsEl.className='value'+(s.fps>=55?' good':s.fps>=30?' warn':' bad');
    }
    if(ftEl)ftEl.textContent='min '+s.frameTimeMin+' / avg '+s.frameTimeAvg+' / max '+s.frameTimeMax+' / p95 '+s.frameTimeP95;
    if(tripsEl)tripsEl.textContent=s.tripCount;
    if(jankEl){
      jankEl.textContent=s.jankFrames;
      jankEl.style.color=s.jankFrames>20?'#ff6b6b':s.jankFrames>5?'#f59e0b':'#10b981';
    }
    if(memEl){
      if(s.memory)memEl.textContent=Math.round(s.memory.used/1048576)+'MB / '+Math.round(s.memory.total/1048576)+'MB';
      else memEl.textContent='N/A';
    }
  }
};

// ========================================
// TEST DATA GENERATOR
// ========================================
var TestData={
  generateTrips:function(count){
    var trips=[];
    var goldenAngle=137.508*Math.PI/180;
    for(var i=0;i<count;i++){
      var theta=goldenAngle*i;
      var lat=Math.asin(-1+(2*i+1)/count)*180/Math.PI;
      var lng=(theta*180/Math.PI)%360-180;
      trips.push({
        id:'perf_'+i,
        title:'Trip '+i,
        latitude:lat,
        longitude:lng,
        createdAt:Date.now()-(count-i)*86400000,
        itineraryId:null
      });
    }
    return trips;
  },
  generateItineraries:function(trips,groupSize){
    var itins=[];
    for(var i=0;i<trips.length;i+=groupSize){
      var ids=[];
      for(var j=i;j<Math.min(i+groupSize,trips.length);j++)ids.push(trips[j].id);
      if(ids.length>=2)itins.push({id:'itin_'+i,name:'Itinerary '+i,tripIds:ids});
    }
    return itins;
  },
  generateHome:function(){return{latitude:41.9028,longitude:12.4964,name:'Rome'};}
};

// ========================================
// TEST RUNNER
// ========================================
var TestRunner={
  results:[],
  _allTests:[],
  _queue:[],
  _currentTest:null,
  _aborted:false,
  _startTime:0,

  init:function(){
    this._allTests=[
      {name:'FPS Baseline',fn:Tests.fpsBaseline},
      {name:'Render Stress',fn:Tests.renderStress},
      {name:'Animation Performance',fn:Tests.animationPerf},
      {name:'Data Throughput',fn:Tests.dataThroughput},
      {name:'Zoom Stress',fn:Tests.zoomStress},
      {name:'Interaction Latency',fn:Tests.interactionLatency}
    ];
  },

  runAll:function(){
    this.results=[];
    this._aborted=false;
    this._startTime=performance.now();
    this._queue=this._allTests.slice();
    this._setControls(true);
    this._next();
  },

  runSingle:function(idx){
    if(idx<0||idx>=this._allTests.length)return;
    this.results=[];
    this._aborted=false;
    this._startTime=performance.now();
    this._queue=[this._allTests[idx]];
    this._setControls(true);
    this._next();
  },

  _next:function(){
    if(this._aborted||this._queue.length===0){this._finish();return;}
    var test=this._queue.shift();
    this._currentTest=test.name;
    var testEl=document.getElementById('hud-test');
    if(testEl)testEl.textContent=test.name+'...';
    var self=this;
    try{
      test.fn(function(result){
        self.results.push({test:test.name,result:result,snapshot:PerfMetrics.snapshot()});
        PerfMetrics.report(test.name,result);
        PerfMetrics.resetCounters();
        setTimeout(function(){self._next();},500);
      });
    }catch(e){
      self.results.push({test:test.name,error:e.message});
      setTimeout(function(){self._next();},100);
    }
  },

  _finish:function(){
    this._currentTest=null;
    var testEl=document.getElementById('hud-test');
    if(testEl)testEl.textContent='done';
    var totalDuration=performance.now()-this._startTime;
    var summary={tests:this.results,totalDurationMs:Math.round(totalDuration),timestamp:Date.now()};
    S({type:'perfSummary',summary:summary});
    this._showSummary(summary);
    this._setControls(false);
    // Pulisci il globo
    handleCmd({type:'updateTrips',trips:[],itineraries:[]});
  },

  _setControls:function(running){
    var btn=document.getElementById('btn-runall');
    if(btn){
      if(running){btn.textContent='RUNNING...';btn.className='primary running';}
      else{btn.textContent='RUN ALL TESTS';btn.className='primary';}
    }
  },

  _showSummary:function(summary){
    var overlay=document.getElementById('perfSummary');
    var panel=document.getElementById('summary-panel');
    if(!overlay||!panel)return;
    var html='<h2>Performance Report</h2>';
    html+='<div style="text-align:center;color:rgba(0,212,255,0.6);font-size:10px;margin-bottom:10px">Total: '+Math.round(summary.totalDurationMs/1000)+'s</div>';
    html+='<table><tr><th></th><th>Test</th><th>Key Metric</th><th>Detail</th></tr>';
    for(var i=0;i<summary.tests.length;i++){
      var t=summary.tests[i];
      var r=t.result||{};
      var snap=t.snapshot||{};
      var fps=snap.fps||r.fps||(r.snapshot?r.snapshot.fps:0)||0;
      var statusClass=fps>=55?'pass':fps>=30?'warn':'fail';
      var metric=fps+'fps';
      var detail='';
      if(t.test==='Render Stress'&&r.levels){
        var last=r.levels[r.levels.length-1];
        fps=last.snapshot?last.snapshot.fps:0;
        statusClass=fps>=30?'pass':fps>=15?'warn':'fail';
        metric=last.tripCount+' trips @ '+fps+'fps';
        detail='sync:'+Math.round(last.syncRenderTime)+'ms';
      }else if(t.test==='Data Throughput'){
        metric=(r.updatesPerSecond||0)+' upd/s';
        detail='avg:'+Math.round((r.avgCallTimeMs||0)*100)/100+'ms p95:'+Math.round((r.p95CallTimeMs||0)*100)/100+'ms';
        statusClass=(r.updatesPerSecond||0)>50?'pass':'warn';
      }else if(t.test==='Interaction Latency'){
        metric='avg '+(Math.round((r.avgLatencyMs||0)*100)/100)+'ms';
        detail='p95:'+(Math.round((r.p95LatencyMs||0)*100)/100)+'ms';
        statusClass=(r.avgLatencyMs||99)<1?'pass':'warn';
      }else if(t.test==='Zoom Stress'&&r.levels){
        var minFps=999;
        for(var z=0;z<r.levels.length;z++){var zf=r.levels[z].snapshot?r.levels[z].snapshot.fps:0;if(zf<minFps)minFps=zf;}
        fps=minFps;
        statusClass=fps>=45?'pass':fps>=25?'warn':'fail';
        metric='min '+fps+'fps across '+r.levels.length+' zoom levels';
      }else if(t.test==='Animation Performance'&&r.results){
        var ar=r.results.autoRotation;
        fps=ar?ar.fps:snap.fps;
        statusClass=fps>=50?'pass':fps>=30?'warn':'fail';
        metric=fps+'fps (rotation)';
        if(r.results.flyTo)detail='flyTo:'+r.results.flyTo.frameCount+' frames';
      }
      if(t.error){statusClass='fail';metric='ERROR';detail=t.error;}
      html+='<tr><td><span class="status '+statusClass+'"></span></td><td>'+t.test+'</td><td>'+metric+'</td><td style="color:rgba(176,224,255,0.5)">'+detail+'</td></tr>';
    }
    html+='</table>';
    html+='<div class="actions"><button onclick="document.getElementById(\\'perfSummary\\').style.display=\\'none\\'">CLOSE</button>';
    html+='<button onclick="TestRunner.exportJSON()">EXPORT JSON</button></div>';
    panel.innerHTML=html;
    overlay.style.display='flex';
  },

  exportJSON:function(){
    S({type:'perfExport',data:this.results,timestamp:Date.now()});
  },

  abort:function(){this._aborted=true;}
};

// ========================================
// TEST MODULES
// ========================================
var Tests={

  // TEST 1: FPS Baseline - empty globe for 2s
  fpsBaseline:function(done){
    handleCmd({type:'updateTrips',trips:[],itineraries:[]});
    setTimeout(function(){
      PerfMetrics.resetCounters();
      setTimeout(function(){
        var snap=PerfMetrics.snapshot();
        done({label:'FPS Baseline (empty globe)',fps:snap.fps,snapshot:snap});
      },2000);
    },500);
  },

  // TEST 2: Render Stress - progressive trip loading
  renderStress:function(done){
    var levels=[10,50,100,500,1000];
    var results=[];
    function runLevel(idx){
      if(idx>=levels.length){done({label:'Render Stress',levels:results});return;}
      var n=levels[idx];
      var trips=TestData.generateTrips(n);
      PerfMetrics.resetCounters();

      var t0=performance.now();
      handleCmd({type:'updateTrips',trips:trips,itineraries:[]});
      var syncTime=performance.now()-t0;

      requestAnimationFrame(function(){
        var firstFrame=performance.now()-t0;
        // steady-state 3 seconds
        setTimeout(function(){
          results.push({
            tripCount:n,
            syncRenderTime:Math.round(syncTime*100)/100,
            firstFrameTime:Math.round(firstFrame*100)/100,
            snapshot:PerfMetrics.snapshot()
          });
          runLevel(idx+1);
        },3000);
      });
    }
    runLevel(0);
  },

  // TEST 3: Animation Performance
  animationPerf:function(done){
    var results={};
    // Phase 1: Auto-rotation, empty globe
    handleCmd({type:'updateTrips',trips:[],itineraries:[]});
    if(globe&&globe.controls())globe.controls().autoRotate=true;
    PerfMetrics.resetCounters();
    setTimeout(function(){
      results.autoRotation=PerfMetrics.snapshot();

      // Phase 2: flyTo Tokyo
      PerfMetrics.resetCounters();
      var flyStart=performance.now();
      if(globe)globe.pointOfView({lat:35.6762,lng:139.6503,altitude:1.8},1500);
      var flyFrames=[];
      function trackFly(){
        flyFrames.push(performance.now()-flyStart);
        if(performance.now()-flyStart<2000)requestAnimationFrame(trackFly);
        else{
          results.flyTo={frameCount:flyFrames.length,durationMs:2000,snapshot:PerfMetrics.snapshot()};

          // Phase 3: Arcs + Rings with 50 trips
          var trips50=TestData.generateTrips(50);
          handleCmd({type:'updateTrips',trips:trips50,itineraries:[]});
          PerfMetrics.resetCounters();
          setTimeout(function(){
            results.arcRingAnimation=PerfMetrics.snapshot();
            done({label:'Animation Performance',results:results});
          },3000);
        }
      }
      requestAnimationFrame(trackFly);
    },3000);
  },

  // TEST 4: Data Throughput - rapid-fire updates
  dataThroughput:function(done){
    var callTimes=[];
    var totalCalls=100;
    var trips=TestData.generateTrips(50);
    var completed=0;
    var t0=performance.now();

    for(var i=0;i<totalCalls;i++){
      (function(){
        setTimeout(function(){
          var ct0=performance.now();
          handleCmd({type:'updateTrips',trips:trips,itineraries:[]});
          callTimes.push(performance.now()-ct0);
          completed++;
          if(completed===totalCalls){
            var totalTime=performance.now()-t0;
            callTimes.sort(function(a,b){return a-b;});
            var avg=0;
            for(var j=0;j<callTimes.length;j++)avg+=callTimes[j];
            avg/=callTimes.length;
            done({
              label:'Data Throughput',
              totalCalls:totalCalls,
              totalTimeMs:Math.round(totalTime*100)/100,
              avgCallTimeMs:Math.round(avg*100)/100,
              p50CallTimeMs:Math.round(callTimes[Math.floor(callTimes.length*0.5)]*100)/100,
              p95CallTimeMs:Math.round(callTimes[Math.floor(callTimes.length*0.95)]*100)/100,
              maxCallTimeMs:Math.round(callTimes[callTimes.length-1]*100)/100,
              updatesPerSecond:Math.round(totalCalls/(totalTime/1000))
            });
          }
        },0);
      })();
    }
  },

  // TEST 5: Zoom Stress - multiple distance levels
  zoomStress:function(done){
    var trips100=TestData.generateTrips(100);
    handleCmd({type:'updateTrips',trips:trips100,itineraries:[]});
    var distances=[120,200,300,450,580];
    var results=[];

    function runZoom(idx){
      if(idx>=distances.length){done({label:'Zoom Stress',levels:results});return;}
      var dist=distances[idx];
      try{
        var cam=globe.controls().object;
        var dir=cam.position.clone().normalize();
        cam.position.copy(dir.multiplyScalar(dist));
        globe.controls().update();
        globe.controls().dispatchEvent({type:'change'});
      }catch(e){}

      PerfMetrics.resetCounters();
      setTimeout(function(){
        results.push({
          distance:dist,
          zoomFactor:_zoomFactor,
          snapshot:PerfMetrics.snapshot()
        });
        runZoom(idx+1);
      },2000);
    }
    setTimeout(function(){runZoom(0);},500);
  },

  // TEST 6: Interaction Latency - pin click to postMessage
  interactionLatency:function(done){
    var trips10=TestData.generateTrips(10);
    handleCmd({type:'updateTrips',trips:trips10,itineraries:[]});

    setTimeout(function(){
      var latencies=[];
      var originalPM=window.ReactNativeWebView?window.ReactNativeWebView.postMessage:null;
      var captureStart=0;

      // Wrapper temporaneo
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage=function(msg){
          try{
            var parsed=JSON.parse(msg);
            if(parsed.type==='pinClick')latencies.push(performance.now()-captureStart);
          }catch(e){}
          if(originalPM)originalPM.call(window.ReactNativeWebView,msg);
        };
      }

      var iterations=50;
      var current=0;
      function nextClick(){
        if(current>=iterations){
          // Ripristina
          if(window.ReactNativeWebView&&originalPM)window.ReactNativeWebView.postMessage=originalPM;
          latencies.sort(function(a,b){return a-b;});
          var avg=0;
          for(var k=0;k<latencies.length;k++)avg+=latencies[k];
          avg=latencies.length?avg/latencies.length:0;
          done({
            label:'Interaction Latency',
            iterations:iterations,
            measured:latencies.length,
            avgLatencyMs:Math.round(avg*1000)/1000,
            minLatencyMs:latencies.length?Math.round(latencies[0]*1000)/1000:0,
            maxLatencyMs:latencies.length?Math.round(latencies[latencies.length-1]*1000)/1000:0,
            p95LatencyMs:latencies.length?Math.round(latencies[Math.floor(latencies.length*0.95)]*1000)/1000:0
          });
          return;
        }
        captureStart=performance.now();
        onPin({tripId:trips10[current%trips10.length].id});
        current++;
        setTimeout(nextClick,20);
      }
      nextClick();
    },500);
  }
};

// ========================================
// STAR FIELD BACKGROUND (same as production)
// ========================================
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

// ========================================
// GLOBE INITIALIZATION (same as production)
// ========================================
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

      .hexPolygonsData(f)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.55)
      .hexPolygonColor(function(){return 'rgba(0,220,255,0.4)';})
      .hexPolygonAltitude(0.008)

      .polygonsData(f)
      .polygonCapColor(function(){return 'rgba(0,0,0,0)';})
      .polygonSideColor(function(){return 'rgba(0,200,255,0.08)';})
      .polygonStrokeColor(function(){return 'rgba(0,220,255,0.5)';})
      .polygonAltitude(0.009)

      .pointsData([])
      .pointLat('lat').pointLng('lng')
      .pointColor(function(d){return d.color||'#ff6b6b';})
      .pointAltitude(function(){return 0.01+0.04*_zoomFactor;})
      .pointRadius(function(d){return d.isHome?0.25+0.2*_zoomFactor:0.12+0.18*_zoomFactor;})
      .pointResolution(12)

      .ringsData([])
      .ringLat('lat').ringLng('lng')
      .ringColor(function(d){return function(t){
        var c=d.ringColor||'255,107,107';
        return 'rgba('+c+','+(1-t)*0.6+')';
      };})
      .ringMaxRadius(function(){return 1.0+1.8*_zoomFactor;})
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(1200)

      .labelsData([])
      .labelLat('lat').labelLng('lng')
      .labelText(function(d){return _zoomFactor>1.15?'':d.label;})
      .labelSize(function(){return 0.2+0.35*_zoomFactor;})
      .labelDotRadius(function(){return 0.08+0.12*_zoomFactor;})
      .labelColor(function(d){return d.isHome?'rgba(255,215,0,0.95)':'rgba(0,220,255,0.95)';})
      .labelResolution(2)
      .labelAltitude(0.015)

      .arcsData([])
      .arcColor(function(d){return d.colors||['rgba(0,220,255,0.9)','rgba(255,107,107,0.3)'];})
      .arcDashLength(0.5)
      .arcDashGap(0.1)
      .arcDashAnimateTime(2000)
      .arcStroke(0.8)
      .arcAltitudeAutoScale(0.45)

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

    try{
      var m=globe.globeMaterial();
      m.color.set('#0a1e3d');
      m.emissive.set('#0a2a4a');
      m.emissiveIntensity=0.3;
      m.shininess=0;
    }catch(e){}

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

    // Avvia FPS monitor e inizializza test runner
    PerfMetrics.startFPSMonitor();
    TestRunner.init();

    S({type:'ready'});
    L('ready + perf monitor active');
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
  else if(d.type==='runTests')TestRunner.runAll();
  else if(d.type==='runTest'&&typeof d.index==='number')TestRunner.runSingle(d.index);
}

var hueColors=['255,107,107','0,220,255','139,92,246','16,185,129','245,158,11','236,72,153'];
function updateTrips(t){
  if(!globe||!t)return;_trips=t;
  var p=t.map(function(x,i){
    var col=hueColors[i%hueColors.length];
    return{lat:x.latitude,lng:x.longitude,tripId:x.id,label:x.title,color:'rgb('+col+')',ringColor:col};
  });

  if(_home){
    p.push({lat:_home.latitude,lng:_home.longitude,tripId:'__home__',label:_home.name||'Home',color:'#FFD700',ringColor:'255,215,0',isHome:true});
  }

  globe.pointsData(p).ringsData(p).labelsData(p);

  if(t.length>0){
    var s=t.slice().sort(function(a,b){return a.createdAt-b.createdAt;});
    var a=[];

    if(_home&&_showHomeLines){
      var freeTrips=s.filter(function(x){return !x.itineraryId;});
      if(freeTrips.length>0){
        a.push({
          startLat:_home.latitude,startLng:_home.longitude,
          endLat:freeTrips[0].latitude,endLng:freeTrips[0].longitude,
          colors:['rgba(255,215,0,0.9)','rgba('+hueColors[0]+',0.6)']
        });
        for(var i=0;i<freeTrips.length-1;i++){
          var col1=hueColors[i%hueColors.length];
          var col2=hueColors[(i+1)%hueColors.length];
          a.push({
            startLat:freeTrips[i].latitude,startLng:freeTrips[i].longitude,
            endLat:freeTrips[i+1].latitude,endLng:freeTrips[i+1].longitude,
            colors:['rgba('+col1+',0.9)','rgba('+col2+',0.4)']
          });
        }
        var lastCol=hueColors[(freeTrips.length-1)%hueColors.length];
        a.push({
          startLat:freeTrips[freeTrips.length-1].latitude,startLng:freeTrips[freeTrips.length-1].longitude,
          endLat:_home.latitude,endLng:_home.longitude,
          colors:['rgba('+lastCol+',0.6)','rgba(255,215,0,0.9)']
        });
      }
    }else if(!_home){
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

  // Aggiorna HUD trips
  var tripsEl=document.getElementById('hud-trips');
  if(tripsEl)tripsEl.textContent=t.length;
}
<\/script>
</body>
</html>`;

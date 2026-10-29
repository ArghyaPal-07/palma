import { HandRenderer } from './effects.js';

const $ = id => document.getElementById(id);
const video=$('webcam'), stage=$('stage'), renderer=new HandRenderer($('overlay'));
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const state={mode:'idle', detector:null, stream:null, lastVideoTime:-1, mirrored:true, frameCount:0, frameStarted:0, demoStarted:0, lastDemoFrame:0, requestId:0};
let visionPromise, toastTimer;
const effectNames={orbit:'Orbit',trails:'Flow',heart:'Made for you'};

function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function resize(){const rect=stage.getBoundingClientRect();renderer.resize(rect.width,rect.height);}
new ResizeObserver(resize).observe(stage);

function updateStatus(mode){
  state.mode=mode;stage.dataset.mode=mode;
  const live=mode==='live',demo=mode==='demo',loading=mode==='loading';
  $('stageLabel').textContent=live?'Live playground':demo?'Interactive demo':loading?'Getting things ready':'Your space to play';
  $('cameraState').textContent=live?'Camera on':demo?'Demo · camera off':loading?'Connecting camera…':'Camera off';
  $('cameraDot').className='status-dot'+(live?' live':demo?' demo':'');
  $('trackingDot').className='status-dot'+(live?' live':'');
  $('trackingState').textContent=live?'Show the camera your hands':demo?'Simulated hand movement':loading?'Preparing hand tracking':'Ready when you are';
  $('startBtn').disabled=loading;$('startLabel').textContent=loading?'Starting camera…':'Enable camera';
  $('stopBtn').hidden=!live&&!loading;
  $('stopBtn').lastChild.textContent=loading?'Cancel':'Stop camera';
  $('demoBtn').hidden=loading;
  $('demoBtn').querySelector('span').textContent=demo?'Exit demo':'Explore demo';
  $('welcome').hidden=live||demo;
  video.hidden=!live;
  $('stageHint').textContent=demo?'Demo preview · no camera needed':live?'Keep your hands inside the frame':'No downloads. Just a little hand magic.';
  if(!live){$('handCount').textContent='0';$('landmarkCount').textContent='—';$('fpsCount').textContent='—';}
  renderer.reset();state.lastVideoTime=-1;
}
function stopStream(){
  state.stream?.getTracks().forEach(track=>track.stop());
  state.stream=null;video.srcObject=null;
}
function stopCamera(){state.requestId++;stopStream();state.detector?.close();state.detector=null;updateStatus('idle');}
function cameraError(error){
  stopStream();state.detector?.close();state.detector=null;updateStatus('error');
  const messages={
    NotAllowedError:'Camera access is blocked. Allow it in your browser, then try again.',
    NotFoundError:'No camera found. Connect a webcam, or explore the demo.',
    NotReadableError:'Your camera is busy. Close other camera apps, then try again.',
    SecurityError:'Your browser blocked the camera. Try localhost or a secure HTTPS connection.',
    OverconstrainedError:'This camera cannot use those settings. Try Speed mode.'
  };
  $('cameraMessage').textContent=messages[error.name]||'Hand tracking could not start. Check your connection and try again, or explore the demo.';
  $('startLabel').textContent='Try again';
  $('trackingState').textContent='Camera unavailable';
}
const preset=()=> $('modeSelect').value==='speed'?{width:640,height:480,frameRate:30}:{width:960,height:720,frameRate:30};
async function loadDetector(){
  // Load the vision runtime only after an explicit camera request.
  visionPromise ||= import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs').catch(error=>{visionPromise=null;throw error;});
  const {HandLandmarker,FilesetResolver}=await visionPromise;
  const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm');
  const options={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:2};
  try{return await HandLandmarker.createFromOptions(files,options);}catch{options.baseOptions.delegate='CPU';return await HandLandmarker.createFromOptions(files,options);}
}
async function enableCamera(){
  if(state.mode==='loading'||state.mode==='live')return;
  if(!navigator.mediaDevices?.getUserMedia){cameraError({name:'SecurityError'});return;}
  const requestId=++state.requestId;
  updateStatus('loading');$('cameraMessage').textContent='Allow camera access to bring your hands into the playground.';
  try{
    const p=preset();
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:p.width},height:{ideal:p.height},frameRate:{ideal:p.frameRate,max:p.frameRate}},audio:false});
    if(requestId!==state.requestId){stream.getTracks().forEach(track=>track.stop());return;}
    state.stream=stream;video.srcObject=stream;
    $('cameraMessage').textContent='Loading the hand tracker. The first visit may take a moment.';
    const detector=await loadDetector();
    if(requestId!==state.requestId){detector.close();return;}
    state.detector=detector;
    await video.play();
    if(requestId!==state.requestId)return;
    // Track hardware disconnects and permission revocation without leaving stale video.
    state.stream.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(state.mode==='live'){stopCamera();notify('Camera disconnected. Reconnect it and try again.');}}));
    state.frameCount=0;state.frameStarted=performance.now();updateStatus('live');
  }catch(error){if(requestId===state.requestId)cameraError(error);}
}
$('startBtn').addEventListener('click',enableCamera);
$('stopBtn').addEventListener('click',()=>{stopCamera();$('cameraMessage').textContent='Turn everyday gestures into something unexpected.';});
$('demoBtn').addEventListener('click',()=>{
  if(state.mode==='demo'){
    updateStatus('idle');$('cameraMessage').textContent='Turn everyday gestures into something unexpected.';return;
  }
  if(state.mode==='live')stopCamera();
  state.demoStarted=performance.now();updateStatus('demo');
});

function selectEffect(effect){
  renderer.settings.effect=effect;renderer.reset();
  document.querySelectorAll('[data-effect]').forEach(button=>{const selected=button.dataset.effect===effect;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  $('overlay').setAttribute('aria-label',`${effectNames[effect]} hand tracking preview`);
  if(state.mode==='demo')$('stageHint').textContent=effect==='heart'?'A two-hand heart · simulated demo':'Demo preview · no camera needed';
}
document.querySelectorAll('[data-effect]').forEach(button=>button.addEventListener('click',()=>selectEffect(button.dataset.effect)));
for(const [id,setting] of [['skeletonToggle','skeleton'],['ringsToggle','rings'],['particlesToggle','particles']]){
  $(id).addEventListener('change',()=>{renderer.settings[setting]=$(id).checked;renderer.reset();});
}

async function applyPerformance(){
  if(state.mode!=='live')return;
  try{
    const p=preset();
    await state.stream.getVideoTracks()[0].applyConstraints({width:{ideal:p.width},height:{ideal:p.height},frameRate:{ideal:p.frameRate,max:p.frameRate}});
    renderer.reset();notify($('modeSelect').value==='speed'?'Speed mode is on.':'Quality mode is on.');
  }catch{notify('Your camera could not switch modes. The current mode is still running.');}
}
$('modeSelect').addEventListener('change',applyPerformance);
$('resetBtn').addEventListener('click',()=>{
  selectEffect('orbit');
  for(const [id,setting] of [['skeletonToggle','skeleton'],['ringsToggle','rings'],['particlesToggle','particles']]){$(id).checked=true;renderer.settings[setting]=true;}

  const changed=$('modeSelect').value!=='quality';$('modeSelect').value='quality';if(changed)applyPerformance();
  state.mirrored=true;video.style.transform='scaleX(-1)';$('mirrorBtn').setAttribute('aria-pressed','true');renderer.reset();notify('Back to a little everyday magic.');
});
$('mirrorBtn').addEventListener('click',()=>{state.mirrored=!state.mirrored;video.style.transform=state.mirrored?'scaleX(-1)':'none';$('mirrorBtn').setAttribute('aria-pressed',String(state.mirrored));notify(state.mirrored?'Mirrored view is on.':'Mirrored view is off.');});
$('fullscreenBtn').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else notify('Fullscreen is not available in this browser.');}catch{notify('Fullscreen is not available in this browser.');}
});
document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreenBtn').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');$('fullscreenBtn').title=active?'Exit fullscreen':'Enter fullscreen';resize();});
$('captureBtn').addEventListener('click',()=>{
  const output=document.createElement('canvas');output.width=$('overlay').width;output.height=$('overlay').height;const c=output.getContext('2d');
  c.fillStyle='#181d1a';c.fillRect(0,0,output.width,output.height);
  if(state.mode==='live'){
    const scale=Math.min(output.width/video.videoWidth,output.height/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;
    c.save();if(state.mirrored){c.translate(output.width,0);c.scale(-1,1);}c.drawImage(video,(output.width-w)/2,(output.height-h)/2,w,h);c.restore();
  }
  c.drawImage($('overlay'),0,0);output.toBlob(blob=>{if(!blob){notify('Could not save the snapshot. Try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`palma-${Date.now()}.png`;link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('A little magic, saved.');},'image/png');
});

const guide=$('guideDialog');
document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>guide.showModal()));
$('closeGuide').addEventListener('click',()=>guide.close());$('guideDone').addEventListener('click',()=>guide.close());
guide.addEventListener('click',event=>{const r=guide.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)guide.close();});
document.querySelectorAll('[data-gesture]').forEach(button=>button.addEventListener('click',()=>{
  selectEffect(button.dataset.gesture);
  if(state.mode!=='live'&&state.mode!=='loading'){state.demoStarted=performance.now();updateStatus('demo');}
  stage.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'center'});
}));

function loop(time){
  requestAnimationFrame(loop);
  if(document.hidden)return;
  if(state.mode==='live'&&state.detector){
    if(video.currentTime===state.lastVideoTime||video.readyState<2)return;
    state.lastVideoTime=video.currentTime;
    try{
      const result=state.detector.detectForVideo(video,time);
      const hands=(result.landmarks||[]).map((hand,i)=>renderer.smooth(hand,i));
      for(const i of renderer.previous.keys())if(i>=hands.length)renderer.previous.delete(i);
      renderer.render(hands,time,{mirror:state.mirrored,videoSize:{width:video.videoWidth,height:video.videoHeight},reduced:reducedMotion.matches});
      $('handCount').textContent=String(hands.length);$('landmarkCount').textContent=String(hands.reduce((total,hand)=>total+hand.length,0));
      $('trackingState').textContent=hands.length?`${hands.length===1?'One hand':'Two hands'} in the moment`:'Show the camera your hands';
      state.frameCount++;if(time-state.frameStarted>=1000){$('fpsCount').textContent=String(Math.round(state.frameCount*1000/(time-state.frameStarted)));state.frameCount=0;state.frameStarted=time;}
    }catch(error){cameraError(error);}
    return;
  }
  // The idle preview and demo run at 30 fps; they do not initialize the camera or model.
  if(time-state.lastDemoFrame<33)return;
  state.lastDemoFrame=time;
  const idle=state.mode!=='demo';
  renderer.render(renderer.demoHands(time-state.demoStarted,idle,reducedMotion.matches),time,{idle,reduced:reducedMotion.matches});
}
window.addEventListener('pagehide',()=>{state.requestId++;stopStream();state.detector?.close();state.detector=null;state.mode='idle';});
window.addEventListener('pageshow',event=>{if(event.persisted)updateStatus('idle');});
resize();requestAnimationFrame(loop);
// Analytics never gates the camera or controls, including when its CDN is unavailable.
import('https://cdn.jsdelivr.net/npm/@vercel/analytics@2.0.1/dist/index.mjs').then(({inject})=>inject()).catch(()=>{});

import { createOriginalEffects } from './original-effects.js';

// MediaPipe's 21 landmarks and connections are shared by the live and demo renderers.
export const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
];
const TIPS = [4,8,12,16,20];
const PALM = [0,5,9,13,17];
const POSE = [
  [13,139],[-42,103],[-72,68],[-96,35],[-114,6],
  [-36,19],[-48,-39],[-54,-83],[-55,-122],
  [6,5],[5,-63],[3,-111],[1,-151],
  [45,13],[55,-49],[59,-92],[61,-130],
  [76,32],[97,-9],[110,-43],[119,-75]
];
const length = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export function isHeartGesture(hands) {
  if (hands.length < 2) return false;
  const [a,b] = hands;
  return length(a[4],b[4]) < .12 && length(a[8],b[8]) < .12 &&
    length(a[4],a[8]) > .025 && length(b[4],b[8]) > .025 &&
    length(a[4],a[8]) < .30 && length(b[4],b[8]) < .30;
}
export class HandRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = { effect:'orbit', skeleton:true, rings:true, particles:true, intensity:.6 };
    this.original = createOriginalEffects();
    this.previous = this.original.previous;
    this.trails = [];
    this.particles = [];
    this.width = 1;
    this.height = 1;
  }
  resize(width,height) {
    const dpr = Math.min(devicePixelRatio || 1,2);
    this.width = width; this.height = height;
    this.canvas.width = Math.round(width*dpr);
    this.canvas.height = Math.round(height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.reset();
  }
  reset() { this.original.reset(); this.trails=[]; this.particles=[]; }
  clear() { this.ctx.clearRect(0,0,this.width,this.height); }
  smooth(raw,index) { return this.original.smooth(raw,index); }
  demoHands(time, idle=false, reduced=false) {
    const w=this.width,h=this.height;
    const t=reduced ? 0 : time*.001;
    const size=Math.min(h*(idle ? .48 : .70)/290,w*(idle ? .45 : .62)/240);
    const cx=w*.48 + (idle ? 0 : Math.sin(t*.7)*w*.09);
    const cy=h*(idle ? .315 : .48) + (reduced ? 0 : Math.sin(t*.9)*4);
    const angle=Math.sin(t*.5)*.045;
    const hand=POSE.map(([x,y],i)=>{
      const bend=idle ? 0 : Math.sin(t*1.3+i*.12)*4;
      return {x:(cx+(x*Math.cos(angle)-y*Math.sin(angle)+bend)*size)/w,y:(cy+(x*Math.sin(angle)+y*Math.cos(angle))*size)/h,z:0};
    });
    if(this.settings.effect !== 'heart' || idle) return [hand];
    // Illustrative two-hand pose: index tips meet above touching thumb tips.
    const left=hand.map(p=>({x:.5-(p.x-.3)*.62,y:p.y*.65+.14,z:0}));
    const right=left.map(p=>({x:1-p.x,y:p.y,z:0}));
    left[8]={x:.492,y:.34}; right[8]={x:.508,y:.34};
    left[4]={x:.49,y:.53}; right[4]={x:.51,y:.53};
    left[7]={x:.41,y:.29};right[7]={x:.59,y:.29};
    left[3]={x:.39,y:.52};right[3]={x:.61,y:.52};
    return [left,right];
  }
  render(hands,time,{idle=false,mirror=false,videoSize=null,reduced=false}={}) {
    const c=this.ctx,w=this.width,h=this.height;
    if (!idle) {
      const sourceWidth = videoSize?.width || 640;
      const sourceHeight = videoSize?.height || 480;
      // Demo poses are specified in stage coordinates, so convert them into the fitted video area.
      const scale = Math.min(w / sourceWidth, h / sourceHeight);
      const areaW = sourceWidth * scale, areaH = sourceHeight * scale;
      const ox = (w - areaW) / 2, oy = (h - areaH) / 2;
      const demo = !videoSize;
      const sourceHands = demo ? hands.map(hand => hand.map(p => ({
        ...p, x: 1 - (p.x * w - ox) / areaW, y: (p.y * h - oy) / areaH
      }))) : hands;
      const mirrored = demo || mirror;
      const frame = this.original.render(sourceHands, reduced ? 0 : time, {
        width: sourceWidth, height: sourceHeight, mirrored,
        skeleton: this.settings.skeleton, rings: this.settings.rings, particles: this.settings.particles
      });
      this.clear(); c.save();
      if (mirrored) { c.translate(w, 0); c.scale(-1, 1); }
      c.drawImage(frame, ox, oy, areaW, areaH);
      c.restore();
      return;
    }
    this.clear(); c.save();
    let areaW=w,areaH=h,ox=0,oy=0;
    if(videoSize){ const scale=Math.min(w/videoSize.width,h/videoSize.height); areaW=videoSize.width*scale;areaH=videoSize.height*scale;ox=(w-areaW)/2;oy=(h-areaH)/2; }
    const pixels=hands.map(hand=>hand.map(p=>({x:ox+(mirror?1-p.x:p.x)*areaW,y:oy+p.y*areaH,z:p.z})));
    const t=(reduced?0:time)*.001;
    c.lineCap='round'; c.lineJoin='round';
    if(idle && pixels[0]) {
      // A soft, flat silhouette gives the connected landmarks the shape of a hand.
      c.strokeStyle='#bde2c812';c.lineWidth=18;
      for(const [a,b] of HAND_CONNECTIONS){c.beginPath();c.moveTo(pixels[0][a].x,pixels[0][a].y);c.lineTo(pixels[0][b].x,pixels[0][b].y);c.stroke();}
      c.fillStyle='#bde2c809';c.beginPath();PALM.forEach((i,n)=>n?c.lineTo(pixels[0][i].x,pixels[0][i].y):c.moveTo(pixels[0][i].x,pixels[0][i].y));c.closePath();c.fill();
    }
    pixels.forEach((hand,index)=>{
      const palm=PALM.reduce((p,i)=>({x:p.x+hand[i].x/5,y:p.y+hand[i].y/5}),{x:0,y:0});
      if(this.settings.skeleton){
        c.strokeStyle=idle?'#a6c8b29e':'#c9e6d2';c.lineWidth=idle?1:1.5;
        c.beginPath();for(const [a,b] of HAND_CONNECTIONS){c.moveTo(hand[a].x,hand[a].y);c.lineTo(hand[b].x,hand[b].y);}c.stroke();
        hand.forEach((p,i)=>{c.beginPath();c.fillStyle=TIPS.includes(i)?'#e7f6eb':'#a5c9af';c.arc(p.x,p.y,TIPS.includes(i)?2.7:2,0,Math.PI*2);c.fill();});
      }
      if(this.settings.rings && this.settings.effect!=='trails'){
        const radius=Math.max(10,Math.min(w,h)*.038);
        this.ring(palm.x,palm.y,radius,t*.4,'#c4e4cd',idle?.55:1);
        for(const i of TIPS) this.ring(hand[i].x,hand[i].y,idle?6:9,t*.7+i,'#bde2c8',idle?.4:.8);
        if(idle){c.save();c.translate(palm.x,palm.y);c.rotate(-.25);c.strokeStyle='#7d9e874d';c.lineWidth=1;c.beginPath();c.ellipse(0,0,85,26,0,0,Math.PI*2);c.stroke();c.restore();}
      }
      if(!idle && this.settings.particles && !reduced){
        for(const i of TIPS){
          if(this.settings.effect==='trails') this.trails.push({x:hand[i].x,y:hand[i].y,life:1,hand:index,tip:i});
          if(Math.random()<this.settings.intensity*.45) this.particles.push({x:hand[i].x,y:hand[i].y,vx:(Math.random()-.5)*1.2,vy:-Math.random()*.8,life:1});
        }
      }
    });
    if(!this.settings.particles){this.trails=[];this.particles=[];}
    const lifeStep=.025-(this.settings.intensity*.014);
    this.trails=this.trails.filter(p=>{p.life-=lifeStep;return p.life>0;}).slice(-650);
    if(this.settings.particles){
      for(const p of this.trails){c.fillStyle=`rgba(189,226,200,${p.life*.65})`;c.beginPath();c.arc(p.x,p.y,1.2+p.life*2*this.settings.intensity,0,Math.PI*2);c.fill();}
      this.particles=this.particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.018;return p.life>0;}).slice(-200);
      for(const p of this.particles){c.fillStyle=`rgba(208,240,215,${p.life*.75})`;c.beginPath();c.arc(p.x,p.y,1.2,0,Math.PI*2);c.fill();}
    }
    if(this.settings.effect==='heart' && isHeartGesture(hands)){
      const center={x:(pixels[0][4].x+pixels[0][8].x+pixels[1][4].x+pixels[1][8].x)/4,y:(pixels[0][4].y+pixels[0][8].y+pixels[1][4].y+pixels[1][8].y)/4};
      this.heart(center.x,center.y,Math.min(w,h)*(.075+.025*this.settings.intensity),t);
    }
    // Ambient sample particles belong to the effect, never to the app chrome.
    if(idle && this.settings.particles){
      for(let i=0;i<17;i++){
        const x=w*.5+Math.sin(i*11.6)*Math.min(160,w*.3), y=h*.32+Math.cos(i*4.1)*h*.22;
        c.fillStyle=`rgba(189,226,200,${.18+.15*Math.sin(t*.8+i)})`;
        c.beginPath();c.arc(x,y,reduced?1:1+Math.sin(t+i)*.25,0,Math.PI*2);c.fill();
      }
    }
    c.restore();
  }
  ring(x,y,r,angle,color,alpha=1){
    const c=this.ctx;c.save();c.globalAlpha=alpha*(.4+this.settings.intensity*.6);c.translate(x,y);c.rotate(angle);c.strokeStyle=color;c.lineWidth=.85;
    for(let i=0;i<2;i++){c.beginPath();c.arc(0,0,r+i*3,i*Math.PI+.2,i*Math.PI+2.65);c.stroke();}
    c.beginPath();c.arc(0,0,2,0,Math.PI*2);c.fillStyle=color;c.fill();c.restore();
  }
  heart(x,y,size,t){
    const c=this.ctx;c.save();c.translate(x,y);const s=size*(1+Math.sin(t*3)*.035);c.scale(s,s);c.strokeStyle='#edb8be';c.fillStyle='#edb8be12';c.lineWidth=1.7/s;
    c.beginPath();c.moveTo(0,.8);c.bezierCurveTo(-1.5,-.1,-.9,-1.1,0,-.35);c.bezierCurveTo(.9,-1.1,1.5,-.1,0,.8);c.closePath();c.fill();c.stroke();c.restore();
    c.save();c.font='500 16px "IBM Plex Sans", sans-serif';c.textAlign='center';c.fillStyle='#f3dce0';c.fillText('Made for you',x,y+size+30);c.restore();
  }
}

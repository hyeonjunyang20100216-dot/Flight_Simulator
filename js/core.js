/* ============================================================
   core.js — renderer, scene, shared helpers, materials, batching
   Shared by every world module and the simulator.
   ============================================================ */
'use strict';
const T=THREE,$=i=>document.getElementById(i),PI=Math.PI,rnd=Math.random,XA=new T.Vector3(1,0,0),YA=new T.Vector3(0,1,0),ZA=new T.Vector3(0,0,1),NX=new T.Vector3(-1,0,0);
const hyp=(a,b,c=0)=>Math.sqrt(a*a+b*b+c*c);const cl=(x,a,b)=>Math.max(a,Math.min(b,x)),lp=(a,b,t)=>a+(b-a)*t,sm=(a,b,x)=>{x=cl((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const R=new T.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});document.body.prepend(R.domElement);R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
const ANI=Math.min(8,R.capabilities.getMaxAnisotropy());
/* tone curve: identity below .6 (keeps the palette), soft shoulder above so sunlit surfaces never clip to flat white */
T.ShaderChunk.tonemapping_pars_fragment=T.ShaderChunk.tonemapping_pars_fragment.replace('vec3 CustomToneMapping( vec3 color ) { return color; }','vec3 CustomToneMapping(vec3 c){c*=toneMappingExposure;return mix(c,.6+.4*(1.-exp(-(c-.6)/.4)),step(.6,c));}');R.toneMapping=T.CustomToneMapping;
const S=new T.Scene(),cam=new T.PerspectiveCamera(58,1,.5,140000);S.add(cam);S.fog=new T.FogExp2(0xaabbcc,3e-5);
const C1=new T.Color(),C2=new T.Color(),hor=new T.Color(),zen=new T.Color(),sunC=new T.Color(),gndC=new T.Color(),sunD=new T.Vector3(0,1,0);
const V1=new T.Vector3(),V2=new T.Vector3(),V3=new T.Vector3(),V4=new T.Vector3(),V5=new T.Vector3(),Q1=new T.Quaternion(),Q2=new T.Quaternion();
const cv=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);return c},tex=(c,rep)=>{const t=new T.CanvasTexture(c);t.anisotropy=ANI;if(rep)t.wrapS=t.wrapT=T.RepeatWrapping;return t};
const M4=(x,y,z,ry=0,sx=1,sy=1,sz=1)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(YA,ry),new T.Vector3(sx,sy,sz));
/* per-frame hooks the world modules register: TICKS(dt,ns) for animation, LIGHTS(ns,dF,wet) for time-of-day/weather */
const TICKS=[],LIGHTS=[];
const LTIM=[];const LOADMSG=t=>{LTIM.push([t,performance.now()|0]);const e=$('loadmsg');if(e)e.textContent=t};

/* ---------- deterministic randomness: the same seed always builds the same world ---------- */
function RNG(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const hh=(i,j)=>{const s=Math.sin(i*127.1+j*311.7)*43758.5453;return s-Math.floor(s)};
function vn(x,z){const i=Math.floor(x),j=Math.floor(z);let u=x-i,v=z-j;u=u*u*(3-2*u);v=v*v*(3-2*v);return lp(lp(hh(i,j),hh(i+1,j),u),lp(hh(i,j+1),hh(i+1,j+1),u),v)}
function fbm(x,z){let a=1,s=0,n=0;for(let o=0;o<5;o++){s+=a*vn(x,z);n+=a;a*=.5;x*=2.03;z*=2.03}return s/n}
/* fast table-based value noise for world generation */
const NP=new Uint16Array(512),NV=new Float32Array(256);{const r=RNG(90017),p=[...Array(256).keys()];for(let i=255;i>0;i--){const j=r()*(i+1)|0;[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)NP[i]=p[i&255];for(let i=0;i<256;i++)NV[i]=r()}
function vn2(x,z){const xi=Math.floor(x),zi=Math.floor(z);let u=x-xi,v=z-zi;u=u*u*(3-2*u);v=v*v*(3-2*v);const X=xi&255,Z=zi&255,X1=(X+1)&255,Z1=(Z+1)&255,
a=NV[NP[NP[X]+Z]],b=NV[NP[NP[X1]+Z]],c=NV[NP[NP[X]+Z1]],d=NV[NP[NP[X1]+Z1]];return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function fbm2(x,z,o=5){let a=1,s=0,n=0;for(let k=0;k<o;k++){s+=a*vn2(x,z);n+=a;a*=.5;const t=x;x=x*1.6+z*1.2+17.3;z=-t*1.2+z*1.6+9.1}return s/n}
function ridge2(x,z,o=6){let a=1,s=0,n=0,w=1;for(let k=0;k<o;k++){let r=1-Math.abs(vn2(x,z)*2-1);r*=r;s+=a*r*w;n+=a;w=cl(r*1.6,0,1);a*=.5;const t=x;x=x*1.7+z*1.1+31.7;z=-t*1.1+z*1.7+4.3}return s/n}

/* tileable detail noise (r: fine, g: broad, b: grain) shared by terrain + water shaders */
const DTEX=tex(cv(256,256,(x,N)=>{const im=x.createImageData(N,N),hp=(i,j,p)=>hh((i%p+p)%p+p*.31,(j%p+p)%p+p*.17),
vp=(u,v,p)=>{const i=Math.floor(u),j=Math.floor(v);let a=u-i,b=v-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return lp(lp(hp(i,j,p),hp(i+1,j,p),a),lp(hp(i,j+1,p),hp(i+1,j+1,p),a),b)},
fb=(i,j,p,o)=>{let s=0,n=0,a=1;for(let k=0;k<o;k++){s+=a*vp(i*p/N,j*p/N,p);n+=a;a*=.5;p*=2}return s/n};
for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=(j*N+i)*4;im.data[k]=cl((fb(i,j,8,5)-.5)*2.2+.5,0,1)*255;im.data[k+1]=cl((fb(i+40,j+90,4,4)-.5)*2.4+.5,0,1)*255;im.data[k+2]=cl((fb(i,j,32,3)-.5)*2+.5,0,1)*255;im.data[k+3]=255}x.putImageData(im,0,0)}),1);
/* world position varying (works for instanced meshes too) */
const wpos=s=>{s.vertexShader='varying vec3 vW;\n'+s.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\n{vec4 _w=vec4(transformed,1.);\n#ifdef USE_INSTANCING\n_w=instanceMatrix*_w;\n#endif\nvW=(modelMatrix*_w).xyz;}')};
/* depth "pull": draws ground-hugging surfaces (roads, rivers, markings) slightly toward the camera so coarse distant
   terrain LODs never swallow them; the screen position is unchanged */
function pullify(m,a=.25,b=.0025,extra){m.onBeforeCompile=(s,r)=>{if(extra)extra(s,r);s.vertexShader=s.vertexShader.replace('#include <project_vertex>',
`vec4 mvPosition=vec4(transformed,1.);
#ifdef USE_INSTANCING
mvPosition=instanceMatrix*mvPosition;
#endif
mvPosition=modelViewMatrix*mvPosition;{float _d=length(mvPosition.xyz);mvPosition.xyz*=1.-min(_d*.5,min(80.,${a.toFixed(4)}+_d*${b.toFixed(6)}))/max(_d,.01);}
gl_Position=projectionMatrix*mvPosition;`)};const k='pull'+a+'_'+b+'_'+(extra?extra.toString().length:0)+(m.map?'m':'');m.customProgramCacheKey=()=>k;return m}

const mat=(c,r=.5,m=.1)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m}),GL=mat(0x0d1a26,.05,.7);
/* ---------- static batching: everything static is merged into a few draw calls ---------- */
const BOXG=new T.BoxGeometry(1,1,1).toNonIndexed(),PLG=new T.PlaneGeometry(1,1).rotateX(-PI/2).toNonIndexed();
const PRISM=(()=>{const s=new T.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(0,1);s.lineTo(-.5,0);return new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false}).translate(0,0,-.5)})();
function merge(list){let n=0;const L=list.map(([g,m,c,us])=>{g=g.index?g.toNonIndexed():g;n+=g.attributes.position.count;return[g,m,c,us]});
const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3),U=new Float32Array(n*2),v=new T.Vector3(),nm=new T.Matrix3(),col=new T.Color();let o=0;
for(const[g,m,c,us]of L){const p=g.attributes.position,nr=g.attributes.normal,uv=g.attributes.uv,gc=c==null&&g.attributes.color,cnt=p.count,fl=m.determinant()<0;nm.getNormalMatrix(m);col.set(c==null?0xffffff:c);
for(let i=0;i<cnt;i++){const s=fl?i-i%3+2-i%3:i,d=o+i;v.fromBufferAttribute(p,s).applyMatrix4(m);P[d*3]=v.x;P[d*3+1]=v.y;P[d*3+2]=v.z;v.fromBufferAttribute(nr,s).applyMatrix3(nm).normalize();N[d*3]=v.x;N[d*3+1]=v.y;N[d*3+2]=v.z;
if(gc){C[d*3]=gc.getX(s);C[d*3+1]=gc.getY(s);C[d*3+2]=gc.getZ(s)}else{C[d*3]=col.r;C[d*3+1]=col.g;C[d*3+2]=col.b}if(uv){U[d*2]=uv.getX(s)*(us?us[0]:1);U[d*2+1]=uv.getY(s)*(us?us[1]:1)}}o+=cnt}
const r=new T.BufferGeometry();r.setAttribute('position',new T.BufferAttribute(P,3));r.setAttribute('normal',new T.BufferAttribute(N,3));r.setAttribute('color',new T.BufferAttribute(C,3));r.setAttribute('uv',new T.BufferAttribute(U,2));r.computeBoundingSphere();return r}
function fitIS(m){const v=new T.Vector3(),c=new T.Vector3(),mt=new T.Matrix4(),n=m.count;if(!m.geometry.boundingSphere)m.geometry.computeBoundingSphere();const gr=m.geometry.boundingSphere.radius;
for(let i=0;i<n;i++){m.getMatrixAt(i,mt);c.add(v.setFromMatrixPosition(mt))}c.divideScalar(n||1);let r=0;for(let i=0;i<n;i++){m.getMatrixAt(i,mt);r=Math.max(r,v.setFromMatrixPosition(mt).distanceTo(c)+gr*mt.getMaxScaleOnAxis())}m.geometry.boundingSphere=new T.Sphere(c,r)}
function geoAcc(A){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(A.P,3));g.setAttribute('uv',new T.Float32BufferAttribute(A.U,2));if(A.C)g.setAttribute('color',new T.Float32BufferAttribute(A.C,3));g.setIndex(A.I);g.computeVertexNormals();return g}
const WINT=tex(cv(64,64,x=>{x.fillStyle='#fff';x.fillRect(0,0,64,64);x.fillStyle='#24323f';x.fillRect(0,14,64,34);x.fillStyle='#ffffff40';for(let i=0;i<64;i+=8)x.fillRect(i,14,1.5,34);x.fillStyle='#0002';x.fillRect(0,48,64,2)}),1),
WINE=tex(cv(64,64,x=>{const r=RNG(5);x.fillStyle='#000';x.fillRect(0,0,64,64);for(let i=0;i<8;i++){x.fillStyle=r()<.6?'#ffd9a0':'#1a1408';x.fillRect(i*8+1.5,15,6.5,32)}}),1);
const TAXT=tex(cv(256,512,(x,w,h)=>{const r=RNG(6);x.fillStyle='#44454a';x.fillRect(0,0,w,h);for(let k=0;k<9000;k++){const v=r();x.fillStyle=`rgba(${45+v*60|0},${45+v*60|0},${48+v*60|0},.3)`;x.fillRect(r()*w,r()*h,1+r()*1.5,1+r()*1.5)}
for(let k=0;k<8;k++){x.fillStyle=`rgba(0,0,0,${.03+r()*.04})`;x.beginPath();x.ellipse(r()*w,r()*h,10+r()*30,20+r()*60,0,0,7);x.fill()}
x.fillStyle='rgba(0,0,0,.14)';x.fillRect(w/2-30,0,60,h);x.fillStyle='rgba(10,10,10,.12)';for(const c of[w/2-44,w/2+44])x.fillRect(c-6,0,12,h);x.fillStyle='#d9b526';x.fillRect(w/2-3,0,6,h);for(const e of[8,15,w-11,w-18])x.fillRect(e,0,3,h)}),1);
const APT=tex(cv(256,256,(x,w)=>{const r=RNG(7);for(let i=0;i<8;i++)for(let j=0;j<8;j++){const v=112+r()*18|0;x.fillStyle=`rgb(${v},${v},${v-3})`;x.fillRect(i*32,j*32,32,32)}for(let k=0;k<1500;k++){const v=r()*70+80|0;x.fillStyle=`rgba(${v},${v},${v},.2)`;x.fillRect(r()*w,r()*w,1+r()*2,1+r()*2)}
for(let k=0;k<14;k++){x.fillStyle=`rgba(40,35,30,${.05+r()*.1})`;x.beginPath();x.ellipse(r()*w,r()*w,4+r()*16,3+r()*10,r()*3,0,7);x.fill()}x.fillStyle='rgba(50,50,50,.5)';for(let i=0;i<=8;i++){x.fillRect(i*32-.5,0,1,w);x.fillRect(0,i*32-.5,w,1)}}),1);
const vm=o=>new T.MeshStandardMaterial(Object.assign({vertexColors:true,roughness:.82,metalness:.04},o));
/* road surfaces: two-lane road, four-lane dual carriageway, narrow rural lane, rail track (each texture spans the road width, 30 m long) */
const roadTex=(w,h,f)=>tex(cv(w,h,(x,W,H)=>{const r=RNG(w*7+h);f(x,W,H,r)}),1);
const ROADT=roadTex(64,128,(x,w,h,r)=>{x.fillStyle='#3f4044';x.fillRect(0,0,w,h);for(let k=0;k<300;k++){const v=r()*40+50|0;x.fillStyle=`rgba(${v},${v},${v+3},.35)`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*3)}x.fillStyle='#d8d8d0';x.fillRect(3,0,1.5,h);x.fillRect(w-4.5,0,1.5,h);x.fillStyle='#e0c040';x.fillRect(w/2-1,0,2,h*.55)}),
HWYT=roadTex(128,128,(x,w,h,r)=>{x.fillStyle='#3c3d41';x.fillRect(0,0,w,h);for(let k=0;k<600;k++){const v=r()*40+48|0;x.fillStyle=`rgba(${v},${v},${v+3},.35)`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*3)}x.fillStyle='rgba(0,0,0,.18)';for(const c of[28,44,84,100])x.fillRect(c-5,0,10,h);
x.fillStyle='#6b6d63';x.fillRect(w/2-4,0,8,h);x.fillStyle='#b9bbb4';x.fillRect(w/2-4,0,1.5,h);x.fillRect(w/2+2.5,0,1.5,h);x.fillStyle='#e6e6de';x.fillRect(3,0,1.6,h);x.fillRect(w-4.6,0,1.6,h);x.fillRect(36,0,1.4,h*.4);x.fillRect(92,0,1.4,h*.4)}),
RURT=roadTex(32,128,(x,w,h,r)=>{x.fillStyle='#55534d';x.fillRect(0,0,w,h);for(let k=0;k<260;k++){const v=r()*50+60|0;x.fillStyle=`rgba(${v},${v-3},${v-8},.4)`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*3)}x.fillStyle='rgba(120,110,85,.6)';x.fillRect(0,0,3,h);x.fillRect(w-3,0,3,h)}),
RAILT=roadTex(64,128,(x,w,h,r)=>{x.fillStyle='#6d665c';x.fillRect(0,0,w,h);for(let k=0;k<500;k++){const v=r()*60+70|0;x.fillStyle=`rgba(${v},${v-6},${v-12},.5)`;x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2)}x.fillStyle='#4a3a2c';for(let y=0;y<h;y+=6)x.fillRect(10,y,44,3);x.fillStyle='#b8bcc2';x.fillRect(20,0,3,h);x.fillRect(41,0,3,h)});
const ROADM=pullify(new T.MeshStandardMaterial({map:ROADT,roughness:.9}),.3,.0026),HWYM=pullify(new T.MeshStandardMaterial({map:HWYT,roughness:.9}),.3,.0026),RURM=pullify(new T.MeshStandardMaterial({map:RURT,roughness:.95}),.3,.0026),RAILM=pullify(new T.MeshStandardMaterial({map:RAILT,roughness:.85}),.3,.0026);
const BM={m:vm(),s:vm({roughness:.38,metalness:.6}),g:vm({roughness:.05,metalness:.9,emissive:0xffd9a0,emissiveIntensity:0}),w:vm({map:WINT,emissiveMap:WINE,emissive:0xffcf8a,emissiveIntensity:0,roughness:.45,metalness:.2}),
r:vm({side:T.DoubleSide,roughness:.42,metalness:.45}),o:null,d:pullify(vm({roughness:.9}),.04,.0004),t:pullify(vm({map:TAXT,roughness:.9}),.03,.0003),a:pullify(vm({map:APT,roughness:.86}),.02,.0002)};
BM.o=pullify(vm({map:ROADT,roughness:.9}),.05,.0005);
class SB{constructor(){this.L={}}add(g,m,c,k='m',us){(this.L[k]||(this.L[k]=[])).push([g,m,c,us]);return this}
box(w,h,d,x,y,z,c,k='m',ry=0){return this.add(BOXG,M4(x,y+h/2,z,ry,w,h,d),c,k,'wcp'.includes(k)?[Math.max(w,d)/6,h/3.2]:null)}
strip(x0,z0,x1,z1,w,y,c,k='d',u=40){const dx=x1-x0,dz=z1-z0,l=hyp(dx,dz);return this.add(PLG,M4((x0+x1)/2,y,(z0+z1)/2,Math.atan2(dx,dz),w,1,l),c,k,k==='a'?[w/u,l/u]:[1,l/u])}
fan(x,y,z,r,a0,a1,c,k='d'){const g=new T.CircleGeometry(r,10,a0,a1-a0).rotateX(-PI/2);return this.add(g,M4(x,y,z),c,k)}
flush(par,shadow=true){for(const k in this.L){const m=new T.Mesh(merge(this.L[k]),BM[k]);m.castShadow=shadow&&!'dtao'.includes(k);m.receiveShadow=true;par.add(m)}this.L={}}}
const VEHG=merge([[BOXG,M4(0,.95,.5,0,2.4,1.5,3.4)],[BOXG,M4(0,1,-1.6,0,2.4,1.4,1.7)],[BOXG,M4(0,1.95,-1.6,0,2.3,.55,1.6),0x2a3038]]),CARG=merge([[BOXG,M4(0,.55,0,0,1.8,.7,4.3)],[BOXG,M4(0,1.1,.2,0,1.6,.5,2.2),0x30363e]]),
TRUCKG=merge([[BOXG,M4(0,1.6,1.8,0,2.5,2.9,9)],[BOXG,M4(0,1.3,-4.1,0,2.4,2.3,2.4),0xffffff],[BOXG,M4(0,1.8,-4.9,0,2.3,.7,.3),0x232a32]]);
/* light sprites */
const WT=[1,.95,.85],GR=[.2,1,.3],GR2=[.25,.9,.45],RD=[1,.2,.15],BLU=[.2,.4,1],WM=[1,.75,.45];
const LMAP=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'#fff');r.addColorStop(.3,'#fffa');r.addColorStop(1,'#0000');x.fillStyle=r;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();
const LM=new T.PointsMaterial({size:14,map:LMAP,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
const PM_=(sz=16)=>new T.PointsMaterial({size:sz,map:LMAP,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}),ptsGeo=(p,c)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));return g};
/* single-colour light layer whose brightness follows the night factor */
function nightLights(pos,color,size,dayOp=0,scale=1){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));const m=new T.PointsMaterial({size,map:LMAP,color,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
const o=new T.Points(g,m);o.frustumCulled=pos.length>3?true:false;S.add(o);LIGHTS.push(ns=>{m.opacity=(dayOp+(1-dayOp)*ns)*scale;o.visible=m.opacity>.01});return o}
const POOLT=tex(cv(64,64,x=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.5,'#8888');g.addColorStop(1,'#0000');x.fillStyle=g;x.fillRect(0,0,64,64)})),
POOLM=pullify(new T.MeshBasicMaterial({map:POOLT,color:0xffc890,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}),.1,.0006);
LIGHTS.push(ns=>{POOLM.opacity=ns*.55;LM.opacity=.16+.84*ns;LM.size=lp(9,15,ns)});
/* arched roof / bridge arch helper: open cylinder segment spanning width w with a given rise */
function archGeo(len,w,rise,seg=24){const r=(w*w/4+rise*rise)/(2*rise),ha=Math.asin(w/2/r);return new T.CylinderGeometry(r,r,len,seg,1,true,-ha,2*ha).rotateX(-PI/2).translate(0,-r*Math.cos(ha),0)}
/* Catmull-Rom densify a waypoint list [[x,z],...] to points every `step` metres */
function densify(pts,step=25,closed=false){const v=pts.map(p=>new T.Vector3(p[0],0,p[1]));const c=new T.CatmullRomCurve3(v,closed,'centripetal');const L=c.getLength(),n=Math.max(2,Math.ceil(L/step));const out=[];for(let i=0;i<=n;i++){const p=c.getPoint(i/n);out.push(p.x,p.z)}return out}
/* distance from point to segment, returns [dist, t] */
function segD(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz||1;let t=((px-ax)*dx+(pz-az)*dz)/l;t=cl(t,0,1);const x=ax+dx*t-px,z=az+dz*t-pz;return[Math.sqrt(x*x+z*z),t]}
/* airport frame: local runway coordinates (runway along local z, landing towards -z) <-> world */
function apFrame(c){const ry=-c.hdg*PI/180,cs=Math.cos(ry),sn=Math.sin(ry);return{ry,cs,sn,toL:(x,z)=>{const dx=x-c.x,dz=z-c.z;return[dx*cs-dz*sn,dx*sn+dz*cs]},toW:(lx,lz)=>[c.x+lx*cs+lz*sn,c.z-lx*sn+lz*cs]}}
/* building collision: spatial hash of circles [x,z,r,top] (buildings, towers, turbines, cranes) */
const BHASH=new Map(),BHC=250,bhk=(i,j)=>i*100003+j;
function addBld(x,z,r,top){const i0=Math.floor((x-r)/BHC),i1=Math.floor((x+r)/BHC),j0=Math.floor((z-r)/BHC),j1=Math.floor((z+r)/BHC);for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=bhk(i,j);let l=BHASH.get(k);if(!l)BHASH.set(k,l=[]);l.push(x,z,r,top)}}
function bldHit(x,z,y){const l=BHASH.get(bhk(Math.floor(x/BHC),Math.floor(z/BHC)));if(!l)return 0;for(let q=0;q<l.length;q+=4){const dx=x-l[q],dz=z-l[q+1],r=l[q+2];if(dx*dx+dz*dz<r*r&&y<l[q+3]+1.5)return 1}return 0}
/* tiled static batching: one merged mesh set per world tile, so tiles are frustum culled and can be hidden by distance */
const DCULL=[];let dcT=9;
class TSB{constructor(sz=10000,maxD=1e9){this.sz=sz;this.maxD=maxD;this.T=new Map()}
at(x,z){const i=Math.floor(x/this.sz),j=Math.floor(z/this.sz),k=i*4096+j;let t=this.T.get(k);if(!t)this.T.set(k,t={b:new SB(),i,j});return t.b}
flush(par=S,shadow=true){for(const t of this.T.values()){const g=new T.Group();t.b.flush(g,shadow);par.add(g);if(this.maxD<1e8)DCULL.push({g,x:(t.i+.5)*this.sz,z:(t.j+.5)*this.sz,r:this.maxD+this.sz*.71})}this.T.clear()}}
TICKS.push(dt=>{if((dcT+=dt)<.25)return;dcT=0;const p=cam.position;for(const c of DCULL)c.g.visible=hyp(p.x-c.x,p.z-c.z,Math.max(0,p.y-300)*.6)<c.r});
/* box with arbitrary yaw + pitch (for diagonals, cables, tilted panels) */
const MR=(x,y,z,ry,rx,sx,sy,sz,rz=0)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz,'YXZ')),new T.Vector3(sx,sy,sz));
/* segment between two 3D points as a box of cross-section w×h */
function beam(B,ax,ay,az,bx,by,bz,w,h,c,k='m'){const dx=bx-ax,dy=by-ay,dz=bz-az,l=hyp(dx,dy,dz)||.01;B.add(BOXG,MR((ax+bx)/2,(ay+by)/2,(az+bz)/2,Math.atan2(dx,dz),-Math.asin(cl(dy/l,-1,1)),w,h,l),c,k)}

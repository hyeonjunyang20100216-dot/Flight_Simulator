/* ============================================================
   cities.js — the Hanbit metropolis (CBD, high-rise apartment districts,
   mid-rise mixed blocks, suburbs), the secondary cities and the villages.
   Buildings use procedural window materials: windows are computed from the
   world position, so the same shader works on merged and instanced meshes,
   and lit windows are chosen per window at night.
   Exposes BLDS (footprints for the map) and fills the bldHit() collision hash.
   ============================================================ */
LOADMSG('Raising the cities…');
const NU={value:0};LIGHTS.push(ns=>{NU.value=ns});
/* window layouts: bay width, floor height, window rectangle inside a bay, glass colour, lit share, light colour */
const WCFG={c:{bay:1.7,fl:3.9,x:[.05,.95],y:[.1,.93],g:'.12,.19,.26',lt:.74,em:'.85,.9,1.',rf:.14,mt:.65},
p:{bay:3.3,fl:2.9,x:[.14,.86],y:[.3,.84],g:'.11,.14,.18',lt:.45,em:'1.,.8,.52',rf:.3,mt:.2},
x:{bay:2.7,fl:3.5,x:[.17,.83],y:[.3,.84],g:'.1,.13,.17',lt:.55,em:'1.,.84,.6',rf:.3,mt:.2},
h:{bay:3.6,fl:3.1,x:[.3,.7],y:[.35,.76],g:'.1,.12,.15',lt:.62,em:'1.,.76,.48',rf:.35,mt:.1}};
const f4=v=>v.toFixed(4);
function bldMat(k){const c=WCFG[k],m=new T.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.05});
m.onBeforeCompile=s=>{wpos(s);s.uniforms.night=NU;s.vertexShader='varying vec3 vWN;\n'+s.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\n#ifdef USE_INSTANCING\nvWN=mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal;\n#else\nvWN=mat3(modelMatrix)*objectNormal;\n#endif');
s.fragmentShader='uniform float night;varying vec3 vW,vWN;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float wM=0.,wL=0.;{vec3 wn=normalize(vWN);float wall=1.-step(.55,abs(wn.y)),hx=abs(wn.x)>abs(wn.z)?vW.z:vW.x;vec2 ce=vec2(hx/${f4(c.bay)},vW.y/${f4(c.fl)}),f=fract(ce),id=floor(ce),fw=fwidth(ce)+1e-4;
float m=smoothstep(${f4(c.x[0])}-fw.x,${f4(c.x[0])}+fw.x,f.x)*(1.-smoothstep(${f4(c.x[1])}-fw.x,${f4(c.x[1])}+fw.x,f.x))*smoothstep(${f4(c.y[0])}-fw.y,${f4(c.y[0])}+fw.y,f.y)*(1.-smoothstep(${f4(c.y[1])}-fw.y,${f4(c.y[1])}+fw.y,f.y));
float aa=clamp(2.2-max(fw.x,fw.y)*2.4,0.,1.);m=mix(${f4((c.x[1]-c.x[0])*(c.y[1]-c.y[0]))},m,aa)*wall;
float h=fract(sin(dot(id+floor(vW.xz/41.)*3.7+wn.xz*7.3,vec2(12.9898,78.233)))*43758.5453);wL=mix(${f4(.55*(1-c.lt)*.35)},step(${f4(c.lt)},h)*(.45+.9*fract(h*17.3)),aa);wM=m;
diffuseColor.rgb=mix(diffuseColor.rgb*(.93+.14*fract(h*3.1)),vec3(${c.g})*(.75+.5*fract(h*5.7)),m*.94);diffuseColor.rgb*=mix(1.,.6,1.-wall);}`)
.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,${f4(c.rf)},wM);`)
.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,${f4(c.mt)},wM);`)
.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(${c.em})*wL*wM*night*1.3;`)};m.customProgramCacheKey=()=>'bld'+k;return m}
for(const k of'cpxh')BM[k]=bldMat(k);
LIGHTS.push(ns=>{BM.w.emissiveIntensity=ns*1.1;BM.g.emissiveIntensity=ns*.22});
const ROOFM=vm({roughness:.75}),UBOX=merge([[BOXG,M4(0,.5,0)]]),UROOF=merge([[PRISM,M4(0,0,0)]]);
/* ---------- placement buffers: instanced boxes per tile, split into "small" (near) and "tall" (far-visible) ---------- */
const BLDS=[],IT={};
function inst(k,x,y,z,w,h,d,ry,col,tall){const sz=tall?4000:2000,key=(tall?'T':'s')+Math.floor(x/sz)+'_'+Math.floor(z/sz);let t=IT[key];if(!t)t=IT[key]={tall,x:(Math.floor(x/sz)+.5)*sz,z:(Math.floor(z/sz)+.5)*sz,sz,L:{}};(t.L[k]||(t.L[k]=[])).push(x,y,z,w,h,d,ry,col)}
const CTS=new TSB(4000,45000),CSS=new TSB(2000,9000);
function flushInst(){const q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(),m=new T.Matrix4(),c=new T.Color();
for(const key in IT){const t=IT[key],g=new T.Group();for(const k in t.L){const L=t.L[k],n=L.length/8,im=new T.InstancedMesh(k==='roof'?UROOF:UBOX,k==='roof'?ROOFM:BM[k],n);
for(let i=0;i<n;i++){const o=i*8;p.set(L[o],L[o+1],L[o+2]);q.setFromAxisAngle(YA,L[o+6]);s.set(L[o+3],L[o+4],L[o+5]);im.setMatrixAt(i,m.compose(p,q,s));im.setColorAt(i,c.setHex(L[o+7]))}
im.castShadow=im.receiveShadow=true;fitIS(im);g.add(im)}S.add(g);DCULL.push({g,x:t.x,z:t.z,r:(t.tall?45000:9000)+t.sz*.71})}}
/* footprint helpers */
const gMin=(x,z,r)=>Math.min(HM(x,z),HM(x+r,z+r),HM(x-r,z+r),HM(x+r,z-r),HM(x-r,z-r)),gMax=(x,z,r)=>Math.max(HM(x,z),HM(x+r,z+r),HM(x-r,z+r),HM(x+r,z-r),HM(x-r,z-r));
const dry=(x,z,r)=>{for(const[a,b]of[[0,0],[r,r],[-r,r],[r,-r],[-r,-r]]){const w=waterAt(x+a,z+b);if(w>-1e3&&w>HM(x+a,z+b)-.5)return false}return riverHit(x,z)[0]>r+8};
/* landmark sites are kept free of ordinary buildings and streets */
const LMK=WLD.landmarks,RESV=[[LMK.stadium.x,LMK.stadium.z,290],[LMK.amusement.x,LMK.amusement.z,440],[LMK.station.x,LMK.station.z,260],[LMK.tower.x,LMK.tower.z,150],[LMK.powerPlant.x,LMK.powerPlant.z,760],[LMK.convention.x,LMK.convention.z,240],[LMK.dam.x,LMK.dam.z,700],...LMK.industry.map(i=>[i.x,i.z,i.r])],QA=LMK.port.quay[0],QB=LMK.port.quay[1];
const resv=(x,z,r=0)=>{for(const q of RESV)if(hyp(x-q[0],z-q[1])<q[2]+r)return true;return segD(x,z,QA[0],QA[1],QB[0],QB[1])[0]<430+r};
function canBuild(x,z,r,urban,free){if(!free&&resv(x,z,r))return false;const k=gIdx(x,z);if(k<0||TBLK[k]===2||TAIR[k]>30)return false;if(!dry(x,z,r))return false;if(gMax(x,z,r)-gMin(x,z,r)>Math.max(6,r*.45))return false;return!nearRoute(x,z,r*.75+3,urban)}
/* a building: box (instanced) + map footprint + collision */
function bld(k,x,z,w,d,h,ry,col,o={}){const r=Math.max(w,d)*.5,g=(o.g!=null?o.g:gMin(x,z,r*.7))-1.2,top=gMax(x,z,r*.7)+h,tall=top-g>32;inst(k,x,g,z,w,top-g,d,ry,col,tall);BLDS.push(x,z,w,d,ry);addBld(x,z,r*.92,top);return top}
/* merged special shapes (setbacks, cylinders, twisted towers, spires) */
const CB=(x,z,tall)=>(tall?CTS:CSS).at(x,z);
function cylTower(x,z,r,h,col,cap){const g=gMin(x,z,r)-1,B=CB(x,z,1);B.add(new T.CylinderGeometry(r,r,h,24,1,true),M4(x,g+h/2,z),col,'c');B.add(new T.CircleGeometry(r,24).rotateX(-PI/2),M4(x,g+h,z),0x55595e,'m');
if(cap)B.add(new T.CylinderGeometry(r*.55,r*.9,cap,24),M4(x,g+h+cap/2,z),0xd8dde2,'s');BLDS.push(x,z,r*2,r*2,0);addBld(x,z,r,g+h+(cap||0));return g+h}
function setback(x,z,w,d,h,ry,col,k='c'){const g=gMin(x,z,Math.max(w,d)*.5)-1,B=CB(x,z,1),t=[.55,.28,.17];let y=g,sw=w,sd=d;t.forEach((f,i)=>{const hh=h*f;B.add(BOXG,M4(x,y+hh/2,z,ry,sw,hh,sd),col,k);y+=hh;sw*=.78;sd*=.78});BLDS.push(x,z,w,d,ry);addBld(x,z,Math.max(w,d)*.5,y);return y}
function twist(x,z,w,h,col){const g=gMin(x,z,w*.6)-1,B=CB(x,z,1),n=14,dh=h/n;for(let i=0;i<n;i++)B.add(BOXG,M4(x,g+dh*(i+.5),z,i*.07,w*(1-i*.012),dh+.05,w*(1-i*.012)),col,'c');BLDS.push(x,z,w,w,0);addBld(x,z,w*.6,g+h);return g+h}
function spire(x,z,y,h,r=1.2){CB(x,z,1).add(new T.ConeGeometry(r,h,8),M4(x,y+h/2,z),0xd9dde2,'s');addBld(x,z,r+1,y+h)}
/* ---------- parks: forest density + green ground under the block ---------- */
function park(x,z,r){gridRect(x-r,z-r,x+r,z+r,(k,px,pz)=>{const d=hyp(px-x,pz-z);if(d>r)return;TFOR[k]=Math.max(TFOR[k],170);TURB[k]=Math.min(TURB[k],40);TCOL[k*3]=lp(TCOL[k*3],60,.7);TCOL[k*3+1]=lp(TCOL[k*3+1],104,.7);TCOL[k*3+2]=lp(TCOL[k*3+2],48,.7)})}
const PARKS=[],SCHOOLS=[];
/* ---------- street grid: avenues (bridged across rivers) and streets, through the shared route pipeline ---------- */
const CITYP=[];
function streets(C,P){const cs=Math.cos(C.rot),sn=Math.sin(C.rot),W=(u,v)=>[C.x+u*cs-v*sn,C.z+u*sn+v*cs],R=C.r*1.12,bs=P.block;
for(const ax of[0,1])for(let k=Math.ceil(-R/bs);k*bs<=R;k++){const av=k%P.av===0,ty=av?'av':'st';let run=[],wf=[],wet=0;const flush=()=>{let i0=wf.indexOf(0),i1=wf.lastIndexOf(0);run=i0<0?[]:run.slice(i0*2,i1*2+2);if(run.length>=(av?14:7)){const p=route({name:av?'Avenue':'Street',type:ty,xz:run,junctionFree:1});CITYP.push(p);if(av||k%2===0)ROADNET.push(p)}run=[];wf=[];wet=0};
const lim=Math.sqrt(Math.max(0,R*R-(k*bs)**2));for(let t=-lim;t<=lim;t+=20){const[x,z]=ax?W(t,k*bs):W(k*bs,t),q=gIdx(x,z);if(q<0){flush();continue}
const inC=TURB[q]>(av?45:60)&&TBLK[q]!==2&&TAIR[q]<20&&!resv(x,z),w=!dry(x,z,4);if(!inC||(!av&&w)||nearRoute(x,z,5)&&!av){flush();continue}if(w){wet+=20;if(wet>900){flush();continue}}else wet=0;run.push(x,z);wf.push(w?1:0)}flush()}}
/* ---------- districts ---------- */
const TOWC=[0x9aa4ad,0x6d7780,0xb7bcc1,0x50606e,0x8f9482,0x7d8a99,0xa69a88],APC=[0xeeeae0,0xe6dfcf,0xf3f1ea,0xd9d4c5,0xe9e2d6,0xdce4e6,0xefe3d3],MXC=[0xc9c1b1,0xb3a998,0xd7d0c2,0x9f988c,0xc8b8a0,0xb9b5ad,0xa58f7a,0xd3c7b3],HSC=[0xf0ebe0,0xe5d9c3,0xd9cfbd,0xc9b9a2,0xf2f0ea,0xd0c4b0],RFC=[0x8a3b2c,0x5b5f66,0x3f5a78,0x6a4a3a,0x4e6b4a,0x9a5a3a,0x444a52];
const pick=(r,a)=>a[r()*a.length|0];
function district(C,P,R_){const cs=Math.cos(C.rot),sn=Math.sin(C.rot),W=(u,v)=>[C.x+u*cs-v*sn,C.z+u*sn+v*cs],ry=-C.rot,bs=P.block,R=C.r*1.1;
for(let i=Math.floor(-R/bs);i*bs<R;i++)for(let j=Math.floor(-R/bs);j*bs<R;j++){const uc=(i+.5)*bs,vc=(j+.5)*bs,[x,z]=W(uc,vc),q=gIdx(x,z);if(q<0||TURB[q]<55)continue;
const dn=hyp(uc,vc)/C.r*(1+(fbm2(x/2500+C.x,z/2500,2)-.5)*.35),avU=i%P.av===0||(i+1)%P.av===0,avV=j%P.av===0||(j+1)%P.av===0,mg=6.5,lw=bs-2*mg-(avU?5:0),ld=bs-2*mg-(avV?5:0),L=(a,b)=>W(uc+a,vc+b),rr=R_();
if(!canBuild(x,z,8,1)&&rr<.8)continue;
if(rr<P.park*(dn<.2?.4:1)){park(x,z,bs*.55);PARKS.push(x,z);continue}
if(dn<P.cbd){/* CBD: glass towers, setbacks, cylinders, twisted towers, podiums */const hb=(90+300*Math.pow(1-dn/P.cbd,1.4))*P.tower;
if(R_()<.4){const w=30+R_()*20,h=hb*(.6+R_()*.6),s=R_(),col=pick(R_,TOWC);if(!canBuild(x,z,w*.6,1))continue;bld('x',x,z,lw*.92,ld*.92,12+R_()*8,ry,pick(R_,MXC));
const top=s<.35?bld('c',x,z,w,w*(.7+R_()*.5),h,ry,col):s<.55?setback(x,z,w*1.1,w,h,ry,col):s<.7?cylTower(x,z,w*.55,h,col,R_()<.5?6+R_()*10:0):s<.82?twist(x,z,w*.9,h,col):bld('c',x,z,w,w,h,ry,col);if(R_()<.3)spire(x,z,top,15+R_()*40)}
else for(const[a,b]of[[-.25,-.25],[.25,.25],[-.25,.25],[.25,-.25]]){if(R_()<.3)continue;const[bx,bz]=L(a*lw,b*ld),w=18+R_()*14,h=hb*(.25+R_()*.55);if(!canBuild(bx,bz,w*.6,1))continue;bld(R_()<.7?'c':'x',bx,bz,w,w*(.7+R_()*.4),h,ry,R_()<.7?pick(R_,TOWC):pick(R_,MXC))}}
else if(dn<P.res){/* high-rise apartment complexes, schools, shopping */const s=R_();
if(s<.62){const rows=Math.max(1,Math.floor(ld/40)),hh=(40+R_()*55)*P.tower+12,col=pick(R_,APC);for(let r=0;r<rows;r++){const b=-ld/2+ld*(r+.5)/rows,two=lw>90&&R_()<.6;for(const a of two?[-.25,.25]:[0]){const[bx,bz]=L(a*lw,b),w=two?lw*.42:lw*.78;if(canBuild(bx,bz,w*.4,1))bld('p',bx,bz,w,14,hh*(.85+R_()*.3),ry,col)}}}
else if(s<.7){/* school: L-shaped classroom block + running track */const[bx,bz]=L(-lw*.3,0);if(canBuild(bx,bz,20,1)){bld('x',bx,bz,16,ld*.8,14,ry,0xd8cfc0);const[cx,cz]=L(lw*.15,0),g=HM(cx,cz),B=CB(cx,cz,0);B.add(new T.RingGeometry(26,34,28).rotateX(-PI/2),new T.Matrix4().compose(new T.Vector3(cx,g+.15,cz),new T.Quaternion().setFromAxisAngle(YA,ry),new T.Vector3(1,1,1.6)),0x9a4a38,'d');B.add(new T.CircleGeometry(26,28).rotateX(-PI/2),new T.Matrix4().compose(new T.Vector3(cx,g+.14,cz),new T.Quaternion().setFromAxisAngle(YA,ry),new T.Vector3(1,1,1.6)),0x4f7a3a,'d');SCHOOLS.push(cx,cz)}}
else if(s<.8){const[bx,bz]=L(0,0);if(canBuild(bx,bz,40,1))bld('x',bx,bz,lw*.85,ld*.7,18+R_()*14,ry,pick(R_,MXC))}
else for(const[a,b]of[[-.25,-.25],[.25,.25],[-.25,.25],[.25,-.25]]){const[bx,bz]=L(a*lw,b*ld),w=20+R_()*18;if(canBuild(bx,bz,w*.55,1))bld(R_()<.3?'c':'x',bx,bz,w,w*(.6+R_()*.5),18+R_()*40,ry,pick(R_,MXC))}}
else if(dn<P.mid){/* mid-rise mixed blocks: perimeter buildings, taller on avenues */const n=3+(R_()*4|0);for(let m=0;m<n;m++){const a=(R_()-.5)*.7,b=(R_()-.5)*.7,[bx,bz]=L(a*lw,b*ld),w=14+R_()*22,on=avU||avV,h=(on?14+R_()*30:7+R_()*16)*P.mh;if(canBuild(bx,bz,w*.55,1))bld('x',bx,bz,w,w*(.6+R_()*.6),h,ry,pick(R_,MXC))}}
else{/* suburbs: houses on lots with pitched roofs, a few small villas */for(let a=-lw/2+12;a<lw/2-8;a+=26)for(let b=-ld/2+12;b<ld/2-8;b+=27){if(R_()<.12)continue;const[bx,bz]=L(a+(R_()-.5)*4,b+(R_()-.5)*4),w=8+R_()*4,d=7+R_()*4;if(!canBuild(bx,bz,7,1))continue;
if(R_()<.1){bld('x',bx,bz,w*1.6,d*1.5,10+R_()*4,ry,pick(R_,MXC));continue}house(bx,bz,w,d,ry+(R_()<.5?0:PI/2),R_,P.steep)}}}}
function house(x,z,w,d,ry,R_,steep=0){const top=bld('h',x,z,w,d,(R_()<.6?5.8:3.2),ry,pick(R_,HSC)),rh=w*(.28+steep*.3)+R_()*1.2;inst('roof',x,top-.05,z,w+.8,rh,d+.8,ry,pick(R_,RFC),false)}
/* ---------- landmark skyline of the Hanbit CBD ---------- */
function skyline(C){const ry=-C.rot,cs=Math.cos(C.rot),sn=Math.sin(C.rot),W=(u,v)=>[C.x+u*cs-v*sn,C.z+u*sn+v*cs];
/* Hanbit Sky Tower: tapered square tower with a glass crown and a spire */{const[x,z]=W(195,-65),g=gMin(x,z,40)-1,B=CB(x,z,1);let y=g;for(let i=0;i<8;i++){const w=62-i*5.2,h=52;B.add(BOXG,M4(x,y+h/2,z,ry+i*.02,w,h+.1,w),0x8fa0b0,'c');y+=h}
B.add(new T.CylinderGeometry(9,20,30,4),M4(x,y+15,z,ry+PI/4),0xc8d6e2,'c');y+=30;spire(x,z,y,64,2.2);addBld(x,z,32,y+64);BLDS.push(x,z,62,62,ry);LANDTOP.push([x,y+64,z])}
{const[x,z]=W(-260,190);const t=cylTower(x,z,24,315,0x7d8a99,18);spire(x,z,t+18,38);LANDTOP.push([x,t+56,z])}
{const[x,z]=W(330,330);const t=twist(x,z,40,290,0x9aa4ad);LANDTOP.push([x,t,z])}
{const[x,z]=W(-140,-300);const t=setback(x,z,56,44,260,ry,0x6d7780);spire(x,z,t,24);LANDTOP.push([x,t+24,z])}}
const LANDTOP=[];
const CPAR={metro:{block:130,av:4,cbd:.16,res:.45,mid:.78,tower:1,mh:1,park:.06,steep:0},port:{block:125,av:4,cbd:.13,res:.36,mid:.72,tower:.55,mh:.9,park:.05,steep:0},
valley:{block:115,av:3,cbd:0,res:0,mid:.42,tower:0,mh:.55,park:.04,steep:1},farm:{block:120,av:3,cbd:0,res:.12,mid:.48,tower:.4,mh:.6,park:.04,steep:.3},town:{block:110,av:3,cbd:0,res:0,mid:.45,tower:0,mh:.6,park:.04,steep:.5}};
WLD.cities.forEach((C,ci)=>{LOADMSG('Raising the cities… '+C.label);const P=CPAR[C.type];streets(C,P)});
gradeBeds(CITYP);surfaces(CITYP);flushRoads();
WLD.cities.forEach((C,ci)=>{const P=CPAR[C.type],R_=RNG(WLD.seed+300+ci);if(C.type==='metro')skyline(C);district(C,P,R_)});
/* ---------- villages: clustered houses along the lane, a church or hall, farm sheds ---------- */
LOADMSG('Building villages…');
WLD.villages.forEach((v,vi)=>{const R_=RNG(WLD.seed+900+vi),R=180+v.n*5,rot=R_()*PI;let placed=0;for(let t=0;t<v.n*4&&placed<v.n;t++){const a=R_()*2*PI,d=Math.sqrt(R_())*R,x=v.x+Math.cos(a)*d,z=v.z+Math.sin(a)*d;if(!canBuild(x,z,7,0))continue;house(x,z,8+R_()*4,7+R_()*3,rot+(R_()<.5?0:PI/2)+(R_()-.5)*.3,R_,.6);placed++}
for(let t=0;t<6;t++){const a=R_()*2*PI,d=R+60+R_()*200,x=v.x+Math.cos(a)*d,z=v.z+Math.sin(a)*d;if(!canBuild(x,z,14,0))continue;const top=bld('h',x,z,24,12,6,rot,0xb9b2a4);inst('roof',x,top-.05,z,25,4,13,rot,R_()<.5?0x6b7a8a:0x8a3b2c,false)}
if(v.n>=40&&canBuild(v.x+30,v.z,10,0)){const top=bld('h',v.x+30,v.z,10,22,8,rot,0xf2f0ea);inst('roof',v.x+30,top-.05,v.z,11,5,23,rot,0x5b5f66,false);bld('h',v.x+30,v.z-14,4,4,20,rot,0xf2f0ea)}});
CTS.flush(S);CSS.flush(S);flushInst();

/* ============================================================
   nature.js — forests (streamed tree chunks with two levels of detail),
   farmsteads and greenhouses, the Deulpan solar farm, the West Ridge wind farm.
   Trees are generated per 500 m chunk from the forest-density grid with a
   seeded hash (the same trees every time) and pooled into a few instanced meshes.
   ============================================================ */
LOADMSG('Planting forests…');
const TRM=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0});
const TG={/* near: trunk + layered crown */con:merge([[new T.CylinderGeometry(.03,.045,.25,5,1,true),M4(0,.125,0),0x3a2a1e],[new T.ConeGeometry(.3,.5,7,1,true),M4(0,.42,0),0x16301a],[new T.ConeGeometry(.24,.42,7,1,true),M4(0,.64,0),0x1a3820],[new T.ConeGeometry(.16,.3,7,1,true),M4(0,.85,0),0x204024]]),
dec:merge([[new T.CylinderGeometry(.035,.05,.4,5,1,true),M4(0,.2,0),0x3d2c1f],[new T.IcosahedronGeometry(.36,0),M4(0,.62,0,0,1,.82,1),0x22421c],[new T.IcosahedronGeometry(.25,0),M4(.12,.8,.06,.7,1,.85,1),0x2a4f20]]),
/* far: single low-poly shapes */conF:merge([[new T.ConeGeometry(.3,1,5,1,true),M4(0,.5,0),0x17301a]]),decF:merge([[new T.OctahedronGeometry(.38,0),M4(0,.6,0,0,1,.85,1),0x22421c]])};
const TCAP={con:20000,dec:20000,conF:50000,decF:50000},TIM={};
for(const k in TCAP){const m=new T.InstancedMesh(TG[k],TRM,TCAP[k]);m.count=0;m.frustumCulled=false;m.castShadow=!k.endsWith('F');m.receiveShadow=true;m.instanceMatrix.setUsage(T.DynamicDrawUsage);
m.instanceColor=new T.InstancedBufferAttribute(new Float32Array(TCAP[k]*3),3);S.add(m);TIM[k]=m}
const TCH_=500,TCACHE=new Map();let TQ=1,tLast=null,tT=9;
/* trees of one chunk: [x,y,z,scale,rot,type(0 con/1 dec),tint,far] */
function treeChunk(ci,cj){const key=ci*65536+cj;let c=TCACHE.get(key);if(c)return c;const R_=RNG((ci*73856093^cj*19349663)+WLD.seed),out=[],sp=21,x0=ci*TCH_,z0=cj*TCH_;
for(let a=0;a<TCH_/sp;a++)for(let b=0;b<TCH_/sp;b++){const x=x0+(a+R_())*sp,z=z0+(b+R_())*sp,r=R_(),r2=R_(),k=gIdx(x,z);if(k<0)continue;const f=gridS(TFOR,x,z)/255;if(r>f*.92*TQ)continue;
if(TBLK[k]===2||TAIR[k]>20)continue;const y=HM(x,z);const w=waterAt(x,z);if(w>-1e3&&w>y-.4)continue;if(TBLK[k]===1&&nearRoute(x,z,5,true))continue;if(RVD[k]<RVW[k]+6&&riverHit(x,z)[0]<5)continue;
const con=y>650?r2<.85:y>250?r2<.45:r2<.18;out.push(x,y-.3,z,(con?11:9)+R_()*(con?11:8),R_()*6.28,con?0:1,.8+R_()*.4,(a+b)%3===0?1:0)}
c=new Float32Array(out);TCACHE.set(key,c);if(TCACHE.size>900){const it=TCACHE.keys();for(let q=0;q<200;q++)TCACHE.delete(it.next().value)}return c}
function setTreeQuality(f){if(f===TQ)return;TQ=f;TCACHE.clear();tLast=null}
const TNEAR=950,TFAR=4200;
function treeUpdate(force){const p=cam.position,gy=HM(p.x,p.z),alt=Math.max(0,p.y-gy-150);if(!force&&tLast&&hyp(p.x-tLast[0],p.z-tLast[1])<140&&Math.abs(alt-tLast[2])<120)return;tLast=[p.x,p.z,alt];
const nf=Math.sqrt(Math.max(0,TFAR*TFAR-alt*alt*.8)),nn=Math.sqrt(Math.max(0,TNEAR*TNEAR-alt*alt));const cnt={con:0,dec:0,conF:0,decF:0};
const c0=Math.floor((p.x-nf)/TCH_),c1=Math.floor((p.x+nf)/TCH_),r0=Math.floor((p.z-nf)/TCH_),r1=Math.floor((p.z+nf)/TCH_);
for(let ci=c0;ci<=c1;ci++)for(let cj=r0;cj<=r1;cj++){const cx=(ci+.5)*TCH_,cz=(cj+.5)*TCH_,d=hyp(cx-p.x,cz-p.z)-TCH_*.35;if(d>nf)continue;const near=d<nn,ch=treeChunk(ci,cj);
for(let o=0;o<ch.length;o+=8){if(!near&&!ch[o+7])continue;const k=(ch[o+5]?'dec':'con')+(near?'':'F'),m=TIM[k],i=cnt[k];if(i>=TCAP[k])continue;cnt[k]++;const s=ch[o+3]*(near?1:1.15),a=ch[o+4],cs=Math.cos(a)*s,sn=Math.sin(a)*s,e=m.instanceMatrix.array,q=i*16;
e[q]=cs;e[q+1]=0;e[q+2]=-sn;e[q+3]=0;e[q+4]=0;e[q+5]=s*(.9+.2*((a*7)%1));e[q+6]=0;e[q+7]=0;e[q+8]=sn;e[q+9]=0;e[q+10]=cs;e[q+11]=0;e[q+12]=ch[o];e[q+13]=ch[o+1];e[q+14]=ch[o+2];e[q+15]=1;
const t=ch[o+6],ca=m.instanceColor.array;ca[i*3]=t*(.95+.1*((a*3)%1));ca[i*3+1]=t;ca[i*3+2]=t*.9}}
for(const k in TIM){const m=TIM[k];m.count=cnt[k];m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true}}
TICKS.push(dt=>{if((tT+=dt)>.35){tT=0;treeUpdate()}});

/* ---------- farmsteads, barns, silos, greenhouse clusters ---------- */
LOADMSG('Building farms…');
const FB=new TSB(5000,13000),GHG=merge([[archGeo(70,8,3.6,10),M4(0,2,0),0xe9eef0],[BOXG,M4(0,1,0,0,8,2,70),0xdfe6e8]]),SILG=merge([[new T.CylinderGeometry(3.6,3.6,17,12),M4(0,8.5,0),0xc9ccc9],[new T.SphereGeometry(3.6,12,4,0,6.3,0,1.57),M4(0,17,0),0xb9bcb9]]),GHL=[],SILL=[];
{const R_=RNG(WLD.seed+41);for(let j=4;j<GNZ-4;j+=6)for(let i=4;i<GNX-4;i+=6){const k=j*GNX+i;if(TFM[k]<140||TURB[k]>25||R_()>.4)continue;const x=GX0+i*GC+(R_()-.5)*500,z=GZ0+j*GC+(R_()-.5)*500;if(!canBuild(x,z,22,0))continue;
const ry=R_()*PI,B=FB.at(x,z),cs=Math.cos(ry),sn=Math.sin(ry),L=(a,b)=>[x+a*cs+b*sn,z-a*sn+b*cs],g=gMin(x,z,25)-.6,s=R_();
if(s<.22){/* greenhouse cluster: rows of arched plastic tunnels */const n=4+(R_()*6|0);for(let q=0;q<n;q++){const[gx,gz]=L((q-n/2)*10,0);GHL.push(M4(gx,g,gz,ry))}BLDS.push(x,z,n*10,70,ry);addBld(x,z,Math.max(n*5,35),g+6)}
else{const top=bld('h',x,z,11,9,6,ry,pick(R_,HSC));inst('roof',x,top-.05,z,11.8,3.6,9.8,ry,pick(R_,RFC),false);const[bx,bz]=L(26,4),bc=R_()<.5?0xa8432f:0x5d7f5a;const bt=bld('h',bx,bz,16,26,8,ry,bc);inst('roof',bx,bt-.05,bz,17,6,27,ry,0x55585c,false);
if(R_()<.6)for(const q of[0,1]){const[sx,sz]=L(42,-6+q*9);SILL.push(M4(sx,g,sz));addBld(sx,sz,4,g+21)}}}}
FB.flush(S);for(const[G_,L_,mt]of[[GHG,GHL,vm({side:T.DoubleSide,roughness:.4,metalness:.1})],[SILG,SILL,vm({roughness:.4,metalness:.5})]]){if(!L_.length)continue;const im=new T.InstancedMesh(G_,mt,L_.length);L_.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=im.receiveShadow=true;fitIS(im);S.add(im)}

/* ---------- Deulpan solar farm ---------- */
LOADMSG('Installing the solar farm…');
{const sf=WLD.landmarks.solar,cs=Math.cos(sf.rot),sn=Math.sin(sf.rot),L=(a,b)=>[sf.x+a*cs-b*sn,sf.z+a*sn+b*cs],pts=[];
for(let b=-sf.d/2;b<sf.d/2;b+=9)for(let a=-sf.w/2;a<sf.w/2;a+=40){const[x,z]=L(a+20,b);const k=gIdx(x,z);if(k<0||TBLK[k]===2)continue;if(!dry(x,z,22)||nearRoute(x,z,12,true))continue;pts.push(x,HM(x,z),z)}
const tex_=tex(cv(64,64,x=>{x.fillStyle='#1b2c4a';x.fillRect(0,0,64,64);x.strokeStyle='#8a9bb0';x.lineWidth=1;for(let i=0;i<=64;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.stroke()}x.beginPath();x.moveTo(0,32);x.lineTo(64,32);x.stroke()}),1);
const g=new T.BoxGeometry(39.5,.12,4.6);g.scale(1,1,1);{const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*10,uv.getY(i))}
const im=new T.InstancedMesh(g,new T.MeshStandardMaterial({map:tex_,roughness:.22,metalness:.5,envMapIntensity:1.2}),pts.length/3),d=new T.Object3D();for(let i=0;i<pts.length/3;i++){d.position.set(pts[i*3],pts[i*3+1]+1.6,pts[i*3+2]);d.rotation.set(0,0,0);d.rotateY(-sf.rot);d.rotateX(.42);d.updateMatrix();im.setMatrixAt(i,d.matrix)}
im.castShadow=im.receiveShadow=true;fitIS(im);S.add(im);
const B=new SB();for(let i=0;i<pts.length/3;i+=12)B.box(.3,1.6,.3,pts[i*3],pts[i*3+1],pts[i*3+2],0x7d8288);for(const[a,b]of[[-sf.w/2-20,0],[sf.w/2+20,0]]){const[x,z]=L(a,b);B.box(8,3,5,x,HM(x,z),z,0xd9dcd8,'w',-sf.rot)}
for(const s of[1,-1]){const[x,z]=L(0,s*(sf.d/2+12));B.box(sf.w+40,2.2,.15,x,HM(x,z),z,0x9aa1a8,'m',-sf.rot)}B.flush(S);BLDS.push(sf.x,sf.z,sf.w,sf.d,-sf.rot)}

/* ---------- West Ridge wind farm ---------- */
LOADMSG('Raising wind turbines…');
const TURBS=[];
{const d=densify(WLD.landmarks.wind.pts,40),B=new SB(),blade=merge([[BOXG,M4(0,22,0,0,1.6,44,.5),0xf4f5f6],[BOXG,M4(.3,4,0,0,2.4,8,.7),0xf4f5f6]]),rotor=merge([0,1,2].map(q=>[blade,new T.Matrix4().makeRotationZ(q*2.094)]).concat([[new T.SphereGeometry(2.1,10,8),M4(0,0,-1.2),0xeeeeee]]));let acc=520;
for(let i=0;i<d.length/2;i++){if(i)acc+=hyp(d[i*2]-d[i*2-2],d[i*2+1]-d[i*2-1]);if(acc<560)continue;acc=0;const x=d[i*2]+(hh(i,3)-.5)*160,z=d[i*2+1],g=HM(x,z);if(waterAt(x,z)>g)continue;
B.add(new T.CylinderGeometry(1.5,2.6,88,14),M4(x,g+44,z),0xf2f3f4,'s');B.box(3.6,3.8,10,x,g+87.5,z,0xeef0f2,'s');TURBS.push({x,y:g+89.4,z,ph:hh(i,9)*6.28,sp:.9+hh(i,5)*.3});addBld(x,z,4,g+92)}
B.flush(S);const rm=new T.InstancedMesh(rotor,vm({roughness:.45}),TURBS.length);rm.frustumCulled=false;rm.castShadow=true;S.add(rm);
const lp_=[];TURBS.forEach(t=>lp_.push(t.x,t.y+2.5,t.z));const bl=nightLights(lp_,0xff2a1a,14,.35);const D=new T.Object3D();
TICKS.push((dt,ns)=>{const wv=windV(),yaw=Math.atan2(wv.x,wv.z),sp=.35+Math.min(1,hyp(wv.x,wv.z)/8)*.9;TURBS.forEach((t,i)=>{t.ph+=dt*sp*t.sp;D.position.set(t.x-Math.sin(yaw)*5.5,t.y,t.z-Math.cos(yaw)*5.5);D.rotation.set(0,yaw,0);D.rotateZ(t.ph);D.updateMatrix();rm.setMatrixAt(i,D.matrix)});rm.instanceMatrix.needsUpdate=true;bl.visible=bl.visible&&(tt%1.6<.8)})}

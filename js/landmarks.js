/* ============================================================
   landmarks.js — Cheongho Dam, Haeun Grand Bridge (suspension), Haeun container
   port, lighthouses, World Cup stadium, Starlight Land (Ferris wheel + coaster),
   Namsan Tower, Hanbit Central Station, East Coast Power Station, industrial
   zones, convention centre, island harbour, ships / ferry / lake boats.
   Exposes SHIPS (moving vessels, for the map) and LMARKS (map icons).
   ============================================================ */
LOADMSG('Building landmarks…');
const LM_=WLD.landmarks,LMARKS=[],SHIPS=[];
/* level a site: ground set to y inside r, blended out over bl; trees excluded */
function flat(x,z,r,bl,y){gridRect(x-r-bl,z-r-bl,x+r+bl,z+r+bl,(k,px,pz)=>{if(TWAT[k]>-1e3)return;const d=hyp(px-x,pz-z),t=sm(r,r+bl,d);if(t>=1)return;THS[k]=lp(y,THS[k],t);if(d<r)TBLK[k]=2})}
const stripeMat=(a,b,n)=>new T.MeshStandardMaterial({map:tex(cv(8,64,x=>{for(let i=0;i<n;i++){x.fillStyle=i%2?b:a;x.fillRect(0,i*64/n,8,64/n)}})),roughness:.6});
const blink=(pos,col,size,period=1.5,on=.5)=>{const o=nightLights(pos,col,size,.4);TICKS.push(()=>{o.visible=o.visible&&(tt%period)<period*on});return o};

/* ================= Cheongho Dam ================= */
{const LK=LAKES.find(l=>l.reservoir),D=LM_.dam,CR=LK.level+6,[ax,az]=D.a,[bx,bz]=D.b,L=hyp(bx-ax,bz-az),ux=(bx-ax)/L,uz=(bz-az)/L;let nx=-uz,nz=ux;
const lc=LK.pts.reduce((a,p)=>[a[0]+p[0]/LK.pts.length,a[1]+p[1]/LK.pts.length],[0,0]);if(nx*(lc[0]-D.x)+nz*(lc[1]-D.z)>0){nx=-nx;nz=-nz}
let gmin=1e9;for(let s=0;s<=L;s+=20)gmin=Math.min(gmin,HM(ax+ux*s,az+uz*s));const base=gmin-14;
gridRect(D.x-1000,D.z-1000,D.x+1000,D.z+1000,(k,x,z)=>{const[d,u]=segD(x,z,ax,az,bx,bz),side=(x-D.x)*nx+(z-D.z)*nz;
if(side<-8&&d<430&&u>.002&&u<.998&&THS[k]<LK.level+1){THS[k]=Math.min(THS[k],LK.level-16);TWAT[k]=LK.level}if((u<=.002||u>=.998)&&d<210&&Math.abs(side)<110)THS[k]=Math.max(THS[k],CR+4);TBLK[k]=Math.max(TBLK[k],d<160?2:TBLK[k])});
const sh=new T.Shape();sh.moveTo(-7,CR+1.2);sh.lineTo(6,CR+1.2);sh.lineTo(6,CR-5);sh.lineTo(6+(CR-5-base)*.78,base);sh.lineTo(-12,base);sh.lineTo(-7,CR+1.2);
const g=new T.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false}),M=new T.Matrix4().makeBasis(new T.Vector3(nx,0,nz),YA,new T.Vector3(ux,0,uz)).setPosition(ax,0,az),B=new SB();B.add(g,M,0xc9c6bc,'m');
const cx=D.x,cz=D.z;B.strip(ax,az,bx,bz,9,CR+1.25,0xffffff,'o',30);for(const s of[-6.6,5.6])B.add(BOXG,MR(cx+nx*s,CR+1.8,cz+nz*s,Math.atan2(ux,uz),0,.5,1.2,L),0xd7d4cc,'m');
for(let q=-2;q<=2;q++){const px=cx+ux*q*26,pz=cz+uz*q*26;B.box(7,9,9,px,CR+1.2,pz,0xb9b5aa,'w',Math.atan2(ux,uz));}
const t1=6+(CR-5-base)*.78;beam(B,cx+nx*7,CR-5,cz+nz*7,cx+nx*(t1+1),base+14,cz+nz*(t1+1),130,.6,0xe9eff1,'m');B.add(PLG,M4(cx+nx*(t1+60),LK.level-70,cz+nz*(t1+60),Math.atan2(ux,uz),150,1,110),0xe6eef0,'d');
B.flush(S);const pool=new T.Mesh(new T.PlaneGeometry(L+260,440).rotateX(-PI/2),waterMat(LK.level,1));pool.position.set(cx-nx*230,LK.level-.03,cz-nz*230);pool.rotation.y=Math.atan2(-uz,ux);pool.renderOrder=1;S.add(pool);
nightLights(Array.from({length:12},(_,i)=>[ax+ux*L*i/11,CR+7,az+uz*L*i/11]).flat(),0xffd6a0,12);addBld(cx,cz,L/2,CR+2);LMARKS.push({x:cx,z:cz,n:D.name,i:'dam'});
let sT=0;TICKS.push(dt=>{if((sT+=dt)<.25)return;sT=0;if(hyp(cam.position.x-cx,cam.position.z-cz)>9000)return;for(let i=0;i<3;i++){const s=(rnd()-.5)*120;SMK.emit(cx+nx*(t1+8)+ux*s,base+16,cz+nz*(t1+8)+uz*s,nx*6,6+rnd()*4,nz*6,10,6,24,.35)}})}

/* ================= Haeun Grand Bridge (suspension) ================= */
{const BR=LM_.bridge,SPN=WLD.roads.find(r=>r.span).span,[fx,fz]=SPN.from,[tx_,tz_]=SPN.to,len=hyp(tx_-fx,tz_-fz),dx=(tx_-fx)/len,dz=(tz_-fz)/len,nx=-dz,nz=dx,ry=Math.atan2(dx,dz);
const uOf=z=>(z-fz)/(tz_-fz),P=u=>[fx+dx*len*u,fz+dz*len*u],dY=u=>SPN.deck+SPN.crown*(1-(2*u-1)**2),u1=uOf(BR.towers[0]),u2=uOf(BR.towers[1]),ua=uOf(BR.a[1]),ub=uOf(BR.b[1]),TOP=SPN.deck+150,B=new SB();
for(const u of[u1,u2]){const[x,z]=P(u);B.box(58,16,26,x,-14,z,0xb4b2aa,'m',ry);for(const s of[1,-1])B.add(BOXG,MR(x+nx*s*18,(TOP-2)/2,z+nz*s*18,ry,0,6.5,TOP+2,9,s*.035),0xd8dbdc,'m');for(const h of[SPN.deck-6,95,TOP-14])B.box(42,6,6.5,x,h,z,0xd8dbdc,'m',ry);addBld(x,z,26,TOP+4)}
for(const u of[ua,ub]){const[x,z]=P(u),g=HM(x,z);B.box(54,Math.max(10,dY(u)+6-g),46,x,g-4,z,0xa9a69c,'m',ry)}
const cy=u=>{if(u<u1)return lp(dY(ua)+4,TOP-1,((u-ua)/(u1-ua))**1.35);if(u>u2)return lp(dY(ub)+4,TOP-1,((ub-u)/(ub-u2))**1.35);const m=(u-u1)/(u2-u1);return lp(SPN.deck+7,TOP-1,(2*m-1)**2)},lights=[],red=[];
for(const s of[1,-1]){let pv=null;for(let u=ua;u<=ub+1e-6;u+=10/len){const[x,z]=P(u),o=[x+nx*s*16.5,cy(u),z+nz*s*16.5];if(pv)beam(B,pv[0],pv[1],pv[2],o[0],o[1],o[2],1.4,1.4,0xd8dbdc,'s');pv=o;if(((u-ua)*len|0)%40<10)lights.push(...o)}
for(let u=u1+20/len;u<u2;u+=20/len){const[x,z]=P(u),hx=x+nx*s*16.5,hz=z+nz*s*16.5;beam(B,hx,dY(u)+1,hz,hx,cy(u),hz,.35,.35,0xc9cccd,'m')}for(const u of[u1,u2]){const[x,z]=P(u);red.push(x+nx*s*18,TOP+2,z+nz*s*18)}}
for(let u=u1-.04;u<u2+.04;u+=12/len){const[x,z]=P(u),[x2,z2]=P(u+12/len);beam(B,x,dY(u)-4.4,z,x2,dY(u+12/len)-4.4,z2,30,4.5,0x8f979c,'m')}
B.flush(S);nightLights(lights,0xfff4dc,13);blink(red,0xff2a1a,22,1.6);LMARKS.push({x:BR.x,z:BR.z,n:BR.name,i:'bridge'})}

/* ================= ships (shared builder) ================= */
function shipGeo(kind){const D={container:[300,42,24,13],tanker:[250,44,22,14],ferry:[140,24,12,5],boat:[16,5,3,1.2],tug:[30,10,6,3]}[kind],[L,Bm,H,dr]=D,sh=new T.Shape();
sh.moveTo(-Bm/2,L/2);sh.lineTo(Bm/2,L/2);sh.lineTo(Bm/2,-L*.22);sh.quadraticCurveTo(Bm/2,-L*.44,0,-L/2);sh.quadraticCurveTo(-Bm/2,-L*.44,-Bm/2,-L*.22);sh.lineTo(-Bm/2,L/2);
const hull=new T.ExtrudeGeometry(sh,{depth:H,bevelEnabled:false,curveSegments:5}).rotateX(-PI/2).translate(0,-dr,0),hc={container:0x1f3c66,tanker:0x2b2e33,ferry:0xf4f4f2,boat:0xf0f0ee,tug:0xc23a2a}[kind],L_=[[hull,new T.Matrix4(),hc]];
L_.push([BOXG,M4(0,-dr+1.2,0,0,Bm+.2,2.4,L*.94),kind==='ferry'?0x1b5c9e:0x8a2a22]);const R_=RNG(L*7+Bm);
if(kind==='container'){for(let z=-L*.36;z<L*.3;z+=13.5)for(let x=-Bm/2+3;x<Bm/2-3;x+=Bm/3.2)L_.push([BOXG,M4(x+Bm/6.4-1.5,H-dr+ (2+R_()*3|0)*1.3,z,0,Bm/3.4,(2+R_()*3|0)*2.6,12.4),[0xb3462e,0x2f6f8f,0xdcb33a,0x3d7a44,0xd9d9d6,0x8f4fa0,0xe07b2a][R_()*7|0]]);L_.push([BOXG,M4(0,H-dr+12,L*.4,0,Bm*.8,24,16),0xf2f2f0],[BOXG,M4(0,H-dr+25,L*.37,0,Bm,3,10),0xf2f2f0])}
if(kind==='tanker'){L_.push([BOXG,M4(0,H-dr+.6,-L*.05,0,Bm*.86,1.2,L*.78),0x8a3a2a],[BOXG,M4(0,H-dr+3,-L*.05,0,1.6,1.6,L*.75),0xc9c9c4],[BOXG,M4(0,H-dr+10,L*.4,0,Bm*.7,20,18),0xf2f2f0])}
if(kind==='ferry'){for(let q=0;q<3;q++)L_.push([BOXG,M4(0,H-dr+3+q*3.4,L*.05,0,Bm*(.92-q*.1),3.2,L*(.78-q*.12)),q%2?0x223a52:0xf4f4f2]);L_.push([BOXG,M4(0,H-dr+15,L*.22,0,4,6,8),0x1b5c9e])}
if(kind==='boat'||kind==='tug')L_.push([BOXG,M4(0,H-dr+1.5,L*.12,0,Bm*.7,3,L*.3),0xf2f2f0]);return merge(L_)}
const WAKET=tex(cv(64,256,x=>{const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;for(let i=0;i<64;i++){const e=Math.abs(i-32)/32;x.globalAlpha=Math.max(0,1-e*e*1.3)*(.6+.4*Math.abs(Math.sin(i*.9)));x.fillRect(i,0,1,256)}}));
const WAKEM=new T.MeshBasicMaterial({map:WAKET,transparent:true,depthWrite:false,opacity:.55});
const SHM=vm({roughness:.55,metalness:.15});
function ship(kind,wake){const g=new T.Group(),m=new T.Mesh(shipGeo(kind),SHM);m.castShadow=true;g.add(m);if(wake){const L={container:300,tanker:250,ferry:140,boat:16,tug:30}[kind],w=new T.Mesh(new T.PlaneGeometry(L*.3,L*1.6).rotateX(-PI/2),WAKEM);w.position.set(0,.25,-L*1.25);w.renderOrder=3;g.add(w);g.userData.w=w}S.add(g);return g}
/* path follower */
function follow(pts,kind,speed,y,start,big,step=60){const d=densify(pts,step),n=d.length/2,S_=[0];for(let i=1;i<n;i++)S_.push(S_[i-1]+hyp(d[i*2]-d[i*2-2],d[i*2+1]-d[i*2-1]));const o={g:ship(kind,speed>2),d,n,S:S_,L:S_[n-1],s:S_[n-1]*start,dir:1,v:speed,y,big,x:0,z:0};SHIPS.push(o);return o}
function at(o,s){let i=0;while(i<o.n-2&&o.S[i+1]<s)i++;const u=(s-o.S[i])/((o.S[i+1]-o.S[i])||1);return[lp(o.d[i*2],o.d[i*2+2],u),lp(o.d[i*2+1],o.d[i*2+3],u)]}
TICKS.push(dt=>{for(const o of SHIPS){if(o.fixed)continue;o.s+=o.v*o.dir*dt;if(o.s>o.L){o.s=o.L;o.dir=-1}if(o.s<0){o.s=0;o.dir=1}const[x,z]=at(o,o.s),[x2,z2]=at(o,cl(o.s+o.dir*20,0,o.L));o.x=x;o.z=z;o.g.position.set(x,o.y+Math.sin(tt*.6+o.L)*.25,z);if(hyp(x2-x,z2-z)>.5)o.g.lookAt(x2,o.y,z2);o.g.rotation.z+=Math.sin(tt*.5+o.L)*.01}});
LANESHIP:for(const[i,l]of LM_.shipLanes.entries())follow(l,i%2?'tanker':'container',7+i,0,.25+i*.18,1);
follow(LM_.ferry,'ferry',9,0,.4,1);
{const LK=LAKES.find(l=>l.reservoir),c=[11800,-30200];for(let q=0;q<3;q++){const pts=[];for(let a=0;a<=12;a++){const t=a/12*2*PI+q;pts.push([c[0]+Math.cos(t)*(1300+q*250),c[1]+Math.sin(t)*(900+q*200)])}follow(pts,'boat',5+q,LK.level,q*.3,0,40)}}

/* ================= Haeun container terminal ================= */
{const PT=LM_.port,[qa,qb]=PT.quay,L=hyp(qb[0]-qa[0],qb[1]-qa[1]),ux=(qb[0]-qa[0])/L,uz=(qb[1]-qa[1])/L;let nx=-uz,nz=ux;const mx=(qa[0]+qb[0])/2,mz=(qa[1]+qb[1])/2;if(HM(mx+nx*300,mz+nz*300)<HM(mx-nx*300,mz-nz*300)){nx=-nx;nz=-nz}
const Y=PT.yard,W=(s,t)=>[qa[0]+ux*s+nx*t,qa[1]+uz*s+nz*t],ry=Math.atan2(ux,uz);
gridRect(Math.min(qa[0],qb[0])-700,Math.min(qa[1],qb[1])-700,Math.max(qa[0],qb[0])+700,Math.max(qa[1],qb[1])+700,(k,x,z)=>{const s=(x-qa[0])*ux+(z-qa[1])*uz,t=(x-qa[0])*nx+(z-qa[1])*nz;if(s<-80||s>L+80)return;
if(t>=0&&t<Y+160){const b=sm(Y+20,Y+150,t)+sm(-10,-80,s)+sm(L+10,L+80,s);THS[k]=lp(4.5,THS[k],cl(b,0,1));if(t<Y+20)TBLK[k]=2;if(TWAT[k]===SEA&&b<.5)TWAT[k]=-1e4}else if(t<0&&t>-420){THS[k]=Math.min(THS[k],-18+Math.max(0,-t-220)*.06);TWAT[k]=SEA}});
const B=new SB();{const[cx,cz]=W(L/2,Y/2);B.add(PLG,M4(cx,4.62,cz,ry,Y+20,1,L+40),0x8e8f8c,'a',[(Y+20)/40,(L+40)/40])}{const[cx,cz]=W(L/2,-26);B.box(62,1.2,L+40,cx,3.5,cz,0x9a9a96,'m',ry);const[fx,fz]=W(L/2,-56);B.box(3,25,L+40,fx,-20.3,fz,0x8e8c84,'m',ry);B.box(1.6,.4,L+40,fx,4.7,fz,0xdcb33a,'m',ry);for(let s=20;s<L;s+=30){const[bx_,bz_]=W(s,-56.5);B.box(1.2,1.4,1.2,bx_,3.6,bz_,0x2b2d30,'m',ry)}}
const CC=[0xb3462e,0x2f6f8f,0xdcb33a,0x3d7a44,0xd9d9d6,0x8f4fa0,0xe07b2a,0x4a4f55,0x1f5c8a],cont=[],R_=RNG(WLD.seed+501);
for(let t=75;t<Y-25;t+=34)for(let s=40;s<L-70;s+=72){if(R_()<.12)continue;for(let a=0;a<5;a++)for(let b=0;b<5;b++){const hgt=R_()*5|0;for(let h=0;h<hgt;h++){const[x,z]=W(s+a*12.6,t+b*2.7);cont.push(x,4.6+h*2.6,z,CC[R_()*CC.length|0])}}}
{const im=new T.InstancedMesh(merge([[BOXG,M4(0,1.3,0,0,2.44,2.55,12.1)]]),vm({roughness:.6,metalness:.3}),cont.length/4),d=new T.Object3D(),c=new T.Color();for(let i=0;i<cont.length/4;i++){d.position.set(cont[i*4],cont[i*4+1],cont[i*4+2]);d.rotation.y=ry;d.updateMatrix();im.setMatrixAt(i,d.matrix);im.setColorAt(i,c.setHex(cont[i*4+3]))}im.castShadow=im.receiveShadow=true;fitIS(im);S.add(im)}
/* ship-to-shore gantry cranes along the quay, yard gantries */
for(let q=0;q<8;q++){const s=110+q*(L-220)/7,col=q%2?0x2c6fb4:0xd9d9d6;for(const t of[-48,-18])for(const e of[-8,8]){const[x,z]=W(s+e,t);B.box(1.8,46,1.8,x,4.6,z,col,'m',ry)}const[bx,bz]=W(s,-60);B.box(4,4,4,bx,48,bz,col,'m',ry);
for(const e of[-8,8]){const[a1,a2]=W(s+e,-125),[b1,b2]=W(s+e,5);beam(B,a1,50,a2,b1,50,b2,2.2,3,col,'m')}const[hx,hz]=W(s,-6);B.box(16,8,12,hx,52,hz,0xe8e8e8,'m',ry);for(const t of[-48,-18]){const[x,z]=W(s,t);B.box(17.8,2,1.8,x,48,z,col,'m',ry)}{const[x,z]=W(s,-40);addBld(x,z,32,60)}}
for(let q=0;q<6;q++){const[x,z]=W(200+q*270,150);for(const e of[-11,11])for(const f of[-14,14]){const[px,pz]=[x+ux*f+nx*e,z+uz*f+nz*e];B.box(1.2,19,1.2,px,4.6,pz,0xdcb33a,'m',ry)}B.box(26,2.2,30,x,23,z,0xdcb33a,'m',ry)}
{const[x,z]=W(L*.5,Y+40);B.box(60,22,30,x,4.6,z,0xd7d0c2,'w',ry)}B.flush(S);
for(const f of[.3,.72]){const[x,z]=W(L*f,-82),o={g:ship('container',0),fixed:1,x,z,big:1};o.g.position.set(x,0,z);o.g.rotation.y=ry;SHIPS.push(o)}
LMARKS.push({x:mx,z:mz,n:PT.name,i:'port'})}

/* ================= lighthouses ================= */
{const LHM=stripeMat('#f4f4f2','#c8302a',6),beamM=new T.MeshBasicMaterial({color:0xfff2c8,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false}),BEAMS=[];
for(const L of LM_.lighthouses){const g=Math.max(HM(L.x,L.z),2),t=new T.Mesh(new T.CylinderGeometry(2.6,3.8,26,18),LHM);t.position.set(L.x,g+13,L.z);t.castShadow=true;S.add(t);const B=new SB();
B.add(new T.CylinderGeometry(4.6,4.6,.8,18),M4(L.x,g+26.4,L.z),0x2a2d30,'m');B.add(new T.CylinderGeometry(2.2,2.2,3.4,12),M4(L.x,g+28.5,L.z),0xffe7a0,'g');B.add(new T.ConeGeometry(2.8,2.4,12),M4(L.x,g+31.4,L.z),0xb83228,'m');
if(L.keeper){B.box(9,4,7,L.x+12,g-.5,L.z+4,0xf4f4f2,'m');B.add(PRISM,M4(L.x+12,g+3.5,L.z+4,0,9.6,2.6,7.6),0xb83228,'m')}B.flush(S);addBld(L.x,L.z,4,g+33);
const bg=new T.Group();bg.position.set(L.x,g+28.5,L.z);for(const s of[1,-1]){const c=new T.Mesh(new T.ConeGeometry(36,1400,18,1,true).translate(0,-700,0).rotateZ(s*PI/2),beamM);bg.add(c)}S.add(bg);BEAMS.push(bg);
const fl=new T.Points(ptsGeo([L.x,g+28.5,L.z],[1,.95,.75]),PM_(40));S.add(fl);BEAMS.push(fl);LMARKS.push({x:L.x,z:L.z,n:L.name,i:'light'})}
TICKS.push((dt,ns)=>{const vis=Math.max(ns,WX.rain[wx]*.6);beamM.opacity=vis*.07;BEAMS.forEach(b=>{if(b.isGroup){b.rotation.y+=dt*.9;b.visible=vis>.05}else{b.material.opacity=vis*(Math.cos(tt*.9*2)>.85?1:.25)}})})}

/* ================= World Cup stadium ================= */
{const st=LM_.stadium,g=HM(st.x,st.z);flat(st.x,st.z,240,160,g);const G=new T.Group();G.position.set(st.x,g,st.z);G.rotation.y=-st.rot;S.add(G);const B=new SB(),O=new T.Matrix4().makeScale(1.2,1,1);
B.add(new T.LatheGeometry([[68,1],[70,2],[108,30],[112,33]].map(p=>new T.Vector2(p[0],p[1])),56),O,0x2f5fa8,'r');B.add(new T.LatheGeometry([[118,0],[118,40],[112,33]].map(p=>new T.Vector2(p[0],p[1])),56),O,0xe6e3dc,'r');
B.add(new T.RingGeometry(88,124,56).rotateX(-PI/2),new T.Matrix4().makeScale(1.2,1,1).setPosition(0,44,0),0xf4f4f2,'r');for(let a=0;a<24;a++){const t=a/24*2*PI;B.add(BOXG,M4(Math.cos(t)*121*1.2,22,Math.sin(t)*121,0,1.6,44,1.6),0xd9d9d6,'m')}
const lights=[];for(const[a,b]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const x=a*112,z=b*84;B.add(new T.CylinderGeometry(.8,1.4,62,8),M4(x,31,z),0x9aa0a6,'m');B.box(14,5,2,x,62,z,0x3a3f45,'m',Math.atan2(-x,-z));lights.push(...new T.Vector3(x,64,z).applyMatrix4(new T.Matrix4().makeRotationY(-st.rot)).add(G.position).toArray())}
B.box(2,.3,2,0,0,0,0x777777);B.flush(G);
const pt=tex(cv(64,128,x=>{for(let i=0;i<10;i++){x.fillStyle=i%2?'#3f8a3a':'#4a9843';x.fillRect(0,i*12.8,64,12.8)}x.strokeStyle='#e8f2e6';x.lineWidth=1.2;x.strokeRect(3,3,58,122);x.beginPath();x.moveTo(3,64);x.lineTo(61,64);x.stroke();x.beginPath();x.arc(32,64,9,0,7);x.stroke();x.strokeRect(16,3,32,18);x.strokeRect(16,107,32,18)})),pm=new T.Mesh(new T.PlaneGeometry(68,105).rotateX(-PI/2),new T.MeshStandardMaterial({map:pt,roughness:.9}));
pm.rotation.y=PI/2;pm.position.y=1.1;pm.receiveShadow=true;G.add(pm);const tr=new T.Mesh(new T.CircleGeometry(66,40).rotateX(-PI/2),vm({color:0x9a4a38}));tr.scale.set(1.25,1,.98);tr.position.y=1.02;G.add(tr);
nightLights(lights,0xf4f8ff,60,0,1);addBld(st.x,st.z,140,g+46);LMARKS.push({x:st.x,z:st.z,n:st.name,i:'stadium'})}

/* ================= Starlight Land amusement park ================= */
{const ap=LM_.amusement,g=HM(ap.x,ap.z);flat(ap.x,ap.z,400,180,g);const G=new T.Group();G.position.set(ap.x,g,ap.z);S.add(G);const B=new SB(),R_=RNG(808),lt=[];
B.add(new T.CircleGeometry(340,40).rotateX(-PI/2),M4(0,.2,0),0x77736a,'d');for(let q=0;q<9;q++){const a=q/9*2*PI+.3;B.add(new T.CircleGeometry(38+R_()*30,16).rotateX(-PI/2),M4(Math.cos(a)*200,.26,Math.sin(a)*200),0x4f7a3a,'d')}for(let q=0;q<6;q++){const a=q/6*2*PI;B.strip(0,0,Math.cos(a)*330,Math.sin(a)*330,9,.24,0xb8ad98,'d')}for(let q=0;q<26;q++){const a=R_()*2*PI,r=120+R_()*240,x=Math.cos(a)*r,z=Math.sin(a)*r,w=10+R_()*16,c=[0xe84a5f,0xf7b733,0x4abdac,0x8e6fd8,0xf2f2f0,0xfc913a][q%6];B.box(w,6+R_()*5,w*.8,x,0,z,c,'m',a);B.add(PRISM,M4(x,11.2,z,a,w*1.05,3+R_()*3,w*.85),0x4f5a66,'m');lt.push(x,9,z)}
/* Ferris wheel */const WX_=110,WZ=-90,HY=52,RW=45;for(const s of[1,-1]){beam(B,WX_-20,0,WZ+s*7,WX_,HY,WZ+s*3.5,1.4,1.4,0xf2f2f0,'s');beam(B,WX_+20,0,WZ+s*7,WX_,HY,WZ+s*3.5,1.4,1.4,0xf2f2f0,'s')}
const wh=new T.Group();wh.position.set(WX_,HY,WZ);G.add(wh);const wm=vm({roughness:.4,metalness:.4});const wb=[];for(const s of[3,-3])wb.push([new T.TorusGeometry(RW,.6,6,72),M4(0,0,s),0xf2f2f0]);for(let q=0;q<16;q++){const a=q/16*2*PI;wb.push([BOXG,new T.Matrix4().compose(new T.Vector3(Math.cos(a)*RW/2,Math.sin(a)*RW/2,0),new T.Quaternion().setFromAxisAngle(ZA,a),new T.Vector3(RW,.3,.3)),0xe84a5f])}
wb.push([new T.CylinderGeometry(2,2,9,12).rotateX(PI/2),new T.Matrix4(),0x9aa0a6]);const wmesh=new T.Mesh(merge(wb),wm);wmesh.castShadow=true;wh.add(wmesh);const rl=[];for(let q=0;q<48;q++){const a=q/48*2*PI;rl.push(Math.cos(a)*RW,Math.sin(a)*RW,3.2)}const rp=new T.Points(ptsGeo(rl,rl.map((_,i)=>[1,.6+.4*((i/3|0)%3)/2,.4][i%3])),PM_(10));wh.add(rp);
const NC=24,cab=new T.InstancedMesh(merge([[BOXG,M4(0,-2.6,0,0,3.2,3,3.2)],[BOXG,M4(0,-.6,0,0,.3,1.4,.3),0x777777]]),vm({roughness:.4}),NC);G.add(cab);const cc=new T.Color();for(let q=0;q<NC;q++)cab.setColorAt(q,cc.setHex([0xe84a5f,0xf7b733,0x4abdac,0x8e6fd8][q%4]));cab.frustumCulled=false;
/* roller coaster */const cp=[[-160,5,10],[-130,52,20],[-95,10,50],[-70,34,95],[-25,9,150],[30,26,160],[75,7,120],[50,18,55],[-5,6,20],[-60,14,-25],[-110,4,-30]].map(p=>new T.Vector3(p[0],p[1],p[2])),cv_=new T.CatmullRomCurve3(cp,true,'catmullrom',.5),CL=cv_.getLength();
const tm=new T.Mesh(new T.TubeGeometry(cv_,400,.9,6,true),vm({color:0xd93636,roughness:.5,metalness:.4}));tm.castShadow=true;G.add(tm);for(let q=0;q<90;q++){const p=cv_.getPointAt(q/90);if(p.y>2)B.add(new T.CylinderGeometry(.35,.45,p.y,6),M4(p.x,p.y/2,p.z),0xf2f2f0,'m');if(q%3==0)lt.push(p.x,p.y+1.5,p.z)}
const car=new T.InstancedMesh(merge([[BOXG,M4(0,1.1,0,0,2.4,1.4,3.6),0xf7b733]]),vm({roughness:.4}),5);car.frustumCulled=false;G.add(car);
/* carousel, drop tower */const cr=new T.Group();cr.position.set(-70,0,-140);G.add(cr);cr.add(new T.Mesh(merge([[new T.CylinderGeometry(14,14,1.5,24),M4(0,.75,0),0xf2e6d0],[new T.ConeGeometry(16,7,24),M4(0,10.5,0),0xe84a5f],[new T.CylinderGeometry(1,1,7,8),M4(0,5,0),0xf7b733]].concat([...Array(12)].map((_,q)=>[BOXG,M4(Math.cos(q*.52)*10,3,Math.sin(q*.52)*10,0,1.2,2,2.4),0xf2f2f0]))),wm));
B.add(new T.CylinderGeometry(2.2,2.8,78,12),M4(170,39,90),0xd9d9d6,'s');const dr=new T.Mesh(new T.CylinderGeometry(6,6,3,16),vm({color:0x4abdac}));dr.position.set(170,10,90);G.add(dr);B.flush(G);
const lp2=lt.map((v,i)=>i%3===0?v+ap.x:i%3===1?v+g:v+ap.z);nightLights(lp2,0xffc4e0,10,0,1);
let cu=0,cv2=6;const D=new T.Object3D(),q0=new T.Vector3();TICKS.push(dt=>{if(hyp(cam.position.x-ap.x,cam.position.z-ap.z)>14000)return;wh.rotation.z+=dt*.05;for(let q=0;q<NC;q++){const a=q/NC*2*PI+wh.rotation.z;D.position.set(WX_+Math.cos(a)*RW,HY+Math.sin(a)*RW,WZ);D.rotation.set(0,0,0);D.updateMatrix();cab.setMatrixAt(q,D.matrix)}cab.instanceMatrix.needsUpdate=true;
const p=cv_.getPointAt(cu);cv2=Math.sqrt(Math.max(0,2*9.81*(54-p.y)))*.62+4;cu=(cu+cv2*dt/CL)%1;for(let q=0;q<5;q++){const u=(cu-q*4/CL+1)%1,a=cv_.getPointAt(u),b=cv_.getPointAt((u+.002)%1);D.position.copy(a);D.lookAt(b);D.updateMatrix();car.setMatrixAt(q,D.matrix)}car.instanceMatrix.needsUpdate=true;
cr.rotation.y+=dt*.6;dr.position.y=8+35*(1-Math.abs(Math.sin(tt*.25)))**3+30*Math.max(0,Math.sin(tt*.25))});addBld(ap.x+WX_,ap.z+WZ,40,g+HY+RW);LMARKS.push({x:ap.x,z:ap.z,n:ap.name,i:'park'})}

/* ================= Namsan Tower ================= */
{const tw=LM_.tower,g=gMax(tw.x,tw.z,20),B=new SB(),x=tw.x,z=tw.z;flat(x,z,60,90,g);B.box(46,12,46,x,g-1,z,0xe3e1da,'w');B.add(new T.CylinderGeometry(4.2,6.5,150,18),M4(x,g+75,z),0xe9e7e2,'m');B.add(new T.CylinderGeometry(15,12,6,24),M4(x,g+122,z),0xe9e7e2,'m');B.add(new T.CylinderGeometry(15.5,15.5,9,24),M4(x,g+130,z),0x24384a,'g');B.add(new T.CylinderGeometry(13,15.5,4,24),M4(x,g+136.5,z),0xe9e7e2,'m');
for(let q=0;q<8;q++)B.add(new T.CylinderGeometry(1.6-q*.13,1.7-q*.13,11,8),M4(x,g+144+q*11,z),q%2?0xf4f4f2:0xd23a2a,'m');B.flush(S);blink([x,g+233,z,x,g+141,z],0xff2a1a,24,1.4,.5);nightLights([x,g+128,z],0xfff0c8,50,0,.8);addBld(x,z,16,g+235);LMARKS.push({x,z,n:tw.name,i:'tower'})}

/* ================= Hanbit Central Station ================= */
{const st=LM_.station,R=RAILNET.find(r=>r.type==='main');let bi=0,bd=1e9;for(let i=0;i<R.n;i++){const d=hyp(R.X[i]-st.x,R.Z[i]-st.z);if(d<bd){bd=d;bi=i}}const[tx,tz]=tang(R,bi),ry=Math.atan2(tx,tz),x=R.X[bi],z=R.Z[bi],y=R.Y[bi],B=new SB(),nx=-tz,nz=tx;
B.add(archGeo(300,64,20),M4(x,y+13,z,ry),0xb9c3cc,'r');for(let k=-140;k<=140;k+=20)for(const s of[1,-1])B.box(1.2,13,1.2,x+tx*k+nx*s*31,y,z+tz*k+nz*s*31,0x8a8f95,'m',ry);
const hx=x+nx*70,hz=z+nz*70,hg=HM(hx,hz);B.box(150,26,46,hx,hg-1,hz,0x9fb2c2,'c',ry);B.add(archGeo(150,46,9).rotateY(PI/2),M4(hx,hg+25,hz,ry+PI/2),0xdfe4e8,'s');B.box(40,40,40,hx+tx*95,hg-1,hz+tz*95,0xd8d1c2,'w',ry);
B.add(PLG,M4(x+nx*120,hg+.2,z+nz*120,ry,60,1,200),0xb7b1a5,'d');B.flush(S);addBld(hx,hz,75,hg+34);LMARKS.push({x,z,n:st.name,i:'station'})}

/* ================= East Coast Power Station ================= */
{const pp=LM_.powerPlant,g0=Math.max(4,HM(pp.x,pp.z)),x=pp.x,z=pp.z,B=new SB();flat(x,z,560,200,g0);const sea=HM(x+900,z)<HM(x-900,z)?1:-1;
B.box(240,42,70,x+sea*40,g0-1,z,0xd1d4d2,'w');for(let q=-1;q<=1;q++)B.box(55,74,55,x+sea*40+q*80,g0-1,z-70,0xbfc3c4,'m');B.box(90,16,40,x-sea*120,g0-1,z+110,0xd7d0c2,'w');
const cm=stripeMat('#f4f4f2','#c8302a',10),red=[];for(const q of[-1,1]){const cx=x+sea*40+q*55,cz=z-150;B.add(new T.CylinderGeometry(4.5,8,150,16),M4(cx,g0+75,cz),0xdcdad4,'m');const top=new T.Mesh(new T.CylinderGeometry(4.5,4.8,52,16),cm);top.position.set(cx,g0+176,cz);S.add(top);red.push(cx,g0+204,cz);addBld(cx,cz,9,g0+202)}
const ctg=new T.LatheGeometry([[52,0],[44,30],[35,72],[36,96],[39,112]].map(p=>new T.Vector2(p[0],p[1])),40),stp=[];for(const q of[-1,1]){const cx=x-sea*180,cz=z+q*130;B.add(ctg,M4(cx,g0-1,cz),0xd7d4cc,'r');addBld(cx,cz,50,g0+112);stp.push([cx,g0+112,cz])}
for(let q=0;q<5;q++)B.add(new T.ConeGeometry(36,18,14),M4(x-sea*20+q*60-120,g0+8,z+220),0x202224,'m');for(let i=-3;i<=3;i++)for(let j=0;j<3;j++){B.box(8,7,6,x+i*26,g0-1,z+300+j*24,0x9aa0a4,'s');B.box(.5,18,.5,x+i*26+10,g0-1,z+300+j*24,0x8f969c)}
beam(B,x+sea*180,g0+2,z+40,x+sea*620,4,z+40,14,3,0x9c9a92);B.flush(S);blink(red,0xff2a1a,26,1.6);
let sT=0;TICKS.push(dt=>{if((sT+=dt)<.2)return;sT=0;if(hyp(cam.position.x-x,cam.position.z-z)>26000)return;for(const s of stp)SMK.emit(s[0]+(rnd()-.5)*40,s[1]+5,s[2]+(rnd()-.5)*40,(rnd()-.5)*2,5+rnd()*3,(rnd()-.5)*2,90,40,90,.45)});LMARKS.push({x,z,n:pp.name,i:'power'})}

/* ================= industrial zones, convention centre ================= */
for(const iz of LM_.industry){const R_=RNG(iz.x|0),TB=new TSB(4000,30000);for(let q=0;q<iz.r*iz.r/9000;q++){const a=R_()*2*PI,d=Math.sqrt(R_())*iz.r,x=iz.x+Math.cos(a)*d,z=iz.z+Math.sin(a)*d,w=40+R_()*90,dd=30+R_()*60,ry=Math.round(R_()*2)*PI/2+.21;if(!canBuild(x,z,Math.max(w,dd)*.55,0,true))continue;const B=TB.at(x,z),s=R_();
if(s<.12){for(let k=0;k<3;k++){const cx=x+k*26-26;B.add(new T.CylinderGeometry(11,11,18,20),M4(cx,HM(cx,z)+8,z),0xe8e8e4,'s')}addBld(x,z,40,HM(x,z)+18);continue}
const top=bld(R_()<.5?'x':'h',x,z,w,dd,9+R_()*10,ry,[0xd5d3cc,0xb9bec4,0x9aa3ab,0xc9c0ae,0x8fa1b3][R_()*5|0]);if(R_()<.35)for(let k=0;k<5;k++)B.add(PRISM,M4(x+(k-2)*w/5*Math.cos(ry),top,z-(k-2)*w/5*Math.sin(ry),ry+PI/2,dd*.95,3,w/5.2),0x7d8590,'m');
if(R_()<.15){B.add(new T.CylinderGeometry(1.6,2.4,45,10),M4(x+w*.3,HM(x,z)+22,z),0xc9c6bc,'m');addBld(x+w*.3,z,3,HM(x,z)+45)}}TB.flush(S);LMARKS.push({x:iz.x,z:iz.z,n:iz.name,i:'industry'})}
{const c=LM_.convention,g=HM(c.x,c.z),B=new SB();flat(c.x,c.z,160,90,g);B.box(230,12,120,c.x,g-1,c.z,0x8aa4b8,'c',-.21);B.add(archGeo(240,130,20),M4(c.x,g+11,c.z,-.21),0xe6eaee,'r');B.add(PLG,M4(c.x+60,g+.25,c.z+110,-.21,200,1,70),0xbab4a8,'d');B.flush(S);addBld(c.x,c.z,120,g+32);BLDS.push(c.x,c.z,230,120,-.21)}

/* ================= island harbour (Seomdo) ================= */
{const is=WLD.islands.find(i=>i.name==='Seomdo'),fe=LM_.ferry[LM_.ferry.length-1];let x=fe[0],z=fe[1];for(let q=0;q<200;q++){if(HM(x,z)>1)break;x+=(is.x-x)*.02;z+=(is.z-z)*.02}
const dx=fe[0]-x,dz=fe[1]-z,l=hyp(dx,dz)||1,ux=dx/l,uz=dz/l,B=new SB();beam(B,x-ux*10,2.6,z-uz*10,x+ux*160,2.6,z+uz*160,12,6,0xa9a69c);for(let k=-6;k<=6;k++){const a=k*.13,r=240;const bx=x+(ux*Math.cos(a)-uz*Math.sin(a))*r,bz=z+(uz*Math.cos(a)+ux*Math.sin(a))*r;if(Math.abs(k)>1)B.box(30,7,9,bx,-3,bz,0xb4b2aa,'m',Math.atan2(ux,uz)+a+PI/2)}B.flush(S);
for(let q=0;q<5;q++){const o={g:ship(q%2?'boat':'tug',0),fixed:1,big:0};const px=x+ux*(40+q*24)+uz*(q%2?16:-16),pz=z+uz*(40+q*24)-ux*(q%2?16:-16);o.x=px;o.z=pz;o.g.position.set(px,0,pz);o.g.rotation.y=Math.atan2(ux,uz)+PI/2;SHIPS.push(o)}}
LMARKS.push({x:LM_.wind.pts[2][0],z:LM_.wind.pts[2][1],n:LM_.wind.name,i:'wind'},{x:LM_.solar.x,z:LM_.solar.z,n:LM_.solar.name,i:'solar'});

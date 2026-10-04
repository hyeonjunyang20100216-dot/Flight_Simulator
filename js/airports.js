/* ============================================================
   airports.js — the four major airports.
   Each airport is built in its own frame (runways along local z, landing toward -z),
   then rotated to its real heading.
   Runways: tiled asphalt / concrete surfaces with rubber deposits, ICAO markings as
   crisp geometry (threshold bars, designators, centreline, aiming point, touchdown
   zone, side stripes), edge / centreline / touchdown / threshold lights, approach
   lights on both ends, PAPI both ends, REIL strobes, ILS localizer + glideslope,
   distance-remaining signs.
   Airfield: named taxiways with lead-on lines, holding points with stop bars,
   runway guard lights and lit signs, stands with numbers and ground equipment,
   service roads, fire stations, perimeter road, navaids, weather station.
   Exposes AP (runtime airport list) and apAt(x,z,m).
   ============================================================ */
LOADMSG('Building airports…');
const RWM=[];
/* ---------- shared surface textures (tiled, so they stay sharp at any distance) ---------- */
const ASPH=tex(cv(512,512,(x,w,h)=>{const r=RNG(31);x.fillStyle='#404146';x.fillRect(0,0,w,h);
for(let k=0;k<26000;k++){const v=r();x.fillStyle=`rgba(${38+v*72|0},${38+v*72|0},${42+v*72|0},${.22+r()*.3})`;x.fillRect(r()*w,r()*h,1+r()*1.4,1+r()*1.4)}
for(let k=0;k<10;k++){x.fillStyle=`rgba(0,0,0,${.015+r()*.025})`;x.beginPath();x.ellipse(r()*w,r()*h,30+r()*90,20+r()*60,r()*3,0,7);x.fill()}
x.strokeStyle='rgba(14,14,16,.4)';x.lineWidth=1.2;for(let k=0;k<10;k++){x.beginPath();let px=r()*w,py=r()*h;x.moveTo(px,py);for(let s=0;s<6;s++){px+=(r()-.5)*44;py+=(r()-.5)*44;x.lineTo(px,py)}x.stroke()}
for(let k=0;k<4;k++){x.fillStyle='rgba(22,22,24,.4)';x.fillRect(r()*w,r()*h,24+r()*70,2+r()*3)}}),1);
const CONC=tex(cv(512,512,(x,w,h)=>{const r=RNG(32);for(let i=0;i<2;i++)for(let j=0;j<2;j++){const v=128+r()*16|0;x.fillStyle=`rgb(${v},${v},${v-4})`;x.fillRect(i*256,j*256,256,256)}
for(let k=0;k<16000;k++){const v=r();x.fillStyle=`rgba(${90+v*80|0},${90+v*80|0},${88+v*80|0},.25)`;x.fillRect(r()*w,r()*h,1+r()*1.4,1+r()*1.4)}
for(let k=0;k<20;k++){x.fillStyle=`rgba(40,38,34,${.04+r()*.06})`;x.beginPath();x.ellipse(r()*w,r()*h,8+r()*40,5+r()*30,r()*3,0,7);x.fill()}
x.fillStyle='rgba(24,24,24,.75)';for(const p of[0,256]){x.fillRect(p,0,3,h);x.fillRect(0,p,w,3)}}),1);
/* rubber deposits in the touchdown zones: dark streaks along the main gear tracks */
const RUBT=tex(cv(128,1024,(x,w,h)=>{const r=RNG(33);for(let k=0;k<1100;k++){const cx=w/2+(r()<.5?-1:1)*(w*.16+r()*w*.18)+(r()-.5)*10,y=r()*h;x.fillStyle=`rgba(10,10,11,${.05+r()*.12})`;x.fillRect(cx,y,2+r()*5,20+r()*160)}
for(let k=0;k<260;k++){x.fillStyle=`rgba(10,10,11,${.03+r()*.05})`;x.fillRect(w/2-w*.4+r()*w*.8,r()*h,3+r()*8,30+r()*120)}
const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.18,'rgba(0,0,0,1)');g.addColorStop(.5,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');x.globalCompositeOperation='destination-in';x.fillStyle=g;x.fillRect(0,0,w,h)}));
/* designator glyphs: 0-9, L, R, C */
const NUMT=tex(cv(1024,128,x=>{const G='0123456789LRC';x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';for(let i=0;i<G.length;i++){x.save();x.translate(i*64+32,67);x.scale(.56,1);x.font='bold 122px Arial,Helvetica,sans-serif';x.fillText(G[i],0,0);x.restore()}}));
const GLI=c=>'0123456789LRC'.indexOf(c);
const MKM=pullify(new T.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:0}),.07,.0007),
NUMM=pullify(new T.MeshStandardMaterial({map:NUMT,alphaTest:.5,roughness:.7,color:0xf0f0ec}),.08,.0008),
RUBM=pullify(new T.MeshStandardMaterial({map:RUBT,transparent:true,depthWrite:false,roughness:.55}),.05,.0005);
const MW=[.93,.93,.9],MY=[.86,.66,.1],MR_=[.72,.16,.12];
const WSM=new T.MeshStandardMaterial({map:tex(cv(8,64,x=>{for(let i=0;i<5;i++){x.fillStyle=i%2?'#f4f4f4':'#ff5a14';x.fillRect(0,i*12.8,8,12.8)}})),side:T.DoubleSide,roughness:.8}),WSG=new T.ConeGeometry(.8,5,12,1,true).rotateZ(PI/2).translate(-2.5,0,0);
/* fillet: pavement filling the inside corner of two perpendicular pavement edges, legs along +x and +z from the corner */
const FILG=(()=>{const s=new T.Shape();s.moveTo(0,0);s.lineTo(1,0);s.absarc(1,1,1,-PI/2,PI,true);s.lineTo(0,0);return new T.ShapeGeometry(s,6).rotateX(-PI/2)})();
/* ground support equipment and airfield fixtures */
const GSEG={tug:merge([[BOXG,M4(0,.6,0,0,2.5,.9,4.4)],[BOXG,M4(0,1.35,-1.1,0,2.1,.7,1.3),0x1d2733]]),
belt:merge([[BOXG,M4(0,.7,0,0,2.2,.9,6)],[BOXG,M4(0,1.4,-2.2,0,2,1,1.4),0x1d2733],[BOXG,MR(0,2.4,.6,0,-.36,1.1,.25,8.2),0x23252a]]),
dolly:merge([[BOXG,M4(0,.75,0,0,1.6,1.1,2.4)],[BOXG,M4(0,1.35,-.6,0,1.3,.6,1),0x1d2733]].concat([3.6,6.6,9.6].flatMap(z=>[[BOXG,M4(0,.55,z,0,1.5,.3,2.4),0x55595e],[BOXG,M4(0,1.35,z,0,1.45,1.4,2.3),0x9aa3ab]]))),
fuel:merge([[BOXG,M4(0,1.4,-4,0,2.5,2.4,2.2)],[BOXG,M4(0,1.8,-4.6,0,2.3,.6,.3),0x232a32],[new T.CylinderGeometry(1.25,1.25,7.6,14).rotateX(PI/2),M4(0,2,1.2),0xeeeeee],[BOXG,M4(0,.7,0,0,2.4,.5,10),0x33363b]]),
bus:merge([[BOXG,M4(0,1.75,0,0,2.8,2.9,12)],[BOXG,M4(0,2.2,0,0,2.84,1.1,11),0x1b2530]]),
fire:merge([[BOXG,M4(0,1.9,.8,0,3,2.8,8.4)],[BOXG,M4(0,1.6,-4.4,0,2.9,2.2,2.2)],[BOXG,M4(0,2.1,-5.5,0,2.7,.8,.2),0x1b2530],[BOXG,M4(0,3.45,-1,0,.8,.4,2.4),0xd8dadc]]),
cater:merge([[BOXG,M4(0,1.3,-3,0,2.4,2,2)],[BOXG,M4(0,3.2,1.2,0,2.4,2.4,5.6),0xf2f2f0],[BOXG,M4(0,1.4,1.2,0,.3,1.8,.3),0x777777]])};
const GSEM=vm({roughness:.5,metalness:.25}),FIXG=new T.CylinderGeometry(.12,.16,.42,6).translate(0,.21,0),FIXM=vm({roughness:.4,metalness:.5});
const AP=[];
function buildAirport(cfg,idx){const F=apFrame(cfg),R_=RNG(WLD.seed+idx*101),G=new T.Group();G.position.set(cfg.x,cfg.el,cfg.z);G.rotation.y=F.ry;S.add(G);
const a={cfg,i:idx,n:cfg.name,short:cfg.short,code:cfg.id,x:cfg.x,z:cfg.z,el:cfg.el,hdg:cfg.hdg,ry:F.ry,toL:F.toL,toW:F.toW,runways:cfg.runways,box:cfg.box,slots:[],gaSlots:[],fxSlots:[],papis:[],rabs:[],reils:[],guards:[],desc:cfg.desc,style:cfg.style,G};
const B=new SB(),pts=[],col=[],YL=0xd6b324,WH=0xffffff,AS=0x47484c,MK={P:[],U:[],C:[],I:[]},NU={P:[],U:[],I:[]},RB={P:[],U:[],I:[]},SGN=[],GS={},FIX=[],guard=[],reil=[];
const bx=(w,h,d,x,z,c,k='m',y=0,ry=0)=>B.box(w,h,d,x,y,z,c,k,ry),fl=(x0,z0,x1,z1,w,c,y=.1,k='d',u=40)=>B.strip(x0,z0,x1,z1,w,y,c,k,u),
cy=(rt,rb,h,x,y,z,c,k='m',n=16)=>B.add(new T.CylinderGeometry(rt,rb,h,n),M4(x,y+h/2,z),c,k),pl=(x,y,z,c)=>{pts.push(x,y,z);col.push(...c)},
gy=(lx,lz)=>{const[wx,wz]=F.toW(lx,lz);return Math.max(HM(wx,wz),SEA)-cfg.el},gse=(t,x,z,ry,c=0xf3c622)=>(GS[t]||(GS[t]=[])).push(x,z,ry,c);
/* painted markings: flat quads (rotation ang about y), designator glyphs, vertical glyph faces */
const quad=(A,cx,y,cz,w,l,ang,c,uv)=>{const cs=Math.cos(ang),sn=Math.sin(ang),b=A.P.length/3;for(const[u,v]of[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){const lx=u*w,lz=v*l;A.P.push(cx+lx*cs+lz*sn,y,cz-lx*sn+lz*cs);A.U.push(uv?lp(uv[0],uv[2],u+.5):u+.5,uv?lp(uv[1],uv[3],v+.5):v+.5);if(A.C)A.C.push(...c)}A.I.push(b,b+2,b+1,b,b+3,b+2)};
const mk=(x0,z0,x1,z1,w,c=MW)=>{const l=Math.hypot(x1-x0,z1-z0);quad(MK,(x0+x1)/2,.11,(z0+z1)/2,w,l,Math.atan2(x1-x0,z1-z0),c)};
const dash=(x0,z0,x1,z1,w,c=MW,on=4,off=4)=>{const l=Math.hypot(x1-x0,z1-z0),ux=(x1-x0)/l,uz=(z1-z0)/l;for(let s=0;s<l;s+=on+off){const e=Math.min(l,s+on);mk(x0+ux*s,z0+uz*s,x0+ux*e,z0+uz*e,w,c)}};
const glyph=(A,cx,y,cz,w,h,rx,rz,ux,uz,gi)=>{const b=A.P.length/3,u0=gi/16+.002,u1=(gi+1)/16-.002;for(const[p,q]of[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){A.P.push(cx+rx*p*w+ux*q*h,y,cz+rz*p*w+uz*q*h);A.U.push(lp(u0,u1,p+.5),q+.5)}A.I.push(b,b+1,b+2,b,b+2,b+3)};
const text=(A,s,cx,y,cz,h,rx,rz,ux,uz)=>{const w=h*.5,gap=h*.06,tot=s.length*w+(s.length-1)*gap;[...s].forEach((c,i)=>{const o=-tot/2+w/2+i*(w+gap);glyph(A,cx+rx*o,y,cz+rz*o,w,h,rx,rz,ux,uz,GLI(c))})};
const vq=(A,cx,cy,cz,w,h,rx,rz,u0,v0,u1,v1)=>{const b=A.P.length/3;for(const[p,q]of[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){A.P.push(cx+rx*p*w,cy+q*h,cz+rz*p*w);A.U.push(lp(u0,u1,p+.5),lp(v0,v1,q+.5))}A.I.push(b,b+1,b+2,b,b+2,b+3)};
const vtext=(A,s,cx,cy,cz,h,rx,rz)=>{const w=h*.55,tot=s.length*w;[...s].forEach((c,i)=>{const o=-tot/2+w/2+i*w,gi=GLI(c);vq(A,cx+rx*o,cy,cz+rz*o,w,h,rx,rz,gi/16+.002,0,(gi+1)/16-.002,1)})};
/* lit airfield sign: panels [[style,text]...], face normal (nx,nz); styles m mandatory, l location, d direction */
const sign=(x,z,nx,nz,panels)=>SGN.push({x,z,nx,nz,panels});
const arch=(len,w,rise,x,y,z,c,ax=0,k='r',caps=0)=>{const g=archGeo(len,w,rise);if(ax)g.rotateY(PI/2);B.add(g,M4(x,y,z),c,k);
if(caps){const r=(w*w/4+rise*rise)/(2*rise),ha=Math.asin(w/2/r),ps=[];for(let j=0;j<=16;j++){const t=-ha+2*ha*j/16;ps.push(new T.Vector2(r*Math.sin(t),r*Math.cos(t)-r*Math.cos(ha)))}const sg=new T.ShapeGeometry(new T.Shape(ps));for(const e of[1,-1]){const m=new T.Matrix4().makeRotationY(e>0?0:PI).setPosition(0,0,e*len/2);if(ax)m.premultiply(new T.Matrix4().makeRotationY(PI/2));B.add(sg,m.premultiply(M4(x,y,z)),c,'m')}}};
/* taxiway strip with blue edge lights and green centre lights */
const twy=(x0,z0,x1,z1,w=23,lights=1)=>{fl(x0,z0,x1,z1,w,WH,.06,'t',44);if(!lights)return;const l=Math.hypot(x1-x0,z1-z0),ux=(x1-x0)/l,uz=(z1-z0)/l;for(let s=0;s<=l;s+=60){pl(x0+ux*s-uz*(w/2+1),.4,z0+uz*s+ux*(w/2+1),BLU);pl(x0+ux*s+uz*(w/2+1),.4,z0+uz*s-ux*(w/2+1),BLU)}for(let s=15;s<l;s+=30)pl(x0+ux*s,.3,z0+uz*s,GR2)};
const fillet=(x,z,sx,sz,r=28)=>B.add(FILG,new T.Matrix4().compose(new T.Vector3(x,.058,z),new T.Quaternion(),new T.Vector3(sx*r,1,-sz*r)),AS,'d');
const curveLine=(cx,cz,r,a0,a1,c=MY)=>{const n=8;for(let i=0;i<n;i++){const t0=a0+(a1-a0)*i/n,t1=a0+(a1-a0)*(i+1)/n;mk(cx+Math.cos(t0)*r,cz+Math.sin(t0)*r,cx+Math.cos(t1)*r,cz+Math.sin(t1)*r,.35,c)}};
/* holding position marking (two solid + two dashed yellow lines) */
const hold=(x0,z0,x1,z1,s=34)=>{const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz),ux=dx/l,uz=dz/l,px=-uz,pz=ux;for(let j=0;j<4;j++){const cx=x0+ux*(s+j*.9),cz=z0+uz*(s+j*.9);if(j<2)mk(cx-px*11,cz-pz*11,cx+px*11,cz+pz*11,.3,MY);else for(let m=-11;m<11;m+=2.6)mk(cx+px*m,cz+pz*m,cx+px*(m+1.4),cz+pz*(m+1.4),.3,MY)}};
/* taxiway names: parallels get letters, connectors get letter+number */
const TXL=new Map(),TXN={};const txName=tx=>{if(!TXL.has(tx))TXL.set(tx,'ABCDEFGH'[TXL.size]);const L=TXL.get(tx);TXN[L]=(TXN[L]||0)+1;return L+TXN[L]};
const rwyOf=rx=>{let b=cfg.runways[0],bd=1e9;for(const r of cfg.runways){const d=Math.abs(r.x-rx);if(d<bd){bd=d;b=r}}return b};
/* perpendicular connector from a runway edge to a parallel taxiway at station z: fillets, lead-on lines, holding point, stop bar, guard lights, signs */
const conn=(rx,W,tx,z)=>{const sd=Math.sign(tx-rx),x0=rx+sd*(W/2-2),x1=tx,nm=txName(tx),L=nm[0],rw=rwyOf(rx);twy(x0,z,x1,z,23);for(const e of[1,-1]){fillet(x1-sd*11.5,z+e*11.5,-sd,e);fillet(x0+sd*2,z+e*11.5,sd,e,22)}
const hs=Math.min(64,Math.abs(tx-rx)-W/2-30);hold(x0,z,x1,z,hs);const hx=x0+sd*hs;
for(let q=-9;q<=9;q+=3)pl(hx-sd*.5,.25,z+q,RD);for(const e of[1,-1])guard.push(hx+sd*1.5,.9,z+e*13.5);
const R=32;curveLine(rx+sd*R,z-R,R,PI/2,sd>0?PI:0);curveLine(rx+sd*R,z+R,R,-PI/2,sd>0?PI:0);mk(rx+sd*R,z,x0+sd*2,z,.35,MY);
sign(hx+sd*3,z+sd*16,sd,0,[['m',rw.num[0]+'-'+rw.num[1]],['l',nm]]);sign(tx+sd*19,z-sd*15,0,-sd,[['l',L],['d',nm]])};
const jb=(x0,z0,x1,z1,c=0xc9ced4)=>{const dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz),ry=Math.atan2(dx,dz),cs=Math.cos(ry),sn=Math.sin(ry);cy(2.4,2.4,6,x0,0,z0,0xb7bcc3,'s');bx(3.4,3,l,(x0+x1)/2,(z0+z1)/2,c,'s',3.8,ry);bx(4.4,3.4,3.6,x1,z1,0x2a3644,'g',3.6,ry);
const lx=x0+dx*.78,lz=z0+dz*.78;bx(.4,3.8,.4,lx-cs*1.2,lz+sn*1.2,0x55595e);bx(.4,3.8,.4,lx+cs*1.2,lz-sn*1.2,0x55595e);bx(3.4,.8,1.4,lx,lz,0x2b2d30)};
/* parking stand: lead-in line, stop bar, safety box, stand number, ground equipment */
let standN=0;const stand=(x,z,ry,gear=1)=>{a.slots.push({x,z,ry});const fx=-Math.sin(ry),fz=-Math.cos(ry),rx_=-fz,rz_=fx;mk(x-fx*52,z-fz*52,x+fx*17,z+fz*17,.35,MY);mk(x+fx*17-fz*3,z+fz*17+fx*3,x+fx*17+fz*3,z+fz*17-fx*3,.6,MY);
for(const e of[1,-1])mk(x-fx*24+fz*e*24,z-fz*24-fx*e*24,x+fx*22+fz*e*24,z+fz*22-fx*e*24,.25,MR_);mk(x-fx*24+fz*24,z-fz*24-fx*24,x-fx*24-fz*24,z-fz*24+fx*24,.25,MR_);
standN++;text(NU,String(standN),x-fx*46,.12,z-fz*46,2.6,rx_,rz_,fx,fz);
if(gear){const r=R_();gse('tug',x+fx*25,z+fz*25,ry,r<.5?0xf3c622:0xf2f2f0);gse('belt',x+fx*8+rx_*4.5,z+fz*8+rz_*4.5,ry+.35,0xe8762a);if(r<.7)gse('dolly',x+rx_*13-fx*2,z+rz_*13-fz*2,ry+PI,0xf3c622);if(r>.55)gse('fuel',x+rx_*10+fx*3,z+rz_*10+fz*3,ry,0xdedede);if(r<.3)gse('cater',x-rx_*9+fx*12,z-rz_*9+fz*12,ry+PI/2,0xffffff)}};
const hangar=(x,z,w,d,h,c,ry=0)=>{const cs=Math.cos(ry),sn=Math.sin(ry),at=(ox,oz)=>[x+ox*cs+oz*sn,z-ox*sn+oz*cs],b=(W,Hh,D,ox,oz,cc,k='m',y=0)=>{const[px,pz]=at(ox,oz);B.add(BOXG,M4(px,y+Hh/2,pz,ry,W,Hh,D),cc,k)};
b(w,h,d,0,0,c);const ag=archGeo(w,d,Math.min(10,d*.14)).rotateY(PI/2);B.add(ag,M4(x,h,z,ry),0x9097a0,'s');b(.5,h*.9,d*.92,-(w/2+.2),0,0x737a82,'s');for(let k=0;k<9;k++)b(.7,h*.9,.3,-(w/2+.5),-d*.45+k*d*.9/8,0x5a6067);
const[ax0,az0]=at(-(w/2+40),0),[ax1,az1]=at(-(w/2+2),0);fl(ax0,az0,ax1,az1,d*.9,0xa6a6a2,.05,'a',40)};
const tanks=(x,z,n,r=14)=>{for(let j=0;j<n;j++){cy(r,r,16,x,0,z+j*(r*2+8),0xe8e8e4,'s',24);cy(r+.3,r-1,1.5,x,16,z+j*(r*2+8),0xc9c9c4,'s',24)}bx(r*2.6,1.2,n*(r*2+8)+12,x,z+(n-1)*(r+4),0x9a9a92)};
const mast=(x,z,h=30)=>{cy(.35,.5,h,x,0,z,0x8a8f95,'m',8);bx(4,1.2,1.2,x,z,0x50555b,'m',h);pl(x,h+1,z,WM);pl(x+2,h+1,z,WM);pl(x-2,h+1,z,WM);pool.push([x,z,70])};
const cars=[],pool=[],veh=[],carPark=(x0,z0,x1,z1,fill=.75)=>{fl((x0+x1)/2,z0,(x0+x1)/2,z1,Math.abs(x1-x0),0x55575b,.05,'d');for(let x=Math.min(x0,x1)+4;x<Math.max(x0,x1)-3;x+=14)for(let z=Math.min(z0,z1)+3;z<Math.max(z0,z1)-2;z+=5.5)if(R_()<fill)cars.push([x+(R_()-.5)*.4,z,(R_()<.5?0:PI)])};
const road=(x0,z0,x1,z1,w=12)=>fl(x0,z0,x1,z1,w,WH,.05,'o',30);
/* fire & rescue station: bays on the local -x face (after rotation ry), crash tenders outside */
const arff=(x,z,ry=0)=>{const cs=Math.cos(ry),sn=Math.sin(ry),at=(ox,oz)=>[x+ox*cs+oz*sn,z-ox*sn+oz*cs];bx(26,9,40,x,z,0xd8d4cc,'m',0,ry);bx(27,.8,41,x,z,0xb8322a,'m',9,ry);{const[tx_,tz_]=at(4,-24);bx(6,18,6,tx_,tz_,0xd8d4cc,'w',0,ry)}
for(let k=0;k<4;k++){const[dx_,dz_]=at(-13.2,-13.5+k*9);bx(.4,6.5,7,dx_,dz_,0x3a3f45,'m',0,ry);const[fx_,fz_]=at(-22,-13.5+k*9);if(k<3)gse('fire',fx_,fz_,ry+PI/2,0xc8261c)}
const[px_,pz_]=at(-30,0);fl(px_-cs*14,pz_+sn*14,px_+cs*14,pz_-sn*14,40,0xa6a6a2,.05,'a',40)};
/* ILS: localizer array beyond the far end, glideslope mast beside the touchdown zone */
const loc=(rx,z)=>{for(let k=-7;k<=7;k++){if(!k)continue;const x=rx+k*3;bx(.12,3.4,.12,x,z,0xd9dcdf);bx(.12,.12,2.4,x,z,0xd9dcdf,'m',3)}bx(42,.25,.25,rx,z,0x9aa0a6,'m',1.6);bx(4,3,3,rx+28,z,0xe8e4da);pl(rx+28,3.4,z,RD)};
const gs=(x,z)=>{bx(.5,15,.5,x,z,0xd23a2a);for(const h of[5,10,14.5])bx(1.4,.6,.3,x,z,0xf2f2f0,'m',h);bx(3.5,3,3,x+5,z,0xe8e4da);pl(x,15.3,z,RD)};
const vor=(x,z)=>{B.add(new T.CylinderGeometry(15,15,.4,24),M4(x,3.2,z),0xc8ccd0,'s');for(let k=0;k<12;k++){const t=k/12*2*PI;bx(.25,3.2,.25,x+Math.cos(t)*13,z+Math.sin(t)*13,0x9aa0a6)}B.add(new T.ConeGeometry(3.2,6,16),M4(x,6.4,z),0xf2f2f0,'m');cy(4,4,3.2,x,0,z,0xe8e4da)};
const wxs=(x,z)=>{bx(14,.1,14,x,z,0x9c9a92,'d');bx(.2,10,.2,x,z,0x9aa0a6);bx(1.6,.15,.15,x,z,0xdddddd,'m',10);for(const s of[1,-1]){bx(14,1.6,.06,x,z+s*7,0x9aa1a8);bx(.06,1.6,14,x+s*7,z,0x9aa1a8)}bx(1.2,1.4,.8,x+3,z+3,0xe8e4da)};
/* ---------- runways ---------- */
const kind={hub:'asphalt',coast:'concrete',mountain:'asphalt',regional:'old',military:'concrete',island:'asphalt'}[cfg.style];
for(const rw of cfg.runways){const{x:rx,z:rz,L,W}=rw,con=kind==='concrete',ts=con?15:40;
const rg=new T.PlaneGeometry(W,L).rotateX(-PI/2),uv=rg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*W/ts,uv.getY(i)*L/ts);
const rm=pullify(new T.MeshStandardMaterial({map:con?CONC:ASPH,color:kind==='old'?0xc4c0b8:con?0x9a9a96:0xffffff,roughness:con?.8:.85}),.02,.0002);RWM.push(rm);const r=new T.Mesh(rg,rm);r.position.set(rx,.08,rz);r.receiveShadow=true;G.add(r);
/* shoulders, blast pads with chevrons */
for(const s of[1,-1])fl(rx+s*(W/2+4),rz-L/2,rx+s*(W/2+4),rz+L/2,8,con?0x5c5d5b:0x34353a,.075);
for(const e of[1,-1]){const ze=rz+e*L/2;fl(rx,ze,rx,ze+e*90,W,con?0x585956:0x323336,.05);for(let k=0;k<5;k++){const zc=ze+e*(10+k*16);for(const s of[1,-1])mk(rx,zc,rx+s*W*.45,zc+e*13,1.6,MY)}}
/* markings (ICAO): side stripes, threshold bars, designators, aiming point, touchdown zone, centreline */
for(const s of[1,-1])mk(rx+s*(W/2-1.4),rz-L/2+2,rx+s*(W/2-1.4),rz+L/2-2,.9);
const nk=W>=55?16:12,kw=1.8,gap=(W-6-nk*kw)/(nk+1);
for(const e of[1,-1]){const zt=rz+e*L/2,inz=-e,num=e>0?rw.num[0]:rw.num[1],digits=num.replace(/[LRC]/,''),letter=num.replace(/\d/g,'');
for(let k=0;k<nk;k++){const xo=-W/2+3+k*(kw+gap)+kw/2+(k>=nk/2?gap*2:0);mk(rx+xo,zt+inz*6,rx+xo,zt+inz*36,kw)}
const rgx=e>0?1:-1;let zz=46;if(letter){text(NU,letter,rx,.12,zt+inz*(zz+6.5),13,rgx,0,0,inz);zz+=16}text(NU,digits,rx,.12,zt+inz*(zz+6.5),13,rgx,0,0,inz);zz+=13;
for(const s of[1,-1])mk(rx+s*(W>=55?14:11),zt+inz*400,rx+s*(W>=55?14:11),zt+inz*460,W>=55?9:7);
[[150,3],[300,3],[600,2],[750,2],[900,1],[1050,1]].forEach(([m,n])=>{if(m+30>L/2)return;for(let b=0;b<n;b++)for(const s of[1,-1]){const xo=s*(W*.2+b*3.3+.9);mk(rx+xo,zt+inz*m,rx+xo,zt+inz*(m+22.5),1.8)}});
quad(RB,rx,.1,zt+inz*(130+430),W*.62,860,0,null,e>0?[0,0,1,1]:[0,1,1,0]);if(e<0)rw.cl0=zt+inz*(zz+12);else rw.cl1=zt+inz*(zz+12)}
for(let z=rw.cl0;z+30<rw.cl1;z+=50)mk(rx,z,rx,z+30,.9);
/* edge lights (yellow over the last 600 m of the primary direction), fixtures */
for(let z=-L/2;z<=L/2+.1;z+=60)for(const s of[1,-1]){const x=rx+s*(W/2+1.5),c=z<-L/2+600?[1,.78,.3]:WT;pl(x,.5,rz+z,c);FIX.push(x,rz+z)}
for(let x=-W/2;x<=W/2;x+=3){pl(rx+x,.45,rz+L/2,GR);pl(rx+x,.45,rz-L/2,RD)}for(const s of[1,-1])for(let k=1;k<=5;k++){pl(rx+s*(W/2+k*3),.45,rz+L/2,GR);pl(rx+s*(W/2+k*3),.45,rz-L/2,GR)}
for(let z=-L/2+30;z<L/2;z+=30)pl(rx,.35,rz+z,z<-L/2+300?RD:z<-L/2+900&&(z/30|0)%2?RD:WT);
for(let z=L/2-900;z<L/2-150;z+=60)for(const s of[-1,1])for(let q=0;q<3;q++)pl(rx+s*(4+q*1.5),.35,rz+z,WT);
/* approach lights: full ALS with sequenced flashers on the primary end (catwalk over water), short MALS on the reciprocal end */
const rab=[];for(let k=1;k<=30;k++){const z=rz+L/2+k*30,g=gy(rx,z),y=Math.max(g,0)+1.6;pl(rx,y,z,WT);pl(rx-1,y,z,WT);pl(rx+1,y,z,WT);if(k%10==0)for(let x=-15;x<=15;x+=3)pl(rx+x,y,z,WT);if(k<=10&&k%2==0)for(const s of[-1,1])pl(rx+s*5,y,z,k<=4?RD:WT);rab.push(rx,y+.5,z);
const pb=Math.min(g,0)-2;bx(.25,y-pb,.25,rx,z,0x888888,'m',pb);bx(k%10==0?32:6,.22,.22,rx,z,0x777777,'m',y-.2);if(g<-.5)bx(1.4,.35,30,rx,z-15,0x7c7f84,'m',y-.9)}
const rp=new T.Points(ptsGeo(rab,new Array(rab.length).fill(0)),new T.PointsMaterial({size:24,map:LMAP,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));G.add(rp);a.rabs.push(rp);
for(let k=1;k<=7;k++){const z=rz-L/2-k*60,g=gy(rx,z),y=Math.max(g,0)+1.2;for(let x=-2;x<=2;x++)pl(rx+x,y,z,WT);if(k==5)for(let x=-9;x<=9;x+=3)pl(rx+x,y,z,WT);bx(.25,y-Math.min(g,0)+2,.25,rx,z,0x888888,'m',Math.min(g,0)-2);bx(6,.2,.2,rx,z,0x777777,'m',y-.2)}
for(const s of[1,-1]){reil.push(rx+s*(W/2+12),.8,rz-L/2-5);bx(.6,.6,.6,rx+s*(W/2+12),rz-L/2-5,0x2a2a2a)}
/* PAPI on the left of each approach */
for(const e of[1,-1]){const zp=rz+e*(L/2-310),sx=e>0?-1:1,pp=[0,1,2,3].flatMap(j=>[rx+sx*(W/2+30+9*j),1.3,zp]);for(let j=0;j<4;j++)bx(1.6,1,2,rx+sx*(W/2+30+9*j),zp,0x2a2a2a);const pa=new T.Points(ptsGeo(pp,new Array(12).fill(1)),PM_(16));G.add(pa);a.papis.push({o:pa,rx,z:zp,e})}
/* ILS, windsocks, distance-remaining signs (on the side away from the parallel taxiway) */
loc(rx,rz-L/2-330);loc(rx,rz+L/2+290);gs(rx+(W/2+100),rz+L/2-330);gs(rx-(W/2+100),rz-L/2+330);
bx(.5,9,.5,rx+W/2+25,rz+L/2-300,0xdddddd);for(let j=0;j<8;j++)bx(.4,3,.4,rx+(j-3.5)*6,rz-L/2-280,0xdddddd);
const ss=rx<0?-1:cfg.runways.length>1?1:-1,ft=L*3.281;for(let d=1000;d<ft-300;d+=1000){const z=rz-L/2+d/3.281,fwd=Math.round((ft-d)/1000),back=Math.round(d/1000),sx=rx+ss*(W/2+26);
bx(2.6,1.7,.5,sx,z,0x15171a,'m',.35);bx(.15,.35,.15,sx-.9,z,0x777777);bx(.15,.35,.15,sx+.9,z,0x777777);vtext(NU,String(fwd),sx,1.2,z+.27,1.2,1,0);vtext(NU,String(back),sx,1.2,z-.27,1.2,-1,0)}}
const R0=cfg.runways[0];a.ws=new T.Mesh(WSG,WSM);a.ws.position.set(R0.x+R0.W/2+25,8.6,R0.z+R0.L/2-300);a.ws.castShadow=true;G.add(a.ws);
/* ---------- style-specific layout ---------- */
const ctx={a,B,bx,fl,cy,pl,arch,twy,conn,hold,jb,stand,hangar,tanks,mast,carPark,road,fillet,curveLine,R_,YL,WH,AS,cars,veh,mk,dash,sign,arff,vor,wxs,gse};
({hub:hubLayout,coast:coastLayout,mountain:mountainLayout,regional:regionalLayout,military:militaryLayout,island:islandLayout})[cfg.style](ctx);
/* perimeter service road and fence */
{const b=cfg.box,f=[b[0]-60,b[1]+60,b[2]-80,b[3]+80],r=[f[0]+14,f[1]-14,f[2]+14,f[3]-14];for(const z of[r[2],r[3]])road(r[0],z,r[1],z,7);for(const x of[r[0],r[1]])road(x,r[2],x,r[3],7);
for(const z of[f[2],f[3]])bx(f[1]-f[0],2.4,.12,(f[0]+f[1])/2,z,0x9aa1a8);for(const x of[f[0],f[1]])bx(.12,2.4,f[3]-f[2],x,(f[2]+f[3])/2,0x9aa1a8);for(let x=f[0];x<=f[1];x+=40){bx(.15,2.8,.15,x,f[2],0x777b80);bx(.15,2.8,.15,x,f[3],0x777b80)}}
/* lit signs: one atlas holding every panel used at this airport */
if(SGN.length){const uniq=new Map();for(const s of SGN)for(const[st,t]of s.panels)uniq.set(st+t,[st,t]);const cel={},pw=t=>Math.round(64*(.55+.4*t.length)/.9);let px=0,py=0;
const at=cv(1024,512,x=>{x.textAlign='center';x.textBaseline='middle';x.font='bold 44px Arial,Helvetica,sans-serif';for(const[k,[st,t]]of uniq){const w=pw(t);if(px+w>1024){px=0;py+=64}
x.fillStyle=st==='m'?'#c8102e':st==='d'?'#f0c419':'#111214';x.fillRect(px,py,w,64);if(st==='l'){x.strokeStyle='#f0c419';x.lineWidth=4;x.strokeRect(px+5,py+5,w-10,54)}x.fillStyle=st==='m'?'#fff':st==='d'?'#111':'#f0c419';x.fillText(t,px+w/2,py+34);cel[k]=[px,py,w];px+=w}});
const tx_=tex(at),sm_=new T.MeshStandardMaterial({map:tx_,emissiveMap:tx_,emissive:0xffffff,emissiveIntensity:0,roughness:.6});LIGHTS.push(ns=>{sm_.emissiveIntensity=ns*.65});const A={P:[],U:[],I:[]};
for(const s of SGN){const ws=s.panels.map(([,t])=>.55+.4*t.length),Wt=ws.reduce((p,q)=>p+q,0),rx_=s.nz,rz_=-s.nx,ry=Math.atan2(s.nx,s.nz);bx(Wt+.2,1.15,.32,s.x,s.z,0x2a2c30,'m',.3,ry);for(const o of[-1,1])bx(.12,.3,.12,s.x+rx_*o*Wt*.35,s.z+rz_*o*Wt*.35,0x6a6e73);
for(const fc of[1,-1]){let o=-Wt/2;const list=s.panels.map((p,i)=>[p,ws[i]]);if(fc<0)list.reverse();for(const[[st,t],w]of list){const c=cel[st+t],cx=o+w/2;o+=w;
vq(A,s.x+rx_*cx*fc+s.nx*.17*fc,.87,s.z+rz_*cx*fc+s.nz*.17*fc,w,.9,rx_*fc,rz_*fc,c[0]/1024,1-(c[1]+64)/512,(c[0]+c[2])/1024,1-c[1]/512)}}}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(A.P,3));g.setAttribute('uv',new T.Float32BufferAttribute(A.U,2));g.setIndex(A.I);g.computeVertexNormals();G.add(new T.Mesh(g,sm_))}
B.flush(G);
/* markings, designators, rubber, distance signs */
for(const[A,M_]of[[MK,MKM],[NU,NUMM],[RB,RUBM]]){if(!A.I.length)continue;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(A.P,3));g.setAttribute('uv',new T.Float32BufferAttribute(A.U,2));if(A.C)g.setAttribute('color',new T.Float32BufferAttribute(A.C,3));g.setIndex(A.I);g.computeVertexNormals();const m=new T.Mesh(g,M_);m.receiveShadow=true;m.renderOrder=M_===RUBM?1:0;G.add(m)}
/* ground support equipment, older generic service vehicles, light fixtures, cars */
{const d=new T.Object3D(),c=new T.Color();for(const t in GS){const L=GS[t],n=L.length/4,im=new T.InstancedMesh(GSEG[t],GSEM,n);for(let i=0;i<n;i++){d.position.set(L[i*4],0,L[i*4+1]);d.rotation.set(0,L[i*4+2],0);d.updateMatrix();im.setMatrixAt(i,d.matrix);im.setColorAt(i,c.setHex(L[i*4+3]))}im.castShadow=true;im.receiveShadow=true;G.add(im);fitIS(im)}
if(veh.length){const vh=new T.InstancedMesh(VEHG.clone(),vm({roughness:.5,metalness:.2}),veh.length);veh.forEach((v,i)=>{d.position.set(v[0],0,v[1]);d.rotation.set(0,v[2],0);d.updateMatrix();vh.setMatrixAt(i,d.matrix);vh.setColorAt(i,c.set(v[3]||0xf3c622))});vh.castShadow=true;G.add(vh);fitIS(vh)}
if(FIX.length){const fm=new T.InstancedMesh(FIXG,FIXM,FIX.length/2);for(let i=0;i<FIX.length/2;i++){d.position.set(FIX[i*2],0,FIX[i*2+1]);d.rotation.set(0,0,0);d.updateMatrix();fm.setMatrixAt(i,d.matrix)}G.add(fm);fitIS(fm)}}
if(cars.length){const cm=new T.InstancedMesh(CARG.clone(),vm({roughness:.35,metalness:.5}),cars.length),d=new T.Object3D(),c=new T.Color();cars.forEach((p,j)=>{d.position.set(p[0],0,p[1]);d.rotation.y=p[2];d.updateMatrix();cm.setMatrixAt(j,d.matrix);cm.setColorAt(j,c.setHSL(R_(),.35,.25+R_()*.5))});G.add(cm);fitIS(cm)}
if(pool.length){const pq=pool.map(([x,z,r])=>[PLG,M4(x,.14,z,0,r,1,r)]);const pm=new T.Mesh(merge(pq),POOLM);pm.renderOrder=1;G.add(pm)}
G.add(new T.Points(ptsGeo(pts,col),LM));
/* flashing lights: runway guard lights (alternating yellow), REIL strobes */
if(guard.length){const p=new T.Points(ptsGeo(guard,new Array(guard.length).fill(0)),PM_(9));G.add(p);a.guards.push(p)}
if(reil.length){const p=new T.Points(ptsGeo(reil,new Array(reil.length).fill(0)),PM_(30));G.add(p);a.reils.push(p)}
a.gate=a.gate||{x:cfg.runways[0].x+150,z:0,ry:0};
G.updateMatrixWorld(true);return a}

/* ============ AIRPORT 01 — Hanbit International: twin parallel runways, twin-pier terminal + satellite ============ */
function hubLayout(c){const{a,B,bx,fl,cy,pl,arch,twy,conn,jb,stand,hangar,tanks,mast,carPark,road,R_,veh,mk,dash,sign,arff,vor,wxs,gse}=c;const[RL,RR]=a.runways;
for(const[rw,tx]of[[RL,-720],[RR,720]]){const z0=rw.z-rw.L/2-30,z1=rw.z+rw.L/2+30;twy(tx,Math.min(z0,-1980),tx,z1);for(const z of[-rw.L/2+30,-900,-250,450,1100,rw.L/2-30])conn(rw.x,rw.W,tx,rw.z+z);
const sd=Math.sign(tx-rw.x);for(const z of[-560,-1260]){twy(rw.x+sd*(rw.W/2-2),rw.z+z+300,tx,rw.z+z,23);mk(rw.x,rw.z+z+380,rw.x+sd*(rw.W/2-2),rw.z+z+300,.35,MY);sign(rw.x+sd*(rw.W/2+14),rw.z+z+340,sd,0,[['l',sd>0?'R':'P'],['d','EXIT']])}
/* holding bays beside both runway entries */
for(const e of[1,-1]){const ze=rw.z+e*(rw.L/2-30)-e*70;fl(tx-sd*40,ze-40,tx-sd*40,ze+40,46,0xffffff,.055,'t',44);mk(tx-sd*40,ze-38,tx-sd*40,ze+38,.35,MY)}}
twy(-720,-1980,720,-1980);twy(-720,-1300,720,-1300);twy(-720,-640,720,-640);
fl(0,-1240,0,830,1300,0xa6a6a2,.05,'a',40);for(const x of[-610,610,-380,380])mk(x,-1240,x,820,.35,MY);mk(-620,-920,620,-920,.35,MY);
/* main terminal: departure hall under a long double-curved roof, glass airside face, landside canopy */
bx(880,6,150,0,915,0xcdd2d7);bx(860,13,140,0,915,0x1f2f3c,'g',6);for(let x=-420;x<=420;x+=30){bx(.9,13,.9,x,844,0xd9dde2,'m',6);bx(.9,13,.9,x,986,0xd9dde2,'m',6)}
arch(900,190,16,0,19,915,0xeef1f4,1);bx(900,.6,190,0,915,0xa9b0b8,'m',18.6);bx(700,1,26,0,1012,0xe5e8eb,'m',11);for(let x=-330;x<=330;x+=40)bx(.8,11,.8,x,1020,0xd9dde2);
arch(220,90,10,0,32,915,0xe3e7ea,1);bx(210,13,86,0,915,0x24384a,'g',19);
/* elevated departures roadway with ramps */
bx(760,1.2,24,0,1036,0x9a9a96,'m',7.6);fl(-380,1036,380,1036,20,0xffffff,8.85,'o',30);for(let x=-360;x<=360;x+=40)bx(1.6,7.6,1.6,x,1036,0xb4b2ab);for(const s of[1,-1])B.add(BOXG,MR(s*470,4.3,1036,PI/2,-Math.atan2(-8.6,180)*s,24,1,182),0x8e8e8a,'m');
/* piers with jet bridges on both sides, apron service roads */
for(const px of[-300,300]){bx(52,4,640,px,520,0xd5d8dc);bx(48,8,630,px,520,0x22323f,'g',4);arch(646,52,7,px,12,520,0xe8ecef,0);bx(54,.4,646,px,520,0xa9b0b8,'m',11.8);cy(30,30,13,px,0,190,0x22323f,'g',28);cy(32,32,1.2,px,13,190,0xe8ecef,'m',28);
for(const s of[1,-1])for(const o of[30,38])dash(px+s*o,820,px+s*o,240,.3);
for(let z=760;z>=260;z-=72)for(const sd of[-1,1]){const gx=px+sd*26;jb(gx,z,px+sd*44,z-6);stand(px+sd*66,z+12,sd>0?PI/2:-PI/2);pl(px+sd*30,15,z,WM)}}
for(let k=0;k<6;k++)gse('bus',-140+k*14,820,0,0x2f6fb0);
/* satellite concourse */
bx(800,4,64,0,-530,0xd5d8dc);bx(790,9,58,0,-530,0x22323f,'g',4);arch(810,70,8,0,13,-530,0xeef1f4,1);for(const s of[1,-1])dash(-400,-530+s*36,400,-530+s*36,.3);
for(let x=-350;x<=350;x+=78)for(const sd of[-1,1]){jb(x,-530+sd*31,x-6,-530+sd*48);stand(x-4,-530+sd*67,sd>0?0:PI);pl(x,16,-530+sd*36,WM)}
/* cargo village with ULD rows, maintenance base, engine run-up pad with blast fence */
for(const x of[-330,0,330])bx(220,24,130,x,-1450,0xc4b79a,'w');for(const x of[-420,-210,0,210,420])stand(x,-1345,0);
for(let k=0;k<40;k++){const x=-500+R_()*1000,z=-1392+R_()*14;bx(3.1,1.6,2.4,x,z,[0xb9bec4,0x9aa3ab,0x8a8f95][k%3])}
hangar(-420,-1770,110,150,32,0xc9ccd0,PI/2);hangar(-160,-1770,110,150,32,0xc9ccd0,PI/2);hangar(150,-1770,90,110,26,0xb8bec4,PI/2);hangar(380,-1770,90,110,26,0xb8bec4,PI/2);
fl(600,-1700,600,-1560,120,0xa6a6a2,.05,'a',40);for(let k=0;k<8;k++)B.add(BOXG,MR(600-48+k*13.7,3.2,-1500,0,-.35,13,6.5,.3),0x8a8f95,'m');mk(560,-1700,640,-1700,.35,MY);
/* tower, ops, hotel, parking garages, fuel farm, fire stations, landside roads */
cy(5,7,108,0,0,1230,0xe2e4e7,'m',24);cy(9,6,4,0,104,1230,0xdfe1e4,'m',24);cy(11,8.5,8,0,108,1230,0x1b2a36,'g',24);cy(12,12,1.4,0,116,1230,0xeceef0,'m',24);cy(.2,.2,12,0,117.4,1230,0x9a9a9a,'m',6);a.beacon=[0,130,1230];
for(const x of[-230,230]){bx(200,24,160,x,1180,0xb8b9b4);for(const y of[6,12,18])bx(200.4,1.2,160.4,x,1180,0x55575b,'m',y)}
bx(70,82,36,0,1380,0x9fb8cc,'w');bx(72,3,38,0,1380,0xdde3e8,'m',82);bx(110,18,60,460,1260,0xcdd1d6,'w');bx(120,16,70,-460,1260,0xc4c8cc,'w');
tanks(-600,1420,4);arff(-520,-60,PI);arff(560,40,0);
road(0,1040,0,2400,22);road(-440,1050,440,1050,26);for(const x of[-430,430])road(x,1050,x,1600,12);road(-430,1600,430,1600,12);carPark(-640,1450,-460,1640,.8);carPark(300,1450,420,1640,.8);carPark(-400,1250,-330,1640,.7);
for(let z=-1200;z<=800;z+=160){mast(-650,z);mast(650,z)}for(let x=-560;x<=560;x+=160)mast(x,-1270);
cy(.5,1.4,22,640,0,1800,0x8a8f95);a.radar=[640,23,1800];vor(-1150,1700);wxs(1000,-200);
for(let k=0;k<14;k++)veh.push([-500+k*72,-1320+(R_()-.5)*20,R_()*6,[0xf3c622,0xffffff,0xe8762a][k%3]]);
a.parkN=18;a.gate={x:0,z:120,ry:0}}

/* ============ AIRPORT 02 — Blue Coast International: wave-roof terminal, single runway approached over the sea ============ */
function coastLayout(c){const{a,B,bx,fl,cy,pl,arch,twy,conn,jb,stand,hangar,mast,carPark,road,R_,veh,mk,dash,sign,arff,vor,wxs,gse}=c;const RW=a.runways[0],tx=200;
twy(tx,-1630,tx,1630);for(const z of[-1570,-750,-80,620,1570])conn(RW.x,RW.W,tx,z);twy(RW.W/2-2,-200,tx,-520,23);twy(RW.W/2-2,500,tx,180,23);
for(const e of[1,-1])fl(tx+40,e*1500-40,tx+40,e*1500+40,46,0xffffff,.055,'t',44);
fl(410,-760,410,560,300,0xa6a6a2,.05,'a',40);mk(270,-740,270,540,.35,MY);dash(545,-560,545,360,.3);dash(553,-560,553,360,.3);
/* wave roof: alternating arches over a long glass hall */
bx(110,5,940,660,-110,0xe2ddd2);bx(104,10,930,660,-110,0x22495a,'g',5);[-460,-230,0,230].forEach((z,i)=>arch(232,118,i%2?9:14,660,15,z+5,0xf4f4f0,0));bx(118,.5,940,660,-110,0xb9c0c4,'m',14.8);
/* linear pier with eight gates */
bx(40,4,880,585,-110,0xe2ddd2);bx(36,7,870,585,-110,0x22495a,'g',4);arch(880,42,5,585,11,-110,0xf4f4f0,0);
for(let z=-470;z<=300;z+=110){jb(565,z,544,z+4,0xdfe3e6);stand(524,z+12,-PI/2);pl(560,14,z,WM)}
/* cargo apron and shed */
fl(400,700,400,980,240,0xa6a6a2,.05,'a',40);bx(70,16,160,560,840,0xc4b79a,'w');stand(420,760,-PI/2);stand(420,900,-PI/2);
/* tower with a tilted glass cab */
cy(3.4,5,62,760,0,-720,0xf4f4f2,'m',20);cy(8.5,5.6,7,760,62,-720,0x1d3442,'g',20);cy(9.6,9,1.3,760,69,-720,0xf4f4f2,'m',20);bx(1,8,1,760,-720,0xbbbbbb,'m',70);a.beacon=[760,80,-720];
hangar(430,1120,110,100,24,0xb3c2c8);arff(380,-1000,PI/2);
road(760,-600,760,500,22);road(760,0,1000,0,18);carPark(800,-560,940,-200,.75);carPark(800,180,940,460,.7);bx(80,10,140,860,-20,0xd7d3c9,'w');
for(let z=-700;z<=500;z+=150)mast(275,z);vor(-320,1900);wxs(320,1320);
for(let k=0;k<6;k++)veh.push([300+R_()*120,-700+k*200,R_()*6]);for(let k=0;k<3;k++)gse('bus',480,-650+k*15,PI/2,0x2fa35a);
a.parkN=6;a.gate={x:tx,z:-30,ry:0}}

/* ============ AIRPORT 03 — White Mountain: valley floor runway, turn pads, de-icing pad, chalet terminal ============ */
function mountainLayout(c){const{a,B,bx,fl,cy,pl,twy,conn,jb,stand,hangar,mast,carPark,road,R_,AS,veh,mk,dash,sign,arff,wxs,gse}=c;const RW=a.runways[0],tx=180;
twy(tx,-700,tx,1380);conn(RW.x,RW.W,tx,-700);conn(RW.x,RW.W,tx,1380);conn(RW.x,RW.W,tx,350);
for(const e of[1,-1])B.fan(RW.x,.06,RW.z+e*(RW.L/2-35),46,0,2*PI,AS,'d');
fl(350,-560,350,140,220,0xa6a6a2,.05,'a',40);mk(250,-540,250,120,.35,MY);
/* de-icing pad with two boom trucks */
fl(tx+70,1180,tx+70,1330,110,0xa6a6a2,.055,'a',40);mk(tx+70,1185,tx+70,1325,.35,MY);for(const s of[1,-1]){const x=tx+70+s*28;gse('fuel',x,1255,0,0xe8762a);B.add(BOXG,MR(x,6.5,1252,0,-.9,.6,.6,9),0xe8762a,'m');bx(2,1.5,2,x,1248,0xe8762a,'m',10)}
sign(tx+40,1160,0,-1,[['l','D'],['d','DEICE']]);
/* chalet terminal: stone base, timber upper floor, three steep gables */
bx(64,6,470,505,-210,0x8c8478);bx(60,6,460,505,-210,0x7a5236,'w',6);for(const z of[-380,-210,-40])B.add(PRISM,M4(505,12,z,0,70,13,150),0x3b2c22,'m');bx(30,10,40,560,60,0x8c8478);B.add(PRISM,M4(560,10,60,PI/2,44,9,34),0x3b2c22,'m');
for(const z of[-380,-230,-80]){jb(472,z,450,z+4,0xb9b2a5);stand(430,z+12,-PI/2);pl(470,12,z,WM)}stand(320,90,-PI/2);stand(320,-640,-PI/2);dash(470,-470,470,40,.3);
/* GA parking for light aircraft */
for(let k=0;k<6;k++)a.gaSlots.push({x:300,z:-520+k*16,ry:PI/2});
/* stone tower */
bx(12,30,12,560,180,0x8c8478);cy(8,6,6,560,30,180,0x1b2a36,'g',8);B.add(new T.ConeGeometry(9,6,4),M4(560,39,180,PI/4),0x3b2c22,'m');a.beacon=[560,46,180];
hangar(330,420,100,90,20,0x9aa08d);hangar(330,560,90,80,18,0x9aa08d);bx(40,8,26,330,700,0x8a7f6e);bx(41,.6,27,330,700,0x3b2c22,'m',8);arff(330,-780,PI/2);
road(620,-500,620,300,14);road(620,0,820,0,14);carPark(660,-460,760,-160,.65);wxs(-220,-900);
for(let z=-540;z<=120;z+=160)mast(255,z,24);for(let k=0;k<4;k++)veh.push([300+R_()*80,-500+k*160,R_()*6]);
a.parkN=3;a.gate={x:tx,z:-200,ry:PI}}

/* ============ AIRPORT 04 — Greenfield Regional: compact terminal, walk-out stands, GA apron and hangars ============ */
function regionalLayout(c){const{a,B,bx,fl,cy,pl,twy,conn,stand,hangar,mast,carPark,road,R_,AS,veh,mk,sign,arff,wxs}=c;const RW=a.runways[0],tx=150;
twy(tx,-1330,tx,1330);for(const z of[-1270,0,1270])conn(RW.x,RW.W,tx,z);for(const e of[1,-1])B.fan(RW.x,.06,RW.z+e*(RW.L/2-35),42,0,2*PI,AS,'d');
fl(280,-260,280,260,170,0xa6a6a2,.05,'a',40);
/* low brick terminal with a flat floating canopy */
bx(46,7,240,400,0,0xa5634a,'w');bx(44,.5,236,400,0,0x2a3a48,'g',7);bx(66,1,270,395,0,0xf2f2ee,'m',8.4);for(let z=-120;z<=120;z+=40)bx(.5,8.4,.5,368,z,0xdddddd);
for(const z of[-150,0,150]){stand(300,z,-PI/2);for(let k=0;k<3;k++)mk(372,z-4+k*4,330,z-4+k*4,.4,MW)}
/* GA apron: tie-down rows of light aircraft, self-serve fuel */
fl(235,300,235,650,140,0xa6a6a2,.05,'a',40);for(let k=0;k<10;k++){a.gaSlots.push({x:205,z:330+k*30,ry:PI/2});mk(186,330+k*30-14,224,330+k*30-14,.25,MW)}
bx(5,3,3,280,304,0xd8d4cc);bx(.6,1.6,.6,276,310,0xc8261c);sign(176,300,0,-1,[['l','G'],['d','GA']]);
/* small tower on the airside corner */
bx(6,18,6,420,-200,0xe9e6e0);cy(5,4,4,420,18,-200,0x1b2a36,'g',8);bx(11,.8,11,420,-200,0xf2f2ee,'m',22);a.beacon=[420,28,-200];
/* general aviation: T-hangar row and a workshop, flying school */
for(let k=0;k<6;k++)hangar(340,330+k*42,60,36,8,0xc8ccc4);hangar(340,660,70,60,12,0xb5bbb0);bx(30,7,18,440,540,0xe7e2d6,'w');arff(330,-420,PI/2);
road(470,-300,470,300,12);road(470,0,660,0,12);carPark(500,-200,600,180,.55);for(let z=-220;z<=220;z+=110)mast(215,z,20);wxs(-200,700);
veh.push([330,-200,1.2,0xf3c622],[330,200,.4,0xffffff],[345,60,2,0xe8762a]);
a.parkN=2;a.gate={x:tx,z:60,ry:PI}}

/* ============ AIRPORT 05 — Hanbit Air Base: fighter base, hardened shelters, alert pads, munitions igloos ============ */
function militaryLayout(c){const{a,B,bx,fl,cy,pl,arch,twy,conn,stand,hangar,tanks,mast,carPark,road,R_,AS,veh,mk,dash,sign,arff,wxs,gse}=c;const RW=a.runways[0],tx=210,APC=0xa6a6a2;a.parkN=0;
twy(tx,-1480,tx,1480);for(const z of[-1420,-560,560,1420])conn(RW.x,RW.W,tx,z);
/* arresting cables across both ends with yellow marker discs */
for(const e of[1,-1]){const z=e*(RW.L/2-420);mk(-RW.W/2,z,RW.W/2,z,.25,[.1,.1,.1]);for(const s of[1,-1]){B.fan(s*(RW.W/2-3),.12,z,1.6,0,2*PI,0xd6b324,'d');bx(1.2,.8,2,s*(RW.W/2+6),z,0x3a3f45)}}
/* flight line: apron with a row of parked fighters */
fl(360,-470,360,470,230,APC,.05,'a',40);mk(255,-460,255,460,.35,MY);
for(let k=0;k<9;k++){const z=-400+k*100;a.fxSlots.push({x:330,z,ry:PI/2});mk(330,z,268,z,.3,MY);mk(352,z-8,352,z+8,.4,MY);if(k%2)gse('tug',305,z+7,PI/2,0x5a6b4a);if(k%3==0)gse('fuel',395,z,0,0x5a6b4a)}
/* two loops of hardened aircraft shelters */
for(const zc of[-1050,1050]){twy(tx,zc-170,560,zc-170,20,0);twy(tx,zc+170,560,zc+170,20,0);twy(560,zc-170,560,zc+170,20,0);
for(let k=0;k<3;k++){const z=zc-130+k*130,x=660;fl(x-60,z,x-24,z,30,APC,.055,'a',40);arch(40,26,11,x,0,z,0x8f8f88,1,'r',1);bx(1.2,9,24,x-20.5,z,0x4a4f55);bx(40,1.4,30,x,z,0x7d7d76,'m',0);
mk(x-60,z,x-20,z,.3,MY);if(k!==1)a.fxSlots.push({x:x-44,z,ry:PI/2})}}
/* quick-reaction alert pads beside the runway 09 threshold */
for(const s of[0,1]){const z=1300+s*110;fl(330,z,420,z,70,APC,.055,'a',40);arch(30,22,8,440,0,z,0x9a9a92,1,'r',1);a.fxSlots.push({x:350,z,ry:PI/2})}twy(tx,1300,330,1300,18,0);twy(tx,1410,330,1410,18,0);
/* control tower, squadron buildings, hangars, HQ, barracks */
bx(12,22,12,480,-620,0xb9b5aa);bx(16,4,16,480,-620,0x1b2a36,'g',22);bx(18,.8,18,480,-620,0x8a8f80,'m',26);a.beacon=[480,32,-620];
for(const z of[-760,-880])bx(60,10,40,520,z,0xa3a08f,'w');hangar(560,640,90,80,24,0x8f9488,0);hangar(560,760,90,80,24,0x8f9488,0);
for(let k=0;k<5;k++)bx(70,12,18,820,-460+k*60,0xc9c3b4,'w');bx(80,16,40,820,-120,0xb4ae9e,'w');
/* fuel depot, munitions igloos (earth covered) in the far corner, fire station */
tanks(780,240,3,12);for(let k=0;k<6;k++){const z=-1450+k*60;arch(26,14,6,830,0,z,0x5d7a45,1,'r',1);bx(1,6,14,816.5,z,0x8f8f88)}arff(470,180,PI/2);
/* radar, ILS already on the runway, guard towers at the corners */
cy(.6,1.6,20,860,0,1300,0x6d7368);a.radar=[860,21,1300];for(const[x,z]of[[-280,-1580],[-280,1580],[900,-1580],[900,1580]]){bx(1,9,1,x,z,0x6d6a60);bx(4,3,4,x,z,0x8a8577,'m',9)}
road(900,-900,900,700,10);road(620,0,920,0,10);carPark(700,-1000,780,-850,.6);for(let z=-420;z<=420;z+=140)mast(250,z,20);wxs(-200,-1200);
for(let k=0;k<6;k++)veh.push([380+R_()*60,-450+k*160,R_()*6,0x5a6b4a]);
a.gate={x:300,z:-455,ry:PI/2}}

/* ============ AIRPORT 06 — Seomdo Island: short strip, approaches over water, small terminal ============ */
function islandLayout(c){const{a,B,bx,fl,cy,pl,arch,twy,conn,stand,hangar,mast,carPark,road,R_,AS,veh,mk,dash,sign,arff,wxs,gse}=c;const RW=a.runways[0],tx=140,APC=0xa6a6a2;a.parkN=1;
twy(tx,-720,tx,330);conn(RW.x,RW.W,tx,-720);conn(RW.x,RW.W,tx,330);for(const e of[1,-1])B.fan(RW.x,.06,RW.z+e*(RW.L/2-35),40,0,2*PI,AS,'d');
fl(270,-460,270,180,200,APC,.05,'a',40);mk(180,-450,180,170,.35,MY);
/* terminal with a curved blue roof */
bx(40,7,170,410,-140,0xf2f2ee,'w');arch(176,48,6,410,7,-140,0x2f6fb0,0);bx(60,1,40,420,40,0xe8e4da,'w');stand(300,-260,-PI/2);
for(let k=0;k<5;k++)a.gaSlots.push({x:225,z:20+k*28,ry:PI/2});for(let k=0;k<2;k++)gse('bus',360,-40+k*15,PI/2,0x2fa35a);
bx(5,14,5,445,-260,0xe9e6e0);cy(4.2,3.4,3.5,445,14,-260,0x1b2a36,'g',8);a.beacon=[445,22,-260];
hangar(300,330,70,60,14,0xc3ccd2);arff(300,-560,PI/2);
/* rock revetments where the strip meets the sea */
for(const e of[1,-1])for(let k=0;k<14;k++){const x=-70+k*10+(R_()-.5)*4,z=e*(RW.L/2+150)+(R_()-.5)*8;bx(6+R_()*3,3+R_()*2,5+R_()*3,x,z,0x8d8a84,'m',-2,R_()*3)}
road(520,-300,520,200,10);road(470,0,540,0,10);carPark(470,-260,510,-60,.6);for(let z=-420;z<=120;z+=135)mast(190,z,18);wxs(-160,800);
a.gate={x:tx,z:-100,ry:PI}}

WLD.airports.forEach((cfg,i)=>AP.push(buildAirport(cfg,i)));
/* tower beacons (green/white), radar */
const APBEA=AP.map(a=>{if(!a.beacon)return null;const[x,y,z]=a.beacon,p=new T.Points(ptsGeo([x,y,z],[1,1,1]),new T.PointsMaterial({size:26,map:LMAP,color:0x88ff99,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));a.G.add(p);return p});
AP.forEach(a=>{if(!a.radar)return;const[x,y,z]=a.radar,g=new T.Group();g.position.set(x,y,z);const rb=new T.Mesh(new T.BoxGeometry(11,2.4,.5),mat(0xdfe2e5,.5,.3));rb.position.z=.6;rb.rotation.x=-.25;rb.castShadow=true;g.add(rb);a.G.add(g);a.rad=g});
function apAt(x,z,m=0){for(let i=0;i<AP.length;i++){const a=AP[i],[lx,lz]=a.toL(x,z),b=a.box;if(lx>b[0]+m&&lx<b[1]-m&&lz>b[2]+m&&lz<b[3]-m)return i}return -1}
/* airports occupy their ground: no trees, no buildings */
for(const a of AP){const b=a.box;gridRect(a.x-6000,a.z-6000,a.x+6000,a.z+6000,(k,x,z)=>{const[lx,lz]=a.toL(x,z);if(lx>b[0]-250&&lx<b[1]+250&&lz>b[2]-400&&lz<b[3]+400)TBLK[k]=2})}
/* per-frame: PAPI colours, approach strobes, REIL, guard lights, beacons, windsocks, radar */
TICKS.push((dt,ns)=>{const wv=windV(),ws=Math.hypot(wv.x,wv.z)||1,ph=Math.floor(tt*30)%30,rl=(tt%1)<.06||((tt+.12)%1)<.06,gd=Math.floor(tt*1.6)%2;
AP.forEach((a,i)=>{const[lx,lz]=a.toL(P.pos.x,P.pos.z);for(const pp of a.papis){const dz=(lz-pp.z)*pp.e,an=dz>50?Math.atan2(P.pos.y-a.el,dz)*57.3:9,c=pp.o.geometry.attributes.color;for(let k=0;k<4;k++){const w=an>2.5+k*.33;c.setXYZ(k,1,w?1:.2,w?.95:.15)}c.needsUpdate=true;pp.o.material.opacity=.5+.5*ns}
for(const rp of a.rabs){const rc=rp.geometry.attributes.color,n=rc.count,b=.35+.65*ns;for(let j=0;j<n;j++){const v=ph===n-1-j?b:0;rc.setXYZ(j,v,v,v)}rc.needsUpdate=true}
for(const r of a.reils){const c=r.geometry.attributes.color,v=rl?.4+.6*ns:0;for(let j=0;j<c.count;j++)c.setXYZ(j,v,v,v);c.needsUpdate=true}
for(const g of a.guards){const c=g.geometry.attributes.color,b=.35+.65*ns;for(let j=0;j<c.count;j++){const on=(j%2)===gd?b:0;c.setXYZ(j,on,on*.8,0)}c.needsUpdate=true}
if(APBEA[i])APBEA[i].material.color.setHex(tt%3<1.5?0x88ff99:0xffffff);
const wl=Math.atan2(wv.z/ws,-wv.x/ws)-a.ry;a.ws.rotation.set(0,wl+Math.sin(tt*3.1)*.06,(1-cl(ws/8,0,1))*.9);if(a.rad)a.rad.rotation.y+=dt*1.6})});

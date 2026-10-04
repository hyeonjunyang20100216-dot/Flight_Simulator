/* ============================================================
   infrastructure.js — highways, roads, rural lanes, railways, metro.
   Every route is densified from WORLD_LOCATIONS, given a smoothed vertical
   profile with a grade limit, and then classified point by point:
   on the ground (terrain is cut / filled to match), bridge (piers, deck,
   parapets — girder, truss or arched viaduct by type) or tunnel (portals).
   Roads cross railways and highways on overpasses; cloverleaf interchanges.
   Also: power lines, substations, stations, moving trains and traffic.
   Exposes ROADNET, RAILNET, TRAINS, CARS.
   ============================================================ */
LOADMSG('Laying highways, railways and bridges…');
const IR=RNG(WLD.seed+7),ROADNET=[],RAILNET=[],TRAINS=[];
/* w: width, g: max grade, cl: clearance over water, k: smoothing radius (points), span: pier spacing */
const RT={hw:{w:26,m:'hw',g:.05,cl:10,k:7,span:44,pc:0xa9a8a2},rd:{w:11,m:'rd',g:.08,cl:6.5,k:4,span:30,pc:0xa3a29c},ln:{w:6.5,m:'ln',g:.12,cl:3.5,k:2,span:20,pc:0x8b8f86},
ramp:{w:8,m:'rd',g:.09,cl:6,k:0,span:26,pc:0xa9a8a2},av:{w:17,m:'rd',g:.07,cl:7,k:3,span:32,pc:0xb0aea6,urban:1},st:{w:9,m:'st',g:.1,cl:5,k:1,span:24,pc:0xa3a29c,urban:1},
main:{w:10.5,m:'rail',g:.022,cl:8,k:10,span:30,tracks:[-2.45,2.45],pc:0xb3ab9c,rail:1},mountain:{w:5.6,m:'rail',g:.035,cl:8,k:8,span:26,tracks:[0],pc:0xa49b8a,rail:1},
freight:{w:5.6,m:'rail',g:.022,cl:8,k:8,span:30,tracks:[0],pc:0xa9a296,rail:1},metro:{w:9.4,m:'rail',g:.05,cl:0,k:6,span:32,tracks:[-2.2,2.2],elev:11,pc:0xc4c6c8,rail:1}};
const RMATS={hw:HWYM,rd:ROADM,st:ROADM,ln:RURM,rail:RAILM},RACC={},SKA={P:[],U:[],I:[],C:[]};for(const k in RMATS)RACC[k]={P:[],U:[],I:[]};
const IB=new TSB(10000,26000),PATHS=[],SLP=[];
/* river proximity (exact, against the densified river centre lines) */
const RVH=new Map(),RVC=250;for(const R of RIVERS)for(let i=0;i<R.n-1;i++){const k=bhk(Math.floor(R.d[i*2]/RVC),Math.floor(R.d[i*2+1]/RVC));let l=RVH.get(k);if(!l)RVH.set(k,l=[]);l.push(R,i)}
function riverHit(x,z){let bd=1e9,lv=-1e4;const ci=Math.floor(x/RVC),cj=Math.floor(z/RVC);for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){const l=RVH.get(bhk(ci+di,cj+dj));if(!l)continue;
for(let q=0;q<l.length;q+=2){const R=l[q],i=l[q+1],[d,t]=segD(x,z,R.d[i*2],R.d[i*2+1],R.d[i*2+2],R.d[i*2+3]),e=d-lp(R.W[i],R.W[i+1],t)/2;if(e<bd){bd=e;lv=lp(R.P[i],R.P[i+1],t)}}}return[bd,lv]}
/* hash of already-placed route points, for overpass detection */
const PH=new Map(),PHC=60;
function phAdd(p){for(let i=0;i<p.n;i+=1){const k=bhk(Math.floor(p.X[i]/PHC),Math.floor(p.Z[i]/PHC));let l=PH.get(k);if(!l)PH.set(k,l=[]);l.push(p,i)}}
function phNear(x,z,r){const out=[],ci=Math.floor(x/PHC),cj=Math.floor(z/PHC);for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){const l=PH.get(bhk(ci+di,cj+dj));if(!l)continue;for(let q=0;q<l.length;q+=2){const p=l[q],i=l[q+1],d=hyp(p.X[i]-x,p.Z[i]-z);if(d<r+p.t.w/2)out.push([p,i,d])}}return out}
const TG2=[0,0],tang=(p,i)=>{const a=i>0?i-1:0,b=i<p.n-1?i+1:p.n-1,tx=p.X[b]-p.X[a],tz=p.Z[b]-p.Z[a],l=Math.sqrt(tx*tx+tz*tz)||1;return[tx/l,tz/l]};
/* vertical profile: water clearance, smoothing, tunnel (lower) and bridge (raise) grade passes */
function profile(p,fixed){const{X,Z,S,n,t}=p,G=p.G,W=p.W,base=new Float32Array(n),Y=new Float32Array(n);
for(let i=0;i<n;i++)base[i]=W[i]>-1e3?W[i]+t.cl:G[i]+(t.elev||0)+(t.rail?.5:.25);
const k=t.k;for(let i=0;i<n;i++){if(fixed[i]!=null){Y[i]=fixed[i];continue}let s=0,c=0;for(let j=Math.max(0,i-k);j<=Math.min(n-1,i+k);j++){s+=base[j];c++}Y[i]=s/c}
const g=t.g,ok=i=>fixed[i]==null;
for(let i=1;i<n;i++)if(ok(i))Y[i]=Math.min(Y[i],Y[i-1]+g*(S[i]-S[i-1]));for(let i=n-2;i>=0;i--)if(ok(i))Y[i]=Math.min(Y[i],Y[i+1]+g*(S[i+1]-S[i]));
for(let i=0;i<n;i++){if(W[i]>-1e3)Y[i]=Math.max(Y[i],W[i]+t.cl);if(t.elev)Y[i]=Math.max(Y[i],G[i]+t.elev*.8)}
for(let i=1;i<n;i++)Y[i]=Math.max(Y[i],Y[i-1]-g*(S[i]-S[i-1]));for(let i=n-2;i>=0;i--)Y[i]=Math.max(Y[i],Y[i+1]-g*(S[i+1]-S[i]));return Y}
/* build a route: def {name,type,pts|xz,fixedFn,junction} */
function route(def){const t=RT[def.type],d=def.xz||densify(def.pts,20),n=d.length/2,X=new Float32Array(n),Z=new Float32Array(n),S=new Float32Array(n),G=new Float32Array(n),W=new Float32Array(n).fill(-1e4);
for(let i=0;i<n;i++){X[i]=d[i*2];Z[i]=d[i*2+1];if(i)S[i]=S[i-1]+hyp(X[i]-X[i-1],Z[i]-Z[i-1]);G[i]=HM(X[i],Z[i]);const w=waterAt(X[i],Z[i]);if(w>-1e3&&w>G[i]+.2)W[i]=w;const rh=riverHit(X[i],Z[i]);if(rh[0]<8)W[i]=Math.max(W[i],rh[1])}
const p={name:def.name,type:def.type,t,X,Z,S,G,W,n,L:S[n-1],def};const fixed=new Array(n).fill(null);if(def.fixedFn)for(let i=0;i<n;i++){const v=def.fixedFn(X[i],Z[i],i,n);if(v!=null)fixed[i]=v}
let Y=profile(p,fixed);
/* overpasses: where this route meets an earlier route at grade, lift it over */
if(!t.elev){let hit=0;for(let i=0;i<n;i++){if(fixed[i]!=null)continue;if(!def.junctionFree&&(S[i]<320||S[n-1]-S[i]<320))continue;const[tx,tz]=tang(p,i);
for(const[o,j]of phNear(X[i],Z[i],t.w/2+4)){if(o.t.elev||!(o.t.rail||o.type==='hw'||o.type==='ramp'||t.rail))continue;const[ox,oz]=tang(o,j);if(Math.abs(tx*ox+tz*oz)>.9)continue;const dy=Y[i]-o.Y[j];if(Math.abs(dy)<7.5&&!o.br[j]){fixed[i]=o.Y[j]+(t.rail?8.5:7.6);hit=1}}}if(hit)Y=profile(p,fixed)}
p.Y=Y;const br=new Uint8Array(n),tn=new Uint8Array(n);for(let i=0;i<n;i++){const dd=Y[i]-G[i];br[i]=W[i]>-1e3||dd>4.5||t.elev?1:0;tn[i]=dd<-13?1:0}
/* tunnels shorter than ~100 m become cuttings */
for(let i=0;i<n;){if(!tn[i]){i++;continue}let j=i;while(j<n&&tn[j])j++;if(S[Math.min(j,n-1)]-S[i]<100)for(let q=i;q<j;q++)tn[q]=0;i=j}
p.br=br;p.tn=tn;phAdd(p);PATHS.push(p);return p}

/* ---------- the network ---------- */
const CFG=WLD;
for(const r of CFG.rails)RAILNET.push(Object.assign(route({name:r.name,type:r.type,pts:r.pts}),{stations:r.stations||[]}));
const span=CFG.roads.find(r=>r.span).span;
const spanFn=(x,z)=>{const[a,b]=[span.from,span.to],[d,u]=segD(x,z,a[0],a[1],b[0],b[1]);if(d>140||u<=0||u>=1)return null;return span.deck+span.crown*(1-(2*u-1)**2)};
for(const r of CFG.roads.filter(r=>r.type==='hw'))ROADNET.push(route({name:r.name,type:'hw',pts:r.pts,fixedFn:r.span?spanFn:null}));
/* cloverleaf interchanges: a local road crosses over the highway, four loop ramps */
const INTER=[];
for(const ip of CFG.interchanges){let best=null,bd=1e9;for(const p of ROADNET)if(p.type==='hw')for(let i=0;i<p.n;i+=2){const d=hyp(p.X[i]-ip[0],p.Z[i]-ip[1]);if(d<bd){bd=d;best=[p,i]}}if(!best||bd>800)continue;
const[p,i]=best,[tx,tz]=tang(p,i),nx=-tz,nz=tx,cx=p.X[i],cz=p.Z[i],y0=p.Y[i];
const cr=route({name:'Interchange link',type:'rd',xz:densify([[cx-nx*1100,cz-nz*1100],[cx-nx*400,cz-nz*400],[cx,cz],[cx+nx*400,cz+nz*400],[cx+nx*1100,cz+nz*1100]],20),junctionFree:1});ROADNET.push(cr);
let ci=0,cd=1e9;for(let q=0;q<cr.n;q++){const d=hyp(cr.X[q]-cx,cr.Z[q]-cz);if(d<cd){cd=d;ci=q}}const yT=cr.Y[ci];
const Rr=95,off=Rr+21;for(const sa of[1,-1])for(const sb of[1,-1]){const ox=cx+tx*sa*off+nx*sb*off,oz=cz+tz*sa*off+nz*sb*off,th=-sb*PI/2,tc=sa>0?PI:0;let dl=tc-th;while(dl>PI)dl-=2*PI;while(dl<=-PI)dl+=2*PI;const lg=dl-Math.sign(dl)*2*PI,xz=[];
for(let q=0;q<=36;q++){const a=th+lg*q/36,c=Math.cos(a),s=Math.sin(a);xz.push(ox+Rr*(c*tx+s*nx),oz+Rr*(c*tz+s*nz))}
ROADNET.push(route({name:'Ramp',type:'ramp',xz,junctionFree:1,fixedFn:(x,z,q,n)=>lp(y0+.2,yT,sm(.08,.92,q/(n-1)))}))}INTER.push({x:cx,z:cz,tx,tz,y:y0})}
const DAM=WLD.landmarks.dam,DAMCREST=WLD.lakes.find(l=>l.reservoir).level+6,damFn=(x,z)=>{const[d,u]=segD(x,z,DAM.a[0],DAM.a[1],DAM.b[0],DAM.b[1]);return d<30&&u>0&&u<1?DAMCREST+.3:null};
for(const r of CFG.roads.filter(r=>r.type!=='hw'))ROADNET.push(route({name:r.name,type:'rd',pts:r.pts,fixedFn:r.name==='Dam Road'?damFn:null}));
/* airport access roads and village lanes join the nearest road */
function nearestRoad(x,z,types){let best=null,bd=1e9;for(const p of ROADNET){if(!types.includes(p.type))continue;for(let i=0;i<p.n;i+=3){if(p.br[i]||p.tn[i])continue;const d=hyp(p.X[i]-x,p.Z[i]-z);if(d<bd){bd=d;best=[p.X[i],p.Z[i]]}}}return[best,bd]}
for(const a of AP){const[ax,az]=a.toW(...a.cfg.access),[q,d]=nearestRoad(ax,az,['hw','rd']);if(!q||d>12000){/* no road nearby (island): a lane to the nearest village */let bv=null,bd=6000;for(const v of CFG.villages){const dv=Math.hypot(v.x-ax,v.z-az);if(dv<bd){bd=dv;bv=v}}if(bv){const[fx,fz]=a.toW(a.cfg.access[0]*1.05,a.cfg.access[1]);ROADNET.push(route({name:a.short+' access',type:'ln',pts:[[ax,az],[fx,fz],[(fx+bv.x)/2+120,(fz+bv.z)/2],[bv.x,bv.z]]}))}continue}const mx=(ax+q[0])/2+(IR()-.5)*d*.15,mz=(az+q[1])/2+(IR()-.5)*d*.15;
const[fx,fz]=a.toW(a.cfg.access[0]*1.04,a.cfg.access[1]*1.04);ROADNET.push(route({name:a.short+' access',type:'rd',pts:[[ax,az],[fx,fz],[mx,mz],q]}))}
for(const v of CFG.villages){const[q,d]=nearestRoad(v.x,v.z,['rd','hw']);if(!q||d<350||d>9000)continue;const mx=(v.x+q[0])/2+(IR()-.5)*d*.25,mz=(v.z+q[1])/2+(IR()-.5)*d*.25;ROADNET.push(route({name:'Lane',type:'ln',pts:[[v.x,v.z],[mx,mz],q]}))}

/* ---------- cut & fill: the terrain under ground-level routes is shaped to the road ---------- */
LOADMSG('Grading road beds…');
function gradeBeds(paths){const best=new Map();for(const p of paths){const hw=p.t.w/2;for(let i=0;i<p.n-1;i++){if(p.br[i]||p.tn[i])continue;const ax=p.X[i],az=p.Z[i],bx=p.X[i+1],bz=p.Z[i+1],R=hw+110;
gridRect(Math.min(ax,bx)-R,Math.min(az,bz)-R,Math.max(ax,bx)+R,Math.max(az,bz)+R,(k,x,z)=>{const[d,u]=segD(x,z,ax,az,bx,bz);if(d>R)return;const o=best.get(k);if(!o||d<o[0])best.set(k,[d,lp(p.Y[i],p.Y[i+1],u)-(p.t.rail?.55:.3),hw])})}}
for(const[k,[d,y,hw]]of best){if(TWAT[k]>-1e3||TAIR[k]>90)continue;const t=sm(hw+6,hw+105,d);THS[k]=lp(y,THS[k],t);if(d<hw+40)TBLK[k]=Math.max(TBLK[k],1)}
for(const p of paths)for(let i=0;i<p.n;i++)p.G[i]=HM(p.X[i],p.Z[i])}
gradeBeds(PATHS);
/* precise "is this spot on a route corridor" test (the 125 m grid is too coarse for buildings and trees) */
function nearRoute(x,z,m,urbanToo){const ci=Math.floor(x/PHC),cj=Math.floor(z/PHC),rr=Math.ceil((m+30)/PHC);for(let di=-rr;di<=rr;di++)for(let dj=-rr;dj<=rr;dj++){const l=PH.get(bhk(ci+di,cj+dj));if(!l)continue;
for(let q=0;q<l.length;q+=2){const o=l[q];if(!urbanToo&&o.t.urban)continue;const j=l[q+1],lim=o.t.w/2+m;let ax=o.X[j],az=o.Z[j];if(Math.abs(ax-x)>lim+25||Math.abs(az-z)>lim+25)continue;
if(j<o.n-1){const bx=o.X[j+1],bz=o.Z[j+1],dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1;let t=((x-ax)*dx+(z-az)*dz)/L2;t=t<0?0:t>1?1:t;ax+=dx*t;az+=dz*t}if((ax-x)*(ax-x)+(az-z)*(az-z)<lim*lim)return true}}return false}

/* ---------- surfaces, skirts, bridges, tunnels ---------- */
LOADMSG('Building bridges and tunnels…');
const SKIRTC=[.34,.36,.25];
function ribbon(A,p,off,w,u=30){const{X,Z,Y,S,br,tn,n}=p;let pv=0;
for(let i=0;i<n;i++){if(tn[i]){pv=0;continue}const[tx,tz]=tang(p,i),nx=-tz,nz=tx,cx=X[i]+nx*off,cz=Z[i]+nz*off,h=w/2,lx=cx+nx*h,lz=cz+nz*h,rx=cx-nx*h,rz=cz-nz*h;
let yl=Y[i],yr=Y[i];if(!br[i]){yl=Math.max(yl,HM(lx,lz)+.2);yr=Math.max(yr,HM(rx,rz)+.2)}const b=A.P.length/3;A.P.push(lx,yl,lz,rx,yr,rz);A.U.push(0,S[i]/u,1,S[i]/u);if(pv)A.I.push(b-2,b,b-1,b-1,b,b+1);pv=1}}
function skirts(p,w){const{X,Z,Y,br,tn,n}=p;for(const sd of[1,-1]){let pv=0;for(let i=0;i<n;i++){if(br[i]||tn[i]){pv=0;continue}const[tx,tz]=tang(p,i),nx=-tz*sd,nz=tx*sd,ix=X[i]+nx*w/2,iz=Z[i]+nz*w/2,iy=Math.max(Y[i],HM(ix,iz)+.2)-.04,ox=ix+nx*8,oz=iz+nz*8,oy=HM(ox,oz)-.5,b=SKA.P.length/3;
if(sd>0)SKA.P.push(ox,oy,oz,ix,iy,iz);else SKA.P.push(ix,iy,iz,ox,oy,oz);SKA.U.push(0,0,1,0);SKA.C.push(...SKIRTC,...SKIRTC);if(pv)SKA.I.push(b-2,b,b-1,b-1,b,b+1);pv=1}}}
const LAMPS=[];
function surfaces(paths){for(const p of paths){const t=p.t,A=RACC[t.m];if(t.tracks){for(const o of t.tracks)ribbon(A,p,o,4.7)}else ribbon(A,p,0,t.w);if(!t.elev&&!t.urban)skirts(p,t.w);
/* bridge runs */
for(let i=0;i<p.n;){if(!p.br[i]){i++;continue}let j=i;while(j<p.n&&p.br[j])j++;const i0=Math.max(0,i-1),i1=Math.min(p.n-1,j);bridge(p,i0,i1);i=j}
/* tunnel portals */
for(let i=1;i<p.n;i++)if(p.tn[i]!==p.tn[i-1]){const q=p.tn[i]?i-1:i,[tx,tz]=tang(p,q),B=IB.at(p.X[q],p.Z[q]),ry=Math.atan2(tx,tz),y=p.Y[q],x=p.X[q]+tx*(p.tn[i]?3:-3),z=p.Z[q]+tz*(p.tn[i]?3:-3);
B.box(t.w+10,10,3,x,y-1,z,0x9c9a92,'m',ry);B.box(t.w+1,7,3.4,x,y-.2,z,0x0b0b0c,'m',ry);B.add(archGeo(18,t.w+3,3),M4(x-tx*(p.tn[i]?-9:9),y+7,z-tz*(p.tn[i]?-9:9),ry),0x8e8c85,'r');addBld(x,z,t.w/2+5,y+9)}
/* street lights through towns, and median lights on urban highways */
if(!t.rail){const sp=t.m==='hw'?60:t.urban?75:45;let nxt=0;for(let i=0;i<p.n;i++){if(p.S[i]<nxt||p.tn[i])continue;nxt=p.S[i]+sp;const k=gIdx(p.X[i],p.Z[i]);if(k<0||TURB[k]<70)continue;const[tx,tz]=tang(p,i),nx=-tz,nz=tx,B=IB.at(p.X[i],p.Z[i]);
if(t.m==='hw'){B.box(.35,11,.35,p.X[i],p.Y[i],p.Z[i],0x8a8f95);for(const s of[1,-1]){B.box(.25,.25,3.2,p.X[i]+nx*s*1.7,p.Y[i]+11,p.Z[i]+nz*s*1.7,0x8a8f95,'m',Math.atan2(nx,nz));LAMPS.push(p.X[i]+nx*s*3.2,p.Y[i]+10.8,p.Z[i]+nz*s*3.2)}}
else{const s=(i/3|0)%2?1:-1,lx=p.X[i]+nx*s*(t.w/2+1.2),lz=p.Z[i]+nz*s*(t.w/2+1.2),ly=p.br[i]?p.Y[i]:HM(lx,lz);if(!t.urban)B.box(.25,8,.25,lx,ly,lz,0x8a8f95);LAMPS.push(lx-nx*s*1.6,ly+7.8,lz-nz*s*1.6)}}}}}
/* arched viaduct face: solid wall above an arch opening (chord sl, rise rs), origin at the arch springing */
function spandrel(sl,rs){const r=(sl*sl/4+rs*rs)/(2*rs),ha=Math.asin(sl/2/r),s=new T.Shape();s.moveTo(-sl/2-2,0);s.lineTo(-sl/2-2,rs+.3);s.lineTo(sl/2+2,rs+.3);s.lineTo(sl/2+2,0);for(let j=0;j<=12;j++){const a=ha-2*ha*j/12;s.lineTo(r*Math.sin(a),rs-r+r*Math.cos(a))}return new T.ShapeGeometry(s)}
function bridge(p,i0,i1){const t=p.t,hw=t.w/2,B=IB.at(p.X[i0],p.Z[i0]),len=p.S[i1]-p.S[i0],water=(()=>{for(let i=i0;i<=i1;i++)if(p.W[i]>-1e3)return 1;return 0})(),onSpan=p.def.fixedFn===spanFn;
const style=t.rail&&!t.elev?'arch':t.elev?'metro':p.type==='hw'?'girder':(p.type==='ln'||len<260&&water)?'truss':'girder',dc=style==='arch'?t.pc:style==='truss'?0x9aa29a:t.pc,th=style==='arch'?2.2:t.m==='hw'?2.4:1.6;
for(let i=i0;i<i1;i++){const ax=p.X[i],az=p.Z[i],bx=p.X[i+1],bz=p.Z[i+1],ay=p.Y[i],by=p.Y[i+1],ry=Math.atan2(bx-ax,bz-az),l=hyp(bx-ax,bz-az)+.6,mx=(ax+bx)/2,mz=(az+bz)/2,my=(ay+by)/2;
B.add(BOXG,MR(mx,my-th/2-.05,mz,ry,-Math.atan2(by-ay,l),t.w+1.6,th,l),dc,'m');for(const s of[1,-1]){const ox=Math.cos(ry)*s*(hw+.5),oz=-Math.sin(ry)*s*(hw+.5);B.add(BOXG,MR(mx+ox,my+.55,mz+oz,ry,-Math.atan2(by-ay,l),.45,1.1,l),0xc9c7c0,'m')}}
/* piers / arches / truss */
let acc=t.span*.5,prev=null;for(let i=i0;i<=i1;i++){if(i>i0)acc+=p.S[i]-p.S[i-1];if(acc<t.span&&i!==i1&&i!==i0)continue;acc=0;const x=p.X[i],z=p.Z[i],y=p.Y[i],g=Math.min(HM(x,z),p.W[i]>-1e3?p.W[i]-3:1e9)-2,h=y-th-g;if(onSpan&&!(i===i0||i===i1)){prev=null;continue}
const[tx,tz]=tang(p,i),ry=Math.atan2(tx,tz);if(h>.5){if(style==='arch'){B.box(t.w+1,h,4,x,g,z,t.pc,'m',ry);if(prev){const dx=x-prev[0],dz=z-prev[1],sl=hyp(dx,dz)-4,rs=Math.min(sl*.42,(y-th-Math.max(g,prev[2]))*.75);if(rs>1.5&&sl>4){const ay=y-th-rs-.2;B.add(archGeo(t.w+1,sl,rs),MR((x+prev[0])/2,ay,(z+prev[1])/2,Math.atan2(-dz,dx),0,1,1,1),t.pc,'r');
const sg=spandrel(sl,rs),ux=dx/(sl+4),uz=dz/(sl+4);for(const s of[1,-1])B.add(sg,MR((x+prev[0])/2-uz*s*(t.w/2+.5),ay,(z+prev[1])/2+ux*s*(t.w/2+.5),Math.atan2(-dz,dx),0,1,1,1),t.pc,'r')}}}
else if(style==='metro'){B.box(2.2,h,2.2,x,g,z,0xbfc1c3,'m',ry);B.box(t.w,1.4,2.6,x,y-th-1.4,z,0xbfc1c3,'m',ry)}
else if(t.m==='hw'){B.box(3,h,3,x,g,z,0xb4b2ab,'m',ry);B.box(t.w-2,2,3.4,x,y-th-2,z,0xb4b2ab,'m',ry)}
else{for(const s of[1,-1])B.box(1.4,h,1.4,x+Math.cos(ry)*s*hw*.6,g,z-Math.sin(ry)*s*hw*.6,0xb0aea6,'m',ry);B.box(t.w,1.2,1.8,x,y-th-1.2,z,0xb0aea6,'m',ry)}}prev=[x,z,g]}
/* steel truss for short rural river crossings */
if(style==='truss'){const ht=5.5;for(const s of[1,-1]){const ox=(i)=>{const[tx,tz]=tang(p,i);return[-tz*s*(hw+.6),tx*s*(hw+.6)]};let k=0;for(let i=i0;i<i1;i++,k++){const[ax_,az_]=ox(i),[bx_,bz_]=ox(i+1),A_=[p.X[i]+ax_,p.Y[i],p.Z[i]+az_],Bb=[p.X[i+1]+bx_,p.Y[i+1],p.Z[i+1]+bz_];
beam(B,A_[0],A_[1]+ht,A_[2],Bb[0],Bb[1]+ht,Bb[2],.5,.5,0x5d7a62);beam(B,A_[0],A_[1],A_[2],A_[0],A_[1]+ht,A_[2],.35,.35,0x5d7a62);if(k%2)beam(B,A_[0],A_[1],A_[2],Bb[0],Bb[1]+ht,Bb[2],.3,.3,0x5d7a62);else beam(B,A_[0],A_[1]+ht,A_[2],Bb[0],Bb[1],Bb[2],.3,.3,0x5d7a62)}}}
/* abutments */
for(const i of[i0,i1]){const g=HM(p.X[i],p.Z[i]),[tx,tz]=tang(p,i);if(p.Y[i]-g>1)B.box(t.w+2,p.Y[i]-g,6,p.X[i],g-1,p.Z[i],0x9c9a92,'m',Math.atan2(tx,tz))}}
function flushRoads(){for(const k in RACC){const A=RACC[k];if(A.I.length){const m=new T.Mesh(geoAcc(A),RMATS[k]);m.receiveShadow=true;S.add(m)}RACC[k]={P:[],U:[],I:[]}}
if(SKA.I.length){const m=new T.Mesh(geoAcc(SKA),BM.d);m.receiveShadow=true;S.add(m)}SKA.P=[];SKA.U=[];SKA.I=[];SKA.C=[]}
surfaces(PATHS);flushRoads();
/* interchange: masts with high lights, sign gantries on the approaches */
for(const it of INTER){const B=IB.at(it.x,it.z);for(const[a,b]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const x=it.x+it.tx*a*230+it.tz*b*60,z=it.z+it.tz*a*230-it.tx*b*60,g=HM(x,z);B.add(new T.CylinderGeometry(.4,.7,30,8),M4(x,g+15,z),0x8a8f95);LAMPS.push(x,g+30,z,x+1.5,g+30,z)}
for(const a of[1,-1]){const x=it.x-it.tx*a*620,z=it.z-it.tz*a*620,y=HM(x,z),ry=Math.atan2(it.tx,it.tz);for(const s of[1,-1])B.box(.6,8,.6,x+it.tz*s*15,y,z-it.tx*s*15,0x8a8f95,'m',ry);B.box(31,.8,.8,x,y+7.6,z,0x8a8f95,'m',ry);B.box(12,3.4,.3,x+it.tz*7,y+8.4,z-it.tx*7,0x1f6b3a,'m',ry);B.box(9,3.4,.3,x-it.tz*7,y+8.4,z+it.tx*7,0x1f6b3a,'m',ry)}}

/* ---------- railway stations ---------- */
const STNS=[];
for(const r of RAILNET){const st=r.stations.slice();if(r.type==='metro'){for(let s=900;s<r.L-500;s+=1800)st.push(null)}
let auto=900;for(const sp of st){let bi=0;if(sp){let bd=1e9;for(let i=0;i<r.n;i++){const d=hyp(r.X[i]-sp[0],r.Z[i]-sp[1]);if(d<bd){bd=d;bi=i}}}else{while(bi<r.n-1&&r.S[bi]<auto)bi++;auto+=1800}
const s0=r.S[bi];STNS.push({r,i:bi,s:s0});const[tx,tz]=tang(r,bi),ry=Math.atan2(tx,tz),x=r.X[bi],z=r.Z[bi],y=r.Y[bi],B=IB.at(x,z),hw=r.t.w/2,PL=r.type==='metro'?120:240;
for(const s of[1,-1]){const px=x-tz*s*(hw+3.2),pz=z+tx*s*(hw+3.2);B.box(5.5,1.1,PL,px,y-1,pz,0xb7b4ac,'m',ry);B.box(5.5,.25,PL*.7,px,y+4.4,pz,0x6f8796,'m',ry);for(let k=-PL*.33;k<=PL*.33;k+=20)B.box(.25,4.4,.25,px+tx*k,y,pz+tz*k,0x8a8f95,'m',ry)}
if(r.type!=='metro'&&!(hyp(x-4500,z-7100)<600)){const bx=x-tz*(hw+19),bz=z+tx*(hw+19),g=HM(bx,bz);B.box(26,9,60,bx,g,bz,0xd8d1c2,'w',ry);B.add(PRISM,MR(bx,g+9,bz,ry,0,28,4,62),0x7a3b2c,'m');addBld(bx,bz,30,g+13)}}}

/* ---------- power lines + substations ---------- */
LOADMSG('Stringing power lines…');
{const W=[];for(const pl of CFG.power){const d=densify(pl,40),pts=[];let acc=0;for(let i=0;i<d.length/2;i++){if(i)acc+=hyp(d[i*2]-d[i*2-2],d[i*2+1]-d[i*2-1]);if(i===0||acc>=380||i===d.length/2-1){acc=0;pts.push([d[i*2],d[i*2+1]])}}
const tops=[];for(let q=0;q<pts.length;q++){const[x,z]=pts[q],a=pts[Math.max(q-1,0)],b=pts[Math.min(q+1,pts.length-1)],ry=Math.atan2(b[0]-a[0],b[1]-a[1]),g=Math.max(HM(x,z),waterAt(x,z)),B=IB.at(x,z);
B.add(new T.CylinderGeometry(.6,3.6,46,4,1,true),M4(x,g+23,z,ry+PI/4),0x8f969c,'r');for(const[h,w]of[[34,15],[41,11]])B.box(w*2,.7,.9,x,g+h,z,0x8f969c,'m',ry);B.box(.5,4,.5,x,g+46,z,0x8f969c);addBld(x,z,7,g+46);
const cx=Math.cos(ry),cz=-Math.sin(ry);tops.push([[x+cx*14,g+33,z+cz*14],[x-cx*14,g+33,z-cz*14],[x+cx*10,g+40,z+cz*10],[x-cx*10,g+40,z-cz*10]])}
for(let q=0;q<tops.length-1;q++)for(let c=0;c<4;c++){const A=tops[q][c],Bp=tops[q+1][c],L=hyp(A[0]-Bp[0],A[2]-Bp[2]),sag=L*.035;let pv=null;for(let s=0;s<=8;s++){const u=s/8,p=[lp(A[0],Bp[0],u),lp(A[1],Bp[1],u)-sag*4*u*(1-u),lp(A[2],Bp[2],u)];if(pv)W.push(...pv,...p);pv=p}}}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(W,3));const wl=new T.LineSegments(g,new T.LineBasicMaterial({color:0x4a4f55,transparent:true,opacity:.45}));S.add(wl)}
for(const[x,z]of CFG.substations){const g=HM(x,z),B=IB.at(x,z);B.box(130,.3,90,x,g,z,0x8d8c86,'d');for(let i=-2;i<=2;i++)for(let j=-1;j<=1;j++){B.box(7,6,5,x+i*22,g,z+j*24,0x9aa0a4,'s');B.box(.4,14,.4,x+i*22+6,g,z+j*24,0x8f969c)}for(const s of[1,-1])B.box(130,2.4,.12,x,g,z+s*45,0x9aa1a8);B.box(.12,2.4,90,x+65,g,z,0x9aa1a8);B.box(.12,2.4,90,x-65,g,z,0x9aa1a8);B.box(18,7,12,x-50,g,z-30,0xc9c3b4,'w')}
IB.flush(S);
/* ---------- moving trains ---------- */
const TRCOL={main:[0xf2f2f0,0x1b4f9c],mountain:[0x2d6a4f,0xe7e2d2],freight:[0x8a4a2b,0x3c4248],metro:[0xd9dde2,0x2fa35a]};
const trainGeo=(c1,c2,fr)=>merge([[BOXG,M4(0,2.05,0,0,3.1,3.1,21.2),c1],[BOXG,M4(0,2.45,0,0,3.14,.85,20.4),0x1d2733],[BOXG,M4(0,1.05,0,0,3.15,.35,21.3),c2],[BOXG,M4(0,3.65,0,0,2.7,.25,19),0x9aa0a6]].concat(fr?[]:[]));
const FRG=merge([[BOXG,M4(0,2.4,-3.1,0,2.5,2.6,6),0xb3462e],[BOXG,M4(0,2.4,3.1,0,2.5,2.6,6),0x2f6f8f],[BOXG,M4(0,.9,0,0,2.6,.6,13.6),0x2b2f33]]);
{let total=0;const defs=[];for(const r of RAILNET){const n={main:2,mountain:1,freight:1,metro:2}[r.type],cars={main:8,mountain:4,freight:16,metro:6}[r.type];for(let q=0;q<n;q++){defs.push({r,cars,dir:q%2?-1:1,s:r.L*(q%2?.7:.15),v:0,vmax:{main:62,mountain:30,freight:22,metro:24}[r.type],dwell:0,lane:r.t.tracks.length>1?(q%2?-1:1)*Math.abs(r.t.tracks[0]):0});total+=cars}}
const byType={};for(const d of defs)(byType[d.r.type]||(byType[d.r.type]=[])).push(d);
for(const ty in byType){const L=byType[ty],n=L.reduce((a,d)=>a+d.cars,0),c=TRCOL[ty],im=new T.InstancedMesh(ty==='freight'?FRG:trainGeo(c[0],c[1]),vm({roughness:.4,metalness:.3}),n);im.frustumCulled=false;im.castShadow=true;S.add(im);let o=0;for(const d of L){d.im=im;d.o=o;o+=d.cars;TRAINS.push(d)}}}
const trP=(r,s,lane,out)=>{s=cl(s,0,r.L);let lo=0,hi=r.n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(r.S[m]>s)hi=m;else lo=m}const u=(s-r.S[lo])/((r.S[hi]-r.S[lo])||1),tx=r.X[hi]-r.X[lo],tz=r.Z[hi]-r.Z[lo],tl=hyp(tx,tz)||1;
out.x=lp(r.X[lo],r.X[hi],u)-tz/tl*lane;out.z=lp(r.Z[lo],r.Z[hi],u)+tx/tl*lane;out.y=r.tn[lo]&&r.tn[hi]?-999:Math.max(lp(r.Y[lo],r.Y[hi],u),r.br[lo]?0:HM(out.x,out.z)+.25);return out};
{const D=new T.Object3D(),A_=new T.Vector3(),B_=new T.Vector3();
TICKS.push(dt=>{for(const d of TRAINS){const r=d.r;if(d.dwell>0)d.dwell-=dt;else{let tg=null,ns=Math.max(0,d.dir>0?r.L-d.s:d.s);for(const st of STNS)if(st.r===r&&st!==d.last){const ds=(st.s-d.s)*d.dir;if(ds>-1&&ds<ns){ns=ds;tg=st}}
const tv=Math.min(d.vmax,Math.sqrt(2*.6*Math.max(0,ns-.6))+.4);d.v+=cl(tv-d.v,-1.4*dt,.5*dt);d.s+=d.v*d.dir*dt;if(ns<1.5&&d.v<1){d.v=0;d.dwell=tg?22:40;d.last=tg;if(!tg)d.dir=-d.dir}}
for(let c=0;c<d.cars;c++){const s=d.s-d.dir*(c*(r.type==='freight'?14:22)+(d.dir>0?0:0)),ln=d.lane*d.dir;trP(r,s+d.dir*10,ln,A_);trP(r,s-d.dir*10,ln,B_);if(A_.y<-900||B_.y<-900){D.position.set(0,-2000,0)}else{D.position.copy(A_).add(B_).multiplyScalar(.5);D.lookAt(A_)}D.updateMatrix();d.im.setMatrixAt(d.o+c,D.matrix)}d.im.instanceMatrix.needsUpdate=true}})}

/* ---------- road traffic (built after the cities add their avenues) ---------- */
const CARS=[];
function buildTraffic(){nightLights(LAMPS,0xffc890,10,0,.95);const lanes=[];for(const p of ROADNET){if(p.type==='ramp'||p.L<400)continue;const n=Math.round(p.L/(p.type==='hw'?260:p.type==='st'?150:p.type==='ln'?1400:520));for(let q=0;q<n;q++)lanes.push(p)}
const R_=RNG(WLD.seed+77),N=lanes.length,truck=lanes.map(p=>p.type==='hw'&&R_()<.28),nt=truck.filter(Boolean).length,cm=new T.InstancedMesh(CARG,vm({roughness:.35,metalness:.55}),N-nt),tm=new T.InstancedMesh(TRUCKG,vm({roughness:.5,metalness:.2}),Math.max(1,nt)),c=new T.Color();
let ci=0,ti=0;lanes.forEach((p,q)=>{const tr=truck[q],dir=R_()<.5?1:-1,lane=p.type==='hw'?(R_()<.5?3.4:7.1):p.type==='ln'?1.5:p.type==='st'?2.8:2.7;const car={p,s:R_()*p.L,dir,lane,v:(p.type==='hw'?24:p.type==='st'?11:15)*(.8+R_()*.4)*(tr?.8:1),im:tr?tm:cm,o:tr?ti++:ci++};CARS.push(car);car.im.setColorAt(car.o,tr?c.set([0xffffff,0x2f5d9c,0xc23a2a,0x3a7d44][q%4]):c.setHSL(R_(),R_()*.5,.2+R_()*.6))});
for(const m of[cm,tm]){m.frustumCulled=false;m.castShadow=true;S.add(m)}
const hl=new Float32Array(CARS.length*3),tl=new Float32Array(CARS.length*3),mk=(a,col,sz)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));const o=new T.Points(g,new T.PointsMaterial({size:sz,map:LMAP,color:col,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));o.frustumCulled=false;S.add(o);return o},HL_=mk(hl,0xfff1cf,4.5),TL_=mk(tl,0xff2a1a,3);
const D=new T.Object3D(),P_={x:0,y:0,z:0},Q_={x:0,y:0,z:0};let lt=0;
TICKS.push((dt,ns)=>{const cx=cam.position.x,cz=cam.position.z,lights=ns>.15;HL_.visible=TL_.visible=lights;HL_.material.opacity=TL_.material.opacity=ns;lt+=dt;const far=lt>.5;if(far)lt=0;
CARS.forEach((c,q)=>{const p=c.p;c.s+=c.v*c.dir*dt;if(c.s>p.L){c.s=p.L;c.dir=-1}if(c.s<0){c.s=0;c.dir=1}const near=Math.abs(cx-(c.lx||0))<9000&&Math.abs(cz-(c.lz||0))<9000;if(!near&&!far)return;
trP(p,c.s+c.dir*2.2,c.lane*c.dir,P_);trP(p,c.s-c.dir*2.2,c.lane*c.dir,Q_);c.lx=P_.x;c.lz=P_.z;if(P_.y<-900)D.position.set(0,-3000,0);else{D.position.set((P_.x+Q_.x)/2,(P_.y+Q_.y)/2,(P_.z+Q_.z)/2);D.lookAt(P_.x,P_.y,P_.z)}D.updateMatrix();c.im.setMatrixAt(c.o,D.matrix);
if(lights){const fx=P_.x-Q_.x,fz=P_.z-Q_.z;hl.set([P_.x+fx*.2,D.position.y+.7,P_.z+fz*.2],q*3);tl.set([Q_.x-fx*.2,D.position.y+.8,Q_.z-fz*.2],q*3)}});
cm.instanceMatrix.needsUpdate=tm.instanceMatrix.needsUpdate=true;if(lights){HL_.geometry.attributes.position.needsUpdate=TL_.geometry.attributes.position.needsUpdate=true}})}

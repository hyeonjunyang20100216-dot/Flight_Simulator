/* ============================================================
   terrain.js — height field, coastline, mountains, valley, lakes, rivers,
   biomes, chunked LOD terrain, ocean / lake / river water.
   Exposes: HM(x,z) ground height, waterAt(x,z), riverAt(x,z), grid arrays,
   terrainUpdate(camera), RIVERS, LAKES.
   ============================================================ */
const WLD=WORLD_LOCATIONS,SEA=WLD.sea,GC=WLD.cell,GX0=WLD.bounds.x0,GZ0=WLD.bounds.z0,GX1=WLD.bounds.x1,GZ1=WLD.bounds.z1;
const GNX=Math.round((GX1-GX0)/GC)+1,GNZ=Math.round((GZ1-GZ0)/GC)+1,GN=GNX*GNZ;
const THS=new Float32Array(GN),CSD=new Float32Array(GN),TCOL=new Uint8Array(GN*3),TFM=new Uint8Array(GN),TFOR=new Uint8Array(GN),TBLK=new Uint8Array(GN),TWAT=new Float32Array(GN).fill(-1e4),TURB=new Uint8Array(GN),TAIR=new Uint8Array(GN);
const RVD=new Float32Array(GN).fill(1e9),RVP=new Float32Array(GN),RVW=new Float32Array(GN),RVM=new Uint8Array(GN);
const gIdx=(x,z)=>{const i=Math.round((x-GX0)/GC),j=Math.round((z-GZ0)/GC);return(i<0||j<0||i>=GNX||j>=GNZ)?-1:j*GNX+i};
function gridS(A,x,z){const u=cl((x-GX0)/GC,0,GNX-1.001),v=cl((z-GZ0)/GC,0,GNZ-1.001),i=u|0,j=v|0,fu=u-i,fv=v-j,a=j*GNX+i;return lp(lp(A[a],A[a+1],fu),lp(A[a+GNX],A[a+GNX+1],fu),fv)}
/* ground height: same triangle split as the terrain mesh (a,c,b / b,c,d) so physics and roads match what is drawn */
function HM(x,z){const u=cl((x-GX0)/GC,0,GNX-1.001),v=cl((z-GZ0)/GC,0,GNZ-1.001),i=u|0,j=v|0,fu=u-i,fv=v-j,a=j*GNX+i,A=THS;
return fu+fv<=1?A[a]+(A[a+1]-A[a])*fu+(A[a+GNX]-A[a])*fv:A[a+GNX+1]+(A[a+GNX]-A[a+GNX+1])*(1-fu)+(A[a+1]-A[a+GNX+1])*(1-fv)}
function waterAt(x,z){const k=gIdx(x,z);if(k<0)return x>GX1||z>GZ1?SEA:-1e4;return TWAT[k]}
function riverAt(x,z){const k=gIdx(x,z);return k<0?[1e9,0,0]:[RVD[k],RVP[k],RVW[k]]}
/* stamp helper: run fn(k,x,z) for every grid cell inside a world rectangle */
function gridRect(x0,z0,x1,z1,fn){const i0=Math.max(0,Math.floor((x0-GX0)/GC)),i1=Math.min(GNX-1,Math.ceil((x1-GX0)/GC)),j0=Math.max(0,Math.floor((z0-GZ0)/GC)),j1=Math.min(GNZ-1,Math.ceil((z1-GZ0)/GC));
for(let j=j0;j<=j1;j++){const z=GZ0+j*GC;for(let i=i0;i<=i1;i++)fn(j*GNX+i,GX0+i*GC,z)}}
/* polygon signed distance stamping (inside negative) */
function polySD(pts,band,out){out.fill(band);const n=pts.length;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of pts){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}
for(let q=0;q<n;q++){const a=pts[q],b=pts[(q+1)%n];gridRect(Math.min(a[0],b[0])-band,Math.min(a[1],b[1])-band,Math.max(a[0],b[0])+band,Math.max(a[1],b[1])+band,(k,x,z)=>{const d=segD(x,z,a[0],a[1],b[0],b[1])[0];if(d<out[k])out[k]=d})}
gridRect(x0,z0,x1,z1,(k,x,z)=>{let ins=false;for(let q=0,r=n-1;q<n;r=q++){const a=pts[q],b=pts[r];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])ins=!ins}if(ins)out[k]=-out[k]})}
const WRND=RNG(WLD.seed);

LOADMSG('Shaping coastline and mountains…');
/* ---------- coastline signed distance (land positive) ---------- */
{const cp=WLD.coast,BAND=14000,land=new Uint8Array(GN),poly=cp.concat([[GX0-30000,cp[cp.length-1][1]],[GX0-30000,cp[0][1]]]);
for(let j=0;j<GNZ;j++){const z=GZ0+j*GC,xs=[];for(let q=0;q<poly.length;q++){const a=poly[q],b=poly[(q+1)%poly.length];if((a[1]<=z)!==(b[1]<=z))xs.push(a[0]+(z-a[1])/(b[1]-a[1])*(b[0]-a[0]))}xs.sort((p,r)=>p-r);
for(let q=0;q+1<xs.length;q+=2){const i0=Math.max(0,Math.ceil((xs[q]-GX0)/GC)),i1=Math.min(GNX-1,Math.floor((xs[q+1]-GX0)/GC));for(let i=i0;i<=i1;i++)land[j*GNX+i]=1}}
CSD.fill(BAND);for(let q=0;q<cp.length-1;q++){const a=cp[q],b=cp[q+1];gridRect(Math.min(a[0],b[0])-BAND,Math.min(a[1],b[1])-BAND,Math.max(a[0],b[0])+BAND,Math.max(a[1],b[1])+BAND,(k,x,z)=>{const d=segD(x,z,a[0],a[1],b[0],b[1])[0];if(d<CSD[k])CSD[k]=d})}
for(let k=0;k<GN;k++)if(!land[k])CSD[k]=-CSD[k]}
/* ---------- mountain ridge mask and valley floor ---------- */
const MTN=new Float32Array(GN),VLD=new Float32Array(GN).fill(1e9),VLF=new Float32Array(GN);
for(const rg of WLD.ranges){const p=rg.pts,w=rg.w;for(let q=0;q<p.length-1;q++){const a=p[q],b=p[q+1];gridRect(Math.min(a[0],b[0])-w,Math.min(a[1],b[1])-w,Math.max(a[0],b[0])+w,Math.max(a[1],b[1])+w,(k,x,z)=>{const d=segD(x,z,a[0],a[1],b[0],b[1])[0];if(d<w){const m=rg.h*sm(w,w*.18,d);if(m>MTN[k])MTN[k]=m}})}}
{const V=WLD.valley,p=V.pts,R=V.half+V.wall+500;for(let q=0;q<p.length-1;q++){const a=p[q],b=p[q+1];gridRect(Math.min(a[0],b[0])-R,Math.min(a[1],b[1])-R,Math.max(a[0],b[0])+R,Math.max(a[1],b[1])+R,(k,x,z)=>{const[d,t]=segD(x,z,a[0],a[1],b[0],b[1]);if(d<VLD[k]){VLD[k]=d;VLF[k]=lp(a[2],b[2],t)}})}}
const inEll=(x,z,e)=>{const dx=(x-e[0])/e[2],dz=(z-e[1])/e[3];return dx*dx+dz*dz};
const calmAt=(x,z)=>{let c=1;for(const q of WLD.coastCalm)c=Math.min(c,sm(q[2]*.6,q[2],hyp(x-q[0],z-q[1])));return c};
const cliffAt=(x,z)=>{let c=0;for(const q of WLD.cliffs)c=Math.max(c,sm(q[2],q[2]*.45,hyp(x-q[0],z-q[1])));return c};
const AFR=WLD.airports.map(c=>Object.assign(apFrame(c),{c}));
/* ---------- smooth noise fields sampled on a 250 m lattice and interpolated (much faster than per-cell fbm) ---------- */
const CNX=(GNX>>1)+2,CNZ=(GNZ>>1)+2;
function coarseField(fn){const A=new Float32Array(CNX*CNZ);for(let j=0;j<CNZ;j++){const z=GZ0+j*2*GC;for(let i=0;i<CNX;i++)A[j*CNX+i]=fn(GX0+i*2*GC,z,j*2*GNX+i*2)}return A}
const cS=(A,i,j)=>{const u=i*.5,v=j*.5,i0=u|0,j0=v|0,fu=u-i0,fv=v-j0,a=j0*CNX+i0;return A[a]+(A[a+1]-A[a])*fu+(A[a+CNX]-A[a])*fv+(A[a]-A[a+1]-A[a+CNX]+A[a+CNX+1])*fu*fv};
/* ---------- base height ---------- */
LOADMSG('Raising terrain…');
const NLOW=coarseField((x,z)=>10+34*fbm2(x/15000+3.1,z/15000-1.7,4)+14*fbm2(x/4200,z/4200,3)),NHIL=coarseField((x,z)=>fbm2(x/6500-4,z/6500+8,4)),
NCST=coarseField((x,z)=>fbm2(x/2600+7,z/2600-3,3)),NSEA=coarseField((x,z)=>fbm2(x/3000,z/3000,2)),
NPL=coarseField((x,z)=>{let pl=0;for(const e of WLD.plains)pl=Math.max(pl,sm(1,.35,inEll(x,z,e)));return pl}),NPLB=coarseField((x,z)=>{let pl=0;for(const e of WLD.plains)pl=Math.max(pl,sm(1,.4,inEll(x,z,e)));return pl}),
NUP=coarseField((x,z)=>{let up=0;for(const e of WLD.uplands){const q=inEll(x,z,e);if(q<1)up+=e[4]*sm(1,.25,q)*(.75+.5*fbm2(x/5000+3,z/5000+7,3))}return up}),
NPK=coarseField((x,z)=>{let pk=0;for(const e of WLD.peaks){const dx=x-e[0],dz=z-e[1],d2=dx*dx+dz*dz;if(d2<e[2]*e[2]*3.3)pk+=e[3]*Math.exp(-d2/(e[2]*e[2]*.45))}return pk}),NCALM=coarseField(calmAt),NCLF=coarseField(cliffAt),
NRDG=coarseField((x,z,k)=>{let m=0;for(const q of[k,k+1,k+GNX,k+GNX+1,k-1,k-GNX])if(q>=0&&q<GN)m=Math.max(m,MTN[q]);if(m<=0)return 0;const wx=x+(fbm2(x/9000,z/9000,3)-.5)*9000,wz=z+(fbm2(x/9000+40,z/9000-20,3)-.5)*9000;return ridge2(wx/14000,wz/14000,6)});
LOADMSG('Raising terrain… (fields)');
for(let j=0;j<GNZ;j++){const z=GZ0+j*GC;for(let i=0;i<GNX;i++){const x=GX0+i*GC,k=j*GNX+i;
const pl=cS(NPL,i,j),up=cS(NUP,i,j),pk=cS(NPK,i,j);
const low=cS(NLOW,i,j),hills=(1-pl)*(18+120*Math.pow(cS(NHIL,i,j),2));
let h=low*(1-pl*.45)+hills*(1-pl*.7)+up+pk;const mm=MTN[k];
if(mm>.002){const r=cS(NRDG,i,j);h+=mm*(380+2350*Math.pow(r,1.55))}
if(VLD[k]<WLD.valley.half+WLD.valley.wall){const fl=VLF[k]+18*(fbm2(x/1600,z/1600,2)-.5),t=sm(WLD.valley.half,WLD.valley.half+WLD.valley.wall,VLD[k]);h=lp(fl,Math.max(h,fl+40*t),t)}
const calm=cS(NCALM,i,j),dc=CSD[k]+(cS(NCST,i,j)-.5)*1700*calm;
if(dc<0){const d=-dc;let s=-(1.2+d*.011+Math.max(0,d-2500)*.018);s=Math.max(s,-210)+(cS(NSEA,i,j)-.5)*6;h=s}
else{const cf=cS(NCLF,i,j),bh=lp(.7+dc*.012,h,sm(250,2600,dc));if(cf>0){const ct=38+60*fbm2(x/900,z/900,2),ch=dc<170?lp(-3,ct,sm(4,160,dc)):Math.max(ct,lp(ct,h,sm(170,1800,dc)));h=lp(bh,ch,cf)}else h=bh}
for(const is of WLD.islands){const dx=x-is.x,dz=z-is.z;if(Math.abs(dx)>is.r*2.4||Math.abs(dz)>is.r*2.4)continue;const d=Math.sqrt(dx*dx+dz*dz)*(1+(fbm2(x/600+is.x,z/600,3)-.5)*.55),s=1-d/is.r;
const hi=s>0?(is.type==='rock'?is.h*Math.min(1,s/.12)*(.7+.6*fbm2(x/200,z/200,2)):1.5+is.h*Math.pow(s,1.15)*(.75+.5*fbm2(x/700,z/700,3))):-1.5+s*50;h=Math.max(h,hi)}
CSD[k]=dc;THS[k]=h}}
LOADMSG('Filling lakes…');
/* ---------- lakes: carve basins, make sure the rim holds the water ---------- */
const LAKES=WLD.lakes.map(L=>{const sd=new Float32Array(GN);polySD(L.pts,2600,sd);const dam=L.reservoir?WLD.landmarks.dam:null;
for(let k=0;k<GN;k++){const d=sd[k];if(d>=2600)continue;const x=GX0+(k%GNX)*GC,z=GZ0+(k/GNX|0)*GC;
if(d<0){THS[k]=Math.min(THS[k],L.level-3-Math.min(60,-d*.05));TWAT[k]=L.level}
else if(d<600&&!(dam&&hyp(x-dam.x,z-dam.z)<1100))THS[k]=Math.max(THS[k],L.level+1.5+d*.012)}
return Object.assign({sd},L)});
/* ---------- rivers: profiles from the base terrain, then carve channels and valleys ---------- */
LOADMSG('Carving rivers…');
const RIVERS=[];
for(const rv of WLD.rivers){const d=densify(rv.pts,110),n=d.length/2,s=[0],hb=[],P=[],W=[];for(let i=1;i<n;i++)s.push(s[i-1]+hyp(d[i*2]-d[i*2-2],d[i*2+1]-d[i*2-1]));const Lr=s[n-1];
for(let i=0;i<n;i++){hb.push(HM(d[i*2],d[i*2+1]));W.push(lp(rv.w0,rv.w1,s[i]/Lr))}
let end=SEA+.35;if(rv.into==='lake'){const lk=LAKES.find(l=>l.reservoir);end=lk.level+.4}else if(rv.into!=='sea'){const par=RIVERS.find(r=>r.name===rv.into),ex=d[(n-1)*2],ez=d[(n-1)*2+1];let best=1e18,bi=0;for(let i=0;i<par.n;i++){const q=(par.d[i*2]-ex)**2+(par.d[i*2+1]-ez)**2;if(q<best){best=q;bi=i}}end=par.P[bi]+.25}
P[0]=hb[0]-2.5;if(rv.main){const lk=LAKES.find(l=>l.reservoir);P[0]=Math.min(P[0],lk.level-72)}for(let i=1;i<n;i++)P[i]=Math.min(P[i-1]-.00012*(s[i]-s[i-1]),hb[i]-(2+W[i]/40));for(let i=0;i<n;i++)P[i]=Math.max(P[i],end);
const R={name:rv.name,d,n,s,P,W,L:Lr,main:!!rv.main,into:rv.into};RIVERS.push(R);
for(let i=0;i<n-1;i++){const ax=d[i*2],az=d[i*2+1],bx=d[i*2+2],bz=d[i*2+3],mtn=hb[i]>280||MTN[gIdx(ax,az)]>.25,vw=mtn?260+W[i]*1.5:850+W[i]*3,B=W[i]/2+vw;
gridRect(Math.min(ax,bx)-B,Math.min(az,bz)-B,Math.max(ax,bx)+B,Math.max(az,bz)+B,(k,x,z)=>{const[dd,t]=segD(x,z,ax,az,bx,bz);if(dd<RVD[k]){RVD[k]=dd;RVP[k]=lp(P[i],P[i+1],t);RVW[k]=lp(W[i],W[i+1],t)/2;RVM[k]=mtn?1:0}})}}
for(let k=0;k<GN;k++){const d=RVD[k];if(d>5000)continue;const w=RVW[k],p=RVP[k],mtn=RVM[k],vw=mtn?260+w*3:850+w*6;if(d>w+vw)continue;
if(d<w){THS[k]=Math.min(THS[k],p-(2.2+w*.03)*(1-(d/w)**2)-.4);if(TWAT[k]<-1e3)TWAT[k]=p}
else{const bt=p+.7+(d-w)*(mtn?.15:.012),t=sm(w+vw*.55,w+vw,d);THS[k]=Math.min(THS[k],lp(bt,THS[k],t))}}
/* ---------- airports: flatten their fields (rotated rectangles with soft edges) ---------- */
for(const F of AFR){const c=F.c,f=c.flat,R=hyp(Math.max(-f[0],f[1]),Math.max(-f[2],f[3]))+c.blend;
gridRect(c.x-R,c.z-R,c.x+R,c.z+R,(k,x,z)=>{const[lx,lz]=F.toL(x,z),dx=Math.max(f[0]-lx,0,lx-f[1]),dz=Math.max(f[2]-lz,0,lz-f[3]),dO=hyp(dx,dz),t=sm(0,c.blend,dO);if(t>=1)return;THS[k]=lp(c.el,THS[k],t);TAIR[k]=Math.max(TAIR[k],(1-t)*255|0);if(t<.05&&TWAT[k]>-1e3&&TWAT[k]<c.el)TWAT[k]=-1e4})}
/* ---------- urban density (towns get flatter ground and grey tint) ---------- */
for(const c of WLD.cities){const R=c.r*1.15;gridRect(c.x-R,c.z-R,c.x+R,c.z+R,(k,x,z)=>{const d=hyp(x-c.x,z-c.z)*(1+(fbm2(x/1800,z/1800,2)-.5)*.5),u=sm(c.r,c.r*.2,d)*255;if(u>TURB[k])TURB[k]=u})}
for(const v of WLD.villages){const R=180+v.n*5;gridRect(v.x-R,v.z-R,v.x+R,v.z+R,(k,x,z)=>{const u=sm(R,R*.3,hyp(x-v.x,z-v.z))*150;if(u>TURB[k])TURB[k]=u})}
/* ---------- surface detail noise ---------- */
for(let j=0;j<GNZ;j++)for(let i=0;i<GNX;i++){const k=j*GNX+i,x=GX0+i*GC,z=GZ0+j*GC;if(TWAT[k]>-1e3||TAIR[k]>20)continue;const u=TURB[k]/255;
THS[k]+=((fbm2(x/650,z/650,3)-.5)*12*(1-u*.85)+(MTN[k]>.05?(fbm2(x/240+9,z/240,3)-.5)*34*MTN[k]:0))*(THS[k]>1?1:.2)}
/* sea / water table */
for(let k=0;k<GN;k++)if(THS[k]<SEA-.15&&TWAT[k]<-1e3)TWAT[k]=SEA;

/* ---------- biomes: colour, field mask, forest density ---------- */
LOADMSG('Painting forests and farmland…');
const NB2=coarseField((x,z)=>fbm2(x/2200,z/2200,3)),NBF=coarseField((x,z)=>fbm2(x/5200+20,z/5200+7,4)),NBM=coarseField((x,z)=>fbm2(x/3200+5,z/3200-2,3));
{const c=new T.Color(),q=new T.Color();for(let j=0;j<GNZ;j++)for(let i=0;i<GNX;i++){const k=j*GNX+i,x=GX0+i*GC,z=GZ0+j*GC,h=THS[k],il=Math.max(i-1,0),ir=Math.min(i+1,GNX-1),jd=Math.max(j-1,0),ju=Math.min(j+1,GNZ-1),
sl=(()=>{const a=(THS[j*GNX+ir]-THS[j*GNX+il])/((ir-il)*GC),b=(THS[ju*GNX+i]-THS[jd*GNX+i])/((ju-jd)*GC);return Math.sqrt(a*a+b*b)})(),n=vn2(x/60,z/60),n2=cS(NB2,i,j),u=TURB[k]/255,ai=sm(.5,.96,TAIR[k]/255),wl=TWAT[k],dc=CSD[k];
let fm=0,fo=0;
if(wl>-1e3&&h<wl-.2){const dep=wl-h;c.setRGB(.56,.62,.5).lerp(q.setRGB(.06,.14,.2),cl(dep/40,0,1))}
else{const beach=dc<220+n2*160&&h<6&&sl<.3&&cS(NCLF,i,j)<.5&&wl<-1e3;
c.setRGB(.22+.07*n,.39+.07*n,.14+.04*n).lerp(q.setRGB(.36,.42,.2),sm(.45,.7,n2)*.6).lerp(q.setRGB(.42,.44,.22),sm(120,520,h)*.7);
let forest=sm(.47,.6,cS(NBF,i,j)+.2*sm(250,700,h)*(1-sm(1500,1900,h))+.35*MTN[k]*(1-sm(1300,1750,h)));
const pl=cS(NPLB,i,j);forest*=1-pl*.75;
if(RVD[k]<RVW[k]+160&&h<400)forest=Math.max(forest,.55*sm(RVW[k]+160,RVW[k]+40,RVD[k]));
forest*=(1-u)*(1-ai)*(beach?0:1)*(1-sm(1650,1850,h))*(1-sm(.75,1,sl));fo=forest;
const farm=h>2&&h<330&&sl<.13&&u<.5&&ai<.1&&!beach?sm(.36,.5,cS(NBM,i,j))*(1-forest*1.4)+pl*.9:0;fm=cl(farm,0,1)*(1-u*1.6);
if(fm>0){const cs=[[.75,.68,.3],[.36,.5,.17],[.55,.4,.22],[.82,.76,.42],[.24,.42,.16],[.45,.33,.2]][hh(Math.floor(x/480),Math.floor(z/380))*6|0];c.lerp(q.setRGB(cs[0],cs[1],cs[2]),cl(fm,0,1)*.6)}
if(forest>0)c.lerp(q.setRGB(.08+.03*n,.2+.05*n-(h>700?.04:0),.08+.02*n),cl(forest*1.25,0,.92));
if(sl>.5||h>1500){const r=cl((sl-.5)*2.2+(h-1500)/500,.0,1);c.lerp(q.setRGB(.43+.06*vn2(x/40,h/25),.41+.05*n,.38),r)}
if(h>1820+120*n2)c.lerp(q.setRGB(.95,.96,.99),sm(1820+120*n2,1980+120*n2,h)*(1-sm(.9,1.4,sl)));
if(beach)c.lerp(q.setRGB(.86,.8,.62),sm(220+n2*160,60,dc)).lerp(q.setRGB(.66,.6,.47),sm(1.2,.1,h)*.6);
if(RVD[k]<RVW[k]+35&&wl<-1e3)c.lerp(q.setRGB(.4,.38,.29),.5);
if(u>0)c.lerp(q.setRGB(.44,.44,.42),u*.85);if(ai>0)c.lerp(q.setRGB(.33+.05*n,.48+.05*n,.21),ai)}
TCOL[k*3]=cl(c.r*190,0,255);TCOL[k*3+1]=cl(c.g*190,0,255);TCOL[k*3+2]=cl(c.b*190,0,255);TFM[k]=cl(fm,0,1)*255;TFOR[k]=cl(fo,0,1)*255}}

/* ---------- terrain material: detail noise, procedural field patchwork, rain wetness ---------- */
const TU={wet:{value:0}};
const TMAT=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0,side:T.DoubleSide});
TMAT.onBeforeCompile=s=>{wpos(s);s.vertexShader='attribute float fm;varying float vFm;\n'+s.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\nvFm=fm;');s.uniforms.dT={value:DTEX};s.uniforms.wet=TU.wet;
s.fragmentShader='uniform sampler2D dT;uniform float wet;varying vec3 vW;varying float vFm;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float dd=length(vW-cameraPosition);vec3 n1=texture2D(dT,vW.xz*.0023).rgb,n2=texture2D(dT,vW.xz*.019).rgb,n3=texture2D(dT,vW.xz*.13).rgb,n4=texture2D(dT,vW.xz*.71).rgb,n0=texture2D(dT,vW.xz*.00021).rgb;
diffuseColor.rgb*=(.78+.44*n1.g)*(.8+.4*n2.r)*mix(.74+.52*n3.b,1.,smoothstep(150.,1100.,dd))*mix(.78+.44*n4.r,1.,smoothstep(15.,90.,dd));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.03,.9),n1.r*.4);
if(vFm>.02){vec2 P=vW.xz,rw=P+(n0.rg-.5)*2600.,rid=floor(rw/4800.);float rh=fract(sin(dot(rid,vec2(41.3,289.1)))*43758.5),an=rh*3.1416,ca=cos(an),sa=sin(an),ty=fract(rh*7.31);
vec2 q=vec2(ca*P.x-sa*P.y,sa*P.x+ca*P.y);if(ty>.82)q+=(texture2D(dT,P*.0013).rg-.5)*170.;vec2 cs=ty<.3?vec2(560.,95.):ty<.62?vec2(430.,310.):vec2(250.,175.);
vec2 id=floor(q/cs),fp=fract(q/cs)*cs;float hs=fract(sin(dot(id+rid*17.,vec2(127.1,311.7)))*43758.5453);
vec3 fc=hs<.16?vec3(.74,.67,.3):hs<.32?vec3(.36,.5,.17):hs<.46?vec3(.55,.41,.23):hs<.6?vec3(.8,.74,.42):hs<.74?vec3(.25,.43,.16):hs<.86?vec3(.46,.34,.21):vec3(.52,.55,.24);
float sf=1.-smoothstep(250.,1300.,dd),st=sin((fract(hs*13.)>.5?fp.x:fp.y)*2.4)*.5+.5;fc*=mix(1.,.84+.26*st,sf*step(.3,fract(hs*7.)))*(.86+.28*n2.r)*(.9+.2*n1.g);
float ed=min(min(fp.x,cs.x-fp.x),min(fp.y,cs.y-fp.y)),hb=(1.-smoothstep(2.5,5.+dd*.004,ed))*(1.-smoothstep(3000.,9000.,dd))*step(.35,fract(hs*3.7));fc=mix(fc,vec3(.11,.19,.07),hb*.85);fc=mix(vec3(dot(fc,vec3(.33))),fc,.8)*.62;diffuseColor.rgb=mix(diffuseColor.rgb,fc,vFm);}
diffuseColor.rgb*=1.-wet*.22;`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.45,wet);')};

/* ---------- chunked LOD terrain: 10 km chunks, 5 detail levels, skirts hide LOD cracks ---------- */
const TCH=80,NCX=(GNX-1)/TCH,NCZ=(GNZ-1)/TCH,TIDX={};
function tIndex(s){if(TIDX[s])return TIDX[s];const n=TCH/s,nv=n+1,I=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*nv+i,b=a+1,c=a+nv,d=c+1;I.push(a,c,b,b,c,d)}
const E=[];for(let i=0;i<=n;i++)E.push(i);for(let j=1;j<=n;j++)E.push(j*nv+n);for(let i=n-1;i>=0;i--)E.push(n*nv+i);for(let j=n-1;j>=1;j--)E.push(j*nv);
const base=nv*nv;for(let q=0;q<E.length;q++){const a=E[q],b=E[(q+1)%E.length];I.push(a,b,base+q,b,base+(q+1)%E.length,base+q)}return TIDX[s]={idx:new T.BufferAttribute(new Uint32Array(I),1),E}}
function tGeo(ci,cj,s){const n=TCH/s,nv=n+1,{idx,E}=tIndex(s),cnt=nv*nv+E.length,P=new Float32Array(cnt*3),Nn=new Float32Array(cnt*3),Cc=new Uint8Array(cnt*3),F=new Uint8Array(cnt);
for(let j=0;j<nv;j++)for(let i=0;i<nv;i++){const gi=ci*TCH+i*s,gj=cj*TCH+j*s,k=gj*GNX+gi,v=j*nv+i;P[v*3]=i*s*GC;P[v*3+1]=THS[k];P[v*3+2]=j*s*GC;
const il=Math.max(gi-s,0),ir=Math.min(gi+s,GNX-1),jd=Math.max(gj-s,0),ju=Math.min(gj+s,GNZ-1),dx=(THS[gj*GNX+ir]-THS[gj*GNX+il])/((ir-il)*GC),dz=(THS[ju*GNX+gi]-THS[jd*GNX+gi])/((ju-jd)*GC),ln=hyp(dx,1,dz);
Nn[v*3]=-dx/ln;Nn[v*3+1]=1/ln;Nn[v*3+2]=-dz/ln;Cc[v*3]=TCOL[k*3];Cc[v*3+1]=TCOL[k*3+1];Cc[v*3+2]=TCOL[k*3+2];F[v]=TFM[k]}
const drop=10+s*7;for(let q=0;q<E.length;q++){const v=E[q],w=nv*nv+q;P[w*3]=P[v*3];P[w*3+1]=P[v*3+1]-drop;P[w*3+2]=P[v*3+2];Nn[w*3]=Nn[v*3];Nn[w*3+1]=Nn[v*3+1];Nn[w*3+2]=Nn[v*3+2];Cc[w*3]=Cc[v*3];Cc[w*3+1]=Cc[v*3+1];Cc[w*3+2]=Cc[v*3+2];F[w]=F[v]}
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('normal',new T.BufferAttribute(Nn,3));g.setAttribute('color',new T.BufferAttribute(Cc,3,true));g.setAttribute('fm',new T.BufferAttribute(F,1,true));g.setIndex(idx);g.computeBoundingSphere();return g}
const TCHK=[];
function terrainBuildMeshes(){for(let cj=0;cj<NCZ;cj++)for(let ci=0;ci<NCX;ci++){const g=tGeo(ci,cj,16),m=new T.Mesh(g,TMAT);m.position.set(GX0+ci*TCH*GC,0,GZ0+cj*TCH*GC);m.receiveShadow=true;S.add(m);
TCHK.push({ci,cj,m,lod:16,g:{16:g},x0:m.position.x,z0:m.position.z,sz:TCH*GC})}}
/* pick a level of detail for each chunk from camera distance; build at most `budget` new geometries per call */
function terrainUpdate(px,py,pz,budget=2){const lift=Math.max(0,py-1200)*.5;const want=[];
for(const c of TCHK){const dx=Math.max(c.x0-px,0,px-(c.x0+c.sz)),dz=Math.max(c.z0-pz,0,pz-(c.z0+c.sz)),d=hyp(dx,dz)+lift,w=d<4200?1:d<10500?2:d<23000?4:d<42000?8:16;want.push([c,w,d])}
want.sort((a,b)=>a[2]-b[2]);for(const it of want){const c=it[0];let w=it[1];if(w===c.lod)continue;let g=c.g[w];if(!g){if(budget<=0){if(w>c.lod&&c.g[c.lod*2]){w=c.lod*2;g=c.g[w]}else continue}else{budget--;g=c.g[w]=tGeo(c.ci,c.cj,w)}}c.m.geometry=g;c.lod=w;
for(const s of[1,2])if(s<w&&w>=s*4&&c.g[s]){c.g[s].dispose();delete c.g[s]}}}

/* ---------- distant land / sea beyond the playable region ---------- */
function farTerrain(){const OUT=[230000,150000,100000,70000,45000,28000,16000,8000,3000],ax=(lo,hi)=>{const o=OUT.map(d=>lo-d);for(let v=lo;v<=hi+1;v+=2500)o.push(v);for(let i=OUT.length-1;i>=0;i--)o.push(hi+OUT[i]);return o},xs=ax(GX0,GX1),Z=ax(GZ0,GZ1);
const cp=WLD.coast,P=[],C=[],F=[],I=[],nx=xs.length,nz=Z.length,c=new T.Color(),q=new T.Color();
const coastSD=(x,z)=>{let best=1e18;for(let i=0;i<cp.length-1;i++)best=Math.min(best,segD(x,z,cp[i][0],cp[i][1],cp[i+1][0],cp[i+1][1])[0]);
let xc;if(z<=cp[0][1])xc=cp[0][0]+(z-cp[0][1])*.1;else if(z>=cp[cp.length-1][1])xc=cp[cp.length-1][0]+(z-cp[cp.length-1][1])*-.7;else{xc=cp[0][0];for(let i=0;i<cp.length-1;i++){const a=cp[i],b=cp[i+1];if((a[1]<=z)!==(b[1]<=z)){xc=a[0]+(z-a[1])/(b[1]-a[1])*(b[0]-a[0]);break}}}return x<xc?best:-best};
for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=xs[i],z=Z[j],ins=x>=GX0&&x<=GX1&&z>=GZ0&&z<=GZ1;let h;
if(ins)h=HM(x,z)-6;else{const dc=coastSD(x,z);if(dc<0)h=-40+dc*.004;else{h=40+180*fbm2(x/12000,z/12000,4)+sm(-45000,-90000,z)*(700+2100*Math.pow(ridge2(x/16000,z/16000,5),1.5))+sm(-60000,-110000,x)*260*fbm2(x/8000,z/8000,3);h=Math.min(h,dc*.05+2)}}
P.push(x,h,z);c.setRGB(.2,.36,.15).lerp(q.setRGB(.1,.22,.09),sm(150,600,h)*.8).lerp(q.setRGB(.42,.4,.37),sm(1300,1700,h)).lerp(q.setRGB(.95,.96,.99),sm(1850,2050,h));if(h<1)c.setRGB(.5,.55,.45);C.push(c.r*.75,c.g*.75,c.b*.75);F.push(0)}
for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const x0=xs[i],x1=xs[i+1],z0=Z[j],z1=Z[j+1];if(x0>=GX0&&x1<=GX1&&z0>=GZ0&&z1<=GZ1)continue;const a=j*nx+i,b=a+1,cc=a+nx,d=cc+1;I.push(a,cc,b,b,cc,d)}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));g.setAttribute('fm',new T.Float32BufferAttribute(F,1));g.setIndex(I);g.computeVertexNormals();S.add(new T.Mesh(g,TMAT))}

/* ---------- water ---------- */
const HTW=Math.ceil(GNX/2),HTH=Math.ceil(GNZ/2);let HTEX=null;const makeHTEX=(()=>{const f32=new Float32Array(1),u32=new Uint32Array(f32.buffer),half=v=>{f32[0]=v;const x=u32[0],e=(x>>23&255)-112,m=x&0x7fffff;if(e<=0)return(x>>16)&0x8000;if(e>30)return((x>>16)&0x8000)|0x7c00;return((x>>16)&0x8000)|(e<<10)|(m>>13)};
const d=new Uint16Array(HTW*HTH);for(let j=0;j<HTH;j++)for(let i=0;i<HTW;i++)d[j*HTW+i]=half(THS[Math.min(j*2,GNZ-1)*GNX+Math.min(i*2,GNX-1)]);
const t=new T.DataTexture(d,HTW,HTH,T.RedFormat,T.HalfFloatType);t.magFilter=t.minFilter=T.LinearFilter;t.needsUpdate=true;return t});
const WNS=`{vec2 p=vW.xz;float dd=length(vW-cameraPosition);vec2 p2=mat2(.8,.6,-.6,.8)*p,p3=mat2(.5,-.866,.866,.5)*p,w=(texture2D(dT,p*.0029+vec2(wt*.0035,wt*.002)).rg-.5)*.3+(texture2D(dT,p2*.011-vec2(wt*.008,-wt*.005)).rg-.5)*.26+(texture2D(dT,p3*.043+vec2(wt*.017,wt*.011)).gb-.5)*.22*(1.-smoothstep(120.,900.,dd));
w*=mix(1.,.1,smoothstep(300.,7000.,dd))*(1.+wav);normal=normalize((viewMatrix*vec4(normalize(vec3(w.x,1.,w.y)),0.)).xyz);}`;
const WU={wt:{value:0},wav:{value:0}};
function waterMat(level,lake){const u={wl:{value:level}},m=new T.MeshStandardMaterial({color:0xffffff,roughness:.1,metalness:0,transparent:true,envMapIntensity:.85});
m.onBeforeCompile=s=>{wpos(s);Object.assign(s.uniforms,{dT:{value:DTEX},hT:{value:HTEX},wt:WU.wt,wav:WU.wav,wl:u.wl});s.fragmentShader='uniform sampler2D dT,hT;uniform float wt,wl,wav;varying vec3 vW;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
{vec2 uh=(vW.xz-vec2(${GX0.toFixed(1)},${GZ0.toFixed(1)}))/vec2(${(GX1-GX0).toFixed(1)},${(GZ1-GZ0).toFixed(1)})*(${(HTW-1)/HTW})+${(.5/HTW).toFixed(6)};float hg=(uh.x<0.||uh.y<0.||uh.x>1.||uh.y>1.)?-260.:texture2D(hT,uh).r,dep=wl-hg;
vec3 wc=mix(vec3(.12,.36,.34),mix(vec3(.03,.15,.2),vec3(.012,.06,.11),smoothstep(8.,70.,dep)),smoothstep(.4,9.,dep));${lake?'wc=mix(wc,vec3(.02,.09,.08),.4);':''}
float fo=smoothstep(1.5,.15,dep)*smoothstep(.58,.9,texture2D(dT,vW.xz*.021+vec2(wt*.012,wt*.007)).r+.28*sin(dep*3.2-wt*1.6))*${lake?'.35':'1.'};
diffuseColor.rgb=mix(wc,vec3(.93),fo*.75);diffuseColor.a=clamp(mix(.5,.94,smoothstep(.4,10.,dep))+fo*.4,0.,1.);}`).replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n'+WNS)};
m.customProgramCacheKey=()=>'water'+(lake?1:0);return m}
const WMAT=waterMat(SEA,0);
const RMAT=pullify(new T.MeshStandardMaterial({color:0x10302f,roughness:.1,metalness:0,transparent:true,opacity:.95,envMapIntensity:.55}),.12,.001,s=>{wpos(s);Object.assign(s.uniforms,{dT:{value:DTEX},wt:WU.wt,wav:WU.wav});s.fragmentShader='uniform sampler2D dT;uniform float wt,wav;varying vec3 vW;\n'+s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n'+WNS)});
function buildWater(){HTEX=makeHTEX();{const o=new T.Mesh(new T.PlaneGeometry(700000,700000).rotateX(-PI/2),WMAT);o.position.y=SEA;o.renderOrder=1;S.add(o)}
for(const L of LAKES){const sh=new T.Shape(L.pts.map(p=>new T.Vector2(p[0],-p[1])));const g=new T.ShapeGeometry(sh,6).rotateX(-PI/2);const m=new T.Mesh(g,waterMat(L.level,1));m.position.y=L.level;m.renderOrder=1;S.add(m)}
const A={P:[],U:[],I:[]};for(const R of RIVERS){let pv=0;for(let i=0;i<R.n;i++){const x=R.d[i*2],z=R.d[i*2+1],k=gIdx(x,z),inLake=LAKES.some(L=>L.sd[k]<-30),y=R.P[i];if(k<0||inLake||THS[k]<SEA-.3&&TWAT[k]===SEA){pv=0;continue}
const ii=Math.min(i+1,R.n-1),io=Math.max(i-1,0);let tx=R.d[ii*2]-R.d[io*2],tz=R.d[ii*2+1]-R.d[io*2+1];const tl=hyp(tx,tz)||1,w=R.W[i]/2+3,nx=-tz/tl*w,nz=tx/tl*w,b=A.P.length/3;
A.P.push(x+nx,y,z+nz,x-nx,y,z-nz);A.U.push(0,R.s[i]/40,1,R.s[i]/40);if(pv)A.I.push(b-2,b,b-1,b-1,b,b+1);pv=1}}
const m=new T.Mesh(geoAcc(A),RMAT);m.receiveShadow=true;S.add(m)}
LIGHTS.push((ns,dF,wet)=>{TU.wet.value=wet;WU.wav.value=wet*.8});

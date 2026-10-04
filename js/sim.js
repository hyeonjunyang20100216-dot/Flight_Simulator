/* ============================================================
   sim.js — sky, aircraft, flight model, controls, HUD, map, main loop.
   Runs after the world modules (core, world-config, terrain, airports,
   infrastructure, cities, nature, landmarks).
   ============================================================ */
/* ---------- sky, environment lighting ---------- */
const SU={zen:{value:zen},hor:{value:hor},sd:{value:sunD},sc:{value:sunC},gc:{value:gndC},ns:{value:0},fl:{value:0},cw:{value:0}},SKV='varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
SKF=ev=>`varying vec3 v;uniform vec3 zen,hor,sd,sc,gc;uniform float ns,fl,cw;void main(){vec3 d=normalize(v);float e=max(d.y,0.);vec3 c=mix(hor,zen,pow(e,.5));c=mix(c,hor*1.05,exp(-e*14.)*.45);
float s=max(dot(d,sd),0.),k=(1.-ns*.85)*(1.-cw*.75);c+=sc*(pow(s,5.)*.2+pow(s,48.)*.3)*k;c+=vec3(1.,.97,.9)*smoothstep(.99955,.9998,s)*2.5*k*step(-.02,d.y);
float m=dot(d,-sd);c+=vec3(.85,.88,.95)*(smoothstep(.99965,.9998,m)*1.3+pow(max(m,0.),300.)*.2)*ns*(1.-cw);
vec3 q=floor(d*300.);float r=fract(sin(dot(q,vec3(12.9,78.2,37.7)))*43758.5);c+=vec3(step(.9986,r))*ns*smoothstep(.06,.4,e)*(1.-cw)*(.45+.55*fract(r*91.));
${ev?'if(d.y<0.)c=mix(hor,gc,smoothstep(0.,.2,-d.y));':'if(d.y<0.)c=hor;'}c+=fl*.5;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
gl_FragColor=linearToOutputTexel(gl_FragColor);}`;
const skM=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,fog:false,uniforms:SU,vertexShader:SKV,fragmentShader:SKF(0)});
const sky=new T.Mesh(new T.SphereGeometry(30000,32,16),skM);sky.renderOrder=-1;sky.frustumCulled=false;S.add(sky);
const PMG=new T.PMREMGenerator(R),ES=new T.Scene();ES.add(new T.Mesh(new T.SphereGeometry(10,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,uniforms:SU,vertexShader:SKV,fragmentShader:SKF(1)})));
let envT=-99,envW=-1,envRT=null;function envUpd(){if(Math.abs(tod-envT)<.12&&envW===wx)return;const rt=PMG.fromScene(ES,0,.1,100);S.environment=rt.texture;if(envRT)envRT.dispose();envRT=rt;envT=tod;envW=wx}
const sun=new T.DirectionalLight(0xffffff,2),HL=new T.HemisphereLight(0xbfd6ff,0x556644,.6);sun.castShadow=true;const sc_=sun.shadow.camera;sc_.left=sc_.bottom=-170;sc_.right=sc_.top=170;sc_.near=1;sc_.far=1500;sun.shadow.bias=-.0004;sun.shadow.normalBias=.4;S.add(sun,sun.target,HL);
const spot=new T.SpotLight(0xfff2d8,0,1200,.3,.6);S.add(spot,spot.target);
/* ---------- clouds: instanced camera-facing puffs, lit top/bottom, fade near camera ---------- */
const CTEX=tex(cv(128,128,x=>{for(let i=0;i<16;i++){const px=28+rnd()*72,py=34+rnd()*60,r=14+rnd()*28,g=x.createRadialGradient(px,py-r*.25,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(.55,'rgba(215,220,230,.28)');g.addColorStop(1,'rgba(190,198,210,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}}));
const CN_=130*16,cgi=new T.InstancedBufferGeometry(),CIP=new Float32Array(CN_*3),CIV=new Float32Array(CN_*4);{const pg=new T.PlaneGeometry(1,1);cgi.setIndex(pg.index);cgi.setAttribute('position',pg.attributes.position);cgi.setAttribute('uv',pg.attributes.uv)}
cgi.setAttribute('ip',new T.InstancedBufferAttribute(CIP,3));cgi.setAttribute('iv',new T.InstancedBufferAttribute(CIV,4));cgi.instanceCount=0;
const CU=Object.assign(T.UniformsUtils.clone(T.UniformsLib.fog),{map:{value:CTEX},cT:{value:new T.Color(1,1,1)},cB:{value:new T.Color(.6,.65,.7)},op:{value:.92},wo:{value:new T.Vector2()}});
const CLM=new T.ShaderMaterial({uniforms:CU,transparent:true,depthWrite:false,fog:true,
vertexShader:`#include <common>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
attribute vec3 ip;attribute vec4 iv;uniform vec2 wo;varying vec2 vU;varying float vS,vA,vG;
void main(){vec3 c=ip;c.xz=mod(c.xz+wo+15000.,30000.)-15000.;vec4 mvPosition=modelViewMatrix*vec4(c,1.);float dz=-mvPosition.z,co=cos(iv.y),si=sin(iv.y);mvPosition.xy+=mat2(co,si,-si,co)*position.xy*iv.x;
vU=uv;vS=iv.z;vG=position.y+.5;vA=iv.w*smoothstep(iv.x*.15,iv.x*.75,dz);gl_Position=projectionMatrix*mvPosition;
#include <logdepthbuf_vertex>
#include <fog_vertex>
}`,
fragmentShader:`#include <common>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map;uniform vec3 cT,cB;uniform float op;varying vec2 vU;varying float vS,vA,vG;
void main(){
#include <logdepthbuf_fragment>
vec4 t=texture2D(map,vU);float a=t.a*vA*op;if(a<.004)discard;float l=clamp(vS*.7+vG*.5-.12+(t.r-.85)*1.2,0.,1.);gl_FragColor=vec4(mix(cB,cT,l),a);
#include <fog_fragment>
#include <tonemapping_fragment>
}`});
const CLD=new T.Mesh(cgi,CLM);CLD.frustumCulled=false;CLD.renderOrder=2;S.add(CLD);const CLC=[];
function buildClouds(){const lo=wx>=3?.55:1,ov=wx>=2;let n=0;for(let i=0;i<130;i++){const hi=i%4==0,cx=(rnd()-.5)*30000,cz=(rnd()-.5)*30000,cy=hi?4200+rnd()*500:(1300+rnd()*1300)*lo;CLC[i]=[cx,cy,cz];
for(let j=0;j<16;j++,n++){const k=n*3,v=n*4,a=rnd()*6.283,rr=Math.sqrt(rnd()),sp=hi?2200:ov?1500:900,up=hi?rnd()*.2:Math.pow(rnd(),1.3)*(1-rr*.6);
CIP[k]=cx+Math.cos(a)*rr*sp;CIP[k+1]=cy+up*(hi?120:ov?260:430);CIP[k+2]=cz+Math.sin(a)*rr*sp*(hi?.5:.8);CIV[v]=(hi?1500:ov?1050:620)*(.6+rnd()*.7)*(1-rr*.35);CIV[v+1]=rnd()*6.283;CIV[v+2]=hi?.9:up;CIV[v+3]=hi?.4:.85+rnd()*.15}}
cgi.attributes.ip.needsUpdate=cgi.attributes.iv.needsUpdate=true}
const cwrap=v=>((v+15000)%30000+30000)%30000-15000;
/* ---------- particles ---------- */
class PS{constructor(n,col){this.n=n;this.i=0;this.p=new Float32Array(n*3);this.v=new Float32Array(n*3);this.a=new Float32Array(n);this.s=new Float32Array(n);this.e=new Float32Array(n*5);this.live=0;
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(this.p,3));g.setAttribute('a',new T.BufferAttribute(this.a,1));g.setAttribute('s',new T.BufferAttribute(this.s,1));
this.m=new T.ShaderMaterial({uniforms:{c:{value:new T.Color(col)},k:{value:innerHeight/2}},transparent:true,depthWrite:false,
vertexShader:'#include <common>\n#include <logdepthbuf_pars_vertex>\nattribute float a,s;varying float A;uniform float k;void main(){A=a;vec4 m=modelViewMatrix*vec4(position,1.);gl_PointSize=min(s*k/-m.z,300.);gl_Position=projectionMatrix*m;\n#include <logdepthbuf_vertex>\n}',
fragmentShader:'#include <common>\n#include <logdepthbuf_pars_fragment>\nuniform vec3 c;varying float A;void main(){\n#include <logdepthbuf_fragment>\nfloat d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(c,A*smoothstep(1.,.15,d));}'});
this.o=new T.Points(g,this.m);this.o.frustumCulled=false;S.add(this.o)}
emit(x,y,z,vx,vy,vz,life,s0,s1,a){const i=this.i++%this.n,k=i*3;this.p[k]=x;this.p[k+1]=y;this.p[k+2]=z;this.v[k]=vx;this.v[k+1]=vy;this.v[k+2]=vz;const e=i*5;this.e[e]=life;this.e[e+1]=life;this.e[e+2]=s0;this.e[e+3]=s1;this.e[e+4]=a;this.live=1}
update(dt){if(!this.live)return;let any=0;for(let i=0;i<this.n;i++){const e=i*5;if(this.e[e]<=0){this.a[i]=0;continue}any=1;this.e[e]-=dt;const t=1-this.e[e]/this.e[e+1],k=i*3;this.p[k]+=this.v[k]*dt;this.p[k+1]+=this.v[k+1]*dt;this.p[k+2]+=this.v[k+2]*dt;this.s[i]=lp(this.e[e+2],this.e[e+3],t);this.a[i]=this.e[e]>0?this.e[e+4]*(1-t):0}
const g=this.o.geometry.attributes;g.position.needsUpdate=g.a.needsUpdate=g.s.needsUpdate=true;this.live=any}}
const SMK=new PS(300,0xd8d8d8),CON=new PS(1500,0xffffff),DBR=new PS(300,0x2a2a2a),SPK=new PS(200,0xffaa44);
/* ---------- aircraft ---------- */
const SPEC=[{n:'Light aircraft',d:'Single-engine prop · retractable gear · gentle · short takeoff',col:0xe6e8ea,fc:0x2f5f9a,L:8.3,R:.68,pf:[[0,.08],[.2,.3],[.4,.75],[.55,1],[.75,.9],[.88,.7],[.95,.45],[1,.1]],sc:1,tk:[.15,.12],
w:[11,1.65,1.15,.2,.75,-1.4,.03],ts:[3.6,1.15,.8,.35,.15,3.5,0],fin:[1.5,1.3,3,.35,0,0],gear:{mx:.62,y:-.55,z:-.35,len:.6,r:.27,tw:0,nz:-2.7,am:1.5,an:1.9,sp:.42,dc:1},grs:.5,cock:[.45,-.8],prop:1,up:.5,
m:1100,S:16,CLa:5,CL0:.2,cfl:.5,cdfl:.05,aS:.26,CD0:.03,k:.06,T0:3200,Tv:110,pr:.9,rr:1.6,yr:.5,ys:2.2,st:2,br:3.5,steer:.7,vref:40,ir:2.8,crashV:5.2,gh:1.37,vapp:42,vcr:62},
{n:'Passenger airliner',d:'Wide-body twin-engine airliner · 57 m · heavy · long runway',sz:1.55,col:0xf0f2f4,fc:0x173f86,L:37,R:2,pf:[[0,.08],[.08,.3],[.2,.7],[.35,1],[.8,1],[.9,.85],[.96,.55],[1,.06]],sc:3.5,tk:[.14,.1],
w:[35.8,6.6,1.6,6.6,-.9,-3.5,.07],ts:[12.5,3.6,1.4,2.6,.4,14.2,.04],fin:[6.6,5.8,10.6,1.6,0,0],gear:{mx:3.6,y:-1.6,z:-1,len:1.55,r:.55,tw:2,nz:-12.5,am:PI/2,an:PI/2},grs:.28,cock:[.9,-15.3],eng:[5.2,-1.75,1,4.4,1.05],up:.55,
jet:1,m:68000,S:125,CLa:5.2,CL0:.3,cfl:.95,cdfl:.07,aS:.25,CD0:.024,k:.045,T0:175000,Tv:450,pr:.34,rr:.5,yr:.14,ys:2,st:1.1,br:2.3,steer:.3,vref:90,ir:1.7,ar:1.5,sp:.65,spr:120,vap:.35,crashV:6,gh:3.7,vapp:72,vcr:210},
{n:'Fighter jet',d:'Twin-engine fighter · extreme thrust · agile',col:0x7d848c,fc:0x666d75,L:17,R:1,pf:[[0,.5],[.1,.65],[.3,.9],[.5,1],[.7,.9],[.85,.55],[.95,.25],[1,.03]],sc:1.6,tk:[.06,.045],
w:[10.2,6.2,1.3,4.3,-.05,.6,0],ts:[6.6,2.6,1,1.9,-.05,6.6,0],fin:[2.7,3,5.4,.6,.32,1],ftk:[.06,.05],gear:{mx:1.5,y:-.6,z:.8,len:.9,r:.33,tw:0,nz:-4.4,am:1.9,an:2.1},grs:.45,cock:[.75,-3.5],ab:1,
jet:1,m:12000,S:38,CLa:3.6,CL0:.05,cfl:.35,cdfl:.05,aS:.42,CD0:.02,k:.11,T0:115000,Tv:900,pr:1.12,rr:2.3,yr:.48,ys:3,st:2.6,br:5,steer:.5,vref:100,ir:2.6,sp:1.3,crashV:6.2,gh:1.83,vapp:82,vcr:260}];
const AF=[[1,0],[.9,.022],[.75,.046],[.55,.07],[.38,.083],[.24,.085],[.13,.075],[.06,.055],[.02,.032],[0,0],[.02,-.022],[.06,-.03],[.13,-.034],[.24,-.034],[.4,-.03],[.6,-.022],[.8,-.012],[1,0]],
AFS=[[1,0],[.9,.012],[.75,.026],[.55,.042],[.38,.054],[.24,.06],[.13,.056],[.06,.044],[.02,.028],[0,0],[.02,-.028],[.06,-.044],[.13,-.056],[.24,-.06],[.38,-.054],[.55,-.042],[.75,-.026],[.9,-.012],[1,0]];
const afAt=(pr,u,up)=>{const h=pr.length>>1,sg=up?pr.slice(0,h+1):pr.slice(h);for(let i=0;i<sg.length-1;i++){const[u0,v0]=sg[i],[u1,v1]=sg[i+1];if((u-u0)*(u-u1)<=0)return u1===u0?v0:lp(v0,v1,(u-u0)/(u1-u0))}return 0};
function loft(secs,c1,c0){const n=secs[0].length,P=[],I=[];for(const s of secs)for(const v of s)P.push(v.x,v.y,v.z);for(let j=0;j<secs.length-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i,b=a+1,c=a+n,d=c+1;I.push(a,c,b,b,c,d)}
const cap=(s,rv)=>{const o=P.length/3,cn=new T.Vector3();s.forEach(v=>cn.add(v));cn.divideScalar(s.length);P.push(cn.x,cn.y,cn.z);s.forEach(v=>P.push(v.x,v.y,v.z));for(let i=0;i<n-1;i++)rv?I.push(o,o+1+i,o+2+i):I.push(o,o+2+i,o+1+i)};
if(c1)cap(secs[secs.length-1],0);if(c0)cap(secs[0],1);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();return g}
const crv=(K,t)=>{const i=Math.min(K.length-2,Math.floor(t)),f=t-i,p0=K[Math.max(0,i-1)],p1=K[i],p2=K[i+1],p3=K[Math.min(K.length-1,i+2)];return .5*(2*p1+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f)};
/* superellipse-section tube (fuselage / intakes); sections ordered tail -> nose */
function tube(SS,na){const P=[],U=[],I=[],n=SS.length,se=(s,ph)=>{const sn=Math.sin(ph),cs=Math.cos(ph),e=2/s.n;return[s.x+s.w*Math.sign(sn)*Math.pow(Math.abs(sn),e),s.y+s.h*Math.sign(cs)*Math.pow(Math.abs(cs),e)*(cs<0?s.b:1)]};
SS.forEach(s=>{for(let i=0;i<=na;i++){const[x,y]=se(s,i/na*PI*2);P.push(x,y,s.z);U.push(i/na,s.v)}});for(let j=0;j<n-1;j++)for(let i=0;i<na;i++){const a=j*(na+1)+i,b=a+1,c=a+na+1,d=c+1;I.push(a,b,c,b,d,c)}
const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();const nr=g.attributes.normal;
for(let j=0;j<n;j++){const a=j*(na+1),b=a+na,v=new T.Vector3(nr.getX(a)+nr.getX(b),nr.getY(a)+nr.getY(b),nr.getZ(a)+nr.getZ(b)).normalize();nr.setXYZ(a,v.x,v.y,v.z);nr.setXYZ(b,v.x,v.y,v.z)}return g}
function seShape(s){const pts=[];for(let i=0;i<48;i++){const ph=i/48*PI*2,sn=Math.sin(ph),cs=Math.cos(ph),e=2/s.n;pts.push(new T.Vector2(s.x+s.w*Math.sign(sn)*Math.pow(Math.abs(sn),e),s.y+s.h*Math.sign(cs)*Math.pow(Math.abs(cs),e)*(cs<0?s.b:1)))}return new T.Shape(pts)}
const NZT=tex(cv(128,16,x=>{for(let i=0;i<24;i++){x.fillStyle=i%2?'#55595f':'#41444a';x.fillRect(i*128/24,0,128/24,16);x.fillStyle='#26282c';x.fillRect(i*128/24,0,1,16)}}),1);
const MSLG=merge([[new T.CylinderGeometry(.09,.09,2.8,10).rotateX(PI/2),new T.Matrix4(),0xe8eaec],[new T.ConeGeometry(.09,.38,10).rotateX(-PI/2),new T.Matrix4().makeTranslation(0,0,-1.59),0x5a5e63],[new T.CylinderGeometry(.093,.093,.12,10).rotateX(PI/2),new T.Matrix4().makeTranslation(0,0,-.75),0xc8a23a],
[new T.BoxGeometry(.02,.46,.32),new T.Matrix4().makeRotationZ(PI/4).setPosition(0,0,1.2),0x9aa0a6],[new T.BoxGeometry(.02,.46,.32),new T.Matrix4().makeRotationZ(-PI/4).setPosition(0,0,1.2),0x9aa0a6],[new T.BoxGeometry(.015,.3,.18),new T.Matrix4().makeRotationZ(PI/4).setPosition(0,0,-.95),0x9aa0a6],[new T.BoxGeometry(.015,.3,.18),new T.Matrix4().makeRotationZ(-PI/4).setPosition(0,0,-.95),0x9aa0a6]]);
/* lifting surface: airfoil loft between root and tip leading edges, rounded tip */
function lsurf(R0,T0,c0,c1,k0,k1,td,pr,rt=1){const sec=(f,ks=1,cs=1,dz=0)=>{const le=R0.clone().lerp(T0,f),c=lp(c0,c1,f),k=lp(k0,k1,f)/.12*ks;le.z+=dz*c;return pr.map(([u,v])=>le.clone().addScaledVector(ZA,u*c*cs).addScaledVector(td,v*c*k))};return loft(rt?[sec(0),sec(.985),sec(1,.3,.86,.08)]:[sec(0),sec(1)],1,0)}
/* control surface: wedge behind the hinge line, pivoting about that (swept) line */
function csurf(par,mtl,R0,T0,c0,c1,k0,k1,td,pr,f0,f1,cf){const hu=1-cf,pt=f=>{const le=R0.clone().lerp(T0,f),c=lp(c0,c1,f),k=lp(k0,k1,f)/.12,h=le.clone().addScaledVector(ZA,c*hu);
return[h.clone().addScaledVector(ZA,c*cf),h.clone().addScaledVector(td,afAt(pr,hu,1)*c*k*1.12),h.clone().addScaledVector(td,afAt(pr,hu,0)*c*k*1.12),h.clone().addScaledVector(ZA,c*cf),h]};
const s0=pt(f0),s1=pt(f1),g=loft([s0.slice(0,4),s1.slice(0,4)],1,1),hg=new T.Group(),pv=new T.Group();hg.position.copy(s0[4]);hg.quaternion.setFromUnitVectors(XA,s1[4].clone().sub(s0[4]).normalize());par.add(hg);hg.add(pv);
hg.updateMatrix();g.applyMatrix4(hg.matrix.clone().invert());g.computeVertexNormals();const m=new T.Mesh(g,mtl);m.castShadow=true;pv.add(m);return pv}
const LV={},EMS=[];function livery(k){if(LV[k])return LV[k];let em=null;const c=cv(512,2048,x=>{const U=u=>u*512,V=v=>(1-v)*2048,bar=(u0,u1,v0,v1,col)=>{x.fillStyle=col;x.fillRect(U(u0),V(v1),U(u1-u0),V(v0)-V(v1))},sides=[.25,.75];
const txt=(t,sd,v,px,col)=>{x.save();x.translate(U(sd),V(v));x.rotate(sd<.5?-PI/2:PI/2);x.fillStyle=col;x.font=`bold ${px}px sans-serif`;x.textAlign='center';x.fillText(t,0,0);x.restore()};
if(k==1){bar(0,1,0,1,'#f4f6f8');bar(.34,.66,0,1,'#a9b2bd');bar(.42,.58,0,1,'#959fab');for(const sd of sides){bar(sd+.02,sd+.028,.06,.9,'#2d6fc4');bar(sd+.03,sd+.033,.06,.9,'#f0b323');x.fillStyle='#16222f';for(let v=.13;v<.87;v+=.0245)x.fillRect(U(sd-.075),V(v+.0095),U(.018),V(0)-V(.0095));bar(sd-.12,sd-.09,.928,.948,'#0e1822');bar(sd-.085,sd-.055,.933,.955,'#0e1822');bar(sd-.05,sd-.02,.938,.957,'#0e1822');
x.strokeStyle='#c4cad2';x.lineWidth=2;for(const v of[.2,.52,.82])x.strokeRect(U(sd-.075),V(v+.03),U(.05),V(0)-V(.06));txt('AEROLINE',sd+.004,.5,54,'#f4f6f8')}bar(.955,1,.94,.958,'#0e1822');bar(0,.045,.94,.958,'#0e1822');bar(0,1,.975,1,'#e6e9ed');
em=cv(512,2048,y=>{y.fillStyle='#000';y.fillRect(0,0,512,2048);y.fillStyle='#ffdcaa';for(const sd of sides)for(let v=.13;v<.87;v+=.0245)if(rnd()<.85)y.fillRect(U(sd-.075),V(v+.0095),U(.018),V(0)-V(.0095))})}
else if(k==2){bar(0,1,0,1,'#858d96');for(let i=0;i<70;i++){x.fillStyle=['#737b84','#5b636c','#9aa2aa'][i%3];x.beginPath();x.ellipse(rnd()*512,rnd()*2048,20+rnd()*60,40+rnd()*160,rnd()*3,0,7);x.fill()}
bar(.36,.64,0,1,'#b3bac1');x.fillStyle='#2b3037';for(let v=0;v<1;v+=.055)x.fillRect(0,V(v),512,1.5);bar(0,1,.05,.085,'#d9a921');bar(0,1,0,.012,'#2b3037');for(const sd of sides){txt('FA-27',sd,.3,44,'#e9edf0');bar(sd-.03,sd+.03,.5,.53,'#c0362c')}bar(0,1,.96,1,'#2b3037')}
else{bar(0,1,0,1,'#f2f3f1');for(const sd of sides){bar(sd-.02,sd+.035,.05,.8,'#2a5fa0');bar(sd+.04,sd+.05,.05,.8,'#f0b323');x.fillStyle='#16222f';x.fillRect(U(sd-.09),V(.72),U(.055),V(.5)-V(.72));txt('N172F',sd-.005,.25,38,'#2a5fa0')}bar(0,1,.8,.93,'#dfe2e4');bar(0,1,.93,1,'#23272c')}});
return LV[k]={map:tex(c),em:em&&tex(em)}}
const FANM=new T.MeshStandardMaterial({map:tex(cv(256,256,x=>{x.fillStyle='#16181b';x.fillRect(0,0,256,256);x.translate(128,128);for(let i=0;i<24;i++){x.rotate(PI*2/24);const g=x.createLinearGradient(0,0,120,0);g.addColorStop(0,'#5d636b');g.addColorStop(1,'#a2a8b0');x.fillStyle=g;x.beginPath();x.moveTo(20,-3);x.quadraticCurveTo(70,-14,124,-9);x.lineTo(124,2);x.quadraticCurveTo(70,0,20,5);x.fill()}x.fillStyle='#d8dadc';x.beginPath();x.arc(0,0,22,0,7);x.fill()})),metalness:.6,roughness:.35});
function build(k,park){const s=SPEC[k],g=new T.Group(),L=s.L,Rr=s.R,PA=new T.MeshPhysicalMaterial({color:s.col,roughness:.32,metalness:.2,clearcoat:.6,clearcoatRoughness:.2}),FN=new T.MeshPhysicalMaterial({color:s.fc,roughness:.32,metalness:.2,clearcoat:.6,clearcoatRoughness:.2}),
MT=mat(0x8a9099,.35,.9),TR=mat(0x161616,.9,0),TRD=new T.MeshStandardMaterial({color:0x121315,roughness:.8,side:T.DoubleSide}),CS={rud:[],wh:[],fans:[],G:{}};
const add=(geo,m,x,y,z,p)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;(p||g).add(o);return o};
/* fuselage: lathe + upswept tail / drooped nose; fighter body flattened */
{const lv=livery(k),FM=PA.clone();FM.color.set(0xffffff);FM.map=lv.map;if(lv.em){FM.emissiveMap=lv.em;FM.emissive=new T.Color(0xffcf8a);EMS.push(FM)}
if(k==2){const KZ=[8.3,7.4,5.6,3.5,1.5,-.5,-2.3,-3.6,-5,-6.4,-7.6,-8.6],KW=[1.25,1.3,1.36,1.38,1.3,1.12,.9,.74,.6,.44,.26,.04],KH=[.5,.55,.58,.6,.64,.7,.74,.72,.58,.42,.26,.04],KY=[.05,.05,.05,.06,.08,.12,.16,.12,.04,-.04,-.1,-.13],KN=[3.2,3.4,3.6,3.6,3.4,3,2.7,2.5,2.3,2.2,2.1,2],sc_=[];
for(let j=0;j<80;j++){const t=j/79*(KZ.length-1),z=crv(KZ,t);sc_.push({x:0,y:crv(KY,t),z,w:Math.max(.02,crv(KW,t)),h:Math.max(.02,crv(KH,t)),n:crv(KN,t),b:.85,v:(L/2-z)/L})}add(tube(sc_,48),FM,0,0,0);add(new T.ShapeGeometry(seShape(sc_[0])),TR,0,0,sc_[0].z+.01)}
else{const fg=new T.LatheGeometry(new T.SplineCurve(s.pf.map(([t,r])=>new T.Vector2(r*Rr,t*L))).getSpacedPoints(120),40).rotateX(-PI/2).translate(0,0,L/2),p=fg.attributes.position,t0=L*.3,n0=-L/2+L*.12;
for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i);const z=p.getZ(i);if(z>t0)y+=Rr*(s.up||0)*Math.pow((z-t0)/(L/2-t0),1.6);if(z<n0&&k!=2)y-=Rr*.1*Math.pow((n0-z)/(L*.12),2);p.setXY(i,x,y)}fg.computeVertexNormals();add(fg,FM,0,0,0)}}
if(k==1)add(new T.SphereGeometry(1,24,12),PA,0,-Rr*.82,-1).scale.set(2.4,.55,7.5);
const wset=(W,tk,cs,pr)=>[1,-1].map(sd=>{const[b,c0,c1,sw,y,z,d]=W,wg=new T.Group();wg.position.set(0,y,z);wg.scale.x=sd;wg.rotation.z=(d||0)*sd;g.add(wg);const R0=new T.Vector3(),T0=new T.Vector3(b/2,0,sw);
add(lsurf(R0,T0,c0,c1,tk[0],tk[1],YA,pr),PA,0,0,0,wg);const o={wg};for(const[nm,f0,f1,cf]of cs)o[nm]=csurf(wg,PA,R0,T0,c0,c1,tk[0],tk[1],YA,pr,f0,f1,cf);return o});
const WS=wset(s.w,s.tk,[['flap',.12,.45,.28],['ail',.58,.9,.3]],AF),TS=wset(s.ts,[.1,.09],s.ab?[]:[['elev',.08,.92,.36]],AFS);CS.ail=WS.map(o=>o.ail);CS.flap=WS.map(o=>o.flap);CS.elev=TS.map(o=>o.elev).filter(Boolean);if(s.ab)CS.stab=TS.map(o=>o.wg);
{const[h,c,z,y,cant,tw]=s.fin;let FT=FN;if(k==1){FT=FN.clone();FT.color.set(0xffffff);if(!LV.fin)LV.fin=tex(cv(256,512,f=>{f.fillStyle='#173f86';f.fillRect(0,0,256,512);[['#3f8fd8',0],['#eaf3fb',70],['#f0b323',112],['#3f8fd8',140]].forEach(([col,o])=>{f.fillStyle=col;f.beginPath();f.moveTo(0,512-o);f.lineTo(256,200-o*1.4);f.lineTo(256,240-o*1.4);f.lineTo(0,512-o+34);f.fill()})}));FT.map=LV.fin}
(tw?[-.85,.85]:[0]).forEach(x=>{const ho=new T.Group();ho.position.set(x,y,z);ho.rotation.z=-cant*Math.sign(x||1);g.add(ho);const R0=new T.Vector3(),T0=new T.Vector3(0,h,c*.5),ft=s.ftk||[.11,.09],fg=lsurf(R0,T0,c,c*.4,ft[0],ft[1],NX,AFS),p=fg.attributes.position,uv=[];
for(let i=0;i<p.count;i++)uv.push(p.getZ(i)/c,p.getY(i)/h);fg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));add(fg,FT,0,0,0,ho);CS.rud.push(csurf(ho,FN,R0,T0,c,c*.4,ft[0],ft[1],NX,AFS,.06,.9,.3))})}
const gr=s.gear,mk=(x,y,z,tw)=>{const p=new T.Group();p.position.set(x,y,z);g.add(p);const len=gr.len,r=gr.r;add(new T.CylinderGeometry(Math.max(.04,r*.14),Math.max(.05,r*.17),len,10),MT,0,-len/2,0,p);
const w=new T.Group();w.position.y=-len;p.add(w);if(tw==2)add(new T.BoxGeometry(r*.3,r*.3,r*2.9),MT,0,0,0,w);(tw==2?[[-1,-1],[1,-1],[-1,1],[1,1]]:tw?[[-1,0],[1,0]]:[[0,0]]).forEach(([o,oz])=>{const t=add(new T.CylinderGeometry(r,r,r*.55,24).rotateZ(PI/2),TR,o*r*.62,0,oz*r*1.15,w);add(new T.CylinderGeometry(r*.55,r*.55,r*.58,12).rotateZ(PI/2),MT,0,0,0,t);CS.wh.push(t)});
if(s.fixed)add(new T.SphereGeometry(1,18,10),PA,0,r*.25,0,w).scale.set(r*.75,r*.85,r*1.9);return{p,w,len}};
CS.G={n:mk(0,gr.y,gr.nz,Math.min(gr.tw,1)),r:mk(gr.mx,gr.y,gr.z,gr.tw),l:mk(-gr.mx,gr.y,gr.z,gr.tw)};
/* retractable gear: bay doors open, legs swing in, doors close (and the reverse) driven by one sequence value gq */
if(!s.fixed){const r=gr.r,am=gr.am||PI/2,an=gr.an||PI/2,WL=new T.MeshBasicMaterial({color:0x0b0c0e});CS.doors=[];
[1,-1].forEach(sd=>{const sx=gr.mx-gr.len*Math.sin(am),sy=gr.y-gr.len*Math.cos(am),xi=Math.max(.05,sx-r*1.15),wd=gr.mx+.2-xi,dp=r*2.5+(gr.tw==2?r*2.4:gr.tw?.25:0),h=new T.Group();h.position.set(sd*xi,sy-r-.05,gr.z);g.add(h);
add(new T.BoxGeometry(wd,.05,dp).translate(sd*wd/2,0,0),PA,0,0,0,h);CS.doors.push([h,-sd]);add(new T.PlaneGeometry(wd*.92,dp*.9).rotateX(PI/2),WL,sd*(xi+wd/2),sy+r*.75,gr.z).castShadow=false});
const nzS=gr.nz+gr.len*Math.sin(an),nyS=gr.y-gr.len*Math.cos(an),nw=r*(gr.tw?1.5:1.15),ndp=Math.abs(nzS-gr.nz)+r*2.4,nzc=(nzS+gr.nz)/2;
[1,-1].forEach(sd=>{const h=new T.Group();h.position.set(sd*nw,nyS-r-.05,nzc);g.add(h);add(new T.BoxGeometry(nw,.05,ndp).translate(-sd*nw/2,0,0),PA,0,0,0,h);CS.doors.push([h,sd*.97])});
add(new T.PlaneGeometry(nw*1.9,ndp*.9).rotateX(PI/2),WL,0,nyS+r*.75,nzc).castShadow=false;
const sp=gr.sp||0,dc=gr.dc||.8;CS.pose=gq=>{const gp=sm(.22,.9,gq),dO=sm(0,.22,gq)*(1-dc*sm(.92,1,gq)),G_=CS.G,a_=lp(-am,sp,gp);G_.n.p.rotation.x=-(1-gp)*an;G_.r.p.rotation.z=a_;G_.l.p.rotation.z=-a_;[G_.n,G_.r,G_.l].forEach(o=>o.p.visible=gp>.01);CS.doors.forEach(([h,k])=>{h.rotation.z=k*dO*1.5;h.visible=dO>.01})};CS.pose(1)}
if(s.prop){[1,-1].forEach(sd=>{add(new T.CylinderGeometry(.04,.04,2.9,8),MT,sd*1.9,.1,-1.3).rotation.z=-sd*1.107});const n=-L/2-.02;add(new T.ConeGeometry(.17,.5,16).rotateX(-PI/2),MT,0,0,n-.2);const pg=new T.Group();pg.position.set(0,0,n-.02);g.add(pg);
const bs=new T.Shape();bs.moveTo(-.05,.08);bs.quadraticCurveTo(-.12,.5,-.06,.98);bs.lineTo(.03,1);bs.quadraticCurveTo(.09,.5,.06,.08);bs.lineTo(-.05,.08);const bg=new T.ExtrudeGeometry(bs,{depth:.025,bevelEnabled:false}).translate(0,0,-.0125);
[0,PI].forEach(r=>{const b=add(bg,TR,0,0,0,pg);b.rotation.z=r;b.rotation.y=.25});CS.prop=pg;
CS.blur=add(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.1,side:T.DoubleSide,depthWrite:false}),0,0,n-.05);CS.blur.scale.setScalar(.97);CS.blur.castShadow=false;
add(new T.SphereGeometry(1,20,10,0,PI*2,0,PI/2),GL,0,.42,-1.0).scale.set(.6,.5,1.25)}
if(s.eng){const[ex,ey,ez,el,er]=s.eng,NC=mat(0xdfe3e8,.3,.35),[wb,c0,c1,wsw,wy,wz,wd]=s.w;[1,-1].forEach(sd=>{const X=ex*sd;
add(new T.LatheGeometry([[.55,0],[.7,.06],[.88,.25],[.98,.5],[1,.72],[.97,.9],[.9,1]].map(([r,t])=>new T.Vector2(r*er,t*el)),36).rotateX(-PI/2),NC,X,ey,ez);
add(new T.CylinderGeometry(er*.86,er*.8,el*.35,28,1,true).rotateX(PI/2),TRD,X,ey,ez-el*.83);add(new T.TorusGeometry(er*.9,.06*er,8,36),MT,X,ey,ez-el+.02);
const f=new T.Group();f.position.set(X,ey,ez-el*.72);g.add(f);add(new T.CircleGeometry(er*.86,36),FANM,0,0,0,f).rotation.y=PI;CS.fans.push(f);add(new T.ConeGeometry(er*.26,er*.7,20).rotateX(-PI/2),mat(0xf0f0f0,.3,.4),0,0,-er*.35,f);
add(new T.ConeGeometry(er*.48,el*.32,20).rotateX(PI/2),mat(0x3d4046,.45,.85),X,ey,ez+el*.16);add(new T.CylinderGeometry(er*.56,er*.62,el*.12,24,1,true).rotateX(PI/2),TRD,X,ey,ez+.02);
const ws=Math.abs(X)/(wb/2),wle=wz+wsw*ws,wyy=wy+(wd||0)*Math.abs(X);add(lsurf(new T.Vector3(X,ey+er*.8,ez-el*.85),new T.Vector3(X,wyy,wle-.4),el*1.05,lp(c0,c1,ws)*.7,.12,.1,NX,AFS,0),PA,0,0,0)});
[.6,-.6].forEach(o=>{const w=add(new T.BoxGeometry(.6,.35,.05),GL,o,.75,-L/2+3.6);w.rotation.y=-o*.8});
WS.forEach(o=>{const[b,,c1,sw]=s.w,wl=new T.Group();wl.position.set(b/2-.05,0,sw+c1*.05);wl.rotation.z=-.22;o.wg.add(wl);add(lsurf(new T.Vector3(),new T.Vector3(0,1.9,c1*.75),c1*.95,c1*.42,.1,.09,NX,AFS),FN,0,0,0,wl)})}
if(s.ab){const CAN=new T.MeshPhysicalMaterial({color:0x3a3222,metalness:.5,roughness:.04,transparent:true,opacity:.55,clearcoat:1}),NZM=new T.MeshStandardMaterial({map:NZT,metalness:.8,roughness:.45,side:T.DoubleSide});CS.gl=[];CS.ng=[];
add(new T.SphereGeometry(1,28,14,0,PI*2,0,PI/2),CAN,0,.66,-3.9).scale.set(.5,.52,2.05);add(new T.TorusGeometry(1,.035,6,24,PI),FN,0,.66,-3.25).scale.set(.5,.52,1);
const pl=new T.Group();g.add(pl);CS.pilot=pl;add(new T.SphereGeometry(.16,14,10),mat(0xd8dadc,.4,.2),0,.98,-3.55,pl);add(new T.BoxGeometry(.5,.62,.14),mat(0x2a2c30,.8,.1),0,.82,-3.1,pl);
[1,-1].forEach(sd=>{add(tube([[1.6,1.15,-.05,.3,.38],[-.4,1.3,-.08,.38,.42],[-2.2,1.42,-.1,.42,.45],[-3.3,1.45,-.1,.43,.46]].map(([z,x,y,w,h])=>({x:x*sd,y,z,w,h,n:5,b:1,v:0})),24),PA,0,0,0);add(new T.BoxGeometry(.8,.86,.05),TR,1.45*sd,-.1,-3.15);
const lg=new T.Group();lg.scale.x=sd;g.add(lg);add(lsurf(new T.Vector3(.8,.16,-3.7),new T.Vector3(1.75,.06,.1),4.4,.5,.04,.03,YA,AFS,0),PA,0,0,0,lg)});
const AB=(c,o)=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:T.AdditiveBlending,depthWrite:false});
[.62,-.62].forEach(x=>{add(new T.LatheGeometry([[.56,0],[.53,.5],[.48,.95],[.45,1.15],[.49,1.55]].map(([r,t])=>new T.Vector2(r,t)),24).rotateX(PI/2),NZM,x,.05,7.9);add(new T.CircleGeometry(.45,20),TR,x,.05,8.6);
const gd=add(new T.CircleGeometry(.43,20),AB(0xff8a3a,.2),x,.05,8.65);gd.castShadow=false;CS.ng.push(gd);
const ag=new T.Group();ag.position.set(x,.05,9.45);g.add(ag);CS.gl.push(ag);[add(new T.ConeGeometry(.44,4.2,14,1,true).rotateX(PI/2).translate(0,0,2.1),AB(0xff7a30,.55),0,0,0,ag),add(new T.ConeGeometry(.28,2.6,12,1,true).rotateX(PI/2).translate(0,0,1.3),AB(0xfff0c0,.8),0,0,0,ag)].forEach(o=>o.castShadow=false);
for(let j=0;j<3;j++){const d=add(new T.SphereGeometry(.16,10,8),AB(0xffd8a0,.7),0,0,.7+j*.75,ag);d.scale.set(1,1,1.6);d.castShadow=false}});
const MS=vm({roughness:.45,metalness:.2});[[5.15,-.05,4.9],[-5.15,-.05,4.9],[3,-.5,4.2],[-3,-.5,4.2],[.72,-.62,1.4],[-.72,-.62,1.4],[.72,-.62,-1.8],[-.72,-.62,-1.8]].forEach(([x,y,z],i)=>{add(MSLG,MS,x,y,z);if(i==2||i==3)add(new T.BoxGeometry(.1,.34,1.4),PA,x,y+.25,z)});
add(new T.CylinderGeometry(.015,.03,1,6).rotateX(PI/2),MT,0,-.12,-9.05)}
CS.li=[];const lpP=[],li=(c,x,y,z,st)=>{const m=add(new T.SphereGeometry(Math.max(.07,s.sc*.045),8,6),new T.MeshBasicMaterial({color:c}),x,y,z);m.castShadow=false;CS.li.push([m,st,new T.Color(c)]);lpP.push(x,y,z)};
{const[wb,,c1,sw,wy,wz,d]=s.w,tipY=wy+(d||0)*wb/2+.1,tipZ=wz+sw+c1*.5;li(0xff2020,-wb/2,tipY,tipZ,0);li(0x20ff40,wb/2,tipY,tipZ,0);li(0xffffff,-wb/2,tipY,tipZ+c1*.4,1);li(0xffffff,wb/2,tipY,tipZ+c1*.4,1);li(0xffffff,0,s.fin[3]+s.fin[0]*.95,s.fin[2]+s.fin[1]*.85,0);
if(s.jet&&!s.ab){li(0xff2a1a,0,Rr*1.02,-1,2);li(0xff2a1a,0,-Rr*1.02,1,2)}}
if(!park){CS.lp=new T.Points(ptsGeo(lpP,new Array(lpP.length).fill(0)),new T.PointsMaterial({size:s.sc*1.1,map:LM.map,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));g.add(CS.lp);
const ck=new T.Group(),[ey,ez]=s.cock,DK=mat(0x16181b,.9,.05),FR=mat(0x2a2d31,.6,.3),PN=mat(0x22262b,.8,.1);ck.visible=false;g.add(ck);CS.ck=ck;
const bxk=(w,h,d,x,y,z,m,rx=0,rz=0)=>{const o=add(new T.BoxGeometry(w,h,d),m,x,y,z,ck);o.castShadow=false;o.rotation.set(rx,0,rz);return o};
/* d: eye to glareshield, dep: glareshield below the eye line (over-nose view), hw: cockpit half width, pa: windshield pillar angle, up: roof frame angle */
const C=[{d:.78,dep:17,hw:.62,pa:40,up:27},{d:1.15,dep:22,hw:1.55,pa:43,up:27},{d:.72,dep:20,hw:.52,pa:0,up:0}][k],rd=PI/180,gy=ey-C.d*Math.tan(C.dep*rd),gz=ez-C.d;
bxk(C.hw*2,.05,.34,0,gy-.025,gz+.17,DK);bxk(C.hw*2,.95,.06,0,gy-.52,gz+.03,PN,.28);bxk(C.hw*2,.03,.03,0,gy-.01,gz+.33,FR);
if(C.pa){const top=ey+C.d*Math.tan(C.up*rd);for(const sd of[1,-1]){const px=sd*Math.min(C.hw,C.d*Math.tan(C.pa*rd));bxk(.04,top-gy,.05,px,(top+gy)/2,gz,FR,0,-sd*.2)}bxk(C.hw*2,.05,.07,0,top,gz,FR)}
if(k==2){const hm=new T.MeshBasicMaterial({color:0x7fffb0,transparent:true,opacity:.07,depthWrite:false,side:T.DoubleSide}),h=add(new T.PlaneGeometry(.17,.14),hm,0,gy+.085,gz-.05,ck);h.rotation.x=-.25;h.castShadow=false;
bxk(.18,.012,.012,0,gy+.155,gz-.065,FR);for(const sd of[1,-1])bxk(.01,.14,.01,sd*.088,gy+.085,gz-.05,FR,-.25)}}
if(!park&&s.sz)g.scale.setScalar(s.sz);g.userData=CS;return g}
/* ---------- state ---------- */
const P={pos:new T.Vector3(),vel:new T.Vector3(),q:new T.Quaternion(),pr:0,rr:0,yr:0,pI:0,rI:0,yI:0,kp:0,kr:0,ky:0,thr:0,eng:0,gT:1,gp:1,gq:1,fl:1,flT:1,gnd:1,air:0,st:0,imp:0,cp:0,nz:1,crashed:0};
const K={},WX={w:[5,9,12,16,26],g:[1,2,4,6,14],dir:[350,320,300,290,270],turb:[0,.05,.12,.25,.7],vis:[42000,32000,18000,7000,3500],cn:[6,40,100,110,125],cw:[0,.2,.55,.75,1],rain:[0,0,0,.6,1]};
const SEL={ac:0,ap:0,loc:0,wx:0,tod:1,ctl:0,ql:2},TODH=[6.4,11,17.6,23];let mode='menu',A=SPEC[0],M,wx=0,tod=11,tt=0,shake=0,cm=0,mx=0,my=0,mz=150,flash=0,fT=5,LRT=0,dst=0,ctl=0,HUD=1,PERF=0,camInit=0;
/* sky IBL is strong; matte surfaces only take a fraction so the direct sun still shapes them */
const envI=o=>o.traverse(m=>{m=m.material;if(m&&m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial&&m!==WMAT&&m!==RMAT&&m.metalness<.5)m.envMapIntensity=.35});
function sized(s){const f=s.sz||1;if(f===1)return s;const o=Object.assign({},s),m=v=>v*f,f2=f*f,fr=Math.pow(f,-.4);o.L*=f;o.R*=f;o.sc*=f;o.gh*=f;o.w=s.w.map((v,i)=>i==6?v:v*f);o.ts=s.ts.map((v,i)=>i==6?v:v*f);o.fin=s.fin.map((v,i)=>i<4?v*f:v);o.cock=s.cock.map(m);if(s.eng)o.eng=s.eng.map(m);
o.gear=Object.assign({},s.gear);for(const k of['mx','y','z','len','r','nz'])o.gear[k]*=f;o.m*=f2;o.S*=f2;o.T0*=f2;o.pr*=fr;o.rr*=fr;o.yr*=fr;return o}
function setAC(k){if(M)S.remove(M);A=sized(SPEC[k]);M=build(k);envI(M);S.add(M)}
function reset(l=SEL.loc){clearDebris();P.bn=0;P.lw=P.ls=0;TRAIL.length=0;const a=A,q=AP[SEL.ap],rw=q.runways[0],[sx,sz]=q.toW(rw.x,rw.z+rw.L/2-250);P.q.setFromAxisAngle(YA,q.ry);P.vel.set(0,0,0);P.pos.set(sx,HM(sx,sz)+a.gh,sz);P.gnd=1;P.thr=P.eng=0;P.gT=P.gp=P.gq=1;P.fl=P.flT=1;P.air=0;P.crashed=0;P.st=0;P.imp=P.pr=P.rr=P.yr=P.pI=P.rI=P.yI=P.kp=P.kr=P.ky=0;P.nz=1;camInit=0;
if(l==1){const g=q.gate,[gx,gz]=q.toW(g.x,g.z);P.pos.set(gx,HM(gx,gz)+a.gh,gz);P.q.setFromAxisAngle(YA,q.ry+g.ry)}
if(l==2){const[x,z]=q.toW(rw.x,rw.z+rw.L/2+5000);P.pos.set(x,Math.max(q.el+275,HM(x,z)+150),z);P.vel.set(-Math.sin(q.ry)*a.vapp,-2,-Math.cos(q.ry)*a.vapp);P.q.setFromEuler(new T.Euler(-.03,q.ry,0,'YXZ'));P.gnd=0;P.thr=P.eng=.35;P.fl=P.flT=a.jet?3:2;P.air=9}
if(typeof terrainUpdate==='function'&&TCHK.length)terrainUpdate(P.pos.x,P.pos.y,P.pos.z,14);
$('crash').style.display='none';if(mode==='crash')mode='fly'}
const WV=new T.Vector3();function windV(){const s=(WX.w[wx]+WX.g[wx]*(vn(tt*.3,7)-.4)*2)*.5144,t=WX.dir[wx]*PI/180;return WV.set(-Math.sin(t)*s,0,Math.cos(t)*s)}
/* ---------- input: ramped keyboard, mouse yoke, gamepad ---------- */
const ramp=(c,t,dt,up,dn)=>{const r=t===0||c*t<0?dn:up,d=t-c;return c+Math.sign(d)*Math.min(Math.abs(d),r*dt)},kc=x=>x*(.3+.7*Math.abs(x)),GB={};
const GPR={};function pad(){const ps=navigator.getGamepads?navigator.getGamepads():[];let g=null;for(const q of ps)if(q&&q.connected&&q.mapping==='standard'){g=q;break}if(!g)return null;
const rs=GPR[g.index]||(GPR[g.index]={ax:g.axes.slice(),bt:g.buttons.map(b=>b.value),on:0});if(!rs.on){if(g.axes.some((v,i)=>Math.abs(v-rs.ax[i])>.35)||g.buttons.some((b,i)=>Math.abs(b.value-rs.bt[i])>.5))rs.on=1;else{P.gpT=0;P.gpB=0;return null}}
const ax=i=>{const v=g.axes[i]||0,s=Math.abs(v);return s<.1?0:Math.sign(v)*Math.pow((s-.1)/.9,1.6)},bt=i=>g.buttons[i]?g.buttons[i].value:0,ed=i=>{const v=bt(i)>.5,e=v&&!GB[i];GB[i]=v;return e};
if(ed(9))togglePause();if(mode!=='fly'&&mode!=='crash')return null;if(ed(1))setCam((cm+1)%4);if(ed(2)){P.flT=(P.flT+1)%4;bump(500,.2,.5)}if(ed(3)&&!A.fixed){P.gT=P.gT?0:1;bump(200,.3,.8);bump(420,.1,1/(A.grs||.25));banner(P.gT?'GEAR DOWN':'GEAR UP')}
P.gpB=bt(0)>.5;P.gpT=bt(7)-bt(6);if(Math.abs(g.axes[2]||0)>.15||Math.abs(g.axes[3]||0)>.15){mx=g.axes[2];my=g.axes[3]}else mx=my=0;return{p:ax(1),r:ax(0),y:bt(5)-bt(4)}}
function inputs(dt){const a=A,up=a.ir||2.6,gp=pad();
const sh=K.ShiftLeft||K.ShiftRight;if(sh){if(K.KeyW)P.lw=1;if(K.KeyS)P.ls=1}if(!K.KeyW)P.lw=0;if(!K.KeyS)P.ls=0;
P.kp=ramp(P.kp,(K.KeyS&&!sh&&!P.ls||K.ArrowDown?1:0)-(K.KeyW&&!sh&&!P.lw||K.ArrowUp?1:0),dt,up,5);P.kr=ramp(P.kr,(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0),dt,up*1.2,16);P.ky=ramp(P.ky,(K.KeyE?1:0)-(K.KeyQ?1:0),dt,up,5);
let p=kc(P.kp),r=kc(P.kr),y=kc(P.ky);if(gp){p+=gp.p;r+=gp.r;y+=gp.y}
const s=Math.min(1,dt*14);P.pI+=(cl(p,-1,1)-P.pI)*s;P.rI+=(cl(r,-1,1)-P.rI)*Math.min(1,dt*24);P.yI+=(cl(y,-1,1)-P.yI)*s}
/* ---------- flight model ---------- */
function phys(dt){if(P.crashed)return;const a=A,q=P.q,tb=WX.turb[wx],BRK=K.KeyB||K.Space||P.gpB;
const sh=K.ShiftLeft||K.ShiftRight;P.thr=cl(P.thr+dt*.5*((K.KeyW&&(sh||P.lw)||K.PageUp||K.KeyZ?1:0)-(K.KeyS&&(sh||P.ls)||K.PageDown||K.KeyX?1:0))+dt*.5*(P.gpT||0),0,1);P.eng+=(P.thr-P.eng)*Math.min(1,dt*(a.sp||(a.jet?.7:2.5)));
if(!a.fixed){const r=a.grs||.25,o=P.gq;P.gq+=cl(P.gT-P.gq,-dt*r,dt*r);if(o!==P.gq&&(P.gq===0||P.gq===1))bump(110,.6,.35);P.gp=sm(.22,.9,P.gq)}else P.gp=1;P.fl+=cl(P.flT-P.fl,-dt*1.2,dt*1.2);
const vb=V1.copy(P.vel).sub(windV()).applyQuaternion(Q1.copy(q).invert()),V=vb.length(),vf=-vb.z,vu=vb.y,al=V>2?Math.atan2(-vu,vf):0,be=V>2?Math.asin(cl(vb.x/V,-1,1)):0,sig=Math.exp(-P.pos.y/8500),qd=.5*1.225*sig*V*V,aa=Math.abs(al),f3=P.fl/3,cf=a.cfl*f3;
let CL=a.CL0+cf+a.CLa*cl(al,-a.aS,a.aS);if(aa>a.aS)CL*=Math.max(.3,1-(aa-a.aS)*2.2);const agl=P.pos.y-HM(P.pos.x,P.pos.z)-a.gh,ge=P.gnd?0:cl(1-agl/(a.w[0]*.55),0,1);const gl=1+.07*ge*ge;CL*=gl;P.st=!P.gnd&&aa>a.aS*.96&&V>8;P.V=V;P.al=al;P.qd=qd;P.nz=lp(P.nz,qd*a.S*CL/(a.m*9.81),Math.min(1,dt*6));
const CD=a.CD0+a.k*CL*CL*(1-.45*ge)+a.cdfl*f3+(a.fixed?0:.03*P.gp*(a.jet?1.4:1))+(a.jet?.05*sm(230,340,V):0)+(P.st?.15+aa*.4:0)+.6*be*be+(BRK&&!P.gnd?.02:0);
const hy=Math.hypot(vf,vu)||1,F=V2.set(0,vf/hy,vu/hy).multiplyScalar(qd*a.S*CL);if(V>.5)F.addScaledVector(vb,-qd*a.S*CD/V);F.x+=-be*qd*a.S*1.1;
F.z-=P.eng*a.T0*(a.ab&&P.eng>.9?1.35:1)*Math.max(0,1-V/a.Tv)*(a.jet?Math.pow(sig,.75):sig);F.applyQuaternion(q);F.y-=9.81*a.m;P.vel.addScaledVector(F,dt/a.m);P.vel.y+=(rnd()-.5)*tb*dt*25;
const eff=cl(V*V/(a.vref*a.vref),.06,1.35)/(1+Math.pow(V/(a.vref*2.4),2));
if(!P.gnd){const upY=V3.set(0,1,0).applyQuaternion(q).y,rgt=V4.set(1,0,0).applyQuaternion(q).y,lf=upY>0?1/lp(1,Math.max(.5,upY),.6):1,need=qd>50?a.m*9.81*lf/(qd*a.S*gl):9,trim=cl((need-a.CL0-cf)/a.CLa,-.03,a.aS*.62);
const pt=P.pI*a.pr*eff*(P.st?.4:1)*(P.pI>0?(1-.85*sm(a.aS*.7,a.aS*.95,al)):1)+(trim-al)*a.st*Math.min(1,V/25)-(P.st?.45:0)+(rnd()-.5)*tb*.5,rt=P.rI*a.rr*eff*(P.st?.5:1)+(rnd()-.5)*tb*1.2+rgt*.25*(1-Math.abs(P.rI)),
yt=P.yI*a.yr*eff+be*a.ys-rgt*Math.min(1.2,9.81/Math.max(V,25))*.65*(upY>0?1:0);
if(P.gp>.9&&agl<a.w[0]*1.5&&P.vel.y<-.5)P.lm=1;if(P.gp<.9||agl>a.w[0]*1.8)P.lm=0;const lmw=P.lm?1-sm(a.w[0]*.5,a.w[0]*1.5,agl):0,th=Math.asin(cl(V5.set(0,0,-1).applyQuaternion(q).y,-1,1)),ptL=(.02+P.pI*(P.pI>0?.09:.05)-th)*1.7-(P.st?.45:0),ptF=lp(pt,ptL,lmw);
const ar=a.ar||4;P.pr+=(ptF-P.pr)*Math.min(1,dt*ar);P.rr+=(rt-P.rr)*Math.min(1,dt*ar*3.4);P.yr+=(yt-P.yr)*Math.min(1,dt*ar*.8);
const w=V3.set(P.pr,-P.yr,-P.rr).multiplyScalar(dt),m=w.length();if(m>1e-7)q.multiply(Q2.setFromAxisAngle(w.divideScalar(m),m));q.normalize()}
P.pos.addScaledVector(P.vel,dt);const px=P.pos.x,pz=P.pos.z,gy=HM(px,pz)+a.gh*(P.gp>.5?1:.4),hs=Math.hypot(P.vel.x,P.vel.z);
if(bldHit(px,pz,P.pos.y-a.gh*.6))return crash('Collision with a structure');{const wl=waterAt(px,pz);if(wl>-1e3&&wl>HM(px,pz)+.3&&P.pos.y-a.gh*(P.gp>.5?1:.4)<wl-.2&&apAt(px,pz)<0)return crash(hs>12?'Ditched in the water':'Aircraft sank')}
if(P.air>1.5)P.bn=0;
if(P.pos.y<=gy){const e=new T.Euler().setFromQuaternion(q,'YXZ'),ux=hs>.5?P.vel.x/hs:0,uz=hs>.5?P.vel.z/hs:0,sl=(HM(px+ux*4,pz+uz*4)-HM(px-ux*4,pz-uz*4))/8,vs=-P.vel.y+hs*Math.max(0,sl);let pi=e.x,ya=e.y,ro=e.z;
if(!P.gnd){if(hs>12&&(sl>.3||hs>Math.max(a.vapp*1.8,60)))return crash('Impact with terrain');if(P.gp<.8&&hs>8)return crash(apAt(px,pz)>=0?'Landing gear not extended':'Impact with terrain');if(vs>a.crashV*1.3)return crash('Hard landing: '+(vs*196.85|0)+' ft/min');
if(vs>a.crashV*.85&&!P.bn&&Math.abs(ro)<.5){P.bn=1;if(P.air>2)land(vs,hs,pi);P.pos.y=gy;P.vel.y=vs*.28;shake=Math.max(shake,1.1);bump(220,.9,.7);tire(20);P.imp=1.2;P.air=0;return}if(Math.abs(ro)>.5||pi<-.2&&hs>25)return crash('Wing or nose strike');
if(P.air>2)land(vs,hs,pi);P.imp=Math.min(1.2,vs*.15);shake=Math.max(shake,cl(vs/2.5,0,1)*.7);bump(300,.6,.5);if(vs>.4)tire(cl(vs*6,4,24))}
P.gnd=1;P.air=0;P.lm=0;P.pos.y=gy;P.vel.y=0;ro*=Math.max(0,1-dt*6);
if(P.pI>.03)pi+=P.pI*a.pr*eff*dt;else pi-=dt*.18*(pi>0?1:0);pi=cl(pi,0,.24);
ya-=(P.yI+.25*P.rI)*dt*(a.steer*Math.min(1,hs/5)/(1+hs/25)+a.yr*eff*.4);q.setFromEuler(new T.Euler(pi,ya,ro,'YXZ'));
const c=Math.cos(ya),s=Math.sin(ya),fx=-s,fz=-c,rx=c,rz=-s;let vF=P.vel.x*fx+P.vel.z*fz,vR=(P.vel.x*rx+P.vel.z*rz)*Math.exp(-dt*8);
const mu=apAt(px,pz)>=0?.02:.08,br=BRK?a.br:0;vF-=Math.sign(vF)*Math.min(Math.abs(vF),(mu*9.81+br)*dt);if(P.eng<.06&&Math.abs(vF)<.35){vF=0;vR=0}P.vel.set(fx*vF+rx*vR,0,fz*vF+rz*vR);P.vF=vF;
if(br&&hs>20&&rnd()<.3)tire(2)}else{P.gnd=0;P.air+=dt}}
function tire(n){const g=A.gear;for(let i=0;i<n;i++)[1,-1].forEach(sd=>{const w=V5.set(g.mx*sd,-A.gh+.3,g.z).applyQuaternion(P.q).add(P.pos);SMK.emit(w.x,w.y,w.z,(rnd()-.5)*3+P.vel.x*.2,rnd()*2,(rnd()-.5)*3+P.vel.z*.2,2.5,1.5,7,.35)})}
function land(vs,hs,pi){const ai=apAt(P.pos.x,P.pos.z),a_=AP[Math.max(ai,0)],[lx,lz]=a_.toL(P.pos.x,P.pos.z),f=vs*196.85;let o=1e9,on=false;for(const r of a_.runways){const d=Math.abs(lx-r.x);if(d<o)o=d;if(ai>=0&&d<r.W/2&&Math.abs(lz-r.z)<r.L/2)on=true}const q=f<160?'SMOOTH':f<350?'FIRM':f<600?'HARD':'SEVERE',L=$('land');
L.innerHTML=`<b style="color:var(--ac);letter-spacing:.25em">LANDING RESULT</b><br>Vertical speed &nbsp;<b>-${f|0} ft/min</b><br>Centerline offset &nbsp;<b>${o<1e4?o.toFixed(1)+' m':'—'}</b><br>Touchdown speed &nbsp;<b>${hs*1.944|0} kt</b><br>Pitch &nbsp;<b>${(pi*57.3).toFixed(1)}°</b><br>${on?a_.short+' · ':'Off runway · '}<b>${q}</b>`;L.style.opacity=1;clearTimeout(LRT);LRT=setTimeout(()=>L.style.opacity=0,9000)}
function crash(r){if(P.crashed)return;P.crashed=1;mode='crash';shake=2;bump(150,1,1.5);for(let i=0;i<50;i++){SPK.emit(P.pos.x,P.pos.y,P.pos.z,(rnd()-.5)*60,rnd()*40,(rnd()-.5)*60,1.2,3,.5,1);DBR.emit(P.pos.x,P.pos.y+1,P.pos.z,(rnd()-.5)*30,rnd()*20,(rnd()-.5)*30,10,4,30,.7)}
for(let i=0;i<25;i++)SMK.emit(P.pos.x,P.pos.y+1,P.pos.z,(rnd()-.5)*8,rnd()*10,(rnd()-.5)*8,8,10,60,.6);shatter();P.vel.multiplyScalar(0);P.V=0;$('cr').textContent=r;setTimeout(()=>{if(P.crashed)$('crash').style.display='flex'},2600)}
/* break-up: every part of the aircraft becomes a tumbling piece (pivoted at its own centre), plus skin shards; pieces bounce, slide and smoke */
const DEB=[];let debG=null,shards=null;const SHG=merge([[new T.BoxGeometry(1,.06,1),new T.Matrix4()]]);
function clearDebris(){if(debG){S.remove(debG);debG=null}if(shards){S.remove(shards);shards=null}DEB.length=0;if(M)M.visible=true}
function shatter(){clearDebris();debG=new T.Group();S.add(debG);M.updateMatrixWorld(true);const v0=P.vel.clone(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),c=new T.Vector3(),sc=A.sc;
M.traverse(o=>{if(!o.isMesh)return;for(let t=o;t;t=t.parent)if(!t.visible)return;if(o.material.transparent&&o.material.isMeshBasicMaterial)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();o.geometry.boundingBox.getCenter(c);
o.matrixWorld.decompose(p,q,s);const wc=c.clone().applyMatrix4(o.matrixWorld),pv=new T.Group();pv.position.copy(wc);pv.quaternion.copy(q);const m=new T.Mesh(o.geometry,o.material);m.scale.copy(s);m.position.set(-c.x*s.x,-c.y*s.y,-c.z*s.z);m.castShadow=true;pv.add(m);debG.add(pv);
const sz=o.geometry.boundingBox.getSize(p).multiply(s),r=Math.max(.15,Math.min(sz.x,sz.y,sz.z)*.5),out=wc.clone().sub(P.pos);out.y=Math.max(out.y,.2*sc);const l=out.length()||1,big=Math.max(sz.x,sz.y,sz.z);
DEB.push({o:pv,r,v:v0.clone().multiplyScalar(.25+rnd()*.45).addScaledVector(out,(3+rnd()*9)/l).add(V5.set((rnd()-.5)*6,3+rnd()*9,(rnd()-.5)*6)),w:new T.Vector3((rnd()-.5),(rnd()-.5),(rnd()-.5)).multiplyScalar(14/Math.sqrt(1+big)),rest:0,smoke:big>sc*2&&rnd()<.5?10+rnd()*14:0})});
const n=90;shards=new T.InstancedMesh(SHG,vm({roughness:.4,metalness:.3}),n);shards.castShadow=true;S.add(shards);const col=new T.Color(SPEC[SEL.ac].col);
for(let i=0;i<n;i++){const z=.4+rnd()*1.6*sc;shards.setColorAt(i,col.clone().multiplyScalar(.6+rnd()*.5));DEB.push({sh:i,p:P.pos.clone().add(V5.set((rnd()-.5)*3*sc,(rnd()-.2)*sc,(rnd()-.5)*3*sc)),q:new T.Quaternion().setFromEuler(new T.Euler(rnd()*6,rnd()*6,rnd()*6)),s:z,r:.08,
v:v0.clone().multiplyScalar(.2+rnd()*.5).add(V5.set((rnd()-.5)*30,6+rnd()*22,(rnd()-.5)*30)),w:new T.Vector3((rnd()-.5)*20,(rnd()-.5)*20,(rnd()-.5)*20),rest:0,smoke:0})}
M.visible=false;for(let i=0;i<40;i++)SPK.emit(P.pos.x,P.pos.y,P.pos.z,(rnd()-.5)*40,rnd()*30,(rnd()-.5)*40,1.6,4,.8,1)}
const DQ=new T.Quaternion(),DM=new T.Matrix4(),DS=new T.Vector3();
function debrisU(dt){if(!DEB.length)return;for(const d of DEB){if(d.rest>1.2)continue;const P_=d.o?d.o.position:d.p,Q_=d.o?d.o.quaternion:d.q;d.v.y-=9.81*dt;if(!d.o)d.v.multiplyScalar(1-dt*.35);P_.addScaledVector(d.v,dt);
const wl=Math.max(d.w.length(),1e-6);Q_.premultiply(DQ.setFromAxisAngle(V4.copy(d.w).divideScalar(wl),wl*dt));const g=HM(P_.x,P_.z),wt=waterAt(P_.x,P_.z),sea=wt>g+.3;
if(sea&&P_.y<wt){d.v.multiplyScalar(1-dt*2.5);d.v.y=Math.max(d.v.y,-1.2);d.w.multiplyScalar(1-dt*2);if(P_.y<g+d.r){P_.y=g+d.r;d.rest+=dt}}
else if(P_.y<g+d.r){P_.y=g+d.r;if(d.v.y<0)d.v.y*=-.22;d.v.x*=.55;d.v.z*=.55;d.w.multiplyScalar(.55);if(d.v.lengthSq()<1.5)d.rest+=dt}
if(d.smoke>0){d.smoke-=dt;if(rnd()<.35)SMK.emit(P_.x,P_.y+.5,P_.z,(rnd()-.5)*2,3+rnd()*3,(rnd()-.5)*2,6,3,24,.5)}
if(!d.o){DS.setScalar(d.s);DM.compose(P_,Q_,DS);shards.setMatrixAt(d.sh,DM)}}if(shards)shards.instanceMatrix.needsUpdate=true}
/* ---------- audio ---------- */
let AU,N={};function audioInit(){if(AU)return;AU=new(window.AudioContext||window.webkitAudioContext)();const b=AU.createBuffer(1,AU.sampleRate*2,AU.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1;N.b=b;N.m=AU.createBiquadFilter();N.m.frequency.value=12000;N.m.connect(AU.destination);
const ns=(t,f)=>{const s=AU.createBufferSource();s.buffer=b;s.loop=true;const fl=AU.createBiquadFilter();fl.type=t;fl.frequency.value=f;const g=AU.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(N.m);s.start();return{f:fl,g:g.gain}};
N.w=ns('lowpass',500);N.r=ns('highpass',3500);N.j=ns('bandpass',400);const osc=(ty)=>{const o=AU.createOscillator();o.type=ty;const f=AU.createBiquadFilter();f.frequency.value=420;const g=AU.createGain();g.gain.value=0;o.connect(f);f.connect(g);g.connect(N.m);o.start();return{o,g:g.gain}};N.o=osc('sawtooth');N.s=osc('square');N.s.o.frequency.value=780}
function bump(f,g,d){if(!AU)return;const s=AU.createBufferSource();s.buffer=N.b;const fl=AU.createBiquadFilter();fl.frequency.value=f;const gn=AU.createGain(),t=AU.currentTime;gn.gain.setValueAtTime(g,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(gn);gn.connect(N.m);s.start();s.stop(t+d)}
function audioU(){if(!AU)return;const t=AU.currentTime,on=mode==='fly'||mode==='crash'?1:0,th=P.eng*on*(P.crashed?0:1),V=P.V||0,T_=(g,v)=>g.setTargetAtTime(v,t,.12);N.m.frequency.setTargetAtTime(cm==3?1500:9000,t,.1);
T_(N.w.g,on*cl(V/160,0,1)*.5);N.w.f.frequency.setTargetAtTime(300+V*7,t,.1);T_(N.r.g,on*WX.rain[wx]*.12);
if(A.jet){T_(N.j.g,on*(.03+th*.5));N.j.f.frequency.setTargetAtTime(150+th*900,t,.1);T_(N.o.g,.03*th);N.o.o.frequency.setTargetAtTime(90+th*260,t,.1)}else{T_(N.j.g,.02*th);T_(N.o.g,on*(.04+.1*th)*(P.crashed?0:1));N.o.o.frequency.setTargetAtTime(38+th*55+V*.15,t,.1)}
T_(N.s.g,on&&P.st&&tt%.5<.25?.05:0)}
/* ---------- lighting / weather ---------- */
function lighting(){const a=(tod-6)/24*6.2832,e=Math.sin(a),ce=Math.cos(a),cw=WX.cw[wx];sunD.set(ce*.8,e,.4-ce*.2).normalize();
const dF=sm(-.1,.25,e),ns=1-sm(-.14,.08,e),ss=Math.max(0,1-Math.abs(e)*4.5)*(1-.6*cw);
hor.setRGB(.02,.03,.06).lerp(C1.setRGB(.66,.78,.93),dF).lerp(C2.setRGB(1,.52,.26),ss*.85);zen.setRGB(.004,.008,.025).lerp(C1.setRGB(.12,.3,.7),dF);
const g=C1.setRGB(.55,.58,.62).multiplyScalar(.15+.85*dF);hor.lerp(g,cw*.75);zen.lerp(g,cw*.85);SU.ns.value=ns;SU.fl.value=flash;SU.cw.value=cw;sunC.setRGB(1,.85,.65).lerp(C2.setRGB(1,.5,.25),ss);gndC.setRGB(.16,.19,.13).multiplyScalar(.08+.92*dF);
sun.color.setRGB(1,.96,.9).lerp(C2.setRGB(1,.55,.3),ss);sun.intensity=2.05*sm(-.02,.25,e)*(1-.65*cw);HL.intensity=.2+.28*dF+flash*3;HL.color.setRGB(.75,.84,1).lerp(C1.setRGB(.3,.4,.8),ns);
EMS.forEach(m=>m.emissiveIntensity=ns*.9);
CU.cT.value.setRGB(1,1,1).lerp(C2.setRGB(1,.62,.42),ss*.8).multiplyScalar((.1+.9*dF)*(1-.4*cw));CU.cB.value.copy(hor).lerp(C1.setRGB(.55,.58,.66),.5).multiplyScalar((.15+.55*dF)*(1-.3*cw));
const inC=P.inC||0;S.fog.color.copy(hor).lerp(C1.setRGB(.7,.72,.75).multiplyScalar(.2+.8*dF),inC);S.fog.density=lp(1.55/WX.vis[wx],.0035,inC);sun.position.copy(P.pos).addScaledVector(sunD,700);sun.target.position.copy(P.pos);
RWM.forEach(m=>m.roughness=WX.rain[wx]?.35:.85);$('fog').style.opacity=inC*.55;WU.wt.value=tt;for(const f of LIGHTS)f(ns,dF,WX.rain[wx]);envUpd();return ns}
const RN=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xaabbcc,transparent:true,opacity:.4,fog:false})),RP=new Float32Array(2200*6),RL=new Float32Array(2200*3);
for(let i=0;i<2200;i++){RL[i*3]=(rnd()-.5)*120;RL[i*3+1]=(rnd()-.5)*120;RL[i*3+2]=(rnd()-.5)*120}RN.geometry.setAttribute('position',new T.BufferAttribute(RP,3));RN.frustumCulled=false;S.add(RN);
const SN=320,SKP=new Float32Array(SN*3),STV=new Float32Array(SN*6),SKC=new Float32Array(SN*6),SKL=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false}));
for(let i=0;i<SN;i++){SKP[i*3]=(rnd()-.5)*2;SKP[i*3+1]=(rnd()-.5)*2;SKP[i*3+2]=(rnd()-.5)*2;const b=.35+rnd()*.65;SKC.set([b,b,b,0,0,0],i*6)}
SKL.geometry.setAttribute('position',new T.BufferAttribute(STV,3));SKL.geometry.setAttribute('color',new T.BufferAttribute(SKC,3));SKL.frustumCulled=false;S.add(SKL);let SP=0,ACC=0,Vp=0;
const QF=[.4,.6,.85,1],QP=[1,1,1.5,2],QS=[0,1024,2048,4096],QT=[.25,.5,.8,1];let DR=1,DRc=1;
function setWx(i){wx=i;buildClouds();cgi.instanceCount=WX.cn[i]*16*QF[SEL.ql]|0}
function setPR(){R.setPixelRatio(Math.min(devicePixelRatio,QP[SEL.ql])*DR);onR()}
function quality(){const q=SEL.ql;DR=DRc=1;R.shadowMap.enabled=q>0;sun.castShadow=q>0;if(sun.shadow.mapSize.x!==QS[q]&&q>0){sun.shadow.mapSize.set(QS[q],QS[q]);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
setTreeQuality(QT[q]);cgi.instanceCount=WX.cn[wx]*16*QF[q]|0;setPR()}
/* ---------- input / ui ---------- */
const OPT={AIRCRAFT:[['ac',SPEC.map(s=>s.n)]],AIRPORT:[['ap',AP.map(a=>a.short)]],LOCATION:[['loc',['Runway','Gate','Final approach']]],WEATHER:[['wx',['Clear','Partly cloudy','Overcast','Rain','Storm']],['tod',['Dawn','Day','Sunset','Night']]],SETTINGS:[['ql',['Low','Medium','High','Ultra']]]};
function showOpts(k){const a=AP[SEL.ap];$('opts').innerHTML=(k==='AIRCRAFT'?`<div style="opacity:.7;margin:4px">${SPEC[SEL.ac].d}</div>`:'')+(k==='AIRPORT'||k==='LOCATION'?`<div class="apv"><canvas id="apc" width="320" height="180"></canvas><div><b style="color:var(--ac);letter-spacing:.12em">${a.code} · ${a.n}</b><br><span style="opacity:.8">${a.desc}</span><br><span style="opacity:.6;font-size:11px">RWY ${a.runways.map(r=>r.num.join('/')+' · '+r.L+' m').join('  |  ')} · ELEV ${(a.el*3.281)|0} ft</span></div></div>`:'')+OPT[k].map(([id,ls])=>`<div>${ls.map((l,i)=>`<span class="c ${SEL[id]==i?'on':''}" data-id="${id}" data-i="${i}">${l}</span>`).join('')}</div>`).join('');if($('apc'))apPreview($('apc'),SEL.ap);
[...$('cats').children].forEach(b=>b.classList.toggle('on',b.textContent===k));$('opts').dataset.k=k}
$('cats').innerHTML=Object.keys(OPT).map(k=>`<button class="b">${k}</button>`).join('');$('cats').onclick=e=>e.target.tagName==='BUTTON'&&showOpts(e.target.textContent);
$('opts').onclick=e=>{const t=e.target.dataset;if(!t.id)return;SEL[t.id]=+t.i;if(t.id==='ac'){setAC(SEL.ac);reset(0)}if(t.id==='ap'||t.id==='loc')reset(SEL.loc);if(t.id==='wx')setWx(SEL.wx);if(t.id==='tod')tod=TODH[SEL.tod];if(t.id==='ql')quality();showOpts($('opts').dataset.k)};
const DEST=AP.map(a=>({n:a.n,s:a.short,x:a.x,z:a.z,r:'RWY '+a.runways.map(r=>r.num.join('/')).join(' · ')}));
function start(){audioInit();if(AU.state==='suspended')AU.resume();reset(SEL.loc);mode='fly';['menu','pause'].forEach(i=>$(i).style.display='none');['hud','tr','help','mm'].forEach(i=>$(i).style.display=i==='hud'?'flex':'block');cm=0}
function togglePause(){if(mode==='fly'){mode='pause';$('pause').style.display='flex'}else if(mode==='pause'){mode='fly';$('pause').style.display='none'}}
$('go').onclick=start;$('rs').onclick=()=>{reset();mode='fly'};$('res').onclick=()=>{mode='fly';$('pause').style.display='none'};
$('mm2').onclick=()=>{setMap(0);mode='menu';reset(0);$('pause').style.display='none';$('menu').style.display='flex';['hud','tr','help','mm','cockpit'].forEach(i=>$(i).style.display='none')};
const CN=['CHASE','CLOSE CHASE','SIDE','COCKPIT'];function banner(t){const e=$('cm');e.textContent=t;e.style.opacity=1;clearTimeout(banner.t);banner.t=setTimeout(()=>e.style.opacity=0,1500)}function setCam(i){cm=i;camInit=0;banner(CN[i]+' CAMERA')}
addEventListener('keydown',e=>{K[e.code]=1;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','ControlLeft'].includes(e.code)||e.code.startsWith('Key')&&!e.ctrlKey&&!e.metaKey)e.preventDefault();
if(e.repeat)return;if(e.code==='Escape'){if(MAP)setMap(0);else togglePause()}if(e.code==='KeyP'){PERF^=1;$('perf').textContent=''}
if(mode!=='fly'&&mode!=='crash')return;const c=e.code;if(c==='KeyG'){if(A.fixed)banner('FIXED GEAR · '+A.n.toUpperCase());else{P.gT=P.gT?0:1;bump(200,.3,.8);bump(420,.1,1/(A.grs||.25));banner(P.gT?'GEAR DOWN':'GEAR UP')}}if(c==='KeyF'){P.flT=(P.flT+1)%4;bump(500,.2,.5)}if(c==='KeyC')setCam((cm+1)%4);if(c==='KeyV')setCam(cm===3?0:3);
if(c==='KeyM')setMap(!MAP);if(c==='KeyU')HUD^=1;
if(c==='KeyR'){reset();mode='fly'}if(/^Digit\d$/.test(c)){const d=+c[5];P.thr=d?d/10:1;banner('THROTTLE '+(P.thr*100|0)+'%')}if(c==='Backquote'){P.thr=0;banner('THROTTLE IDLE')}if(c==='KeyN')dst=(dst+1)%DEST.length;if(c==='Equal'||c==='NumpadAdd'){if(MAP)mapZ=Math.min(32,mapZ*2);else mz=Math.max(8,mz/1.4)}if(c==='Minus'||c==='NumpadSubtract'){if(MAP)mapZ=Math.max(1,mapZ/2);else mz=Math.min(500,mz*1.4)}if(c==='KeyH')$('help').style.display=$('help').style.display==='none'?'block':'none'});
addEventListener('keyup',e=>K[e.code]=0);addEventListener('blur',()=>{for(const k in K)K[k]=0});
function onR(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();[SMK,CON,DBR,SPK].forEach(p=>p.m.uniforms.k.value=innerHeight/2*R.getPixelRatio())}addEventListener('resize',onR);
/* ---------- gauges / minimap / HUD overlay ---------- */
const cc=$('cockpit').getContext('2d'),mc=$('mm').getContext('2d'),hc=$('hc'),hx=hc.getContext('2d');
function dial(x,v,mxv,lab,txt,off=0){cc.save();cc.translate(x,60);cc.fillStyle='#0b0e12';cc.strokeStyle='#5a6572';cc.lineWidth=3;cc.beginPath();cc.arc(0,0,52,0,7);cc.fill();cc.stroke();cc.fillStyle='#9fb0c2';cc.font='10px sans-serif';cc.textAlign='center';cc.fillText(lab,0,-24);cc.font='bold 13px sans-serif';cc.fillStyle='#fff';cc.fillText(txt,0,30);
cc.rotate(off+v/mxv*4.7-2.35);cc.strokeStyle='#ffb84a';cc.lineWidth=3;cc.beginPath();cc.moveTo(0,8);cc.lineTo(0,-44);cc.stroke();cc.restore()}
function gauges(spd,alt,vs,hd,ea){cc.clearRect(0,0,640,120);cc.fillStyle='#10141acc';cc.fillRect(0,20,640,100);dial(80,spd,400,'AIRSPEED KT',spd|0);dial(210,alt%1000,1000,'ALT FT',alt|0);
cc.save();cc.translate(320,60);cc.beginPath();cc.arc(0,0,52,0,7);cc.clip();cc.rotate(-ea.z);cc.fillStyle='#3a78c2';cc.fillRect(-60,-60,120,120);cc.fillStyle='#7a5a34';cc.fillRect(-60,cl(ea.x*57.3*1.3,-50,50),120,120);cc.strokeStyle='#fff';cc.lineWidth=2;cc.beginPath();cc.moveTo(-60,cl(ea.x*74.5,-50,50));cc.lineTo(60,cl(ea.x*74.5,-50,50));cc.stroke();cc.restore();
cc.strokeStyle='#ffb84a';cc.lineWidth=3;cc.beginPath();cc.arc(320,60,52,0,7);cc.moveTo(290,60);cc.lineTo(350,60);cc.stroke();dial(430,cl(vs,-3000,3000),3000,'VS FPM',vs|0,-.0);dial(560,hd,360,'HDG',(hd|0)+'°',-.0)}
/* ---------- map raster: terrain colours + water + hill shading (one pixel per 125 m grid cell) ---------- */
const MAPC=$('map'),mpx=MAPC.getContext('2d'),TRAIL=[];let MAP=0,mapZ=1,mapBase=null,mapT=0,trT=0;
function mapBuild(){const c=document.createElement('canvas');c.width=GNX;c.height=GNZ;const x=c.getContext('2d'),im=x.createImageData(GNX,GNZ),d=im.data;
for(let j=0;j<GNZ;j++)for(let i=0;i<GNX;i++){const k=j*GNX+i,o=k*4,h=THS[k],w=TWAT[k];if(w>-1e3&&h<w-.2){const t=cl((w-h)/80,0,1);d[o]=lp(70,14,t);d[o+1]=lp(150,52,t);d[o+2]=lp(178,98,t)}
else{const dx=THS[j*GNX+Math.min(i+1,GNX-1)]-THS[j*GNX+Math.max(i-1,0)],dz=THS[Math.min(j+1,GNZ-1)*GNX+i]-THS[Math.max(j-1,0)*GNX+i],sh=cl(1+(-dx*.8-dz*.6)/250*2.2,.55,1.4),u=TURB[k]/255;
for(let q=0;q<3;q++)d[o+q]=cl(lp(TCOL[k*3+q]*sh*1.3,[150,148,142][q],u*.45)+(TAIR[k]>120?18:0),0,255)}d[o+3]=255}x.putImageData(im,0,0);mapBase=c}
/* path helpers shared by the minimap and the full map */
const pbb=p=>p.bb||(p.bb=(()=>{let a=1e9,b=-1e9,c=1e9,e=-1e9;for(let i=0;i<p.n;i++){a=Math.min(a,p.X[i]);b=Math.max(b,p.X[i]);c=Math.min(c,p.Z[i]);e=Math.max(e,p.Z[i])}return[a,b,c,e]})());
const RSTY={hw:['#f2b84b',26,2.4],rd:['#efe6c6',11,1.4],av:['#e2dccb',17,1.2],ramp:['#f2b84b',8,1],st:['#d9d3c3',9,.8],ln:['#d8cda8',6.5,.9]};
function drawRoutes(x,X,Z,sc,v0,v1,w0,w1,mini){const vis=p=>{const b=pbb(p);return!(b[1]<v0||b[0]>v1||b[3]<w0||b[2]>w1)};
const line=(p,step)=>{x.beginPath();let on=0;for(let i=0;i<p.n;i+=step){const ii=Math.min(i,p.n-1);if(p.tn[ii]){on=0;continue}const px=X(p.X[ii]),pz=Z(p.Z[ii]);on?x.lineTo(px,pz):x.moveTo(px,pz);on=1}};
const st=Math.max(1,Math.floor(2.5/(sc*20)));
for(const ty of['ln','st','av','rd','ramp','hw']){const S_=RSTY[ty];if(ty==='st'&&sc<.1||ty==='av'&&sc<.035||ty==='ramp'&&sc<.04||ty==='ln'&&sc<(mini?.008:.02))continue;for(const p of ROADNET){if(p.type!==ty||!vis(p))continue;line(p,st);
if(ty==='hw'||ty==='rd'){x.strokeStyle='rgba(30,26,20,.7)';x.lineWidth=Math.max(S_[2]+1.6,S_[1]*sc+2);x.stroke()}x.strokeStyle=S_[0];x.lineWidth=Math.max(S_[2],S_[1]*sc);x.stroke()}}
for(const p of ROADNET.concat(RAILNET)){if(!vis(p))continue;let on=0;x.beginPath();for(let i=0;i<p.n;i+=st){if(!p.tn[i]){on=0;continue}const px=X(p.X[i]),pz=Z(p.Z[i]);on?x.lineTo(px,pz):x.moveTo(px,pz);on=1}x.setLineDash([3,3]);x.strokeStyle='rgba(60,60,60,.8)';x.lineWidth=1.4;x.stroke();x.setLineDash([])}
for(const r of RAILNET){if(!vis(r))continue;line(r,st);x.strokeStyle='#202224';x.lineWidth=Math.max(2.6,8*sc);x.stroke();x.setLineDash([5,5]);x.strokeStyle='#f4f4f4';x.lineWidth=Math.max(1.2,4*sc);x.stroke();x.setLineDash([])}}
function drawRivers(x,X,Z,sc){x.lineCap=x.lineJoin='round';x.strokeStyle='#4a9cc8';for(const R of RIVERS){for(let i=0;i<R.n-1;i+=2){const k=gIdx(R.d[i*2],R.d[i*2+1]);if(k>=0&&LAKES.some(L=>L.sd[k]<-30))continue;x.lineWidth=Math.max(1.1,R.W[i]*sc);x.beginPath();x.moveTo(X(R.d[i*2]),Z(R.d[i*2+1]));const j=Math.min(i+2,R.n-1);x.lineTo(X(R.d[j*2]),Z(R.d[j*2+1]));x.stroke()}}}
function drawAirport(x,X,Z,sc,a,label){const b=a.box,poly=[[b[0],b[2]],[b[1],b[2]],[b[1],b[3]],[b[0],b[3]]].map(([u,v])=>a.toW(u,v));x.fillStyle='rgba(165,170,176,.55)';x.beginPath();poly.forEach(([px,pz],i)=>i?x.lineTo(X(px),Z(pz)):x.moveTo(X(px),Z(pz)));x.fill();
for(const r of a.runways){const[p0,q0]=a.toW(r.x,r.z-r.L/2),[p1,q1]=a.toW(r.x,r.z+r.L/2);x.lineCap='butt';x.strokeStyle='#26282c';x.lineWidth=Math.max(3,(r.W+10)*sc);x.beginPath();x.moveTo(X(p0),Z(q0));x.lineTo(X(p1),Z(q1));x.stroke();if(sc>.02){x.strokeStyle='#fff';x.lineWidth=Math.max(.7,1.4*sc);x.setLineDash([Math.max(2,30*sc),Math.max(2,20*sc)]);x.beginPath();x.moveTo(X(p0),Z(q0));x.lineTo(X(p1),Z(q1));x.stroke();x.setLineDash([])}}
if(sc<.05){x.fillStyle='#ffd27a';x.strokeStyle='#06101a';x.lineWidth=2;x.beginPath();x.arc(X(a.x),Z(a.z),6,0,7);x.fill();x.stroke();x.save();x.translate(X(a.x),Z(a.z));x.rotate(a.hdg*PI/180);x.fillStyle='#06101a';x.fillRect(-1.2,-5,2.4,10);x.restore()}
if(label)label(a)}
/* ---------- minimap: north-up crop of the raster ---------- */
function minimap(hd){const x=mc,s=1/mz,X=v=>(v-P.pos.x)*s,Z=v=>(v-P.pos.z)*s;x.clearRect(0,0,150,150);x.save();x.beginPath();x.arc(75,75,74,0,7);x.fillStyle='#0b2e55';x.fill();x.clip();
if(!mapBase)mapBuild();const r=75*mz/GC,cx=(P.pos.x-GX0)/GC,cz=(P.pos.z-GZ0)/GC;x.imageSmoothingEnabled=true;x.drawImage(mapBase,cx-r,cz-r,r*2,r*2,0,0,150,150);x.fillStyle='rgba(6,10,16,.15)';x.fillRect(0,0,150,150);x.translate(75,75);
const R=75*mz;drawRivers(x,X,Z,s);drawRoutes(x,X,Z,s,P.pos.x-R,P.pos.x+R,P.pos.z-R,P.pos.z+R,1);AP.forEach(a=>drawAirport(x,X,Z,s,a,q=>{x.font='600 10px system-ui,sans-serif';x.fillStyle='#ffd27a';x.fillText(q.code,X(q.x)+8,Z(q.z)-6)}));
const d=DEST[dst],ddx=d.x-P.pos.x,ddz=d.z-P.pos.z,dl=Math.hypot(ddx,ddz);x.strokeStyle='#ffb84a';x.lineWidth=1.5;if(dl*s<68)x.strokeRect(X(d.x)-5,Z(d.z)-5,10,10);else{const ax=ddx/dl*66,az=ddz/dl*66;x.fillStyle='#ffb84a';x.beginPath();x.arc(ax,az,4,0,7);x.fill()}
x.rotate(hd*PI/180);x.fillStyle='#8cc8ff';x.strokeStyle='#06101a';x.lineWidth=1;x.beginPath();x.moveTo(0,-8);x.lineTo(5,6);x.lineTo(0,3);x.lineTo(-5,6);x.closePath();x.fill();x.stroke();x.restore();x.strokeStyle='#ffffff50';x.lineWidth=1;x.beginPath();x.arc(75,75,74,0,7);x.stroke();
x.font='600 9px system-ui,sans-serif';x.fillStyle='#fff';x.textAlign='center';x.fillText('N',75,11);x.textAlign='left';x.fillText((mz*150/1000).toFixed(0)+' km',8,146)}
/* ---------- menu preview of an airport ---------- */
function apPreview(cv_,i){const a=AP[i],x=cv_.getContext('2d'),W=cv_.width,Hh=cv_.height,sc=W/9000,X=v=>W/2+(v-a.x)*sc,Z=v=>Hh/2+(v-a.z)*sc;if(!mapBase)mapBuild();x.fillStyle='#0b2e55';x.fillRect(0,0,W,Hh);
x.drawImage(mapBase,(a.x-GX0)/GC-W/2/sc/GC,(a.z-GZ0)/GC-Hh/2/sc/GC,W/sc/GC,Hh/sc/GC,0,0,W,Hh);drawRivers(x,X,Z,sc);drawRoutes(x,X,Z,sc,a.x-5000,a.x+5000,a.z-3000,a.z+3000,1);drawAirport(x,X,Z,.06,a);
const[ax,az]=a.toW(a.runways[0].x,a.runways[0].z+a.runways[0].L/2+2600);x.strokeStyle='rgba(255,210,122,.9)';x.setLineDash([4,4]);x.lineWidth=1.5;x.beginPath();x.moveTo(X(ax),Z(az));const[bx,bz]=a.toW(a.runways[0].x,a.runways[0].z+a.runways[0].L/2);x.lineTo(X(bx),Z(bz));x.stroke();x.setLineDash([]);
x.font='600 11px system-ui,sans-serif';x.fillStyle='#ffd27a';x.fillText('FINAL '+a.runways[0].num[0],X(ax)+4,Z(az));x.fillStyle='rgba(6,10,16,.7)';x.fillRect(0,Hh-18,W,18);x.fillStyle='#e9eef5';x.font='10px system-ui,sans-serif';x.fillText('9 km · north up',6,Hh-5)}
/* ---------- full map (M) ---------- */
function setMap(on){MAP=on?1:0;MAPC.style.display=MAP?'block':'none';if(MAP){if(!mapBase)mapBuild();mapDraw()}}
const LMI={dam:['#9fd0ff','▮'],bridge:['#f0f0f0','≡'],port:['#7fd1ff','⚓'],light:['#ffe28a','✦'],stadium:['#f4f4f4','◎'],park:['#ff9ad0','✿'],tower:['#ff6a58','▲'],station:['#e9eef5','■'],power:['#ffb38a','ϟ'],industry:['#c9c3b4','▦'],wind:['#e6eef5','✢'],solar:['#7fa7e0','▤']};
function mapDraw(){if(!innerWidth||!innerHeight)return;const W=innerWidth,Hh=innerHeight,dpr=Math.min(2,devicePixelRatio||1),x=mpx;if(MAPC.width!==(W*dpr|0)||MAPC.height!==(Hh*dpr|0)){MAPC.width=W*dpr|0;MAPC.height=Hh*dpr|0;MAPC.style.width=W+'px';MAPC.style.height=Hh+'px'}x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,Hh);
const pd=Math.min(28,W*.04),vw=W-pd*2,vh=Hh-pd*2,WW=GX1-GX0,WH=GZ1-GZ0,sc=Math.min(vw/WW,vh/WH)*mapZ,hw=vw/2/sc,hv=vh/2/sc,mx0=(GX0+GX1)/2,mz0=(GZ0+GZ1)/2;
const cx=hw*2>=WW?mx0:cl(P.pos.x,GX0+hw,GX1-hw),cz=hv*2>=WH?mz0:cl(P.pos.z,GZ0+hv,GZ1-hv),X=v=>pd+vw/2+(v-cx)*sc,Z=v=>pd+vh/2+(v-cz)*sc,
txt=(t,px,py,f,c,al='center')=>{x.font=f;x.textAlign=al;x.lineWidth=3;x.strokeStyle='rgba(6,10,16,.85)';x.strokeText(t,px,py);x.fillStyle=c;x.fillText(t,px,py)};
x.fillStyle='rgba(6,10,16,.94)';x.fillRect(0,0,W,Hh);x.save();x.beginPath();x.rect(pd,pd,vw,vh);x.clip();x.fillStyle='#0b2e55';x.fillRect(pd,pd,vw,vh);x.imageSmoothingEnabled=sc<GC/2?true:false;x.drawImage(mapBase,X(GX0),Z(GZ0),WW*sc,WH*sc);
x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=1;const gs=sc>.05?1000:10000;for(let g=Math.ceil(GX0/gs)*gs;g<=GX1;g+=gs){x.beginPath();x.moveTo(X(g),Z(GZ0));x.lineTo(X(g),Z(GZ1));x.stroke()}for(let g=Math.ceil(GZ0/gs)*gs;g<=GZ1;g+=gs){x.beginPath();x.moveTo(X(GX0),Z(g));x.lineTo(X(GX1),Z(g));x.stroke()}
const v0=cx-hw,v1=cx+hw,w0=cz-hv,w1=cz+hv;drawRivers(x,X,Z,sc);
if(sc>.05){x.fillStyle='rgba(78,84,96,.92)';x.beginPath();for(let i=0;i<BLDS.length;i+=5){const bx=BLDS[i],bz=BLDS[i+1];if(bx<v0-200||bx>v1+200||bz<w0-200||bz>w1+200)continue;const c=Math.cos(BLDS[i+4]),s=Math.sin(BLDS[i+4]),a=BLDS[i+2]/2,b=BLDS[i+3]/2;
x.moveTo(X(bx+a*c+b*s),Z(bz-a*s+b*c));x.lineTo(X(bx-a*c+b*s),Z(bz+a*s+b*c));x.lineTo(X(bx-a*c-b*s),Z(bz+a*s-b*c));x.lineTo(X(bx+a*c-b*s),Z(bz-a*s-b*c));x.closePath()}x.fill()}
drawRoutes(x,X,Z,sc,v0,v1,w0,w1,0);
AP.forEach(a=>drawAirport(x,X,Z,sc,a,q=>{const o=Math.max(12,1600*sc);txt(q.short+' ('+q.code+')',X(q.x)+o,Z(q.z)-4,'600 12px system-ui,sans-serif','#ffd27a','left');txt(q.runways.map(r=>r.num.join('/')).join(' · ')+' · ELEV '+(q.el*3.281|0)+' ft',X(q.x)+o,Z(q.z)+11,'10px system-ui,sans-serif','#d8dde3','left')}));
for(const l of LMARKS){const st=LMI[l.i]||['#fff','•'];txt(st[1],X(l.x),Z(l.z)+4,'700 13px system-ui,sans-serif',st[0]);if(sc>.012)txt(l.n,X(l.x),Z(l.z)+17,'10px system-ui,sans-serif','#e6ecf2')}
for(const c of WLD.cities)txt(c.label,X(c.x),Z(c.z)-(c.type==='metro'?0:6),c.type==='metro'?'700 15px system-ui,sans-serif':'600 12px system-ui,sans-serif','#ffffff');
if(sc>.006)for(const L of LAKES)txt(L.name,X(L.pts.reduce((a,p)=>a+p[0],0)/L.pts.length),Z(L.pts.reduce((a,p)=>a+p[1],0)/L.pts.length),'italic 11px system-ui,sans-serif','#bfe3ff');
if(sc>.006)for(const R of RIVERS){if(R.name.includes('upper'))continue;const i=R.n*.45|0;txt(R.name,X(R.d[i*2]),Z(R.d[i*2+1])-6,'italic 10px system-ui,sans-serif','#a9d8ff')}
x.fillStyle='#fff';for(const o of SHIPS){x.beginPath();x.arc(X(o.x),Z(o.z),o.big?2.8:1.6,0,7);x.fill()}
{const t={};x.fillStyle='#ff4a4a';for(const d of TRAINS){trP(d.r,d.s,0,t);x.beginPath();x.arc(X(t.x),Z(t.z),3.2,0,7);x.fill()}}
if(TRAIL.length>3){x.beginPath();for(let i=0;i<TRAIL.length;i+=2)i?x.lineTo(X(TRAIL[i]),Z(TRAIL[i+1])):x.moveTo(X(TRAIL[i]),Z(TRAIL[i+1]));x.lineTo(X(P.pos.x),Z(P.pos.z));x.strokeStyle='rgba(140,200,255,.85)';x.lineWidth=2;x.setLineDash([2,4]);x.stroke();x.setLineDash([])}
const d=DEST[dst],ddx=d.x-P.pos.x,ddz=d.z-P.pos.z,f=V5.set(0,0,-1).applyQuaternion(P.q),hd=Math.atan2(f.x,-f.z),px=X(P.pos.x),pz=Z(P.pos.z);
x.strokeStyle='#ffb84a';x.lineWidth=1.5;x.setLineDash([8,6]);x.beginPath();x.moveTo(px,pz);x.lineTo(X(d.x),Z(d.z));x.stroke();x.setLineDash([]);x.strokeRect(X(d.x)-8,Z(d.z)-8,16,16);
x.save();x.translate(px,pz);x.rotate(hd);x.fillStyle='#8cc8ff';x.strokeStyle='#06101a';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-11);x.lineTo(7,8);x.lineTo(0,4);x.lineTo(-7,8);x.closePath();x.fill();x.stroke();x.restore();x.restore();
x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=1;x.strokeRect(pd+.5,pd+.5,vw-1,vh-1);
const sk=[500,1000,2000,5000,10000,20000].find(v=>v*sc>80)||20000;x.fillStyle='rgba(6,10,16,.75)';x.fillRect(pd+12,pd+vh-40,sk*sc+70,28);x.fillStyle='#fff';x.fillRect(pd+20,pd+vh-24,sk*sc,3);txt(sk>=1000?sk/1000+' km':sk+' m',pd+28+sk*sc,pd+vh-20,'11px system-ui,sans-serif','#fff','left');
{const nx=pd+vw-30,ny=pd+36;x.fillStyle='rgba(6,10,16,.75)';x.beginPath();x.arc(nx,ny,18,0,7);x.fill();x.fillStyle='#ff6a58';x.beginPath();x.moveTo(nx,ny-13);x.lineTo(nx+5,ny);x.lineTo(nx-5,ny);x.fill();x.fillStyle='#e9eef5';x.beginPath();x.moveTo(nx,ny+13);x.lineTo(nx+5,ny);x.lineTo(nx-5,ny);x.fill();txt('N',nx,ny-20,'700 10px system-ui,sans-serif','#fff')}
{const bx=pd+12,by=pd+12,kt=P.V*1.944|0,alt=Math.max(0,(P.pos.y-A.gh)*3.281|0),dist=Math.hypot(ddx,ddz)/1852,brg=(Math.atan2(ddx,-ddz)*57.3+360)%360;x.fillStyle='rgba(6,10,16,.8)';x.fillRect(bx,by,270,112);
txt(WLD.name,bx+12,by+20,'600 13px system-ui,sans-serif','#8cc8ff','left');txt(A.n.toUpperCase()+' · '+kt+' kt · '+alt.toLocaleString()+' ft · HDG '+String(((hd*57.3)+360)%360|0).padStart(3,'0')+'°',bx+12,by+38,'11px system-ui,sans-serif','#e9eef5','left');
txt('DESTINATION',bx+12,by+58,'600 10px system-ui,sans-serif','#ffb84a','left');txt(d.n,bx+12,by+73,'600 11px system-ui,sans-serif','#ffd27a','left');txt('DISTANCE '+dist.toFixed(1)+' NM   ·   BEARING '+String(brg|0).padStart(3,'0')+'°',bx+12,by+90,'11px system-ui,sans-serif','#ffd27a','left');txt(d.r,bx+12,by+105,'10px system-ui,sans-serif','#cfd6de','left')}
{const it=[['#f2b84b','Highway',0,4],['#efe6c6','Road',0,3],['#202224','Railway',1,3],['#4a9cc8','River',0,3],['#26282c','Runway',0,5],['#ffd27a','Airport',2,0],['#ff4a4a','Train',2,0],['#ffffff','Ship',2,0]];const lx=pd+vw-150,ly=pd+vh-24-it.length*18;x.fillStyle='rgba(6,10,16,.8)';x.fillRect(lx,ly,138,it.length*18+12);
it.forEach(([c,n,t,w],i)=>{const yy=ly+15+i*18;if(t===2){x.fillStyle=c;x.beginPath();x.arc(lx+26,yy,4,0,7);x.fill()}else{x.strokeStyle=c;x.lineWidth=w;x.beginPath();x.moveTo(lx+12,yy);x.lineTo(lx+40,yy);x.stroke();if(t){x.setLineDash([4,4]);x.strokeStyle='#f4f4f4';x.lineWidth=1.4;x.stroke();x.setLineDash([])}}txt(n,lx+50,yy+4,'11px system-ui,sans-serif','#e9eef5','left')})}
txt('M close   ·   + / − zoom ('+mapZ+'×)   ·   N next destination',pd+vw/2,pd+vh-16,'11px system-ui,sans-serif','rgba(233,238,245,.85)')}

const HV=new T.Vector3(),HF=new T.Vector3(),HR=new T.Vector3(),HD=new T.Vector3();
function hudDraw(){const w=innerWidth,h=innerHeight;if(hc.width!==w||hc.height!==h){hc.width=w;hc.height=h}hx.clearRect(0,0,w,h);if(mode!=='fly'||!HUD||cm===3&&!A.ab)return;
const pr=v=>{HV.copy(v).project(cam);return HV.z<1&&HV.z>-1?[(HV.x+1)/2*w,(1-HV.y)/2*h]:null},at=d=>pr(V5.copy(cam.position).addScaledVector(d,4000));
hx.lineWidth=1.5;hx.strokeStyle=hx.fillStyle='rgba(150,255,180,.8)';hx.font='11px system-ui,sans-serif';hx.textAlign='center';hx.shadowColor='#000b';hx.shadowBlur=3;
HF.set(0,0,-1).applyQuaternion(P.q);HF.y=0;if(HF.lengthSq()<1e-4)HF.set(0,0,-1);HF.normalize();HR.set(-HF.z,0,HF.x);
for(let dg=-30;dg<=30;dg+=5){const t=dg*PI/180,wd=dg?.07:.2,c0=HD.copy(HF).multiplyScalar(Math.cos(t)).setY(Math.sin(t)),a=at(V4.copy(c0).addScaledVector(HR,-wd)),b=at(V3.copy(c0).addScaledVector(HR,wd));if(!a||!b)continue;
hx.globalAlpha=dg?.55:.8;hx.setLineDash(dg<0?[6,5]:[]);const g=dg?.3:.42;hx.beginPath();hx.moveTo(a[0],a[1]);hx.lineTo(lp(a[0],b[0],g),lp(a[1],b[1],g));hx.moveTo(lp(a[0],b[0],1-g),lp(a[1],b[1],1-g));hx.lineTo(b[0],b[1]);hx.stroke();if(dg){hx.fillText(Math.abs(dg),b[0]+14,b[1]+4)}}
hx.setLineDash([]);hx.globalAlpha=.95;if(P.V>8){const f=at(HD.copy(P.vel).normalize());if(f){hx.beginPath();hx.arc(f[0],f[1],7,0,7);hx.moveTo(f[0]-7,f[1]);hx.lineTo(f[0]-17,f[1]);hx.moveTo(f[0]+7,f[1]);hx.lineTo(f[0]+17,f[1]);hx.moveTo(f[0],f[1]-7);hx.lineTo(f[0],f[1]-13);hx.stroke()}}
const n=at(HD.set(0,0,-1).applyQuaternion(P.q));if(n){hx.beginPath();hx.moveTo(n[0]-14,n[1]);hx.lineTo(n[0]-6,n[1]);hx.lineTo(n[0]-3,n[1]+5);hx.lineTo(n[0],n[1]);hx.lineTo(n[0]+3,n[1]+5);hx.lineTo(n[0]+6,n[1]);hx.lineTo(n[0]+14,n[1]);hx.stroke()}
if(ctl===1){const cx=w/2,cy=h/2,px=cx+mx*w/2,py=cy+my*h/2;hx.strokeStyle='rgba(140,200,255,.7)';hx.fillStyle='rgba(140,200,255,.9)';hx.beginPath();hx.arc(cx,cy,.04*w/2+3,0,7);hx.moveTo(cx,cy);hx.lineTo(px,py);hx.stroke();hx.beginPath();hx.arc(px,py,4,0,7);hx.fill()}hx.globalAlpha=1}
/* ---------- main loop ---------- */
const cq=new T.Quaternion(),tmp=new T.Vector3(),CO=new T.Vector3(),COV=new T.Vector3(),qq=new T.Quaternion();let hudT=0,mmT=0;
function frame(dt,ns){const a=A,sc=a.sc,CS=M.userData,V=P.V||0,fly=mode==='fly';
if(mode!=='menu'){if(fly)inputs(dt);else pad()}
if(fly){const n=Math.ceil(dt/.0167);for(let i=0;i<n;i++)phys(dt/n);tod=(tod+dt*.015)%24;if((trT+=dt)>1.5){trT=0;TRAIL.push(P.pos.x,P.pos.z);if(TRAIL.length>1600)TRAIL.splice(0,2)}}
M.position.copy(P.pos);M.quaternion.copy(P.q);const vib=P.gnd?P.eng*.004:0;M.position.y+=(rnd()-.5)*vib;
CS.ail[0].rotation.x=-P.rI*.4;CS.ail[1].rotation.x=P.rI*.4;CS.elev.forEach(p=>p.rotation.x=-P.pI*.4);CS.rud.forEach(p=>p.rotation.x=P.yI*.4);CS.flap.forEach(p=>p.rotation.x=P.fl/3*.55);
const g=CS.G;if(CS.pose)CS.pose(P.gq);[g.n,g.r,g.l].forEach(o=>{o.w.position.y=-o.len+P.cp*o.len});if(CS.stab){CS.stab[0].rotation.x=-(P.pI*.28+P.rI*.12);CS.stab[1].rotation.x=-(P.pI*.28-P.rI*.12)}if(CS.ng)CS.ng.forEach(m=>m.material.opacity=(P.crashed?0:.1+.9*sm(.55,1,P.eng))*(.85+rnd()*.15));if(CS.pilot)CS.pilot.visible=cm!==3||mode==='menu';
g.n.p.rotation.y=P.gnd?-P.yI*.6:0;P.imp*=Math.exp(-dt*4);P.cp+=((P.gnd?.1:0)+P.imp-P.cp)*Math.min(1,dt*10);const spin=(P.gnd?(P.vF||0):0)/a.gear.r*dt*(P.gq>.9?1:0);CS.wh.forEach(w=>{w.rotation.x+=spin});
if(CS.prop){CS.prop.rotation.z+=dt*(8+P.eng*90);CS.blur.material.opacity=.03+P.eng*.14;CS.prop.visible=P.eng<.55}CS.fans.forEach(f=>f.rotation.z+=dt*(4+P.eng*60));if(CS.gl)CS.gl.forEach(c=>{c.visible=P.eng>.85&&!P.crashed;c.scale.set(1,1,Math.max(.01,(P.eng-.8)*5*(.9+rnd()*.2)))});
{const lc=CS.lp.geometry.attributes.color;CS.li.forEach(([m,st,c],j)=>{const on=st===1?tt%1.3<.07:st===2?(tt+.3)%1.2<.1:1;m.visible=!!on;const b=on?.12+.88*ns:0;lc.setXYZ(j,c.r*b,c.g*b,c.b*b)});lc.needsUpdate=true}
CS.ck.visible=cm===3&&mode!=='menu';
spot.intensity=ns>.3&&!P.crashed?3+ns*4:0;spot.position.copy(M.localToWorld(tmp.set(0,-.5,-a.L/2)));spot.target.position.copy(M.localToWorld(tmp.set(0,-8,-120*sc)));
for(const f of TICKS)f(dt,ns);
/* effects */
const wq=(x,y,z)=>M.localToWorld(V5.set(x,y,z));
if(fly&&a.jet&&P.pos.y>3500&&P.eng>.3&&rnd()<.6)[.6,-.6].forEach(o=>{const e=a.eng?wq(a.eng[0]*o*2*.9,a.eng[1],a.eng[2]+3):wq(o,0,a.L/2);CON.emit(e.x,e.y,e.z,0,0,0,25,6,50,.35)});
if(fly&&!P.gnd&&Math.abs(P.al)>a.aS*(a.vap||.55)&&P.V>(a.vap?55:70)&&rnd()<.5)[1,-1].forEach(sd=>{const w=wq(a.w[0]/2*sd,a.w[4],a.w[5]+a.w[3]);CON.emit(w.x,w.y,w.z,0,0,0,1.2,1,6,.3)});
if(fly&&P.gnd&&P.V>25&&apAt(P.pos.x,P.pos.z,-40)<0&&rnd()<.4)tire(1);
debrisU(dt);SMK.update(dt);CON.update(dt);DBR.update(dt);SPK.update(dt);
/* clouds: drift with the wind, in-cloud check */
const wv=windV();CU.wo.value.x+=wv.x*dt;CU.wo.value.y+=wv.z*dt;P.inC=0;const cx=cam.position,wo=CU.wo.value;for(let i=0;i<WX.cn[wx]&&i<130;i++){const c=CLC[i];if(!c)continue;const d=Math.hypot(cx.x-cwrap(c[0]+wo.x),cx.z-cwrap(c[2]+wo.y));if(d<800&&Math.abs(cx.y-c[1])<230)P.inC=Math.max(P.inC,1-d/800)}
/* rain */
const rain=WX.rain[wx],rv=P.vel;RN.visible=rain>0;if(rain>0){const cnt=2200*rain|0;RN.geometry.setDrawRange(0,cnt*2);const dx=-rv.x,dy=-30-rv.y,dz=-rv.z;for(let i=0;i<cnt;i++){let x=RL[i*3]-rv.x*dt,y=RL[i*3+1]+(-30-rv.y)*dt,z=RL[i*3+2]-rv.z*dt;if(x>60)x-=120;if(x<-60)x+=120;if(y>60)y-=120;if(y<-60)y+=120;if(z>60)z-=120;if(z<-60)z+=120;RL[i*3]=x;RL[i*3+1]=y;RL[i*3+2]=z;
RP[i*6]=x;RP[i*6+1]=y;RP[i*6+2]=z;RP[i*6+3]=x-dx*.012;RP[i*6+4]=y-dy*.012;RP[i*6+5]=z-dz*.012}RN.geometry.attributes.position.needsUpdate=true}RN.position.copy(cam.position);
/* sense of speed: speed relative to this aircraft's cruise, stronger close to the ground */
{const agl=P.pos.y-HM(P.pos.x,P.pos.z),lowF=1-sm(20,700,agl);SP=lp(SP,mode==='menu'?0:cl((V-15)/(a.spr||a.vcr*1.15),0,1.4)*(.75+.5*lowF),Math.min(1,dt*2));ACC=lp(ACC,(V-Vp)/Math.max(dt,1e-3),Math.min(1,dt*3));Vp=V;
$('spd').style.opacity=(cl(SP-.25,0,1)*.55).toFixed(3);const on=SP>.08&&V>12;SKL.visible=on;if(on){const bx=36*Math.max(1,sc*.32),ln=cl(V*.045,.6,10),vx=P.vel.x,vy=P.vel.y,vz=P.vel.z,iv=1/Math.max(V,1);
for(let i=0;i<SN;i++){let x=SKP[i*3]*bx-vx*dt,y=SKP[i*3+1]*bx-vy*dt,z=SKP[i*3+2]*bx-vz*dt;if(x>bx)x-=2*bx;if(x<-bx)x+=2*bx;if(y>bx)y-=2*bx;if(y<-bx)y+=2*bx;if(z>bx)z-=2*bx;if(z<-bx)z+=2*bx;
SKP[i*3]=x/bx;SKP[i*3+1]=y/bx;SKP[i*3+2]=z/bx;STV[i*6]=x;STV[i*6+1]=y;STV[i*6+2]=z;const k=sm(4,9,Math.hypot(x,y,z)/Math.max(1,sc*.6))*ln*iv;STV[i*6+3]=x+vx*k;STV[i*6+4]=y+vy*k;STV[i*6+5]=z+vz*k}
SKL.geometry.attributes.position.needsUpdate=true;SKL.position.copy(cam.position);SKL.material.opacity=cl(SP-.08,0,1)*.6*(.35+.65*(1-ns*.7))}}
if(wx===4){fT-=dt;if(fT<0){fT=3+rnd()*9;flash=1;setTimeout(()=>bump(180,.9,2.2),700+rnd()*1500)}flash=Math.max(0,flash-dt*4)}else flash=0;
/* camera: spring-damped chase offset with g-load sag, look-ahead */
sky.position.copy(cam.position);const base=(P.st?.35:0)+WX.turb[wx]*.25*(P.gnd?0:1)+V*.0004+(P.gnd?P.eng*.03+cl(V/40,0,1)*.08:0)+SP*SP*.1;shake=Math.max(shake*Math.exp(-dt*3),0);
if(mode==='menu'){const t=tt*.12;cam.position.set(P.pos.x+Math.sin(t)*22*sc+8*sc,P.pos.y+1.6*sc,P.pos.z+Math.cos(t)*22*sc);cam.lookAt(P.pos.x,P.pos.y+.6*sc,P.pos.z-2*sc);cam.fov=45;cam.near=.5}
else{cq.slerp(P.q,1-Math.exp(-dt*(cm===1?5:3)));cam.fov=lp(cam.fov,(cm===3?70:56)+SP*15+(a.ab&&P.eng>.9?5:0),Math.min(1,dt*3));cam.near=cm===3?.12:.5;
if(cm===3){const ml=ctl===1?0:1;cam.position.copy(P.pos).add(tmp.set(0,a.cock[0]-cl(P.nz-1,-1,5)*.015*sc,a.cock[1]).applyQuaternion(P.q));cam.quaternion.copy(P.q).multiply(qq.setFromEuler(new T.Euler(-my*.8*ml-.06,-mx*1.8*ml,0,'YXZ')));cam.up.copy(YA)}
else{const o=[[0,2.6,11],[0,1.55,6.2],[-8.5,.7,-1.5],[0,2.6,11]][Math.min(cm,3)];const zk=cm<2?1+.1*SP+cl(ACC*.035,-.08,.35):1;tmp.set(o[0],o[1],o[2]*zk).multiplyScalar(sc).applyQuaternion(cm===2?P.q:cq);
if(cm===4)tmp.set(0,.25,1).multiplyScalar(14*sc).applyAxisAngle(XA,-my*1.3).applyAxisAngle(YA,-mx*3.1);else if(ctl!==1)tmp.applyAxisAngle(YA,-mx*1.5);if(cm<2)tmp.y-=cl(P.nz-1,-1,6)*.1*sc;
if(!camInit){CO.copy(tmp);COV.set(0,0,0);camInit=1}const k=cm===2?140:cm===4?60:42,cd=2*Math.sqrt(k);V4.copy(tmp).sub(CO).multiplyScalar(k).addScaledVector(COV,-cd);COV.addScaledVector(V4,dt);CO.addScaledVector(COV,dt);
cam.position.copy(P.pos).add(CO);cam.position.y=Math.max(cam.position.y,Math.max(HM(cam.position.x,cam.position.z),SEA)+2);cam.up.copy(YA).lerp(V3.set(0,1,0).applyQuaternion(cq),.45).normalize();
cam.lookAt(V4.set(0,.5*sc,-1.5*sc).applyQuaternion(P.q).add(P.pos))}}
const sh=shake+base;if(sh>0){cam.position.x+=(rnd()-.5)*sh*.2*Math.max(1,sc*.4);cam.position.y+=(rnd()-.5)*sh*.2*Math.max(1,sc*.4);cam.rotateZ((rnd()-.5)*sh*.01)}cam.updateProjectionMatrix();
if(window.DBGCAM){cam.position.copy(DBGCAM.p);cam.up.set(0,1,0);cam.lookAt(DBGCAM.t);sky.position.copy(cam.position);cam.fov=DBGCAM.fov||55;cam.updateProjectionMatrix()}
/* HUD (DOM at 10 Hz, minimap 20 Hz) */
if(mode!=='menu'){const f=V5.set(0,0,-1).applyQuaternion(P.q),hd=(Math.atan2(f.x,-f.z)*57.3+360)%360,kt=(P.gnd&&V<23?Math.hypot(P.vel.x,P.vel.z):V)*1.944,alt=(P.pos.y-a.gh)*3.281,vs=P.vel.y*196.85;
if((hudT+=dt)>.1){hudT=0;const s=Math.hypot(wv.x,wv.z)/.5144,d=DEST[dst],dx=d.x-P.pos.x,dz=d.z-P.pos.z,br=(Math.atan2(dx,-dz)*57.3+360)%360;
$('hs').textContent=kt|0;$('ha').textContent=Math.max(0,alt|0).toLocaleString();{const g=Math.max(HM(P.pos.x,P.pos.z),waterAt(P.pos.x,P.pos.z)),h=P.gnd?0:Math.max(0,(P.pos.y-a.gh-g)*3.281);$('hr').textContent=h>9999?'—':(h|0).toLocaleString()}$('hv').textContent=(vs>0?'+':'')+(vs|0);$('hh').textContent=String(hd|0).padStart(3,'0')+'°';$('ht').textContent=(P.thr*100|0)+'%'+(Math.abs(P.thr-P.eng)>.04?' ('+(P.eng*100|0)+')':'');{const e=$('hg'),st=a.fixed?'FIXED':P.gq>.995?'DOWN':P.gq<.005?'UP':(P.gT?'▼ ':'▲ ')+(P.gq*100|0)+'%';e.textContent=st;e.style.color=st==='DOWN'?'#7dffa0':st==='UP'||st==='FIXED'?'':'#ffb84a'}$('hf').textContent=['0','1','2','LDG'][Math.round(P.flT)];
$('tr').innerHTML=`<i class="k">WIND</i><br>${WX.dir[wx]|0}° / ${s|0} kt<br><i class="k">DESTINATION</i><br><b>${d.n}</b><br>DISTANCE ${(Math.hypot(dx,dz)/1852).toFixed(1)} NM<br>BEARING ${String(br|0).padStart(3,'0')}°<br><span style="opacity:.7">${d.r}</span><br><span style="font-size:10px;opacity:.6">${AP.map((q,i)=>(i===dst?'▸ ':'')+q.code+' '+(Math.hypot(q.x-P.pos.x,q.z-P.pos.z)/1852).toFixed(0)+' NM').join('<br>')}<br>N: next destination</span><br><br>${String(tod|0).padStart(2,'0')}:${String((tod%1)*60|0).padStart(2,'0')}`;
let w='';if(P.crashed)w='';else if(P.st)w='STALL';else if(!a.fixed&&P.gp<.5&&!P.gnd&&P.pos.y<250&&P.V<100&&mode==='fly')w='<span style="font-size:14px;color:#ffb84a">GEAR UP</span>';$('warn').innerHTML=w;$('cockpit').style.display=cm===3?'block':'none';$('hud').style.display=cm===3?'none':'flex'}
if((mmT+=dt)>.05){mmT=0;minimap(hd)}if(MAP&&(mapT+=dt)>.066){mapT=0;mapDraw()}if(cm===3)gauges(kt,alt,vs,hd,new T.Euler().setFromQuaternion(P.q,'YXZ'))}terrainUpdate(cam.position.x,cam.position.y,cam.position.z);hudDraw()}
let last=performance.now(),FTm=16.7,drT=0,lastUp=-99,pfT=0;
function loop(now){requestAnimationFrame(loop);const ms=now-last,dt=Math.min(.1,ms/1000);last=now;tt+=dt;if(mode==='pause')return;
FTm=lp(FTm,Math.min(ms,100),.05);if((drT+=dt)>1.5&&mode!=='menu'){drT=0;if(FTm>23&&DR>.55){if(tt-lastUp<6)DRc=Math.max(.55,DR-.1);DR=Math.max(.55,DR-.1);setPR()}else if(FTm<18&&DR<DRc){DR=Math.min(DRc,DR+.05);lastUp=tt;setPR()}}
const ns=lighting();frame(dt,ns);audioU();R.render(S,cam);
if(PERF&&(pfT+=dt)>.25){pfT=0;const i=R.info.render;$('perf').innerHTML=`${(1000/FTm).toFixed(0)} FPS · ${FTm.toFixed(1)} ms<br>${i.calls} draws · ${(i.triangles/1000|0)}k tris · res ${(R.getPixelRatio()).toFixed(2)}x`}}
function parkPlanes(){const ms=[];AP.forEach((a,i)=>{a.slots.slice().sort(()=>rnd()-.5).slice(0,a.parkN||0).forEach(sl=>{const[x,z]=a.toW(sl.x,sl.z);ms.push(M4(x,a.el+SPEC[1].gh,z,a.ry+sl.ry))})});
const g=build(1,1);g.updateMatrixWorld(true);const by=new Map();g.traverse(o=>{if(o.isMesh){if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push([o.geometry,o.matrixWorld.clone(),null])}});
for(const[m,l]of by){const im=new T.InstancedMesh(merge(l),m,ms.length);ms.forEach((x,j)=>im.setMatrixAt(j,x));im.castShadow=im.receiveShadow=!(m.isMeshBasicMaterial);fitIS(im);S.add(im)}
/* light aircraft tied down on the general-aviation aprons */
for(const[key,ac,skip]of[['gaSlots',0,4],['fxSlots',2,99]]){const gm=[];AP.forEach(a=>(a[key]||[]).forEach((sl,j)=>{if(j%skip===skip-1)return;const[x,z]=a.toW(sl.x,sl.z);gm.push(M4(x,a.el+SPEC[ac].gh,z,a.ry+sl.ry))}));if(gm.length){const g2=build(ac,1);g2.updateMatrixWorld(true);const b2=new Map();g2.traverse(o=>{if(o.isMesh&&o.visible){if(!b2.has(o.material))b2.set(o.material,[]);b2.get(o.material).push([o.geometry,o.matrixWorld.clone(),null])}});
for(const[m,l]of b2){const im=new T.InstancedMesh(merge(l),m,gm.length);gm.forEach((x,j)=>im.setMatrixAt(j,x));im.castShadow=!(m.isMeshBasicMaterial);fitIS(im);S.add(im)}}}}
LOADMSG('Finishing terrain…');terrainBuildMeshes();farTerrain();LOADMSG('Filling seas and lakes…');buildWater();LOADMSG('Starting traffic…');buildTraffic();LOADMSG('Parking aircraft…');
parkPlanes();envI(S);setAC(0);setWx(0);quality();onR();reset(0);LOADMSG('Ready');showOpts('AIRCRAFT');requestAnimationFrame(loop);{const e=$('load');if(e){e.style.opacity=0;setTimeout(()=>e.remove(),600)}}

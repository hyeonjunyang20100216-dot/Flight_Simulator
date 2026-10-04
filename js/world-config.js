/* ============================================================
   world-config.js — WORLD_LOCATIONS
   The whole region is described here as data. Coordinates are in metres:
   x grows east, z grows south (north is -z, "up" on the map).
   Edit positions here; the terrain, airports, roads and towns are generated from it.
   ============================================================ */
const KM=p=>p.map(v=>Array.isArray(v)?v.map(c=>c*1000):v*1000);
const WORLD_LOCATIONS={
  name:'HANBIT REGION',
  seed:20261003,
  bounds:{x0:-70000,x1:70000,z0:-60000,z1:60000},
  cell:125,            // height-grid spacing (m)
  sea:0,               // sea level (m)

  /* coastline, north to south; land lies to the west of it */
  coast:KM([[48,-66],[50,-56],[47,-47],[51,-40],[55,-33],[58,-27],[56,-21.5],[50.5,-16.5],[47,-10],[45.6,-4.2],[47,1.5],[46,7],[43.6,11],[41.6,14],[39.4,17],[37.2,18.7],[35.7,19.5],[35.7,20.4],[37.4,21],[40,22.5],[43,24.6],[45.3,27.5],[44.3,30.5],[45.5,33.5],[43.8,37],[41,41],[36,45],[30,48.5],[24,53],[18,57.5],[12,62],[6,66]]),
  coastCalm:KM([[37.6,19.4,3.2],[42.5,31.5,3.5],[40.6,15.5,2.4]]).map(a=>a),          // keep these shore stretches exactly as drawn (port, bridge, airport)
  cliffs:KM([[56.5,-26.5,6.5],[50,-50,7],[47,-10.5,2.5],[45,35,2.2]]),                  // rocky cliff coast [x,z,r]

  /* mountain ranges: ridge axis, half width, height factor */
  ranges:[
    {name:'Baekdu Range',pts:KM([[-78,-50],[-55,-49],[-30,-52],[-8,-50],[14,-48],[34,-47],[52,-53]]),w:17000,h:1},
    {name:'Valley South Ridge',pts:KM([[-70,-26],[-48,-27],[-28,-28.5],[-12,-28.4],[-2,-27.4]]),w:6500,h:.42},
    {name:'East Coastal Range',pts:KM([[26,-37],[36,-31],[46,-36],[50,-44]]),w:9500,h:.58},
    {name:'West Hills',pts:KM([[-66,-14],[-60,-3],[-59.5,8],[-61,20],[-64,30]]),w:7000,h:.2}
  ],
  /* the broad glacial valley that holds White Mountain Airport: [x,z,floor elevation] */
  valley:{pts:KM([[-56,-37.6],[-42,-37.4],[-30,-36.9],[-18,-36.2],[-7,-35.6],[1,-33.6],[6,-31.4]]).map((p,i)=>[p[0],p[1],[880,780,700,640,540,470,430][i]]),half:1900,wall:5600},
  uplands:KM([[12,-29.5,12.5,9.5,.52],[-5,-16,14,6,.12],[30,-8,9,8,.13]]),             // [x,z,rx,rz,heightFactor(km)] rolling hills / lake basin rim
  plains:KM([[-30,26,32,22],[-4,30,20,14],[15,28,14,10],[-45,0,12,14]]),               // farmland plains: [x,z,rx,rz]
  peaks:KM([[1.5,1.6,1.3,.27]]),                                                    // isolated hills [x,z,r,h(km)] — Namsan in the city

  lakes:[
    {name:'Cheongho Lake',level:400,reservoir:true,pts:KM([[5.4,-31.2],[7.2,-33.4],[10,-34.6],[13,-34.3],[16,-33],[18.6,-30.6],[19,-28],[17.6,-25.6],[16,-24],[15,-22.95],[14.2,-22.95],[13.2,-24.4],[11.2,-25.8],[8.6,-27.2],[6.4,-28.8]])},
    {name:'Baekdam Lake',level:1150,pts:KM([[-31.2,-46.4],[-30,-47.5],[-28,-47.4],[-27.1,-46.3],[-28,-45.3],[-30.2,-45.2]])}
  ],
  /* rivers flow from the first point to the last; `into` names where they end */
  rivers:[
    {name:'Hanbit River (upper)',pts:KM([[-52,-45],[-46,-40.5],[-38,-38.6],[-30,-37.7],[-22,-38],[-15,-38.1],[-9.5,-37.6],[-3,-36],[2,-33.6],[5.8,-31]]),w0:12,w1:42,into:'lake'},
    {name:'Hanbit River',pts:KM([[14.6,-22.8],[14.3,-17.5],[13.4,-12],[11,-6.5],[8.6,-1.5],[7.8,3],[9.5,7.5],[13,11.5],[18,14.5],[24,16.5],[30,18.5],[33.6,19.6],[35.9,20]]),w0:48,w1:190,into:'sea',main:true},
    {name:'Seom River',pts:KM([[40,-41],[35,-33],[29,-24],[23,-15.5],[17.5,-11.6],[13.4,-11.4]]),w0:10,w1:34,into:'Hanbit River'},
    {name:'Deul Stream',pts:KM([[-64,13],[-52,11],[-40,14],[-30,12.5],[-20,9],[-10,4.5],[-2,1],[4,-0.6],[8.4,-1.3]]),w0:8,w1:30,into:'Hanbit River'},
    {name:'Green Creek',pts:KM([[-60,44],[-52,38],[-47,30],[-41,22],[-35,16],[-30.6,12.7]]),w0:6,w1:16,into:'Deul Stream'},
    {name:'Snowmelt Creek',pts:KM([[-12,-54],[-11,-47.5],[-10.4,-42],[-9.6,-37.8]]),w0:5,w1:12,into:'Hanbit River (upper)'}
  ],
  islands:KM([[61,-9,.9,.045],[55.5,8.5,2.2,.12],[53,42,3.2,.16],[59,-30.5,.35,.025],[49,48,.6,.04]]).map((a,i)=>({x:a[0],z:a[1],r:a[2],h:a[3],type:['rock','forest','village','rock','rock'][i],name:['Dol-seom','Sup-seom','Seomdo','',''][i]})),

  /* exactly four major airports. runway x/z are offsets in the airport frame (runway along local z) */
  airports:[
    {id:'HBN',name:'HANBIT INTERNATIONAL AIRPORT',short:'HANBIT INTL',x:21000,z:2500,el:24,hdg:340,style:'hub',
     runways:[{x:-900,z:0,L:3600,W:60,num:['34L','16R']},{x:900,z:-100,L:3200,W:60,num:['34R','16L']}],
     flat:[-1500,1500,-2450,2650],blend:1600,box:[-1250,1250,-2150,2000],access:[0,2420],
     desc:'The region\'s hub, between the Hanbit skyline and the eastern logistics belt. Two parallel 3,600 m and 3,200 m runways, a twin-pier terminal with a satellite concourse, cargo village and maintenance base.'},
    {id:'BCI',name:'BLUE COAST INTERNATIONAL AIRPORT',short:'BLUE COAST',x:41500,z:31000,el:7,hdg:300,style:'coast',
     runways:[{x:0,z:0,L:3200,W:50,num:['30','12']}],
     flat:[-650,1150,-2150,2200],blend:1100,box:[-350,1050,-1850,1900],access:[1000,0],
     desc:'Built on the shore south of Haeun port. Runway 30 is approached low over the open sea and the beach — the most scenic arrival in the region. Wave-roof terminal and a single linear pier.'},
    {id:'WMA',name:'WHITE MOUNTAIN AIRPORT',short:'WHITE MTN',x:-18000,z:-36200,el:640,hdg:90,style:'mountain',
     runways:[{x:0,z:0,L:3000,W:45,num:['09','27']}],
     flat:[-460,900,-1850,1850],blend:700,box:[-300,820,-1700,1700],access:[820,0],
     desc:'A 3,000 m runway on the floor of the Baekdu glacial valley, 640 m above sea level. Peaks rise on both sides of the approach; stone-and-timber terminal beside the valley town of Seorak.'},
    {id:'GRF',name:'GREENFIELD REGIONAL AIRPORT',short:'GREENFIELD',x:-44000,z:40000,el:46,hdg:50,style:'regional',
     runways:[{x:0,z:0,L:2600,W:45,num:['05','23']}],
     flat:[-420,760,-1650,1650],blend:1200,box:[-260,660,-1500,1500],access:[660,0],
     desc:'A quiet regional field in the south-western farm plain, among fields, barns, the Deulpan solar farm and the western wind turbines. Compact terminal with walk-out stands.'},
    {id:'HBA',name:'HANBIT AIR BASE',short:'AIR BASE',x:-50000,z:0,el:16,hdg:270,style:'military',
     runways:[{x:0,z:0,L:2900,W:45,num:['27','09']}],
     flat:[-460,1000,-1720,1720],blend:1000,box:[-300,920,-1600,1600],access:[920,0],
     desc:'Fighter base on the western plain. Concrete 2,900 m runway with arresting cables, two loops of hardened aircraft shelters, a flight line of parked fighters, quick-reaction alert pads and earth-covered munitions igloos.'},
    {id:'SDI',name:'SEOMDO ISLAND AIRPORT',short:'SEOMDO',x:55000,z:43500,el:22,hdg:40,style:'island',
     runways:[{x:0,z:0,L:1900,W:45,num:['04','22']}],
     flat:[-380,620,-1130,1130],blend:450,box:[-250,540,-1060,1060],access:[540,0],
     desc:'A short 1,900 m strip on Seomdo island, 12 km off the coast. Both approaches cross open water — runway 04 comes in over the sea past the lighthouse cape. Small terminal, ferry harbour nearby.'}
  ],

  cities:[
    {name:'HANBIT',x:5000,z:6000,r:8600,type:'metro',rot:.21,label:'HANBIT CITY'},
    {name:'HAEUN',x:38700,z:15400,r:3400,type:'port',rot:-.62,label:'HAEUN PORT'},
    {name:'SEORAK',x:-30200,z:-36600,r:2300,type:'valley',rot:.02,label:'SEORAK'},
    {name:'DEULPAN',x:-25500,z:20500,r:2600,type:'farm',rot:.12,label:'DEULPAN'},
    {name:'CHEONGPUNG',x:19900,z:-26900,r:1100,type:'town',rot:.45,label:'Cheongpung'}
  ],
  villages:KM([[-56,-18,40],[-47,-6,35],[-40,4,45],[-52,28,30],[-36,48,40],[-18,42,45],[-7,32,40],[6,26,45],[18,30,35],[27.5,-5,40],[32,-14,30],[-14,-14,35],[-3,-19,30],[-44,-39.4,30],[-8,-41.2,20],[49.4,-14.6,40],[46.4,4.6,45],[31,47.6,45],[53,42,60],[-36,36,30],[-28,-8,30],[12,-18,25],[26,24,30]]).map(a=>({x:a[0],z:a[1],n:a[2]/1000|0})),

  /* road network (waypoints are smoothed into curves). types: hw highway, rd regional road */
  roads:[
    {name:'Route 1',type:'hw',pts:KM([[-42.6,38.4],[-38,33.6],[-33,28.8],[-27.4,23.6],[-21,18.6],[-14,15.6],[-6,13.6],[0,12.9],[6,13.1],[11.5,10.8],[15,7.5],[18,6.2],[21.9,7.3],[25.5,8.8],[31,12],[35.4,14.9],[37.3,16.9],[37.4,18.2],[37.4,19.8],[37.45,21.4],[38,23.6],[39.4,26.6],[40.6,29.4],[41.9,30.2]]),
     span:{from:[37400,18000],to:[37450,21600],deck:46,crown:7}},
    {name:'Route 2',type:'hw',pts:KM([[0,12.9],[-3,8],[-4.6,1.6],[-2.6,-5],[2.5,-11],[6,-16],[7.4,-21.4],[5.2,-26.4],[1.2,-31.2],[-3.2,-34],[-9,-35.2],[-14,-34.7],[-18,-34.9],[-24,-35.3],[-30,-36.2]])},
    {name:'Coast Road',type:'rd',pts:KM([[39.6,13.4],[43,8.5],[45,2.2],[44.4,-4.6],[46.4,-11],[51,-16.6],[54.6,-21.4],[56.2,-25.6]])},
    {name:'Dam Road',type:'rd',pts:KM([[7.4,-21.4],[11,-21.4],[14,-22.75],[15.25,-22.65],[17.5,-24.3],[19.8,-26.5],[21,-30],[20.6,-31.8]])},
    {name:'Mountain Road',type:'rd',pts:KM([[-25.5,20.5],[-30,12],[-34.5,3],[-37.4,-8],[-36,-19],[-34,-28],[-30.6,-35.8]])},
    {name:'South Road',type:'rd',pts:KM([[3,13],[1,20],[-4,27],[-11,33],[-18,41.6],[-30,46],[-36,47.6]])},
    {name:'Bay Road',type:'rd',pts:KM([[11.6,10.9],[13.6,18],[17,25],[19,30],[26,36],[31,47.4]])},
    {name:'Seom Valley Road',type:'rd',pts:KM([[25.5,8.8],[27,1],[27.5,-5],[31,-13.4],[32,-14.2]])},
    {name:'West Road',type:'rd',pts:KM([[-14,15.6],[-22,8],[-30,5],[-40,4],[-47,-6],[-56,-18]])},
    {name:'Lake Link',type:'rd',pts:KM([[19.8,-26.5],[24.5,-20],[29,-16],[32,-14.2]])},
    {name:'South Coast Road',type:'rd',pts:KM([[41.9,30.2],[39.6,35],[36.5,43.8],[31,47.4]])},
    {name:'Greenfield Link',type:'rd',pts:KM([[-27.4,23.6],[-31,31],[-36,36],[-36,47.6]])}
  ],
  interchanges:KM([[21.9,7.3],[0,12.9],[-27.4,23.6],[11.5,10.8]]),
  rails:[
    {name:'Main Line',type:'main',pts:KM([[-25.8,21.4],[-19,18.3],[-11,15],[-4,10.6],[1.5,8.1],[4.5,7.1],[9,7.2],[13,9.6],[17.5,7.6],[22,5.6],[26.5,9.6],[31.5,12.4],[36.2,14.4],[38.8,15.3]]),stations:KM([[-25.8,21.4],[4.5,7.1],[22,5.6],[38.6,15.2]])},
    {name:'Mountain Line',type:'mountain',pts:KM([[4.5,7.1],[5.6,0],[7.2,-6],[10.5,-9.6],[14,-14],[16.6,-17.6],[18.6,-21.2],[20.7,-25.6],[21.6,-30.5],[19.5,-34.5],[14,-36],[8.5,-35],[4,-33.2],[0,-33.9],[-5,-35.5],[-10,-36.6],[-16,-37.5],[-24,-37.9],[-29.8,-38.2]]),stations:KM([[20.7,-25.6],[-29.8,-38.2]])},
    {name:'Freight Line',type:'freight',pts:KM([[36.2,14.4],[39.8,11.6],[43.2,6],[44.4,-0.6]])},
    {name:'Metro Line 1',type:'metro',pts:KM([[-3.6,9.6],[1,7.6],[4.6,6.4],[8.6,6.6],[12,8.7],[14.5,10.5]])}
  ],
  /* transmission lines */
  power:[KM([[14.6,-22.2],[12.2,-15],[8.6,-7],[6.4,-2.4]]),KM([[44.2,-1.4],[36,0.6],[28,4],[25.6,6.4],[16,3.6],[9.8,2.2]]),KM([[-59.2,6],[-45,10],[-32,15.2],[-27.2,18.2]])],
  substations:KM([[6.4,-2.4],[25.6,6.4],[-27.2,18.2],[9.8,2.2]]),

  landmarks:{
    dam:{name:'Cheongho Dam',x:14600,z:-22800,a:[14080,-22860],b:[15180,-22700]},
    bridge:{name:'Haeun Grand Bridge',x:37420,z:19800,a:[37400,18250],b:[37450,21350],towers:[19150,20450]},
    lighthouses:[{name:'Cape Dol Lighthouse',x:56650,z:-26150,keeper:true},{name:'Seomdo Lighthouse',x:56050,z:42150}],
    port:{name:'Haeun Container Terminal',quay:KM([[41.15,14.3],[40.0,15.95]]),yard:280},
    stadium:{name:'Hanbit World Cup Stadium',x:-1800,z:9600,rot:.21},
    amusement:{name:'Starlight Land',x:-9200,z:17600},
    tower:{name:'Namsan Tower',x:1500,z:1600},
    station:{name:'Hanbit Central Station',x:4500,z:7100,rot:.12},
    powerPlant:{name:'East Coast Power Station',x:44200,z:-1800},
    industry:[{name:'Haeun Industrial Complex',x:41800,z:9200,r:1700},{name:'Airport Logistics Park',x:25600,z:6400,r:1100},{name:'Deulpan Grain Terminal',x:-23400,z:22600,r:500}],
    solar:{name:'Deulpan Solar Farm',x:-18600,z:27600,w:2200,d:1300,rot:.12},
    wind:{name:'West Ridge Wind Farm',pts:KM([[-61.5,-11],[-60,-3],[-59.4,6],[-60.2,14],[-61.8,22]])},
    shipLanes:[KM([[43,17.5],[52,14],[70,10]]),KM([[44,18],[55,0],[70,-25]]),KM([[44,19],[55,30],[70,45]]),KM([[42,19],[48,32],[52.5,40.5]])],
    convention:{x:7400,z:5200},
    ferry:KM([[40.4,17.2],[47,28],[51.6,39.8]])
  }
};

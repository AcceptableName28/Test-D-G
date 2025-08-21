/* Dieline Studio core
   - Geometry in millimeters (mm). Viewer scales with a px-per-mm factor for preview.
   - Export uses mm viewBox so Illustrator sees true sizes.
*/

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

/* ---------- State ---------- */
const state = {
  units: 'mm',
  pxPerMm: 3,             // preview only; auto-overridden by Fit
  zoom: 1,                // viewer zoom multiplier
  params: {},             // current template params
  material: null,         // selected material object
  templateId: null,
  scoreMode: 'score',
  strokePx: 2.5,
  grid: 1,
  showGrid: true,
  showDims: true,
  showGuides: true,
  editMode: false,
  geometry: null          // holds generated geometry { bbox, cuts, scores, perfs, bleeds, dims }
};

/* ---------- Materials (thickness in mm) ---------- */
const MATERIALS = [
  {id:'card-0.20', name:'Paperboard 0.20 mm (~8pt)', t:0.20, type:'paper'},
  {id:'card-0.25', name:'Paperboard 0.25 mm (~10pt)', t:0.25, type:'paper'},
  {id:'card-0.30', name:'Paperboard 0.30 mm (~12pt)', t:0.30, type:'paper'},
  {id:'card-0.35', name:'Paperboard 0.35 mm (~14pt)', t:0.35, type:'paper'},
  {id:'card-0.40', name:'Paperboard 0.40 mm (~16pt)', t:0.40, type:'paper'},
  {id:'card-0.46', name:'Paperboard 0.46 mm (~18pt)', t:0.46, type:'paper'},
  {id:'card-0.50', name:'Paperboard 0.50 mm (~20pt)', t:0.50, type:'paper'},
  {id:'card-0.60', name:'Paperboard 0.60 mm (~24pt)', t:0.60, type:'paper'},
  {id:'card-0.80', name:'Paperboard 0.80 mm (~32pt)', t:0.80, type:'paper'},
  {id:'card-1.00', name:'Paperboard 1.00 mm (~40pt)', t:1.00, type:'paper'},   // requested
  {id:'card-1.20', name:'Paperboard 1.20 mm (~48pt)', t:1.20, type:'paper'},

  {id:'corr-F', name:'Corrugated F flute (~0.8 mm)', t:0.8, type:'corr'},
  {id:'corr-E', name:'Corrugated E flute (~1.2 mm)', t:1.2, type:'corr'},
  {id:'corr-B', name:'Corrugated B flute (~2.8 mm)', t:2.8, type:'corr'},
  {id:'corr-C', name:'Corrugated C flute (~3.8 mm)', t:3.8, type:'corr'},
  {id:'corr-EB', name:'Corrugated EB (~4.5 mm)', t:4.5, type:'corr'},
  {id:'corr-BC', name:'Corrugated BC (~6.5 mm)', t:6.5, type:'corr'},

  {id:'custom', name:'Custom…', t:0.5, type:'custom'}
];

/* ---------- Utilities ---------- */
const mm = (v) => v; // placeholder for units (kept in mm)
const U = {
  round(n, p=3){ const f = Math.pow(10,p); return Math.round(n*f)/f },
  path(points, close=false){
    // points: [{x,y},{x,y}...]
    return `M${points.map((p,i)=> `${U.round(p.x)} ${U.round(p.y)}`).join(' L ')}${close?' Z':''}`;
  },
  rect(x,y,w,h){
    return `M${x} ${y} H${x+w} V${y+h} H${x} Z`;
  },
  addPath(parent, d, stroke, width, cls=''){
    const p = document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d', d);
    p.setAttribute('fill','none');
    p.setAttribute('stroke', stroke);
    p.setAttribute('stroke-width', width);
    if (cls) p.setAttribute('class', cls);
    parent.appendChild(p);
    return p;
  },
  addText(parent, x,y, str, size=3){
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('font-size', size); t.textContent = str;
    t.setAttribute('font-family','system-ui,Segoe UI,Arial');
    t.setAttribute('text-anchor','middle');
    parent.appendChild(t); return t;
  },
  clear(el){ while(el.firstChild) el.removeChild(el.firstChild); },
  bboxOfPaths(paths){
    // paths: [{d}] rough bbox by parsing numbers
    let xs=[], ys=[];
    paths.forEach(p=>{
      const nums = p.d.match(/-?\d+(\.\d+)?/g);
      if(!nums) return;
      nums.forEach((n,i)=> (i%2? ys : xs).push(parseFloat(n)));
    });
    if(!xs.length) return {x:0,y:0,w:10,h:10};
    const minx=Math.min(...xs), miny=Math.min(...ys);
    const maxx=Math.max(...xs), maxy=Math.max(...ys);
    return {x:minx, y:miny, w:maxx-minx, h:maxy-miny};
  }
};

/* ---------- Templates ---------- */
/* Each generator returns:
   {
     params,    // sanitized params (mm)
     cut: [ { d } ],
     score: [ { d } ],
     perf: [ { d } ],
     bleed: [ { d } ],
     dims:  [ {text, x, y} ],
     bbox: {x,y,w,h}
   }
*/
const TEMPLATES = [
  // --- Folding Cartons ---
  {
    id:'ste', name:'Straight Tuck End (STE)', cat:'Folding Carton',
    defaults:{ W:80, H:120, D:40, glue:15, tuck:18, dust:15 },
    gen(p){
      const {W,H,D,glue,tuck,dust} = p;
      // Panels: [GLUE][P1][P2][P3][P4]
      const x0=0, y0=0;
      const P = [
        {x:x0,            w:glue},
        {x:x0+glue,       w:W},
        {x:x0+glue+W,     w:W},
        {x:x0+glue+2*W,   w:W},
        {x:x0+glue+3*W,   w:W}
      ];
      const width = glue + 4*W;
      const height = H + 2*dust + tuck;
      const yBody = dust + tuck;

      const cut=[], score=[], perf=[], bleed=[];
      // outer
      cut.push({d: U.rect(0,0,width,height)});
      // top/bottom dust (same D scale) — simplified rectangular
      P.forEach((pan,i)=>{
        // top dust
        cut.push({d: U.rect(pan.x,0, pan.w, dust)});
        // bottom dust
        cut.push({d: U.rect(pan.x, yBody+H, pan.w, dust)});
      });
      // tuck flaps on P2 and P4 (straight tuck)
      cut.push({d: U.rect(P[1].x, dust, P[1].w, tuck)});
      cut.push({d: U.rect(P[3].x, dust, P[3].w, tuck)});

      // vertical scores between panels
      [glue, glue+W, glue+2*W, glue+3*W, glue+4*W].forEach(x=>{
        score.push({d:`M${x} ${dust} V${dust+tuck+H}`});
      });
      // horizontal scores
      score.push({d:`M0 ${yBody} H${width}`});
      score.push({d:`M0 ${yBody+H} H${width}`});
      // tuck score
      score.push({d:`M${P[1].x} ${dust} H${P[1].x+W}`});
      score.push({d:`M${P[3].x} ${dust} H${P[3].x+W}`});
      // bleed safety (guides)
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});

      const dims=[{text:`W ${W}mm · H ${H}mm · D ${D}mm`, x:width/2, y:height+10}];
      const bbox={x:0,y:0,w:width,h:height};
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  {
    id:'rte', name:'Reverse Tuck End (RTE)', cat:'Folding Carton',
    defaults:{ W:90, H:130, D:35, glue:14, tuck:18, dust:14 },
    gen(p){
      // identical to STE but tucks on P2 top / P4 bottom reversed
      const {W,H,D,glue,tuck,dust}=p;
      const width=glue+4*W, height=H+2*dust+tuck, yBody=dust+tuck;
      const cut=[], score=[], perf=[], bleed=[];
      cut.push({d:U.rect(0,0,width,height)});
      // dusts
      for(let i=0;i<5;i++){
        const x = (i===0?0:glue + (i-1)*W);
        const w = (i===0?glue:W);
        cut.push({d:U.rect(x,0,w,dust)});
        cut.push({d:U.rect(x,yBody+H,w,dust)});
      }
      // tucks: P2 top, P4 bottom (simplified)
      cut.push({d:U.rect(glue+W, dust, W, tuck)});         // top
      cut.push({d:U.rect(glue+3*W, yBody+H, W, dust)});    // bottom "tuck" simplified as extra flap
      // scores
      [glue, glue+W, glue+2*W, glue+3*W, glue+4*W].forEach(x=> score.push({d:`M${x} ${dust} V${dust+tuck+H}`}));
      score.push({d:`M0 ${yBody} H${width}`});
      score.push({d:`M0 ${yBody+H} H${width}`});
      score.push({d:`M${glue+W} ${dust} H${glue+2*W}`});
      const dims=[{text:`W ${W} · H ${H} · D ${D}`, x:width/2, y:height+10}];
      const bbox={x:0,y:0,w:width,h:height};
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  {
    id:'autoBottom', name:'Tuck Top Auto Bottom (Crash-Lock)', cat:'Folding Carton',
    defaults:{ W:80, H:120, D:40, glue:16, tuck:18, dust:14, lock:22 },
    gen(p){
      const {W,H,glue,tuck,dust,lock} = p;
      const width=glue+4*W, height=(H + tuck + dust + lock + dust);
      const yTop=dust+tuck, yBottom=yTop+H;
      const cut=[], score=[], perf=[], bleed=[];

      // outer
      cut.push({d:U.rect(0,0,width,height)});

      // auto-bottom lock geometry (simplified: two diagonal locks at P2/P3 bottom)
      const xP2 = glue+W, xP3 = glue+2*W;
      const botY = yBottom + dust;
      // two triangular locks
      cut.push({d: U.path([{x:xP2, y:botY}, {x:xP2+W*0.5, y:botY+lock}, {x:xP2+W, y:botY}], true)});
      cut.push({d: U.path([{x:xP3, y:botY}, {x:xP3+W*0.5, y:botY+lock}, {x:xP3+W, y:botY}], true)});

      // dust top & bottom rectangles
      for(let i=0;i<5;i++){
        const x = (i===0?0:glue+(i-1)*W);
        const w = (i===0?glue:W);
        cut.push({d:U.rect(x,0,w,dust)});     // top dust
        cut.push({d:U.rect(x, yBottom, w, dust)}); // bottom dust above lock
      }
      // top tuck on P2
      cut.push({d:U.rect(glue+W, dust, W, tuck)});

      // scores between panels
      [glue, glue+W, glue+2*W, glue+3*W, glue+4*W].forEach(x=> score.push({d:`M${x} ${dust} V${yBottom}`}));
      // horizontal scores/top/bottom
      score.push({d:`M0 ${yTop} H${width}`});
      score.push({d:`M0 ${yBottom} H${width}`});

      // bleed guide
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});

      const dims=[{text:`W ${W} · H ${H} · lock ${lock}`, x:width/2, y:height+10}];
      const bbox={x:0,y:0,w:width,h:height};
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  {
    id:'snapLock', name:'Tuck Top Snap-Lock Bottom', cat:'Folding Carton',
    defaults:{ W:90, H:120, D:40, glue:16, tuck:18, dust:14, snap:30 },
    gen(p){
      const {W,H,glue,tuck,dust,snap} = p;
      const width=glue+4*W, height=H+tuck+2*dust+snap;
      const yTop=dust+tuck, yBottom=yTop+H;
      const cut=[], score=[], perf=[], bleed=[];
      cut.push({d:U.rect(0,0,width,height)});
      // snap-lock bottom (simplified tabs on P2/P3)
      const x2=glue+W, x3=glue+2*W;
      cut.push({d:U.rect(x2, yBottom, W, snap)});
      cut.push({d:U.rect(x3, yBottom, W, snap)});
      // dusts + tuck
      for(let i=0;i<5;i++){
        const x=(i===0?0:glue+(i-1)*W), w=(i===0?glue:W);
        cut.push({d:U.rect(x, 0, w, dust)});
        cut.push({d:U.rect(x, yBottom+snap-dust, w, dust)});
      }
      cut.push({d:U.rect(glue+W, dust, W, tuck)});
      // scores
      [glue, glue+W, glue+2*W, glue+3*W, glue+4*W].forEach(x=> score.push({d:`M${x} ${dust} V${yBottom}`}));
      score.push({d:`M0 ${yTop} H${width}`});
      score.push({d:`M0 ${yBottom} H${width}`});
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});
      const bbox={x:0,y:0,w:width,h:height};
      const dims=[{text:`W ${W} · H ${H}`, x:width/2, y:height+10}];
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  { id:'sleeve', name:'Sleeve / Slipcase', cat:'Folding Carton',
    defaults:{ W:120, H:80, glue:15, bleed:3 },
    gen(p){
      const {W,H,glue} = p;
      const width=glue+2*W, height=H+10;
      const cut=[], score=[], perf=[], bleed=[];
      cut.push({d:U.rect(0,0,width,height)});
      // panel divisions
      [glue, glue+W, glue+2*W].forEach(x=> score.push({d:`M${x} 0 V${height}`}));
      // open ends
      cut.push({d:`M0 0 H${width}`}); cut.push({d:`M0 ${height} H${width}`});
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});
      const bbox={x:0,y:0,w:width,h:height};
      const dims=[{text:`W ${W} · H ${H}`, x:width/2, y:height+10}];
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  // --- Corrugated (FEFCO) ---

  {
    id:'0201', name:'0201 Regular Slotted Container (RSC)', cat:'Corrugated',
    defaults:{ L:250, W:150, H:120, slot:6 },
    gen(p){
      const {L,W,H,slot} = p;  // L=length along flaps
      const glue=35;
      const width=glue + 2*(L+W);
      const height=H + 2*W;
      const cut=[], score=[], perf=[], bleed=[];
      // outer
      cut.push({d:U.rect(0,0,width,height)});
      // vertical panel scores (Glue + four panels)
      const xs=[glue, glue+L, glue+L+W, glue+L+W+L, glue+L+W+L+W];
      xs.forEach(x=> score.push({d:`M${x} ${W} V${W+H}`}));
      // horizontal scores
      score.push({d:`M0 ${W} H${width}`});
      score.push({d:`M0 ${W+H} H${width}`});
      // top/bottom flaps slots
      // simplified slots at centerlines
      xs.slice(1,4).forEach(x=>{
        const cx = x;
        cut.push({d:`M${cx} 0 V${W/2 - slot/2}`});
        cut.push({d:`M${cx} ${W/2 + slot/2} V${W}`});
        cut.push({d:`M${cx} ${W+H} V${W+H + W/2 - slot/2}`});
        cut.push({d:`M${cx} ${W+H + W/2 + slot/2} V${height}`});
      });
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});
      const bbox={x:0,y:0,w:width,h:height};
      const dims=[{text:`L ${L} · W ${W} · H ${H}`, x:width/2, y:height+10}];
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  {
    id:'0427', name:'0427 Mailer (roll-end)', cat:'Corrugated',
    defaults:{ L:260, W:180, H:50, tuck:25 },
    gen(p){
      const {L,W,H,tuck}=p;
      const width = (L+W)*2;
      const height = H + W*2 + tuck;
      const cut=[], score=[], perf=[], bleed=[];
      cut.push({d:U.rect(0,0,width,height)});

      const y1=W, y2=W+H, y3=W+H+W;
      // horizontal scores
      score.push({d:`M0 ${y1} H${width}`});
      score.push({d:`M0 ${y2} H${width}`});
      score.push({d:`M0 ${y3} H${width}`});

      // vertical panels
      const x1=L, x2=L+W, x3=L+W+L;
      [x1,x2,x3].forEach(x=> score.push({d:`M${x} 0 V${height}`}));

      // lid tuck (top row)
      cut.push({d:U.rect(x2, 0, L, tuck)});
      // side flaps
      cut.push({d:U.rect(0, y1, L, H)});
      cut.push({d:U.rect(x3, y1, L, H)});
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});
      const bbox={x:0,y:0,w:width,h:height};
      const dims=[{text:`L ${L} · W ${W} · H ${H}`, x:width/2, y:height+10}];
      return {cut,score,perf,bleed,dims,bbox};
    }
  },

  {
    id:'0429', name:'0429 Pizza Box', cat:'Corrugated',
    defaults:{ L:300, W:300, H:40, tab:25 },
    gen(p){
      const {L,W,H,tab}=p;
      const width=L*2+W, height=W+H*2+tab;
      const cut=[], score=[], perf=[], bleed=[];
      cut.push({d:U.rect(0,0,width,height)});

      const x1=L, x2=L+W; const y1=H, y2=H+W, y3=H*2+W;
      // scores
      [x1,x2].forEach(x=> score.push({d:`M${x} 0 V${height}`}));
      [y1,y2,y3].forEach(y=> score.push({d:`M0 ${y} H${width}`}));
      // lid tab
      cut.push({d:U.rect(x1, 0, W, tab)});
      // side walls (simplified)
      cut.push({d:U.rect(0, y1, L, W)});
      cut.push({d:U.rect(x2, y1, L, W)});
      bleed.push({d:U.rect(0.5,0.5,width-1,height-1)});
      const bbox={x:0,y:0,w:width,h:height};
      const dims=[{text:`L ${L} · W ${W} · H ${H}`, x:width/2, y:height+10}];
      return {cut,score,perf,bleed,dims,bbox};
    }
  }
];

/* ---------- DOM refs ---------- */
const viewer = $('#viewer');
const layers = {
  grid:   $('#gridLayer'),
  bleed:  $('#bleedLayer'),
  cut:    $('#cutLayer'),
  score:  $('#scoreLayer'),
  perf:   $('#perfLayer'),
  dims:   $('#dimsLayer'),
  guides: $('#guidesLayer'),
  handles:$('#handlesLayer')
};
const ui = {
  templateSelect: $('#templateSelect'),
  templateSearch: $('#templateSearch'),
  paramSection:   $('#paramSection'),
  units:          $('#units'),
  material:       $('#materialSelect'),
  materialNote:   $('#materialNote'),
  bleed:          $('#bleed'),
  safety:         $('#safety'),
  grid:           $('#gridSize'),
  strokePx:       $('#strokePx'),
  scoreMode:      $('#scoreMode'),
  btnApply:       $('#btnApply'),
  btnReset:       $('#btnReset'),
  btnExport:      $('#btnExport'),
  btnFit:         $('#btnFit'),
  btnZoomIn:      $('#btnZoomIn'),
  btnZoomOut:     $('#btnZoomOut'),
  btn100:         $('#btn100'),
  toggleGrid:     $('#toggleGrid'),
  toggleDims:     $('#toggleDims'),
  toggleGuides:   $('#toggleGuides'),
  toggleEdit:     $('#toggleEdit'),
  stage:          $('#stage'),
  preflight:      $('#preflight'),
  status:         $('#status'),
  zoomDisplay:    $('#zoomDisplay')
};

/* ---------- UI setup ---------- */
function populateTemplates(){
  const grouped = {};
  TEMPLATES.forEach(t => {
    if(!grouped[t.cat]) grouped[t.cat]=[];
    grouped[t.cat].push(t);
  });
  ui.templateSelect.innerHTML = '';
  for(const cat of Object.keys(grouped)){
    const og = document.createElement('optgroup');
    og.label = cat;
    grouped[cat].forEach(t=>{
      const o=document.createElement('option');
      o.value=t.id; o.textContent=t.name; og.appendChild(o);
    });
    ui.templateSelect.appendChild(og);
  }
  ui.templateSelect.value = state.templateId || TEMPLATES[0].id;
}

function populateMaterials(){
  ui.material.innerHTML = '';
  MATERIALS.forEach(m=>{
    const o=document.createElement('option'); o.value=m.id; o.textContent=m.name;
    ui.material.appendChild(o);
  });
  ui.material.value = state.material?.id || 'card-0.50';
  updateMaterialNote();
}

function updateMaterialNote(){
  const m = MATERIALS.find(x=>x.id===ui.material.value);
  state.material = m;
  ui.materialNote.textContent = m.type==='corr' ?
    `Corrugated approx caliper ${m.t} mm (affects slot width & allowances).` :
    (m.id==='custom' ? 'Set custom thickness in checks.' :
    `Paperboard caliper ${m.t} mm (affects flap & tongue clearances).`);
}

/* dynamic parameters for current template */
function renderParamFields(){
  const tpl = TEMPLATES.find(t=>t.id===ui.templateSelect.value);
  state.templateId = tpl.id;
  const defs = tpl.defaults;
  const paramKeys = Object.keys(defs);
  ui.paramSection.innerHTML = '';
  paramKeys.forEach(k=>{
    const wrap=document.createElement('div');
    const label=document.createElement('label'); label.textContent=k;
    const inp=document.createElement('input'); inp.type='number'; inp.step='0.1'; inp.value = state.params[k] ?? defs[k];
    inp.id = `param_${k}`;
    wrap.appendChild(label); wrap.appendChild(inp);
    ui.paramSection.appendChild(wrap);
  });
}

/* ---------- Geometry generation & drawing ---------- */
function readParams(){
  const tpl = TEMPLATES.find(t=>t.id===state.templateId);
  const obj = {};
  for(const k of Object.keys(tpl.defaults)){
    const v = parseFloat($(`#param_${k}`).value);
    obj[k] = isFinite(v) ? v : tpl.defaults[k];
  }
  state.params = obj;
  state.grid = parseFloat(ui.grid.value) || 1;
  state.strokePx = parseFloat(ui.strokePx.value) || 2.5;
  state.scoreMode = ui.scoreMode.value;
}

function generate(){
  const tpl = TEMPLATES.find(t=>t.id===state.templateId);
  const p = {...tpl.defaults, ...state.params};
  const g = tpl.gen(p);

  // convert some score lines to perf depending on scoreMode
  if(state.scoreMode.startsWith('perf')){
    g.perf = g.perf.concat(g.score); // treat all fold lines as perf
    g.score = [];
  } else if(state.scoreMode==='zip'){
    // add a tear strip across body (middle)
    const y = g.bbox.y + g.bbox.h/2;
    g.perf.push({d:`M${g.bbox.x} ${y} H${g.bbox.x+g.bbox.w}`});
  }
  state.geometry = g;
}

function draw(){
  const g = state.geometry;
  const sPx = state.strokePx;

  // clear layers
  Object.values(layers).forEach(U.clear);

  // grid
  if(state.showGrid){
    const step = state.grid;
    const {x,y,w,h} = g.bbox;
    const gx = Math.floor(x/step)*step, gy=Math.floor(y/step)*step;
    for(let X=gx; X<=x+w; X+=step){ U.addPath(layers.grid, `M${X} ${y} V${y+h}`, 'rgba(128,128,128,.35)', .2); }
    for(let Y=gy; Y<=y+h; Y+=step){ U.addPath(layers.grid, `M${x} ${Y} H${x+w}`, 'rgba(128,128,128,.35)', .2); }
  }

  // bleed (guides)
  if(g.bleed) g.bleed.forEach(p=> U.addPath(layers.bleed, p.d, 'var(--bleed)', .5));

  // cut/score/perf
  const addGroupPaths = (arr, target, cls, strokeVar) => {
    arr.forEach(p=> U.addPath(target, p.d, `var(${strokeVar})`, sPx, cls));
  };
  addGroupPaths(g.cut, layers.cut, 'cut', '--cut');
  addGroupPaths(g.score, layers.score, 'score', '--crease');
  addGroupPaths(g.perf, layers.perf, 'perf', '--perf');

  // dims
  if(state.showDims && g.dims){
    g.dims.forEach(d=> U.addText(layers.dims, d.x, d.y, d.text, 4));
  }

  // guides (panel dividers from score lines, lighter)
  if(state.showGuides && g.score){
    g.score.forEach(p=> U.addPath(layers.guides, p.d, 'var(--guide)', .6));
  }

  updateViewBoxToFit(g.bbox);
  ui.status.textContent = `Template: ${TEMPLATES.find(t=>t.id===state.templateId).name}`;
  runPreflight();
  refreshHandles();   // if edit mode is ON
}

/* viewer fit & zoom */
function updateViewBoxToFit(bbox){
  // add margin
  const pad = 20; // mm
  const x = bbox.x - pad, y=bbox.y - pad, w=bbox.w + 2*pad, h=bbox.h + 2*pad;
  viewer.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);

  // compute zoom so SVG fits its pixel box
  const rect = viewer.getBoundingClientRect();
  const zx = rect.width / w, zy = rect.height / h;
  const fit = Math.min(zx, zy);
  state.zoom = fit;
  ui.zoomDisplay.textContent = `${Math.round(fit*100)}%`;
}

/* manual zoom */
function zoomBy(f){
  const vb = viewer.viewBox.baseVal;
  const cx = vb.x + vb.width/2, cy = vb.y + vb.height/2;
  const w = vb.width / f, h = vb.height / f;
  viewer.setAttribute('viewBox', `${cx - w/2} ${cy - h/2} ${w} ${h}`);
  state.zoom *= f; ui.zoomDisplay.textContent = `${Math.round(state.zoom*100)}%`;
}
function zoomTo100(){
  // 100% here = 1 px per mm inside current viewport ratio; emulate by scaling by factor
  updateViewBoxToFit(state.geometry.bbox);
  const vb = viewer.viewBox.baseVal;
  const f = state.zoom / 1; // go back to fit then adjust? keep simple: show fit as 100% to users
  state.zoom = 1; ui.zoomDisplay.textContent = `100%`;
}

/* panning */
let isPanning=false, panStart=null;
viewer.addEventListener('pointerdown', (e)=>{
  isPanning = true;
  viewer.setPointerCapture(e.pointerId);
  const vb = viewer.viewBox.baseVal;
  panStart = {x:e.clientX, y:e.clientY, vx:vb.x, vy:vb.y};
});
viewer.addEventListener('pointermove', (e)=>{
  if(!isPanning) return;
  const vb = viewer.viewBox.baseVal;
  const scaleX = vb.width / viewer.clientWidth;
  const scaleY = vb.height / viewer.clientHeight;
  const dx = (e.clientX - panStart.x) * scaleX;
  const dy = (e.clientY - panStart.y) * scaleY;
  viewer.setAttribute('viewBox', `${panStart.vx - dx} ${panStart.vy - dy} ${vb.width} ${vb.height}`);
});
viewer.addEventListener('pointerup', ()=>{ isPanning=false; });

/* ---------- Node editing ---------- */
let handleRefs = []; // {el, pathIdx, type:'cut'|'score'|'perf', pointIndex}
function refreshHandles(){
  U.clear(layers.handles);
  handleRefs = [];
  if(!state.editMode) return;

  // Simplified: expose vertices for CUT paths only by sampling their 'd' numbers
  const arr = [...layers.cut.querySelectorAll('path')];
  arr.forEach((p,pi)=>{
    const nums = p.getAttribute('d').match(/-?\d+(\.\d+)?/g);
    if(!nums) return;
    for(let i=0;i<nums.length;i+=2){
      const cx=parseFloat(nums[i]), cy=parseFloat(nums[i+1]);
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('r', 1.8); c.setAttribute('class','handle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy);
      c.dataset.pathIndex = pi; c.dataset.pointIndex = (i/2);
      c.addEventListener('pointerdown', startDragHandle);
      layers.handles.appendChild(c);
      handleRefs.push({el:c, pathIdx:pi, pointIndex:(i/2)});
    }
  });
}

let drag={active:false};
function startDragHandle(e){
  drag.active=true;
  const el=e.target; el.setPointerCapture(e.pointerId);
  drag.handle=el; drag.start={x:e.clientX,y:e.clientY};
  const vb=viewer.viewBox.baseVal;
  drag.scaleX = vb.width / viewer.clientWidth;
  drag.scaleY = vb.height / viewer.clientHeight;
}
viewer.addEventListener('pointermove', (e)=>{
  if(!drag.active) return;
  const hb = drag.handle;
  const nx = parseFloat(hb.getAttribute('cx')) + (e.movementX * drag.scaleX);
  const ny = parseFloat(hb.getAttribute('cy')) + (e.movementY * drag.scaleY);
  const gs = state.grid;
  const sx = Math.round(nx/gs)*gs, sy = Math.round(ny/gs)*gs;
  hb.setAttribute('cx', sx); hb.setAttribute('cy', sy);

  // rewrite path d
  const p = layers.cut.querySelectorAll('path')[hb.dataset.pathIndex];
  const nums = p.getAttribute('d').match(/-?\d+(\.\d+)?/g);
  const idx = hb.dataset.pointIndex*2;
  nums[idx]=sx.toFixed(3); nums[idx+1]=sy.toFixed(3);
  // rebuild d by pairing tokens; assume format Mx y Lx y ...
  let d='M'+nums[0]+' '+nums[1];
  for(let i=2;i<nums.length;i+=2) d+=' L'+nums[i]+' '+nums[i+1];
  if(p.getAttribute('d').trim().endsWith('Z')) d+=' Z';
  p.setAttribute('d', d);
});
viewer.addEventListener('pointerup', ()=>{ drag.active=false; });

/* ---------- Preflight ---------- */
function runPreflight(){
  const g = state.geometry;
  const m = state.material;
  const W = [];
  // generic recommendations
  const glue = state.params.glue ?? 0;
  if(glue){
    const minGlue = Math.max(8, 5*m.t);
    if(glue < minGlue) W.push(`Glue flap (${glue} mm) is under recommended minimum (${U.round(minGlue)} mm).`);
  }
  const tuck = state.params.tuck ?? 0;
  if(tuck && m.type==='paper' && tuck < (2*m.t+2)){
    W.push(`Tuck tongue (${tuck} mm) may be tight for ${m.t} mm stock (suggest ≥ ${U.round(2*m.t+2)} mm).`);
  }
  if(ui.bleed.value < ((m.type==='corr')?5:3)){
    W.push(`Bleed set to ${ui.bleed.value} mm; recommend ${m.type==='corr'?5:3} mm.`);
  }
  if(state.scoreMode.startsWith('perf') && m.type==='corr'){
    W.push(`Perforations on corrugated can weaken structure—confirm with plant.`);
  }

  // show box
  const box = ui.preflight;
  if(W.length){
    box.classList.remove('ok');
    box.innerHTML = `<strong>Preflight warnings:</strong><ul>${W.map(s=>`<li>${s}</li>`).join('')}</ul>`;
    box.style.display='block';
  }else{
    box.classList.add('ok');
    box.textContent='Preflight: OK';
    box.style.display='block';
  }
}

/* ---------- Export ---------- */
async function exportZip(){
  readParams(); generate(); // ensure fresh
  const {cut,score,perf,bleed,dims,bbox} = state.geometry;
  const stroke = 0.25; // mm stroke width for export

  // Build export SVG (true mm geometry via viewBox)
  const svgParts = [];
  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.w}mm" height="${bbox.h}mm" viewBox="${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}">`);
  svgParts.push(`<g id="CUT" stroke="#ff005d" fill="none" stroke-width="${stroke}">`);
  cut.forEach(p=> svgParts.push(`<path d="${p.d}"/>`));
  svgParts.push(`</g>`);
  svgParts.push(`<g id="CREASING" stroke="#00a0ff" fill="none" stroke-width="${stroke}">`);
  score.forEach(p=> svgParts.push(`<path d="${p.d}"/>`));
  svgParts.push(`</g>`);
  svgParts.push(`<g id="PERF" stroke="#ffc400" fill="none" stroke-width="${stroke}" stroke-dasharray="8 3">`);
  perf.forEach(p=> svgParts.push(`<path d="${p.d}"/>`));
  svgParts.push(`</g>`);
  svgParts.push(`<g id="BLEED" stroke="#ff5599" fill="none" stroke-width="${stroke}" stroke-dasharray="6 6">`);
  bleed.forEach(p=> svgParts.push(`<path d="${p.d}"/>`));
  svgParts.push(`</g>`);
  svgParts.push(`</svg>`);
  const svgText = svgParts.join('');

  // PDF from on-screen viewer clone
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({unit:'mm', format:[bbox.w, bbox.h]});
  const temp = viewer.cloneNode(true);
  temp.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.w} ${bbox.h}`);
  temp.setAttribute('width', bbox.w);
  temp.setAttribute('height', bbox.h);
  // strip grid/handles in pdf
  temp.querySelector('#gridLayer')?.remove();
  temp.querySelector('#handlesLayer')?.remove();
  await window.svg2pdf(temp, pdf, {x:0, y:0, width:bbox.w, height:bbox.h});
  const pdfBlob = pdf.output('blob');

  // Preflight
  const preflight = ui.preflight.textContent.includes('OK') ? 'OK' : ui.preflight.innerText;

  // README
  const readme =
`Dieline Studio — Export
Colors (map to spot swatches in Illustrator):
  CUT       #ff005d
  CREASING  #00a0ff
  PERF      #ffc400
  BLEED     #ff5599
All paths: strokes only, mm geometry.

Template: ${TEMPLATES.find(t=>t.id===state.templateId).name}
Params: ${JSON.stringify(state.params)}
Material: ${state.material.name}
Score Mode: ${state.scoreMode}`;

  // ZIP
  const zip = new JSZip();
  zip.file('dieline.svg', svgText);
  zip.file('production.pdf', pdfBlob);
  zip.file('preflight.txt', preflight);
  zip.file('readme.txt', readme);
  const blob = await zip.generateAsync({type:'blob'});
  saveAs(blob, 'dieline_export.zip');
}

/* ---------- Events ---------- */
ui.templateSearch.addEventListener('input', ()=>{
  const q = ui.templateSearch.value.toLowerCase();
  $$('option', ui.templateSelect).forEach(o=>{
    o.hidden = !o.textContent.toLowerCase().includes(q);
  });
});

ui.templateSelect.addEventListener('change', ()=>{ renderParamFields(); readParams(); generate(); draw(); });

ui.material.addEventListener('change', ()=>{ updateMaterialNote(); runPreflight(); });
ui.units.addEventListener('change', ()=>{
  state.units = ui.units.value;
  // simple units toggle for labels; geometry remains mm
  draw();
});
ui.grid.addEventListener('change', ()=>{ state.grid=parseFloat(ui.grid.value)||1; draw(); });
ui.strokePx.addEventListener('change', ()=>{ state.strokePx=parseFloat(ui.strokePx.value)||2.5; draw(); });
ui.scoreMode.addEventListener('change', ()=>{ readParams(); generate(); draw(); });

ui.btnApply.addEventListener('click', ()=>{ readParams(); generate(); draw(); });
ui.btnReset.addEventListener('click', ()=>{
  state.params={}; renderParamFields(); readParams(); generate(); draw();
});

ui.btnExport.addEventListener('click', exportZip);

ui.btnFit.addEventListener('click', ()=> updateViewBoxToFit(state.geometry.bbox));
ui.btnZoomIn.addEventListener('click', ()=> zoomBy(0.9));   // decrease viewBox => zoom in
ui.btnZoomOut.addEventListener('click', ()=> zoomBy(1.1));  // increase viewBox => zoom out
ui.btn100.addEventListener('click', zoomTo100);

ui.toggleGrid.addEventListener('change', e=>{ state.showGrid=e.target.checked; draw(); });
ui.toggleDims.addEventListener('change', e=>{ state.showDims=e.target.checked; draw(); });
ui.toggleGuides.addEventListener('change', e=>{ state.showGuides=e.target.checked; draw(); });
ui.toggleEdit.addEventListener('change', e=>{ state.editMode=e.target.checked; refreshHandles(); });

/* Keyboard shortcuts */
window.addEventListener('keydown', (e)=>{
  if(e.key==='f' || e.key==='F'){ updateViewBoxToFit(state.geometry.bbox); }
  if(e.key==='+'){ zoomBy(0.9); }
  if(e.key==='-'){ zoomBy(1.1); }
});

/* ---------- Boot ---------- */
function boot(){
  populateTemplates();
  populateMaterials();
  renderParamFields();
  readParams();
  generate();
  draw();
}
document.addEventListener('DOMContentLoaded', boot);
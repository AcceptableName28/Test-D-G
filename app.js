/* Dieline Editor – minimal working prototype
 * - Template library (starter set)
 * - Exact dimensions + units
 * - Material presets (thickness)
 * - Snap-to grid / vertices; draggable vertex editing
 * - Cut/Crease/Perf as strokes
 * - Validation rules (basic)
 * - Export SVG & DXF (Illustrator-friendly)
 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const state = {
  units: "mm",
  unitScale: 1, // mm factor; in = 25.4
  material: { id:"paper_250gsm", name:"Paperboard 250gsm", caliper_mm:0.30 },
  snapMode: "grid",
  gridSizeMM: 5,
  currentTemplate: null,
  params: {},
  geometry: { cut: [], crease: [], perf: [] }, // arrays of segments
  vertices: [], // editable points
  perfSegments: []
};

const MATERIALS = {
  paper_250gsm: { name:"Paperboard 250gsm", caliper_mm:0.30 },
  paper_300gsm: { name:"Paperboard 300gsm", caliper_mm:0.40 },
  paper_400gsm: { name:"Paperboard 400gsm", caliper_mm:0.55 },
  corr_b: { name:"Corrugated B‑flute", caliper_mm:3.00 },
  corr_e: { name:"Corrugated E‑flute", caliper_mm:1.50 },
};

/* ---------- Templates ----------
 * Each template defines:
 * - id, name, tags
 * - params: array of {key,label,default,min,max,step}
 * - build(params, materialCaliper) -> {cut:[seg], crease:[seg], perf:[seg], vertices:[pt]}
 * All dimensions in mm.
 */
const TEMPLATES = [
  {
    id: "rte-carton",
    name: "Reverse Tuck End Carton (RTE)",
    tags: "folding-carton",
    params: [
      { key:"L", label:"Length (front)", default:120, min:20, max:800, step:1 },
      { key:"W", label:"Width (side)", default:40, min:15, max:500, step:1 },
      { key:"H", label:"Height", default:160, min:20, max:800, step:1 },
      { key:"glue", label:"Glue flap", default:15, min:6, max:40, step:1 },
      { key:"tuck", label:"Tuck flap", default:15, min:8, max:60, step:1 },
    ],
    build: buildRTE
  },
  {
    id: "mailer-0427",
    name: "Mailer (FEFCO 0427‑style)",
    tags: "corrugated mailer",
    params: [
      { key:"L", label:"Internal Length", default:200, min:40, max:1200, step:1 },
      { key:"W", label:"Internal Width", default:120, min:30, max:1000, step:1 },
      { key:"H", label:"Internal Height", default:60, min:20, max:600, step:1 },
      { key:"glue", label:"Glue flap", default:25, min:10, max:45, step:1 },
      { key:"lock", label:"Lock tab", default:15, min:8, max:40, step:1 },
    ],
    build: buildMailer0427
  },
  {
    id: "sleeve",
    name: "Product Sleeve",
    tags: "sleeve",
    params: [
      { key:"L", label:"Length", default:160, min:30, max:800, step:1 },
      { key:"W", label:"Wrap (flat)", default:120, min:40, max:1000, step:1 },
      { key:"glue", label:"Glue flap", default:12, min:6, max:30, step:1 },
    ],
    build: buildSleeve
  }
  // More can be added following same pattern
];

function mm(v){ return v; }
function toUnits(vMM){
  return state.units === "mm" ? vMM : vMM / 25.4;
}
function fromUnits(v){
  return state.units === "mm" ? v : v * 25.4;
}

/* ---- builders: produce straight-line segments (x1,y1,x2,y2) ---- */
function buildRTE(p, cal){
  // Simple panel strip: [Glue][Panel L][Panel W][Panel L][Panel W]
  // Height H with top/bottom tuck flaps
  const H = p.H;
  const L = p.L;
  const W = p.W;
  const G = p.glue;
  const TF = p.tuck;

  // Add small allowances for fold thickness (very simplified “wrap” = caliper)
  const k = cal; // simplistic allowance
  const x0 = 10; const y0 = 10;

  const widths = [G, L+k, W+k, L+k, W+k];
  const X = [x0];
  for (let i=0;i<widths.length;i++) X.push(X[i] + widths[i]);

  const top = y0;
  const mid = y0 + H;
  const bot = y0 + H + TF*2;

  const cut = []; const crease = []; const perf = [];
  // Outer rectangle (including tucks height)
  cut.push([X[0], top-TF, X.at(-1), top-TF]);
  cut.push([X.at(-1), top-TF, X.at(-1), bot]);
  cut.push([X.at(-1), bot, X[0], bot]);
  cut.push([X[0], bot, X[0], top-TF]);

  // Vertical creases between panels
  for(let i=1;i<X.length-1;i++){
    crease.push([X[i], top-TF, X[i], bot]);
  }
  // Top & bottom tuck cut lines over panels (excluding glue)
  // Simplified: just straight trims
  cut.push([X[1], top-TF, X.at(-1), top-TF]); // top trim (skip glue)
  cut.push([X[1], bot, X.at(-1), bot]); // bottom trim (skip glue)

  // Horizontal creases at panel top & bottom
  crease.push([X[0], top, X.at(-1), top]);
  crease.push([X[0], mid, X.at(-1), mid]);

  // Glue flap vertical edges already in outer, add perforation option across a panel (if user added later)
  const verts = collectVerts(cut, crease, perf);
  return { cut, crease, perf, vertices: verts };
}

function buildMailer0427(p, cal){
  // Very simplified mailer: body width = L + 2*H + allowances, height = W + flap
  // Not a perfect 0427 but useful as starting point
  const L = p.L, W = p.W, H = p.H, G = p.glue, lock = p.lock;
  const wrap = L + 2*H + 3*cal; // allowance
  const bodyH = W + H + lock + cal;
  const x0=10, y0=10;
  const cut=[], crease=[], perf=[];

  // Outer
  cut.push([x0, y0, x0+wrap+G, y0]);
  cut.push([x0+wrap+G, y0, x0+wrap+G, y0+bodyH]);
  cut.push([x0+wrap+G, y0+bodyH, x0, y0+bodyH]);
  cut.push([x0, y0+bodyH, x0, y0]);

  // Glue flap
  crease.push([x0+G, y0, x0+G, y0+bodyH]);

  // Main vertical folds (side walls)
  const v1 = x0+G+H+cal;
  const v2 = v1+L+cal;
  const v3 = v2+H+cal;
  [v1,v2,v3].forEach(x=> crease.push([x, y0, x, y0+bodyH]));

  // Lid hinge
  const lidY = y0+W;
  crease.push([x0, lidY, x0+wrap+G, lidY]);

  // Simple lock tab cut at top center
  const cx = x0+G+H+cal + L/2;
  cut.push([cx-10, y0, cx-10, y0+10]);
  cut.push([cx+10, y0, cx+10, y0+10]);
  cut.push([cx-10, y0+10, cx+10, y0+10]);

  const verts = collectVerts(cut, crease, perf);
  return { cut, crease, perf, vertices: verts };
}

function buildSleeve(p, cal){
  const L=p.L, W=p.W, G=p.glue;
  const x0=10, y0=10;
  const cut=[], crease=[], perf=[];
  // Outer
  cut.push([x0, y0, x0+W+G, y0]);
  cut.push([x0+W+G, y0, x0+W+G, y0+L]);
  cut.push([x0+W+G, y0+L, x0, y0+L]);
  cut.push([x0, y0+L, x0, y0]);
  // Glue flap
  crease.push([x0+W, y0, x0+W, y0+L]);
  const verts = collectVerts(cut, crease, perf);
  return { cut, crease, perf, vertices: verts };
}

/* ---- Validation rules (basic/common-sense) ---- */
function validate(params, caliper){
  const msgs = [];

  function ok(msg){ msgs.push({ok:true, msg}); }
  function fail(msg){ msgs.push({ok:false, msg}); }

  const mm = (x)=>x;
  const { L, W, H, glue, tuck, lock } = params;

  // Glue flap: >= max(10mm, 3×caliper) for paperboard; >= max(20mm, 4×caliper) corrugated
  if (glue !== undefined){
    const minGlue = (caliper <= 1.0) ? Math.max(10, 3*caliper) : Math.max(20, 4*caliper);
    (glue >= minGlue) ? ok(`Glue flap OK (≥ ${minGlue.toFixed(1)} mm)`) : fail(`Glue flap too small (< ${minGlue.toFixed(1)} mm)`);
  }
  // Tuck flap length: ≥ 0.2 × L (very rough)
  if (tuck !== undefined && L !== undefined){
    const minTuck = Math.max(8, 0.2*L);
    (tuck >= minTuck) ? ok(`Tuck flap OK (≥ ${minTuck.toFixed(0)} mm)`) : fail(`Tuck flap too small (< ${minTuck.toFixed(0)} mm)`);
  }
  // Minimum panel width/height sanity
  ["L","W","H"].forEach(k=>{
    if (params[k] !== undefined && params[k] < 15){
      fail(`${k} looks very small (< 15 mm)`);
    }
  });
  // Parallel crease spacing ≥ 2 × caliper (avoid cracking)
  if (H && caliper){
    const minGap = 2*caliper;
    (H >= minGap) ? ok(`Panel height OK vs caliper`) : fail(`Panel height (${H} mm) is close to material thickness (${caliper} mm)`);
  }

  return msgs;
}

/* ---- Rendering & interaction ---- */
function collectVerts(...groups){
  const set = new Map();
  groups.flat().forEach(seg=>{
    const [x1,y1,x2,y2] = seg;
    const key1 = `${x1.toFixed(3)},${y1.toFixed(3)}`;
    const key2 = `${x2.toFixed(3)},${y2.toFixed(3)}`;
    set.set(key1, {x:x1,y:y1});
    set.set(key2, {x:x2,y:y2});
  });
  return Array.from(set.values());
}

function render(){
  const svg = $("#svg");
  const gCut = $("#g-cut"), gCrease = $("#g-crease"), gPerf=$("#g-perf"), gVerts=$("#g-verts");
  [gCut,gCrease,gPerf,gVerts].forEach(g=> g.innerHTML="");

  const scale = 3.77953; // px per mm @ 96dpi
  const gridPx = state.gridSizeMM * scale;
  $("#gridPattern").setAttribute("width", gridPx);
  $("#gridPattern").setAttribute("height", gridPx);

  const drawSegments = (g, segs) => {
    segs.forEach(([x1,y1,x2,y2])=>{
      const el = document.createElementNS("http://www.w3.org/2000/svg","line");
      el.setAttribute("x1", x1*scale);
      el.setAttribute("y1", y1*scale);
      el.setAttribute("x2", x2*scale);
      el.setAttribute("y2", y2*scale);
      g.appendChild(el);
    });
  };

  drawSegments(gCut, state.geometry.cut);
  drawSegments(gCrease, state.geometry.crease);
  drawSegments(gPerf, state.geometry.perf);

  // Vertex handles
  state.vertices.forEach((p,idx)=>{
    const el = document.createElementNS("http://www.w3.org/2000/svg","circle");
    el.setAttribute("cx", p.x*scale);
    el.setAttribute("cy", p.y*scale);
    el.setAttribute("r", 3);
    el.setAttribute("data-vidx", idx);
    el.style.cursor = "pointer";
    gVerts.appendChild(el);
  });
}

function snapPoint(x, y){
  if (state.snapMode === "off") return {x,y};
  if (state.snapMode === "grid"){
    const g = state.gridSizeMM;
    return { x: Math.round(x/g)*g, y: Math.round(y/g)*g };
  }
  if (state.snapMode === "verts"){
    // snap to nearest vertex if within radius 4mm
    const r=4, rr=r*r;
    let best = null, bestd=1e9;
    state.vertices.forEach(p=>{
      const dx=x-p.x, dy=y-p.y, d=dx*dx+dy*dy;
      if (d<bestd && d<=rr){ bestd=d; best=p; }
    });
    return best ? {x:best.x, y:best.y} : {x,y};
  }
  return {x,y};
}

function attachDrag(){
  const svg = $("#svg");
  let dragging = null;

  svg.addEventListener("pointerdown", (e)=>{
    const t = e.target;
    if (t.tagName.toLowerCase()==="circle" && t.hasAttribute("data-vidx")){
      dragging = { idx: parseInt(t.getAttribute("data-vidx")) };
      svg.setPointerCapture(e.pointerId);
    }
  });
  svg.addEventListener("pointermove", (e)=>{
    if (!dragging) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const scr = pt.matrixTransform(svg.getScreenCTM().inverse());
    const scale = 3.77953;
    let x = scr.x/scale, y = scr.y/scale;
    ({x,y} = snapPoint(x,y));
    // Move the vertex and all segments that use it
    const v = state.vertices[dragging.idx];
    const ox=v.x, oy=v.y;
    v.x=x; v.y=y;
    const moveIfMatch = (seg)=>{
      if (Math.abs(seg[0]-ox)<1e-6 && Math.abs(seg[1]-oy)<1e-6){ seg[0]=x; seg[1]=y; }
      if (Math.abs(seg[2]-ox)<1e-6 && Math.abs(seg[3]-oy)<1e-6){ seg[2]=x; seg[3]=y; }
    };
    state.geometry.cut.forEach(moveIfMatch);
    state.geometry.crease.forEach(moveIfMatch);
    state.geometry.perf.forEach(moveIfMatch);
    render();
  });
  svg.addEventListener("pointerup", (e)=>{
    if (dragging){ svg.releasePointerCapture(e.pointerId); dragging=null; }
  });
}

function setTemplate(t){
  state.currentTemplate = t;
  state.params = {};
  const paramsDiv = $("#params");
  paramsDiv.innerHTML = "";
  t.params.forEach(p=>{
    state.params[p.key] = p.default;
    const row = document.createElement("div");
    row.className = "param";
    const lab = document.createElement("label"); lab.textContent = p.label;
    const inp = document.createElement("input");
    inp.type="number"; inp.value = toUnits(p.default).toFixed(2);
    inp.min = toUnits(p.min); inp.max = toUnits(p.max); inp.step = (state.units==="mm"?p.step: (p.step/25.4).toFixed(3));
    inp.addEventListener("input", ()=>{
      state.params[p.key] = fromUnits(parseFloat(inp.value)||0);
      rebuild();
    });
    row.appendChild(lab); row.appendChild(inp);
    paramsDiv.appendChild(row);
  });
  rebuild();
}

function rebuild(){
  const cal = state.material.caliper_mm;
  const out = state.currentTemplate.build(state.params, cal);
  state.geometry = { cut: out.cut, crease: out.crease, perf: out.perf.concat(state.perfSegments) };
  state.vertices = out.vertices;
  render();
  // Validate
  const msgs = validate(state.params, cal);
  const ul=$("#validation"); ul.innerHTML="";
  msgs.forEach(m=>{
    const li=document.createElement("li"); li.textContent=m.msg; li.className = m.ok? "ok":"fail";
    ul.appendChild(li);
  });
}

function exportSVG(){
  const scale = 3.77953;
  function pathFromSegs(segs){
    return segs.map(([x1,y1,x2,y2])=>`M ${x1} ${y1} L ${x2} ${y2}`).join(" ");
  }
  const cut = pathFromSegs(state.geometry.cut);
  const crease = pathFromSegs(state.geometry.crease);
  const perf = pathFromSegs(state.geometry.perf);
  const w=1000/scale, h=700/scale;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <g id="CUT" stroke="#FF0000" stroke-width="0.25" fill="none">${cut?`<path d="${cut}"/>`:""}</g>
  <g id="CREASE" stroke="#00A0FF" stroke-width="0.25" fill="none" stroke-dasharray="4 2">${crease?`<path d="${crease}"/>`:""}</g>
  <g id="PERF" stroke="#FF7F00" stroke-width="0.25" fill="none" stroke-dasharray="2 2">${perf?`<path d="${perf}"/>`:""}</g>
</svg>`;
  downloadBlob(new Blob([svg], {type:"image/svg+xml"}), `dieline_${state.currentTemplate.id}.svg`);
}

function exportDXF(){
  // Extremely minimalistic DXF writer: LINE entities only
  function dxfLines(segs, layer){
    return segs.map(([x1,y1,x2,y2])=>`0
LINE
8
${layer}
10
${x1}
20
${-y1}
30
0
11
${x2}
21
${-y2}
31
0`).join("\n");
  }
  const header = `0
SECTION
2
ENTITIES
`;
  const body =
    dxfLines(state.geometry.cut, "CUT") +
    dxfLines(state.geometry.crease, "CREASE") +
    dxfLines(state.geometry.perf, "PERF");
  const tail = `0
ENDSEC
0
EOF`;
  const dxf = header + body + tail;
  downloadBlob(new Blob([dxf], {type:"application/dxf"}), `dieline_${state.currentTemplate.id}.dxf`);
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display="none";
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
}

function addPerf(){
  // Add a horizontal perf across current art at cursor Y (or center if none)
  const bboxY = 200; // default location
  const minX = Math.min(...state.geometry.cut.map(s=>Math.min(s[0],s[2])));
  const maxX = Math.max(...state.geometry.cut.map(s=>Math.max(s[0],s[2])));
  const y = bboxY;
  state.perfSegments.push([minX, y, maxX, y]);
  rebuild();
}
function clearPerf(){
  state.perfSegments = [];
  rebuild();
}

/* ---- UI init ---- */
function init(){
  // Fill template list
  const list = $("#templateList");
  TEMPLATES.forEach(t=>{
    const el = document.createElement("div");
    el.className = "template";
    el.innerHTML = `<div class="thumb">
      <svg viewBox="0 0 120 50" width="44" height="44">
        <rect x="2" y="8" width="116" height="34" fill="none" stroke="#999" stroke-width="1"/>
        <line x1="30" y1="8" x2="30" y2="42" stroke="#999" stroke-width="1"/>
        <line x1="60" y1="8" x2="60" y2="42" stroke="#999" stroke-width="1"/>
        <line x1="90" y1="8" x2="90" y2="42" stroke="#999" stroke-width="1"/>
      </svg>
    </div>
    <div>
      <div class="name">${t.name}</div>
      <div class="meta">${t.tags}</div>
    </div>`;
    el.addEventListener("click", ()=> setTemplate(t));
    list.appendChild(el);
  });

  // Defaults
  setTemplate(TEMPLATES[0]);

  // Controls
  $("#units").addEventListener("change", (e)=>{
    state.units = e.target.value;
    // rebuild parameter inputs for unit conversion
    setTemplate(state.currentTemplate);
  });
  $("#materialPreset").addEventListener("change", (e)=>{
    const mat = MATERIALS[e.target.value];
    state.material = { id:e.target.value, name:mat.name, caliper_mm: mat.caliper_mm };
    rebuild();
  });
  $("#snapMode").addEventListener("change", (e)=>{ state.snapMode = e.target.value; });
  $("#gridSize").addEventListener("input", (e)=>{ state.gridSizeMM = Math.max(1, parseFloat(e.target.value)||5); render(); });

  $("#btnAddPerf").addEventListener("click", addPerf);
  $("#btnClearPerf").addEventListener("click", clearPerf);
  $("#btnExportSVG").addEventListener("click", exportSVG);
  $("#btnExportDXF").addEventListener("click", exportDXF);

  attachDrag();
  render();
}

document.addEventListener("DOMContentLoaded", init);


import type { FormState, Dims } from './types'

export const pxPerUnit = (units:'in'|'mm') => units === 'in' ? 96 : 3.7795275591

export function toInternal(s: FormState): Dims {
  const t = s.material.caliper
  if (s.dimMode === 'product_clearance' && s.product) {
    const {L,W,H,clearance} = s.product
    return { Li: L + 2*clearance, Wi: W + 2*clearance, Hi: H + clearance }
  }
  if (s.dimMode === 'external') {
    return { Li: s.L - 2*t, Wi: s.W - 2*t, Hi: s.H - t }
  }
  return { Li: s.L, Wi: s.W, Hi: s.H }
}

function add(el:SVGElement, child:SVGElement){ el.appendChild(child); return child }
function line(svg:SVGElement, x1:number,y1:number,x2:number,y2:number, cls:string){
  const p = document.createElementNS('http://www.w3.org/2000/svg','line')
  p.setAttribute('x1',String(x1)); p.setAttribute('y1',String(y1))
  p.setAttribute('x2',String(x2)); p.setAttribute('y2',String(y2))
  p.setAttribute('class',cls)
  return add(svg,p)
}
function path(svg:SVGElement, d:string, cls:string){
  const p = document.createElementNS('http://www.w3.org/2000/svg','path')
  p.setAttribute('d',d); p.setAttribute('class',cls)
  return add(svg,p)
}
function rect(svg:SVGElement, x:number,y:number,w:number,h:number, cls:string){
  const r = document.createElementNS('http://www.w3.org/2000/svg','rect')
  r.setAttribute('x',String(x)); r.setAttribute('y',String(y))
  r.setAttribute('width',String(w)); r.setAttribute('height',String(h))
  r.setAttribute('class',cls); r.setAttribute('fill','none')
  return add(svg,r)
}
function text(svg:SVGElement, x:number,y:number, str:string, cls='dims', anchor:'start'|'middle'|'end'='middle'){
  const t = document.createElementNS('http://www.w3.org/2000/svg','text')
  t.setAttribute('x',String(x)); t.setAttribute('y',String(y))
  t.setAttribute('class',cls); t.setAttribute('text-anchor',anchor)
  t.textContent = str
  return add(svg,t)
}

function dimArrow(svg:SVGElement, x1:number,y1:number,x2:number,y2:number,label:string){
  // main line
  line(svg,x1,y1,x2,y2,'dims')
  // arrowheads
  const ah = 6
  line(svg,x1,y1,x1+(x2<x1?-ah:ah), y1-4,'dims')
  line(svg,x1,y1,x1+(x2<x1?-ah:ah), y1+4,'dims')
  line(svg,x2,y2,x2+(x2<x1?ah:-ah), y2-4,'dims')
  line(svg,x2,y2,x2+(x2<x1?ah:-ah), y2+4,'dims')
  text(svg, (x1+x2)/2, y1-6, label)
}

export function downloadSVG(svg: SVGSVGElement, filename='dieline.svg') {
  const src = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([src], {type:'image/svg+xml'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadPNG(svg: SVGSVGElement, filename='dieline.png', scale=2){
  const src = new XMLSerializer().serializeToString(svg)
  const svgBlob = new Blob([src], {type:'image/svg+xml'})
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  const vb = svg.viewBox.baseVal
  const w = vb && vb.width ? vb.width : svg.getBoundingClientRect().width
  const h = vb && vb.height ? vb.height : svg.getBoundingClientRect().height
  await new Promise(res => { img.onload = res; img.src = url })
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.ceil(w*scale), height: Math.ceil(h*scale) })
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(scale,0,0,scale,0,0)
  ctx.drawImage(img, 0, 0)
  return new Promise<void>(res => canvas.toBlob((blob)=>{
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob!); a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(a.href)
    URL.revokeObjectURL(url)
    res()
  }))
}

export function buildDielineSVG(s: FormState, svg: SVGSVGElement) {
  const { Li, Wi, Hi } = toInternal(s)
  const px = pxPerUnit(s.units)

  const P = [Li, Wi, Li, Wi]
  const height = Hi
  const tuckTop = Math.max(12* (s.units==='mm'?0.03937:1), Math.min(Wi * 0.5, s.top.tuckDepth || 0.55 * Wi))
  const flapBottom = s.bottom.style === 'SNAP'
    ? Math.max(10*(s.units==='mm'?0.03937:1), s.bottom.male || Wi*0.45)
    : Math.max(12*(s.units==='mm'?0.03937:1), s.bottom.dust || Wi*0.5)

  let x = 0
  const panelX: number[] = []
  for (const w of P) { panelX.push(x); x += w }
  const glueW = s.glue.flap
  const totalW = x + glueW
  const totalH = tuckTop + height + flapBottom

  while (svg.firstChild) svg.removeChild(svg.firstChild)
  svg.setAttribute('viewBox', `0 0 ${totalW*px} ${totalH*px}`)
  const g = document.createElementNS('http://www.w3.org/2000/svg','g')
  svg.appendChild(g)

  // Panel body (outline)
  const body = `M0 ${tuckTop*px} H${(totalW)*px} V${(tuckTop+height)*px} H0 Z`
  path(g, body, 'cut')

  // Vertical creases between panels + glue crease
  for (let i=1;i<P.length;i++) {
    const vx = (panelX[i])*px
    line(g, vx, tuckTop*px, vx, (tuckTop+height)*px, 'crease')
  }
  line(g, (totalW-glueW)*px, tuckTop*px, (totalW-glueW)*px, (tuckTop+height)*px, 'crease')

  // Top flaps with radius + optional thumb notch
  for (let i=0;i<4;i++){
    const x0 = panelX[i], w = P[i]
    const r = Math.min(s.top.radius, Math.min(w, tuckTop)/3)
    const y0 = tuckTop
    const d = [
      `M${(x0)*px} ${y0*px}`,
      `v${-tuckTop*px}`,
      r>0?`h${(w-r)*px} a${r*px},${r*px} 0 0 1 ${r*px},${r*px}`:`h${w*px}`,
      `v${(tuckTop - r)*px}`,
      r>0?`h${-w*px + r*px} a${r*px},${r*px} 0 0 1 ${-r*px},${-r*px}`:`h${-w*px}`,
      `Z`
    ].join(' ')
    path(g,d,'cut')
    // base crease
    line(g, x0*px, y0*px, (x0+w)*px, y0*px, 'crease')

    // thumb notch on the third panel for demonstration, or if features specify
    if (s.features.thumbNotch.on && i===1){
      const notchW = Math.min(s.features.thumbNotch.width, w*0.6)
      const cx = (x0 + w/2)*px
      const ry = 0.35 * tuckTop * px
      const rx = (notchW/2)*px
      const y = (y0 - 0.05*tuckTop)*px
      const nd = `M${(cx-rx)} ${y} A ${rx} ${ry} 0 0 1 ${cx+rx} ${y}`
      path(g, nd, 'cut')
    }
  }

  // Bottom flaps
  for (let i=0;i<4;i++){
    const x0 = panelX[i], w = P[i]
    const baseY = (tuckTop+height)
    line(g, x0*px, baseY*px, (x0+w)*px, baseY*px, 'crease')
    if (s.bottom.style === 'SNAP'){
      const isMale = (i%2===0)
      if (isMale){
        const tongue = Math.min(w*0.5, flapBottom*0.6)
        const d = [
          `M${x0*px} ${baseY*px}`,
          `v${flapBottom*px}`,
          `h${(w - tongue)/2 * px}`,
          `l${tongue/2 * px} ${-flapBottom*px}`,
          `l${tongue/2 * px} ${flapBottom*px}`,
          `h${(w - tongue)/2 * px}`,
          `v${-flapBottom*px}`,
          `Z`
        ].join(' ')
        path(g,d,'cut')
      } else {
        const d = `M${x0*px} ${baseY*px} v${flapBottom*px} h${w*px} v${-flapBottom*px} Z`
        path(g,d,'cut')
      }
    } else if (s.bottom.style === 'AUTO'){
      const d = `M${x0*px} ${baseY*px} v${flapBottom*px} h${w*px} v${-flapBottom*px} Z`
      path(g,d,'cut')
      const cx = (x0 + w/2)*px
      const y0 = baseY*px
      const y1 = (baseY + flapBottom)*px
      line(g, x0*px, y0, cx, y1, 'crease')
      line(g, (x0+w)*px, y0, cx, y1, 'crease')
    } else {
      const d = `M${x0*px} ${baseY*px} v${flapBottom*px} h${w*px} v${-flapBottom*px} Z`
      path(g,d,'cut')
    }
  }

  // Window cutout on selected panel
  if (s.features.window.on){
    const idx = Math.min(Math.max(s.features.window.panelIndex,0),3)
    const x0 = panelX[idx]
    const w = P[idx]
    const wx = (x0 + s.features.window.x) * px
    const wy = (tuckTop + (height - s.features.window.h)/2 - s.features.window.y) * px
    const ww = s.features.window.w * px
    const wh = s.features.window.h * px
    const r = Math.min(s.features.window.r*px, ww/4, wh/4)
    const d = [
      `M${wx+r} ${wy}`,
      `H${wx+ww-r}`,
      `A${r} ${r} 0 0 1 ${wx+ww} ${wy+r}`,
      `V${wy+wh-r}`,
      `A${r} ${r} 0 0 1 ${wx+ww-r} ${wy+wh}`,
      `H${wx+r}`,
      `A${r} ${r} 0 0 1 ${wx} ${wy+wh-r}`,
      `V${wy+r}`,
      `A${r} ${r} 0 0 1 ${wx+r} ${wy}`,
      'Z'
    ].join(' ')
    path(g, d, 'cut')
  }

  // Simple dimension overlay
  if (s.showDims){
    const yTop = (tuckTop*px) - 10
    dimArrow(g, 0, yTop, totalW*px, yTop, `${(totalW).toFixed(3)} ${s.units} flat width`)
    const xRight = (totalW*px) + 10
    // vertical arrow
    line(g, totalW*px + 10, 0, totalW*px + 10, totalH*px, 'dims')
    text(g, xRight + 14, (totalH*px)/2, `${(totalH).toFixed(3)} ${s.units} flat height`, 'dims', 'start')
  }

  return svg
}


import React from 'react'
import type { FormState } from '../lib/types'
import { presets } from '../lib/presets'

type Props = {
  state: FormState
  onChange: (patch: Partial<FormState>) => void
  onImport: (data: Partial<FormState>) => void
}

const Number = ({label, value, min=0, step=0.001, onChange}:{label:string,value:number,min?:number,step?:number,onChange:(n:number)=>void}) => (
  <div>
    <label>{label}</label>
    <input type="number" value={isFinite(value)?value:0} min={min} step={step} onChange={e=>onChange(parseFloat(e.target.value))} />
  </div>
)

export default function DielineForm({state, onChange, onImport}:Props){
  const set = (k:keyof FormState, v:any)=> onChange({[k]:v} as any)
  const feat = state.features
  const bottom = state.bottom.style

  function exportJSON(){
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'dieline-state.json'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(a.href)
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { onImport(JSON.parse(String(reader.result))) } catch {}
    }
    reader.readAsText(file)
  }

  return (
    <div className="card">
      <fieldset className="grid-2">
        <div>
          <label>Preset</label>
          <select value={state.preset ?? ''} onChange={e=>{
            const key = e.target.value
            set('preset', key)
            const p = presets[key]
            if(p) onChange({...state, ...p} as any)
          }}>
            <option value="">-- none --</option>
            {Object.keys(presets).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop: 18}}>
          <button className="ghost" onClick={exportJSON} type="button">Export JSON</button>
          <label className="badge" style={{cursor:'pointer'}}>
            Import <input type="file" accept="application/json" onChange={importJSON} style={{display:'none'}} />
          </label>
        </div>

        <div>
          <label>Units</label>
          <select value={state.units} onChange={e=>set('units', e.target.value as any)}>
            <option value="in">inches</option>
            <option value="mm">mm</option>
          </select>
        </div>
        <div>
          <label>Dimensions Mode</label>
          <select value={state.dimMode} onChange={e=>set('dimMode', e.target.value as any)}>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="product_clearance">Product + Clearance</option>
          </select>
        </div>
        <Number label="Length (L)" value={state.L} onChange={n=>set('L', n)} />
        <Number label="Width (W)" value={state.W} onChange={n=>set('W', n)} />
        <Number label="Height (H)" value={state.H} onChange={n=>set('H', n)} />
        <Number label="Caliper (board t)" value={state.material.caliper} step={0.001} onChange={n=>set('material', {...state.material, caliper:n})} />
        <Number label="Glue flap width" value={state.glue.flap} step={0.01} onChange={n=>set('glue', {...state.glue, flap:n})} />
        <div>
          <label>Glue side</label>
          <select value={state.glue.side} onChange={e=>set('glue', {...state.glue, side: e.target.value as any})}>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Top</legend>
        <div className="grid-3">
          <div>
            <label>Style</label>
            <select value={state.top.style} onChange={e=>set('top', {...state.top, style: e.target.value as any})}>
              <option value="RTE">RTE</option>
              <option value="STE">STE</option>
              <option value="TTAB">TTAB</option>
            </select>
          </div>
          <Number label="Tuck depth" value={state.top.tuckDepth} onChange={n=>set('top', {...state.top, tuckDepth:n})}/>
          <Number label="Dust flap" value={state.top.dust} onChange={n=>set('top', {...state.top, dust:n})}/>
          <Number label="Radius" value={state.top.radius} onChange={n=>set('top', {...state.top, radius:n})}/>
        </div>
        <div className="grid-2">
          <div className="row">
            <input id="thumb" type="checkbox" checked={state.features.thumbNotch.on} onChange={e=>onChange({features:{...feat, thumbNotch:{...feat.thumbNotch, on: e.target.checked}}})}/>
            <label htmlFor="thumb">Thumb notch</label>
          </div>
          <Number label="Notch width" value={feat.thumbNotch.width} onChange={n=>onChange({features:{...feat, thumbNotch:{...feat.thumbNotch, width:n}}})}/>
        </div>
      </fieldset>

      <fieldset>
        <legend>Bottom</legend>
        <div className="grid-3">
          <div>
            <label>Style</label>
            <select value={state.bottom.style} onChange={e=>set('bottom', {...state.bottom, style: e.target.value as any})}>
              <option value="SNAP">Snap-lock</option>
              <option value="AUTO">Auto (crash-lock)</option>
              <option value="TUCK">Tuck</option>
              <option value="HINGED">Hinged</option>
            </select>
          </div>
          {bottom==='AUTO' && <Number label="Overlap" value={state.bottom.overlap} onChange={n=>set('bottom', {...state.bottom, overlap:n})}/>}
          {bottom==='AUTO' && <Number label="Diag (deg)" value={state.bottom.diag} onChange={n=>set('bottom', {...state.bottom, diag:n})}/>}
          {bottom==='SNAP' && <Number label="Male depth" value={state.bottom.male} onChange={n=>set('bottom', {...state.bottom, male:n})}/>}
          {bottom==='SNAP' && <Number label="Female depth" value={state.bottom.female} onChange={n=>set('bottom', {...state.bottom, female:n})}/>}
          {bottom!=='HINGED' && <Number label="Dust width" value={state.bottom.dust} onChange={n=>set('bottom', {...state.bottom, dust:n})}/>}
        </div>
      </fieldset>

      <fieldset>
        <legend>Features</legend>
        <div className="grid-3">
          <div className="row">
            <input id="corr" type="checkbox" checked={feat.corrugated} onChange={e=>onChange({features:{...feat, corrugated:e.target.checked}})} />
            <label htmlFor="corr">Corrugated mode</label>
          </div>
          <div className="row">
            <input id="win" type="checkbox" checked={feat.window.on} onChange={e=>onChange({features:{...feat, window:{...feat.window, on:e.target.checked}}})} />
            <label htmlFor="win">Window cutout</label>
          </div>
          <div>
            <label>Window panel (0..3)</label>
            <input type="number" value={feat.window.panelIndex} min={0} max={3} onChange={e=>onChange({features:{...feat, window:{...feat.window, panelIndex:parseInt(e.target.value||'0')}}})} />
          </div>
          <Number label="Win W" value={feat.window.w} onChange={n=>onChange({features:{...feat, window:{...feat.window, w:n}}})} />
          <Number label="Win H" value={feat.window.h} onChange={n=>onChange({features:{...feat, window:{...feat.window, h:n}}})} />
          <Number label="Win radius" value={feat.window.r} onChange={n=>onChange({features:{...feat, window:{...feat.window, r:n}}})} />
          <Number label="Win X offset" value={feat.window.x} onChange={n=>onChange({features:{...feat, window:{...feat.window, x:n}}})} />
          <Number label="Win Y offset" value={feat.window.y} onChange={n=>onChange({features:{...feat, window:{...feat.window, y:n}}})} />
        </div>
      </fieldset>

      <fieldset className="grid-2">
        <Number label="Bleed" value={state.bleed} onChange={n=>set('bleed', n)} />
        <Number label="Safety" value={state.safety} onChange={n=>set('safety', n)} />
        <div className="row">
          <input id="dims" type="checkbox" checked={state.showDims} onChange={e=>set('showDims', e.target.checked)} />
          <label htmlFor="dims">Show dimension overlay</label>
        </div>
      </fieldset>
    </div>
  )
}

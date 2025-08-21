
import React, { useEffect, useRef } from 'react'
import type { FormState } from '../lib/types'
import { buildDielineSVG, downloadSVG, downloadPNG } from '../lib/geometry'

export default function DielinePreview({state}:{state:FormState}) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(()=>{
    if(ref.current) buildDielineSVG(state, ref.current)
  }, [state])

  return (
    <div className="card">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <strong>Preview</strong>
        <div className="toolbar">
          <button onClick={()=> ref.current && downloadSVG(ref.current, 'dieline.svg')}>Export SVG</button>
          <button onClick={()=> ref.current && downloadPNG(ref.current, 'dieline.png', 3)} className="ghost">Export PNG</button>
        </div>
      </div>
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" />
    </div>
  )
}

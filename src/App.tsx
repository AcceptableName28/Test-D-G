
import React, { useState } from 'react'
import DielineForm from './components/DielineForm'
import DielinePreview from './components/DielinePreview'
import type { FormState } from './lib/types'

const initial: FormState = {
  units: 'in',
  dimMode: 'internal',
  L: 4, W: 2, H: 6,
  material: { grade: '18pt C1S', caliper: 0.018 },
  glue: { side: 'right', flap: 0.5 },
  top: { style:'RTE', tuckDepth: 1.1, radius: 0.25, dust: 0.5 },
  bottom: { style:'SNAP', diag: 45, overlap: 0.2, male: 1.0, female: 0.9, dust: 0.5 },
  bleed: 0.125,
  safety: 0.125,
  showDims: true,
  features: {
    window: { on: false, w:1.2, h:1.8, r:0.1, x:0.4, y:0.2, panelIndex:1 },
    thumbNotch: { on: true, width: 0.8, offset: 0 },
    corrugated: false
  },
  preset: undefined
}

export default function App(){
  const [state, setState] = useState<FormState>(initial)
  const patch = (p:Partial<FormState>) => setState(s => ({...s, ...p}))

  const doImport = (data: Partial<FormState>) => setState(s => ({...s, ...data}))

  return (
    <>
      <header>
        <h3 style={{margin:0}}>Dieline Lab Pro</h3>
      </header>
      <div className="container">
        <DielineForm state={state} onChange={patch} onImport={doImport} />
        <DielinePreview state={state} />
      </div>
    </>
  )
}

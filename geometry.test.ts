
import { describe, it, expect } from 'vitest'
import { toInternal } from '../src/lib/geometry'
import type { FormState } from '../src/lib/types'

const base: FormState = {
  units:'in',
  dimMode:'internal',
  L: 4, W: 2, H: 6,
  material: { grade:'18pt', caliper:0.018 },
  glue: { side:'right', flap:0.5 },
  top: { style:'RTE', tuckDepth:1, radius:0.25, dust:0.5 },
  bottom: { style:'SNAP', diag:45, overlap:0.2, male:1, female:1, dust:0.5 },
  bleed:0.125,
  safety:0.125,
  showDims: false,
  features: { window:{on:false,w:1,h:1,r:0.1,x:0.1,y:0.1,panelIndex:1}, thumbNotch:{on:false,width:0.5,offset:0}, corrugated:false },
  preset: undefined,
}

describe('toInternal', () => {
  it('returns internal when in internal mode', () => {
    const r = toInternal(base)
    expect(r).toEqual({Li:4, Wi:2, Hi:6})
  })
  it('converts external to internal with wall build-up', () => {
    const s: FormState = {...base, dimMode:'external', L:4.036, W:2.036, H:6.018}
    const r = toInternal(s)
    expect(r.Li).toBeCloseTo(4, 3)
    expect(r.Wi).toBeCloseTo(2, 3)
    expect(r.Hi).toBeCloseTo(6, 3)
  })
  it('product + clearance works', () => {
    const s: FormState = {...base, dimMode:'product_clearance', product:{L:3.7, W:1.7, H:5.8, clearance:0.15}}
    const r = toInternal(s)
    expect(r.Li).toBeCloseTo(4.0, 3)
    expect(r.Wi).toBeCloseTo(2.0, 3)
    expect(r.Hi).toBeCloseTo(5.95, 3)
  })
})

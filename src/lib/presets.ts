
import type { FormState } from './types'

export const presets: Record<string, Partial<FormState>> = {
  'RTE + Snap (18pt)': {
    units:'in',
    dimMode:'internal',
    L: 4, W: 2, H: 6,
    material: { grade: '18pt C1S', caliper: 0.018 },
    glue: { side:'right', flap: 0.5 },
    top: { style:'RTE', tuckDepth: 1.1, radius: 0.25, dust: 0.5 },
    bottom: { style:'SNAP', diag:45, overlap:0.2, male:1.0, female:0.9, dust:0.5 },
    bleed: 0.125, safety: 0.125,
    features: { window:{on:false, w:1.2, h:1.8, r:0.1, x:0.4, y:1.2, panelIndex:1}, thumbNotch:{on:true, width:0.8, offset:0}, corrugated:false },
  },
  'STE + Auto (20pt)': {
    units:'in',
    dimMode:'internal',
    L: 3.5, W: 1.5, H: 4.5,
    material: { grade:'20pt SBS', caliper:0.020 },
    glue:{ side:'left', flap:0.5 },
    top: { style:'STE', tuckDepth:0.9, radius:0.2, dust:0.4 },
    bottom: { style:'AUTO', diag:45, overlap:0.2, male:1, female:1, dust:0.5 },
    bleed: 0.125, safety: 0.125,
    features: { window:{on:true, w:1.2, h:1.2, r:0.1, x:0.15, y:0.8, panelIndex:0}, thumbNotch:{on:false, width:0.7, offset:0}, corrugated:false },
  },
  'Mailer (TTAB + Tuck)': {
    units:'in',
    dimMode:'internal',
    L: 6, W: 4, H: 2,
    material: { grade:'E-flute', caliper:0.067, corrugated:{flute:'E', kerf:0.01} },
    glue:{ side:'right', flap:0.6 },
    top: { style:'TTAB', tuckDepth:1.2, radius:0.3, dust:0.5 },
    bottom: { style:'TUCK', diag:45, overlap:0.2, male:1, female:1, dust:0.6 },
    bleed:0.125, safety:0.25,
    features: { window:{on:false, w:2, h:1, r:0.2, x:0.2, y:0.5, panelIndex:2}, thumbNotch:{on:false, width:1, offset:0}, corrugated:true },
  }
}

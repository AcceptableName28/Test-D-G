
export type Units = 'in' | 'mm'
export type DimMode = 'internal' | 'external' | 'product_clearance'
export type TopStyle = 'RTE' | 'STE' | 'TTAB'
export type BottomStyle = 'AUTO' | 'SNAP' | 'TUCK' | 'HINGED'

export interface Material {
  grade: string
  caliper: number // in same units as 'units'
  corrugated?: { flute: 'E'|'F'|'B'|'C'; kerf: number }
}

export interface Features {
  window: { on:boolean; w:number; h:number; r:number; x:number; y:number; panelIndex:number } // panelIndex 0..3
  thumbNotch: { on:boolean; width:number; offset:number }
  corrugated: boolean
}

export interface FormState {
  units: Units
  dimMode: DimMode
  L: number
  W: number
  H: number
  product?: { L:number; W:number; H:number; clearance:number }
  material: Material
  glue: { side:'left'|'right'; flap:number }
  top: { style: TopStyle; tuckDepth:number; radius:number; dust:number }
  bottom: { style: BottomStyle; diag:number; overlap:number; male:number; female:number; dust:number }
  bleed: number
  safety: number
  showDims: boolean
  features: Features
  preset?: string
}

export interface Dims { Li:number; Wi:number; Hi:number }

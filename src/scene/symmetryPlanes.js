// Which basis-vector pairs each "Tracer un plan" button draws, keyed by the
// field names returned by cylindricalBasis()/sphericalBasis(). Kept in its
// own data-only module (rather than exported from the scene component files)
// so those files stay component-only.
export const CYLINDRICAL_PLANES = [
  { key: 'ur-utheta', a: 'ur', b: 'utheta' },
  { key: 'ur-uz', a: 'ur', b: 'uz' },
  { key: 'utheta-uz', a: 'utheta', b: 'uz' },
]

export const SPHERICAL_PLANES = [
  { key: 'ur-utheta', a: 'ur', b: 'utheta' },
  { key: 'ur-uphi', a: 'ur', b: 'uphi' },
  { key: 'utheta-uphi', a: 'utheta', b: 'uphi' },
]

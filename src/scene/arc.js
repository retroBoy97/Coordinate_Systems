import * as THREE from 'three'

// Points along the arc from direction `aDir` sweeping toward `bDir`, covering
// `progress` (0..1) of the SHORTEST angle between them (always in [0, π]).
// Suitable for angles that are inherently non-reflex, like the polar angle
// (Oz to OM). Works in whatever space the input vectors are in (angles/cross
// products are preserved by the physics<->three cyclic-permutation mapping,
// so this is run in physics space and the result converted with toThree() at
// render time).
export function arcPoints(aDir, bDir, radius, progress, segments = 32) {
  const angle = aDir.angleTo(bDir)
  if (angle < 1e-4) return [aDir.clone().multiplyScalar(radius)]
  const axis = new THREE.Vector3().crossVectors(aDir, bDir).normalize()
  const sweep = angle * progress
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * sweep
    const q = new THREE.Quaternion().setFromAxisAngle(axis, t)
    pts.push(aDir.clone().applyQuaternion(q).multiplyScalar(radius))
  }
  return pts
}

// Points along the arc from `startDir`, sweeping `totalAngle` radians around a
// FIXED `axis` (right-hand rule), covering `progress` (0..1) of that sweep.
// Needed for oriented/azimuthal angles (e.g. Ox to OP around Oz) which can be
// reflex (> π) and must always sweep the same rotational direction, unlike
// arcPoints' shortest-path behavior.
export function azimuthalArcPoints(startDir, axis, totalAngle, radius, progress, segments = 48) {
  const sweep = totalAngle * progress
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * sweep
    const q = new THREE.Quaternion().setFromAxisAngle(axis, t)
    pts.push(startDir.clone().applyQuaternion(q).multiplyScalar(radius))
  }
  return pts
}

// Oriented angle in [0, 2π) of a vector (x, y) around the axis it's measured
// from (i.e. a normalized atan2).
export function normalizedAngle(y, x) {
  const a = Math.atan2(y, x)
  return a < 0 ? a + 2 * Math.PI : a
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// Formats an angle in radians as a clean fraction of π when it's close to one
// (checking denominators up to 12, so it catches the common cases: π/2, π/3,
// π/4, π/6, 2π/3, 3π/2, etc.), otherwise falls back to decimal radians.
export function formatAngle(rad) {
  const EPS = 1e-3
  const overPi = rad / Math.PI
  for (let den = 1; den <= 12; den++) {
    const num = overPi * den
    const rounded = Math.round(num)
    if (Math.abs(num - rounded) < EPS * den && rounded !== 0) {
      const g = gcd(Math.abs(rounded), den) || 1
      const n = rounded / g
      const d = den / g
      const coeff = Math.abs(n) === 1 ? '' : String(Math.abs(n))
      const sign = n < 0 ? '-' : ''
      return d === 1 ? `${sign}${coeff}π` : `${sign}${coeff}π/${d}`
    }
  }
  if (Math.abs(rad) < EPS) return '0'
  return `${rad.toFixed(2)} rad`
}

// Plain numbers are integers while lattice-picked, but move-coordinate
// dragging makes them continuous — show the clean integer when it is one,
// otherwise 2 decimal places.
export function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

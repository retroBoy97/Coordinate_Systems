import { toThree, toPhysics } from './coords'
import { closestPointOnLineToRay, rayPlaneIntersect } from './drag'
import { normalizedAngle } from './arc'

// The same constrained movements as the coordinates section's "Modifier"
// drags (CylindricalAnimation.jsx / SphericalAnimation.jsx): given the point
// as it was when the drag started (`fixed`) and the current mouse ray, return
// the new point with only coordinate `key` changed, or null when the ray
// gives no usable answer (parallel to the constraint plane).
//
// Two deliberate differences: r never reaches exactly 0 and the polar angle
// never reaches exactly 0 or π. At those spots the basis vectors drawn at M
// are undefined, so they'd suddenly snap to an arbitrary fallback direction.

const MIN_R = 0.2
const MAX_R = 10
const Z_LIMIT = 8
const POLE_EPS = 0.02

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const Z_AXIS = { x: 0, y: 0, z: 1 }

// Rotating M around Oz at fixed height (cylindrical θ, spherical φ).
function azimuthalMove(fixed, ray) {
  const hit = rayPlaneIntersect(ray.origin, ray.dir, toThree({ x: 0, y: 0, z: fixed.z }), toThree(Z_AXIS))
  if (!hit) return null
  const h = toPhysics(hit)
  const angle = normalizedAngle(h.y, h.x)
  const rho = Math.hypot(fixed.x, fixed.y)
  return { x: rho * Math.cos(angle), y: rho * Math.sin(angle), z: fixed.z }
}

export function cylindricalDrag(key, fixed, ray) {
  if (key === 'z') {
    const { t } = closestPointOnLineToRay(toThree(fixed), toThree(Z_AXIS), ray.origin, ray.dir)
    return { x: fixed.x, y: fixed.y, z: clamp(fixed.z + t, -Z_LIMIT, Z_LIMIT) }
  }
  if (key === 'r') {
    const theta = normalizedAngle(fixed.y, fixed.x)
    const radial = { x: Math.cos(theta), y: Math.sin(theta), z: 0 }
    const { t } = closestPointOnLineToRay(toThree({ x: 0, y: 0, z: fixed.z }), toThree(radial), ray.origin, ray.dir)
    const r = clamp(t, MIN_R, MAX_R)
    return { x: radial.x * r, y: radial.y * r, z: fixed.z }
  }
  return azimuthalMove(fixed, ray)
}

export function sphericalDrag(key, fixed, ray) {
  const r0 = Math.hypot(fixed.x, fixed.y, fixed.z)
  if (key === 'r') {
    const dir = r0 > 0 ? { x: fixed.x / r0, y: fixed.y / r0, z: fixed.z / r0 } : Z_AXIS
    const { t } = closestPointOnLineToRay(toThree({ x: 0, y: 0, z: 0 }), toThree(dir), ray.origin, ray.dir)
    const r = clamp(t, MIN_R, MAX_R)
    return { x: dir.x * r, y: dir.y * r, z: dir.z * r }
  }
  if (key === 'phi') return azimuthalMove(fixed, ray)

  // theta: within the vertical plane containing Oz and M's azimuth.
  const phi = normalizedAngle(fixed.y, fixed.x)
  const radial = { x: Math.cos(phi), y: Math.sin(phi), z: 0 }
  const normal = toThree({ x: -Math.sin(phi), y: Math.cos(phi), z: 0 })
  const hit = rayPlaneIntersect(ray.origin, ray.dir, toThree({ x: 0, y: 0, z: 0 }), normal)
  if (!hit) return null
  const h = toPhysics(hit)
  const u = Math.max(0, h.x * radial.x + h.y * radial.y)
  const theta = clamp(Math.atan2(u, h.z), POLE_EPS, Math.PI - POLE_EPS)
  return {
    x: r0 * Math.sin(theta) * radial.x,
    y: r0 * Math.sin(theta) * radial.y,
    z: r0 * Math.cos(theta),
  }
}

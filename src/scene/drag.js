import * as THREE from 'three'

// The 3D ray from the camera through a screen pixel (mx, my).
export function screenPointToRay(camera, mx, my, width, height) {
  const ndcX = (mx / width) * 2 - 1
  const ndcY = -(my / height) * 2 + 1
  const origin = camera.position.clone()
  const dir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera).sub(origin).normalize()
  return { origin, dir }
}

// Closest point on the 3D line (lineOrigin + t*lineDir) to the ray
// (rayOrigin + s*rayDir) — standard closest-point-between-two-skew-lines.
// Returns { point, t }.
export function closestPointOnLineToRay(lineOrigin, lineDir, rayOrigin, rayDir) {
  const w0 = new THREE.Vector3().subVectors(lineOrigin, rayOrigin)
  const a = lineDir.dot(lineDir)
  const b = lineDir.dot(rayDir)
  const c = rayDir.dot(rayDir)
  const d = lineDir.dot(w0)
  const e = rayDir.dot(w0)
  const denom = a * c - b * b
  const t = Math.abs(denom) < 1e-8 ? 0 : (b * e - c * d) / denom
  const point = lineOrigin.clone().addScaledVector(lineDir, t)
  return { point, t }
}

// Intersection of the ray with the plane through planePoint with normal
// planeNormal. Returns null if the ray is (near) parallel to the plane.
export function rayPlaneIntersect(rayOrigin, rayDir, planePoint, planeNormal) {
  const denom = planeNormal.dot(rayDir)
  if (Math.abs(denom) < 1e-8) return null
  const t = new THREE.Vector3().subVectors(planePoint, rayOrigin).dot(planeNormal) / denom
  return rayOrigin.clone().addScaledVector(rayDir, t)
}

// Projects a three.js-space point to screen pixel coordinates (same
// convention as screenPointToRay's mx/my: origin top-left). Used to test how
// close a click was to the on-screen position of the draggable point, so a
// drag-to-update gesture only engages near the point and orbit otherwise
// handles the gesture as a normal camera rotation.
export function projectToScreenPx(camera, point3D, width, height) {
  const ndc = point3D.clone().project(camera)
  return {
    x: ((ndc.x + 1) / 2) * width,
    y: ((1 - ndc.y) / 2) * height,
  }
}

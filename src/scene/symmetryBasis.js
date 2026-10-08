// Orthonormal basis vectors (unit, physics-space direction only — no
// translation) of the cylindrical and spherical coordinate systems at a given
// point M, used by the symmetry pages to draw u_r/u_theta/u_z (or u_phi) and
// the planes spanned by pairs of them.

export function cylindricalBasis(point) {
  const r = Math.hypot(point.x, point.y)
  // On the Oz axis itself, theta (and so u_r/u_theta) is undefined —
  // default to theta = 0 rather than producing NaNs.
  const theta = r > 1e-6 ? Math.atan2(point.y, point.x) : 0
  return {
    ur: { x: Math.cos(theta), y: Math.sin(theta), z: 0 },
    utheta: { x: -Math.sin(theta), y: Math.cos(theta), z: 0 },
    uz: { x: 0, y: 0, z: 1 },
  }
}

export function sphericalBasis(point) {
  const r = Math.hypot(point.x, point.y, point.z)
  const rho = Math.hypot(point.x, point.y)
  // At the poles (rho = 0), phi is undefined — default to phi = 0.
  const phi = rho > 1e-6 ? Math.atan2(point.y, point.x) : 0
  const theta = r > 1e-6 ? Math.acos(point.z / r) : 0
  const st = Math.sin(theta)
  const ct = Math.cos(theta)
  const sp = Math.sin(phi)
  const cp = Math.cos(phi)
  return {
    ur: { x: st * cp, y: st * sp, z: ct },
    utheta: { x: ct * cp, y: ct * sp, z: -st },
    uphi: { x: -sp, y: cp, z: 0 },
  }
}

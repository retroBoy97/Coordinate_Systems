import * as THREE from 'three'

// Physics convention (Repere.png): z is vertical, y is horizontal-right, x points
// toward the viewer. Three.js convention: Y is vertical, X is horizontal-right,
// Z points toward the viewer. Mapping physics (x,y,z) -> three (y,z,x) is a cyclic
// permutation, so it preserves right-handedness.

export function toThree({ x, y, z }) {
  return new THREE.Vector3(y, z, x)
}

export function toPhysics(v) {
  return { x: v.z, y: v.x, z: v.y }
}

// Full space: x, y, z range over [-GRID_MAX, GRID_MAX] on every axis.
export const GRID_MAX = 6

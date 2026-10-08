import { create } from 'zustand'

const DEFAULT_CYL_BOTTOM = 0
const DEFAULT_CYL_TOP = 8
const DEFAULT_SPHERE_RADIUS = 3.5

// Separate from useSceneStore: the symmetry pages don't need the get-
// coordinate construction machinery, just a placed point, a chosen plane, an
// optional constrained drag of that point, and the size of the fixed shape.
export const useSymmetryStore = create((set) => ({
  tool: 'hand',
  setTool: (tool) => set({ tool }),

  point: null,
  setPoint: (point) =>
    set({
      point,
      tool: 'hand',
      showPlanePanel: false,
      activePlane: null,
      showUpdatePanel: false,
      activeUpdateKey: null,
    }),
  // Repositions an already-placed point during a drag without setPoint's
  // side effects — dragging must not close panels or clear the active plane.
  dragUpdatePoint: (point) => set({ point }),

  showPlanePanel: false,
  setShowPlanePanel: (v) => set({ showPlanePanel: v }),
  // Which basis-vector pair's plane is drawn, e.g. 'ur-utheta'. Picking a
  // plane while another is shown replaces it (one at a time).
  activePlane: null,
  setActivePlane: (key) => set((s) => ({ activePlane: s.activePlane === key ? null : key })),

  // "Modifier les coordonnées": the coordinate (r/theta/z or r/theta/phi)
  // armed for a constrained drag of M — same movement as the coordinates
  // section, but no value is ever displayed. Independent of the plane panel:
  // a drawn plane follows M while it's dragged.
  showUpdatePanel: false,
  setShowUpdatePanel: (v) => set((s) => ({ showUpdatePanel: v, activeUpdateKey: v ? s.activeUpdateKey : null })),
  activeUpdateKey: null,
  setActiveUpdateKey: (key) => set({ activeUpdateKey: key }),

  // True only while a grab-drag gesture (point, cylinder base, sphere
  // outline) is in progress, so SceneCanvas pauses OrbitControls for just
  // that gesture.
  orbitSuspended: false,
  setOrbitSuspended: (v) => set({ orbitSuspended: v }),

  // Size of the fixed schematic distributions, resizable by dragging.
  cylBottom: DEFAULT_CYL_BOTTOM,
  cylTop: DEFAULT_CYL_TOP,
  setCylBottom: (v) => set({ cylBottom: v }),
  setCylTop: (v) => set({ cylTop: v }),
  sphereRadius: DEFAULT_SPHERE_RADIUS,
  setSphereRadius: (v) => set({ sphereRadius: v }),

  cameraResetToken: 0,
  reset: () =>
    set((s) => ({
      point: null,
      tool: 'hand',
      showPlanePanel: false,
      activePlane: null,
      showUpdatePanel: false,
      activeUpdateKey: null,
      orbitSuspended: false,
      cylBottom: DEFAULT_CYL_BOTTOM,
      cylTop: DEFAULT_CYL_TOP,
      sphereRadius: DEFAULT_SPHERE_RADIUS,
      cameraResetToken: s.cameraResetToken + 1,
    })),
}))

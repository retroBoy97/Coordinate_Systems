import { create } from 'zustand'

// tool: 'hand' (orbit) | 'select' (placing a point)
export const useSceneStore = create((set) => ({
  tool: 'hand',
  setTool: (tool) => set({ tool }),

  point: null, // { x, y, z } in physics units, once placed
  setPoint: (point) =>
    set({
      point,
      activeCoordinate: null,
      requestId: 0,
      revealComplete: false,
      tool: 'hand',
      showGetPanel: false,
      showUpdatePanel: false,
      activeUpdateKey: null,
      coordinateLabel: null,
    }),

  // Which "get coordinate" animation is currently requested, and a counter so
  // clicking the same button twice replays it (effects re-run on requestId change).
  // Requesting a get-coordinate cancels any active drag-to-update (and vice
  // versa below) — they're mutually exclusive now, not independent.
  activeCoordinate: null,
  requestId: 0,
  requestCoordinate: (key) => set((s) => ({ activeCoordinate: key, requestId: s.requestId + 1, activeUpdateKey: null })),

  // Cylindrical/spherical show a growing-cylinder/growing-sphere reveal before
  // the get-coordinate buttons appear; cartesian ignores this flag.
  revealComplete: false,
  setRevealComplete: (v) => set({ revealComplete: v }),

  // Two independent top-level panels once a point exists: "Obtenir les
  // coordonnées" (the existing animated get-coordinate flow) and "Modifier
  // les coordonnées" (drag-to-update).
  showGetPanel: false,
  setShowGetPanel: (v) => set({ showGetPanel: v }),
  showUpdatePanel: false,
  setShowUpdatePanel: (v) => set((s) => ({ showUpdatePanel: v, activeUpdateKey: v ? s.activeUpdateKey : null })),

  // Which coordinate (x/y/z/r/theta/phi) is currently armed for drag-to-update.
  // Arming one cancels any active get-coordinate construction.
  activeUpdateKey: null,
  setActiveUpdateKey: (key) => set({ activeUpdateKey: key, activeCoordinate: null }),
  // Repositions the point during a drag without setPoint's side effects
  // (which would replay reveal animations / reset panels every frame).
  dragUpdatePoint: (point) => set({ point }),

  // True only while a drag-to-update gesture that grabbed the point itself is
  // in progress — lets SceneCanvas suspend OrbitControls for just that one
  // gesture instead of disabling orbit for the entire time a coordinate is
  // armed (which previously also blocked zoom/pan when not actually dragging
  // the point).
  orbitSuspended: false,
  setOrbitSuspended: (v) => set({ orbitSuspended: v }),

  // The current coordinate readout, shown both in-scene on the construction
  // and in the persistent readout box. Shared by the get-flow and the
  // drag-to-update flow — whichever fired most recently wins.
  coordinateLabel: null,
  setCoordinateLabel: (coordinateLabel) => set({ coordinateLabel }),

  // Bumped by reset() so SceneCanvas knows to also snap the camera/orbit back
  // to its initial view (a plain state field can't carry a repeatable "do it
  // again" signal, a counter can).
  cameraResetToken: 0,

  reset: () =>
    set((s) => ({
      point: null,
      activeCoordinate: null,
      requestId: 0,
      revealComplete: false,
      tool: 'hand',
      showGetPanel: false,
      showUpdatePanel: false,
      activeUpdateKey: null,
      orbitSuspended: false,
      coordinateLabel: null,
      cameraResetToken: s.cameraResetToken + 1,
    })),
}))

// Renders a basis-vector name as actual vector notation — "u" with a
// combining right-arrow above it (U+20D7) followed by its subscript — instead
// of plain text, used both for in-scene annotations and the plane-picker
// button labels so "ur"/"utheta"/"uz"/"uphi" always read as vectors.
const SUBSCRIPT = { ur: 'r', utheta: 'θ', uz: 'z', uphi: 'φ' }

export default function VectorLabel({ name }) {
  return (
    <>
      {'u⃗'}
      <sub>{SUBSCRIPT[name]}</sub>
    </>
  )
}

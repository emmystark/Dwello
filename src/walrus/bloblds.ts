// src/walrus/blobIds.ts
// Loads Walrus blob IDs from the bedroom-specific text files in this folder.
// 1bedroom.txt contains a plain blob id per line.
// 3bedroom.txt and 4bedroom.txt contain key: blobId pairs per line.
import b1 from './1bedroom.txt?raw'
import b3 from './3bedroom.txt?raw'
import b4 from './4bedroom.txt?raw'

const parseSimple = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

const parseKeyed = (raw: string) => {
  const map: Record<string, string> = {}
  raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, value] = line.split(':').map((s) => s.trim())
      if (key && value) {
        map[key.toLowerCase()] = value
      }
    })
  return map
}

// Structured access to bedroom-specific blobs
export const bedroomBlobIds: Record<number, string[]> = {
  1: parseSimple(b1),
  // For 2-bedroom, reuse the kitchenandlivingroom from 3bedroom.txt
  2: [],
  3: [],
  4: [],
}

// Export a helper map for named fields from 3- and 4-bedroom configs
export const bedroomLayouts = (() => {
  const three = parseKeyed(b3)
  const four = parseKeyed(b4)

  // Populate numeric bedroomBlobIds using the required fields
  if (three.house) {
    bedroomBlobIds[3] = [three.house]
  }
  if (four.house) {
    bedroomBlobIds[4] = [four.house]
  }
  if (three['kitchenandlivingroom']) {
    bedroomBlobIds[2] = [three['kitchenandlivingroom']]
  }

  return {
    three,
    four,
  }
})()

export default bedroomBlobIds
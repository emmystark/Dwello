// src/walrus/blobIds.ts
// Loads Walrus blob IDs from the bedroom-specific text files in this folder.
// Each file contains one blob id per line. Vite supports importing text files using the `?raw` suffix.
import b1 from './1bedroom.txt?raw'
import b3 from './3bedroom.txt?raw'
import b4 from './4bedroom.txt?raw'

const parse = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

const bedroomBlobIds: Record<number, string[]> = {
  1: parse(b1),
  3: parse(b3),
  4: parse(b4),
}

export default bedroomBlobIds
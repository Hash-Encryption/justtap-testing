/**
 * Pure TypeScript ZIP File Generator (Store mode, 0 dependencies).
 * Perfect for generating .pkpass Apple Wallet files on Cloudflare Workers / Edge.
 */

// CRC32 table initialization
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

export function calcCrc32(data: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export type ZipEntry = {
  filename: string;
  data: Uint8Array;
};

export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];

  let offset = 0;

  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.filename);
    const data = entry.data;
    const crc = calcCrc32(data);
    const size = data.length;

    // --- LOCAL FILE HEADER ---
    const localHeader = new Uint8Array(30 + filenameBytes.length + size);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 20, true); // Version needed (2.0)
    view.setUint16(6, 0, true); // General flags
    view.setUint16(8, 0, true); // Compression method (0 = store)
    view.setUint16(10, 0, true); // Last mod time
    view.setUint16(12, 0, true); // Last mod date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, size, true); // Compressed size
    view.setUint32(22, size, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(filenameBytes, 30);
    localHeader.set(data, 30 + filenameBytes.length);

    localHeaders.push(localHeader);

    // --- CENTRAL DIRECTORY HEADER ---
    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const cView = new DataView(centralHeader.buffer);

    cView.setUint32(0, 0x02014b50, true); // Central header signature
    cView.setUint16(4, 20, true); // Version made by
    cView.setUint16(6, 20, true); // Version needed
    cView.setUint16(8, 0, true); // General flags
    cView.setUint16(10, 0, true); // Compression method
    cView.setUint16(12, 0, true); // Mod time
    cView.setUint16(14, 0, true); // Mod date
    cView.setUint32(16, crc, true); // CRC-32
    cView.setUint32(20, size, true); // Compressed size
    cView.setUint32(24, size, true); // Uncompressed size
    cView.setUint16(28, filenameBytes.length, true); // Filename length
    cView.setUint16(30, 0, true); // Extra field length
    cView.setUint16(32, 0, true); // File comment length
    cView.setUint16(34, 0, true); // Disk number start
    cView.setUint16(36, 0, true); // Internal file attributes
    cView.setUint32(38, 0, true); // External file attributes
    cView.setUint32(42, offset, true); // Local header offset

    centralHeader.set(filenameBytes, 46);
    centralHeaders.push(centralHeader);

    offset += localHeader.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  // --- END OF CENTRAL DIRECTORY RECORD (EOCD) ---
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);

  eView.setUint32(0, 0x06054b50, true); // EOCD signature
  eView.setUint16(4, 0, true); // Disk number
  eView.setUint16(6, 0, true); // Disk with central dir
  eView.setUint16(8, entries.length, true); // Total entries on disk
  eView.setUint16(10, entries.length, true); // Total entries
  eView.setUint32(12, centralDirSize, true); // Central dir size
  eView.setUint32(16, centralDirOffset, true); // Central dir offset
  eView.setUint16(20, 0, true); // Comment length

  // Combine all buffers
  const totalLength = centralDirOffset + centralDirSize + eocd.length;
  const result = new Uint8Array(totalLength);

  let currentPos = 0;
  for (const lh of localHeaders) {
    result.set(lh, currentPos);
    currentPos += lh.length;
  }
  for (const ch of centralHeaders) {
    result.set(ch, currentPos);
    currentPos += ch.length;
  }
  result.set(eocd, currentPos);

  return result;
}

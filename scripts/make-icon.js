// One-off placeholder icon generator — pure Node (zlib is built-in), no
// image-processing dependency needed. Produces a flat 1024x1024 PNG in the
// app's primary color. Swap for real branding whenever it's ready; this
// just satisfies Expo's required app.json icon field for local testing.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 1024;
// #0f172a
const R = 0x0f, G = 0x17, B = 0x2a;

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr.writeUInt8(8, 8); // bit depth
ihdr.writeUInt8(2, 9); // color type: RGB
ihdr.writeUInt8(0, 10);
ihdr.writeUInt8(0, 11);
ihdr.writeUInt8(0, 12);

const rowLen = SIZE * 3 + 1;
const raw = Buffer.alloc(rowLen * SIZE);
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * rowLen;
  raw[rowStart] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const px = rowStart + 1 + x * 3;
    raw[px] = R;
    raw[px + 1] = G;
    raw[px + 2] = B;
  }
}

const idatData = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idatData),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, "..", "assets", "images");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon.png"), png);
console.log("Wrote", path.join(outDir, "icon.png"), `(${png.length} bytes)`);

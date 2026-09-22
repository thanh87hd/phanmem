const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const imgPath = 'C:/Users/ducth/.gemini/antigravity-ide/brain/341241c4-58b0-4de3-8d76-edd0309f9f59/.user_uploaded/media_1789394759730.png';
const buf = fs.readFileSync(imgPath);

let pos = 8, width = 0, height = 0;
const idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IHDR') {
    width = buf.readUInt32BE(pos + 8);
    height = buf.readUInt32BE(pos + 12);
  } else if (type === 'IDAT') {
    idat.push(buf.slice(pos + 8, pos + 8 + len));
  }
  pos += 12 + len;
}

const raw = zlib.inflateSync(Buffer.concat(idat));
const bpp = 4, rowSize = width * bpp;
const unfilter = Buffer.alloc(height * rowSize);
for (let y = 0; y < height; y++) {
  const fType = raw[y * (rowSize + 1)];
  const src = y * (rowSize + 1) + 1;
  const dst = y * rowSize, prevDst = (y - 1) * rowSize;
  for (let x = 0; x < rowSize; x++) {
    const val = raw[src + x];
    const left = x >= bpp ? unfilter[dst + x - bpp] : 0;
    const up = y > 0 ? unfilter[prevDst + x] : 0;
    const upLeft = (y > 0 && x >= bpp) ? unfilter[prevDst + x - bpp] : 0;
    if (fType === 0) unfilter[dst + x] = val;
    else if (fType === 1) unfilter[dst + x] = (val + left) & 0xff;
    else if (fType === 2) unfilter[dst + x] = (val + up) & 0xff;
    else if (fType === 3) unfilter[dst + x] = (val + Math.floor((left + up) / 2)) & 0xff;
    else if (fType === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
      const pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
      unfilter[dst + x] = (val + pr) & 0xff;
    }
  }
}

// Find gold bounding box for whole logo
let minX = 999, maxX = 0, minY = 999, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    const r = unfilter[idx], g = unfilter[idx + 1], b = unfilter[idx + 2];
    if (r > 160 && g > 100 && b < 80) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log('Whole Logo Box:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });

// Generate exact SVG path for the entire logo
let pathD = '';
for (let y = minY; y <= maxY; y++) {
  let inSpan = false, startX = 0;
  for (let x = minX; x <= maxX + 1; x++) {
    let isGold = false;
    if (x <= maxX) {
      const idx = (y * width + x) * 4;
      const r = unfilter[idx], g = unfilter[idx + 1], b = unfilter[idx + 2];
      isGold = (r > 160 && g > 100 && b < 80);
    }
    if (isGold && !inSpan) {
      inSpan = true;
      startX = x;
    } else if (!isGold && inSpan) {
      inSpan = false;
      const rx = startX - minX;
      const ry = y - minY;
      const rw = x - startX;
      pathD += `M${rx},${ry}h${rw}v1h-${rw}Z `;
    }
  }
}

// Generate exact SVG path for JUST the emblem (x >= 194)
let emblemPathD = '';
let emMinX = 194, emMaxX = 232, emMinY = 33, emMaxY = 77;
for (let y = emMinY; y <= emMaxY; y++) {
  let inSpan = false, startX = 0;
  for (let x = emMinX; x <= emMaxX + 1; x++) {
    let isGold = false;
    if (x <= emMaxX) {
      const idx = (y * width + x) * 4;
      const r = unfilter[idx], g = unfilter[idx + 1], b = unfilter[idx + 2];
      isGold = (r > 160 && g > 100 && b < 80);
    }
    if (isGold && !inSpan) {
      inSpan = true;
      startX = x;
    } else if (!isGold && inSpan) {
      inSpan = false;
      const rx = startX - emMinX;
      const ry = y - emMinY;
      const rw = x - startX;
      emblemPathD += `M${rx},${ry}h${rw}v1h-${rw}Z `;
    }
  }
}

const outData = {
  logoBox: { w: maxX - minX + 1, h: maxY - minY + 1 },
  emblemBox: { w: emMaxX - emMinX + 1, h: emMaxY - emMinY + 1 },
  logoPath: pathD.trim(),
  emblemPath: emblemPathD.trim()
};

fs.writeFileSync(path.resolve(__dirname, 'logo_paths.json'), JSON.stringify(outData));
console.log('Saved logo_paths.json successfully! Total path bytes:', pathD.length);

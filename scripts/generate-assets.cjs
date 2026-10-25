const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function createIcoBuffer(pngBuffer, width = 32, height = 32) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(1, 4); // count 1
  header.writeUInt8(width, 6); // width (32)
  header.writeUInt8(height, 7); // height (32)
  header.writeUInt8(0, 8); // colors
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bpp
  header.writeUInt32LE(pngBuffer.length, 14); // size of PNG data
  header.writeUInt32LE(22, 18); // offset where PNG data begins
  return Buffer.concat([header, pngBuffer]);
}

async function run() {
  const inputPath = process.argv[2] || 'src/assets/images/logo.png';
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const originalBuffer = fs.readFileSync(inputPath);
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const srcAssetsDir = path.join(rootDir, 'src', 'assets', 'images');
  const distDir = path.join(rootDir, 'dist');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true });

  console.log(`Processing original logo from: ${inputPath}`);

  // 1. Exact copy for web app visible logo
  fs.writeFileSync(path.join(publicDir, 'logo_original.png'), originalBuffer);
  fs.writeFileSync(path.join(srcAssetsDir, 'logo.png'), originalBuffer);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), originalBuffer);

  // 2. Favicon 16x16
  const favicon16 = await sharp(originalBuffer)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), favicon16);

  // 2b. Favicon 32x32
  const favicon32 = await sharp(originalBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), favicon32);

  // 2c. Favicon.ico
  const icoBuffer = createIcoBuffer(favicon32, 32, 32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // 3. Laptop Web App Icon 192x192 (safe margin)
  const icon192 = await sharp(originalBuffer)
    .resize(176, 176, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 8,
      bottom: 8,
      left: 8,
      right: 8,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

  // 3b. Laptop Web App Icon 512x512
  const icon512 = await sharp(originalBuffer)
    .resize(470, 470, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 21,
      bottom: 21,
      left: 21,
      right: 21,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

  // 4. iPhone Web App Icon (Apple Touch Icon, 180x180)
  const appleTouchIcon = await sharp(originalBuffer)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 15,
      bottom: 15,
      left: 15,
      right: 15,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

  // Copy to dist if exists
  if (fs.existsSync(distDir)) {
    try {
      fs.copyFileSync(path.join(publicDir, 'favicon-16x16.png'), path.join(distDir, 'favicon-16x16.png'));
      fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(distDir, 'favicon-32x32.png'));
      fs.copyFileSync(path.join(publicDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
      fs.copyFileSync(path.join(publicDir, 'icon-192.png'), path.join(distDir, 'icon-192.png'));
      fs.copyFileSync(path.join(publicDir, 'icon-512.png'), path.join(distDir, 'icon-512.png'));
      fs.copyFileSync(path.join(publicDir, 'apple-touch-icon.png'), path.join(distDir, 'apple-touch-icon.png'));
      fs.copyFileSync(path.join(publicDir, 'logo.png'), path.join(distDir, 'logo.png'));
    } catch (e) {
      console.warn('Could not copy to dist:', e);
    }
  }

  console.log('✅ Successfully generated all 4 logo asset formats without modifying the original design!');
}

run().catch(console.error);

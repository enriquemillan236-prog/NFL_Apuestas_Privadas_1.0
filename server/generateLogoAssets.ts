import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Creates a standard ICO file buffer embedding a PNG image.
 */
function createIcoBuffer(pngBuffer: Buffer, width: number = 32, height: number = 32): Buffer {
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

/**
 * Generates all required logo assets from the untouched original logo buffer:
 * 1. Web system logo (src/assets/images/logo.png & public/logo.png)
 * 2. Browser tab Favicon (favicon-16x16, favicon-32x32, favicon.ico)
 * 3. Laptop Web App Icon (icon-192, icon-512)
 * 4. iPhone Web App Icon (apple-touch-icon.png with safe padding)
 */
export async function generateLogoAssetsFromBuffer(originalBuffer: Buffer) {
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const srcAssetsDir = path.join(rootDir, 'src', 'assets', 'images');
  const distDir = path.join(rootDir, 'dist');

  // Ensure directories exist
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true });

  console.log('Generating system logo assets from untouched original buffer...');

  // 1. Source of Truth: Store the exact byte-for-byte original file
  const originalPath = path.join(publicDir, 'logo_original.png');
  fs.writeFileSync(originalPath, originalBuffer);

  // Direct copy for web app visible logo
  const webLogoPath = path.join(srcAssetsDir, 'logo.png');
  fs.writeFileSync(webLogoPath, originalBuffer);

  const publicWebLogo = path.join(publicDir, 'logo.png');
  fs.writeFileSync(publicWebLogo, originalBuffer);

  // 2. Favicon 16x16 (Browser tab)
  const favicon16 = await sharp(originalBuffer)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), favicon16);

  // 2b. Favicon 32x32 (Browser tab standard)
  const favicon32 = await sharp(originalBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), favicon32);

  // 2c. Favicon.ico
  const icoBuffer = createIcoBuffer(favicon32, 32, 32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  // 3. Laptop Web App Icon 192x192
  // Safe padding of ~8% transparent margin so it never clips on desktop taskbars
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
  // Safe padding of ~8% transparent margin
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
  // Apple automatically masks touch icons with squircle/rounded corners (approx 20% radius).
  // To strictly prevent clipping the upper shield points or bottom tip of the shield,
  // we add transparent margin around the logo (150x150 inside 180x180).
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

  // If dist directory exists, copy to dist as well so live preview immediately reflects it
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

  return {
    success: true,
    assets: [
      'src/assets/images/logo.png',
      'public/logo.png',
      'public/favicon-16x16.png',
      'public/favicon-32x32.png',
      'public/favicon.ico',
      'public/icon-192.png',
      'public/icon-512.png',
      'public/apple-touch-icon.png',
    ],
  };
}

/**
 * Scans the filesystem for any uploaded original logo files.
 */
export async function checkForUploadedLogoFile() {
  const rootDir = process.cwd();
  const searchDirs = [rootDir, path.join(rootDir, 'public'), path.join(rootDir, 'src', 'assets')];
  const possibleNames = [
    'logo limpio.png',
    'logo_limpio.png',
    'logo-limpio.png',
    'logolimpio.png',
    'logo original.png',
    'logo_original.png',
    'logo.png',
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const lower = file.toLowerCase();
      if (lower.includes('limpio') && lower.endsWith('.png')) {
        const fullPath = path.join(dir, file);
        console.log(`Found uploaded logo file at ${fullPath}. Generating assets...`);
        const buf = fs.readFileSync(fullPath);
        return await generateLogoAssetsFromBuffer(buf);
      }
    }
  }
  return null;
}

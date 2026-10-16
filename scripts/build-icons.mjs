// Generates every SLATE brand asset (web favicon/PWA/maskable/Apple icons and
// the Expo app icons) from one vector definition of the mark: three schedule
// rows on a near-black tile -- the top row (today's duty) in full white, the
// rest receding.
//
// Usage: node scripts/build-icons.mjs   (sharp ships with Next.js)
import fs from 'node:fs';
import sharp from 'sharp';

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c1f"/><stop offset="0.55" stop-color="#000000"/></linearGradient>
</defs>`;

/** The three-row mark on a 512 canvas. `ink` lets the monochrome variant use one colour. */
function mark({ ink = '#ffffff', dimA = 0.55, dimB = 0.28 } = {}) {
  return `
  <rect x="128" y="150" width="256" height="52" rx="26" fill="${ink}"/>
  <rect x="128" y="230" width="196" height="52" rx="26" fill="${ink}" fill-opacity="${dimA}"/>
  <rect x="128" y="310" width="136" height="52" rx="26" fill="${ink}" fill-opacity="${dimB}"/>
  <circle cx="358" cy="336" r="26" fill="${ink}" fill-opacity="${dimA}"/>`;
}

function iconSvg({ shape = 'rounded', scale = 1 } = {}) {
  const background =
    shape === 'rounded'
      ? '<rect width="512" height="512" rx="112" fill="url(#bg)"/><rect x="3" y="3" width="506" height="506" rx="109" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="6"/>'
      : shape === 'square'
        ? '<rect width="512" height="512" fill="url(#bg)"/>'
        : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}${background}<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${mark()}</g></svg>`;
}

const monochromeSvg = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${mark({ ink: '#ffffff', dimA: 1, dimB: 1 })}</g></svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const write = async (path, svg, size) => fs.writeFileSync(path, await png(svg, size));

async function main() {
  const rounded = iconSvg();
  fs.writeFileSync('src/app/icon.svg', rounded + '\n');

  await write('public/icons/icon-192.png', rounded, 192);
  await write('public/icons/icon-512.png', rounded, 512);
  // Maskable: full-bleed tile, mark inside the 80% safe zone.
  await write('public/icons/icon-maskable-512.png', iconSvg({ shape: 'square', scale: 0.8 }), 512);
  // Notification badge: Android tints it, so a single-colour glyph on transparent.
  await write('public/icons/badge-96.png', monochromeSvg(1.3), 96);
  // iOS masks the corners itself and renders transparency as black.
  await write('src/app/apple-icon.png', iconSvg({ shape: 'square' }), 180);

  // Expo / Android app icons.
  await write('mobile/assets/icon.png', iconSvg({ shape: 'square' }), 1024);
  await write('mobile/assets/splash-icon.png', iconSvg({ shape: 'none', scale: 0.9 }), 1024);
  await write('mobile/assets/favicon.png', rounded, 48);
  await write('mobile/assets/android-icon-background.png', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" fill="url(#bg)"/></svg>`, 512);
  // Adaptive foreground: launchers crop to the inner ~66%, so shrink the mark.
  await write('mobile/assets/android-icon-foreground.png', iconSvg({ shape: 'none', scale: 0.62 }), 512);
  await write('mobile/assets/android-icon-monochrome.png', monochromeSvg(0.62), 432);

  console.log('SLATE brand assets written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

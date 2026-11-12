/* eslint-disable @typescript-eslint/no-require-imports */
// تولید آیکن‌های PWA از روی لوگوی مرکز
const sharp = require("sharp");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "icons");
const LOGO = path.join(__dirname, "..", "public", "images", "logo.png");

async function makeIcon(size, pad, out) {
  // زمینهٔ مربعی با گرادیان زمردی (به‌صورت SVG)
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0" stop-color="#0b5d51"/>
           <stop offset="0.55" stop-color="#147a68"/>
           <stop offset="1" stop-color="#0b5d51"/>
         </linearGradient>
       </defs>
       <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#g)"/>
     </svg>`
  );

  const inner = Math.round(size * (1 - pad));
  const logo = await sharp(LOGO)
    .resize(inner, Math.round(inner * (480 / 1080)))
    .png()
    .toBuffer();

  const meta = await sharp(logo).metadata();
  await sharp(bg)
    .composite([
      {
        input: logo,
        left: Math.round((size - inner) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png()
    .toFile(out);
  console.log("OK", out);
}

(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  await makeIcon(192, 0.18, path.join(OUT, "icon-192.png"));
  await makeIcon(512, 0.18, path.join(OUT, "icon-512.png"));
  // maskable: حاشیهٔ امن بیشتر
  await makeIcon(512, 0.32, path.join(OUT, "icon-maskable-512.png"));
  await makeIcon(180, 0.2, path.join(OUT, "apple-touch-icon.png"));
  console.log("done");
})();

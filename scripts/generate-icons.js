/**
 * generate-icons.js
 * Generates all required Expo icon assets from SVG source.
 * Uses only librsvg-compatible SVG (no filters, no userSpaceOnUse gradients).
 *
 * Run: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const OUT = path.join(__dirname, '..', 'assets');

// ---------------------------------------------------------------------------
// SVG builder — librsvg-safe (no filters, objectBoundingBox gradients only)
// Design: document + graduation cap + AI badge
// ---------------------------------------------------------------------------
function makeIconSVG(size, withBackground) {
    const S = size;
    const cx = S / 2;

    // Scale factor
    const s = S / 1024;
    const r = (v) => Math.round(v * s);

    // Background
    const bgRadius = r(200);
    const bg = withBackground
        ? `<rect width="${S}" height="${S}" rx="${bgRadius}" fill="#1E1B4B"/>`
        : `<rect width="${S}" height="${S}" rx="${bgRadius}" fill="#1E1B4B"/>`;

    // Inner radial shimmer (two concentric ellipses, no filter needed)
    const shimmer = `
  <ellipse cx="${cx}" cy="${cx}" rx="${r(480)}" ry="${r(400)}" fill="#2D2872" opacity="0.6"/>
  <ellipse cx="${cx}" cy="${cx}" rx="${r(280)}" ry="${r(230)}" fill="#3730A3" opacity="0.4"/>`;

    // Document paper
    const docL = r(262), docT = r(190), docW = r(500), docH = r(650);
    const docR = r(36);
    const foldSz = r(60);
    const docR2 = docL + docW;
    const docB  = docT + docH;

    const paper = `
  <!-- Paper shadow (solid, offset rect) -->
  <rect x="${docL + r(10)}" y="${docT + r(14)}" width="${docW}" height="${docH}"
        rx="${docR}" fill="#0A0819"/>

  <!-- Paper body -->
  <path d="
    M ${docL + docR} ${docT}
    L ${docR2 - foldSz} ${docT}
    L ${docR2} ${docT + foldSz}
    L ${docR2} ${docB - docR}
    Q ${docR2} ${docB} ${docR2 - docR} ${docB}
    L ${docL + docR} ${docB}
    Q ${docL} ${docB} ${docL} ${docB - docR}
    L ${docL} ${docT + docR}
    Q ${docL} ${docT} ${docL + docR} ${docT}
    Z
  " fill="#F0F4FF"/>

  <!-- Dog-ear fold -->
  <path d="M ${docR2 - foldSz} ${docT} L ${docR2} ${docT + foldSz} L ${docR2 - foldSz} ${docT + foldSz} Z"
        fill="#CBD5FF" opacity="0.85"/>`;

    // Header band on document
    const hdrH = r(148);
    const hdrB = docT + hdrH;

    const header = `
  <!-- Header band (clipped to doc shape) -->
  <path d="
    M ${docL + docR} ${docT}
    L ${docR2 - foldSz} ${docT}
    L ${docR2 - foldSz} ${docT + foldSz}
    L ${docR2} ${docT + foldSz}
    L ${docR2} ${hdrB}
    L ${docL} ${hdrB}
    L ${docL} ${docT + docR}
    Q ${docL} ${docT} ${docL + docR} ${docT}
    Z
  " fill="#4F46E5"/>`;

    // Graduation cap (mortarboard) — pure geometry
    const capCX = cx, capCY = docT + r(82);
    const boardW = r(220), boardH = r(36);
    const boardL = capCX - boardW / 2;
    const boardT = capCY - boardH / 2;
    const crownH = r(50);

    const cap = `
  <!-- Mortarboard board -->
  <rect x="${boardL}" y="${boardT}" width="${boardW}" height="${boardH}" rx="${r(8)}" fill="white" opacity="0.95"/>
  <!-- Crown (triangle) -->
  <polygon points="${capCX},${boardT - crownH} ${boardL - r(10)},${boardT} ${boardL + boardW + r(10)},${boardT}"
           fill="white" opacity="0.88"/>
  <!-- Tassel string -->
  <line x1="${boardL + boardW}" y1="${capCY}" x2="${boardL + boardW + r(36)}" y2="${capCY + r(58)}"
        stroke="#F59E0B" stroke-width="${r(7)}" stroke-linecap="round"/>
  <!-- Tassel knob -->
  <circle cx="${boardL + boardW + r(38)}" cy="${capCY + r(72)}" r="${r(14)}" fill="#F59E0B"/>
  <!-- Tassel fringe -->
  <line x1="${boardL + boardW + r(30)}" y1="${capCY + r(86)}" x2="${boardL + boardW + r(26)}" y2="${capCY + r(118)}"
        stroke="#F59E0B" stroke-width="${r(4)}" stroke-linecap="round"/>
  <line x1="${boardL + boardW + r(38)}" y1="${capCY + r(86)}" x2="${boardL + boardW + r(38)}" y2="${capCY + r(120)}"
        stroke="#F59E0B" stroke-width="${r(4)}" stroke-linecap="round"/>
  <line x1="${boardL + boardW + r(46)}" y1="${capCY + r(86)}" x2="${boardL + boardW + r(50)}" y2="${capCY + r(118)}"
        stroke="#F59E0B" stroke-width="${r(4)}" stroke-linecap="round"/>`;

    // Document body lines
    const linesX = docL + r(40);
    const linesW = docW - r(80);
    const line1Y = hdrB + r(32);

    const lines = `
  <!-- Title bar -->
  <rect x="${linesX}" y="${line1Y}" width="${linesW}" height="${r(26)}" rx="${r(13)}" fill="#4F46E5" opacity="0.80"/>
  <!-- Subtitle -->
  <rect x="${linesX}" y="${line1Y + r(46)}" width="${Math.round(linesW * 0.65)}" height="${r(18)}" rx="${r(9)}" fill="#818CF8" opacity="0.55"/>
  <!-- Body line 1 -->
  <rect x="${linesX}" y="${line1Y + r(88)}" width="${linesW}" height="${r(16)}" rx="${r(8)}" fill="#94A3B8" opacity="0.55"/>
  <!-- Body line 2 -->
  <rect x="${linesX}" y="${line1Y + r(116)}" width="${Math.round(linesW * 0.85)}" height="${r(16)}" rx="${r(8)}" fill="#94A3B8" opacity="0.50"/>
  <!-- Body line 3 -->
  <rect x="${linesX}" y="${line1Y + r(144)}" width="${Math.round(linesW * 0.93)}" height="${r(16)}" rx="${r(8)}" fill="#94A3B8" opacity="0.48"/>
  <!-- Body line 4 -->
  <rect x="${linesX}" y="${line1Y + r(172)}" width="${Math.round(linesW * 0.72)}" height="${r(16)}" rx="${r(8)}" fill="#94A3B8" opacity="0.44"/>
  <!-- Body line 5 -->
  <rect x="${linesX}" y="${line1Y + r(200)}" width="${Math.round(linesW * 0.80)}" height="${r(16)}" rx="${r(8)}" fill="#94A3B8" opacity="0.40"/>
  <!-- Divider -->
  <rect x="${linesX}" y="${line1Y + r(238)}" width="${linesW}" height="${r(3)}" rx="${r(1)}" fill="#C7D2FE" opacity="0.60"/>
  <!-- Signature line 1 -->
  <rect x="${linesX}" y="${line1Y + r(258)}" width="${Math.round(linesW * 0.43)}" height="${r(14)}" rx="${r(7)}" fill="#94A3B8" opacity="0.32"/>
  <!-- Signature line 2 -->
  <rect x="${linesX}" y="${line1Y + r(280)}" width="${Math.round(linesW * 0.32)}" height="${r(14)}" rx="${r(7)}" fill="#94A3B8" opacity="0.26"/>`;

    // AI Badge — solid, no filter
    const badgeCX = docL + docW - r(4);
    const badgeCY = docT + docH - r(4);
    const badgeR  = r(96);

    const badge = `
  <!-- Badge backing circle (dark) -->
  <circle cx="${badgeCX}" cy="${badgeCY}" r="${badgeR + r(8)}" fill="#0F0C2A"/>
  <!-- Badge ring -->
  <circle cx="${badgeCX}" cy="${badgeCY}" r="${badgeR}" fill="#F59E0B"/>
  <!-- Inner circle highlight -->
  <circle cx="${badgeCX}" cy="${badgeCY - r(12)}" r="${r(58)}" fill="#FBC22D" opacity="0.4"/>
  <!-- Lightning bolt -->
  <polygon points="
    ${badgeCX + r(14)},${badgeCY - r(52)}
    ${badgeCX - r(22)},${badgeCY + r(8)}
    ${badgeCX + r(4)},${badgeCY + r(8)}
    ${badgeCX - r(14)},${badgeCY + r(52)}
    ${badgeCX + r(22)},${badgeCY - r(8)}
    ${badgeCX + r(0)},${badgeCY - r(8)}
  " fill="white"/>`;

    return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  ${shimmer}
  ${paper}
  ${header}
  ${cap}
  ${lines}
  ${badge}
</svg>`;
}

// Adaptive icon: same content but without the rounded bg — Android clips it
// Background color is set in app.json (adaptiveIcon.backgroundColor = #1E1B4B)
function makeAdaptiveSVG(size) {
    return makeIconSVG(size, false);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
async function svgToPng(svgString, outFile, width, height) {
    const buf = Buffer.from(svgString);
    await sharp(buf, { density: Math.round(72 * (width / 512)) })
        .resize(width, height, { fit: 'fill' })
        .png({ compressionLevel: 9 })
        .toFile(outFile);
    const kb = Math.round(fs.statSync(outFile).size / 1024);
    console.log(`\u2705  ${path.basename(outFile)}  (${width}\xd7${height})  ${kb} KB`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
(async () => {
    console.log('\n\ud83c\udfa8  Generating EscolaFlow icons\u2026\n');

    await svgToPng(makeIconSVG(1024, true),     path.join(OUT, 'icon.png'),          1024, 1024);
    await svgToPng(makeAdaptiveSVG(1024),       path.join(OUT, 'adaptive-icon.png'), 1024, 1024);
    await svgToPng(makeIconSVG(512, true),      path.join(OUT, 'splash-icon.png'),    512,  512);
    await svgToPng(makeIconSVG(256, true),      path.join(OUT, 'favicon.png'),         64,   64);

    console.log('\n\u2728  Done \u2014 check the assets/ folder.\n');
})();

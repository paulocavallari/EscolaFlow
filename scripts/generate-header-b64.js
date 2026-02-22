// scripts/generate-header-b64.js
// Run: node scripts/generate-header-b64.js
// Generates src/assets/headerB64.ts with the school header image as a base64 constant.
const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '..', 'assets', 'images', 'cabecalho-vc.jpg');
const outPath = path.join(__dirname, '..', 'src', 'assets', 'headerB64.ts');

const b64 = fs.readFileSync(imgPath).toString('base64');
const content = `// AUTO-GENERATED — do not edit manually.
// Run: node scripts/generate-header-b64.js
export const HEADER_IMAGE_B64 = 'data:image/jpeg;base64,${b64}';
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');
console.log('Generated', outPath, '—', b64.length, 'chars');

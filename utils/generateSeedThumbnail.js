// Server-side equivalent of frontend/src/utils/generateThumbnail.js
// The frontend version uses <canvas>, which only exists in a browser.
// This produces the same visual language (gradient + pattern + title)
// as a raw SVG string, base64-encoded into a data URI — works fine as
// an <img src="..."> in the browser with zero extra dependencies.

const PALETTES = [
  { from: '#4338CA', to: '#6D5FE0', text: '#EEF2FF' },
  { from: '#D97706', to: '#F59E0B', text: '#451A03' },
  { from: '#047857', to: '#10B981', text: '#ECFDF5' },
  { from: '#3730A3', to: '#D97706', text: '#FFFBEB' },
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Naive word-wrap for SVG (no canvas text-measuring available server-side)
// — assumes ~18px average character width at this font size, good enough
// for course titles at this card size.
const wrapText = (text, maxCharsPerLine = 22) => {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
};

const escapeXml = (str) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const generateSeedThumbnail = (title, category = '') => {
  const width = 800;
  const height = 450;
  const hash = hashString(`${title}-${category}`);
  const palette = PALETTES[hash % PALETTES.length];
  const lines = wrapText(title || 'Untitled course');
  const lineHeight = 54;
  const startY = height - 60 - (lines.length - 1) * lineHeight;

  const titleLines = lines
    .map((line, i) => `<text x="50" y="${startY + i * lineHeight}" font-family="Georgia, serif" font-size="42" font-weight="600" fill="${palette.text}">${escapeXml(line)}</text>`)
    .join('');

  const categoryLabel = category
    ? `<rect x="50" y="40" width="${category.length * 9 + 32}" height="34" rx="17" fill="rgba(255,255,255,0.18)" />
       <text x="66" y="62" font-family="Arial, sans-serif" font-size="15" font-weight="600" fill="${palette.text}">${escapeXml(category.toUpperCase())}</text>`
    : '';

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${palette.from}" />
          <stop offset="1" stop-color="${palette.to}" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)" />
      ${categoryLabel}
      ${titleLines}
    </svg>
  `.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
};

module.exports = generateSeedThumbnail;
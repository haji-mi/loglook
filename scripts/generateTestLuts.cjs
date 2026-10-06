const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'test-assets', 'luts');
fs.mkdirSync(dir, { recursive: true });

function generateCube(name, mapFn) {
  const size = 33;
  let lines = [
    '# Created for LogLook Testing',
    `TITLE "${name}"`,
    `LUT_3D_SIZE ${size}`,
    'DOMAIN_MIN 0.0 0.0 0.0',
    'DOMAIN_MAX 1.0 1.0 1.0'
  ];

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rf = r / (size - 1);
        const gf = g / (size - 1);
        const bf = b / (size - 1);
        const [outR, outG, outB] = mapFn(rf, gf, bf);
        const cR = Math.max(0, Math.min(1, outR)).toFixed(6);
        const cG = Math.max(0, Math.min(1, outG)).toFixed(6);
        const cB = Math.max(0, Math.min(1, outB)).toFixed(6);
        lines.push(`${cR} ${cG} ${cB}`);
      }
    }
  }

  const filePath = path.join(dir, `${name}.cube`);
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('Generated:', `${name}.cube (${lines.length} lines)`);
}

// 1. Clean709
generateCube('Clean709', (r, g, b) => {
  return [Math.pow(r, 1.2), Math.pow(g, 1.2), Math.pow(b, 1.2)];
});

// 2. WarmFilm
generateCube('WarmFilm', (r, g, b) => {
  return [r * 1.1 + 0.02, g * 1.02, b * 0.88];
});

// 3. TealOrange: 暗部偏青 (R低, G/B高)，高光偏橙 (R高, B低)
generateCube('TealOrange', (r, g, b) => {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  let outR = r, outG = g, outB = b;
  if (luma < 0.5) {
    const t = (0.5 - luma) / 0.5;
    outR = r * (1 - 0.35 * t);
    outG = g * (1 + 0.2 * t);
    outB = b * (1 + 0.4 * t);
  } else {
    const t = (luma - 0.5) / 0.5;
    outR = r * (1 + 0.25 * t);
    outG = g * (1 + 0.05 * t);
    outB = b * (1 - 0.3 * t);
  }
  return [outR, outG, outB];
});

// 4. FadedVintage
generateCube('FadedVintage', (r, g, b) => {
  return [0.12 + 0.78 * r, 0.10 + 0.80 * g, 0.14 + 0.75 * b];
});

// 5. MonoBW: 真黑白，三通道绝对相等
generateCube('MonoBW', (r, g, b) => {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return [luma, luma, luma];
});

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const imageDir = path.join(ROOT, 'public', 'item-images');
const jsonPath = path.join(ROOT, 'items_reference.json');

function getTotalBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).reduce((sum, file) => sum + fs.statSync(path.join(dir, file)).size, 0);
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  if (!fs.existsSync(jsonPath) || !fs.existsSync(imageDir)) {
    throw new Error('Missing items_reference.json or public/item-images directory.');
  }

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const beforeTotal = getTotalBytes(imageDir);

  let optimizedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const url = item.image_url;
    if (!url || !url.startsWith('/item-images/')) {
      skippedCount += 1;
      continue;
    }

    const relPath = url.replace('/item-images/', '');
    const absPath = path.join(imageDir, relPath);
    if (!fs.existsSync(absPath)) {
      skippedCount += 1;
      continue;
    }

    const ext = path.extname(absPath).toLowerCase();
    if (ext === '.svg' || ext === '.webp') {
      skippedCount += 1;
      continue;
    }

    const outName = `${path.basename(absPath, ext)}.webp`;
    const outPath = path.join(imageDir, outName);

    try {
      await sharp(absPath)
        .rotate()
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72, effort: 4 })
        .toFile(outPath);

      const outStats = fs.statSync(outPath);
      const inStats = fs.statSync(absPath);
      if (outStats.size < inStats.size) {
        fs.unlinkSync(absPath);
      } else {
        fs.unlinkSync(outPath);
        skippedCount += 1;
        continue;
      }

      item.image_url = `/item-images/${outName}`;
      optimizedCount += 1;
    } catch {
      skippedCount += 1;
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2) + '\n', 'utf8');

  const afterTotal = getTotalBytes(imageDir);
  const saved = beforeTotal - afterTotal;

  console.log(`Optimized: ${optimizedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Before: ${formatMB(beforeTotal)}`);
  console.log(`After: ${formatMB(afterTotal)}`);
  console.log(`Saved: ${formatMB(saved)} (${beforeTotal ? ((saved / beforeTotal) * 100).toFixed(1) : 0}%)`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

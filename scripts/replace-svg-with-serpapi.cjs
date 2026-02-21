const fs = require('fs');
const path = require('path');

const apiKey = process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY;
if (!apiKey) {
  console.error('Missing SERPAPI key in SERPAPI_API_KEY or SERPAPI_KEY');
  process.exit(2);
}

const queries = {
  smallest_nonzero_angle_deg: 'protractor close up',
  classroom_desk_top: 'school desk classroom',
  notebook_composition: 'composition notebook black marbled cover',
  wood_block_pine: 'pine wood block'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MetricMastery/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function extFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  } catch {}
  return '.jpg';
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MetricMastery/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function searchImages(query) {
  const endpoint = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&google_domain=google.com&hl=en&gl=us&ijn=0&api_key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(endpoint);
  return data.images_results || [];
}

async function main() {
  const jsonPath = 'items_reference.json';
  const imageDir = path.join('public', 'item-images');
  fs.mkdirSync(imageDir, { recursive: true });

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const byKey = Object.fromEntries(items.map((it) => [it.item_key, it]));

  const failures = [];
  let updated = 0;

  for (const [key, query] of Object.entries(queries)) {
    const item = byKey[key];
    if (!item) {
      failures.push(`${key}: item not found`);
      continue;
    }

    const results = await searchImages(query);
    let saved = false;

    for (const result of results.slice(0, 10)) {
      const imageUrl = result.original || result.thumbnail;
      if (!imageUrl) continue;

      const ext = extFromUrl(imageUrl);
      const fileName = `${key}${ext}`;
      const filePath = path.join(imageDir, fileName);

      try {
        await download(imageUrl, filePath);
        item.image_url = `/item-images/${fileName}`;
        item.image_source_page = result.link || result.source || item.image_source_page || '';
        item.image_local = true;
        updated += 1;
        saved = true;
        break;
      } catch (_) {}
      await sleep(200);
    }

    if (!saved) failures.push(`${key}: no downloadable candidate`);
    await sleep(400);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2) + '\n', 'utf8');
  console.log(`Updated ${updated} items via SerpApi`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(`- ${f}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

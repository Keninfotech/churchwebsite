/**
 * Fix all root-absolute links to relative paths across all HTML subpages.
 * Run from project root: node _fix_links.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// All subpage folders (depth 1 from root)
const SUBPAGES = [
  'business-directory', 'catechism', 'catholic-mission-league',
  'construction-committee', 'contact-us', 'cri-electronics-city',
  'digital-media-committee', 'donate-to-parish', 'gallery', 'holy-childhood',
  'laity-commission', 'mathruvedi', 'news-events', 'obituaries',
  'our-church-hierarchy', 'our-patroness', 'parish-choir', 'parish-council-2',
  'parish-history', 'pithruvedi', 'saints-in-syro-malabar-church',
  'vicars-message', 'vincent-de-paul', 'wards', 'young-couples-apostolate',
  'youth-ministry'
];

// All internal page slugs for nav/footer links
const ALL_SLUGS = [
  'our-patroness', 'our-church-hierarchy', 'parish-history', 'vicars-message',
  'donate-to-parish', 'saints-in-syro-malabar-church', 'parish-council-2',
  'wards', 'construction-committee', 'parish-choir', 'obituaries',
  'cri-electronics-city', 'business-directory', 'gallery', 'pithruvedi',
  'mathruvedi', 'youth-ministry', 'vincent-de-paul', 'laity-commission',
  'catechism', 'catholic-mission-league', 'holy-childhood', 'contact-us',
  'news-events', 'digital-media-committee', 'young-couples-apostolate'
];

const ROOT_ASSETS = ['favicon.ico', 'favicon.png', 'logo.png', 'jesus.mp4', 'jesuscentre.jpeg'];

function fixSubpage(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  [skip] ${filePath} — not found`);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 1. Root home link  href="/"  →  href="../"
  content = content.replace(/href="\/"/g, 'href="../"');

  // 2. Each page slug  href="/slug/"  →  href="../slug/"
  for (const slug of ALL_SLUGS) {
    const re = new RegExp(`href="/${slug}/"`, 'g');
    content = content.replace(re, `href="../${slug}/"`);
  }

  // 3. Root assets  href="/asset"  or  src="/asset"  →  ../asset
  for (const asset of ROOT_ASSETS) {
    content = content.replace(new RegExp(`href="/${asset}"`, 'g'), `href="../${asset}"`);
    content = content.replace(new RegExp(`src="/${asset}"`, 'g'), `src="../${asset}"`);
  }

  // 4. /assets/ paths
  content = content.replace(/href="\/assets\//g, 'href="../assets/');
  content = content.replace(/src="\/assets\//g, 'src="../assets/');

  const changes = (content.match(/\.\.\//g) || []).length - (original.match(/\.\.\//g) || []).length;
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [ok]   ${path.relative(ROOT, filePath)} — fixed`);
  } else {
    console.log(`  [--]   ${path.relative(ROOT, filePath)} — no changes`);
  }
  return changes;
}

console.log('Fixing subpage links...\n');
let totalFixed = 0;
for (const slug of SUBPAGES) {
  const fp = path.join(ROOT, slug, 'index.html');
  totalFixed += fixSubpage(fp);
}
console.log(`\nDone. Total relative refs added: ~${totalFixed}`);

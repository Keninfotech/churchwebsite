const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

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

// Helper to update navbar in a file
function updateNav(filePath, isRoot) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const minLink = isRoot ? 'href="./ministries_combined.html"' : 'href="../ministries_combined.html"';
  const newLink = isRoot ? 'href="./catechism_cml_holychildhood_combined.html"' : 'href="../catechism_cml_holychildhood_combined.html"';
  
  const targetStr = `<li><a ${minLink}>Ministries</a></li>`;
  const insertStr = `<li><a ${minLink}>Ministries</a></li><li><a ${newLink}>Catechism</a></li>`;
  
  if (content.includes(targetStr) && !content.includes(newLink)) {
    content = content.replace(targetStr, insertStr);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated navbar in ${filePath}`);
  }
}

// 1. Update all navbars
console.log('Updating navbars...');
updateNav(path.join(ROOT, 'index.html'), true);
updateNav(path.join(ROOT, 'ministries_combined.html'), true);
updateNav(path.join(ROOT, 'catechism_cml_holychildhood_combined.html'), true);

for (const slug of SUBPAGES) {
  updateNav(path.join(ROOT, slug, 'index.html'), false);
}

// 2. Remove the 3 ministries from ministries_combined.html
console.log('Cleaning up ministries_combined.html...');
const minFilePath = path.join(ROOT, 'ministries_combined.html');
if (fs.existsSync(minFilePath)) {
  let minContent = fs.readFileSync(minFilePath, 'utf8');
  
  // Remove the min-cards
  minContent = minContent.replace(/<button class="min-card" type="button" data-target="catechism"[\s\S]*?<\/button>\s*<button class="min-card" type="button" data-target="cml"[\s\S]*?<\/button>\s*<button class="min-card" type="button" data-target="holy-childhood"[\s\S]*?<\/button>/, '');

  // Remove the min-tabs
  minContent = minContent.replace(/<button class="min-tab" type="button" data-target="catechism"[\s\S]*?<\/button><button class="min-tab" type="button" data-target="cml"[\s\S]*?<\/button><button class="min-tab" type="button" data-target="holy-childhood"[\s\S]*?<\/button>/, '');

  // Remove the panels (From catechism panel up to the end of min-panels)
  const panelRegex = /<div class="ministry-panel" id="panel-catechism"[\s\S]*?<\/div>\s*<\/div>\s*<\/main>/;
  minContent = minContent.replace(panelRegex, '</div>\n  </main>');

  // Update slugs in JS
  minContent = minContent.replace(/"catechism",\s*"cml",\s*"holy-childhood"/, '');
  minContent = minContent.replace(/,\s*]/, ']');

  fs.writeFileSync(minFilePath, minContent, 'utf8');
  console.log('Cleaned up ministries_combined.html');
}

console.log('Done!');

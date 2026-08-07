const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SUBPAGES = [
  'business-directory', 'catechism', 'catholic-mission-league',
  'construction-committee', 'contact-us', 'cri-electronics-city',
  'digital-media-committee', 'donate-to-parish', 'gallery', 'holy-childhood',
  'mass-timings', 'news-events', 'obituaries', 'our-church-hierarchy',
  'our-patroness', 'parish-choir', 'parish-council-2', 'parish-history',
  'saints-in-syro-malabar-church', 'vicars-message', 'wards',
  'young-couples-apostolate'
];

const SOCIAL_HTML = `
          <ul class="social-anim">
            <li class="inst"><a href="#" aria-label="Instagram"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; margin-top: 13px;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a></li>
            <li class="fb"><a href="#" aria-label="Facebook"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; margin-top: 13px;"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a></li>
            <li class="yt"><a href="#" aria-label="YouTube"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; margin-top: 13px;"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg></a></li>
          </ul>`;

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<ul class="social-anim">')) {
    console.log(\`Already updated: \${filePath}\`);
    return;
  }

  const pRegex = /<p>A Syro-Malabar Catholic parish serving the community of Electronics City, Bangalore since 2001\\.<\\/p>/g;
  
  if (pRegex.test(content)) {
    content = content.replace(pRegex, \`<p>A Syro-Malabar Catholic parish serving the community of Electronics City, Bangalore since 2001.</p>\${SOCIAL_HTML}\`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(\`Updated: \${filePath}\`);
  } else {
    console.log(\`Target paragraph not found in: \${filePath}\`);
  }
}

// Update top-level files
updateFile(path.join(ROOT, 'index.html'));
updateFile(path.join(ROOT, 'ministries_combined.html'));
updateFile(path.join(ROOT, 'catechism_cml_holychildhood_combined.html'));

// Update subpages
SUBPAGES.forEach(subpage => {
  const filePath = path.join(ROOT, subpage, 'index.html');
  updateFile(filePath);
});

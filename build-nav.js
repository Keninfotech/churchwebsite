// Copies partials/header.html (top bar + site header + main nav) into every page.
// Edit the menu ONLY in partials/header.html, then run:  node build-nav.js
//
// - {{ROOT}} is replaced with the page's relative path to the site root ("./" or "../").
// - The link pointing at the current page gets aria-current="page".
// - The injected block is wrapped in <!-- site-header:start/end --> markers so reruns are safe.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PARTIAL = path.join(ROOT, 'partials', 'header.html');
const START = '<!-- site-header:start (generated from partials/header.html; run `node build-nav.js`) -->';
const END = '<!-- site-header:end -->';
const SKIP_DIRS = new Set(['.git', 'node_modules', 'assets', 'partials']);

function findHtmlFiles(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) findHtmlFiles(full, out);
    } else if (name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

// Relative URL of this page as the nav links write it, e.g. "./", "../wards/", "./ministries_combined.html"
function selfHref(file, root) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'index.html') return root;
  if (rel.endsWith('/index.html')) return root + rel.slice(0, -'index.html'.length);
  return root + rel;
}

function renderHeader(template, file) {
  const depth = path.relative(ROOT, path.dirname(file)).split(path.sep).filter(Boolean).length;
  const root = depth === 0 ? './' : '../'.repeat(depth);
  let html = template.replace(/\{\{ROOT\}\}/g, root);

  const current = selfHref(file, root);
  const navStart = html.indexOf('<nav');
  const navEnd = html.indexOf('</nav>');
  const nav = html.slice(navStart, navEnd).replace(
    `<a href="${current}">`,
    `<a href="${current}" aria-current="page">`
  );
  return html.slice(0, navStart) + nav + html.slice(navEnd);
}

const template = fs.readFileSync(PARTIAL, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '');
const markerRe = new RegExp(`[ \\t]*${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`);
const legacyRe = /[ \t]*<div class="topbar">[\s\S]*?<\/header>/;

let updated = 0;
for (const file of findHtmlFiles(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  const re = markerRe.test(src) ? markerRe : legacyRe.test(src) ? legacyRe : null;
  if (!re) {
    console.warn(`skip (no header found): ${path.relative(ROOT, file)}`);
    continue;
  }
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const block = `  ${START}\n${renderHeader(template, file)}\n  ${END}`.replace(/\r?\n/g, eol);
  const out = src.replace(re, () => block);
  if (out !== src) {
    fs.writeFileSync(file, out, 'utf8');
    updated++;
    console.log(`updated: ${path.relative(ROOT, file)}`);
  }
}
console.log(`Done. ${updated} file(s) changed.`);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

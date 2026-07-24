const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const webpSrc = path.join(rootDir, 'Jubilee year.webp');
const webpDest = path.join(rootDir, 'assets', 'jubilee-year.webp');

// Rename the file if it exists in root
if (fs.existsSync(webpSrc)) {
  fs.renameSync(webpSrc, webpDest);
  console.log('Moved Jubilee year.webp to assets/jubilee-year.webp');
} else if (fs.existsSync(path.join(rootDir, 'Jubilee Year.webp'))) {
  fs.renameSync(path.join(rootDir, 'Jubilee Year.webp'), webpDest);
  console.log('Moved Jubilee Year.webp to assets/jubilee-year.webp');
}

const findHtmlFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'assets') {
        findHtmlFiles(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.html')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
};

const htmlFiles = findHtmlFiles(rootDir);

const oldBlockRegex = /<div class="hero__art"[\s\S]*?<\/div>\s*<\/div>/g;

let count = 0;
for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  const relPath = path.relative(path.dirname(file), path.join(rootDir, 'assets', 'jubilee-year.webp')).replace(/\\/g, '/');
  
  const newBlock = `<img src="${relPath}" class="hero__art hero__art--image" alt="Jubilee Year 2001 - 2026" data-reveal />`;
  
  if (oldBlockRegex.test(content)) {
    content = content.replace(oldBlockRegex, newBlock);
    fs.writeFileSync(file, content, 'utf8');
    count++;
  } else {
    // maybe formatted differently
    const altRegex = /<div class="hero__art"[\s\S]{1,300}lbl">Jubilee Year[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
    if (altRegex.test(content)) {
      content = content.replace(altRegex, newBlock);
      fs.writeFileSync(file, content, 'utf8');
      count++;
    }
  }
}

console.log(`Replaced hero art in ${count} files.`);

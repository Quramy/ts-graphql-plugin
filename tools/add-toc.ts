import fs from 'fs';
import path from 'path';

const toc = require('markdown-toc');

function addToc(markdownFilename: string) {
  const content = fs.readFileSync(path.join(__dirname, '..', markdownFilename), 'utf8');
  const contentWithToc = toc.insert(content, {
    maxdepth: 4,
    bullets: ['-', '-', '-'],
  });
  fs.writeFileSync(path.join(__dirname, '..', markdownFilename), contentWithToc, 'utf8');
}

['README.md', 'CONTRIBUTING.md', 'docs/CUSTOMIZE_TYPE_GEN.md'].forEach(addToc);

import fs from 'node:fs';
import path from 'node:path';
import toc from 'markdown-toc';

const __dirname = import.meta.dirname;

function addToc(markdownFilename) {
  const content = fs.readFileSync(path.join(__dirname, '..', markdownFilename), 'utf8');
  const contentWithToc = toc.insert(content, {
    maxdepth: 4,
    bullets: ['-', '-', '-'],
  });
  fs.writeFileSync(path.join(__dirname, '..', markdownFilename), contentWithToc, 'utf8');
}

['README.md', 'CONTRIBUTING.md', 'docs/CUSTOMIZE_TYPE_GEN.md'].forEach(addToc);

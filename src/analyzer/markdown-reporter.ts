import path from 'path';
import { ManifestOutput, ManifestDocumentEntry } from './types';

export type ToMarkdownContentOptions = {
  baseDir: string;
  outputDir: string;
  ignoreFragments?: boolean;
};

function createLinkPath(fileName: string, baseDir: string, outputDir: string) {
  const displayPath = path.isAbsolute(fileName) ? path.relative(baseDir, fileName) : fileName;
  const linkPath = path.isAbsolute(fileName) ? path.relative(outputDir, fileName) : fileName;
  return { displayPath, linkPath };
}

function createSection(
  sectionName: string,
  operationDocs: ManifestDocumentEntry[],
  baseDir: string,
  outputDir: string,
) {
  const h2 = '## ' + sectionName[0].toUpperCase() + sectionName.slice(1);
  return (
    h2 +
    '\n' +
    operationDocs
      .map(doc => {
        const { displayPath, linkPath } = createLinkPath(doc.fileName, baseDir, outputDir);
        return `
### ${doc.type !== 'fragment' ? doc.operationName || 'anonymous' : doc.fragmentName}

\`\`\`graphql
${doc.body.trim()}
\`\`\`

From [${displayPath}:${doc.documentStart.line + 1}:${doc.documentStart.character + 1}](${linkPath}#L${
          doc.documentStart.line + 1
        }-L${doc.documentEnd.line + 1})
    `;
      })
      .join('\n')
  );
}

export class MarkdownReporter {
  toMarkdownConntent(
    manifest: ManifestOutput,
    { ignoreFragments = true, baseDir, outputDir }: ToMarkdownContentOptions,
  ) {
    if (!manifest.documents.length) return null;
    const outs = ['# Extracted GraphQL Operations'];
    const groupedDocs = {
      queries: [],
      mutations: [],
      subscriptions: [],
      fragments: [],
    } as { [key: string]: ManifestDocumentEntry[] };
    manifest.documents.forEach(doc => {
      switch (doc.type) {
        case 'query':
          groupedDocs.queries.push(doc);
          break;
        case 'mutation':
          groupedDocs.mutations.push(doc);
          break;
        case 'subscription':
          groupedDocs.subscriptions.push(doc);
          break;
        case 'fragment':
          if (!ignoreFragments) groupedDocs.fragments.push(doc);
          break;
        default:
          break;
      }
    });
    Object.entries(groupedDocs).forEach(([name, docs]) => {
      if (docs.length) {
        outs.push(createSection(name, docs, baseDir, outputDir));
      }
    });
    outs.push('---');
    outs.push('Extracted by [ts-graphql-plugin](https://github.com/Quramy/ts-graphql-plugin)');
    return outs.join('\n');
  }
}

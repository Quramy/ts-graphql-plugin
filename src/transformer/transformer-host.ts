import { DocumentNode } from 'graphql';
import { Analyzer, AnalyzerFactory, ExtractResult } from '../analyzer';
import { getTransformer, DocumentTransformer } from './transformer';

class DocumentNodeRegistory {
  protected readonly _map = new Map<string, Map<number, DocumentNode>>();

  constructor() {}

  getFiles() {
    return [...this._map.keys()];
  }

  getDocumentNode(templateNode: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral) {
    const positionMap = this._map.get(templateNode.getSourceFile().fileName);
    if (!positionMap) return;
    return positionMap.get(templateNode.getStart());
  }

  update(extractedResults: ExtractResult[]) {
    extractedResults.forEach(result => {
      if (!result.documentNode) return;
      let positionMap = this._map.get(result.fileName);
      if (!positionMap) {
        positionMap = new Map<number, DocumentNode>();
        this._map.set(result.fileName, positionMap);
      }
      positionMap.set(result.templateNode.getStart(), result.documentNode);
    });
  }
}

export type CreateTransformServerOptions = {
  projectPath: string;
};

export type GetTransformerOptions = {
  target?: 'object' | 'text';
  removeFragmentDefinitions?: boolean;
  documentTransformers?: string[];
  getEnabled?: () => boolean;
};

export class TransformerHost {
  private readonly _analyzer: Analyzer;
  private readonly _scriptHost: { reloadFile: (fileName: string) => void };
  private readonly _documentNodeRegistory = new DocumentNodeRegistory();

  constructor({ projectPath }: CreateTransformServerOptions) {
    const { analyzer, scriptHost } = new AnalyzerFactory().createAnalyzerAndScriptHostFromProjectPath(projectPath);
    this._analyzer = analyzer;
    this._scriptHost = { reloadFile: scriptHost.loadFromFileSystem.bind(scriptHost) };
  }

  loadProject() {
    const [, results] = this._analyzer.extract();
    this._documentNodeRegistory.update(results);
  }

  updateFiles(fileNameList: string[]) {
    fileNameList.forEach(fileName => this._scriptHost.reloadFile(fileName));

    // Note:
    // We need re-extract from not only changed .ts files but other files already opened
    // because the operations/fragments in not changed files can be affected by the change.
    //
    // For example:
    //    changed-file.ts     : export `fragment X on Query { fieldA }`
    //    other-opened-file.ts: declare `query { ...X }` importing fragment from changed-file.ts
    //
    // In the above case, the transformed output of other-opened-file.ts should have GraphQL docuemnt corresponding to `fragment X on Query { fieldA } query { ...X }`
    const [, results] = this._analyzer.extract([
      ...new Set([...fileNameList, ...this._documentNodeRegistory.getFiles()]),
    ]);
    this._documentNodeRegistory.update(results);
  }

  getTransformer({
    target = 'object',
    removeFragmentDefinitions = true,
    documentTransformers = [],
    getEnabled = () => true,
  }: GetTransformerOptions = {}) {
    const { tag } = this._analyzer.getPluginConfig();
    const documentTransformerModules = documentTransformers.map(transformerName => {
      const mod = require(transformerName);
      if (typeof mod !== 'function') {
        throw new Error('Document transofmer should be function');
      }
      return mod as DocumentTransformer;
    });
    return getTransformer({
      getEnabled,
      tag,
      target,
      removeFragmentDefinitions,
      getDocumentNode: node => this._documentNodeRegistory.getDocumentNode(node),
      documentTransformers: documentTransformerModules,
    });
  }
}

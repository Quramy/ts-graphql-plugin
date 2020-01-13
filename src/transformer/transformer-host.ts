import { Analyzer } from '../analyzer/analyzer';
import { AnalyzerFactory, ScriptHost } from '../analyzer/analyzer-factory';
import { getTransformer, DocumentTransformer } from './transformer';
import { DocumentNodeRegistory } from './document-node-registory';

export type CreateTransformerHostOptions = {
  projectPath: string;
};

export type GetTransformerOptions = {
  target?: 'object' | 'text';
  documentTransformers?: string[];
};

export class TransformerHost {
  private readonly _analyzer: Analyzer;
  private readonly _scriptHost: ScriptHost;
  private readonly _documentNodeRegistory = new DocumentNodeRegistory();

  constructor({ projectPath }: CreateTransformerHostOptions) {
    const { analyzer, scriptHost } = new AnalyzerFactory().createAnalyzerAndScriptHostFromProjectPath(projectPath);
    this._analyzer = analyzer;
    this._scriptHost = scriptHost;
  }

  loadProject() {
    const [, results] = this._analyzer.extract();
    this._documentNodeRegistory.update(results);
  }

  updateFiles(fileNameList: string[]) {
    fileNameList.forEach(fileName => this._scriptHost.updateFile(fileName));
    const [, results] = this._analyzer.extract([
      ...new Set([...fileNameList, ...this._documentNodeRegistory.getFiles()]),
    ]);
    this._documentNodeRegistory.update(results);
  }

  getTransformer({ target = 'object', documentTransformers = [] }: GetTransformerOptions = {}) {
    const { tag } = this._analyzer.getPluginConfig();
    const documentTransformerModules = documentTransformers.map(transformerName => {
      const mod = require(transformerName);
      if (typeof mod !== 'function') {
        throw new Error('Document transofmer should be function');
      }
      return mod as DocumentTransformer;
    });
    return getTransformer({
      tag,
      target,
      getDocumentNode: node => this._documentNodeRegistory.getDocumentNode(node),
      documentTransformers: documentTransformerModules,
    });
  }
}

import { DocumentNode } from 'graphql';
import { ExtractResult } from '../analyzer/extractor';

export class DocumentNodeRegistory {
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

  deleteDocumentNodesByFileName(fileName: string) {
    this._map.delete(fileName);
    return this;
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

import { buildClientSchema } from 'graphql';
import {
  CompletionItem,
  Diagnostic,
  getAutocompleteSuggestions,
  getDiagnostics,
  Position,
} from 'graphql-language-service-interface';
import * as ts from 'typescript/lib/tsserverlibrary';
import { isTagged, TagCondition } from './ts-util/index';

export interface GraphQLLanguageServiceAdapterCreateOptions {
  schema?: any;
  logger?: (msg: string) => void;
  tag?: string;
}

export type GetCompletionAtPosition = ts.LanguageService['getCompletionsAtPosition'];
export type GetSemanticDiagnostics = ts.LanguageService['getSemanticDiagnostics'];

export interface ScriptSourceHelper {
  // getSource: (fileName: string) => ts.SourceFile;
  getAllNodes: (fileName: string, condition) => ts.Node[];
  getNode: (fileName: string, position) => ts.Node;
  getLineAndChar: (fileName: string, position) => ts.LineAndCharacter;
}

export class GraphQLLanguageServiceAdapter {

  private _schema: any;
  private _tagCondition: TagCondition = null;

  constructor(
    private _helper: ScriptSourceHelper,
    opt: GraphQLLanguageServiceAdapterCreateOptions = { },
  ) {
      if (opt.logger) this._logger = opt.logger;
      if (opt.schema) this.updateSchema(opt.schema);
      if (opt.tag) this._tagCondition = opt.tag;
  }

  updateSchema(schema: { data: any }) {
    try {
      this._schema = buildClientSchema(schema.data);
      this._logger('Build client schema.');
    } catch (err) {
      this._logger('Fail to build schema...');
      this._logger(err);
      this._schema = null;
    }
  }

  getCompletionAtPosition(delegate: GetCompletionAtPosition, fileName: string, position: number, options?: ts.GetCompletionsAtPositionOptions) {
    if (!this._schema) return delegate(fileName, position, options);
    const node = this._helper.getNode(fileName, position);
    if (!node || node.kind !== ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      return delegate(fileName, position, options);
    }
    if (this._tagCondition && !isTagged(node, this._tagCondition)) {
      return delegate(fileName, position, options);
    }
    const cursor = position - node.getStart();
    const baseLC = this._helper.getLineAndChar(fileName, node.getStart());
    const cursorLC = this._helper.getLineAndChar(fileName, position);
    const relativeLC = { line: cursorLC.line - baseLC.line, character: cursorLC.character - baseLC.character + 1 };
    const p = new SimplePosition(relativeLC);
    const text = node.getText().slice(1, cursor + 1);  // remove the backquote char
    this._logger('Search text: "' + text + '" at ' + cursor + ' position');
    const gqlCompletionItems = getAutocompleteSuggestions(this._schema, text, p);
    this._logger(JSON.stringify(gqlCompletionItems));
    return translateCompletionItems(gqlCompletionItems);
  }

  getSemanticDiagnostics(delegate: GetSemanticDiagnostics, fileName: string) {
    const errors = delegate(fileName) || [];
    if (!this._schema) return errors;
    const allTemplateStringNodes = this._helper.getAllNodes(
      fileName,
      (n: ts.Node) => n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral,
    );
    const nodes = allTemplateStringNodes.filter(n => {
      if (!this._tagCondition) return true;
      return isTagged(n, this._tagCondition);
    });
    const diagonosticsList = nodes.map(n => getDiagnostics(n.getText().slice(1, n.getWidth() - 1), this._schema));
    const result = [...errors];
    diagonosticsList.forEach((diagnostics, i) => {
      const node = nodes[i];
      const nodeLC = this._helper.getLineAndChar(fileName, node.getStart());
      diagnostics.forEach(d => {
        const sl = nodeLC.line + d.range.start.line;
        const sc = d.range.start.line ? d.range.start.character : nodeLC.character + d.range.start.character;
        const el = nodeLC.line + d.range.end.line;
        const ec = d.range.end.line ? d.range.end.character : nodeLC.character + d.range.end.character;
        const start = ts.getPositionOfLineAndCharacter(node.getSourceFile(), sl, sc) + 1;
        const end = ts.getPositionOfLineAndCharacter(node.getSourceFile(), el, Math.max(0, ec - 1)) + 1;
        const h = start === end ? 0 : 1;
        result.push(translateDiagnostic(d, node.getSourceFile(), start - h, end - start));
      });
    });
    return result;
  }

  private _logger: (msg: string) => void = () => { };
}

function translateCompletionItems(items: CompletionItem[]): ts.CompletionInfo {
  const result: ts.CompletionInfo = {
    isGlobalCompletion: false,
    isMemberCompletion: false,
    isNewIdentifierLocation: false,
    entries: items.map(r => {
      // FIXME use ts.ScriptElementKind
      const kind = r.kind ? r.kind + '' : 'unknown' as any;
      return {
        name: r.label,
        kindModifiers: 'declare',
        kind,
        sortText: '0',
      };
    }),
  };
  return result;
}

function translateDiagnostic(d: Diagnostic, file: ts.SourceFile, start: number, length: number): ts.Diagnostic {
  const code = typeof d.code === 'number' ? d.code : 9999;
  const messageText = d.message.split('\n')[0];
  return {
    code,
    messageText,
    category: d.severity as ts.DiagnosticCategory,
    file,
    start,
    length,
  };
}

class SimplePosition implements Position {

  line: number;
  character: number;

  constructor(lc: ts.LineAndCharacter) {
    this.line = lc.line;
    this.character = lc.character;
  }

  lessThanOrEqualTo(p: Position) {
    if (this.line < p.line) return true;
    if (this.line > p.line) return false;
    if (this.line === p.line) {
      return this.character <= p.character;
    }
  }
}

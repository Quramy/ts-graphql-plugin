import * as ts from 'typescript';
import { findNode } from './';
import { location2pos, pos2location } from '../string-util';

export type ComputePosition = (innerPosition: number) => { fileName: string; pos: number };

export type ResolveTemplateExpressionOption = {
  node: ts.TaggedTemplateExpression | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression;
  fileName: string;
  languageService: ts.LanguageService;
};

/**
 *
 * Serves the following information.
 *
 * - text combined included substiting other template literals
 * - positon converting functions between TS source and GraphQL document
 *
 **/
export interface ResolveTemplateExpressionResult {
  combinedText: string;
  getInnerPosition: ComputePosition;
  getSourcePosition: ComputePosition;
  convertInnerPosition2InnerLocation: (pos: number) => { line: number; character: number };
  convertInnerLocation2InnerPosition: (location: { line: number; character: number }) => number;
}

const last: ComputePosition = (pos: number) => {
  throw new Error('invalid range: ' + pos);
};

export function createResultForNoSubstitution(
  node: ts.NoSubstitutionTemplateLiteral,
  fileName: string,
): ResolveTemplateExpressionResult {
  const textLength = node.text.length;
  const start = node.end - textLength - (node.getText().endsWith('`') ? 1 /* , '`'.length , */ : 0);
  return {
    combinedText: node.text,
    getInnerPosition(pos: number) {
      if (pos < start) {
        throw new Error('invalid range: ' + pos);
      } else if (pos > start + textLength - (textLength ? 1 : 0)) {
        throw new Error('invalid range: ' + pos);
      }
      return { fileName, pos: pos - start };
    },
    getSourcePosition(pos: number) {
      if (pos < 0) {
        throw new Error('invalid range: ' + pos);
      } else if (pos > textLength - (textLength ? 1 : 0)) {
        throw new Error('invalid range: ' + pos);
      }
      return { fileName, pos: pos + start };
    },
    convertInnerLocation2InnerPosition: location2pos.bind(null, node.text),
    convertInnerPosition2InnerLocation: pos2location.bind(null, node.text),
  };
}

function createComputePositionsForTemplateHead(node: ts.TemplateHead, fileName: string) {
  const textLength = node.text.length;
  const start = node.end - textLength - (node.getText().endsWith('${') ? 2 /* , '${'.length , */ : 0);
  const getInnerPosition = (pos: number, next: ComputePosition) => {
    if (pos < start) {
      throw new Error('invalid range: ' + pos);
    } else if (pos > start + textLength - (textLength ? 1 : 0)) {
      return next(pos);
    }
    return { fileName, pos: pos - start };
  };
  const getSourcePosition = (pos: number, next: ComputePosition) => {
    if (pos < 0) {
      throw new Error('invalid range: ' + pos);
    } else if (pos > textLength - (textLength ? 1 : 0)) {
      return next(pos);
    }
    return { fileName, pos: pos + start };
  };
  return [getInnerPosition, getSourcePosition];
}

function createComputePositionsForTemplateSpan(node: ts.TemplateSpan, fileName: string, headLength: number = 0) {
  const start = node.literal.pos + 1 /* , '}'.length , */;
  const textLength = node.literal.text.length;
  const end = start + node.literal.text.length;
  const expressionStart = node.expression.pos;
  const getInnerPosition = (pos: number, next: ComputePosition) => {
    if (pos < start) {
      throw new Error('invalid range: ' + pos);
    } else if (pos >= end) {
      return next(pos);
    }
    return { fileName, pos: pos - start + headLength };
  };
  const getSourcePosition = (pos: number, next: ComputePosition) => {
    if (pos < headLength) {
      return { fileName, pos: expressionStart };
    } else if (pos > headLength + textLength - (textLength ? 1 : 0)) {
      return next(pos);
    }
    return { fileName, pos: pos + start - headLength };
  };
  return [getInnerPosition, getSourcePosition];
}

function getValueAsString(fileName: string, node: ts.Node, languageService: ts.LanguageService): string | undefined {
  const getValueForTemplateExpression = (node: ts.TemplateExpression) => {
    const texts = [node.head.text];
    for (const span of node.templateSpans) {
      const stringForSpan = getValueAsString(fileName, span.expression, languageService);
      if (!stringForSpan) return;
      texts.push(stringForSpan);
      texts.push(span.literal.text);
    }
    return texts.join('');
  };

  if (ts.isStringLiteral(node)) {
    return node.text;
  } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  } else if (ts.isIdentifier(node)) {
    let currentFileName = fileName;
    let currentNode: ts.Node = node;
    while (true) {
      const defs = languageService.getDefinitionAtPosition(currentFileName, currentNode.getStart());
      if (!defs || !defs[0]) return;
      const def = defs[0];
      const src = languageService.getProgram()!.getSourceFile(def.fileName);
      if (!src) return;
      const found = findNode(src, def.textSpan.start);
      if (!found || !found.parent || !ts.isVariableDeclaration(found.parent) || !found.parent.initializer) return;
      currentFileName = def.fileName;
      currentNode = found.parent.initializer;
      if (ts.isIdentifier(found.parent.initializer)) {
        continue;
      }
      return getValueAsString(currentFileName, currentNode, languageService);
    }
  } else if (ts.isTaggedTemplateExpression(node)) {
    if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
      return node.template.text;
    } else {
      return getValueForTemplateExpression(node.template);
    }
  } else if (ts.isTemplateExpression(node)) {
    return getValueForTemplateExpression(node);
  }
}

export function resolveTemplateExpression({ node, fileName, languageService }: ResolveTemplateExpressionOption) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return createResultForNoSubstitution(node, fileName);
  }
  let template: ts.TemplateExpression;
  if (ts.isTemplateExpression(node)) {
    template = node;
  } else if (ts.isTemplateExpression(node.template)) {
    template = node.template;
  } else if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
    return createResultForNoSubstitution(node.template, fileName);
  } else {
    return;
  }
  const head = template.head;
  const [getInnerPosForHead, getSourcePosForHead] = createComputePositionsForTemplateHead(head, fileName);
  let headLength = head.text.length;
  const texts = [head.text];
  const getInnerPositions = [getInnerPosForHead];
  const getSourcePositions = [getSourcePosForHead];
  for (const spanNode of template.templateSpans) {
    const stringForSpan = getValueAsString(fileName, spanNode.expression, languageService);
    if (!stringForSpan) return;
    headLength += stringForSpan.length;
    texts.push(stringForSpan);
    const [getInnerPositionsForSpan, getSourcePositionForSpan] = createComputePositionsForTemplateSpan(
      spanNode,
      fileName,
      headLength,
    );
    getInnerPositions.unshift(getInnerPositionsForSpan);
    getSourcePositions.unshift(getSourcePositionForSpan);
    headLength += spanNode.literal.text.length;
    texts.push(spanNode.literal.text);
  }

  const combinedText = texts.join('');
  return {
    combinedText,
    getInnerPosition: getInnerPositions.reduce((acc: ComputePosition, fn) => (pos: number) => fn(pos, acc), last),
    getSourcePosition: getSourcePositions.reduce((acc: ComputePosition, fn) => (pos: number) => fn(pos, acc), last),
    convertInnerLocation2InnerPosition: location2pos.bind(null, combinedText),
    convertInnerPosition2InnerLocation: pos2location.bind(null, combinedText),
  } as ResolveTemplateExpressionResult;
}

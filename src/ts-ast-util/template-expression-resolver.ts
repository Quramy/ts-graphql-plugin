import * as ts from 'typescript';
import { location2pos, pos2location } from '../string-util';
import { findNode } from './utilily-functions';
import { ComputePosition, ResolvedTemplateInfo, ResolveResult, ResolveErrorInfo } from './types';

const last: ComputePosition = (pos: number) => {
  throw new Error('invalid range: ' + pos);
};

export function createResultForNoSubstitution(
  node: ts.NoSubstitutionTemplateLiteral,
  fileName: string,
): ResolvedTemplateInfo {
  const textLength = node.text.length;
  const start = node.end - textLength - (node.getText().endsWith('`') ? 1 /* , '`'.length , */ : 0);
  return {
    combinedText: node.text,
    getInnerPosition(pos: number) {
      if (pos < start) {
        throw new Error('invalid range: ' + pos);
      } else if (pos > start + textLength) {
        throw new Error('invalid range: ' + pos);
      }
      return { fileName, pos: pos - start };
    },
    getSourcePosition(pos: number) {
      if (pos < 0) {
        throw new Error('invalid range: ' + pos);
      } else if (pos > textLength) {
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
    } else if (pos > start + textLength) {
      return next(pos);
    }
    return { fileName, pos: pos - start };
  };
  const getSourcePosition = (pos: number, next: ComputePosition) => {
    if (pos < 0) {
      throw new Error('invalid range: ' + pos);
    } else if (pos > textLength) {
      return next(pos);
    }
    return { fileName, pos: pos + start };
  };
  return [getInnerPosition, getSourcePosition];
}

function createComputePositionsForTemplateSpan(node: ts.TemplateSpan, fileName: string, headLength: number = 0) {
  const start = node.literal.pos + 1; /* , '}'.length , */
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
      return { fileName, pos: expressionStart, isInOtherExpression: true };
    } else if (pos > headLength + textLength - (textLength ? 1 : 0)) {
      return next(pos);
    }
    return { fileName, pos: pos + start - headLength };
  };
  return [getInnerPosition, getSourcePosition];
}

class ResultCache<S> {
  private _cacheMap = new Map<ts.Node, S>();

  constructor(private _maxSize: number = 200) {}

  set(key: ts.Node, value: S) {
    this._cacheMap.set(key, value);
    if (this._cacheMap.size > this._maxSize) {
      const lru = this._cacheMap.keys().next();
      this._cacheMap.delete(lru.value);
    }
  }

  get(key: ts.Node) {
    const result = this._cacheMap.get(key);
    if (!result) return;
    return result;
  }

  has(key: ts.Node) {
    return this._cacheMap.has(key);
  }

  touch(key: ts.Node) {
    const result = this._cacheMap.get(key);
    if (!result) return;
    this._cacheMap.delete(key);
    this._cacheMap.set(key, result);
  }

  del(key: ts.Node) {
    this._cacheMap.delete(key);
  }
}

export class TemplateExpressionResolver {
  /** @internal **/
  readonly _resultCache = new ResultCache<{
    result: ResolvedTemplateInfo;
    dependencyVersions: { fileName: string; version: string }[];
  }>();

  /** @internal **/
  readonly _stringValueCache = new ResultCache<{
    result: string | undefined;
    dependencyVersions: { fileName: string; version: string }[];
  }>();

  logger: (msg: string) => void = () => {};

  constructor(
    private readonly _langService: ts.LanguageService,
    private readonly _getFileVersion: (fileName: string) => string,
  ) {}

  resolve(
    fileName: string,
    node: ts.TaggedTemplateExpression | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression,
  ): ResolveResult {
    const cacheValue = this._resultCache.get(node);
    if (cacheValue) {
      if (cacheValue.dependencyVersions.every(dep => this._getFileVersion(dep.fileName) === dep.version)) {
        this._resultCache.touch(node);
        this.logger('Use cache value: ' + cacheValue.result.combinedText);
        return { resolvedInfo: cacheValue.result, resolveErrors: [] };
      } else {
        this._resultCache.del(node);
      }
    }

    const setValueToCache = (resolvedInfo: ResolvedTemplateInfo, dependencies = [fileName]) => {
      const versions = [...new Set(dependencies)].map(fileName => ({
        fileName,
        version: this._getFileVersion(fileName),
      }));
      this._resultCache.set(node, { result: resolvedInfo, dependencyVersions: versions });
      return {
        resolvedInfo,
        resolveErrors: [],
      };
    };

    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return setValueToCache(createResultForNoSubstitution(node, fileName));
    }
    let template: ts.TemplateExpression;
    if (ts.isTemplateExpression(node)) {
      template = node;
    } else if (ts.isTemplateExpression(node.template)) {
      template = node.template;
    } else if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
      return setValueToCache(createResultForNoSubstitution(node.template, fileName));
    } else {
      return {
        resolveErrors: [],
      };
    }
    const head = template.head;
    const [getInnerPosForHead, getSourcePosForHead] = createComputePositionsForTemplateHead(head, fileName);
    let headLength = head.text.length;
    let dependencies = [fileName];
    const texts = [head.text];
    const getInnerPositions = [getInnerPosForHead];
    const getSourcePositions = [getSourcePosForHead];
    const resolveErrors: ResolveErrorInfo[] = [];
    for (const spanNode of template.templateSpans) {
      const { text: stringForSpan, dependencies: childDeps } = this._getValueAsString(
        fileName,
        spanNode.expression,
        dependencies,
      );
      if (!stringForSpan) {
        resolveErrors.push({
          fileName,
          start: spanNode.expression.getStart(),
          end: spanNode.expression.getEnd(),
        });
        continue;
      }
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
      dependencies = [...dependencies, ...childDeps];
    }

    if (resolveErrors.length > 0) {
      return {
        resolveErrors,
      };
    }

    const combinedText = texts.join('');
    return setValueToCache(
      {
        combinedText,
        getInnerPosition: getInnerPositions.reduce((acc: ComputePosition, fn) => (pos: number) => fn(pos, acc), last),
        getSourcePosition: getSourcePositions.reduce((acc: ComputePosition, fn) => (pos: number) => fn(pos, acc), last),
        convertInnerLocation2InnerPosition: location2pos.bind(null, combinedText),
        convertInnerPosition2InnerLocation: pos2location.bind(null, combinedText),
      } as ResolvedTemplateInfo,
      dependencies,
    );
  }

  update(
    target: ResolvedTemplateInfo,
    innerPositionRangeToChange: { start: number; end: number },
    text: string = '',
  ): ResolvedTemplateInfo {
    const {
      combinedText: originalText,
      getInnerPosition: originalGetInnerPosition,
      getSourcePosition: originalGetSourcePosition,
    } = target;
    const headText = originalText.slice(0, innerPositionRangeToChange.start);
    const tailText = originalText.slice(innerPositionRangeToChange.end, originalText.length);
    const combinedText = headText + text + tailText;
    const getInnerPosition: ComputePosition = (pos: number) => {
      const x = originalGetInnerPosition(pos);
      if (x.pos < innerPositionRangeToChange.start) {
        return x;
      } else if (innerPositionRangeToChange.start <= x.pos && x.pos < innerPositionRangeToChange.end) {
        return {
          ...x,
          pos: innerPositionRangeToChange.start,
        };
      } else {
        return {
          ...x,
          pos: x.pos - (innerPositionRangeToChange.end - innerPositionRangeToChange.start) + text.length,
        };
      }
    };
    const getSourcePosition: ComputePosition = (pos: number) => {
      if (pos < innerPositionRangeToChange.start) {
        return originalGetSourcePosition(pos);
      } else if (innerPositionRangeToChange.start <= pos && pos < innerPositionRangeToChange.start + text.length) {
        return originalGetSourcePosition(innerPositionRangeToChange.start);
      } else {
        return originalGetSourcePosition(
          pos + (innerPositionRangeToChange.end - innerPositionRangeToChange.start) - text.length,
        );
      }
    };
    return {
      combinedText,
      getInnerPosition,
      getSourcePosition,
      convertInnerLocation2InnerPosition: location2pos.bind(null, combinedText),
      convertInnerPosition2InnerLocation: pos2location.bind(null, combinedText),
    };
  }

  private _getValueAsString(
    fileName: string,
    node: ts.Node,
    dependencies = [fileName],
  ): { text?: string; dependencies: string[] } {
    const cacheValue = this._stringValueCache.get(node);
    if (cacheValue) {
      if (cacheValue.dependencyVersions.every(dep => this._getFileVersion(dep.fileName) === dep.version)) {
        this._stringValueCache.touch(node);
        this.logger('Use cache value: ' + cacheValue.result);
        return { text: cacheValue.result, dependencies: cacheValue.dependencyVersions.map(dep => dep.fileName) };
      } else {
        this._stringValueCache.del(node);
      }
    }

    const setValueToCache = ({ text, dependencies }: { text?: string; dependencies: string[] }) => {
      this._stringValueCache.set(node, {
        result: text,
        dependencyVersions: [...new Set(dependencies)].map(fileName => ({
          fileName,
          version: this._getFileVersion(fileName),
        })),
      });
      return { text, dependencies };
    };

    const getValueForTemplateExpression = (node: ts.TemplateExpression, dependencies: string[]) => {
      const texts = [node.head.text];
      let newDependenciees = [...dependencies];
      for (const span of node.templateSpans) {
        const { text: stringForSpan, dependencies: childDepes } = this._getValueAsString(
          fileName,
          span.expression,
          dependencies,
        );
        if (!stringForSpan) return { dependencies };
        texts.push(stringForSpan);
        texts.push(span.literal.text);
        newDependenciees = [...newDependenciees, ...childDepes];
      }
      return { text: texts.join(''), dependencies: newDependenciees };
    };

    if (ts.isStringLiteral(node)) {
      return setValueToCache({ text: node.text, dependencies });
    } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return setValueToCache({ text: node.text, dependencies });
    } else if (ts.isIdentifier(node)) {
      let currentFileName = fileName;
      let currentNode: ts.Node = node;
      while (true) {
        const defs = this._langService.getDefinitionAtPosition(currentFileName, currentNode.getStart());
        if (!defs || !defs[0]) return { dependencies };
        const def = defs[0];
        const src = this._langService.getProgram()!.getSourceFile(def.fileName);
        if (!src) return { dependencies };
        const found = findNode(src, def.textSpan.start);
        if (!found || !found.parent) return { dependencies };
        currentFileName = def.fileName;
        if (ts.isVariableDeclaration(found.parent) && found.parent.initializer) {
          currentNode = found.parent.initializer;
        } else if (ts.isPropertyDeclaration(found.parent) && found.parent.initializer) {
          currentNode = found.parent.initializer;
        } else if (ts.isPropertyAssignment(found.parent)) {
          currentNode = found.parent.initializer;
        } else if (ts.isShorthandPropertyAssignment(found.parent)) {
          currentNode = found;
        } else {
          return { dependencies };
        }
        if (ts.isIdentifier(currentNode)) {
          continue;
        }
        return setValueToCache(
          this._getValueAsString(currentFileName, currentNode, [...dependencies, currentFileName]),
        );
      }
    } else if (ts.isPropertyAccessExpression(node)) {
      return setValueToCache(this._getValueAsString(fileName, node.name, dependencies));
    } else if (ts.isTaggedTemplateExpression(node)) {
      if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
        return setValueToCache({ text: node.template.text, dependencies });
      } else {
        return setValueToCache(getValueForTemplateExpression(node.template, dependencies));
      }
    } else if (ts.isTemplateExpression(node)) {
      return setValueToCache(getValueForTemplateExpression(node, dependencies));
    }
    return { dependencies };
  }
}

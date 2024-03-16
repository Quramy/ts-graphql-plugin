import ts from 'typescript';
import type { TagConfig, StrictTagCondition } from './types';

// TODO Change default at v4
export const DEFAULT_TAG_CONDITION = {
  names: [],
  allowNotTaggedTemplate: true,
  allowTaggedTemplateExpression: true,
  allowFunctionCallExpression: false,
} satisfies StrictTagCondition;

export function parseTagConfig(tagConfig: TagConfig | undefined): StrictTagCondition {
  const parseName = (name: unknown) => {
    if (typeof name === 'string') {
      return [name];
    } else if (Array.isArray(name)) {
      return name.map(n => n.toString());
    } else {
      return [] as string[];
    }
  };

  if (!tagConfig) {
    return DEFAULT_TAG_CONDITION;
  }

  if (typeof tagConfig === 'string' || Array.isArray(tagConfig)) {
    return {
      names: parseName(tagConfig),
      allowNotTaggedTemplate: false,
      allowTaggedTemplateExpression: true,
      allowFunctionCallExpression: false,
    };
  }

  const names = parseName(tagConfig.name);
  return {
    names,
    allowNotTaggedTemplate: false,
    allowTaggedTemplateExpression: true,
    allowFunctionCallExpression:
      tagConfig.ignoreFunctionCallExpression == null
        ? false // Change behavior at v4
        : tagConfig.ignoreFunctionCallExpression === false
          ? true
          : false,
  };
}

export function getTemplateNodeUnder(
  node: ts.Node | undefined,
  { allowFunctionCallExpression, allowNotTaggedTemplate, allowTaggedTemplateExpression, names }: StrictTagCondition,
) {
  if (!node) return undefined;
  if (allowTaggedTemplateExpression && ts.isTaggedTemplateExpression(node) && ts.isIdentifier(node.tag)) {
    if (names.includes(node.tag.escapedText as string)) {
      return node.template;
    }
  }
  if (
    allowFunctionCallExpression &&
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.arguments.length > 0
  ) {
    const firstArg = node.arguments[0];
    if (!ts.isTemplateLiteral(firstArg)) return;
    if (names.includes(node.expression.escapedText as string)) {
      return firstArg;
    }
  }
  if (allowNotTaggedTemplate && ts.isTemplateLiteral(node)) {
    return node;
  }
}

export function isTaggedTemplateNode(node: ts.TemplateLiteral, tagCondition: StrictTagCondition) {
  if (tagCondition.allowNotTaggedTemplate) return true;
  return !!getTemplateNodeUnder(node.parent, tagCondition);
}

export function getTagName(
  node: ts.TemplateLiteral,
  { allowNotTaggedTemplate, allowFunctionCallExpression, allowTaggedTemplateExpression, names }: StrictTagCondition,
) {
  if (!node.parent) return undefined;
  if (!ts.isCallExpression(node.parent) && !ts.isTaggedTemplateExpression(node.parent)) {
    return allowNotTaggedTemplate ? '' : undefined;
  }
  if (allowFunctionCallExpression && ts.isCallExpression(node.parent) && ts.isIdentifier(node.parent.expression)) {
    const name = node.parent.expression.escapedText as string;
    return names.includes(name) ? name : allowNotTaggedTemplate ? '' : undefined;
  }
  if (allowTaggedTemplateExpression && ts.isTaggedTemplateExpression(node.parent) && ts.isIdentifier(node.parent.tag)) {
    const name = node.parent.tag.escapedText as string;
    return names.includes(name) ? name : allowNotTaggedTemplate ? '' : undefined;
  }
  return undefined;
}

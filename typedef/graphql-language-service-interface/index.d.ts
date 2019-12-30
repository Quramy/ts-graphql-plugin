declare module 'graphql-language-service-interface' {
  export interface Position {
    line: number;
    character: number;
    lessThanOrEqualTo: (position: Position) => boolean;
  }

  export interface Range {
    start: Position;
    end: Position;
    containsPosition: (position: Position) => boolean;
  }

  export interface State {
    level: number;
    levels?: number[];
    prevState: State;
    rule: any; // tmp
    kind: string;
    name: string;
    type: string;
    step: number;
    needsSeperator: boolean;
    needsAdvance?: boolean;
    indentLevel?: number;
  }

  export interface ContextToken {
    start: number;
    end: number;
    string: string;
    state: State;
    style: string;
  }

  export interface CompletionItem {
    label: string;
    kind?: number;
    detail?: string;
    documentation?: string;
    // GraphQL Deprecation information
    isDeprecated?: string;
    deprecationReason?: string;
  }

  export type CustomValidationRule = any; // TODO

  export interface Diagnostic {
    range: Range;
    severity?: number;
    code?: number | string;
    source?: string;
    message: string;
  }

  export function getAutocompleteSuggestions(
    schema: any,
    queryText: string,
    cursor: Position,
    contextToken?: ContextToken,
  ): CompletionItem[];

  export function getDiagnostics(queryText: string, schema?: any, customRules?: CustomValidationRule[]): Diagnostic[];
}

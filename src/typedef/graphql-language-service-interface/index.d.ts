declare module 'graphql-language-service-interface' {
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

  export function getTokenAtPosition(queryText: string, cursor: number): ContextToken;

  export function getAutocompleteSuggestions(schema: any, queryText: string, cursor: number, contextToken?: ContextToken): CompletionItem[]; 
}

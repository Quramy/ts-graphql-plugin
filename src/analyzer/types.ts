export type OperationType = 'query' | 'mutation' | 'subscription' | 'fragment' | 'complex' | 'other';

export interface ManifestDocumentEntry {
  fileName: string;
  type: OperationType;
  operationName?: string;
  body: string;
  tag?: string;
  documentStart: { line: number; character: number };
  documentEnd: { line: number; character: number };
  templateLiteralNodeStart: { line: number; character: number };
  templateLiteralNodeEnd: { line: number; character: number };
}

export interface ManifestOutput {
  documents: ManifestDocumentEntry[];
}

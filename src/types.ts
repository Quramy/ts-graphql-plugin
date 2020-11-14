import { SchemaConfig } from './schema-manager/types';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  exportTypedQueryDocumentNode?: boolean;
  name: string;
  removeDuplicatedFragments?: boolean;
  tag?: string;
};

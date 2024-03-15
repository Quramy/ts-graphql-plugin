import type { SchemaConfig } from './schema-manager';
import type { TagConfig } from './ts-ast-util';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  name: string;
  exclude?: string[];
  enabledGlobalFragments?: boolean;
  removeDuplicatedFragments?: boolean;
  tag?: TagConfig;
  typegen?: {
    addons?: string[];
  };
};

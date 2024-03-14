import { SchemaConfig } from './schema-manager';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  name: string;
  exclude?: string[];
  enabledGlobalFragments?: boolean;
  removeDuplicatedFragments?: boolean;
  tag?: string;
  typegen?: {
    addons?: string[];
  };
};

import { SchemaConfig } from './schema-manager';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  name: string;
  enabledGlobalFragments?: boolean;
  removeDuplicatedFragments?: boolean;
  tag?: string;
  typegen?: {
    addons?: string[];
  };
};

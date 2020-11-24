import { SchemaConfig } from './schema-manager';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  name: string;
  removeDuplicatedFragments?: boolean;
  tag?: string;
  typegen?: {
    addons?: string[];
  };
};

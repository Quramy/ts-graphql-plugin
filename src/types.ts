import { SchemaConfig } from './schema-manager/types';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  name: string;
  removeDuplicatedFragments?: boolean;
  tag?: string;
  typegen?: {
    addons?: string[];
  };
};

import { SchemaConfig } from './schema-manager/types';

export type TsGraphQLPluginConfigOptions = SchemaConfig & {
  name: string;
  tag?: string;
};

import type ts from 'typescript/lib/tsserverlibrary';

import { setModule } from './ts-server-module';

export const pluginModuleFactory: ts.server.PluginModuleFactory = ({ typescript }) => {
  setModule(typescript);
  const { create } = require('./create-plugin') as typeof import('./create-plugin');
  return { create };
};

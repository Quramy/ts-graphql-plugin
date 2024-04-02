import { pluginModuleFactory } from './language-service-plugin';

export type {
  TypeGenAddonFactory,
  TypeGenVisitorAddon,
  TypeGenVisitorAddonContext,
  CustomScalarInput,
  CustomScalarOutput,
  DocumentInput,
  FragmentDefinitionInput,
  OperationDefinionInput,
} from './typegen/addon/types';

module.exports = pluginModuleFactory;

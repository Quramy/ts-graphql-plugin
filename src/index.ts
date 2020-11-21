import moduleFactory from './plugin-module-factory';

export {
  TypeGenAddonFactory,
  TypeGenVisitorAddon,
  TypeGenVisitorAddonContext,
  CustomScalarInput,
  CustomScalarOutput,
  DocumentInput,
  FragmentDefinitionInput,
  OperationDefinionInput,
} from './typegen/addon/types';

module.exports = moduleFactory;

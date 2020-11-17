import {
  TypeGenVisitorAddon,
  StrictAddon,
  CustomScalarInput,
  CustomScalarOutput,
  DocumentInput,
  OperationDefinionInput,
  FragmentDefinitionInput,
} from './types';

export function mergeAddons(addonList: (TypeGenVisitorAddon | undefined)[]) {
  const addon: StrictAddon = {
    customScalar: (input: CustomScalarInput) => {
      return addonList.reduce((acc: CustomScalarOutput | undefined, addon) => {
        return addon?.customScalar ? acc || addon?.customScalar(input) : acc;
      }, undefined);
    },

    document(input: DocumentInput) {
      return addonList.forEach(addon => addon?.document?.(input));
    },

    operationDefiniton(input: OperationDefinionInput) {
      return addonList.forEach(addon => addon?.operationDefiniton?.(input));
    },

    fragmentDefinition(input: FragmentDefinitionInput) {
      return addonList.forEach(addon => addon?.fragmentDefinition?.(input));
    },
  };

  return addon;
}

import path from 'path';
import ts from 'typescript';
import { TypeGenAddonFactory } from '../../lib';

// `addonFactory` function is called by each output file
const addonFactory: TypeGenAddonFactory = ({ source, extractedInfo }) => {
  const typeModuleRelativePath = path.relative(source.outputDirName, path.join(__dirname, 'types'));

  return {

    // `document` callback reacts GraphQL Document (Root) AST node.
    document() {
      source.writeLeadingComment(`This query is extracted from ${path.relative(__dirname, extractedInfo.fileName)}`);
    },

    // `customScalar` callback can
    customScalar({ scalarType }) {
      switch (scalarType.name) {
        case 'URL': {
          // Write `import { GqlURL } from '../../types';
          source.pushNamedImportIfNeeded('GqlURL', typeModuleRelativePath);

          // Set this field as TypeScript `GqlURL` type
          return ts.createTypeReferenceNode('GqlURL');
        }
        case 'Date': {
          return ts.createTypeReferenceNode('Date');
        }
        default:
          // If return undefined, this scalar field type is determined by the core type generator.
          return;
      }
    },
  };
};

module.exports = addonFactory;

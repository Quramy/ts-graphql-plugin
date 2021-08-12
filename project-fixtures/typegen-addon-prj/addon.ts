import path from 'path';
import { template } from 'talt';
import { TypeGenAddonFactory, TypeGenVisitorAddon } from '../../lib';

// `addonFactory` function is called for each output ts file
// and should return an object which implements `TypeGenVisitorAddon` interface.
const addonFactory: TypeGenAddonFactory = typegenContext => {
  const { source, extractedInfo } = typegenContext;

  const typesModuleRelativePath = path.relative(source.outputDirName, path.join(__dirname, 'types'));

  const addon: TypeGenVisitorAddon = {
    // `document` callback reacts GraphQL Document (Root) AST node.
    document() {
      source.writeLeadingComment(
        `The following types are extracted from ${path.relative(__dirname, extractedInfo.fileName)}`,
      );
    },

    // `customScalar` is called back when processing GraphQL Scalar field.
    // And it can return corresponding TypeScript TypeNode such as:
    // `ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)`, `ts.createTypeReferenceNode('SomeType')`
    customScalar({ scalarType }) {
      switch (scalarType.name) {
        case 'URL': {
          // Write `import { GqlURL } from '../../types';
          source.pushNamedImportIfNeeded('GqlURL', typesModuleRelativePath);

          // Set this field as TypeScript `GqlURL` type
          return template.typeNode`GqlURL`();
        }
        case 'Date': {
          return template.typeNode`Date`();
        }
        default:
          // If return undefined, this scalar field type is determined by the core type generator.
          return;
      }
    },
  };

  return addon;
};

module.exports = addonFactory;

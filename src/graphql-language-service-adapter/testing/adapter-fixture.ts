import ts from 'typescript';
import { GraphQLSchema } from 'graphql';
import {
  createScriptSourceHelper,
  getTemplateNodeUnder,
  getSanitizedTemplateText,
  ScriptSourceHelper,
} from '../../ts-ast-util';
import { FragmentRegistry } from '../../gql-ast-util';
import { GraphQLLanguageServiceAdapter } from '../graphql-language-service-adapter';
import {
  createTestingLanguageServiceAndHost,
  TestingLanguageServiceHost,
} from '../../ts-ast-util/testing/testing-language-service';

export class AdapterFixture {
  readonly adapter: GraphQLLanguageServiceAdapter;
  readonly langService: ts.LanguageService;
  readonly scriptSourceHelper: ScriptSourceHelper;
  private readonly _sourceFileName: string;
  private readonly _langServiceHost: TestingLanguageServiceHost;
  private readonly _fragmentRegistry: FragmentRegistry;

  constructor(sourceFileName: string, schema?: GraphQLSchema) {
    const { languageService, languageServiceHost } = createTestingLanguageServiceAndHost({
      files: [{ fileName: sourceFileName, content: '' }],
    });
    this._sourceFileName = sourceFileName;
    this._langServiceHost = languageServiceHost;
    this._fragmentRegistry = new FragmentRegistry();
    this.langService = languageService;
    (this.scriptSourceHelper = createScriptSourceHelper(
      { languageService, languageServiceHost, project: { getProjectName: () => 'tsconfig.json' } },
      { exclude: [] },
    )),
      (this.adapter = new GraphQLLanguageServiceAdapter(this.scriptSourceHelper, {
        schema: schema || null,
        removeDuplicatedFragments: true,
        fragmentRegistry: this._fragmentRegistry,
        tag: {
          names: [],
          allowNotTaggedTemplate: true,
          allowTaggedTemplateExpression: true,
          allowFunctionCallExpression: true,
        },
      }));
  }

  get source() {
    return this._langServiceHost.getFile(this._sourceFileName)!.content;
  }

  set source(content: string) {
    this._langServiceHost.updateFile(this._sourceFileName, content);
    const documents = this.scriptSourceHelper
      .getAllNodes(this._sourceFileName, node =>
        getTemplateNodeUnder(node, {
          names: [],
          allowNotTaggedTemplate: true,
          allowTaggedTemplateExpression: true,
          allowFunctionCallExpression: true,
        }),
      )
      .map(node => getSanitizedTemplateText(node));
    this._fragmentRegistry.registerDocuments(this._sourceFileName, content, documents);
  }

  registerFragment(sourceFileName: string, fragmentDefDoc: string) {
    if (sourceFileName === this._sourceFileName) return this;
    this._fragmentRegistry.registerDocuments(sourceFileName, fragmentDefDoc, [
      { sourcePosition: 0, text: fragmentDefDoc },
    ]);
    return this;
  }
}

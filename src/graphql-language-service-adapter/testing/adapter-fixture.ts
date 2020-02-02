import ts from 'typescript';
import { GraphQLSchema } from 'graphql';
import { createScriptSourceHelper } from '../../ts-ast-util';
import { GraphQLLanguageServiceAdapter } from '../graphql-language-service-adapter';
import {
  createTestingLanguageServiceAndHost,
  TestingLanguageServiceHost,
} from '../../ts-ast-util/testing/testing-language-service';

export class AdapterFixture {
  readonly adapter: GraphQLLanguageServiceAdapter;
  readonly langService: ts.LanguageService;
  private readonly _sourceFileName: string;
  private readonly _langServiceHost: TestingLanguageServiceHost;

  constructor(sourceFileName: string, schema?: GraphQLSchema) {
    const { languageService, languageServiceHost } = createTestingLanguageServiceAndHost({
      files: [{ fileName: sourceFileName, content: '' }],
    });
    this._sourceFileName = sourceFileName;
    this._langServiceHost = languageServiceHost;
    this.langService = languageService;
    this.adapter = new GraphQLLanguageServiceAdapter(
      createScriptSourceHelper({ languageService, languageServiceHost }),
      {
        schema: schema || null,
        removeDuplicatedFragments: true,
      },
    );
  }

  get source() {
    return this._langServiceHost.getFile(this._sourceFileName)!.content;
  }

  set source(content: string) {
    this._langServiceHost.updateFile(this._sourceFileName, content);
  }
}

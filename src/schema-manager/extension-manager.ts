import ts from 'typescript/lib/tsserverlibrary';
import { GraphQLSchema, parse, extendSchema, DocumentNode } from 'graphql';
import path from 'path';
import { SchemaBuildErrorInfo } from './schema-manager';

export class ExtensionManager {
  private _targetSdlFileNames: string[];
  private _parsedExtensionAstMap = new Map<string, DocumentNode>();
  private _graphqlErrorMap = new Map<string, SchemaBuildErrorInfo>();

  constructor(private _info: ts.server.PluginCreateInfo) {
    const localSchemaExtensions = this._info.config.localSchemaExtensions as string[] | undefined;
    this._targetSdlFileNames = (localSchemaExtensions || []).map(filePath =>
      this.getAbsoluteSchemaPath(this._getProjectRootPath(this._info), filePath),
    );
  }

  readExtensions() {
    this._targetSdlFileNames.forEach(filePath => this._readExtension(filePath));
  }

  extendSchema(baseSchema: GraphQLSchema) {
    if (this._graphqlErrorMap.size) return null;
    for (const [fileName, node] of this._parsedExtensionAstMap.entries()) {
      try {
        baseSchema = extendSchema(baseSchema, node);
      } catch (error) {
        if (error instanceof Error) {
          const { message, locations } = error as any;
          this._graphqlErrorMap.set(fileName, { message, fileName, locations });
        }
        return null;
      }
    }
    this._graphqlErrorMap.clear();
    return baseSchema;
  }

  getSchemaErrors() {
    return [...this._graphqlErrorMap.values()];
  }

  startWatch(cb: () => void, interval = 100) {
    this._targetSdlFileNames.forEach(fileName => {
      this._info.serverHost.watchFile(
        fileName,
        () => {
          this._log('Changed local extension schema: ' + fileName);
          this._readExtension(fileName);
          cb();
        },
        interval,
      );
    });
  }

  private _readExtension(fileName: string) {
    if (!this._info.languageServiceHost.readFile || !this._info.languageServiceHost.fileExists) {
      throw new Error('for this plugin, languageServiceHost should has readFile and fileExists method');
    }
    if (!this._info.languageServiceHost.fileExists(fileName)) return null;
    const sdlContent = this._info.languageServiceHost.readFile(fileName, 'utf8');
    if (!sdlContent) return null;
    this._log('Read local extension schema: ' + fileName);
    try {
      const node = parse(sdlContent);
      this._parsedExtensionAstMap.set(fileName, node);
      this._graphqlErrorMap.delete(fileName);
    } catch (error) {
      if (error instanceof Error && error.name === 'GraphQLError') {
        const { message, locations } = error as any;
        this._log('Faild to parse: ' + fileName + ', ' + message);
        this._graphqlErrorMap.set(fileName, { message, fileName, locations });
      }
    }
  }

  getAbsoluteSchemaPath(projectRootPath: string, schemaPath: string) {
    if (path.isAbsolute(schemaPath)) return schemaPath;
    return path.resolve(projectRootPath, schemaPath);
  }

  private _getProjectRootPath(info: ts.server.PluginCreateInfo) {
    const { project } = info;
    if (typeof (project as any).getProjectRootPath === 'function') {
      return (project as any).getProjectRootPath();
    }
    return path.dirname(project.getProjectName());
  }

  private _log(msg: string) {
    this._info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  }
}

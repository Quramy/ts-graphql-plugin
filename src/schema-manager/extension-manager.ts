import path from 'path';
import { GraphQLSchema, parse, extendSchema, DocumentNode } from 'graphql';
import { SchemaBuildErrorInfo } from './schema-manager';
import { SchemaManagerHost } from './types';

export class ExtensionManager {
  private _targetSdlFileNames: string[];
  private _parsedExtensionAstMap = new Map<string, DocumentNode>();
  private _graphqlErrorMap = new Map<string, SchemaBuildErrorInfo>();

  constructor(private _host: SchemaManagerHost) {
    const { localSchemaExtensions } = this._host.getConfig();
    this._targetSdlFileNames = (localSchemaExtensions || []).map(filePath =>
      this._getAbsoluteSchemaPath(this._host.getProjectRootPath(), filePath),
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
      this._host.watchFile(
        fileName,
        () => {
          this._host.log('Changed local extension schema: ' + fileName);
          this._readExtension(fileName);
          cb();
        },
        interval,
      );
    });
  }

  private _readExtension(fileName: string) {
    if (!this._host.fileExists(fileName)) return null;
    const sdlContent = this._host.readFile(fileName, 'utf8');
    if (!sdlContent) return null;
    this._host.log('Read local extension schema: ' + fileName);
    try {
      const node = parse(sdlContent);
      this._parsedExtensionAstMap.set(fileName, node);
      this._graphqlErrorMap.delete(fileName);
    } catch (error) {
      if (error instanceof Error && error.name === 'GraphQLError') {
        const { message, locations } = error as any;
        this._host.log('Failed to parse: ' + fileName + ', ' + message);
        this._graphqlErrorMap.set(fileName, { message, fileName, locations });
      }
    }
  }

  private _getAbsoluteSchemaPath(projectRootPath: string, schemaPath: string) {
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
}

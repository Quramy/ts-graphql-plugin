import path from 'path';
import ts from 'typescript';
import { Analyzer } from './analyzer';
import { TsGraphQLPluginConfigOptions } from '../types';
import { SchemaManagerFactory } from '../schema-manager/schema-manager-factory';
import { SchemaManagerHost, SchemaConfig } from '../schema-manager/types';
import { ErrorWithoutLocation } from '../errors';
import { TypeGenAddonFactory } from '../typegen/addon/types';

const NO_PLUGCN_SETTING_ERROR_MESSAGE = `tsconfig.json should have ts-graphql-plugin setting. Add the following:
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "shema.graphql",   /* Path to your GraphQL schema */
        "tag": "gql"                 /* Template tag function name */
      }
    ]
  }`;

class TypegenAddonLoadError extends ErrorWithoutLocation {
  constructor(addonName: string) {
    const message = `Fail to load typegen add-on. Confirm "${addonName}" points correct add-on script.`;
    super(message);
  }
}

function loadAddonFactories(pluginConfig: TsGraphQLPluginConfigOptions, prjRootPath: string) {
  if (!pluginConfig.typegen?.addons || !Array.isArray(pluginConfig.typegen?.addons)) return [];
  const factories = pluginConfig.typegen.addons.map(addonName => {
    const addonPath =
      !path.isAbsolute(addonName) && addonName.startsWith('.')
        ? path.resolve(prjRootPath, addonName)
        : path.normalize(addonName);
    try {
      require.resolve(addonPath);
    } catch {
      throw new TypegenAddonLoadError(addonName);
    }
    return require(addonPath) as TypeGenAddonFactory;
  });
  return [...new Set(factories)];
}

export class ScriptHost implements ts.LanguageServiceHost {
  private readonly _fileMap = new Map<string, string>();
  private readonly _fileVersionMap = new Map<string, number>();

  constructor(private readonly _currentDirectory: string, private readonly _compilerOptions: ts.CompilerOptions) {}

  readFile(fileName: string) {
    const hit = this._fileMap.get(fileName);
    if (hit) return hit;
    return this.updateFile(fileName);
  }

  updateFile(fileName: string) {
    const content = ts.sys.readFile(fileName, 'uts8');
    if (content) this._fileMap.set(fileName, content);
    const currentVersion = this._fileVersionMap.get(fileName) || 0;
    this._fileVersionMap.set(fileName, currentVersion + 1);
    return content;
  }

  getCurrentDirectory() {
    return this._currentDirectory;
  }

  getScriptSnapshot(fileName: string) {
    const file = this._fileMap.get(fileName);
    if (!file) return;
    return ts.ScriptSnapshot.fromString(file);
  }

  getScriptVersion(fileName: string) {
    const version = this._fileVersionMap.get(fileName);
    if (!version) return '0';
    return version + '';
  }

  getScriptFileNames() {
    return [...this._fileMap.keys()];
  }

  getCompilationSettings() {
    return this._compilerOptions;
  }

  getDefaultLibFileName(opt: ts.CompilerOptions) {
    return ts.getDefaultLibFileName(opt);
  }
}

class SystemSchemaManagerHost implements SchemaManagerHost {
  constructor(
    private readonly _pluginConfig: TsGraphQLPluginConfigOptions,
    private readonly _prjRootPath: string,
    private readonly _debug: (msg: string) => void,
  ) {}

  log(msg: string): void {
    return this._debug(msg);
  }
  watchFile(path: string, cb: (fileName: string) => void, interval: number): { close(): void } {
    return ts.sys.watchFile!(path, cb, interval);
  }
  readFile(path: string, encoding?: string | undefined): string | undefined {
    return ts.sys.readFile(path, encoding);
  }
  fileExists(path: string): boolean {
    return ts.sys.fileExists(path);
  }
  getConfig(): SchemaConfig {
    return this._pluginConfig;
  }
  getProjectRootPath(): string {
    return this._prjRootPath;
  }
}

export class AnalyzerFactory {
  createAnalyzerAndScriptHostFromProjectPath(
    projectPath: string,
    debug: (msg: string) => void = () => {},
    currentDirectory = process.cwd(),
  ) {
    const { pluginConfigOptions, tsconfig, prjRootPath } = this._readTsconfig(projectPath);
    const scriptHost = new ScriptHost(currentDirectory, tsconfig.options);
    tsconfig.fileNames.forEach(fileName => scriptHost.readFile(fileName));
    const addonFactories = loadAddonFactories(pluginConfigOptions, prjRootPath);
    const pluginConfig = {
      ...pluginConfigOptions,
      typegen: {
        addonFactories,
      },
    };
    const schemaManagerHost = new SystemSchemaManagerHost(pluginConfig, prjRootPath, debug);
    const schemaManager = new SchemaManagerFactory(schemaManagerHost).create();
    const analyzer = new Analyzer(pluginConfig, prjRootPath, scriptHost, schemaManager, debug);
    return { analyzer, scriptHost };
  }

  createAnalyzerFromProjectPath(
    projectPath: string,
    debug: (msg: string) => void = () => {},
    currentDirectory = process.cwd(),
  ) {
    return this.createAnalyzerAndScriptHostFromProjectPath(projectPath, debug, currentDirectory).analyzer;
  }

  private _readTsconfig(project: string) {
    const currentDirectory = ts.sys.getCurrentDirectory();
    const ppath = path.isAbsolute(project) ? path.resolve(currentDirectory, project) : project;
    let configPath: string | undefined = undefined;
    if (ts.sys.fileExists(ppath)) {
      configPath = ppath;
    } else if (ts.sys.directoryExists(ppath) && ts.sys.fileExists(path.join(ppath, 'tsconfig.json'))) {
      configPath = path.join(ppath, 'tsconfig.json');
    }
    if (!configPath) {
      throw new Error(`tsconfig file not found: ${project}`);
    }
    const tsconfig = ts.getParsedCommandLineOfConfigFile(configPath, {}, ts.sys as any);
    if (!tsconfig) {
      throw new Error(`Failed to parse: ${configPath}`);
    }
    const prjRootPath = path.dirname(configPath);
    const plugins = tsconfig.options.plugins;
    if (!plugins || !Array.isArray(plugins)) {
      throw new Error(NO_PLUGCN_SETTING_ERROR_MESSAGE);
    }
    const found = (plugins as any[]).find((p: any) => (p._name || p.name) === 'ts-graphql-plugin');
    if (!found) {
      throw new Error(NO_PLUGCN_SETTING_ERROR_MESSAGE);
    }
    const pluginConfigOptions = found as TsGraphQLPluginConfigOptions;
    return {
      tsconfig,
      pluginConfigOptions,
      prjRootPath,
    };
  }
}

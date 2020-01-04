import path from 'path';
import ts from 'typescript';
import { Analyzer } from './analyzer';
import { TsGraphQLPluginConfigOptions } from '../types';

class ScriptHost implements ts.LanguageServiceHost {
  private readonly _fileMap = new Map<string, string>();

  constructor(private readonly _currentDirectory: string, private readonly _compilerOptions: ts.CompilerOptions) {}

  readFile(fileName: string) {
    const hit = this._fileMap.get(fileName);
    if (hit) return hit;
    const content = ts.sys.readFile(fileName, 'uts8');
    if (content) this._fileMap.set(fileName, content);
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

  getScriptVersion() {
    return '0';
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

export class AnalyzerFactory {
  createAnalyzerFromProjectPath(projectPath: string, currentDirectory = process.cwd()) {
    const { pluginConfig, tsconfig } = this._readTsconfig(projectPath);
    const scriptHost = new ScriptHost(currentDirectory, tsconfig.options);
    tsconfig.fileNames.forEach(fileName => scriptHost.readFile(fileName));
    return new Analyzer(pluginConfig, scriptHost);
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
    const plugins = tsconfig.options.plugins;
    if (!plugins || !Array.isArray(plugins)) {
      throw new Error(
        `tsconfig.json should have ts-graphql-plugin setting. Add the following:
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "path-to-graphql-schemafile"
      }
    ]
  }`,
      );
    }
    const found = (plugins as any[]).find((p: any) => p.name === 'ts-graphql-plugin');
    if (!found) {
      throw new Error(
        `tsconfig.json should have ts-graphql-plugin setting. Add the following:
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-graphql-plugin",
        "schema": "path-to-graphql-schemafile"
      }
    ]
  }`,
      );
    }
    const pluginConfig = found as TsGraphQLPluginConfigOptions;
    return {
      tsconfig,
      pluginConfig,
    };
  }
}

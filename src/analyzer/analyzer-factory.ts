import path from 'path';
import ts from 'typescript';
import { Analyzer } from './analyzer';
import { TsGraphQLPluginConfigOptions } from '../types';
import { ScriptHost } from '../ts-ast-util';
import { SchemaManagerFactory, createSchemaManagerHostFromTSGqlPluginConfig } from '../schema-manager';
import { ErrorWithoutLocation } from '../errors';
import { TypeGenAddonFactory } from '../typegen';

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
    const schemaManagerHost = createSchemaManagerHostFromTSGqlPluginConfig(pluginConfig, prjRootPath, debug);
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

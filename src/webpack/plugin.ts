import path from 'path';
import { Compiler } from 'webpack';
import { TransformerHost, GetTransformerOptions } from '../transformer';

type WatchFileSystemCompiler = Compiler & {
  watchFileSystem: {
    watcher: {
      mtimes?: { [name: string]: number };
    };
    wfs: {
      watcher: {
        mtimes?: { [name: string]: number };
      };
    };
  };
};

const PLUGIN_NAME = 'ts-graphql-plugin';

export class WebpackPlugin {
  private readonly _host: TransformerHost;
  private _disabled = false;

  constructor({ tsconfigPath = process.cwd() }: { tsconfigPath?: string } = {}) {
    this._host = new TransformerHost({ projectPath: tsconfigPath });
  }

  getTransformer(options?: GetTransformerOptions) {
    return this._host.getTransformer({ ...options, getEnabled: () => !this._disabled });
  }

  apply(compiler: WatchFileSystemCompiler) {
    compiler.hooks.afterPlugins.tap(PLUGIN_NAME, () => this._host.loadProject());
    compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {
      this._disabled = compiler.options.mode === 'development';
      const watcher = compiler.watchFileSystem.watcher || compiler.watchFileSystem.wfs.watcher;
      const changedFiles = compiler.modifiedFiles
        ? [...compiler.modifiedFiles.keys()]
        : Object.keys(watcher.mtimes ?? []); // webpack v4 does not expose modifiedFiles. So we access to changed files with some hacks.
      const changedSourceFileNames = changedFiles.filter(f => path.extname(f) === '.ts' || path.extname(f) === '.tsx');
      this._host.updateFiles(changedSourceFileNames);
    });
  }
}

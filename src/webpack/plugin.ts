import path from 'path';
import { Compiler } from 'webpack';
import { TransformServer, GetTransformerOptions } from '../transformer/transform-server';

type WatchFileSystemCompiler = Compiler & {
  watchFileSystem: {
    watcher: {
      mtimes: { [name: string]: number };
    };
    wfs: {
      watcher: {
        mtimes: { [name: string]: number };
      };
    };
  };
};

const PLUGIN_NAME = 'ts-graphql-plugin';

export class WebpackPlugin {
  private readonly _transformServer: TransformServer;

  constructor({ tsconfigPath = process.cwd() }: { tsconfigPath?: string } = {}) {
    this._transformServer = new TransformServer({ projectPath: tsconfigPath });
  }

  getTransformer(options?: GetTransformerOptions) {
    return this._transformServer.getTransformer(options);
  }

  apply(compiler: WatchFileSystemCompiler) {
    compiler.hooks.afterPlugins.tap(PLUGIN_NAME, () => this._transformServer.loadProject());

    compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {
      const watcher = compiler.watchFileSystem.watcher || compiler.watchFileSystem.wfs.watcher;
      const changedFiles = Object.keys(watcher.mtimes);
      const changedSourceFileNames = changedFiles.filter(f => path.extname(f) === '.ts' || path.extname(f) === '.tsx');
      this._transformServer.updateFiles(changedSourceFileNames);
    });
  }
}

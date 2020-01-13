import path from 'path';
import { Compiler } from 'webpack';
import { TransformerHost, GetTransformerOptions } from '../transformer/transformer-host';

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

export class WebpackPlugin {
  private readonly _transformerHost: TransformerHost;

  constructor({ tsconfig = process.cwd() }: { tsconfig?: string } = {}) {
    this._transformerHost = new TransformerHost({ projectPath: tsconfig });
  }

  getTransformer(options?: GetTransformerOptions) {
    return this._transformerHost.getTransformer(options);
  }

  apply(compiler: WatchFileSystemCompiler) {
    compiler.hooks.afterPlugins.tap('ts-graphql-plugin', () => {
      this._transformerHost.loadProject();
    });

    compiler.hooks.watchRun.tap('ts-graphql-plugin', () => {
      const watcher = compiler.watchFileSystem.watcher || compiler.watchFileSystem.wfs.watcher;
      const changedFiles = Object.keys(watcher.mtimes);
      const changedSourceFileNames = changedFiles.filter(f => path.extname(f) === '.ts' || path.extname(f) === '.tsx');
      this._transformerHost.updateFiles(changedSourceFileNames);
    });
  }
}

import * as ts from 'typescript/lib/tsserverlibrary';
import { GraphQLSchema } from 'graphql';

export type OnChangeCallback = (schema: any) => void;

export abstract class SchemaManager {
  private _onChanges: OnChangeCallback[];

  constructor(protected _info: ts.server.PluginCreateInfo) {
    this._onChanges = [];
  }

  abstract getSchema(): GraphQLSchema | null;
  abstract startWatch(interval?: number): void;

  registerOnChange(cb: OnChangeCallback) {
    this._onChanges.push(cb);
    return () => {
      this._onChanges = this._onChanges.filter(x => x !== cb);
    };
  }

  protected emitChange() {
    const data = this.getSchema();
    if (!data) return;
    this._onChanges.forEach(cb => cb(data));
  }

  protected log(msg: string) {
    this._info.project.projectService.logger.info(`[ts-graphql-plugin] ${msg}`);
  }
}

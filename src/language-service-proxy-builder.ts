import * as ts from 'typescript/lib/tsserverlibrary';

export type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
  = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export class LanguageServiceProxyBuilder {

  private _wrappers = [];

  constructor(private _info: ts.server.PluginCreateInfo) { }

  wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
    this._wrappers.push({ name, wrapper });
    return this;
  }

  build() {
    const ret = this._info.languageService;
    this._wrappers.forEach(({ name, wrapper }) => {
      ret[name] = wrapper(this._info.languageService[name], this._info);
    });
    return ret;
  }
}

import ts from 'typescript/lib/tsserverlibrary';

export type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService> = (
  delegate: ts.LanguageService[K],
  info?: ts.server.PluginCreateInfo,
) => ts.LanguageService[K];

export class LanguageServiceProxyBuilder {
  private _wrappers: any[] = [];

  constructor(private _info: ts.server.PluginCreateInfo) {}

  wrap<K extends keyof ts.LanguageService, Q extends LanguageServiceMethodWrapper<K>>(name: K, wrapper: Q) {
    this._wrappers.push({ name, wrapper });
    return this;
  }

  build(): ts.LanguageService {
    const ret = this._info.languageService;
    this._wrappers.forEach(({ name, wrapper }) => {
      (ret as any)[name] = wrapper(this._info.languageService[name as keyof ts.LanguageService], this._info);
    });
    return ret;
  }
}

import fs from 'fs';

export function registerTypeScript() {
  let defaultCompileOptions: ts.CompilerOptions;
  require.extensions['.ts'] = (module, fileName) => {
    const ts = require('typescript') as typeof import('typescript');
    if (!defaultCompileOptions) {
      defaultCompileOptions = ts.getDefaultCompilerOptions();
    }
    const content = fs.readFileSync(fileName, 'utf8');
    const { outputText } = ts.transpileModule(content, {
      fileName,
      compilerOptions: {
        ...defaultCompileOptions,
        noEmit: true,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2019,
        module: ts.ModuleKind.CommonJS,
      },
      reportDiagnostics: false,
    });
    (module as any)._compile(outputText, fileName);
  };
}

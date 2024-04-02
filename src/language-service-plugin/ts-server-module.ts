import type ts from 'typescript/lib/tsserverlibrary';

let _module: typeof ts;

export function setModule(typescript: typeof ts) {
  _module = typescript;
}

export function getModule() {
  return _module;
}

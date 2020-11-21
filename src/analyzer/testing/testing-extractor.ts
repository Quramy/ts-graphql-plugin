import { Extractor } from '../extractor';
import { createTestingLanguageServiceAndHost } from '../../ts-ast-util/testing/testing-language-service';
import { createScriptSourceHelper } from '../../ts-ast-util';

export function createTesintExtractor(
  files: { fileName: string; content: string }[],
  removeDuplicatedFragments = false,
) {
  const { languageService, languageServiceHost } = createTestingLanguageServiceAndHost({ files });
  const extractor = new Extractor({
    removeDuplicatedFragments,
    scriptSourceHelper: createScriptSourceHelper({ languageService, languageServiceHost }),
    debug: () => {},
  });
  return extractor;
}

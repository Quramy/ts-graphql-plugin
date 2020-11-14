import ts from 'typescript';
import { createSourceWriteHelper, Helper } from './source-write-helper';

describe(createSourceWriteHelper, () => {
  describe(Helper.prototype.pushStatement, () => {
    it('should push statement', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      helper.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      expect(helper.getStatements().length).toBe(1);
    });
  });

  describe(Helper.prototype.pushImportDeclaration, () => {
    it('should add statement at first when the helpper has no import statement', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      helper.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      helper.pushImportDeclaration(
        ts.createImportDeclaration(undefined, undefined, undefined, ts.createStringLiteral('typescript')),
      );
      expect(helper.toFileContent().content).toMatchSnapshot();
    });

    it('should add statement at next the last import declaration', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      helper.pushStatement(
        ts.createImportDeclaration(undefined, undefined, undefined, ts.createStringLiteral('graphql')),
      );
      helper.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      helper.pushImportDeclaration(
        ts.createImportDeclaration(undefined, undefined, undefined, ts.createStringLiteral('typescript')),
      );
      expect(helper.toFileContent().content).toMatchSnapshot();
    });
  });

  describe(Helper.prototype.writeLeadingComment, () => {
    it('should comment at the top of file', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      helper.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      helper.writeLeadingComment('foo');
      helper.writeLeadingComment('bar');
      expect(helper.toFileContent().content).toMatchSnapshot();
    });

    it('should comment when helper has no statement', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      helper.writeLeadingComment('foo');
      helper.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      expect(helper.toFileContent().content).toMatchSnapshot();
    });
  });
});

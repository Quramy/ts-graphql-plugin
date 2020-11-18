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
  describe(Helper.prototype.replaceStatement, () => {
    it('should replace exsiting statement to new statement', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      const newSt = ts.createExpressionStatement(ts.createIdentifier('foo'));
      helper.pushStatement(st);
      expect(helper.replaceStatement(st, newSt)).toBeTruthy();
      expect(helper.toFileContent().content.trim()).toBe('foo;');
    });

    it('should return false when the statement is not foundt', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      const newSt = ts.createExpressionStatement(ts.createIdentifier('foo'));
      const st2 = ts.createExpressionStatement(ts.createIdentifier('bar'));
      helper.pushStatement(st2);
      expect(helper.replaceStatement(st, newSt)).toBeFalsy();
      expect(helper.toFileContent().content.trim()).toBe('bar;');
    });
  });

  describe(Helper.prototype.removeStatement, () => {
    it('should remove exsiting statement', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      helper.pushStatement(st);
      expect(helper.removeStatement(st)).toBeTruthy();
      expect(helper.getStatements().length).toBe(0);
    });

    it('should return false when the statement is not found ', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      helper.pushStatement(st);
      const st2 = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      expect(helper.removeStatement(st2)).toBeFalsy();
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

  describe(Helper.prototype.pushNamedImportIfNeeded, () => {
    it('should not add import statement when the same statement exists', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      expect(helper.pushNamedImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(helper.pushNamedImportIfNeeded('Hoge', './foo')).toBeFalsy();
      expect(helper.getStatements().length).toBe(1);
      expect(helper.toFileContent().content).toMatchSnapshot();
    });

    it('should add import specifier if named import statement for same module already exists', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      expect(helper.pushNamedImportIfNeeded('Foo', './foo')).toBeTruthy();
      expect(helper.pushNamedImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(helper.getStatements().length).toBe(1);
      expect(helper.toFileContent().content).toMatchSnapshot();
    });
  });

  describe(Helper.prototype.pushDefaultImportIfNeeded, () => {
    it('should not add import statement when the same statement exists', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      expect(helper.pushDefaultImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(helper.pushDefaultImportIfNeeded('Hoge', './foo')).toBeFalsy();
      expect(helper.getStatements().length).toBe(1);
      expect(helper.toFileContent().content).toMatchSnapshot();
    });

    it('should add import specifier if named import statement for same module already exists', () => {
      const helper = createSourceWriteHelper({ outputFileName: 'out.ts' });
      expect(helper.pushNamedImportIfNeeded('Foo', './foo')).toBeTruthy();
      expect(helper.pushDefaultImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(helper.getStatements().length).toBe(1);
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

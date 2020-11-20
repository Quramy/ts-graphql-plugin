import ts from 'typescript';
import { createOutputSource, DefaultOutputSource } from './output-source';

describe(createOutputSource, () => {
  describe(DefaultOutputSource.prototype.pushStatement, () => {
    it('should push statement', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      outputSource.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      expect(outputSource.getStatements().length).toBe(1);
    });
  });
  describe(DefaultOutputSource.prototype.replaceStatement, () => {
    it('should replace exsiting statement to new statement', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      const newSt = ts.createExpressionStatement(ts.createIdentifier('foo'));
      outputSource.pushStatement(st);
      expect(outputSource.replaceStatement(st, newSt)).toBeTruthy();
      expect(outputSource.toFileContent().content.trim()).toBe('foo;');
    });

    it('should return false when the statement is not foundt', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      const newSt = ts.createExpressionStatement(ts.createIdentifier('foo'));
      const st2 = ts.createExpressionStatement(ts.createIdentifier('bar'));
      outputSource.pushStatement(st2);
      expect(outputSource.replaceStatement(st, newSt)).toBeFalsy();
      expect(outputSource.toFileContent().content.trim()).toBe('bar;');
    });
  });

  describe(DefaultOutputSource.prototype.removeStatement, () => {
    it('should remove exsiting statement', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      outputSource.pushStatement(st);
      expect(outputSource.removeStatement(st)).toBeTruthy();
      expect(outputSource.getStatements().length).toBe(0);
    });

    it('should return false when the statement is not found ', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      const st = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      outputSource.pushStatement(st);
      const st2 = ts.createExpressionStatement(ts.createIdentifier('hoge'));
      expect(outputSource.removeStatement(st2)).toBeFalsy();
      expect(outputSource.getStatements().length).toBe(1);
    });
  });

  describe(DefaultOutputSource.prototype.pushImportDeclaration, () => {
    it('should add statement at first when the helpper has no import statement', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      outputSource.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      outputSource.pushImportDeclaration(
        ts.createImportDeclaration(undefined, undefined, undefined, ts.createStringLiteral('typescript')),
      );
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });

    it('should add statement at next the last import declaration', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      outputSource.pushStatement(
        ts.createImportDeclaration(undefined, undefined, undefined, ts.createStringLiteral('graphql')),
      );
      outputSource.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      outputSource.pushImportDeclaration(
        ts.createImportDeclaration(undefined, undefined, undefined, ts.createStringLiteral('typescript')),
      );
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });
  });

  describe(DefaultOutputSource.prototype.pushNamedImportIfNeeded, () => {
    it('should not add import statement when the same statement exists', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      expect(outputSource.pushNamedImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(outputSource.pushNamedImportIfNeeded('Hoge', './foo')).toBeFalsy();
      expect(outputSource.getStatements().length).toBe(1);
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });

    it('should add import specifier if named import statement for same module already exists', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      expect(outputSource.pushNamedImportIfNeeded('Foo', './foo')).toBeTruthy();
      expect(outputSource.pushNamedImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(outputSource.getStatements().length).toBe(1);
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });
  });

  describe(DefaultOutputSource.prototype.pushDefaultImportIfNeeded, () => {
    it('should not add import statement when the same statement exists', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      expect(outputSource.pushDefaultImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(outputSource.pushDefaultImportIfNeeded('Hoge', './foo')).toBeFalsy();
      expect(outputSource.getStatements().length).toBe(1);
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });

    it('should add import specifier if named import statement for same module already exists', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      expect(outputSource.pushNamedImportIfNeeded('Foo', './foo')).toBeTruthy();
      expect(outputSource.pushDefaultImportIfNeeded('Hoge', './foo')).toBeTruthy();
      expect(outputSource.getStatements().length).toBe(1);
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });
  });

  describe(DefaultOutputSource.prototype.writeLeadingComment, () => {
    it('should comment at the top of file', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      outputSource.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      outputSource.writeLeadingComment('foo');
      outputSource.writeLeadingComment('bar');
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });

    it('should comment when outputSource has no statement', () => {
      const outputSource = createOutputSource({ outputFileName: 'out.ts' });
      outputSource.writeLeadingComment('foo');
      outputSource.pushStatement(ts.createExpressionStatement(ts.createIdentifier('hoge')));
      expect(outputSource.toFileContent().content).toMatchSnapshot();
    });
  });
});

import path from 'path';
import { AnalyzerFactory } from './analyzer-factory';
import { Analyzer } from './analyzer';

describe(AnalyzerFactory, () => {
  describe(AnalyzerFactory.prototype.createAnalyzerFromProjectPath, () => {
    it('should create analyzer instance from existing typescript project directory path', () => {
      const analyzer = new AnalyzerFactory().createAnalyzerFromProjectPath(
        path.resolve(__dirname, '../../project-fixtures/react-apollo-prj'),
      );
      expect(analyzer instanceof Analyzer).toBeTruthy();
    });

    it('should create analyzer instance from existing typescript project config file name', () => {
      const analyzer = new AnalyzerFactory().createAnalyzerFromProjectPath(
        path.resolve(__dirname, '../../project-fixtures/react-apollo-prj/tsconfig.json'),
      );
      expect(analyzer instanceof Analyzer).toBeTruthy();
    });

    it('should throw an error when not exsisting config path', () => {
      expect(() => new AnalyzerFactory().createAnalyzerFromProjectPath('NOT_EXISTING_PRJ')).toThrowError();
    });

    it('should throw an error when project dir does not have tsconfig.json', () => {
      expect(() =>
        new AnalyzerFactory().createAnalyzerFromProjectPath(
          path.resolve(__dirname, '../../project-fixtures/no-config-prj'),
        ),
      ).toThrowError();
    });

    it('should throw an error when config is written in invalid format', () => {
      expect(() =>
        new AnalyzerFactory().createAnalyzerFromProjectPath(
          path.resolve(__dirname, '../../project-fixtures/simple-prj/tsconfig.invalid.json'),
        ),
      ).toThrowError();
    });

    it('should throw an error when config has no plugins field', () => {
      expect(() =>
        new AnalyzerFactory().createAnalyzerFromProjectPath(
          path.resolve(__dirname, '../../project-fixtures/simple-prj/tsconfig.noplugin.json'),
        ),
      ).toThrowError();
    });

    it('should throw an error when config.plugins has no ts-graphql-plugin object', () => {
      expect(() =>
        new AnalyzerFactory().createAnalyzerFromProjectPath(
          path.resolve(__dirname, '../../project-fixtures/simple-prj/tsconfig.notsgqlplugin.json'),
        ),
      ).toThrowError();
    });

    it('should throw an error when config.plugins.typegen.addons includes invalid modules', () => {
      expect(() =>
        new AnalyzerFactory().createAnalyzerFromProjectPath(
          path.resolve(__dirname, '../../project-fixtures/simple-prj/tsconfig.invalid-addon.json'),
        ),
      ).toThrowError();
    });
  });
});

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
  });
});

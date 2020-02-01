import { CommandOptions } from '../parser';
import { ConsoleLogger } from '../logger';

export const cliDefinition = {
  description: 'Generate TypeScript types from GraphQL operations or fragments in your .ts source files.',
  options: {
    project: {
      alias: 'p',
      description:
        "Analyze the project given the path to its configuration file, or to a folder with a 'tsconfig.json'.",
      defaultValue: '.',
      type: 'string',
    },
    verbose: {
      description: 'Show debug messages.',
      type: 'boolean',
    },
  },
} as const;

export async function typegenCommand({ options }: CommandOptions<typeof cliDefinition>) {
  const ts = require('typescript') as typeof import('typescript');
  const {
    AnalyzerFactory,
  } = require('../../analyzer/analyzer-factory') as typeof import('../../analyzer/analyzer-factory');
  const { ErrorReporter } = require('../error-reporter') as typeof import('../error-reporter');
  const { color } = require('../../string-util') as typeof import('../../string-util');

  const logger = new ConsoleLogger(options.verbose ? 'debug' : 'info');
  const { project } = options;
  const errorReporter = new ErrorReporter(process.cwd(), logger.error.bind(logger));
  const analyzer = new AnalyzerFactory().createAnalyzerFromProjectPath(project, logger.debug.bind(logger));
  const { errors, outputSourceFiles } = await analyzer.typegen();
  if (errors.length) {
    logger.error(`Found ${color.red(errors.length + '')} errors generating type files.\n`);
    errors.forEach(error => errorReporter.outputError(error));
  }
  if (!outputSourceFiles || outputSourceFiles.length === 0) {
    logger.error('No type files to generate.');
    return false;
  }
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
  outputSourceFiles.forEach(source => ts.sys.writeFile(source.fileName, printer.printFile(source)));
  logger.info(`Write ${color.green(outputSourceFiles.length + ' type files')}.`);
  return true;
}

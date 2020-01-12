import { CommandOptions } from '../parser';
import { ConsoleLogger } from '../logger';

export const cliDefinition = {
  description: 'Validate GraphQL documents in your TypeScript sources.',
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

export async function validateCommand({ options }: CommandOptions<typeof cliDefinition>) {
  const {
    AnalyzerFactory,
  } = require('../../analyzer/analyzer-factory') as typeof import('../../analyzer/analyzer-factory');
  const { ErrorReporter } = require('../error-reporter') as typeof import('../error-reporter');
  const { color } = require('../../string-util') as typeof import('../../string-util');

  const logger = new ConsoleLogger(options.verbose ? 'debug' : 'info');
  const errorReporter = new ErrorReporter(process.cwd(), logger.error.bind(logger));
  const analyzer = new AnalyzerFactory().createAnalyzerFromProjectPath(options.project, logger.debug.bind(logger));
  const { errors } = await analyzer.validate();
  const errorErrors = errors.filter(e => e.severity === 'Error');
  const warnErrors = errors.filter(e => e.severity === 'Warn');
  if (errorErrors.length) {
    logger.error(`Found ${color.red(errorErrors.length + '')} errors:`);
    errorErrors.forEach(errorReporter.indicateErrorWithLocation.bind(errorReporter));
  }
  if (warnErrors.length) {
    logger.error(`Found ${color.yellow(warnErrors.length + '')} warnings:`);
    warnErrors.forEach(errorReporter.indicateErrorWithLocation.bind(errorReporter));
  }
  if (errors.length) return false;
  logger.info(color.green('No GraphQL validation errors.'));
  return true;
}

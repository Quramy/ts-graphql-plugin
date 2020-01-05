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
  if (errors.length) {
    logger.error(`Found ${color.red(errors.length + '')} errors:`);
    errors.forEach(errorReporter.indicateErrorWithLocation.bind(errorReporter));
    return false;
  } else {
    logger.info(color.green('No GraphQL validation errors.'));
    return true;
  }
}

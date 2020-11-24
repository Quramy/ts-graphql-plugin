import path from 'path';
import { CommandOptions } from '../parser';
import { ConsoleLogger } from '../logger';

export const cliDefinition = {
  description: 'Output GraphQL operations in your TypeScript sources to markdown file.',
  options: {
    project: {
      alias: 'p',
      description:
        "Analyze the project given the path to its configuration file, or to a folder with a 'tsconfig.json'.",
      defaultValue: '.',
      type: 'string',
    },
    outFile: {
      alias: 'o',
      description: 'Output Markdown file name.',
      defaultValue: 'GRAPHQL_OPERATIONS.md',
      type: 'string',
    },
    fromManifest: {
      alias: 'M',
      description: 'Path to manifest.json file.',
      type: 'string',
    },
    includeFragments: {
      description: 'If set, report including fragment informations.',
      type: 'boolean',
    },
    verbose: {
      description: 'Show debug messages.',
      type: 'boolean',
    },
  },
} as const;

export async function reportCommand({ options }: CommandOptions<typeof cliDefinition>) {
  const ts = require('typescript') as typeof import('typescript');
  const { AnalyzerFactory } = require('../../analyzer') as typeof import('../../analyzer');
  const { ErrorReporter } = require('../../errors/error-reporter') as typeof import('../../errors');
  const { color } = require('../../string-util') as typeof import('../../string-util');

  const logger = new ConsoleLogger(options.verbose ? 'debug' : 'info');
  const { fromManifest, outFile, project, includeFragments } = options;
  const errorReporter = new ErrorReporter(process.cwd(), logger.error.bind(logger));
  const analyzer = new AnalyzerFactory().createAnalyzerFromProjectPath(project, logger.debug.bind(logger));
  const manifest = fromManifest ? JSON.parse(ts.sys.readFile(fromManifest, 'utf8') || '') : undefined;
  let outFileName = path.isAbsolute(outFile) ? outFile : path.resolve(process.cwd(), outFile);
  outFileName = ts.sys.directoryExists(outFileName) ? path.join(outFileName, 'GRAPHQL_OPERATIONS.md') : outFileName;
  const [errors, markdown] = await analyzer.report(outFileName, manifest, !includeFragments);
  errors.forEach(errorReporter.outputError.bind(errorReporter));
  if (errors.length) {
    logger.error(color.magenta('Found some errors extracting operations.\n'));
    errors.forEach(error => errorReporter.outputError(error));
  }
  if (!markdown) {
    logger.error('No GraphQL operations.');
    return false;
  }
  ts.sys.writeFile(outFileName, markdown);
  logger.info(`Write report file to '${color.green(path.relative(process.cwd(), outFileName))}'.`);
  return true;
}

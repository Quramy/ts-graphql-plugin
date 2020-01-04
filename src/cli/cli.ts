#!/usr/bin/env node

import { createParser } from './parser';
import { cliDefinition as extractOptions, extractCommand } from './commands/extract';
import { ConsoleLogger } from './logger';

function main() {
  const parser = createParser({
    options: {
      help: {
        alias: 'h',
        description: 'Print this message.',
        type: 'boolean',
      },
      version: {
        alias: 'v',
        description: 'Print version.',
        type: 'boolean',
      },
    },
    commands: {
      extract: extractOptions,
      // validate: {
      //   description: '',
      //   options: {
      //     verbose: {
      //       description: 'Show debug messages.',
      //       type: 'boolean',
      //     },
      //   },
      // },
    },
  });

  const logger = new ConsoleLogger();

  const args = parser.parse();

  if (!args.command) {
    if (args.options.help) {
      parser.showHelp();
      process.exit(0);
    }
    if (args.options.version) {
      logger.info(require('../../package.json').version);
      process.exit(0);
    }
    parser.showHelp();
    process.exit(1);
  } else {
    if (args.options.help) {
      parser.showCommandHelp(Object.keys(args.command)[0]);
      process.exit(0);
    }
  }

  try {
    if (args.command.extract) {
      extractCommand(args.command.extract);
    }
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}

main();

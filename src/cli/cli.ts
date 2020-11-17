#!/usr/bin/env node

import { registerTypeScript } from '../register-hooks';
import { createParser } from './parser';
import { cliDefinition as typegenOptions, typegenCommand } from './commands/typegen';
import { cliDefinition as extractOptions, extractCommand } from './commands/extract';
import { cliDefinition as validateOptions, validateCommand } from './commands/validate';
import { cliDefinition as reportOptions, reportCommand } from './commands/report';
import { ConsoleLogger } from './logger';

async function main() {
  const logger = new ConsoleLogger();
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
      typegen: typegenOptions,
      extract: extractOptions,
      validate: validateOptions,
      report: reportOptions,
    },
    logger,
  });

  const cli = parser.parse();

  if (cli.errors) {
    if (cli.errors.unknownCommand) {
      logger.error(
        `Unknown command name: ${cli.errors.unknownCommand}. Available commands are: ${cli
          .availableCommandNames()
          .join(', ')} .`,
      );
    }
    process.exit(1);
  }

  if (!cli.command) {
    if (cli.options.help) {
      cli.showHelp();
      process.exit(0);
    }
    if (cli.options.version) {
      logger.info(require('../../package.json').version);
      process.exit(0);
    }
    cli.showHelp();
    process.exit(1);
  } else {
    if (cli.options.help) {
      cli.showCommandHelp(Object.keys(cli.command)[0]);
      process.exit(0);
    }
  }

  let result: boolean = false;
  try {
    registerTypeScript();
    if (cli.command.typegen) {
      result = await typegenCommand(cli.command.typegen);
    } else if (cli.command.extract) {
      result = await extractCommand(cli.command.extract);
    } else if (cli.command.validate) {
      result = await validateCommand(cli.command.validate);
    } else if (cli.command.report) {
      result = await reportCommand(cli.command.report);
    }
    process.exit(result ? 0 : 1);
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}

main();

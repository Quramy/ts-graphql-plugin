import { createParser } from './parser';
import { Logger } from './logger';

class StringLogger implements Logger {
  private _log: string[] = [];
  error(): void {
    throw new Error('Method not implemented.');
  }
  info(...args: string[]): void {
    this._log.push(args.join(', '));
  }
  debug(): void {
    throw new Error('Method not implemented.');
  }
  print() {
    return this._log.join('\n');
  }
}

describe('CLI parser result', () => {
  it('should parse boolean options', () => {
    const parser = createParser({
      options: {
        opt: {
          type: 'boolean',
        },
      },
      commands: {},
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql']).options.opt).toBe(false);
    expect(parser.parse(['', 'tsgql', '--opt']).options.opt).toBe(true);
    expect(parser.parse(['', 'tsgql', '--opt=hoge']).options.opt).toBe(true);
  });

  it('should parse string options', () => {
    const parser = createParser({
      options: {
        opt: {
          type: 'string',
        },
      },
      commands: {},
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql']).options.opt).toBe('');
    expect(parser.parse(['', 'tsgql', '--opt', 'hoge']).options.opt).toBe('hoge');
    expect(parser.parse(['', 'tsgql', '--opt=hoge']).options.opt).toBe('hoge');
  });

  it('should parse string options with default value', () => {
    const parser = createParser({
      options: {
        opt: {
          type: 'string',
          defaultValue: 'foo',
        },
      },
      commands: {},
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql']).options.opt).toBe('foo');
    expect(parser.parse(['', 'tsgql', '--opt', 'hoge']).options.opt).toBe('hoge');
    expect(parser.parse(['', 'tsgql', '--opt=hoge']).options.opt).toBe('hoge');
  });

  it('should parse int options', () => {
    const parser = createParser({
      options: {
        opt: {
          type: 'int',
        },
      },
      commands: {},
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql']).options.opt).toBe(0);
    expect(parser.parse(['', 'tsgql', '--opt', '100']).options.opt).toBe(100);
    expect(parser.parse(['', 'tsgql', '--opt=100']).options.opt).toBe(100);
  });

  it('should parse short options', () => {
    const parser = createParser({
      options: {
        opt: {
          alias: 'o',
          type: 'boolean',
        },
      },
      commands: {},
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql', '-o']).options.opt).toBe(true);
  });

  it('should provide available commands name', () => {
    const parser = createParser({
      options: {},
      commands: {
        hoge: {
          description: '',
          options: {},
        },
        foo: {
          description: '',
          options: {},
        },
      },
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql']).availableCommandNames()).toStrictEqual(['hoge', 'foo']);
  });

  it('should store given command name if it is not configured', () => {
    const parser = createParser({
      options: {},
      commands: {
        hoge: {
          description: '',
          options: {},
        },
      },
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql', 'piyo']).errors!.unknownCommand).toStrictEqual('piyo');
  });

  it('should provide command options', () => {
    const parser = createParser({
      options: {},
      commands: {
        hoge: {
          description: '',
          options: {
            opt: {
              type: 'boolean',
            },
          },
        },
      },
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql', 'hoge']).command!.hoge!.options.opt).toBe(false);
    expect(parser.parse(['', 'tsgql', 'hoge', '--opt']).command!.hoge!.options.opt).toBe(true);
  });

  it('should provide command arguments', () => {
    const parser = createParser({
      options: {},
      commands: {
        hoge: {
          description: '',
          options: {},
        },
      },
      logger: new StringLogger(),
    });
    expect(parser.parse(['', 'tsgql', 'hoge', 'foo', 'piyo']).command!.hoge!._).toStrictEqual(['foo', 'piyo']);
  });

  it('should show global help', () => {
    const logger = new StringLogger();
    const parser = createParser({
      options: {
        version: {
          alias: '-v',
          description: 'Print version',
          type: 'boolean',
        },
      },
      commands: {
        typegen: {
          description: '',
          options: {},
        },
      },
      logger,
    });
    parser.parse(['', 'tsgql']).showHelp();
    expect(logger.print()).toMatchSnapshot();
  });

  it('should show command help', () => {
    const logger = new StringLogger();
    const parser = createParser({
      options: {},
      commands: {
        typegen: {
          description: 'Generate type files.',
          options: {
            project: {
              alias: 'p',
              type: 'string',
              description: 'Path to tsconfig.json.',
            },
          },
        },
      },
      logger,
    });
    parser.parse(['', 'tsgql']).showCommandHelp('typegen');
    expect(logger.print()).toMatchSnapshot();
  });
});

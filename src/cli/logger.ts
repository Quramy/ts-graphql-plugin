export interface Logger {
  debug(...args: string[]): void;
  info(...args: string[]): void;
  error(...args: any[]): void;
}

export type LogLevel = 'silent' | 'error' | 'info' | 'debug';

export class ConsoleLogger implements Logger {
  constructor(public logLevel: LogLevel = 'info') {}

  /* eslint-disable no-console */
  error(...args: any[]): void {
    if (this.logLevel !== 'silent') {
      console.error(...args);
    }
  }
  info(...args: string[]): void {
    if (this.logLevel !== 'silent' && this.logLevel !== 'error') {
      console.log(...args);
    }
  }
  debug(...args: string[]): void {
    if (this.logLevel === 'debug') {
      console.log(...args);
    }
  }
  /* eslint-enable no-console */
}

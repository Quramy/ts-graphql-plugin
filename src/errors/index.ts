export { ErrorReporter } from './error-reporter';

export type ErrorRange = {
  fileName: string;
  start: number;
  end: number;
};

export type Severity = 'Error' | 'Warn';

export type ErrorContent = ErrorRange & {
  severity?: Severity;
  content: string;
};

export class ErrorWithLocation extends Error {
  readonly name = 'ErrorWithLocation';
  readonly severity: Severity = 'Error';

  constructor(public readonly message: string, public readonly errorContent: ErrorContent) {
    super(message);
    if (errorContent.severity) {
      this.severity = errorContent.severity;
    }
  }
}

export class ErrorWithoutLocation extends Error {
  readonly name = 'ErrorWithoutLocation';
  constructor(public readonly message: string, public readonly severity: Severity = 'Error') {
    super(message);
  }
}

export type TsGqlError = ErrorWithLocation | ErrorWithoutLocation;

export const ERROR_CODES = {
  graphqlLangServiceError: {
    code: 51001,
  },
  templateIsTooComplex: {
    code: 51010,
    message: 'This operation or fragment has too complex interpolation to analyze.',
  },
  errorInOtherInterpolation: {
    code: 51011,
    message: 'This expression has some GraphQL errors.',
  },
  schemaBuildError: {
    code: 51020,
  },
};

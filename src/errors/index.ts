export type ErrorRange = {
  fileName: string;
  start: number;
  end: number;
};

export type ErrorContent = ErrorRange & {
  content: string;
};

export class ErrorWithLocation extends Error {
  readonly name = 'ErrorWithLocation';

  constructor(public readonly message: string, public readonly errorContent: ErrorContent) {
    super(message);
  }
}

export const ERRORS = {
  graphqlLangServiceError: {
    code: 51001,
  },
  templateIsTooComplex: {
    code: 51010,
    message: 'This operation or fragment has too complex interpolation to analize.',
  },
  errorInOtherInterpolation: {
    code: 51011,
    message: 'This expression has some GraphQL errors.',
  },
  schemaBuildError: {
    code: 51020,
  },
};

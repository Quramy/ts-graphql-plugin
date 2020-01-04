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

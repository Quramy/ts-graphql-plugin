import path from 'path';
import { ErrorWithLocation } from '../errors';
import { pos2location, pad, color } from '../string-util';

export class ErrorReporter {
  constructor(private readonly _currentDirectory: string, private readonly _output: (msg: string) => void = () => {}) {}

  indicateErrorWithLocation(error: ErrorWithLocation) {
    const {
      message,
      errorContent: { content, start, end, fileName },
    } = error;
    const startLC = pos2location(content, start);
    const endLC = pos2location(content, end);
    const relativeContentPath = path.isAbsolute(fileName) ? path.relative(this._currentDirectory, fileName) : fileName;
    const fileIndicator = `${relativeContentPath}:${startLC.line + 1}:${startLC.character + 1}`;
    const outputs = [`${color.thin(fileIndicator)} - ${message}`, ''];
    const lines = content.split('\n').slice(startLC.line, endLC.line + 1);
    for (let i = 0; i < lines.length; ++i) {
      outputs.push(lines[i]);
      if (i === 0) {
        if (startLC.line === endLC.line) {
          outputs.push(pad(' ', startLC.character) + color.red(pad('~', endLC.character - startLC.character)));
        } else {
          outputs.push(pad(' ', startLC.character) + color.red(pad('~', lines[i].length - startLC.character)));
        }
      } else if (i === lines.length - 1) {
        outputs.push(color.red(pad('~', endLC.character)));
      } else {
        outputs.push(color.red(pad('~', lines[i].length)));
      }
    }
    outputs.push('');
    const result = outputs.join('\n');
    this._output(result);
    return result;
  }
}

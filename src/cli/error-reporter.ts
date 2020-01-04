import path from 'path';
import { ErrorWithLocation } from '../errors';
import { pos2location, pad, color } from '../string-util';

const lineMark = (line: number, width: number) => {
  const strLine = line + 1 + '';
  return color.invert(pad(' ', width - strLine.length) + strLine) + ' ';
};

const lineMarkForUnderline = (width: number) => {
  return color.invert(pad(' ', width)) + ' ';
};

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
    const allLines = content.split('\n');
    const preLines = allLines.slice(Math.max(startLC.line - 1, 0), startLC.line);
    const lines = allLines.slice(startLC.line, endLC.line + 1);
    const postLines = allLines.slice(endLC.line + 1, Math.min(allLines.length - 1, endLC.line + 2));
    const lineMarkerWidth = (Math.min(allLines.length - 1, endLC.line + 2) + '').length;
    for (let i = 0; i < preLines.length; ++i) {
      outputs.push(lineMark(i + startLC.line - 1, lineMarkerWidth) + color.thin(preLines[i]));
    }
    for (let i = 0; i < lines.length; ++i) {
      outputs.push(lineMark(i + startLC.line, lineMarkerWidth) + lines[i]);
      if (i === 0) {
        if (startLC.line === endLC.line) {
          outputs.push(
            lineMarkForUnderline(lineMarkerWidth) +
              pad(' ', startLC.character) +
              color.red(pad('~', endLC.character - startLC.character)),
          );
        } else {
          outputs.push(
            lineMarkForUnderline(lineMarkerWidth) +
              pad(' ', startLC.character) +
              color.red(pad('~', lines[i].length - startLC.character)),
          );
        }
      } else if (i === lines.length - 1) {
        outputs.push(lineMarkForUnderline(lineMarkerWidth) + color.red(pad('~', endLC.character)));
      } else {
        outputs.push(lineMarkForUnderline(lineMarkerWidth) + color.red(pad('~', lines[i].length)));
      }
    }
    for (let i = 0; i < postLines.length; ++i) {
      outputs.push(lineMark(i + endLC.line + 1, lineMarkerWidth) + color.thin(postLines[i]));
    }
    outputs.push('');
    const result = outputs.join('\n');
    this._output(result);
    return result;
  }
}

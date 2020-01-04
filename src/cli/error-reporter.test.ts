import { ErrorReporter } from './error-reporter';
import { ErrorWithLocation } from '../errors';
import { mark, Markers } from '../string-util/testing/position-marker';
import { clearColor } from '../string-util';

describe(ErrorReporter, () => {
  describe(ErrorReporter.prototype.indicateErrorWithLocation, () => {
    it('should output location of errors in human readable format', () => {
      let message: string = '';
      const reporter = new ErrorReporter('/prj', msg => (message = msg));
      const markers: Markers = {};
      reporter.indicateErrorWithLocation(
        new ErrorWithLocation('some error', {
          fileName: '/prj/main.ts',
          content: mark(
            `
          const query = invalidQuery;
          %%%           ^           ^  %%%
          %%%           a1          a2 %%%
        `,
            markers,
          ),
          start: markers.a1.pos,
          end: markers.a2.pos,
        }),
      );
      expect(clearColor(message)).toMatchSnapshot();
    });

    it('should output location of errors in human readable format with multiple lines', () => {
      let message: string = '';
      const reporter = new ErrorReporter('/prj', msg => (message = msg));
      const markers: Markers = {};
      reporter.indicateErrorWithLocation(
        new ErrorWithLocation('some error', {
          fileName: '/prj/main.ts',
          content: mark(
            `
          const query = gql\`;
            query MyQuery {
          %%%     ^             %%%
          %%%     a1            %%%
              name
          %%%     ^             %%%
          %%%     a2            %%%
            }
          \`:
        `,
            markers,
          ),
          start: markers.a1.pos,
          end: markers.a2.pos,
        }),
      );
      expect(clearColor(message)).toMatchSnapshot();
    });
  });
});

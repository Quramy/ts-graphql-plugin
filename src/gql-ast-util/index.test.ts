import { detectDuplicatedFragments } from './';
import { parse } from 'graphql';

describe(detectDuplicatedFragments, () => {
  it('should detect duplicated fragments info', () => {
    const documentContent = `
      fragment Hoge on Query {
        id
      }
      fragment Foo on Query {
        id
      }
      fragment Hoge on Query {
        id
      }
    `;
    expect(detectDuplicatedFragments(parse(documentContent))).toMatchSnapshot();
  });

  it('should return empty array when no duplication', () => {
    const documentContent = `
      fragment Hoge on Query {
        id
      }
      fragment Foo on Query {
        id
      }
    `;
    expect(detectDuplicatedFragments(parse(documentContent))).toStrictEqual([]);
  });
});

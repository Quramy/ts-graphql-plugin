import { SchemaManagerFactory } from './schema-manager-factory';
import { HttpSchemaManager } from './http-schema-manager';
import { FileSchemaManager } from './file-schema-manager';

describe('SchemaManagerFactory', () => {
  it('should return HttpSchemaManager from http url string', () => {
    const facotry = new SchemaManagerFactory({
      config: {
        schema: 'http://localhost',
      },
    } as any);
    const actual = facotry.create();
    expect(actual instanceof HttpSchemaManager).toBeTruthy();
  });

  it('should return HttpSchemaManager from https url string', () => {
    const facotry = new SchemaManagerFactory({
      config: {
        schema: 'https://localhost',
      },
    } as any);
    const actual = facotry.create();
    expect(actual instanceof HttpSchemaManager).toBeTruthy();
  });

  it('should return FileSchemaManager from file schema string', () => {
    const facotry = new SchemaManagerFactory({
      config: {
        schema: 'file:///tmp/s.json',
      },
    } as any);
    const actual = facotry.create();
    expect(actual instanceof FileSchemaManager).toBeTruthy();
  });

  it('should return FileSchemaManager from no schema string', () => {
    const facotry = new SchemaManagerFactory({
      config: {
        schema: '/tmp/s.json',
      },
    } as any);
    const actual = facotry.create();
    expect(actual instanceof FileSchemaManager).toBeTruthy();
  });

  it('should return HttpSchemaManager from http object', () => {
    const facotry = new SchemaManagerFactory({
      config: {
        schema: {
          http: {
            url: 'http://localhost',
          },
        },
      },
    } as any);
    const actual = facotry.create();
    expect(actual instanceof HttpSchemaManager).toBeTruthy();
  });

  it('should return FileSchemaManager from file object', () => {
    const facotry = new SchemaManagerFactory({
      config: {
        schema: {
          file: {
            path: 'http://localhost',
          },
        },
      },
    } as any);
    const actual = facotry.create();
    expect(actual instanceof FileSchemaManager).toBeTruthy();
  });
});

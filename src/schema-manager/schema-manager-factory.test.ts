import { SchemaManagerFactory } from './schema-manager-factory';
import { HttpSchemaManager } from './http-schema-manager';
import { FileSchemaManager } from './file-schema-manager';
import { createTestingSchemaManagerHost } from './testing/testing-schema-manager-host';
import { ScriptedHttpSchemaManager } from './scripted-http-schema-manager';

describe(SchemaManagerFactory, () => {
  it('should return HttpSchemaManager from http url string', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: 'http://localhost',
      }),
    );
    const actual = factory.create();
    expect(actual instanceof HttpSchemaManager).toBeTruthy();
  });

  it('should return HttpSchemaManager from https url string', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: 'https://localhost',
      }),
    );
    const actual = factory.create();
    expect(actual instanceof HttpSchemaManager).toBeTruthy();
  });

  it('should return FileSchemaManager from file schema string', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: 'file:///tmp/s.json',
      }),
    );
    const actual = factory.create();
    expect(actual instanceof FileSchemaManager).toBeTruthy();
  });

  it('should return FileSchemaManager from no schema string', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: '/tmp/s.json',
      }),
    );
    const actual = factory.create();
    expect(actual instanceof FileSchemaManager).toBeTruthy();
  });

  it('should return HttpSchemaManager from http object with url property', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: {
          http: {
            url: 'http://localhost',
          },
        },
      }),
    );
    const actual = factory.create();
    expect(actual instanceof HttpSchemaManager).toBeTruthy();
  });

  it('should return FileSchemaManager from file object', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: {
          file: {
            path: 'http://localhost',
          },
        },
      }),
    );
    const actual = factory.create();
    expect(actual instanceof FileSchemaManager).toBeTruthy();
  });

  it('should return ScriptedHttpSchemaManager from http object with fromScript property', () => {
    const factory = new SchemaManagerFactory(
      createTestingSchemaManagerHost({
        schema: {
          http: {
            fromScript: 'graphql-config.js',
          },
        },
      }),
    );
    const actual = factory.create();
    expect(actual instanceof ScriptedHttpSchemaManager).toBeTruthy();
  });
});

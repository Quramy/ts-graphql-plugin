import test from 'ava';
import { SchemaManagerFactory } from './schema-manager-factory';
import { HttpSchemaManager } from './http-schema-manager';
import { FileSchemaManager } from './file-schema-manager';

test('should return HttpSchemaManager from http url string', t => {
  const facotry = new SchemaManagerFactory({
    config: {
      schema: 'http://localhost',
    },
  } as any);
  const actual = facotry.create();
  t.true(actual instanceof HttpSchemaManager);
});

test('should return HttpSchemaManager from https url string', t => {
  const facotry = new SchemaManagerFactory({
    config: {
      schema: 'https://localhost',
    },
  } as any);
  const actual = facotry.create();
  t.true(actual instanceof HttpSchemaManager);
});

test('should return FileSchemaManager from file schema string', t => {
  const facotry = new SchemaManagerFactory({
    config: {
      schema: 'file:///tmp/s.json',
    },
  } as any);
  const actual = facotry.create();
  t.true(actual instanceof FileSchemaManager);
});

test('should return FileSchemaManager from no schema string', t => {
  const facotry = new SchemaManagerFactory({
    config: {
      schema: '/tmp/s.json',
    },
  } as any);
  const actual = facotry.create();
  t.true(actual instanceof FileSchemaManager);
});

test('should return HttpSchemaManager from http object', t => {
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
  t.true(actual instanceof HttpSchemaManager);
});

test('should return FileSchemaManager from file object', t => {
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
  t.true(actual instanceof FileSchemaManager);
});

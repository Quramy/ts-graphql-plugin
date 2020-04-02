export type SchemaConfig = {
  schema:
    | string
    | {
        file: {
          path: string;
        };
      }
    | {
        http: {
          url: string;
          method?: string;
          headers?: { [key: string]: string };
        };
      }
    | {
        http: {
          fromScript: string;
        };
      };
  localSchemaExtensions?: string[];
};

export interface SchemaManagerHost {
  getProjectRootPath(): string;

  getConfig(): SchemaConfig;

  fileExists(path: string): boolean;
  readFile(path: string, encoding?: string): string | undefined;
  watchFile(
    path: string,
    cb: (fileName: string) => void,
    interval: number,
  ): {
    close(): void;
  };

  log(msg: string): void;
}

import { ScriptedHttpSchemaManager } from './scripted-http-schema-manager';

describe(ScriptedHttpSchemaManager, () => {
  beforeEach(jest.resetModules);

  function createScriptedHttpSchemaManager(fromScript: string = './graphql-config') {
    const scriptedHttpSchemaManager = {
      _host: {
        getProjectRootPath: jest.fn(),
        fileExists: jest.fn(),
      },
      _scriptFile: fromScript,
      _options: null,
      log: jest.fn(),
      _requireScript: jest.fn(),
      _getOptions: ScriptedHttpSchemaManager.prototype['_getOptions'],
    };

    scriptedHttpSchemaManager._getOptions = scriptedHttpSchemaManager._getOptions.bind(scriptedHttpSchemaManager);

    return scriptedHttpSchemaManager;
  }

  it('should correctly load, execute http setup script, and return setup object', async () => {
    const requestSetup = {
      url: 'http://example.com/graphql',
      method: 'POST',
      headers: {
        Authorization: 'Bearer abcabcabc',
      },
    };
    const configScriptMock = jest.fn().mockReturnValue(new Promise(resolve => resolve(requestSetup)));
    const manager = createScriptedHttpSchemaManager();
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._host.fileExists.mockReturnValue(true);
    manager._requireScript.mockReturnValue(configScriptMock);

    const result = await manager._getOptions();

    expect(result).toBe(requestSetup);
  });

  it('should return cached options if are available', async () => {
    const requestSetup = {
      url: 'http://example.com/graphql',
      method: 'POST',
      headers: {
        Authorization: 'Bearer abcabcabc',
      },
    };
    const configScriptMock = jest.fn().mockReturnValue(new Promise(resolve => resolve(requestSetup)));
    const manager = createScriptedHttpSchemaManager();
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._host.fileExists.mockReturnValue(true);
    manager._requireScript.mockReturnValue(configScriptMock);

    const initialized = await manager._getOptions(); // first call to initialize cache
    const cached = await manager._getOptions(); // second call, should return cached value, should not call script again

    expect(initialized).toBe(cached);
    expect(configScriptMock).toHaveBeenCalledTimes(1);
  });

  it('should throw error if configuration script file does not exist', () => {
    const manager = createScriptedHttpSchemaManager('/file-that-does-not-exist.js');
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._host.fileExists.mockReturnValue(false);

    expect(manager._getOptions()).rejects.toEqual(
      new Error("ScriptedHttpSchemaManager configuration script 'file-that-does-not-exist.js' does not exist"),
    );
  });

  it('should throw error if configuration script throws error', () => {
    const configScriptMock = jest.fn().mockReturnValue(new Promise((_, reject) => reject(new Error('Some error'))));
    const manager = createScriptedHttpSchemaManager();
    manager._host.fileExists.mockReturnValue(true);
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._requireScript.mockReturnValue(configScriptMock);

    expect(manager._getOptions()).rejects.toEqual(
      new Error(
        `ScriptedHttpSchemaManager configuration script './graphql-config' execution failed due to: Error: Some error`,
      ),
    );
  });

  it('should throw error if request setup object does not contain url property', () => {
    const wrongRequestSetup = {
      method: 'POST',
      headers: {
        Authorization: 'Bearer abcabcabc',
      },
    };
    const configScriptMock = jest.fn().mockReturnValue(new Promise(resolve => resolve(wrongRequestSetup)));
    const manager = createScriptedHttpSchemaManager();
    manager._host.fileExists.mockReturnValue(true);
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._requireScript.mockReturnValue(configScriptMock);

    expect(manager._getOptions()).rejects.toEqual(
      new Error(`RequestSetup object is wrong: ${JSON.stringify(wrongRequestSetup, null, 2)}`),
    );
  });

  it('should throw error if request setup object does contain misspelled method property', () => {
    const wrongRequestSetup = {
      url: 'http://example.com/graphql',
      methooood: 'POST',
      headers: {
        Authorization: 'Bearer abcabcabc',
      },
    };
    const configScriptMock = jest.fn().mockReturnValue(new Promise(resolve => resolve(wrongRequestSetup)));
    const manager = createScriptedHttpSchemaManager();
    manager._host.fileExists.mockReturnValue(true);
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._requireScript.mockReturnValue(configScriptMock);

    expect(manager._getOptions()).rejects.toEqual(
      new Error(`RequestSetup object is wrong: ${JSON.stringify(wrongRequestSetup, null, 2)}`),
    );
  });

  it('should throw error if request setup object does contain misspelled headers property', () => {
    const wrongRequestSetup = {
      url: 'http://example.com/graphql',
      method: 'POST',
      headddders: {
        Authorization: 'Bearer abcabcabc',
      },
    };
    const configScriptMock = jest.fn().mockReturnValue(new Promise(resolve => resolve(wrongRequestSetup)));
    const manager = createScriptedHttpSchemaManager();
    manager._host.fileExists.mockReturnValue(true);
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._requireScript.mockReturnValue(configScriptMock);

    expect(manager._getOptions()).rejects.toEqual(
      new Error(`RequestSetup object is wrong: ${JSON.stringify(wrongRequestSetup, null, 2)}`),
    );
  });

  it('should throw error if request setup object url is not url', () => {
    const wrongRequestSetup = {
      url: 'some string',
      method: 'POST',
      headers: {
        Authorization: 'Bearer abcabcabc',
      },
    };
    const configScriptMock = jest.fn().mockReturnValue(new Promise(resolve => resolve(wrongRequestSetup)));
    const manager = createScriptedHttpSchemaManager();
    manager._host.fileExists.mockReturnValue(true);
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._requireScript.mockReturnValue(configScriptMock);

    expect(manager._getOptions()).rejects.toEqual(new Error('RequestSetup.url have to be valid url: some string'));
  });
});

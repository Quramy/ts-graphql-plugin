import { ScriptedHttpSchemaManager } from './scripted-http-schema-manager';

describe(ScriptedHttpSchemaManager, () => {
  function createScriptedHttpSchemaManager(fromScript: string = './graphql-config') {
    const manager = {
      _host: {
        getProjectRootPath: jest.fn(),
        fileExists: jest.fn(),
      },
      _scriptFileName: fromScript,
      _options: null,
      log: jest.fn(),
      _requireScript: jest.fn(),
      _getScriptFilePath: ScriptedHttpSchemaManager.prototype['_getScriptFilePath'],
      _getOptions: ScriptedHttpSchemaManager.prototype['_getOptions'],
      _fetchErrorOcurred: ScriptedHttpSchemaManager.prototype['_fetchErrorOcurred'],
      _configurationScriptChanged: ScriptedHttpSchemaManager.prototype['_configurationScriptChanged'],
    };

    manager._getScriptFilePath = manager._getScriptFilePath.bind(manager);
    manager._getOptions = manager._getOptions.bind(manager);
    manager._fetchErrorOcurred = manager._fetchErrorOcurred.bind(manager);
    manager._configurationScriptChanged = manager._configurationScriptChanged.bind(manager);

    return manager;
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
    manager._host.getProjectRootPath.mockReturnValue('/');
    manager._host.fileExists.mockReturnValue(false);

    return expect(manager._getOptions()).rejects.toEqual(
      new Error("ScriptedHttpSchemaManager configuration script '/file-that-does-not-exist.js' does not exist"),
    );
  });

  it('should throw error if configuration script throws error', async () => {
    const configScriptMock = jest.fn().mockReturnValue(new Promise((_, reject) => reject(new Error('Some error'))));
    const manager = createScriptedHttpSchemaManager();
    manager._host.fileExists.mockReturnValue(true);
    manager._host.getProjectRootPath.mockReturnValue('./');
    manager._requireScript.mockReturnValue(configScriptMock);

    return expect(manager._getOptions()).rejects.toEqual(
      new Error(
        `ScriptedHttpSchemaManager configuration script './graphql-config' execution failed due to: Error: Some error`,
      ),
    );
  });

  it('should throw error if request setup object does not contain url property', async () => {
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

    return expect(manager._getOptions()).rejects.toEqual(
      new Error(`RequestSetup object is wrong: ${JSON.stringify(wrongRequestSetup, null, 2)}`),
    );
  });

  it('should throw error if request setup object does contain misspelled method property', async () => {
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

    return expect(manager._getOptions()).rejects.toEqual(
      new Error(`RequestSetup object is wrong: ${JSON.stringify(wrongRequestSetup, null, 2)}`),
    );
  });

  it('should throw error if request setup object does contain misspelled headers property', async () => {
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

    return expect(manager._getOptions()).rejects.toEqual(
      new Error(`RequestSetup object is wrong: ${JSON.stringify(wrongRequestSetup, null, 2)}`),
    );
  });

  it('should throw error if request setup object url is not url', async () => {
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

    return expect(manager._getOptions()).rejects.toEqual(
      new Error('RequestSetup.url have to be valid url: some string'),
    );
  });

  it('should set method to POST if is not specified', async () => {
    const requestSetup = {
      url: 'http://example.com/graphql',
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

    expect(result).toEqual({
      ...requestSetup,
      method: 'POST',
    });
  });

  it('should reload script and execute it again after fetch error', async () => {
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

    await manager._getOptions(); // initialization, should call _requireScriptMethod
    await manager._getOptions(); // returns cached result, should not call _requireScript method
    manager._fetchErrorOcurred();
    await manager._getOptions(); // cache should be null, should call _requireScript method again

    expect(manager._requireScript).toBeCalledTimes(2);
    expect(configScriptMock).toBeCalledTimes(2);
  });

  it('should reload script and execute it again after configuration script file change', async () => {
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

    await manager._getOptions(); // initialization, should call _requireScriptMethod
    await manager._getOptions(); // returns cached result, should not call _requireScript method
    manager._configurationScriptChanged();
    await manager._getOptions(); // cache should be null, should call _requireScript method again

    expect(manager._requireScript).toBeCalledTimes(2);
    expect(configScriptMock).toBeCalledTimes(2);
  });
});

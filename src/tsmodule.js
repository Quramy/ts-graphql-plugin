const { getModule } = require('./language-service-plugin/ts-server-module');

module.exports = getModule() ?? require('typescript');

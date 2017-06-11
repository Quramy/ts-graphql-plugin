const { HttpSchemaManager } = require('../lib/schema-manager/http-schema-manager');

const { GITHUB_TOKEN } = process.env;
if (!GITHUB_TOKEN) {
  console.warn('Skip http-request test. Please "export GITHUB_TOKEN=..."');
  process.exit(0);
}

console.warn('Sending http-request to Github GraphQL API...');

HttpSchemaManager.request({
  url: 'https://api.github.com/graphql',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
  },
}).then(x => {
  console.warn('🎉 Github GraphQL API request is end succeessfully 🎉');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');
const webpack = require('webpack');
const { print } = require('graphql/language');

async function specWithoutGlobalFragments() {
  const config = require('../../project-fixtures/transformation-prj/webpack.config.js');
  const compiler = webpack({ ...config, mode: 'production' });
  const stats = await new Promise((res, rej) => {
    compiler.run((err, stats) => {
      if (err) return rej(err);
      return res(stats);
    });
  });
  assert(!stats.hasErrors());
  const distFilePath = path.resolve(stats.toJson().outputPath, 'main.js');
  const result = execSync(`node ${distFilePath}`);
  assert.equal(typeof print(JSON.parse(result.toString())), 'string');
  assert(print(JSON.parse(result.toString())).indexOf('MyQuery') !== -1);
  assert(print(JSON.parse(result.toString())).indexOf('fragment FragmentLeaf') !== -1);
}

async function specWithGlobalFragments() {
  const config = require('../../project-fixtures/transformation-global-frag-prj/webpack.config.js');
  const compiler = webpack({ ...config, mode: 'production' });
  const stats = await new Promise((res, rej) => {
    compiler.run((err, stats) => {
      if (err) return rej(err);
      return res(stats);
    });
  });
  assert(!stats.hasErrors());
  const distFilePath = path.resolve(stats.toJson().outputPath, 'main.js');
  const result = execSync(`node ${distFilePath}`);
  assert(print(JSON.parse(result.toString())).indexOf('MyQuery') !== -1);
  assert(print(JSON.parse(result.toString())).indexOf('fragment FragmentLeaf') !== -1);
}

async function run() {
  await specWithoutGlobalFragments();
  await specWithGlobalFragments();
}

module.exports = run;

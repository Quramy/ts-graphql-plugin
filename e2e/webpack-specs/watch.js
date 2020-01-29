const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const webpack = require('webpack');
const { print } = require('graphql/language');

async function run() {
  const config = require('../../project-fixtures/transformation-prj/webpack.config.js');
  const fileToChange = path.resolve(__dirname, '../../project-fixtures/transformation-prj/fragment-node.ts');
  const originalContent = fs.readFileSync(fileToChange, 'utf8');
  const compiler = webpack({ ...config, mode: 'production' });
  let watching;
  let called = 0;
  const stats = await new Promise((res, rej) => {
    watching = compiler.watch(
      {
        aggregateTimeout: 300,
        poll: undefined,
      },
      (err, stats) => {
        if (err) return rej(err);
        if (!called) {
          called++;
          fs.writeFileSync(fileToChange, originalContent.replace('bye', 'goodBye'), 'utf8');
        } else {
          res(stats);
        }
      },
    );
  });
  watching.close();
  fs.writeFileSync(fileToChange, originalContent, 'utf8');
  assert(!stats.hasErrors());
  const distFilePath = path.resolve(stats.toJson().outputPath, 'main.js');
  const result = execSync(`node ${distFilePath}`);
  assert(print(JSON.parse(result.toString())).indexOf('goodBye') !== -1);
}

module.exports = run;

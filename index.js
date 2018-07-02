/* eslint-disable no-console, arrow-body-style */
const fs = require('fs');
const less = require('less');
const {promisify} = require('util');
const crypto = require('crypto');

const writeFileAsync = promisify(fs.writeFile.bind(fs));
const readFileAsync = promisify(fs.readFile.bind(fs));

function hashString(content) {
  const hasher = crypto.createHash('sha1');
  hasher.update(content);
  return hasher.digest('hex');
}

function getLess() {
  const environment = require('less/lib/less-node/environment');
  const l = less.createFromEnvironment(
      environment, [new less.FileManager(), new less.UrlFileManager()]);
  l.options = require('less/lib/less/default-options')();
  l.PluginLoader = less.PluginLoader;
  return l;
};


function compileCSS(less) {
  const sourceFilename = './style.less';
  const destFilename = './style.css';
  return readFileAsync(sourceFilename, 'utf-8')
      .then((lessContent) => {
        return less.render(lessContent, {
          filename: sourceFilename,
          paths: [],
          strictImports: true,
          strictUnits: true,
          strictMath: true,
        });
      })
      .then((output) => {
        const hash = hashString(output.css);
        console.log(`Hash: ${hash}`);
        return Promise.all([
          writeFileAsync(destFilename, output.css),
          writeFileAsync(`${destFilename}.map`, output.map || ''),
        ]);
      })
      .catch((err) => {
        console.error(err);
        throw err;
      });
}

function testWithLess(lessFn) {
  return Promise.resolve(true)
      .then(() => writeFileAsync('./included.less', '.hello { color: #f00; }'))
      .then(() => compileCSS(lessFn()))
      .then(
          () =>
              writeFileAsync('./included.less', '.bubblegum { color: #f0f; }'))
      .then(() => compileCSS(lessFn()));
}

Promise.resolve(true)
    .then(() => {
      console.log('Global LESS');
      return testWithLess(() => less);
    })
    .then(() => {
      console.log('New LESS per compilation');
      testWithLess(getLess);
    });
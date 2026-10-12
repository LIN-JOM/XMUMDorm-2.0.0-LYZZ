#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function routeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? routeFiles(file) : entry.isFile() && entry.name.endsWith('.js') ? [file] : [];
    })
    .sort();
}

function checkCommonJsSource(source, filename) {
  return spawnSync(process.execPath, ['--input-type=commonjs', '--check', '-'], {
    input: source,
    encoding: 'utf8',
    cwd: path.dirname(filename),
  });
}

function checkRoutes(directory) {
  return routeFiles(directory).flatMap((file) => {
    const result = checkCommonJsSource(fs.readFileSync(file, 'utf8'), file);
    return result.status === 0 ? [] : [{ file, stderr: result.stderr || result.stdout }];
  });
}

if (require.main === module) {
  const failures = checkRoutes(path.resolve(__dirname, '..', 'routes'));
  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`${failure.file}\n${failure.stderr}`);
    process.exitCode = 1;
  }
}

module.exports = { checkCommonJsSource, checkRoutes };

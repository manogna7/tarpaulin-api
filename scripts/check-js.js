const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ignoredDirectories = new Set([
  '.git',
  '.next',
  'client',
  'coverage',
  'node_modules',
  'uploads',
]);

function findJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : findJavaScriptFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

const files = findJavaScriptFiles(process.cwd());

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);

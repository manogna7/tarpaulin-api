const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { uploadDir, isPathInsideUploadDir } = require('../src/utils/uploads');

test('upload cleanup only accepts files below the configured upload directory', () => {
  assert.equal(isPathInsideUploadDir(path.join(uploadDir, 'evidence.txt')), true);
  assert.equal(isPathInsideUploadDir(path.join(uploadDir, 'nested', 'evidence.txt')), true);
  assert.equal(isPathInsideUploadDir(uploadDir), false);
  assert.equal(isPathInsideUploadDir(path.join(uploadDir, '..', 'outside.txt')), false);
  assert.equal(isPathInsideUploadDir(''), false);
});

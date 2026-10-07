import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedExtensionOrigin } from './cors';

const existing = 'bbhhcjnmhnppigbldlpfabjambamlpoc';
const release = 'hignblolfdomonbhlicdbmfejnfdkkgp';

test('accepts configured existing and release extension IDs', () => {
  const configured = `${existing}, ${release}`;
  assert.equal(isAllowedExtensionOrigin(`chrome-extension://${existing}`, configured), true);
  assert.equal(isAllowedExtensionOrigin(`chrome-extension://${release}`, configured), true);
});

test('rejects unlisted, malformed, and non-extension origins', () => {
  const configured = `${existing}, invalid-id`;
  assert.equal(isAllowedExtensionOrigin('chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', configured), false);
  assert.equal(isAllowedExtensionOrigin('chrome-extension://invalid-id', configured), false);
  assert.equal(isAllowedExtensionOrigin(`https://${existing}`, configured), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagOn } from '../src/lib/flags.js';

test('a flag is on only when its environment variable is "on"', () => {
  assert.equal(flagOn('statement-import', { FLAG_STATEMENT_IMPORT: 'on' }), true);
  assert.equal(flagOn('statement-import', { FLAG_STATEMENT_IMPORT: 'off' }), false);
  assert.equal(flagOn('statement-import', {}), false);
});

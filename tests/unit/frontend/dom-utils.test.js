import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { debounce } from '../../../frontend/js/utils/dom.js';

describe('Frontend DOM Utilities: dom.js', () => {
  describe('debounce', () => {
    test('delays function execution until specified wait time', async () => {
      let callCount = 0;
      let lastArg = null;

      const fn = debounce((arg) => {
        callCount++;
        lastArg = arg;
      }, 50);

      fn('a');
      fn('b');
      fn('c');

      assert.strictEqual(callCount, 0, 'Should not be called immediately');

      await new Promise(resolve => setTimeout(resolve, 80));

      assert.strictEqual(callCount, 1, 'Should only be called once');
      assert.strictEqual(lastArg, 'c', 'Should be called with latest argument');
    });

    test('preserves this context when called', async () => {
      let contextCaptured = null;
      const obj = {
        name: 'test-obj',
        trigger: debounce(function () {
          contextCaptured = this.name;
        }, 30)
      };

      obj.trigger();
      await new Promise(resolve => setTimeout(resolve, 60));
      assert.strictEqual(contextCaptured, 'test-obj');
    });
  });
});

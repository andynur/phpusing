import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

beforeEach(() => {
  fakeBrowser.reset();
  // Tests never reach the network; code under test must take an injected fetch.
  vi.stubGlobal('fetch', () => Promise.reject(new Error('network disabled in tests')));
});

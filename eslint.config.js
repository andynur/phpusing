import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const noHtmlInsertion = {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message: 'Scanned content is untrusted. Render it as text.',
};

export default tseslint.config(
  {
    ignores: [
      '.agent-logs/**',
      '.output/**',
      '.wxt/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'data/dist/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // AGENTS.md rule 6: no remote or dynamic code.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // AGENTS.md rule 7: scanned responses are untrusted.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Scanned content is untrusted. Use textContent.' },
        { property: 'outerHTML', message: 'Scanned content is untrusted. Use textContent.' },
        { property: 'insertAdjacentHTML', message: 'Scanned content is untrusted.' },
      ],
      'no-restricted-syntax': ['error', noHtmlInsertion],
    },
  },
  {
    // Only the scanner and advisory loader may touch the network.
    files: ['src/checks/**', 'src/shared/**', 'src/entrypoints/popup/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Network access goes through src/scanner or src/advisories.' },
        { name: 'XMLHttpRequest', message: 'Network access goes through src/scanner.' },
      ],
    },
  },
  {
    // Named exports outside WXT entrypoints.
    files: ['src/checks/**', 'src/scanner/**', 'src/advisories/**', 'src/shared/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' },
        noHtmlInsertion,
      ],
    },
  },
);

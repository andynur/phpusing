import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  imports: false,
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      // Minified but never obfuscated (Chrome Web Store policy).
      minify: true,
      sourcemap: false,
    },
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // Permission reasons: docs/03_ARCHITECTURE.md. `scripting` arrives with F-012 (DOM markers).
    permissions: ['storage', 'activeTab'],
    // Requested at runtime for one origin only (D-003).
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
    action: { default_title: '__MSG_actionTitle__' },
  },
});

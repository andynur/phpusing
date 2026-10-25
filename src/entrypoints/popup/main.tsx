import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../shared/ui/tokens.css';
import { I18nProvider } from '../../shared/i18n/I18nProvider';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing in popup/index.html');

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);

import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { createMessageListener } from './listener';
import { createScanService } from './scan-service';

export default defineBackground(() => {
  const service = createScanService();
  browser.runtime.onMessage.addListener(
    createMessageListener(service.handle, browser.runtime.id, browser.runtime.getURL('/')),
  );
});

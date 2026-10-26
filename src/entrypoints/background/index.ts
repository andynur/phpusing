import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { updateAdvisories } from '../../advisories/update';
import { createMessageListener } from './listener';
import { createScanService } from './scan-service';

export default defineBackground(() => {
  const service = createScanService();
  browser.runtime.onMessage.addListener(
    createMessageListener(
      (request) => (request.type === 'data/update' ? updateAdvisories() : service.handle(request)),
      browser.runtime.id,
      browser.runtime.getURL('/'),
    ),
  );
});

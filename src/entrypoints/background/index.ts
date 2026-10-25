import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { isTrustedSender, parseRequest } from '../../shared/messages';
import { createScanService } from './scan-service';

export default defineBackground(() => {
  const service = createScanService();
  const extensionOrigin = browser.runtime.getURL('/');

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!isTrustedSender(sender, browser.runtime.id, extensionOrigin)) return undefined;
    const request = parseRequest(message);
    if (!request) return undefined;
    return Promise.resolve(service.handle(request));
  });
});

import { isTrustedSender, parseRequest, type Reply, type Request } from '../../shared/messages';

type Sender = { id?: string; url?: string };

// Replies through sendResponse and `return true`: older Chrome ignores a Promise returned
// from an onMessage listener, so the popup would receive `undefined`.
export function createMessageListener(
  handle: (request: Request) => Promise<Reply> | Reply,
  runtimeId: string,
  extensionOrigin: string,
) {
  return (message: unknown, sender: Sender, sendResponse: (reply: Reply) => void) => {
    if (!isTrustedSender(sender, runtimeId, extensionOrigin)) return false;
    const request = parseRequest(message);
    if (!request) return false;
    Promise.resolve()
      .then(() => handle(request))
      .then(sendResponse, () => sendResponse({ ok: false, reason: 'failed' }));
    return true;
  };
}

import {
  isTrustedSender,
  parseRequest,
  type Request,
  type StartReply,
} from '../../shared/messages';

type Sender = { id?: string; url?: string; tab?: unknown };

// Replies through sendResponse and `return true`: older Chrome ignores a Promise returned
// from an onMessage listener, so the popup would receive `undefined`.
export function createMessageListener(
  handle: (request: Request) => Promise<StartReply> | StartReply,
  runtimeId: string,
  extensionOrigin: string,
) {
  return (message: unknown, sender: Sender, sendResponse: (reply: StartReply) => void) => {
    if (!isTrustedSender(sender, runtimeId, extensionOrigin)) return false;
    const request = parseRequest(message);
    if (!request) return false;
    Promise.resolve()
      .then(() => handle(request))
      .then(sendResponse, () => sendResponse({ ok: false, reason: 'failed' }));
    return true;
  };
}

import { decodeDataUrlText } from './decode-data-url';

type DecodeRequest = { id: string; url: string };
type DecodeResponse = { id: string; ok: true; text: string } | { id: string; ok: false };

addEventListener('message', (event: MessageEvent<DecodeRequest>) => {
  const { id, url } = event.data;
  try {
    const text = decodeDataUrlText(url);
    const response: DecodeResponse = { id, ok: true, text };
    postMessage(response);
  } catch {
    const response: DecodeResponse = { id, ok: false };
    postMessage(response);
  }
});

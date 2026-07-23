import {
  createPrivateBlobRequestController,
  resolvePrivateBlobUrl,
  revokePrivateBlobUrl,
} from './private-blob';
import { PRIVATE_MEDIA_VARIANTS } from './private-media-variants';

export interface PrivateRichTextImageGrant {
  assetRef: string;
  mediaRef: string;
}

export interface HydratedPrivateRichText {
  cleanup: () => void;
  html: string;
}

function serializeDocument(document: Document): string {
  return document.body.innerHTML;
}

export async function hydratePrivateRichTextHtml(
  html: string,
  grants: PrivateRichTextImageGrant[] = [],
): Promise<HydratedPrivateRichText> {
  if (typeof DOMParser === 'undefined' || !html) {
    return { cleanup: () => {}, html };
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  const grantMap = new Map(
    grants.map((grant) => [grant.assetRef, grant.mediaRef]),
  );
  const urls: string[] = [];
  const controller = createPrivateBlobRequestController();
  const request = controller.begin();
  const images = [...document.querySelectorAll('img[data-asset-ref]')];
  await Promise.all(
    images.map(async (image) => {
      const assetRef = image.dataset.assetRef;
      const mediaRef = assetRef ? grantMap.get(assetRef) : undefined;
      if (!mediaRef) return;
      try {
        const url = await resolvePrivateBlobUrl(mediaRef, {
          ...PRIVATE_MEDIA_VARIANTS.notificationImage,
          signal: request.signal,
        });
        if (!controller.isCurrent(request.generation)) {
          revokePrivateBlobUrl(url);
          return;
        }
        image.setAttribute('src', url);
        urls.push(url);
      } catch {
        // 单张图片失败不影响通知正文的其它内容。
      }
    }),
  );
  return {
    html: serializeDocument(document),
    cleanup: () => {
      controller.invalidate();
      urls.forEach((url) => revokePrivateBlobUrl(url));
    },
  };
}

export function serializePrivateRichTextHtml(html: string): string {
  if (typeof DOMParser === 'undefined' || !html) return html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') ?? '';
    if (src.startsWith('blob:')) image.setAttribute('src', 'about:blank');
  });
  return serializeDocument(document);
}

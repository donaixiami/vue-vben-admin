import { describe, expect, it } from 'vitest';

import { sanitizeRichTextHtml } from '../sanitize-html';

describe('sanitizeRichTextHtml', () => {
  it('keeps allowed rich text tags', () => {
    expect(
      sanitizeRichTextHtml(
        '<p>Hello <strong>world</strong><br><em>test</em></p>',
      ),
    ).toBe('<p>Hello <strong>world</strong><br><em>test</em></p>');
  });

  it('removes dangerous tags and unsafe hrefs', () => {
    expect(
      sanitizeRichTextHtml(
        '<p>safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
      ),
    ).toBe('<p>safe</p><a>bad</a>');
  });
});

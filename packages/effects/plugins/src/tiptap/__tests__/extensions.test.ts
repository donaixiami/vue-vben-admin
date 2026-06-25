import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createDefaultTiptapExtensions } from '../extensions';

describe('createDefaultTiptapExtensions', () => {
  let editor: Editor | undefined;

  afterEach(() => {
    editor?.destroy();
    editor = undefined;
  });

  it('registers underline only once', () => {
    editor = new Editor({
      content: '',
      extensions: createDefaultTiptapExtensions(),
    });

    const names = editor.extensionManager.extensions.map(
      (extension) => extension.name,
    );

    expect(names.filter((name) => name === 'underline')).toHaveLength(1);
  });
});

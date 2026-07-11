import { mount } from '@vue/test-utils';

import { describe, expect, it } from 'vitest';

import Profile from '../profile.vue';

describe('Profile responsive layout', () => {
  it('stacks cards on small screens and constrains flexible content', () => {
    const wrapper = mount(Profile, {
      props: {
        modelValue: 'basic',
        tabs: [{ label: '基本设置', value: 'basic' }],
        userInfo: null,
      },
    });

    const layout = wrapper.find('.size-full');
    const cards = wrapper.findAllComponents({ name: 'Card' });

    expect(layout.classes()).toContain('flex-col');
    expect(layout.classes()).toContain('lg:flex-row');
    expect(cards[0]?.classes()).toContain('w-full');
    expect(cards[1]?.classes()).toContain('min-w-0');
  });
});

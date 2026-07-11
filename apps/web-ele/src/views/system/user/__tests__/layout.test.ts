import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const Stub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.());
  },
});

vi.mock('@vben/common-ui', () => ({
  Page: Stub,
  useVbenDrawer: () => [
    Stub,
    { open: vi.fn(), setData: vi.fn(() => ({ open: vi.fn() })) },
  ],
}));

vi.mock('@vben/icons', () => ({ Plus: Stub }));
vi.mock('element-plus', () => ({
  ElButton: Stub,
  ElMessage: Object.assign(vi.fn(), { success: vi.fn() }),
  ElMessageBox: { confirm: vi.fn() },
}));
vi.mock('#/adapter/vxe-table', () => ({
  useVbenVxeGrid: () => [Stub, { query: vi.fn() }],
}));
vi.mock('#/api/system/user', () => ({
  deleteUser: vi.fn(),
  getUserList: vi.fn(),
  resetUserPassword: vi.fn(),
  updateUserStatus: vi.fn(),
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('../data', () => ({
  useColumns: () => [],
  useGridFormSchema: () => [],
}));
vi.mock('../modules/form.vue', () => ({
  default: { name: 'Form', template: '<div />' },
}));
vi.mock('../modules/tree.vue', () => ({
  default: { name: 'Tree', template: '<div />' },
}));

describe('user list responsive layout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stacks on small screens and allows the grid column to shrink', async () => {
    const { default: UserList } = await import('../list.vue');
    const wrapper = mount(UserList, {
      global: {
        stubs: {
          Form: Stub,
          Tree: Stub,
        },
      },
    });

    const layout = wrapper.find('.h-full.gap-4');
    const children = layout.element.children;

    expect(layout.classes()).toContain('flex-col');
    expect(layout.classes()).toContain('lg:flex-row');
    expect(children[0]?.classList.contains('w-full')).toBe(true);
    expect(children[1]?.classList.contains('min-w-0')).toBe(true);
  });
});

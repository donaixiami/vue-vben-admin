import { describe, expect, it } from 'vitest';

import { normalizeSystemConfigQueryParams } from '../query';

describe('system config query params', () => {
  it('removes empty values and maps created_at range to backend time fields', () => {
    expect(
      normalizeSystemConfigQueryParams({
        config_key: 'site.name',
        created_at: ['2026-06-01 00:00:00', '2026-06-30 23:59:59'],
        emptyArray: [],
        emptyText: '   ',
        id: '',
        is_system: false,
        name: '站点',
        nil: null,
        undef: undefined,
      }),
    ).toEqual({
      config_key: 'site.name',
      from_time: '2026-06-01 00:00:00',
      is_system: false,
      name: '站点',
      to_time: '2026-06-30 23:59:59',
    });
  });

  it('keeps numeric zero and boolean false because they are valid filters', () => {
    expect(
      normalizeSystemConfigQueryParams({
        id: 0,
        is_system: false,
      }),
    ).toEqual({
      id: 0,
      is_system: false,
    });
  });
});

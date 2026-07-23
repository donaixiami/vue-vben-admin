import type { ResolvePrivateBlobOptions } from '#/utils/private-blob';

import { PRIVATE_MEDIA_VARIANTS } from '#/utils/private-media-variants';

interface UserAvatarRow {
  avatar: null | string;
  avatarMediaRef?: null | string;
}

type AvatarResolveOptions = ResolvePrivateBlobOptions;

export interface UserAvatarQueryRequest {
  generation: number;
  signal: AbortSignal;
}

export function createUserAvatarQueryController() {
  let generation = 0;
  let controller: AbortController | undefined;

  return {
    begin(): UserAvatarQueryRequest {
      controller?.abort();
      controller = new AbortController();
      generation += 1;
      return { generation, signal: controller.signal };
    },
    invalidate(): void {
      controller?.abort();
      controller = undefined;
      generation += 1;
    },
    isCurrent(value: number): boolean {
      return value === generation;
    },
  };
}

export async function hydrateUserAvatarRows<T extends UserAvatarRow>(
  rows: T[],
  resolveAvatar: (
    mediaRef: string,
    options?: AvatarResolveOptions,
  ) => Promise<string>,
  signal?: AbortSignal,
): Promise<{ blobUrls: string[]; rows: T[] }> {
  const blobUrls: string[] = [];
  const hydratedRows = await Promise.all(
    rows.map(async (row) => {
      if (!row.avatarMediaRef) return row;
      try {
        const avatar = signal
          ? await resolveAvatar(row.avatarMediaRef, {
              ...PRIVATE_MEDIA_VARIANTS.userListAvatar,
              signal,
            })
          : await resolveAvatar(
              row.avatarMediaRef,
              PRIVATE_MEDIA_VARIANTS.userListAvatar,
            );
        blobUrls.push(avatar);
        return { ...row, avatar };
      } catch {
        // 单个头像票据失效时保留该行，不能让整张用户表加载失败。
        return { ...row, avatar: null };
      }
    }),
  );
  return { blobUrls, rows: hydratedRows };
}

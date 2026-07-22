interface UserAvatarRow {
  avatar: null | string;
  avatarMediaRef?: null | string;
}

export async function hydrateUserAvatarRows<T extends UserAvatarRow>(
  rows: T[],
  resolveAvatar: (mediaRef: string) => Promise<string>,
): Promise<{ blobUrls: string[]; rows: T[] }> {
  const blobUrls: string[] = [];
  const hydratedRows = await Promise.all(
    rows.map(async (row) => {
      if (!row.avatarMediaRef) return row;
      try {
        const avatar = await resolveAvatar(row.avatarMediaRef);
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

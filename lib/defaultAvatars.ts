/** System default avatars (public static SVGs). ENG-106 */
export const DEFAULT_AVATAR_COUNT = 16;

export const DEFAULT_AVATAR_PATHS: readonly string[] = Array.from(
  { length: DEFAULT_AVATAR_COUNT },
  (_, i) => `/avatars/default-${String(i + 1).padStart(2, "0")}.svg`
);

export function isDefaultAvatarPath(url: string): boolean {
  return /^\/avatars\/default-(0[1-9]|1[0-6])\.svg$/i.test(url.trim());
}

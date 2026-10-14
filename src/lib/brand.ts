/** Product brand — display name and stick/export prefixes. */

export const BRAND = "SETBUILDER";

/** Previous product name; still recognized on sticks and in old localStorage. */
export const BRAND_LEGACY = "SETFORM";

export const BRAND_PLAYLIST_PREFIX = `${BRAND} - `;
export const BRAND_PLAYLIST_PREFIX_LEGACY = `${BRAND_LEGACY} - `;

export const BACKUP_DIR = `${BRAND}-Backup`;
export const BACKUP_DIR_LEGACY = `${BRAND_LEGACY}-Backup`;

export const SIDECAR_DIR = BRAND;
export const SIDECAR_DIR_LEGACY = BRAND_LEGACY;

export const REKORDBOX_XML_NAME = `${BRAND}-rekordbox.xml`;

export function isBrandPlaylistName(name: string): boolean {
  return (
    name.startsWith(BRAND_PLAYLIST_PREFIX) ||
    name.startsWith(BRAND_PLAYLIST_PREFIX_LEGACY)
  );
}

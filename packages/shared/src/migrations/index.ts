export {
  WEB_STORAGE_KEY_V2,
  WEB_STORAGE_KEY_V3,
  LEGACY_WEB_STORAGE_KEY,
  ORG_STORAGE_KEY,
  SHOP_PROFILE_STORAGE_KEY,
  SQLITE_V3_MIGRATIONS,
  emptyLocalDb,
  mergeOrganizationProfile,
  migrateRecordToV3,
  safeMigrateRecordToV3,
  type LegacyShopProfile,
  type MigrationResult,
} from "./v3";

export {
  SQLITE_V4_MIGRATIONS,
  migrateRecordToV4,
  safeMigrateRecordToV4,
} from "./v4";

export { createGlobalId } from "../ids/global-id";

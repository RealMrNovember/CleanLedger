/**
 * Merkezi uygulama yapılandırması.
 * Vite build sırasında VITE_* değişkenleri varsa onları kullanır;
 * yoksa production için güvenli varsayılanları uygular (.exe tek başına çalışsın diye).
 */
function envString(key: keyof ImportMetaEnv, fallback: string): string {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function envUrl(key: keyof ImportMetaEnv, fallback: string): string {
  return envString(key, fallback).replace(/\/$/, "");
}

export const appConfig = {
  licenseApiUrl: envUrl("VITE_LICENSE_API_URL", "https://license.cicibyte.com"),
  licenseAppCode: envString("VITE_LICENSE_APP_CODE", "cleanledger"),
  licenseApiKey: envString(
    "VITE_LICENSE_API_KEY",
    "Cicibyte_X92kLpQ84mNz_2026!"
  ),
  authApiUrl: envUrl(
    "VITE_AUTH_API_URL",
    "https://cleanledger.cicibyte.com/api/auth.php"
  ),
  syncApiUrl: envUrl(
    "VITE_SYNC_API_URL",
    import.meta.env.PROD
      ? "https://cleanledger.cicibyte.com/api/sync.php"
      : "/api/sync.php"
  ),
  webAppUrl: envString(
    "VITE_WEB_APP_URL",
    "https://cleanledger.cicibyte.com"
  ),
  companyUrl: envString("VITE_COMPANY_URL", "https://www.cicibyte.com"),
} as const;

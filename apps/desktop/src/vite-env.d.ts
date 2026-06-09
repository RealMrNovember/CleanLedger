/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LICENSE_API_URL?: string;
  readonly VITE_LICENSE_APP_CODE?: string;
  readonly VITE_LICENSE_API_KEY?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_SYNC_API_URL?: string;
  readonly VITE_WEB_APP_URL?: string;
  readonly VITE_COMPANY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

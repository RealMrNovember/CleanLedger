/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_LICENSE_API_URL?: string;
  readonly VITE_LICENSE_APP_CODE?: string;
  readonly VITE_LICENSE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "@tauri-apps/plugin-sql" {
  interface SqlExecuteResult {
    lastInsertId?: number;
    rowsAffected?: number;
  }
  interface SqlDatabase {
    execute(query: string, bindValues?: unknown[]): Promise<SqlExecuteResult>;
    select<T>(query: string, bindValues?: unknown[]): Promise<T[]>;
  }
  const Database: {
    load(name: string): Promise<SqlDatabase>;
  };
  export default Database;
}

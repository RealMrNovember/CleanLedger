import {
  SQLITE_REQUIRED_COLUMNS,
  SQLITE_REQUIRED_TABLES,
  type SqliteSchemaReport,
} from "@cleanledger/shared/migrations";

export type DatabaseInitPhase =
  | "idle"
  | "waiting_session"
  | "diagnosing"
  | "migrating"
  | "ready"
  | "corrupted"
  | "recovering";

export interface SystemDiagnosticReport {
  phase: DatabaseInitPhase;
  sessionReady: boolean;
  tenantId: string | null;
  tauriPath: string | null;
  physicalPath: string | null;
  schema: SqliteSchemaReport;
  attempt: number;
  compliant: boolean;
}

type TableInfoRow = { name?: string; Name?: string };

export type DatabaseGateDeps = {
  isTauri: () => boolean;
  isSessionActive: () => boolean;
  waitForSession: () => Promise<void>;
  getTenantId: () => string | null;
  getTenantEmail: () => string | null;
  resolvePhysicalPath: (tauriPath: string) => Promise<string>;
  buildTenantPath: (tenantId: string) => string;
  runMigrations: () => Promise<void>;
  bruteForceMigrations: (db: {
    execute?: (q: string, b?: unknown[]) => Promise<unknown>;
    select: <T>(q: string, b?: unknown[]) => Promise<T[]>;
  }) => Promise<void>;
  openInnerDb: () => Promise<{
    select: <T>(q: string, b?: unknown[]) => Promise<T[]>;
  }>;
  nuclearReset: (organizationEmail: string) => Promise<void>;
  fullTenantBootstrap: (tenantId: string, organizationEmail: string) => Promise<void>;
  debug: (...args: unknown[]) => void;
};

const MAX_DIAGNOSTIC_ATTEMPTS = 3;

function columnName(row: TableInfoRow): string {
  return (row.name ?? row.Name ?? "").trim();
}

export function createDatabaseInitializer() {
  let deps: DatabaseGateDeps | null = null;
  let phase: DatabaseInitPhase = "idle";
  let attempt = 0;
  let ready = false;
  let bootstrapDepth = 0;
  let diagnosticLock: Promise<void> | null = null;
  let readyWaiters: Array<() => void> = [];
  let lastReport: SystemDiagnosticReport | null = null;
  let corruptedTenantEmail: string | null = null;

  function setDeps(next: DatabaseGateDeps): void {
    deps = next;
  }

  function reset(): void {
    phase = "idle";
    attempt = 0;
    ready = false;
    diagnosticLock = null;
    readyWaiters = [];
    lastReport = null;
    corruptedTenantEmail = null;
    deps?.debug("[DatabaseInitializer] reset");
  }

  function markCorrupted(organizationEmail: string): void {
    phase = "corrupted";
    corruptedTenantEmail = organizationEmail;
    deps?.debug("[DatabaseInitializer] tenant DB bozuk olarak işaretlendi", {
      organizationEmail,
      corruptedTenantEmail,
    });
  }

  function getCorruptedTenantEmail(): string | null {
    return corruptedTenantEmail;
  }

  function markReady(report: SystemDiagnosticReport): void {
    phase = "ready";
    ready = true;
    lastReport = report;
    deps?.debug("[DatabaseInitializer] kapı açıldı — sistem hazır", {
      tenantId: report.tenantId,
      compliant: report.compliant,
    });
    for (const resolve of readyWaiters) resolve();
    readyWaiters = [];
  }

  function isReady(): boolean {
    return ready && phase === "ready";
  }

  function getPhase(): DatabaseInitPhase {
    return phase;
  }

  function getLastReport(): SystemDiagnosticReport | null {
    return lastReport;
  }

  function isCorrupted(): boolean {
    return phase === "corrupted";
  }

  async function inspectSchema(db: {
    select: <T>(q: string, b?: unknown[]) => Promise<T[]>;
  }): Promise<SqliteSchemaReport> {
    const tables = await db.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableSet = new Set(tables.map((t) => t.name));
    const columnCache = new Map<string, Set<string>>();

    async function columnExists(table: string, column: string): Promise<boolean> {
      if (!tableSet.has(table)) return false;
      let cols = columnCache.get(table);
      if (!cols) {
        const rows = await db.select<TableInfoRow>(`PRAGMA table_info(${table})`);
        cols = new Set(rows.map(columnName).filter(Boolean));
        columnCache.set(table, cols);
      }
      return cols.has(column);
    }

    const missingTables: string[] = [];
    const missingColumns: string[] = [];

    for (const table of SQLITE_REQUIRED_TABLES) {
      if (!tableSet.has(table)) {
        missingTables.push(table);
        continue;
      }
      const required = SQLITE_REQUIRED_COLUMNS[table];
      if (!required) continue;
      for (const column of required) {
        if (!(await columnExists(table, column))) {
          missingColumns.push(`${table}.${column}`);
        }
      }
    }

    return {
      missingTables,
      missingColumns,
      compliant: missingTables.length === 0 && missingColumns.length === 0,
    };
  }

  async function buildDiagnosticReport(
    db: { select: <T>(q: string, b?: unknown[]) => Promise<T[]> },
    tenantId: string,
    tauriPath: string,
    physicalPath: string
  ): Promise<SystemDiagnosticReport> {
    const schema = await inspectSchema(db);
    return {
      phase,
      sessionReady: true,
      tenantId,
      tauriPath,
      physicalPath,
      schema,
      attempt,
      compliant: schema.compliant,
    };
  }

  async function runSelfDiagnostic(): Promise<SystemDiagnosticReport> {
    if (!deps) throw new Error("DatabaseInitializer deps not wired");
    if (!deps.isTauri()) {
      const empty: SystemDiagnosticReport = {
        phase: "ready",
        sessionReady: true,
        tenantId: null,
        tauriPath: null,
        physicalPath: null,
        schema: { missingTables: [], missingColumns: [], compliant: true },
        attempt: 0,
        compliant: true,
      };
      markReady(empty);
      return empty;
    }

    phase = "waiting_session";
    await deps.waitForSession();
    const tenantId = deps.getTenantId();
    const tenantEmail = deps.getTenantEmail();
    if (!tenantId || !tenantEmail) {
      throw new Error("DB_SESSION_REQUIRED");
    }

    const tauriPath = deps.buildTenantPath(tenantId);
    const physicalPath = await deps.resolvePhysicalPath(tauriPath);
    phase = "diagnosing";
    deps.debug("[DatabaseInitializer] self-diagnostic başladı", {
      tenantId,
      tauriPath,
      physicalPath,
      attempt,
    });

    const db = await deps.openInnerDb();
    let report = await buildDiagnosticReport(db, tenantId, tauriPath, physicalPath);

    if (!report.compliant) {
      phase = "migrating";
      deps.debug("[DatabaseInitializer] şema uyumsuz — migration tetikleniyor", {
        missingTables: report.schema.missingTables,
        missingColumns: report.schema.missingColumns,
      });
      await deps.runMigrations();
      await deps.bruteForceMigrations(db);
      report = await buildDiagnosticReport(db, tenantId, tauriPath, physicalPath);
    }

    if (!report.compliant) {
      throw new Error(
        `Schema non-compliant after migration: ${report.schema.missingColumns.join(", ")}`
      );
    }

    return report;
  }

  async function runDiagnosticWithRetry(): Promise<void> {
    if (!deps) throw new Error("DatabaseInitializer deps not wired");
    if (!deps.isTauri()) {
      markReady({
        phase: "ready",
        sessionReady: true,
        tenantId: null,
        tauriPath: null,
        physicalPath: null,
        schema: { missingTables: [], missingColumns: [], compliant: true },
        attempt: 0,
        compliant: true,
      });
      return;
    }

    const tenantEmail = deps.getTenantEmail();
    const tenantId = deps.getTenantId();
    if (!tenantEmail || !tenantId) return;

    for (attempt = 1; attempt <= MAX_DIAGNOSTIC_ATTEMPTS; attempt++) {
      try {
        const report = await runSelfDiagnostic();
        markReady(report);
        return;
      } catch (err) {
        deps.debug("[DatabaseInitializer] diagnostic denemesi başarısız", {
          attempt,
          err,
        });
        if (attempt < MAX_DIAGNOSTIC_ATTEMPTS) {
          await deps.runMigrations();
          continue;
        }
        phase = "recovering";
        markCorrupted(tenantEmail);
        await deps.nuclearReset(tenantEmail);
        await deps.fullTenantBootstrap(tenantId, tenantEmail);
        const db = await deps.openInnerDb();
        const tauriPath = deps.buildTenantPath(tenantId);
        const physicalPath = await deps.resolvePhysicalPath(tauriPath);
        const report = await buildDiagnosticReport(
          db,
          tenantId,
          tauriPath,
          physicalPath
        );
        if (!report.compliant) {
          throw new Error("DatabaseInitializer: nuclear reset sonrası şema hâlâ uyumsuz");
        }
        markReady(report);
        return;
      }
    }
  }

  async function ensureReady(): Promise<void> {
    if (!deps?.isTauri()) return;
    if (isReady()) return;
    if (bootstrapDepth > 0) return;

    if (!diagnosticLock) {
      diagnosticLock = runDiagnosticWithRetry().finally(() => {
        diagnosticLock = null;
      });
    }
    await diagnosticLock;
  }

  async function passGate<T>(operation: () => Promise<T>): Promise<T> {
    if (!deps?.isTauri()) return operation();
    if (bootstrapDepth > 0) return operation();
    if (!deps.isSessionActive()) {
      await deps.waitForSession();
    }
    if (!isReady()) {
      if (diagnosticLock) {
        deps.debug(
          "[DatabaseInitializer] self-diagnostic devam ediyor — sorgu kuyrukta"
        );
        await diagnosticLock;
      } else {
        deps.debug("[DatabaseInitializer] kapı kapalı — sorgu kuyrukta");
        await ensureReady();
      }
    }
    return operation();
  }

  function isBootstrapActive(): boolean {
    return bootstrapDepth > 0;
  }

  async function withBootstrapBypass<T>(operation: () => Promise<T>): Promise<T> {
    bootstrapDepth++;
    try {
      return await operation();
    } finally {
      bootstrapDepth--;
    }
  }

  function waitUntilReady(): Promise<void> {
    if (isReady() || !deps?.isTauri()) return Promise.resolve();
    return new Promise((resolve) => {
      readyWaiters.push(resolve);
    });
  }

  return {
    setDeps,
    reset,
    ensureReady,
    passGate,
    withBootstrapBypass,
    waitUntilReady,
    isReady,
    getPhase,
    getLastReport,
    isCorrupted,
    getCorruptedTenantEmail,
    isBootstrapActive,
    runSelfDiagnostic,
    MAX_DIAGNOSTIC_ATTEMPTS,
  };
}

export const databaseInitializer = createDatabaseInitializer();

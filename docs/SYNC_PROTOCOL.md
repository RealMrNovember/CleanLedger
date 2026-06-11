# CleanLedger Sync Protokolü (org / v2)

**Endpoint:** `GET|POST /api/sync.php`  
**Protocol:** `org` (önerilen) veya `v2`

## Kimlik doğrulama

Tüm isteklerde `token` query parametresi veya JSON gövdesinde oturum token'ı gerekir.

## Aksiyonlar

| action | Method | Açıklama |
|--------|--------|----------|
| `pull` | GET | `since` watermark sonrası değişiklikler; `bootstrap=1` ile tam snapshot |
| `push` | POST | `changes[]` batch veya geçiş dönemi `fullSnapshot` |
| `changes` | GET | Yalnızca change log (snapshot yok) — hafif polling |

### `changes` (Faz 1)

```
GET /api/sync.php?action=changes&protocol=org&token=...&since=2026-06-10T12:00:00.000Z
```

Yanıt:

```json
{
  "success": true,
  "organizationId": "firma@ornek.com",
  "serverUpdatedAt": "2026-06-10T12:05:00.000Z",
  "changes": [ /* SyncChange[] */ ],
  "count": 3
}
```

İstemci: `pullSyncChanges(since)` — `apps/*/src/lib/sync-api.ts`

`pull` ile fark: `changes` snapshot döndürmez; yalnızca incremental güncelleme için uygundur.

### `pull`

- `since` boş + `bootstrap=1` → tam `snapshot`
- `since` dolu → yalnızca `changes[]`

### `push`

- `protocol=org`: `{ changes: SyncChange[], updatedAt }`
- 409: sunucu daha yeni → `changes` / `snapshot` ile conflict yanıtı

## Merge

`packages/shared/src/sync/merge.ts` — LWW, `globalId` + `organizationId` eşleştirme.

## Depolama

- Dosya: `data/sync/orgs/{normalized-email}.json`
- Veya MySQL `tenant_sync` (ortam değişkenine göre)

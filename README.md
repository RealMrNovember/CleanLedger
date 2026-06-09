# CleanLedger

Professional Dry Cleaning Management System — [Cicibyte Corp.](https://www.cicibyte.com)

| Uygulama | Dizin | Açıklama |
|----------|-------|----------|
| **Desktop** | `apps/desktop` | Tauri v2 + React — offline-first POS |
| **Web** | `apps/web` | Tanıtım sitesi + üyelik portalı iskeleti |

## Dokümantasyon

- [PROJE_DOSYASI.md](./PROJE_DOSYASI.md) — Tam ürün spesifikasyonu

## Geliştirme

```bash
# Masaüstü (Tauri + React)
cd apps/desktop && npm install && npm run dev

# Web vitrin
cd apps/web && npm install && npm run dev
```

## CI/CD

`main` dalına her push → GitHub Actions Windows'ta `.exe` derler ve [Releases](https://github.com/RealMrNovember/CleanLedger/releases/tag/latest-build) sayfasına yükler.

## Lisans

Merkezi lisans: `license.cicibyte.com` (`app_code: cleanledger`) — Faz 2

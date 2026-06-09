# CleanLedger Web

Tanıtım sitesi — `cleanledger.cicibyte.com`

## Geliştirme

```bash
cd apps/web
npm install
npm run dev
```

## Canlıya alma (sadece cleanledger dizini)

Nginx bu site için `apps/web` klasörünü servis eder. Build çıktısını oraya kopyalayın:

```bash
cd apps/web
npm run deploy:live
```

Bu komut `dist/` içeriğini `apps/web/index.html` ve `apps/web/assets/` olarak yazar.
Sunucu veya diğer projelere dokunulmaz.

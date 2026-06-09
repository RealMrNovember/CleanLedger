# CleanLedger Web

Tanıtım sitesi ve üyelik portalı iskeleti — `cleanledger.cicibyte.com`

## Geliştirme

```bash
cd apps/web
npm install
npm run dev
```

## Production build

```bash
npm run build
# Çıktı: dist/
```

VDS'de site köküne deploy:

```bash
npm run build
rsync -av dist/ /www/wwwroot/cleanledger.cicibyte.com/
```

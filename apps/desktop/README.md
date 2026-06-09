# CleanLedger Desktop

Tauri v2 + React + Vite masaüstü uygulaması (MVP Faz 1).

## Geliştirme

```bash
cd apps/desktop
npm install

# Tarayıcıda önizleme (localStorage SQLite simülasyonu)
npm run dev

# Tauri masaüstü (Rust gerekli)
npm run tauri:dev
```

## Windows .exe Derleme

Rust kurulu Windows makinede:

```bash
npm run tauri:build
```

Çıktı: `src-tauri/target/release/bundle/`

## Yapı

```
src/
├── components/
│   ├── layout/     AppHeader
│   ├── pos/        CustomerPanel, ProductCatalog, CartPanel
│   └── ui/         shadcn: Button, Input, Card, Dialog
├── db/             Drizzle şema + SQLite client
├── screens/        PosScreen (ana ekran)
└── lib/            utils, product-icons
```

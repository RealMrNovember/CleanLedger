# Termal Yazdırma Araştırma Raporu — CleanLedger Faz 9

**Tarih:** 2026-06-10  
**Durum:** İlk uygulama tamamlandı (CSS + ESC/POS); desktop native silent print eklendi

## 1. Problem özeti

Müşteri ortamında `window.print()` + HTML/CSS (`@page 80mm`) ile termal yazıcıdan **boş sayfa** basılması bildirildi. Olası nedenler:

| Neden | Açıklama |
|-------|----------|
| Sürücü modu | Windows'ta "Generic / Text Only" yerine grafik sürücü + HTML render uyumsuzluğu |
| Görünürlük kuralları | `body * { visibility: hidden }` — yalnızca `#cleanledger-receipt` görünür; DOM dışı kalırsa boş çıktı |
| Genişlik | 80mm CSS ile 58mm rulo uyumsuzluğu |
| Logo / web font | Termal sürücü SVG veya harici font yükleyemeyebilir |
| Dialog | Her yazdırmada sistem dialog — operasyonel yavaşlık |

## 2. Mevcut çözüm (uygulandı)

```
packages/shared/src/print/
├── escpos.ts              → raw ESC/POS byte üretimi (müşteri fişi + ürün etiketi)
├── print-adapters.ts      → ortak payload oluşturma
└── product-label.ts       → etiket veri modeli

apps/*/src/lib/
├── thermal-settings.ts    → 58mm / 80mm profil + (desktop) port
└── thermal-print.ts       → tarayıcı yazdır + WebSerial (web) / Tauri ESC/POS (desktop)

apps/desktop/src-tauri/src/
└── print.rs               → print_escpos (serial + device file, silent)

apps/*/src/components/pos/
├── ReceiptPrintDialog.tsx → müşteri fişi, termal genişlik, ESC/POS (web)
└── ProductLabelPrintDialog.tsx → kalem bazlı etiketler
```

### Fiş türleri

| Tür | İçerik | Tetikleyici |
|-----|--------|-------------|
| Müşteri fişi | Firma, sipariş no, kalemler, toplam | Sipariş sonrası "Müşteri Fişi" |
| Ürün etiketi | Ürün no, müşteri, teslim, ürün/hizmet | Sipariş sonrası "Ürün Etiketi" |

### CSS iyileştirmeleri

- `#cleanledger-receipt[data-thermal-width="58"]` — 58mm profil
- `print-color-adjust: exact` — arka plan/metin kaybını azaltır
- Ayarlar → Genel → Termal Yazıcı paneli

### ESC/POS

- Web (Chrome/Edge): **WebSerial** ile USB termal (`9600 baud`) — kullanıcı port seçer
- Desktop (Tauri): **native ESC/POS** — `print_escpos` komutu; serial port veya `/dev/usb/lp0`; başarılıysa dialog yok
- Türkçe karakterler ASCII transliterasyon ile güvenli modda gönderilir

## 3. Önerilen yol haritası

| Öncelik | Adım | Platform |
|---------|------|----------|
| P0 | CSS print + 58/80mm profil | Web + Desktop ✅ |
| P0 | Müşteri fişi / ürün etiketi ayrımı | ✅ |
| P1 | WebSerial ESC/POS | Web ✅ (deneysel) |
| P1 | Tauri `print_escpos` (serial + lp device) | Desktop ✅ |
| P2 | Silent print (dialog'suz) | Desktop ✅ (ESC/POS yolu) |
| P2 | CP857 / UTF-8 kod sayfası seçimi | ESC/POS |
| P3 | PDF → raw fallback | Her iki platform |

## 4. Test matrisi

| Yazıcı | Bağlantı | Web | Desktop |
|--------|----------|-----|---------|
| Epson TM-T20 | USB + ESC/POS | WebSerial | serial/COM veya lp |
| XP-58 | USB | 58mm profil + WebSerial | 58mm + native ESC/POS |
| Generic termal | Windows grafik sürücü | CSS print | CSS print fallback |

**Manuel test:** Sipariş oluştur → Müşteri Fişi → önizleme dolu mu → yazdır. Desktop'ta Ayarlar → Termal → port tanımla. ESC/POS başarısızsa CSS fallback açılır.

## 5. Bilinen kısıtlar

- Safari WebSerial desteklemez → yalnızca CSS print
- Silent print web'de mümkün değil (tarayıcı güvenliği)
- Çoklu cihaz sync sonrası sipariş numarası çakışması sunucuda `sync-org.php` ile çözülür (Faz 7.1)

---

*İlgili kod: `packages/shared/src/print/`, `apps/web/api/lib/order-numbers.php`*

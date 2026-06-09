# CleanLedger — Kuru Temizleme Yönetim Sistemi

> **Proje Dosyası v1.0**  
> **Geliştirici:** [Cicibyte Corp.](https://www.cicibyte.com)  
> **Ürün Kodu:** `cleanledger`  
> **Lisans Sunucusu:** [license.cicibyte.com](https://license.cicibyte.com)  
> **Dağıtım:** Masaüstü uygulama (Windows öncelikli) + Bulut senkronizasyon  
> **Mimari Referans:** GarageLedger (iki katmanlı lisans + offline-first operasyon)

---

## İçindekiler

1. [Yönetici Özeti](#1-yönetici-özeti)
2. [Problem ve Fırsat](#2-problem-ve-fırsat)
3. [Ürün Felsefesi ve Tasarım İlkeleri](#3-ürün-felsefesi-ve-tasarım-ilkeleri)
4. [Hedef Kullanıcı ve Persona](#4-hedef-kullanıcı-ve-persona)
5. [Sistem Mimarisi](#5-sistem-mimarisi)
6. [Teknoloji Yığını](#6-teknoloji-yığını)
7. [Lisans ve Abonelik Modeli](#7-lisans-ve-abonelik-modeli)
8. [Offline-First ve Senkronizasyon](#8-offline-first-ve-senkronizasyon)
9. [Modüller ve Özellikler](#9-modüller-ve-özellikler)
10. [Ekranlar ve Kullanıcı Akışları](#10-ekranlar-ve-kullanıcı-akışları)
11. [Veri Modeli](#11-veri-modeli)
12. [API Tasarımı](#12-api-tasarımı)
13. [Güvenlik](#13-güvenlik)
14. [Yazdırma ve Donanım Entegrasyonları](#14-yazdırma-ve-donanım-entegrasyonları)
15. [Faz Planı (MVP → ERP)](#15-faz-planı-mvp--erp)
16. [24 Saatlik Sprint Planı (İlk Müşteri)](#16-24-saatlik-sprint-planı-ilk-müşteri)
17. [Satış ve Fiyatlandırma Stratejisi](#17-satış-ve-fiyatlandırma-stratejisi)
18. [Başarı Metrikleri](#18-başarı-metrikleri)
19. [Riskler ve Azaltma](#19-riskler-ve-azaltma)
20. [Dizin Yapısı](#20-dizin-yapısı)

---

## 1. Yönetici Özeti

**CleanLedger**, kuru temizleme işletmeleri için tasarlanmış, **görsel tabanlı**, **offline-first** ve **merkezi lisanslı** bir sipariş yönetim sistemidir.

Geleneksel kuru temizleme yazılımlarının aksine CleanLedger:

- Klavye kullanımını minimuma indirir — ürünler **büyük ikonlarla** seçilir
- İnternet kesilse bile çalışmaya devam eder
- Lisans yönetimi **license.cicibyte.com** üzerinden merkezi yapılır (GarageLedger ile aynı altyapı)
- İlk kurulumda otomatik **14 günlük deneme** başlar
- Cicibyte admin panelinden **ömür boyu lisans** veya süre uzatma tek tıkla yapılır

**İlk hedef müşteri:** Shargiya ve Eda'nın kuru temizleme firması — mevcut yazılımın yeni bilgisayara taşınması için istenen ~200$ yerine, modern bir sistem 500$ ömür boyu lisans olarak sunulacak.

**Uzun vadeli vizyon:** Tek müşterilik yazılım değil; Türkiye ve Azerbaycan pazarına yönelik ticari bir **kuru temizleme sektörü ERP** ürünü.

---

## 2. Problem ve Fırsat

### Mevcut Durum (Sahada Gözlemlenen)

| Sorun | Etki |
|-------|------|
| Eski Windows arayüzü, küçük yazılar | Personel eğitimi zor, hata oranı yüksek |
| Yeni bilgisayara veri taşıma ücreti (~200$) | İşletme sahibi mağdur, güvensizlik |
| İnternet bağımlılığı (çoğu rakipte) | Kesintide iş durur |
| Görsel olmayan ürün seçimi | Yavaş sipariş girişi |
| Müşteri bildirimi yok veya manuel | Telefon trafiği, unutulan teslimatlar |

### CleanLedger Fırsatı

```
Eski yazılım taşıma maliyeti  →  200$
CleanLedger ömür boyu lisans  →  500$
Ek değer: offline, WhatsApp, QR, hasar fotoğrafı, modern UI
```

İlk müşteri ürün geliştirme maliyetini karşılar; sonraki satışlar saf kârdır.

---

## 3. Ürün Felsefesi ve Tasarım İlkeleri

### Altın Kural

> Bilgisayar kullanmayı bilmeyen bir esnaf, **5 dakika içinde** ilk siparişi oluşturabilmeli.

### Yapılmayacaklar

| ❌ Yok | ✅ Var |
|--------|--------|
| Menü menü dolaşmak | Tek ekranda sipariş |
| Karmaşık formlar | Büyük dokunmatik-dostu butonlar |
| Küçük yazılar (12px altı) | Minimum 16px, başlıklar 24px+ |
| Windows XP görünümü | Modern pastel UI, Cicibyte marka dili |
| Klavye zorunluluğu | İkon + tek tık işlemler |

### Görsel Dil

| Öğe | Değer |
|-----|-------|
| Ana renk | Mint yeşili `#4ECDC4` + güven mavisi `#45B7D1` |
| Arka plan | Beyaz / açık gri `#F8FAFB` |
| Vurgu | Yumuşak turuncu `#FFB347` (uyarılar, bekleyen) |
| Başarı | Yeşil `#2ECC71` (hazır, teslim) |
| Tipografi | Inter veya Nunito — okunaklı, yuvarlak |
| İkonlar | Lucide + özel kıyafet illüstrasyonları (SVG) |
| Buton boyutu | Minimum 48×48px dokunma alanı |
| Köşe yuvarlaklığı | 12–16px (modern, sıcak his) |

### Ses ve Geri Bildirim

- Başarılı işlemde kısa onay sesi (açılıp kapatılabilir)
- Kritik işlemlerde (silme, iptal) büyük onay diyaloğu
- Renk + ikon + kısa Türkçe mesaj üçlüsü (sadece renge güvenme)

---

## 4. Hedef Kullanıcı ve Persona

### Persona 1: İşletme Sahibi — "Ahmet Bey" (58 yaş)

- Bilgisayarı yıllarca aynı programla kullanmış
- Yeni bilgisayar almak istiyor ama veri taşıma ücretinden rahatsız
- Telefonu WhatsApp için kullanıyor, Excel bilmiyor
- **İhtiyaç:** Sabah açıp günlük ciroyu görmek, personeli kontrol etmek

### Persona 2: Tezgahtar — "Fatma Hanım" (35 yaş)

- Gün boyu sipariş alıyor, telefon numarası soruyor
- Hızlı olması lazım — sırada müşteri bekliyor
- **İhtiyaç:** İkona bas, fiyat çıksın, fiş bassın

### Persona 3: Cicibyte Admin — "Sen"

- license.cicibyte.com panelinden lisans yönetiyor
- Trial → Lifetime geçişi tek tık
- **İhtiyaç:** Uzaktan müşteri desteği, lisans kontrolü

---

## 5. Sistem Mimarisi

GarageLedger ile aynı **iki katmanlı** mimari:

```
┌─────────────────────────────────────────────────────────────────┐
│                    license.cicibyte.com                         │
│  (Merkez — Kaynak: clients, licenses, max_devices, faturalama) │
│  app_code: cleanledger                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /trial, /check, /activate
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CleanLedger Masaüstü Uygulaması                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ React UI    │  │ Tauri Shell  │  │ SQLite (yerel)      │   │
│  │ (offline)   │◄─┤ + Sync Agent │─►│ Şifreli lisans cache│   │
│  └─────────────┘  └──────┬───────┘  └─────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │ İnternet varsa: push/pull
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           cleanledger.cicibyte.com (Operasyonel API)            │
│  NestJS + PostgreSQL — yedekleme, çok cihaz, web panel (v1.1+) │
└─────────────────────────────────────────────────────────────────┘
```

### Katman Sorumlulukları

| Katman | Sorumluluk | Veri |
|--------|------------|------|
| **Merkez Lisans** | Trial, aktivasyon, süre, cihaz kotası | `license.cicibyte.com` DB |
| **Masaüstü (yerel)** | Günlük operasyon, offline çalışma | SQLite |
| **Operasyonel Bulut** | Yedekleme, çok şube, uzaktan rapor | PostgreSQL |

> **MVP (v1.0):** Yerel SQLite + lisans API yeterli. Bulut sync v1.1'e ertelenir.

---

## 6. Teknoloji Yığını

GarageLedger ekosistemiyle uyumlu, hızlı geliştirme odaklı seçim:

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| **Masaüstü kabuğu** | Tauri 2.x | Electron'dan hafif, küçük .exe, Windows dostu |
| **Arayüz** | React 19 + TypeScript | GarageLedger ile paylaşılan bilgi, hızlı UI |
| **Stil** | Tailwind CSS 4 + shadcn/ui | Modern bileşenler, hızlı prototip |
| **Yerel DB** | SQLite + SQLCipher | Offline, şifreli, tek dosya yedek |
| **ORM (yerel)** | Drizzle ORM | Hafif, TypeScript-native |
| **Operasyonel API** | NestJS 11 | GarageLedger/SGMS ile tutarlı |
| **Bulut DB** | PostgreSQL 16 | Güvenilir, JSON desteği |
| **Lisans client** | `@cicibyte/license-client` (paylaşımlı paket) | GarageLedger protokolü |
| **Yazdırma** | ESC/POS (termal) + PDF (A4) | Fiş ve rapor |
| **Paketleme** | Tauri bundler | .exe + otomatik güncelleme (v1.1) |

### Neden Flutter/.NET Değil?

Kullanıcı notlarında Flutter + .NET 8 önerilmişti. Cicibyte ürün ailesi (GarageLedger, SGMS) **React + Node + license API** üzerine kurulu. CleanLedger aynı `license-client` paketini, aynı admin panelini ve aynı deploy deneyimini kullanmalı — bakım maliyeti düşer, ikinci ürün satışı hızlanır.

---

## 7. Lisans ve Abonelik Modeli

### license.cicibyte.com Entegrasyonu

| Parametre | Değer |
|-----------|-------|
| `app_code` | `cleanledger` |
| `hwid` | Kurulumda üretilen UUID (`installationId`) — firma başına sabit anchor |
| API Base | `https://license.cicibyte.com/api/v1/license` |
| Header | `X-Api-Key: <LICENSE_API_KEY>` |

### Lisans Tipleri

| Tip | Süre | max_devices | Hedef |
|-----|------|-------------|-------|
| `trial` | 14 gün (otomatik) | 1 | Yeni kayıt |
| `basic` | 1 yıl | 1 | Küçük dükkan |
| `professional` | 3 yıl | 3 | Orta ölçek + personel |
| `lifetime` | 2099-12-31 | 3 | İlk müşteri / premium |

### Kayıt ve Lisans Akışı

```
1. Uygulama ilk açılır
2. "Hesap Oluştur" ekranı:
   - Firma Adı, Yetkili, Telefon, E-posta, Vergi No, Şehir
3. installationId (UUID) üretilir → yerel SQLite'a yazılır
4. POST /trial { app_code: "cleanledger", hwid: installationId }
5. Dönen token şifreli olarak yerel cache'e kaydedilir
6. Ana ekrana yönlendirilir — 14 gün trial aktif

--- Ödeme sonrası (Cicibyte admin) ---

7. license.cicibyte.com → müşteri e-postasını bul
8. Lisans tipi: lifetime, status: active, expires_at: 2099-12-31
9. Müşteri uygulamayı açar (internet gerekli, bir kez)
10. POST /check → yeni token çekilir → artık süre uyarısı yok
```

### Offline Lisans Kontrolü

```
Uygulama açılışı:
├── İnternet VAR  → POST /check → cache güncelle → devam
├── İnternet YOK  → yerel cache'deki expires_at kontrol
│   ├── Süre geçmemiş → devam (offline mod)
│   └── Süre geçmiş   → "İnternet bağlantısı gerekli" uyarısı
└── Cache yok       → ilk kurulum zorunlu online
```

**Grace period:** Son başarılı check'ten itibaren **7 gün** offline tolerans (internet arızası senaryosu).

### Admin Panel İşlemleri (license.cicibyte.com)

- Aktif / Pasif
- Süre uzat
- Ömür boyu yap
- İptal / dondur
- max_devices artır
- Cihaz listesi görüntüle / cihaz kaldır

---

## 8. Offline-First ve Senkronizasyon

### Temel Prensip

> Kuru temizlemeci internet kesildiğinde **iş yapmaya devam etmeli**. Senkronizasyon arka planda, sessizce.

### v1.0 (MVP) — Sadece Yerel

- Tüm veri SQLite'ta
- Manuel yedekleme: "Yedek Al" → `.cleanledger` dosyası (şifreli zip)
- Manuel geri yükleme: "Yedekten Geri Yükle"

### v1.1 — Bulut Senkronizasyon

```
┌──────────────┐     push (değişiklikler)     ┌──────────────┐
│  Cihaz A     │ ───────────────────────────► │  PostgreSQL  │
│  SQLite      │ ◄─────────────────────────── │  (bulut)     │
└──────────────┘     pull (uzak değişiklikler)└──────────────┘
```

- **Conflict resolution:** Son-yazan-kazan + sipariş numarası çakışma koruması
- **Sync tetikleyicileri:** Uygulama açılışı, sipariş kaydı, 5 dk periyodik
- **Sync durumu göstergesi:** Sağ üst köşede küçük bulut ikonu (yeşil/sarı/kırmızı)

---

## 9. Modüller ve Özellikler

### 9.1 Dashboard (Ana Ekran)

İlk açılışta tek bakışta işletme özeti:

| Kart | İçerik |
|------|--------|
| Bugünkü Ciro | Nakit + kart + toplam |
| Bekleyen Sipariş | İşlemde olanlar |
| Hazır Sipariş | Teslim bekleyen |
| Bugün Teslim | Tamamlanan |
| Geciken | Teslim tarihi geçmiş (kırmızı uyarı) |

Hızlı aksiyonlar: `+ Yeni Sipariş` | `Teslim Et` | `Hazır İşaretle`

### 9.2 Hızlı Sipariş Modülü ⭐ (Sistemin Kalbi)

**Sol panel — Müşteri:**
- Telefon numarası (tek klavye girişi — otomatik tamamlama)
- Ad soyad (eski müşteride otomatik dolar)
- Teslim tarihi (varsayılan: +3 gün, büyük takvim)
- Not alanı (opsiyonel)

**Orta panel — Ürün Galerisi:**

Kategoriler (sekme veya kaydırılabilir):

| Kategori | Ürünler |
|----------|---------|
| Günlük Giyim | Gömlek, Pantolon, Etek, Elbise, Kazak, Mont, Ceket |
| Formal | Takım Elbise, Smokin, Abiye |
| Ev Tekstili | Perde, Yorgan, Battaniye, Nevresim, Halı |
| Özel | Gelinlik, Deri, Süet, Ayakkabı, Çanta |

Her ürün: **büyük renkli ikon** + kısa isim. Tıkla → sepete ekle.

**Sağ panel — Sipariş Detayı:**

Her satır için işlem türü (çoklu seçilebilir):

| İşlem | Varsayılan Fiyat* |
|-------|-------------------|
| Kuru Temizleme | Ürüne göre |
| Ütü | Ürün fiyatının %50'si |
| Yıkama | Ürün fiyatının %70'i |
| Leke Çıkarma | +30 TL |
| Ekspres (24 saat) | +%50 |
| Özel Bakım | +%100 |
| Parfümlleme | +15 TL |
| Paketleme (askı + kılıf) | +10 TL |

*Fiyatlar ayarlardan özelleştirilebilir.

**Alt bar:** Ara toplam | İndirim | **TOPLAM** | `Kaydet & Yazdır`

### 9.3 Müşteri Yönetimi

- Telefon ile hızlı arama
- Sipariş geçmişi
- Toplam harcama
- Sadakat puanı (v1.2)
- Notlar (alerji, özel talimat)

### 9.4 Sipariş Takip ve Durumlar

```
Alındı → İşlemde → Hazır → Teslim Edildi
                  ↘ İptal
```

- Durum değişikliği tek tık veya QR okutma
- Filtre: tarih, durum, müşteri, ürün tipi
- Geciken siparişler otomatik vurgu

### 9.5 Teslim Ekranı

1. Müşteri telefonu yazılır
2. Bekleyen siparişler listelenir (büyük kartlar)
3. `Teslim Et & Tahsil Et` → ödeme yöntemi seç → fiş
4. WhatsApp bildirimi (v1.1)

### 9.6 QR / Barkod Sistemi

- Her siparişe benzersiz `CL-2026-00042` formatında numara
- QR kod: sipariş detay URL'si veya iç ID
- Termal fişe QR basımı
- Teslim ve durum güncelleme için QR okuyucu desteği (v1.1)

### 9.7 Kıyafet Hasar Takibi (Fark Yaratan Özellik)

Müşteri ürün bırakırken:

1. Kamera ile fotoğraf çek (webcam veya dosyadan)
2. Hasar işaretle: Yırtık | Eksik Düğme | Sökük | Leke | Yanık | Renk Solması
3. Fotoğraf siparişe bağlanır
4. Teslimde: "Bu hasarlar teslim öncesi kayıtlıydı" ekranı

> Hukuki koruma — rakiplerde yok.

### 9.8 Finans Modülü

| Rapor | Periyot |
|-------|---------|
| Günlük ciro | Bugün |
| Haftalık özet | Son 7 gün |
| Aylık rapor | Takvim ayı |
| Yıllık rapor | Takvim yılı |

Ödeme yöntemi kırılımı: Nakit | Kredi Kartı | Havale/EFT | QR Ödeme

Grafik: günlük ciro çizgi grafiği, en çok satılan ürün pasta grafiği.

### 9.9 Personel Yönetimi (v1.1)

| Rol | Sipariş | Fiyat Değiştir | Rapor | Silme | Ayarlar |
|-----|---------|----------------|-------|-------|---------|
| Sahip (OWNER) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tezgahtar (STAFF) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Muhasebe (ACCOUNTANT) | ❌ | ❌ | ✅ | ❌ | ❌ |

Koltuk kotası: `max_devices` lisans alanından gelir.

### 9.10 WhatsApp / SMS Bildirimleri (v1.1)

| Olay | Mesaj Şablonu |
|------|---------------|
| Sipariş alındı | "Sayın {ad}, {n} parça kıyafetiniz alındı. Teslim: {tarih}. {firma}" |
| Hazır | "Kıyafetleriniz hazır! Teslim alabilirsiniz. {firma}" |
| Teslim edildi | "Teslim tamamlandı. Bizi tercih ettiğiniz için teşekkürler! {firma}" |

### 9.11 Sadakat Sistemi (v1.2)

- Her sipariş: +1 puan
- 10 puan: %20 indirim kuponu
- Ayarlardan açılıp kapatılabilir

### 9.12 AI Destekli Fiyat Önerisi (v1.2 — Opsiyonel)

- Ürün + kumaş tipi → önerilen işlem paketi
- "Bu gelinlik için: Premium Temizlik + Leke Kontrolü — ~1200 TL"
- Firma ayarından açılır/kapanır

### 9.13 Çok Şubeli Yapı (v2.0)

- Şube 1, 2, 3 — tek yönetici paneli
- Şubeler arası rapor karşılaştırma
- Merkezi fiyat listesi + şube override

---

## 10. Ekranlar ve Kullanıcı Akışları

### Ekran Listesi

| # | Ekran | MVP | Açıklama |
|---|-------|-----|----------|
| 1 | Splash + Lisans Kontrol | ✅ | Logo, yükleniyor, lisans doğrulama |
| 2 | Giriş / Kayıt | ✅ | E-posta + şifre |
| 3 | İlk Kurulum Sihirbazı | ✅ | Firma bilgileri, logo yükleme |
| 4 | Dashboard | ✅ | Özet kartlar + hızlı aksiyonlar |
| 5 | Yeni Sipariş | ✅ | 3 panelli ana ekran |
| 6 | Sipariş Listesi | ✅ | Filtreleme, arama |
| 7 | Sipariş Detay | ✅ | Durum, ürünler, hasar fotoğrafları |
| 8 | Teslim Ekranı | ✅ | Telefon → sipariş → tahsilat |
| 9 | Müşteriler | ✅ | Liste + detay |
| 10 | Finans / Raporlar | ✅ | Günlük/haftalık/aylık |
| 11 | Ayarlar | ✅ | Fiyat listesi, firma bilgisi, yazıcı |
| 12 | Yedekleme | ✅ | Manuel yedek al/geri yükle |
| 13 | Personel | v1.1 | Kullanıcı yönetimi |
| 14 | WhatsApp Ayarları | v1.1 | API token, şablonlar |

### Kritik Akış: 60 Saniyede Sipariş

```
Dashboard → [+ Yeni Sipariş]
    → Telefon yaz (5551234567) → "Ayşe Yılmaz" otomatik gelir
    → [Pantolon ikonu] → [Kuru Temizleme] otomatik seçili
    → [Ceket ikonu] → [Ütü] seç
    → Toplam: 150 TL görünür
    → [Kaydet & Yazdır]
    → Termal fiş çıkar, sipariş #CL-2026-00042 oluşur
    → Dashboard'a dön, "Bekleyen: 1" güncellenir
```

**Hedef süre: 60 saniye veya altı.**

---

## 11. Veri Modeli

### Yerel SQLite Şeması (Özet)

```
organizations
├── id, name, owner_name, phone, email, tax_no, city, logo_path
├── installation_id (UUID — license hwid)
├── license_status, license_type, license_expires_at (cache)
└── created_at, updated_at

users
├── id, org_id, email, password_hash, role (OWNER|STAFF|ACCOUNTANT)
└── name, pin_code (hızlı giriş), is_active

customers
├── id, org_id, phone (unique per org), name
├── loyalty_points, notes
└── created_at

product_categories
├── id, org_id, name, sort_order, icon_key

products
├── id, org_id, category_id, name, icon_key
├── base_price, is_active

service_types
├── id, org_id, name, price_modifier_type (fixed|percent)
├── price_modifier_value, icon_key

orders
├── id, org_id, order_number, customer_id
├── status (received|processing|ready|delivered|cancelled)
├── delivery_date, notes, total_amount, discount_amount
├── payment_method, paid_at
├── created_by, created_at, updated_at

order_items
├── id, order_id, product_id
├── service_type_ids (JSON array)
├── unit_price, quantity, subtotal

order_damages
├── id, order_item_id, damage_type, photo_path
├── description, created_at

payments
├── id, order_id, amount, method, paid_at

settings
├── id, org_id, key, value (JSON)

sync_queue (v1.1)
├── id, table_name, record_id, action, payload, synced_at
```

---

## 12. API Tasarımı

### Operasyonel API (cleanledger.cicibyte.com) — v1.1+

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/signup` | Firma + OWNER + trial tetikle |
| POST | `/api/auth/login` | Giriş + lisans check |
| GET | `/api/auth/me` | Oturum + lisans durumu |
| CRUD | `/api/orders` | Sipariş yönetimi |
| CRUD | `/api/customers` | Müşteri yönetimi |
| GET | `/api/reports/daily` | Günlük ciro raporu |
| POST | `/api/sync/push` | Yerel → bulut |
| GET | `/api/sync/pull` | Bulut → yerel |

### Lisans API (mevcut — license.cicibyte.com)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/v1/license/trial` | `{ app_code, hwid }` |
| POST | `/api/v1/license/check` | `{ app_code, hwid }` |
| POST | `/api/v1/license/activate` | `{ app_code, license_key, hwid }` |

**CleanLedger eşlemesi (GarageLedger ile paralel):**

| GarageLedger | CleanLedger |
|--------------|-------------|
| `app_code=garageledger` | `app_code=cleanledger` |
| `licenseAnchorId` | `installationId` |
| `startTrial()` | Kayıt sonrası otomatik |
| `checkLicense()` | Her açılış + 24 saatte bir |

---

## 13. Güvenlik

| Konu | Uygulama |
|------|----------|
| Şifre saklama | bcrypt (cost 12) |
| Yerel DB | SQLCipher şifreleme |
| Lisans token | AES-256-GCM, cihaz anahtarıyla |
| API iletişim | HTTPS zorunlu, TLS 1.2+ |
| Oturum | JWT (kısa ömür) + refresh token |
| Yedek dosyası | Şifreli .cleanledger (AES) |
| PIN girişi | Tezgahtar hızlı giriş (4 haneli, opsiyonel) |

---

## 14. Yazdırma ve Donanım Entegrasyonları

### Termal Fiş Yazıcı (ESC/POS)

```
================================
     [FIRMA ADI]
     Tel: 0555 123 45 67
================================
Fiş No: CL-2026-00042
Tarih: 09.06.2026 14:30
Müşteri: Ayşe Yılmaz
Tel: 0555 987 65 43
Teslim: 12.06.2026
--------------------------------
1x Pantolon - Kuru Temizleme   100
1x Ceket - Ütü                  50
--------------------------------
TOPLAM:                        150 TL
================================
[QR KOD]
================================
```

### Desteklenen Yazıcılar (MVP)

- Epson TM-T20 serisi
- Xprinter XP-58/80
- Generic ESC/POS (USB)

### Barkod/QR Okuyucu

- USB HID (klavye emülasyonu) — ek sürücü gerektirmez
- Sipariş numarası input alanına otomatik düşer

---

## 15. Faz Planı (MVP → ERP)

### Faz 1 — MVP (v1.0) 🎯 Yarın Teslim Hedefi

- [x] Proje dosyası
- [ ] Tauri + React iskelet
- [ ] Kayıt / giriş / trial lisans
- [ ] Dashboard (temel kartlar)
- [ ] Yeni sipariş ekranı (ikon galeri + sepet + fiyat)
- [ ] Müşteri otomatik tamamlama (telefon)
- [ ] Sipariş listesi + durum güncelleme
- [ ] Teslim ekranı
- [ ] Termal fiş yazdırma
- [ ] Günlük ciro raporu
- [ ] Fiyat listesi ayarları
- [ ] Manuel yedekleme
- [ ] Windows .exe paketleme

### Faz 2 — Operasyonel Güç (v1.1) — 2 Hafta

- [ ] Bulut senkronizasyon (PostgreSQL)
- [ ] WhatsApp bildirimleri
- [ ] QR kod üretimi ve okuma
- [ ] Personel rolleri ve koltuk kotası
- [ ] Hasar fotoğrafı modülü
- [ ] license.cicibyte.com'da `cleanledger` app kaydı

### Faz 3 — Büyüme (v1.2) — 1 Ay

- [ ] Sadakat / puan sistemi
- [ ] SMS entegrasyonu
- [ ] AI fiyat önerisi
- [ ] Otomatik güncelleme (Tauri updater)
- [ ] Aylık/yıllık raporlar + PDF export

### Faz 4 — ERP (v2.0) — 3 Ay

- [ ] Çok şubeli yapı
- [ ] Merkezi yönetici web paneli
- [ ] Tedarikçi / kimyasal stok takibi
- [ ] Mobil uygulama (müşteri sipariş takibi)
- [ ] Azerbaycan pazarı (AZ dil desteği)

---

## 16. 24 Saatlik Sprint Planı (İlk Müşteri)

> Gerçekçi MVP — tekerleği yeniden icat etme.

### Saat 0–4: İskelet

- Tauri + React + Tailwind proje oluştur
- SQLite + Drizzle şema migrate
- Auth ekranları (kayıt/giriş)
- license-client entegrasyonu (trial + check)

### Saat 4–10: Çekirdek UI

- Dashboard layout + navigasyon
- Ürün ikon galerisi (15 ürün SVG)
- Sepet paneli + işlem türü seçimi
- Fiyat hesaplama motoru
- Müşteri telefon otomatik tamamlama

### Saat 10–16: İş Mantığı

- Sipariş CRUD
- Durum akışı (alındı → hazır → teslim)
- Teslim ekranı + ödeme
- Sipariş numarası üretici (CL-YYYY-NNNNN)

### Saat 16–20: Çıktı ve Rapor

- ESC/POS termal yazdırma
- Günlük ciro raporu
- Ayarlar (fiyat listesi, firma bilgisi)

### Saat 20–24: Paketleme ve Test

- Windows .exe build
- Gerçek senaryo testi (Shargiya firması verileri)
- Flash belleğe kopyala
- Kısa kullanım kılavuzu (1 sayfa, büyük font)

### Bilinçli Ertelenenler (v1.1)

- Bulut sync
- WhatsApp
- QR okuyucu
- Hasar fotoğrafı
- Personel rolleri

---

## 17. Satış ve Fiyatlandırma Stratejisi

### İlk Müşteriye Satış Konuşması

> "Mevcut programınızı yeni bilgisayara taşımak yerine size tamamen yeni nesil, çevrimdışı çalışabilen, lisanslı, müşteri takipli ve modern arayüzlü bir sistem kuruyorum. 14 gün ücretsiz deneyin."

### Fiyat Listesi

| Paket | Fiyat | İçerik |
|-------|-------|--------|
| **Lifetime Lisans** | $500 | Tek şube, 3 cihaz, ömür boyu güncelleme |
| Kurulum Desteği | $100 | Yerinde kurulum + eğitim (1 saat) |
| Veri Taşıma | $100 | Eski sistemden müşteri/fiyat aktarımı |
| Barkod Yazıcı | $50 | Yazıcı temin + kurulum |
| WhatsApp Modülü | $50 | Bildirim şablonları + kurulum |
| **Toplam (tam paket)** | **$750** | |

### Sonraki Müşteriler

| Paket | Fiyat/yıl | Cihaz |
|-------|-----------|-------|
| Basic | $200/yıl | 1 |
| Professional | $350/3 yıl | 3 |
| Lifetime | $500 | 3 |

---

## 18. Başarı Metrikleri

| Metrik | Hedef (MVP) | Hedef (6 ay) |
|--------|-------------|--------------|
| Sipariş oluşturma süresi | < 60 sn | < 45 sn |
| İlk kurulum süresi | < 15 dk | < 10 dk |
| Offline çalışma | %100 | %100 |
| Uygulama açılış süresi | < 3 sn | < 2 sn |
| Müşteri sayısı (Cicibyte) | 1 | 10+ |
| Aylık gelir | $500 | $2,000+ |

---

## 19. Riskler ve Azaltma

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| 24 saatte MVP yetişmez | Orta | Yüksek | Faz 1 kapsamını kes; demo için sadece sipariş + fiş |
| license.cicibyte.com'da cleanledger kaydı yok | Düşük | Yüksek | Sprint başında Filament'e app ekle |
| Termal yazıcı uyumsuzluğu | Orta | Orta | PDF fallback; ESC/POS generic mod |
| Eski veri taşıma | Orta | Orta | Manuel Excel import aracı (v1.1) |
| İnternet kesintisi + süresi dolmuş lisans | Düşük | Yüksek | 7 gün grace period |

---

## 20. Dizin Yapısı

```
cleanledger.cicibyte.com/
├── PROJE_DOSYASI.md          ← Bu dosya
├── information.md            ← Ham notlar (arşiv)
├── README.md                 ← Kurulum ve geliştirme kılavuzu
├── apps/
│   ├── desktop/              ← Tauri + React masaüstü uygulaması
│   │   ├── src/
│   │   │   ├── components/   ← UI bileşenleri
│   │   │   ├── screens/      ← Ekranlar
│   │   │   ├── lib/          ← license, db, print
│   │   │   └── assets/       ← Kıyafet ikonları (SVG)
│   │   ├── src-tauri/        ← Rust backend (Tauri)
│   │   └── package.json
│   └── api/                  ← NestJS operasyonel API (v1.1)
│       ├── src/
│       └── prisma/
├── packages/
│   ├── database/             ← Drizzle şema + migrasyonlar
│   ├── license-client/       ← license.cicibyte.com HTTP client
│   └── shared/               ← Tipler, sabitler, fiyat motoru
├── data/                     ← Geliştirme DB (gitignore)
├── docs/
│   ├── LICENSE_API.md
│   ├── PRINTING.md
│   └── USER_GUIDE.md         ← Son kullanıcı kılavuzu (büyük font)
└── scripts/
    ├── build-windows.sh
    └── seed-products.ts      ← Varsayılan ürün/fiyat listesi
```

---

## Ek: Varsayılan Ürün ve Fiyat Listesi (Seed)

MVP'de ayarlardan değiştirilebilir başlangıç fiyatları:

| Ürün | Kuru Temizleme | Ütü | Yıkama |
|------|----------------|-----|--------|
| Gömlek | 80 TL | 40 TL | 60 TL |
| Pantolon | 100 TL | 50 TL | 70 TL |
| Ceket | 150 TL | 75 TL | — |
| Takım Elbise | 250 TL | — | — |
| Elbise | 120 TL | 60 TL | 80 TL |
| Mont | 200 TL | — | — |
| Gelinlik | 800 TL | — | — |
| Yorgan | 300 TL | — | 200 TL |
| Halı (m²) | 50 TL | — | 40 TL |

---

## Ek: license.cicibyte.com Kurulum Checklist

CleanLedger'ı canlıya almadan önce (diğer projelere dokunmadan):

1. [ ] Filament Admin → Uygulamalar → Yeni kayıt: `cleanledger` (`is_active: true`)
2. [ ] Mevcut `LICENSE_API_KEY` kullanılır (ürünler `app_code` ile ayrılır)
3. [ ] `apps/desktop/.env` → `LICENSE_APP_CODE=cleanledger`
4. [ ] Trial süresi: 14 gün (varsayılan)
5. [ ] İlk müşteri ödemesi sonrası: admin panelden `lifetime` + `expires_at: 2099-12-31`

---

*Bu proje dosyası Cicibyte Corp. tarafından hazırlanmıştır.*  
*Son güncelleme: 9 Haziran 2026*  
*Sürüm: 1.0.0-planning*

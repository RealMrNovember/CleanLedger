<div align="center">

# CleanLedger

### Kuru temizleme işletmeniz için yeni nesil sipariş yönetimi

**Büyük ikonlar · Offline-first · Bulut senkron · WhatsApp bildirimleri · Anında fiş**

[![Web Uygulaması](https://img.shields.io/badge/Web-cleanledger.cicibyte.com-4ECDC4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://cleanledger.cicibyte.com)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/RealMrNovember/CleanLedger/releases)
[![Lisans](https://img.shields.io/badge/14%20Gün-Ücretsiz%20Deneme-FFB347?style=for-the-badge)](https://cleanledger.cicibyte.com/signup)
[![Geliştirici](https://img.shields.io/badge/Cicibyte%20Corp.-Profesyonel%20Yazılım-45B7D1?style=for-the-badge)](https://www.cicibyte.com)

[**Hemen Dene →**](https://cleanledger.cicibyte.com/signup) · [**Web Uygulaması →**](https://cleanledger.cicibyte.com) · [**Windows İndir →**](https://github.com/RealMrNovember/CleanLedger/releases)

</div>

---

## Neden CleanLedger?

Eski Windows kuru temizleme programları küçük yazılar, karmaşık menüler ve internet bağımlılığıyla personeli yavaşlatır. **CleanLedger** tam tersini yapar:

| Eski yazılımlar | CleanLedger |
|-----------------|-------------|
| Menü menü dolaşmak | Tek ekranda sipariş (POS) |
| Klavye zorunluluğu | Büyük ikonlara dokun, fiş bas |
| İnternet kesilince durur | **Offline-first** — iş asla durmaz |
| Veri taşıma ücreti (~200$) | Bulut senkron + web erişimi |
| Müşteriye manuel arama | **WhatsApp** ile tek tık bildirim |

> **Altın kural:** Bilgisayar kullanmayı bilmeyen bir esnaf, **5 dakika içinde** ilk siparişi oluşturabilmeli.

---

## Canlı Erişim

| Platform | Adres | Açıklama |
|----------|-------|----------|
| **Web uygulaması** | [cleanledger.cicibyte.com](https://cleanledger.cicibyte.com) | Tarayıcıdan POS, müşteri, sipariş ve raporlar |
| **Kayıt / Deneme** | [cleanledger.cicibyte.com/signup](https://cleanledger.cicibyte.com/signup) | 14 gün ücretsiz — kredi kartı gerekmez |
| **Windows masaüstü** | [GitHub Releases](https://github.com/RealMrNovember/CleanLedger/releases) | Tauri v2 ile hafif `.exe` — offline SQLite |
| **Lisans yönetimi** | [license.cicibyte.com](https://license.cicibyte.com) | Merkezi lisans, trial ve ömür boyu aktivasyon |
| **Destek** | [WhatsApp Destek Hattı](https://wa.me/905354895050) | Teknik destek ve lisans soruları |

---

## Tüm Özellikler

### Sipariş Ekranı (POS) — Sistemin Kalbi

- **3 panelli esnek düzen** — müşteri, ürün kataloğu ve sepet panelleri sürükleyerek yeniden boyutlandırılır; masaüstünde yatay, mobilde dikey yerleşim
- **Görsel ürün kataloğu** — gömlek, pantolon, ceket, elbise, gelinlik ve daha fazlası; özel SVG illüstrasyonlar ve akıllı ikon eşleştirme
- **Hızlı müşteri seçimi** — telefon numarasıyla arama; kayıtlı müşteride ad otomatik dolar
- **Çoklu hizmet türü** — kuru temizleme, sadece ütü, yıkama, leke çıkarma; ürün bazlı fiyatlandırma
- **Acil / normal öncelik** — express siparişler için acil işaretleme
- **Teslim tarihi** — varsayılan +3 gün; büyük takvim seçici
- **İndirim & kupon** — yüzde veya sabit tutar kuponları POS'ta uygulanır
- **Ödeme diyaloğu** — nakit / kart; tam veya kısmi ödeme, cari bakiye takibi
- **Anında fiş** — termal ve A4 yazdırma; sipariş numarası `CL-YYYY-NNNNN` formatında
- **Panel tercihleri kalıcı** — boyut ayarları `localStorage`'da saklanır

### Sipariş Takip

- **Canlı istatistik şeridi** — yarın teslim, dükkanda parça sayısı, tahsilat bekleyen tutar; yeniden boyutlandırılabilir
- **Durum akışı** — Hazırlanıyor → Hazır → Teslim Edildi
- **Aktif / teslim edilmiş sekmeler** — filtreleme ve hızlı durum güncelleme
- **Kısmi ödeme & tahsilat** — teslim sırasında ek ödeme alma, iade kaydı
- **Fiş tekrar yazdırma** — geçmiş siparişlerden fiş yeniden basılır
- **WhatsApp bildirimi** — "Kıyafetleriniz hazır" ve borç hatırlatma mesajları tek tıkla

### Müşteri Yönetimi

- **Müşteri listesi** — telefon, etiket, aktif sipariş ve cari borç özeti
- **Detay sayfası** — tam sipariş geçmişi timeline, toplam harcama, notlar ve adres
- **Müşteri etiketleri** — Normal, Titiz, VIP, Sıkıntılı/Borçlu; renkli rozetler
- **Geçmiş koruma** — sipariş geçmişi olan müşteri **silinemez**; tüm ziyaret kayıtları kalıcı
- **Cari bakiye** — borçlu müşteriler takip edilir; WhatsApp ile hatırlatma

### Raporlar

- **Gelir & tahsilat raporu** — ciro, indirim, nakit/kart kırılımı, cari özeti
- **Müşteri listesi raporu** — ziyaret sayısı ve harcama dağılımı
- **Yapılan işler raporu** — tüm sipariş kalemleri ve detayları
- **Periyot seçimi** — günlük, haftalık, aylık; tarih navigasyonu
- **PDF / yazdır** — tarayıcı yazdırma ile A4 rapor çıktısı

### Ayarlar & Yönetim

- **Genel ayarlar** — dükkan adı, telefon, adres; açık / koyu / sistem teması
- **Fiyat yönetimi** — her ürün × hizmet türü için tablo düzenleme; anında POS'a yansır
- **Ürün yönetimi** — yeni ürün ekleme, özel ikon seçimi, sıralama (sürükle-bırak), silme
- **Kupon yönetimi** — yüzde veya sabit indirim kodları; aktif/pasif
- **Müşteri etiketleri** — özel etiket oluşturma ve düzenleme
- **Yardım merkezi** — adım adım kullanım kılavuzu + WhatsApp destek hattı

### Hesap & Lisans

- **E-posta + şifre ile kayıt** — firma adı, yetkili, telefon
- **14 gün ücretsiz deneme** — kayıt anında otomatik başlar
- **Merkezi lisans sunucusu** — [license.cicibyte.com](https://license.cicibyte.com) üzerinden trial, basic, professional, lifetime
- **Offline lisans toleransı** — internet kesilse bile son doğrulamadan itibaren çalışmaya devam
- **Hesap sayfası** — deneme bitiş tarihi, şifre değiştirme, Windows indirme linki

### Bulut Senkronizasyon

- **Çok cihaz desteği** — aynı hesapla web, masaüstü ve mobil tarayıcı arasında veri paylaşımı
- **Akıllı çakışma çözümü** — boş yerel veri, dolu bulut verisinin üzerine yazmaz
- **Otomatik senkron** — giriş sonrası pull/push; değişikliklerde 2 sn gecikmeli push
- **Çevrimdışı kuyruk** — internet gelince otomatik senkronizasyon

### Kullanıcı Deneyimi

- **Modern arayüz** — mint yeşili + güven mavisi; Inter tipografi; 48px+ dokunma alanları
- **Karanlık mod** — sistem / açık / koyu tema
- **Mobil uyumlu** — responsive sidebar, dikey POS düzeni
- **Tanıtım sitesi** — hero, özellik kartları, CTA; GitHub Releases'tan otomatik `.exe` indirme

---

## Ekranlar

| Ekran | Rota | Açıklama |
|-------|------|----------|
| Tanıtım | `/` | Landing page, indirme ve kayıt CTA |
| Giriş / Kayıt | `/login`, `/signup` | Hesap oluşturma ve oturum |
| POS (Sipariş) | `/dashboard/pos` | 3 panelli sipariş ekranı |
| Sipariş Takip | `/dashboard/orders` | Aktif/teslim, tahsilat, WhatsApp |
| Müşteriler | `/dashboard/customers` | Liste, arama, yeni müşteri |
| Müşteri Detay | `/dashboard/customers/:id` | Geçmiş, düzenleme, toplam harcama |
| Raporlar | `/dashboard/reports` | Gelir, müşteri, iş raporları |
| Ayarlar | `/dashboard/settings` | Fiyat, ürün, kupon, yardım |
| Hesabım | `/dashboard/account` | Lisans, şifre, indirme |

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Arayüz** | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Routing** | React Router 7 (HashRouter — statik deploy uyumlu) |
| **Yerel veri (Web)** | localStorage tabanlı SQLite-benzeri katman |
| **Yerel veri (Desktop)** | SQLite + Drizzle ORM (Tauri SQL plugin) |
| **Masaüstü kabuğu** | Tauri 2.x — hafif, küçük `.exe` |
| **Panel düzeni** | react-resizable-panels |
| **İkonlar** | Lucide + özel SVG ürün illüstrasyonları |
| **Build** | Vite 6 |
| **Operasyonel API** | PHP (auth, sync) — `apps/web/api/` |
| **Lisans API** | license.cicibyte.com — GarageLedger ekosistemi |
| **CI/CD** | GitHub Actions — Windows `.exe` + MSI otomatik derleme |

---

## Hızlı Başlangıç

### Web uygulaması (canlı)

Tarayıcıdan doğrudan kullanın — kurulum gerekmez:

**→ [https://cleanledger.cicibyte.com](https://cleanledger.cicibyte.com)**

### Windows masaüstü

1. [Releases](https://github.com/RealMrNovember/CleanLedger/releases) sayfasından `.exe` indirin
2. Kurun ve açın
3. "Hesap Oluştur" ile 14 günlük denemeyi başlatın

### Geliştirici kurulumu

```bash
# Web (POS + tanıtım sitesi)
cd apps/web && npm install && npm run dev

# Masaüstü (Tauri + React)
cd apps/desktop && npm install && npm run tauri:dev
```

### Canlıya deploy (web)

```bash
cd apps/web && npm run deploy:live
```

Build çıktısı nginx kök dizinine (`/www/wwwroot/cleanledger.cicibyte.com/apps/web`) kopyalanır.

---

## CI/CD

`main` dalına her push → GitHub Actions Windows'ta Tauri uygulamasını derler ve [Releases](https://github.com/RealMrNovember/CleanLedger/releases) sayfasına yükler.

```yaml
# .github/workflows/build.yml
# Node 22 + Rust stable → NSIS .exe + MSI
```

---

## Lisans Modeli

| Tip | Süre | Cihaz | Hedef |
|-----|------|-------|-------|
| **Trial** | 14 gün (otomatik) | 1 | Yeni kayıt |
| **Basic** | 1 yıl | 1 | Küçük dükkan |
| **Professional** | 3 yıl | 3 | Orta ölçek + personel |
| **Lifetime** | Ömür boyu | 3 | Premium / tek seferlik satın alma |

Lisans aktivasyonu ve yönetimi [license.cicibyte.com](https://license.cicibyte.com) admin panelinden yapılır (`app_code: cleanledger`).

---

## Yol Haritası

Aşağıdaki özellikler ürün vizyonunda planlanmıştır:

- QR / barkod okuyucu ile durum güncelleme
- Kıyafet hasar fotoğrafı ve hukuki koruma modülü
- SMS otomasyonu
- Personel rolleri (sahip / tezgahtar / muhasebe)
- Sadakat puanı sistemi
- Çok şubeli yapı
- Otomatik güncelleme (Tauri updater)

Detaylı ürün spesifikasyonu: [PROJE_DOSYASI.md](./PROJE_DOSYASI.md)

---

## Destek

Sorularınız için WhatsApp destek hattımıza yazın:

**[wa.me/905354895050](https://wa.me/905354895050)**

---

## Proje Yapısı

```
cleanledger/
├── apps/
│   ├── web/          # Web uygulaması + tanıtım sitesi + PHP API
│   └── desktop/      # Tauri v2 masaüstü uygulaması
├── .github/workflows/  # CI/CD
├── PROJE_DOSYASI.md    # Tam ürün spesifikasyonu
└── README.md           # Bu dosya
```

---

<div align="center">

**CleanLedger** — [Cicibyte Corp.](https://www.cicibyte.com) tarafından geliştirilmiştir.

[Kuru temizleme yazılımınızı modernleştirin →](https://cleanledger.cicibyte.com/signup)

</div>

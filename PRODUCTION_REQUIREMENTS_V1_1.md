# CleanLedger v1.1 Production Requirements

## Amaç

Bu doküman yeni özellik talebi değil, gerçek müşteri kullanımı sırasında tespit edilen operasyonel eksikliklerin giderilmesi için hazırlanmıştır.

Tüm geliştirmeler yapılırken amaç:

* Veri tutarlılığı
* Çoklu cihaz desteği
* Operasyonel kolaylık
* Cari hesap yönetimi
* Müşteri iletişimi
* Profesyonel ERP davranışı

olmalıdır.

Bu geliştirmeler yapılırken mevcut yapılar bozulmamalı, geçici çözümler üretilmemeli ve sistem gelecekte çok şubeli yapıya uygun olacak şekilde tasarlanmalıdır.

---

# 1. Merkezi Firma Veritabanı ve Senkronizasyon Revizyonu

## Mevcut Sorun

Aynı firma hesabı ile giriş yapılmasına rağmen:

* Masaüstünde oluşturulan müşteri
* Masaüstünde oluşturulan sipariş
* Masaüstünde yapılan değişiklikler

mobil veya web tarafında görünmemektedir.

Bu durum her cihazın farklı veri kaynağı kullanıyor olabileceğini göstermektedir.

## Yeni Gereksinim

Sistemdeki tüm verilerin sahibi cihaz değil firma hesabı olmalıdır.

Firma hesabı oluşturulduğu anda:

* Organization oluşturulmalı
* Organization benzersiz olmalı
* E-posta adresi temel kimlik olmalı

Tüm müşteriler

Tüm siparişler

Tüm ödemeler

Tüm cari hareketler

Tüm raporlar

bu organizasyona bağlı tutulmalıdır.

Bir kullanıcı aynı firma hesabıyla:

* Web
* Masaüstü
* Mobil

üzerinden giriş yaptığında aynı verilere erişmelidir.

Offline çalışma devam etmeli ancak cihaz tekrar çevrimiçi olduğunda senkronizasyon eksiksiz tamamlanmalıdır.

Amaç:

"Bir cihazda oluşturulan kayıt saniyeler içinde diğer cihazlarda görülebilmelidir."

---

# 2. Lisans Sisteminin Kurumsal Hale Getirilmesi

## Yeni Lisans Kimliği

Lisans cihaz bazlı değil firma bazlı çalışmalıdır.

Ana kimlik:

* Firma E-postası

olmalıdır.

## Lisans Sunucusunda Görülmesi Gereken Bilgiler

Admin panelinde:

* Firma adı
* Firma e-postası
* Lisans tipi
* Başlangıç tarihi
* Bitiş tarihi
* Son giriş tarihi
* Aktif cihaz sayısı

görülebilmelidir.

## Cihaz Yönetimi

Firma için:

* Maksimum cihaz sayısı
* Aktif cihazlar
* Son kullanım tarihi

takip edilmelidir.

Admin isterse:

* Cihaz kaldırabilmeli
* Cihaz bloke edebilmeli
* Maksimum cihaz sayısını artırabilmeli

---

# 3. POS Satır Bazlı Fiyat Düzenleme

## Müşteri Talebi

Sipariş oluşturulurken varsayılan fiyatlar bazen değiştirilmektedir.

Örnek:

Pantolon
Normal fiyat: 150 TL

Ancak müşteri özel durum nedeniyle:

120 TL
175 TL
200 TL

olarak işlem görebilmektedir.

## Gereksinim

POS ekranında ürün satırı üzerinde görünen fiyat:

doğrudan düzenlenebilir olmalıdır.

Fiyat değiştirildiğinde:

* Toplam anında güncellenmeli
* Cari hesap güncellenmeli

Ayrıca:

Orijinal Fiyat
Satış Fiyatı

saklanmalıdır.

Raporlarda indirim ve fiyat değişiklikleri izlenebilmelidir.

---

# 4. Sipariş Oluştuğunda Detaylı WhatsApp Bilgilendirmesi

## Yeni Akış

Sipariş başarıyla kaydedildiği anda müşteriye otomatik WhatsApp mesajı gönderilmelidir.

Mesaj içerisinde:

Firma adı

Sipariş numarası

Teslim tarihi

Sipariş kalemleri

Uygulanacak işlemler

Her ürünün fiyatı

Genel toplam

yer almalıdır.

Örnek:

1 Adet Pantolon

* Kuru Temizleme
  150 TL

1 Adet Ceket

* Ütüleme
  100 TL

Toplam:
250 TL


Mesaj müşterinin siparişi bırakırken ne teslim ettiğini ve ne ücret ödeyeceğini net olarak göstermelidir.

---

# 5. Yeni Ödeme Akışı

## Mevcut Yapı

Sipariş oluşturulduğunda ödeme alınmak zorunda kalmaktadır.

## Yeni Yapı

Sipariş kaydedilirken:

Ödeme ekranı açılmalıdır.

Seçenekler:

* Nakit
* Kredi Kartı
* Cari
* Teslimatta Ödeme

## Teslimatta Ödeme Senaryosu

Sipariş oluşturulur.

Sipariş aktif hale gelir.

Cari borç oluşur.

Sipariş ödeme bekliyor statüsüne geçer.

Teslim sırasında:

Teslim Et butonuna basıldığında:

* Nakit
* Kart
* Cari Kapat

ekranı açılır.

Tahsilat tamamlanmadan sipariş teslim edilmiş sayılmaz.

---

# 6. Cari Hesap Sıfırlama ve Geri Alma Mekanizması

## Gereksinim

Bazı müşterilerin cari hesapları toplu olarak kapatılmak istenmektedir.

Müşteri ekranına:

"Cariyi Sıfırla"

aksiyonu eklenmelidir.

## Güvenlik

İşlem öncesinde:

Bu müşterinin tüm açık cari bakiyesi sıfırlanacaktır.

Emin misiniz?

uyarısı gösterilmelidir.

## Kritik Gereksinim

Cari kayıtları fiziksel olarak silinmemelidir.

Sistem:

Soft Delete

mantığıyla çalışmalıdır.

Cari hareket geçmişi korunmalıdır.

İstenildiğinde:

Cari sıfırlama işlemi geri alınabilmelidir.

Audit kayıtlarında:

* Ne zaman sıfırlandı
* Hangi tutar silindi

görülmelidir.

---

# 7. Hazır WhatsApp Şablon Yönetimi

İşletme sahibi kendi mesajlarını oluşturabilmelidir.

Ayarlar ekranına:

WhatsApp Şablonları

modülü eklenmelidir.

Örnek şablonlar:

* Hoşgeldiniz
* Sipariş Alındı
* Sipariş Hazır
* Teslim Edildi
* Borç Hatırlatma

Sistem değişken desteklemelidir:

{{firma_adi}}

{{musteri_adi}}

{{siparis_no}}

{{toplam_tutar}}

{{teslim_tarihi}}

Her işletme kendi metinlerini özgürce düzenleyebilmelidir.

---

# 8. Müşteri Bazlı Geçmiş ve Analitik Raporlar

## Yeni Rapor Türü

Müşteri seçilerek rapor alınabilmelidir.

İşletme sahibi:

Bir müşteriyi seçtiğinde:

o müşterinin tüm geçmişini görebilmelidir.

## Raporda Gösterilecek Bilgiler

Toplam ziyaret sayısı

Toplam sipariş sayısı

Toplam harcama

Ödenen tutar

Cari bakiye

Son ziyaret tarihi

İlk ziyaret tarihi

En çok getirilen ürünler

En sık kullanılan hizmetler

Sipariş zaman çizelgesi

Ayrıca:

Belirli tarih aralıklarında

müşteri bazlı PDF raporu alınabilmelidir.

Amaç:

Müşterinin işletmeyle olan tüm geçmişini tek ekranda gösterebilmektir.



# 9. Ürün Takip Sistemi, Sipariş Numaralandırma ve Termal Yazıcı Operasyonları

## Kritik Gereksinim

CleanLedger yalnızca müşteri ve sipariş yönetim sistemi değil, aynı zamanda ürün takip sistemi olarak çalışmalıdır.

Kuru temizleme işletmelerinde müşteri tarafından bırakılan ürünler işletme içerisinde günler boyunca farklı aşamalardan geçmektedir.

Bu nedenle sistem müşteri merkezli değil, ürün merkezli takip mantığıyla da çalışmalıdır.

---

# Benzersiz Sipariş ve Ürün Kimliği

## Mevcut Sorun

Bir sipariş içerisinde birden fazla ürün bulunabilmektedir.

Örnek:

Sipariş:

* 2 Pantolon
* 1 Ceket
* 1 Gömlek

Ancak işletme içerisinde bu ürünlerin hangi aşamada olduğu her zaman takip edilememektedir.

---

## Yeni Gereksinim

Sistemde her sipariş oluşturulduğunda:

Global olarak benzersiz bir Sipariş Numarası oluşturulmalıdır.

Örnek:

CL-2026-000001

CL-2026-000002

CL-2026-000003

Bu numara tekrar kullanılamaz.

Silinen siparişlerde dahi yeniden üretilemez.

---

## Ürün Bazlı Kimliklendirme

Sipariş içerisindeki her ürün de ayrıca takip edilebilmelidir.

Örnek:

Sipariş:
CL-2026-000157

Ürünler:

CL-2026-000157-01

CL-2026-000157-02

CL-2026-000157-03

CL-2026-000157-04

Bu sayede işletme içerisinde tek bir ürünün bile durumu takip edilebilir hale gelmelidir.
Sipariş fiş numaraları daha kısa da olabilir. 

---

# Evrensel Sipariş Arama Sistemi

Sistem genelinde hızlı arama alanı bulunmalıdır.

Aşağıdaki bilgilerden herhangi biri yazıldığında ilgili siparişlere ulaşılabilmelidir:

* Sipariş Numarası
* Ürün Numarası
* Telefon Numarası
* Müşteri Adı
* Müşteri Soyadı

Örnek:

CL-2026-000157

05551234567

Ahmet

Ahmet Yılmaz

gibi aramalar doğrudan sonuç döndürmelidir.

Amaç:

İşletme sahibinin müşteriyi bekletmeden siparişe birkaç saniye içerisinde ulaşabilmesidir.

---

# Ürün Durum Takibi

Her ürün aşağıdaki aşamalardan geçebilmelidir:

Teslim Alındı

Hazırlanıyor

İşlemde

Kalite Kontrol

Hazır

Teslim Edildi

İptal

Personel isterse ürün bazında durum değiştirebilmelidir.

Sipariş içerisindeki tüm ürünler hazır olduğunda sipariş otomatik olarak "Hazır" durumuna geçebilmelidir.

---

# Termal Fiş Operasyon Sistemi

## Gerçek İşletme Senaryosu

İşletme tarafından teslim alınan ürünlerde genellikle:

1 adet fiş ürünlere iliştirilir.

1 adet fiş müşteriye verilir.

Bazı müşteriler telefon numarası paylaşmak istemeyebilir.

Bazıları WhatsApp kullanmayabilir.

Bu nedenle fiş sistemi kritik öneme sahiptir.

---

## Sipariş Kaydı Sonrası

Sipariş başarıyla oluşturulduğunda sistem:

Ürün Etiketi Yazdır

Müşteri Fişi Yazdır

seçeneklerini göstermelidir.

---

# Ürün Etiketi Fişi

Ürünlerle birlikte işletme içerisinde kullanılacak fiştir.

Fişte:

Sipariş No

Ürün No

Müşteri Adı

Teslim Tarihi

Ürün Bilgisi

İşlem Türü

yer almalıdır.

Bu çıktı termal yazıcıdan hızlı şekilde alınabilmelidir.

---

# Müşteri Teslim Fişi

Müşteriye verilecek fiştir.

Fişte:

Firma Bilgileri

Sipariş No

Teslim Tarihi

Teslim Edilen Ürünler

Uygulanacak İşlemler

Toplam Ücret

yer almalıdır.

Müşteri bu fiş ile ürünlerini teslim alabilmelidir.

---

# Termal Yazıcı Problemi Analizi

Gerçek müşteri ortamında yapılan testlerde:

Web uygulamasından yazdırma komutu gönderildiğinde termal yazıcı yalnızca boş sayfa çıkarmaktadır.

Bu durum üretim ortamında kritik problem olarak değerlendirilmelidir.

---

# Cursor İçin Araştırma ve Raporlama Görevi

Termal yazıcı altyapısı detaylı şekilde incelenmelidir.

Aşağıdaki konular raporlanmalıdır:

* Kullanılan yazdırma yöntemi
* Tarayıcı tabanlı yazdırma kısıtları
* ESC/POS desteği
* Windows yazıcı sürücü problemleri
* CSS Print Layout uyumluluğu
* Thermal Printer Width (58mm / 80mm) problemleri
* Silent Printing imkanları
* WebUSB / WebSerial seçenekleri
* Desktop uygulamada doğrudan yazıcı erişimi seçenekleri

---

# Beklenen Sonuç

CleanLedger içerisinde:

Sipariş oluşturulduğu anda

tek tuşla

sorunsuz

profesyonel

termal fiş basılabilmelidir.

Sistem farklı marka yazıcılarda çalışabilecek kadar esnek olmalıdır.

Cursor mevcut mimariyi inceleyerek problemin kök nedenini tespit etmeli ve uygulanabilecek en profesyonel çözümü raporlamalıdır.

Geçici çözümler yerine uzun vadeli, ticari ürün seviyesinde bir yazdırma altyapısı tasarlanmalıdır.



---

# Son Karar

Bu geliştirmeler yapılırken geçici çözümler uygulanmamalıdır.

Tüm geliştirmeler:

* Çok cihazlı yapı
* Çok şubeli gelecek planı
* Bulut senkronizasyon
* Lisans yönetimi
* Audit kayıtları
* Veri bütünlüğü

dikkate alınarak profesyonel ERP standartlarında uygulanmalıdır.

Kod yazarken amaç yalnızca özelliği çalıştırmak değil, CleanLedger ürününü ticari olarak ölçeklenebilir hale getirmektir.



Lütfen bu dosyayı tamamen incele. Bunlar müşterimle oturup tekrar yapmış olduğumuz derleme istekleri. 
CleanLedger uygulaması içerisinde hem web hem de desktop sürümlerinde tamamen aynı gerçekleşecek bir şekilde bu güncellemeleri uygulamanı istiyorum. Hiç bir şekilde sunucuda ki başka hiç bir proje ya da uygulamaya müdehale etme. Eğer gerekirse license.cicibyte.com lisans sunucumuz üzerinde düzeltmeler yapabilirsin.
Önce bu işlemleri CleanLedger uygulaması ana adizininde yani cleanledger.cicibyte.com dizininde roadmap.md dosyası oluştur ve orada faz faz parçalara böl.
Tüm bu istekleri en profesyonel şekilde kurgulamanı ve en uygun şekilde gerçekleştirmeni, profesyonelliğini kaybetmemeni istiyorum.
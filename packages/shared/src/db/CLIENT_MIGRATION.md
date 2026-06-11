# db/client.ts → shared migration

Kademeli taşıma planı. Amaç: web ve desktop `db/client.ts` dosyalarındaki iş mantığını tek kaynakta toplamak.

## Tamamlanan modüller

| Modül | Shared yol | Kullanım |
|-------|------------|----------|
| Sipariş oluşturma finansalları | `orders/create-order.ts` → `computeCreateOrderFinancials` | `createOrder` (web + desktop) |
| Sepet renk filtresi | `orders/cart-filter.ts` | POS `CartPanel` |
| Kalem durumu | `orders/item-status.ts` | Sipariş takip |
| Global arama | `orders/global-search.ts` | Ctrl+K |
| Sync merge | `sync/merge.ts` | `SyncContext` |
| Sipariş numarası | `numbering/order-sequence.ts` | Sunucu + merge |

## Henüz client içinde kalan

- CRUD sarmalayıcıları (LocalDb / SQLite I/O)
- `addOrderPayment`, kupon uygulama, audit enqueue
- Entity-specific list/get helpers

Bu katmanlar depo erişimi içerdiği için shared'a taşınırken adapter arayüzü gerekir; sonraki iterasyonda `DbAdapter` ile ayrılacak.

## Kural

Yeni iş mantığı **önce** `packages/shared` içinde yazılır; client yalnızca persist + sync enqueue yapar.

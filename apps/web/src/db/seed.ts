import type { Product } from "./schema";

export const SEED_PRODUCTS: Omit<Product, "id">[] = [
  { name: "Gömlek", iconName: "shirt", basePrice: 80 },
  { name: "Pantolon", iconName: "pants", basePrice: 100 },
  { name: "Ceket", iconName: "jacket", basePrice: 150 },
  { name: "Etek", iconName: "skirt", basePrice: 90 },
  { name: "Elbise", iconName: "dress", basePrice: 120 },
  { name: "Takım Elbise", iconName: "suit", basePrice: 250 },
  { name: "Mont", iconName: "coat", basePrice: 200 },
  { name: "Kazak", iconName: "sweater", basePrice: 85 },
  { name: "Yorgan", iconName: "bed", basePrice: 300 },
  { name: "Battaniye", iconName: "blanket", basePrice: 180 },
  { name: "Perde", iconName: "curtain", basePrice: 120 },
  { name: "Gelinlik", iconName: "sparkles", basePrice: 800 },
];

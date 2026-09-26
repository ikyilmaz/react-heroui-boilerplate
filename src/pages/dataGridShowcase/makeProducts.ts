import { PRODUCT_CATEGORIES } from './productCategories'
import type { Product } from './Product'

const NAMES = ['Kalem', 'Defter', 'Klavye', 'Sandalye', 'Masa', 'Kahve', 'Çay', 'Mont', 'Ayakkabı', 'Monitör', 'Lamba', 'Çanta']

/** Deterministic demo products (fixed-seed LCG), so every visit shows the same data. */
export function makeProducts(count: number, seed = 7): Product[] {
  let s = seed
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${NAMES[Math.floor(next() * NAMES.length)]} ${100 + i}`,
    category: PRODUCT_CATEGORIES[Math.floor(next() * PRODUCT_CATEGORIES.length)].id,
    price: Math.round(next() * 5000) * 5,
    stock: Math.floor(next() * 12) * 10,
    active: next() > 0.3,
    created: new Date(2025, Math.floor(next() * 12), 1 + Math.floor(next() * 28)),
  }))
}

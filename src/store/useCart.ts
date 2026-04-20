import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem } from '@/lib/types';

interface CartState {
  items: CartItem[];
  allProducts: Product[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (product: Product) => void;
  addMultiple: (products: Product[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalItems: () => number;
  setAllProducts: (products: Product[]) => void;
  cartAnimationKey: number;
  triggerAnimation: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      allProducts: [],
      isOpen: false,
      cartAnimationKey: 0,
      setIsOpen: (open) => set({ isOpen: open }),
      triggerAnimation: () => set((state) => ({ cartAnimationKey: state.cartAnimationKey + 1 })),
      setAllProducts: (products) => set({ allProducts: products }),
      addItem: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === product.id);
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
      },
      addMultiple: (products) => {
        const items = [...get().items];
        products.forEach((product) => {
          const index = items.findIndex((item) => item.id === product.id);
          if (index !== -1) {
            items[index] = { ...items[index], quantity: items[index].quantity + 1 };
          } else {
            items.push({ ...product, quantity: 1 });
          }
        });
        set({ items });
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      updateQuantity: (id, delta) => {
        const items = get().items;
        set({
          items: items
            .map((item) =>
              item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
            )
            .filter((item) => item.quantity > 0),
        });
      },
      clearCart: () => set({ items: [] }),
      totalAmount: () => {
        return get().items.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity, 0);
      },
      totalItems: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

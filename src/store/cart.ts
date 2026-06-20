import { create } from 'zustand'

export interface CartItem {
  cartItemId: string
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  selected_variant_id: string
  selected_size: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existingItem = state.items.find((i) => i.cartItemId === item.cartItemId)
    if (existingItem) {
      return {
        items: state.items.map((i) =>
          i.cartItemId === item.cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }
    }
    return { items: [...state.items, { ...item, quantity: 1 }] }
  }),
  removeItem: (cartItemId) => set((state) => ({
    items: state.items.filter((i) => i.cartItemId !== cartItemId)
  })),
  updateQuantity: (cartItemId, quantity) => set((state) => ({
    items: state.items.map((i) => i.cartItemId === cartItemId ? { ...i, quantity } : i)
  })),
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
  },
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0)
  }
}))

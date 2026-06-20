"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { useCartStore } from "@/store/cart"

export type ProductVariant = {
  id: string
  size: string
  price: number
  stock: number
}

type Product = {
  id: string
  name: string
  category: string
  image_url: string
  variants: ProductVariant[]
}

function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore(state => state.addItem)
  
  // Asegurarnos de que variants sea un arreglo válido
  const variants = product.variants || []
  
  // Estado local para la variante seleccionada
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants.length > 0 ? variants[0].id : ""
  )

  const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants[0]
  
  // Si por alguna razón no hay variantes, tomamos los valores por defecto a 0 para no romper UI
  const currentPrice = selectedVariant?.price || 0
  const currentStock = selectedVariant?.stock || 0
  const currentSize = selectedVariant?.size || "Única"

  const handleAddToCart = () => {
    if (!selectedVariantId) {
      toast.error("Por favor selecciona una talla")
      return
    }

    addItem({
      cartItemId: `${product.id}-${selectedVariantId}`,
      id: product.id,
      name: product.name,
      price: currentPrice,
      image_url: product.image_url,
      selected_variant_id: selectedVariantId,
      selected_size: currentSize
    })
    
    toast.success(`Se agregó ${product.name} (Talla: ${currentSize}) al carrito`)
  }

  return (
    <Card className="glass border-0 overflow-hidden group flex flex-col">
      <div className="relative w-full h-64 bg-muted/30 overflow-hidden shrink-0">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 drop-shadow-sm"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
          {product.category}
        </div>
        <h3 className="font-bold text-lg leading-tight mb-4 truncate" title={product.name}>
          {product.name}
        </h3>
        
        {variants.length > 1 ? (
          <div className="mt-auto space-y-3">
            <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
              <SelectTrigger className="w-full glass-input h-9 text-sm">
                <SelectValue placeholder="Selecciona una talla" />
              </SelectTrigger>
              <SelectContent>
                {variants.map(v => (
                  <SelectItem key={v.id} value={v.id} disabled={v.stock <= 0}>
                    Talla {v.size} {v.stock <= 0 ? '(Agotado)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-2xl font-bold text-primary">
              S/. {currentPrice.toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="mt-auto space-y-1">
            <div className="text-sm text-muted-foreground">
              Talla: {currentSize}
            </div>
            <div className="text-2xl font-bold text-primary">
              S/. {currentPrice.toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="px-5 pb-5 pt-0 shrink-0">
        <Button 
          onClick={handleAddToCart} 
          disabled={currentStock <= 0}
          className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {currentStock > 0 ? "Añadir al carrito" : "Agotado"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function CatalogoPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Product[]
    }
  })

  if (isLoading) {
    return <div className="flex justify-center p-10"><p className="text-muted-foreground">Cargando catálogo...</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo de Joyería</h1>
        <p className="text-muted-foreground mt-2">Descubre nuestras últimas piezas y colecciones exclusivas.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {products?.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-muted-foreground">No hay productos disponibles por el momento.</p>
          </div>
        )}
      </div>
    </div>
  )
}

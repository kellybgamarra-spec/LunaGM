"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { useCartStore } from "@/store/cart"
import Image from "next/image"

type Product = {
  id: string
  name: string
  category: string
  price: number
  stock: number
  image_url: string
}

export default function CatalogoPage() {
  const addItem = useCartStore(state => state.addItem)

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

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url
    })
    toast.success(`Se agregó ${product.name} al carrito`)
  }

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
          <Card key={product.id} className="glass border-0 overflow-hidden group">
            <div className="relative w-full h-64 bg-muted/30 overflow-hidden">
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
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                {product.category}
              </div>
              <h3 className="font-bold text-lg leading-tight mb-2 truncate" title={product.name}>
                {product.name}
              </h3>
              <div className="text-2xl font-bold text-primary">
                S/. {product.price.toFixed(2)}
              </div>
            </CardContent>
            <CardFooter className="px-5 pb-5 pt-0">
              <Button 
                onClick={() => handleAddToCart(product)} 
                disabled={product.stock <= 0}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.stock > 0 ? "Añadir al carrito" : "Agotado"}
              </Button>
            </CardFooter>
          </Card>
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

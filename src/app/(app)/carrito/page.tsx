"use client"

import { useCartStore } from "@/store/cart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function CarritoPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore()
  const router = useRouter()
  
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    
    setIsSubmitting(true)
    
    try {
      // 1. Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      // Si no hay usuario, igual podemos crear la orden (dependerá de las reglas de tu RLS)
      // Pero idealmente el user id se registra.
      
      // 2. Crear la orden principal
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: user?.id || null,
          total_amount: getTotal(),
          delivery_address: address,
          contact_phone: phone,
          status: 'Debe' // Enum 'Debe'
        })
        .select()
        .single()
        
      if (orderError) throw orderError
      
      // 3. Crear los items de la orden
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        
      if (itemsError) throw itemsError
      
      // 4. Actualizar el stock de los productos
      // En un entorno de producción real, esto se haría mediante una RPC (función de BD)
      // para evitar condiciones de carrera, pero para este caso lo haremos simple:
      for (const item of items) {
        // Primero obtener stock actual
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single()
          
        if (product) {
          await supabase
            .from('products')
            .update({ stock: product.stock - item.quantity })
            .eq('id', item.id)
        }
      }
      
      toast.success("¡Pedido confirmado con éxito!")
      clearCart()
      router.push("/catalogo")
      
    } catch (error: any) {
      console.error(error)
      toast.error("Hubo un error al procesar tu pedido", {
        description: error.message || "Por favor, intenta nuevamente."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold">Tu carrito está vacío</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Aún no has agregado ninguna joya a tu pedido. Visita nuestro catálogo para descubrir nuestras colecciones.
        </p>
        <Button onClick={() => router.push("/catalogo")} className="mt-4">
          Explorar Catálogo
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mi Carrito</h1>
        <p className="text-muted-foreground mt-2">Revisa tus artículos y confirma tu compra.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Artículos Agregados ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-center gap-4 py-4 border-b last:border-0 border-border">
                  <div className="relative w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sin foto</div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="font-bold">{item.name}</h4>
                    <div className="text-primary font-semibold mt-1">S/. {item.price.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-background border border-border rounded-lg">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="w-10 text-center font-medium text-sm">{item.quantity}</div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Resumen y Formulario */}
        <div className="lg:col-span-1">
          <Card className="glass border-0 sticky top-24">
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <form onSubmit={handleCheckout}>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-4 border-y border-border">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">S/. {getTotal().toFixed(2)}</span>
                </div>
                
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección de Entrega</Label>
                    <Input 
                      id="address" 
                      placeholder="Ej. Av. Principal 123" 
                      required 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono de Contacto</Label>
                    <Input 
                      id="phone" 
                      placeholder="Ej. 987654321" 
                      required 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Procesando..." : "Confirmar Compra"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

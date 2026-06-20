"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronUp, Package, CheckCircle, Clock, XCircle } from "lucide-react"

export default function MisPedidosPage() {
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})

  const { data: orders, isLoading } = useQuery({
    queryKey: ['mis_pedidos'],
    queryFn: async () => {
      // Idealmente aquí se filtra por el ID del usuario logueado: .eq('client_id', user.id)
      // Por ahora traemos todos para la demostración
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            products (
              name,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pagó': 
        return <span className="flex items-center text-xs font-bold text-success bg-success/10 px-3 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1" /> Pagado</span>
      case 'Debe': 
        return <span className="flex items-center text-xs font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pendiente de Pago</span>
      case 'Anulado': 
        return <span className="flex items-center text-xs font-bold text-destructive bg-destructive/10 px-3 py-1 rounded-full"><XCircle className="w-3 h-3 mr-1" /> Anulado</span>
      default: 
        return null
    }
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mis Pedidos</h1>
        <p className="text-muted-foreground mt-2">Revisa el historial y estado de todas tus compras.</p>
      </div>

      {orders?.length === 0 ? (
        <Card className="glass border-0 text-center py-16">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aún no tienes pedidos</h3>
          <p className="text-muted-foreground">¡Explora nuestro catálogo y descubre joyas increíbles!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders?.map((order: any, index: number) => {
            const isExpanded = expandedOrders[order.id]
            const orderNumber = `PED-${order.id.split('-')[0].toUpperCase()}`
            
            return (
              <Card key={order.id} className="glass border-0 overflow-hidden transition-all duration-300">
                <div 
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors gap-4"
                  onClick={() => toggleOrder(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-lg">S/. {Number(order.total_amount).toFixed(2)}</p>
                    </div>
                    <div>{getStatusBadge(order.status)}</div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/50 bg-background/50 p-5 animate-in slide-in-from-top-2">
                    <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Productos en este pedido</h4>
                    <div className="space-y-4">
                      {order.order_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background border border-border/50">
                          <div className="flex items-center gap-4">
                            {item.products?.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.products.image_url} alt="" className="w-12 h-12 rounded-md object-contain bg-muted/30 p-1" />
                            ) : (
                              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground">Sin foto</div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{item.products?.name || 'Producto eliminado'}</p>
                              <p className="text-xs text-muted-foreground">Cant: {item.quantity} x S/. {Number(item.unit_price).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="font-bold text-sm">
                            S/. {(item.quantity * item.unit_price).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-border/50 flex flex-col sm:flex-row justify-between gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Dirección de entrega:</span>
                        <span className="font-medium">{order.delivery_address}</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-muted-foreground block mb-1">Teléfono de contacto:</span>
                        <span className="font-medium">{order.contact_phone}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

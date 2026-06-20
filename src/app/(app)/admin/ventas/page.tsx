"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Loader2, Search, CheckCircle, Clock, XCircle, ShoppingCart, ChevronDown, ChevronUp, Trash2, Package } from "lucide-react"

type OrderItem = {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  selected_variant?: { id: string, size: string } | null
  products?: {
    name: string
    image_url: string
  }
}

type Order = {
  id: string
  client_id: string | null
  total_amount: number
  delivery_address: string
  contact_phone: string
  status: 'Pagó' | 'Debe' | 'Anulado'
  created_at: string
  profiles?: { full_name: string | null } | null
  order_items: OrderItem[]
}

export default function VentasPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  
  // Estados para diálogos de confirmación
  const [orderToAnnul, setOrderToAnnul] = useState<{order: Order, status: string} | null>(null)
  const [itemToAnnul, setItemToAnnul] = useState<{order: Order, item: OrderItem} | null>(null)

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles(full_name),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            selected_variant,
            products (
              name,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Order[]
    }
  })

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('realtime_admin_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin_orders'] })
          queryClient.invalidateQueries({ queryKey: ['admin_debtors'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard_stats_full'] })
          if (payload.eventType === 'INSERT') {
            toast("¡Nueva venta recibida!", {
              description: "Se ha registrado un nuevo pedido en el sistema.",
              icon: <ShoppingCart className="w-4 h-4 text-primary" />
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const toggleOrder = (id: string) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const updateOrderStatus = useMutation({
    mutationFn: async ({ order, status }: { order: Order, status: string }) => {
      // Devolver stock si se anula todo el pedido (y antes no estaba anulado)
      if (status === 'Anulado' && order.status !== 'Anulado') {
        for (const item of order.order_items) {
          if (item.product_id) {
            const { data: prod } = await supabase.from('products').select('stock, variants').eq('id', item.product_id).single()
            if (prod) {
              let updatedVariants = prod.variants || []
              let updatedTotalStock = prod.stock + item.quantity
              
              if (item.selected_variant?.id) {
                updatedVariants = updatedVariants.map((v: any) => {
                  if (v.id === item.selected_variant?.id) {
                    return { ...v, stock: v.stock + item.quantity }
                  }
                  return v
                })
                updatedTotalStock = updatedVariants.reduce((acc: number, curr: any) => acc + curr.stock, 0)
              }
              
              await supabase.from('products').update({ stock: updatedTotalStock, variants: updatedVariants }).eq('id', item.product_id)
            }
          }
        }
      }
      
      const { error } = await supabase.from('orders').update({ status }).eq('id', order.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin_debtors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats_full'] })
      toast.success("Estado de la venta actualizado")
      setOrderToAnnul(null)
    },
    onError: (error: any) => {
      toast.error("Error al actualizar venta", { description: error.message })
    }
  })

  const deleteOrderItem = useMutation({
    mutationFn: async ({ order, item }: { order: Order, item: OrderItem }) => {
      // 1. Devolver stock del producto individual
      if (item.product_id) {
        const { data: prod } = await supabase.from('products').select('stock, variants').eq('id', item.product_id).single()
        if (prod) {
          let updatedVariants = prod.variants || []
          let updatedTotalStock = prod.stock + item.quantity
          
          if (item.selected_variant?.id) {
            updatedVariants = updatedVariants.map((v: any) => {
              if (v.id === item.selected_variant?.id) {
                return { ...v, stock: v.stock + item.quantity }
              }
              return v
            })
            updatedTotalStock = updatedVariants.reduce((acc: number, curr: any) => acc + curr.stock, 0)
          }
          
          await supabase.from('products').update({ stock: updatedTotalStock, variants: updatedVariants }).eq('id', item.product_id)
        }
      }

      // 2. Eliminar el item
      await supabase.from('order_items').delete().eq('id', item.id)

      // 3. Recalcular el total de la orden
      const itemCost = item.quantity * item.unit_price
      const newTotal = Math.max(0, order.total_amount - itemCost)
      const isNowEmpty = order.order_items.length <= 1 // Si este era el último item

      const updates: any = { total_amount: newTotal }
      if (isNowEmpty) updates.status = 'Anulado'

      await supabase.from('orders').update(updates).eq('id', order.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin_debtors'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats_full'] })
      toast.success("Ítem anulado y stock devuelto exitosamente")
      setItemToAnnul(null)
    },
    onError: (error: any) => {
      toast.error("Error al anular ítem", { description: error.message })
    }
  })

  const filteredOrders = orders?.filter(o => {
    const searchLower = searchTerm.toLowerCase()
    const orderNumber = `PED-${o.id.split('-')[0].toUpperCase()}`
    
    return (statusFilter === "Todos" || o.status === statusFilter) &&
    (
      o.contact_phone.includes(searchTerm) || 
      o.delivery_address.toLowerCase().includes(searchLower) ||
      (o.profiles?.full_name || "").toLowerCase().includes(searchLower) ||
      orderNumber.toLowerCase().includes(searchLower)
    )
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pagó': return <CheckCircle className="w-4 h-4 text-success mr-2" />
      case 'Debe': return <Clock className="w-4 h-4 text-orange-500 mr-2" />
      case 'Anulado': return <XCircle className="w-4 h-4 text-destructive mr-2" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Registro de Ventas</h1>
        <p className="text-muted-foreground mt-2">Gestiona pedidos, anula compras parciales o totales y devuelve stock automáticamente.</p>
      </div>

      <Card className="glass border-0">
        <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div>
            <CardTitle>Historial de Transacciones</CardTitle>
            <CardDescription>Todas las ventas registradas en el sistema</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar (PED-XXX, cliente, tel...)"
                className="pl-8 glass-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "Todos")}>
              <SelectTrigger className="w-full sm:w-[140px] glass-input">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Pagó">Pagó</SelectItem>
                <SelectItem value="Debe">Debe</SelectItem>
                <SelectItem value="Anulado">Anulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Cambiar Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        No se encontraron ventas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => {
                      const isExpanded = expandedOrders[order.id]
                      const orderNumber = `PED-${order.id.split('-')[0].toUpperCase()}`

                      return (
                        <React.Fragment key={order.id}>
                          <TableRow className={`hover:bg-muted/30 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}>
                            <TableCell className="p-2 text-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleOrder(order.id)}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-bold text-primary whitespace-nowrap">
                              {orderNumber}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium max-w-[150px] truncate" title={order.profiles?.full_name || 'Desconocido'}>
                              {order.profiles?.full_name || 'Desconocido'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{order.contact_phone}</TableCell>
                            <TableCell className="text-right font-bold whitespace-nowrap">
                              S/. {order.total_amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center whitespace-nowrap">
                                {getStatusIcon(order.status)}
                                <span>{order.status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Select 
                                value={order.status} 
                                onValueChange={(val) => {
                                  if (!val) return;
                                  if (val === 'Anulado' && order.status !== 'Anulado') {
                                    setOrderToAnnul({ order, status: val })
                                  } else {
                                    updateOrderStatus.mutate({ order, status: val })
                                  }
                                }}
                              >
                                <SelectTrigger className={`h-8 w-full max-w-[120px] mx-auto glass-input font-medium ${order.status === 'Anulado' ? 'text-destructive border-destructive/30' : ''}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pagó">Pagó</SelectItem>
                                  <SelectItem value="Debe">Debe</SelectItem>
                                  <SelectItem value="Anulado">Anular Todo</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>

                          {/* Fila Desplegable con Detalles */}
                          {isExpanded && (
                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                              <TableCell colSpan={8} className="p-0 border-b">
                                <div className="p-6 border-l-4 border-l-primary/50 bg-background/50 animate-in slide-in-from-top-2">
                                  <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground flex items-center">
                                    <Package className="w-4 h-4 mr-2" />
                                    Productos en {orderNumber}
                                  </h4>
                                  <div className="grid gap-3">
                                    {order.order_items.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">Este pedido no tiene productos registrados.</p>
                                    ) : (
                                      order.order_items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background border border-border/50">
                                          <div className="flex items-center gap-4 flex-1">
                                            {item.products?.image_url ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img src={item.products.image_url} alt="" className="w-10 h-10 rounded-md object-contain bg-muted/30 p-1 shrink-0" />
                                            ) : (
                                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground shrink-0">N/A</div>
                                            )}
                                            <div className="min-w-0">
                                              <p className="font-semibold text-sm truncate">
                                                {item.products?.name || 'Producto eliminado'}
                                                {item.selected_variant?.size && <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded-md border border-border">Talla {item.selected_variant.size}</span>}
                                              </p>
                                              <p className="text-xs text-muted-foreground">Cantidad: {item.quantity} × S/. {Number(item.unit_price).toFixed(2)}</p>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-6 shrink-0">
                                            <div className="font-bold text-sm whitespace-nowrap">
                                              S/. {(item.quantity * item.unit_price).toFixed(2)}
                                            </div>
                                            
                                            {order.status !== 'Anulado' && (
                                              <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                                                onClick={() => {
                                                  setItemToAnnul({ order, item })
                                                }}
                                              >
                                                <Trash2 className="w-4 h-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Anular Ítem</span>
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                                    <span className="block">Dirección de Envío: <strong className="text-foreground">{order.delivery_address}</strong></span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para anular pedido completo */}
      <Dialog open={!!orderToAnnul} onOpenChange={(open) => !open && setOrderToAnnul(null)}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>Anular Pedido Completo</DialogTitle>
            <DialogDescription>
              Al anular este pedido, <strong>todos sus productos</strong> volverán automáticamente al inventario general. ¿Estás seguro de continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="glass-input" onClick={() => setOrderToAnnul(null)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if(orderToAnnul) {
                  updateOrderStatus.mutate({ order: orderToAnnul.order, status: orderToAnnul.status })
                }
              }}
            >
              Anular Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para anular ítem específico */}
      <Dialog open={!!itemToAnnul} onOpenChange={(open) => !open && setItemToAnnul(null)}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>Anular Ítem Específico</DialogTitle>
            <DialogDescription>
              ¿Deseas anular este producto del pedido? <br /><br />
              - Se restará <strong>S/. {((itemToAnnul?.item.quantity || 0) * (itemToAnnul?.item.unit_price || 0)).toFixed(2)}</strong> del total del pedido.<br />
              - El producto volverá a estar disponible en el inventario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="glass-input" onClick={() => setItemToAnnul(null)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if(itemToAnnul) {
                  deleteOrderItem.mutate({ order: itemToAnnul.order, item: itemToAnnul.item })
                }
              }}
            >
              Anular Ítem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

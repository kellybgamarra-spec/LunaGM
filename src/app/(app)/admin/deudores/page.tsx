"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type DebtorOrder = {
  id: string
  contact_phone: string
  delivery_address: string
  total_amount: number
  created_at: string
  profiles?: { full_name: string | null } | null
}

export default function DeudoresPage() {
  const queryClient = useQueryClient()
  const [orderToConfirm, setOrderToConfirm] = useState<{id: string, status: string, amount: number} | null>(null)

  const { data: debtors, isLoading } = useQuery({
    queryKey: ['admin_debtors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name)')
        .eq('status', 'Debe')
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data as DebtorOrder[]
    }
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_debtors'] })
      queryClient.invalidateQueries({ queryKey: ['admin_orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats_full'] })
      toast.success("Estado actualizado correctamente")
      setOrderToConfirm(null)
    },
    onError: (error: any) => {
      toast.error("Error al actualizar la deuda", { description: error.message })
    }
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Deudores</h1>
        <p className="text-muted-foreground mt-2">Lista de clientes con pagos pendientes.</p>
      </div>

      <Card className="glass border-0 border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="text-orange-500">Pagos Pendientes</CardTitle>
          <CardDescription>Pedidos entregados o separados que aún no han sido pagados en su totalidad.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead className="text-right">Monto a Pagar</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtors?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        No hay deudores actualmente. ¡Excelente!
                      </TableCell>
                    </TableRow>
                  ) : (
                    debtors?.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.profiles?.full_name || 'Desconocido'}
                        </TableCell>
                        <TableCell>{order.contact_phone}</TableCell>
                        <TableCell className="truncate max-w-[200px]" title={order.delivery_address}>
                          {order.delivery_address}
                        </TableCell>
                        <TableCell className="text-right font-bold text-orange-500">
                          S/. {order.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            value="Debe" 
                            onValueChange={(val) => {
                              if (val !== 'Debe') {
                                setOrderToConfirm({ id: order.id, status: val, amount: order.total_amount })
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-full max-w-[120px] mx-auto glass-input font-medium text-orange-500 border-orange-500/30 bg-orange-500/5">
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pagó" className="text-success font-medium">Pagado</SelectItem>
                              <SelectItem value="Debe" className="text-orange-500 font-medium">Debe</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!orderToConfirm} onOpenChange={(open) => !open && setOrderToConfirm(null)}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
            <DialogDescription>
              ¿Confirmas que el pedido por S/. {orderToConfirm?.amount.toFixed(2)} pasará a estado "{orderToConfirm?.status === 'Pagó' ? 'Pagado' : orderToConfirm?.status}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" className="glass-input" onClick={() => setOrderToConfirm(null)}>Cancelar</Button>
            <Button 
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => {
                if(orderToConfirm) {
                  updateStatus.mutate({ id: orderToConfirm.id, status: orderToConfirm.status })
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

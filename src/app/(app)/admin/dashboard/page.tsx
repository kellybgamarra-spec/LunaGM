"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Calendar } from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"

export default function DashboardPage() {
  const [monthFilter, setMonthFilter] = useState("all")

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats_full'],
    queryFn: async () => {
      const { data: products } = await supabase.from('products').select('id, name, stock, category')
      const { data: orders } = await supabase.from('orders').select('status, created_at')
      const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity, orders(created_at)')
      
      return {
        products: products || [],
        orders: orders || [],
        orderItems: orderItems || []
      }
    }
  })

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  // --- LÓGICA DE FILTRADO POR MES ---
  const monthMap: Record<string, string> = {
    "Enero": "0", "Febrero": "1", "Marzo": "2", "Abril": "3",
    "Mayo": "4", "Junio": "5", "Julio": "6", "Agosto": "7",
    "Septiembre": "8", "Octubre": "9", "Noviembre": "10", "Diciembre": "11"
  }

  const isSameMonth = (dateString: string) => {
    if (monthFilter === "all" || monthFilter === "Todos los meses") return true
    const date = new Date(dateString)
    const currentYear = new Date().getFullYear()
    const targetMonth = monthMap[monthFilter]
    return date.getMonth().toString() === targetMonth && date.getFullYear() === currentYear
  }

  const filteredOrders = stats?.orders.filter(o => o.created_at && isSameMonth(o.created_at)) || []
  
  const filteredOrderItems = stats?.orderItems.filter(item => {
    const orderDate = Array.isArray(item.orders) ? item.orders[0]?.created_at : (item.orders as any)?.created_at
    return orderDate ? isSameMonth(orderDate) : true
  }) || []

  // 1. Stock por Categoría (Bar Chart)
  const stockByCategoryRaw = stats?.products.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.stock
    return acc
  }, {} as Record<string, number>) || {}
  const dataStockCategory = Object.entries(stockByCategoryRaw).map(([name, stock]) => ({ name, stock }))

  // 2. Estados de Pago (Pie Chart) - Filtrado
  const ordersByStatusRaw = filteredOrders.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const dataOrderStatus = Object.entries(ordersByStatusRaw).map(([name, value]) => ({ name, value }))
  const COLORS = { 'Pagó': '#10b981', 'Debe': '#f59e0b', 'Anulado': '#ef4444' }

  // 3. Productos Más Vendidos - Filtrado
  const salesByProduct = filteredOrderItems.reduce((acc, item) => {
    if(item.product_id) {
      acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity
    }
    return acc
  }, {} as Record<string, number>) || {}
  
  const dataTopSelling = Object.entries(salesByProduct)
    .map(([productId, quantity]) => {
      const product = stats?.products.find(p => p.id === productId)
      return {
        name: product ? product.name : 'Desconocido',
        vendidos: quantity
      }
    })
    .sort((a, b) => b.vendidos - a.vendidos)
    .slice(0, 5) // Top 5

  // 4. Productos con poco stock (Menos de 10 unidades)
  const dataLowStock = stats?.products
    .filter(p => p.stock > 0 && p.stock <= 10)
    .map(p => ({ name: p.name, stock: p.stock }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10) // Mostrar los 10 con menos stock

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Analítico</h1>
          <p className="text-muted-foreground mt-2">Métricas y gráficos en tiempo real de tu joyería.</p>
        </div>
        <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border/50">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent shadow-none focus:ring-0">
              <SelectValue placeholder="Filtrar por mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos los meses">Todos los meses</SelectItem>
              <SelectItem value="Enero">Enero</SelectItem>
              <SelectItem value="Febrero">Febrero</SelectItem>
              <SelectItem value="Marzo">Marzo</SelectItem>
              <SelectItem value="Abril">Abril</SelectItem>
              <SelectItem value="Mayo">Mayo</SelectItem>
              <SelectItem value="Junio">Junio</SelectItem>
              <SelectItem value="Julio">Julio</SelectItem>
              <SelectItem value="Agosto">Agosto</SelectItem>
              <SelectItem value="Septiembre">Septiembre</SelectItem>
              <SelectItem value="Octubre">Octubre</SelectItem>
              <SelectItem value="Noviembre">Noviembre</SelectItem>
              <SelectItem value="Diciembre">Diciembre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Stock por Categoría */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Inventario por Categoría</CardTitle>
            <CardDescription>Cantidad de productos disponibles en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {dataStockCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataStockCategory} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="stock" fill="#db2777" radius={[4, 4, 0, 0]} name="Unidades" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Aún no hay productos</div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Estados de Pago */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Estado de Pagos</CardTitle>
            <CardDescription>Distribución de pedidos según su situación</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {dataOrderStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataOrderStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataOrderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Aún no hay ventas registradas</div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 3: Productos más vendidos */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle>Top 5 Productos Más Vendidos</CardTitle>
            <CardDescription>Las joyas favoritas de tus clientes</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {dataTopSelling.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataTopSelling} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={120} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="vendidos" fill="#6366f1" radius={[0, 4, 4, 0]} name="Unidades Vendidas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Aún no hay productos vendidos</div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 4: Productos con poco stock */}
        <Card className="glass border-0 border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-orange-500">Alerta de Bajo Stock</CardTitle>
            <CardDescription>Productos próximos a agotarse (10 o menos unidades)</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {dataLowStock.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataLowStock} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} angle={-45} textAnchor="end" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="stock" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Stock Disponible" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">¡Todo en orden! No hay productos con bajo stock</div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

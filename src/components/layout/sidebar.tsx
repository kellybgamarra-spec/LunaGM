"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Store, 
  ShoppingCart, 
  LayoutDashboard, 
  Package, 
  Receipt, 
  Users, 
  Wallet,
  LogOut,
  ListOrdered
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { name: "Catálogo", href: "/catalogo", icon: Store, roles: ["cliente", "admin"] },
  { name: "Mi Carrito", href: "/carrito", icon: ShoppingCart, roles: ["cliente", "admin"] },
  { name: "Mis Pedidos", href: "/mis-pedidos", icon: ListOrdered, roles: ["cliente", "admin"] },
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Productos", href: "/admin/productos", icon: Package, roles: ["admin"] },
  { name: "Ventas", href: "/admin/ventas", icon: Receipt, roles: ["admin"] },
  { name: "Deudores", href: "/admin/deudores", icon: Wallet, roles: ["admin"] },
  { name: "Usuarios", href: "/admin/usuarios", icon: Users, roles: ["admin"] },
]

export function Sidebar() {
  const pathname = usePathname()
  
  // TO DO: Obtener el rol del usuario autenticado desde Supabase
  const userRole = "admin" 

  return (
    <aside className="hidden lg:flex flex-col w-64 glass border-r h-screen sticky top-0 z-40 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        {/* Placeholder for Logo */}
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
          L
        </div>
        <span className="font-bold text-xl tracking-tight">LunaGM</span>
      </div>

      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">AD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">Admin User</span>
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full w-max mt-1">Admin</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full">
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

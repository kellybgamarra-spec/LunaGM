"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"

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
  const router = useRouter()
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['current_user_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (error) throw error
      return data
    }
  })

  // Defaults and derived values
  const userRole = profile?.role || "cliente"
  const userName = profile?.full_name || "Usuario"
  const userInitials = userName.substring(0, 2).toUpperCase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 glass border-r h-screen sticky top-0 z-40 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        {/* Placeholder for Logo */}
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-[0_4px_10px_rgba(0,0,0,0.15)]">
          L
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">LunaGM</span>
      </div>

      <div className="px-4 pb-6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 shadow-sm">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1"></div>
            ) : (
              <span className="text-sm font-semibold truncate text-foreground">{userName}</span>
            )}
            
            {isLoading ? (
              <div className="h-3 w-12 bg-muted animate-pulse rounded mt-1"></div>
            ) : (
              <span className={cn("text-xs px-2 py-0.5 rounded-full w-max mt-1 font-bold", 
                userRole === 'admin' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary-foreground"
              )}>
                {userRole === 'admin' ? 'Administrador' : 'Cliente'}
              </span>
            )}
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
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
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
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

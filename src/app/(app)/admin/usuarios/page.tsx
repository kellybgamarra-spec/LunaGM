"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Loader2, ShieldAlert, UserIcon } from "lucide-react"

type Profile = {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'cliente'
}

export default function UsuariosPage() {
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Profile[]
    }
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, newRole }: { id: string, newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] })
      toast.success("Rol de usuario actualizado")
    },
    onError: (error: any) => {
      toast.error("Error al actualizar rol", { description: error.message })
    }
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h1>
        <p className="text-muted-foreground mt-2">Asigna o modifica los roles de los usuarios registrados (Solo Administrador).</p>
      </div>

      <Card className="glass border-0">
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>Lista de cuentas vinculadas a Supabase Auth</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol Actual</TableHead>
                    <TableHead className="w-[200px]">Asignar Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No hay usuarios registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? <ShieldAlert className="w-4 h-4 text-primary" /> : <UserIcon className="w-4 h-4 text-muted-foreground" />}
                            {user.full_name || 'Sin nombre'}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary-foreground'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select 
                            defaultValue={user.role} 
                            onValueChange={(val) => { if(val) updateRole.mutate({ id: user.id, newRole: val }) }}
                          >
                            <SelectTrigger className="h-8 glass-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cliente">Cliente</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
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
    </div>
  )
}

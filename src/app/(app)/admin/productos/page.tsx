"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Loader2, Plus, Search, Trash2, Pencil } from "lucide-react"

type Product = {
  id: string
  name: string
  category: string
  size: string
  material: string
  color: string
  stock: number
  price: number
  image_url: string
}

export default function ProductosPage() {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    size: "",
    material: "",
    color: "",
    stock: 0,
    price: 0,
    image_url: ""
  })

  // Fetch Products
  const { data: products, isLoading } = useQuery({
    queryKey: ['admin_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Product[]
    }
  })

  // Mutations
  const createProduct = useMutation({
    mutationFn: async (newProduct: Omit<Product, 'id'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_products'] })
      toast.success("Producto guardado correctamente")
      setFormData({ name: "", category: "", size: "", material: "", color: "", stock: 0, price: 0, image_url: "" })
    },
    onError: (error: any) => {
      toast.error("Error al guardar producto", { description: error.message })
    }
  })

  const updateProduct = useMutation({
    mutationFn: async ({ id, updatedProduct }: { id: string, updatedProduct: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_products'] })
      toast.success("Producto actualizado correctamente")
      setFormData({ name: "", category: "", size: "", material: "", color: "", stock: 0, price: 0, image_url: "" })
      setEditingId(null)
    },
    onError: (error: any) => {
      toast.error("Error al actualizar producto", { description: error.message })
    }
  })

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_products'] })
      toast.success("Producto eliminado")
    },
    onError: (error: any) => {
      toast.error("Error al eliminar", { description: error.message })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category) {
      toast.error("Por favor selecciona una categoría")
      return
    }
    setIsSubmitting(true)

    try {
      let finalImageUrl = formData.image_url

      if (imageFile) {
        // Convertir la imagen a Base64 (texto)
        finalImageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(imageFile)
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (error) => reject(error)
        })
      }

      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, updatedProduct: { ...formData, image_url: finalImageUrl } })
      } else {
        await createProduct.mutateAsync({ ...formData, image_url: finalImageUrl })
      }
      setImageFile(null)
    } catch (err: any) {
      toast.error("Error al guardar producto", { description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          setImageFile(file)
          e.preventDefault()
          toast.success("Imagen agregada desde el portapapeles")
          return
        }
      }
    }
  }

  const filteredProducts = products?.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Productos</h1>
        <p className="text-muted-foreground mt-2">Registra y administra el inventario de joyería.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Formulario */}
        <Card className="glass border-0 xl:col-span-1 h-fit sticky top-24">
          <CardHeader>
            <CardTitle>{editingId ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
            <CardDescription>{editingId ? "Modifica los detalles de la joya" : "Añade una nueva joya al catálogo"}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} onPaste={handlePaste}>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="image_url">Imagen del Producto (Puedes presionar Ctrl+V)</Label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {imageFile && (
                    <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm">
                      <img 
                        src={URL.createObjectURL(imageFile)} 
                        alt="Vista previa" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <Input 
                    id="image_url" 
                    type="file"
                    accept="image/*"
                    key={imageFile ? "file" : "empty"}
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="glass-input cursor-pointer file:text-primary file:font-semibold w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Seleccione categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Anillos">Anillos</SelectItem>
                    <SelectItem value="Collares">Collares</SelectItem>
                    <SelectItem value="Pulseras">Pulseras</SelectItem>
                    <SelectItem value="Aretes">Aretes</SelectItem>
                    <SelectItem value="Relojes">Relojes</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input 
                  id="name" 
                  required 
                  placeholder="Ej. Anillo de Compromiso"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Tamaño/Talla</Label>
                  <Input 
                    id="size" 
                    placeholder="Ej. 7, 45cm"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">Material (Opcional)</Label>
                  <Input 
                    id="material" 
                    placeholder="Ej. Plata 925"
                    value={formData.material}
                    onChange={(e) => setFormData({...formData, material: e.target.value})}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color (Opcional)</Label>
                <Input 
                  id="color" 
                  placeholder="Ej. Dorado, Rojo"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Cantidad (Stock)</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (S/.)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    className="glass-input"
                  />
                </div>
              </div>

            </CardContent>
            <CardFooter className="flex-col space-y-2">
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? "Actualizar Producto" : "Guardar Producto"}
              </Button>
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-border/50 bg-background/50" 
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: "", category: "", size: "", material: "", color: "", stock: 0, price: 0, image_url: "" })
                    setImageFile(null)
                  }}
                >
                  Cancelar Edición
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>

        {/* Tabla */}
        <Card className="glass border-0 xl:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Inventario Actual</CardTitle>
              <CardDescription>Lista de todos los productos en el sistema</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar producto..."
                className="pl-8 glass-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                          No se encontraron productos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts?.map((product) => (
                        <TableRow key={product.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.image_url} alt="" className="w-10 h-10 rounded-md object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs">Sin foto</div>
                              )}
                              <span className="truncate max-w-[150px]" title={product.name}>{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.material}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              product.stock > 5 ? 'bg-success/20 text-success' : 
                              product.stock > 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-destructive/20 text-destructive'
                            }`}>
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">S/. {product.price.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-primary hover:bg-primary/20"
                              onClick={() => {
                                setEditingId(product.id)
                                setFormData({
                                  name: product.name,
                                  category: product.category,
                                  size: product.size || "",
                                  material: product.material || "",
                                  color: product.color || "",
                                  stock: product.stock,
                                  price: product.price,
                                  image_url: product.image_url || ""
                                })
                                setImageFile(null)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/20"
                              onClick={() => {
                                if(confirm("¿Estás seguro de eliminar este producto?")) {
                                  deleteProduct.mutate(product.id)
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
    </div>
  )
}

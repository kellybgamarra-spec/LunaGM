"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import Image from "next/image"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Asegúrate de configurar la URL de redirección en el dashboard de Supabase
          redirectTo: `${window.location.origin}/catalogo`
        }
      })

      if (error) {
        toast.error("Error al iniciar sesión", { description: error.message })
      }
    } catch (err) {
      toast.error("Ocurrió un error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4 bg-background">
      <div className="glass max-w-[400px] w-full text-center py-12 px-8 rounded-3xl flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <Image 
            src="/Logo.jpeg" 
            alt="LunaGM Logo" 
            width={220} 
            height={220} 
            className="w-[220px] h-auto rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] object-cover"
            priority
          />
        </div>
        <p className="text-muted-foreground mb-10 text-[0.95rem]">
          Inicia sesión para ver el catálogo y gestionar productos.
        </p>
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-card hover:bg-background border border-border/50 text-foreground flex items-center justify-center gap-3 font-medium shadow-[0_2px_10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 py-3.5 px-4 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          )}
          Continuar con Google
        </button>
      </div>
    </div>
  )
}

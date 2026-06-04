"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

export default function GeoResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contrasenas no coinciden.")
      return
    }
    setLoading(true)
    const { error: updateError } = await supabaseGeo.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setOk("Contrasena actualizada. Ya puedes iniciar sesion en GEO.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md glass rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#0b1020] border border-border flex items-center justify-center overflow-hidden">
            <Image src="/botz-logo.png" alt="Botz" width={22} height={22} className="object-contain" />
          </div>
          <span className="text-xl font-bold">Botz GEO Engine</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Restablecer contrasena GEO</h1>
        <p className="text-muted-foreground mb-6">Crea una nueva contrasena para tu acceso GEO.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contrasena</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar contrasena</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12" required />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {ok && <p className="text-sm text-green-400">{ok}</p>}

          <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? "Guardando..." : "Guardar nueva contrasena"}
          </Button>
        </form>

        <motion.div className="mt-6">
          <Link href="/geo/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a login GEO
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  User,
  Building2,
  Globe,
  Languages,
  Bell,
  Key,
  Shield,
  CreditCard,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  ChevronRight,
} from "lucide-react"

const tabs = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "company", label: "Empresa", icon: Building2 },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "api", label: "API Keys", icon: Key },
  { id: "billing", label: "Facturación", icon: CreditCard },
  { id: "security", label: "Seguridad", icon: Shield },
]

const notifications = [
  { id: "audit_complete", label: "Auditoría completada", description: "Notificar cuando una auditoría GEO termina", enabled: true },
  { id: "weekly_report", label: "Reporte semanal", description: "Recibir resumen semanal de rendimiento", enabled: true },
  { id: "score_change", label: "Cambios en GEO Score", description: "Alertas cuando tu score cambia significativamente", enabled: false },
  { id: "competitor_alert", label: "Alertas de competidores", description: "Notificar cambios importantes en competidores", enabled: true },
  { id: "new_citations", label: "Nuevas citaciones", description: "Alertar cuando se detectan nuevas citaciones", enabled: false },
  { id: "marketing", label: "Actualizaciones de producto", description: "Novedades y mejoras de Botz GEO", enabled: true },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <AppHeader />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Configuración</h2>
          <p className="text-muted-foreground">Administra tu cuenta y preferencias</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 shrink-0"
          >
            <Card className="glass border-border">
              <CardContent className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 space-y-6"
          >
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                <Card className="glass border-border">
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>Actualiza tu información de perfil</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                        JG
                      </div>
                      <div>
                        <Button variant="outline" className="border-border">Cambiar foto</Button>
                        <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Max 2MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <input
                          type="text"
                          defaultValue="Juan"
                          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Apellido</Label>
                        <input
                          type="text"
                          defaultValue="García"
                          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <input
                        type="email"
                        defaultValue="juan@empresa.com"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Idioma</Label>
                      <select className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors">
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>

                    <Button className="bg-primary hover:bg-primary/90">Guardar cambios</Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Company Tab */}
            {activeTab === "company" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Información de Empresa</CardTitle>
                  <CardDescription>Detalles de tu organización</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Nombre de la empresa</Label>
                    <input
                      type="text"
                      defaultValue="TechStartup Pro"
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Dominio principal</Label>
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        defaultValue="techstartup.pro"
                        className="flex-1 px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Industria</Label>
                    <select className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors">
                      <option value="saas">SaaS / Software</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="fintech">Fintech</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tamaño del equipo</Label>
                    <select className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors">
                      <option value="1-10">1-10 empleados</option>
                      <option value="11-50">11-50 empleados</option>
                      <option value="51-200">51-200 empleados</option>
                      <option value="200+">200+ empleados</option>
                    </select>
                  </div>

                  <Button className="bg-primary hover:bg-primary/90">Guardar cambios</Button>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Preferencias de Notificaciones</CardTitle>
                  <CardDescription>Controla qué notificaciones recibes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium">{notification.label}</p>
                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                      </div>
                      <Switch defaultChecked={notification.enabled} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* API Keys Tab */}
            {activeTab === "api" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Gestiona tus claves de API para integraciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Production API Key</p>
                        <p className="text-sm text-muted-foreground">Creada hace 30 días</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        Activa
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 bg-secondary/50 border border-border rounded-xl font-mono text-sm">
                        {showApiKey ? "geo_live_sk_1a2b3c4d5e6f7g8h9i0j" : "geo_live_sk_••••••••••••••••••"}
                      </div>
                      <Button variant="outline" size="icon" className="border-border" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" className="border-border" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-border">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerar Key
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Key className="w-4 h-4 mr-2" />
                      Crear Nueva Key
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm">
                      <strong>Nota:</strong> Mantén tus API keys seguras y nunca las compartas públicamente. 
                      Consulta nuestra <span className="text-primary cursor-pointer hover:underline">documentación</span> para más información.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Facturación y Plan</CardTitle>
                  <CardDescription>Gestiona tu suscripción y métodos de pago</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plan actual</p>
                        <p className="text-2xl font-bold">Growth</p>
                        <p className="text-muted-foreground">$149/mes</p>
                      </div>
                      <Button className="bg-primary hover:bg-primary/90">
                        Upgrade a Enterprise
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-medium">Método de pago</p>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                          VISA
                        </div>
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-muted-foreground">Expira 12/25</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Editar</Button>
                    </div>
                  </div>

                  <Button variant="outline" className="border-border">
                    Ver historial de facturas
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>Seguridad</CardTitle>
                  <CardDescription>Protege tu cuenta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Contraseña actual</Label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nueva contraseña</Label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar contraseña</Label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  <Button className="bg-primary hover:bg-primary/90">Actualizar contraseña</Button>

                  <div className="border-t border-border pt-6 mt-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div>
                        <p className="font-medium text-red-400">Zona de peligro</p>
                        <p className="text-sm text-muted-foreground">Eliminar permanentemente tu cuenta</p>
                      </div>
                      <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar cuenta
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}

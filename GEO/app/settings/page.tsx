"use client"

import { useEffect, useState } from "react"
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
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

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
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const { locale, t } = useGeoI18n()
  const isEn = locale === "en"
  const tabs = [
    { id: "profile", label: isEn ? "Profile" : "Perfil", icon: User },
    { id: "company", label: isEn ? "Company" : "Empresa", icon: Building2 },
    { id: "notifications", label: isEn ? "Notifications" : "Notificaciones", icon: Bell },
    { id: "api", label: "API Keys", icon: Key },
    { id: "billing", label: isEn ? "Billing" : "Facturación", icon: CreditCard },
    { id: "security", label: isEn ? "Security" : "Seguridad", icon: Shield },
  ]
  const translatedNotifications = isEn
    ? [
        { id: "audit_complete", label: "Audit completed", description: "Notify when a GEO audit finishes", enabled: true },
        { id: "weekly_report", label: "Weekly report", description: "Receive a weekly performance summary", enabled: true },
        { id: "score_change", label: "GEO Score changes", description: "Alerts when your score changes significantly", enabled: false },
        { id: "competitor_alert", label: "Competitor alerts", description: "Notify important competitor changes", enabled: true },
        { id: "new_citations", label: "New citations", description: "Alert when new citations are detected", enabled: false },
        { id: "marketing", label: "Product updates", description: "News and improvements from Botz GEO", enabled: true },
      ]
    : notifications

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    let mounted = true
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabaseGeo.auth.getUser()
      if (!mounted || !user) return
      setUserEmail(user.email ?? "")
      const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""
      setUserName(fullName)
    }
    void loadUser()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <AppHeader />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{t("settingsTitle")}</h2>
          <p className="text-muted-foreground">{isEn ? "Manage your account and preferences" : "Administra tu cuenta y preferencias"}</p>
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
                    <CardTitle>{isEn ? "Personal Information" : "Información Personal"}</CardTitle>
                    <CardDescription>{isEn ? "Update your profile information" : "Actualiza tu información de perfil"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                        {(userName || userEmail || "G").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Button variant="outline" className="border-border">{isEn ? "Change photo" : "Cambiar foto"}</Button>
                        <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Max 2MB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{isEn ? "First name" : "Nombre"}</Label>
                        <input
                          key={`first-${userName}`}
                          type="text"
                          defaultValue={userName.split(" ")[0] ?? ""}
                          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{isEn ? "Last name" : "Apellido"}</Label>
                        <input
                          key={`last-${userName}`}
                          type="text"
                          defaultValue={userName.split(" ").slice(1).join(" ")}
                          className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <input
                        key={`email-${userEmail}`}
                        type="email"
                        defaultValue={userEmail}
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{isEn ? "Language" : "Idioma"}</Label>
                      <select className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors">
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>

                    <Button className="bg-primary hover:bg-primary/90">{isEn ? "Save changes" : "Guardar cambios"}</Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Company Tab */}
            {activeTab === "company" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>{isEn ? "Company Information" : "Información de Empresa"}</CardTitle>
                  <CardDescription>{isEn ? "Details about your organization" : "Detalles de tu organización"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{isEn ? "Company name" : "Nombre de la empresa"}</Label>
                    <input
                      type="text"
                      defaultValue="TechStartup Pro"
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{isEn ? "Primary domain" : "Dominio principal"}</Label>
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
                    <Label>{isEn ? "Industry" : "Industria"}</Label>
                    <select className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors">
                      <option value="saas">SaaS / Software</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="fintech">Fintech</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>{isEn ? "Team size" : "Tamaño del equipo"}</Label>
                    <select className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors">
                      <option value="1-10">1-10 empleados</option>
                      <option value="11-50">11-50 empleados</option>
                      <option value="51-200">51-200 empleados</option>
                      <option value="200+">200+ empleados</option>
                    </select>
                  </div>

                  <Button className="bg-primary hover:bg-primary/90">{isEn ? "Save changes" : "Guardar cambios"}</Button>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>{isEn ? "Notification Preferences" : "Preferencias de Notificaciones"}</CardTitle>
                  <CardDescription>{isEn ? "Control which notifications you receive" : "Controla qué notificaciones recibes"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {translatedNotifications.map((notification) => (
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
                  <CardDescription>{isEn ? "Manage your API keys for integrations" : "Gestiona tus claves de API para integraciones"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Production API Key</p>
                        <p className="text-sm text-muted-foreground">{isEn ? "Created 30 days ago" : "Creada hace 30 días"}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        {isEn ? "Active" : "Activa"}
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
                      {isEn ? "Regenerate key" : "Regenerar key"}
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Key className="w-4 h-4 mr-2" />
                      {isEn ? "Create new key" : "Crear nueva key"}
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm">
                      <strong>{isEn ? "Note" : "Nota"}:</strong> {isEn ? "Keep your API keys secure and never share them publicly." : "Mantén tus API keys seguras y nunca las compartas públicamente."} 
                      {isEn ? "See our " : "Consulta nuestra "}<span className="text-primary cursor-pointer hover:underline">{isEn ? "documentation" : "documentación"}</span>{isEn ? " for more information." : " para más información."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>{isEn ? "Billing and Plan" : "Facturación y Plan"}</CardTitle>
                  <CardDescription>{isEn ? "Manage your subscription and payment methods" : "Gestiona tu suscripción y métodos de pago"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{isEn ? "Current plan" : "Plan actual"}</p>
                        <p className="text-2xl font-bold">Growth</p>
                        <p className="text-muted-foreground">{isEn ? "$149/month" : "$149/mes"}</p>
                      </div>
                      <Button className="bg-primary hover:bg-primary/90">
                        Upgrade a Enterprise
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-medium">{isEn ? "Payment method" : "Método de pago"}</p>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                      <div>
                        <p className="font-medium">{isEn ? "No payment method connected" : "Sin método de pago conectado"}</p>
                        <p className="text-sm text-muted-foreground">{isEn ? "Stripe billing is pending for plan changes." : "La facturación con Stripe está pendiente para cambios de plan."}</p>
                      </div>
                      <Button variant="ghost" size="sm" disabled>{isEn ? "Pending" : "Pendiente"}</Button>
                    </div>
                  </div>

                  <Button variant="outline" className="border-border">
                    {isEn ? "View invoice history" : "Ver historial de facturas"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>{isEn ? "Security" : "Seguridad"}</CardTitle>
                  <CardDescription>{isEn ? "Protect your account" : "Protege tu cuenta"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{isEn ? "Current password" : "Contraseña actual"}</Label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isEn ? "New password" : "Nueva contraseña"}</Label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isEn ? "Confirm password" : "Confirmar contraseña"}</Label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>

                  <Button className="bg-primary hover:bg-primary/90">{isEn ? "Update password" : "Actualizar contraseña"}</Button>

                  <div className="border-t border-border pt-6 mt-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div>
                        <p className="font-medium text-red-400">{isEn ? "Danger zone" : "Zona de peligro"}</p>
                        <p className="text-sm text-muted-foreground">{isEn ? "Permanently delete your account" : "Eliminar permanentemente tu cuenta"}</p>
                      </div>
                      <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isEn ? "Delete account" : "Eliminar cuenta"}
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

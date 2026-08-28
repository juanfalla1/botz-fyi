"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BellRing,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import styles from "./cie.module.css";
import {
  AlertRecord,
  Invoice,
  assignments,
  attendances,
  authorizations,
  documents,
  formatCurrency,
  initialAlerts,
  initialInvoices,
  initialSettlements,
  operationSummary,
  professionalById,
  professionals,
  schoolById,
  schools,
  statusTone,
  studentById,
  students,
} from "./demo-data";

type View = "dashboard" | "alumnos" | "profesionales" | "asignaciones" | "escuelas" | "asistencias" | "documentacion" | "autorizaciones" | "facturacion" | "liquidaciones" | "alertas" | "reportes" | "configuracion";
type DemoRole = "Administración" | "Profesional";

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alumnos", label: "Alumnos", icon: GraduationCap },
  { id: "profesionales", label: "Profesionales", icon: Users },
  { id: "asignaciones", label: "Asignaciones", icon: UserCheck },
  { id: "escuelas", label: "Escuelas", icon: Building2 },
  { id: "asistencias", label: "Asistencias", icon: CalendarCheck },
  { id: "documentacion", label: "Documentación", icon: FileText },
  { id: "autorizaciones", label: "Autorizaciones y CUD", icon: ShieldCheck },
  { id: "facturacion", label: "Facturación", icon: ReceiptText },
  { id: "liquidaciones", label: "Liquidaciones", icon: WalletCards },
  { id: "alertas", label: "Alertas", icon: BellRing },
  { id: "reportes", label: "Reportes", icon: BookOpen },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

const professionalViews: View[] = ["dashboard", "profesionales", "asistencias", "documentacion", "facturacion", "liquidaciones", "alertas"];

export default function CieDemoPage() {
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<DemoRole>("Administración");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [alerts, setAlerts] = useState<AlertRecord[]>(initialAlerts);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleNav = role === "Administración" ? navItems : navItems.filter((item) => professionalViews.includes(item.id));

  function navigate(next: View) {
    setView(next);
    setMenuOpen(false);
  }

  function switchRole(next: DemoRole) {
    setRole(next);
    setView(next === "Profesional" ? "profesionales" : "dashboard");
    setToast(`Vista cambiada a ${next}`);
  }

  function uploadInvoice() {
    if (invoices.some((invoice) => invoice.id === "FC-DEMO-NUEVA")) {
      setToast("La factura demo ya fue cargada");
      return;
    }
    setInvoices((current) => [{ id: "FC-DEMO-NUEVA", professionalId: "pro-valentina", period: "Agosto 2026", studentId: "stu-sofia", coverage: "Salud Demo", amount: 486000, received: true, attendanceValidated: true, authorizationValid: true, status: "En validación" }, ...current]);
    setToast("Factura cargada: pendiente de validación administrativa");
  }

  function resolveAlert(id: string) {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    setToast("Alerta marcada como resuelta en el demo");
  }

  return <main className={styles.app}>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}><Image src="/cie-demo/icon.svg" alt="CIE" width={44} height={44} /><span><strong>CIE</strong><small>Centro de Integración Escolar</small></span><button type="button" className={styles.closeMenu} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><PanelLeftClose /></button></div>
      <div className={styles.demoLabel}><span>DEMO COMERCIAL</span><small>Datos ficticios · Entorno no productivo</small></div>
      <div className={styles.roleSwitch}><small>VISTA ACTUAL</small><div><button type="button" className={role === "Administración" ? styles.roleActive : ""} onClick={() => switchRole("Administración")}>Administración</button><button type="button" className={role === "Profesional" ? styles.roleActive : ""} onClick={() => switchRole("Profesional")}>Profesional</button></div></div>
      <nav className={styles.nav} aria-label="Navegación CIE">{visibleNav.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={view === item.id ? styles.navActive : ""} onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}><Icon /><span>{item.label}</span>{item.id === "alertas" && alerts.length > 0 && <b>{alerts.length}</b>}</button>; })}</nav>
      <div className={styles.sidebarUser}><i>{role === "Profesional" ? "VR" : "PB"}</i><span><strong>{role === "Profesional" ? "Valentina Ruiz" : "Paula Benítez"}</strong><small>{role === "Profesional" ? "APND / Psicopedagogía" : "Administración CIE"}</small></span></div>
    </aside>

    {menuOpen && <button type="button" className={styles.scrim} onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}

    <section className={styles.workspace}>
      <header className={styles.topbar}><button type="button" className={styles.menuButton} onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu /></button><div><span>OPERACIÓN SAIE</span><strong>{role === "Profesional" ? "Portal profesional" : "Centro de control institucional"}</strong></div><label className={styles.globalSearch}><Search /><input aria-label="Buscar en CIE" placeholder="Buscar alumno, profesional o escuela" /></label><button type="button" className={styles.alertButton} onClick={() => navigate("alertas")} aria-label="Ver alertas"><BellRing /><b>{alerts.length}</b></button></header>
      <div className={styles.content}>
        {view === "dashboard" && <Dashboard role={role} alerts={alerts} onNavigate={navigate} onToast={setToast} />}
        {view === "alumnos" && <StudentsView onToast={setToast} />}
        {view === "profesionales" && <ProfessionalsView role={role} onNavigate={navigate} onToast={setToast} />}
        {view === "asignaciones" && <AssignmentsView onToast={setToast} />}
        {view === "escuelas" && <SchoolsView onToast={setToast} />}
        {view === "asistencias" && <AttendanceView role={role} onToast={setToast} />}
        {view === "documentacion" && <DocumentsView role={role} onToast={setToast} />}
        {view === "autorizaciones" && <AuthorizationsView onToast={setToast} />}
        {view === "facturacion" && <BillingView role={role} invoices={invoices} onUpload={uploadInvoice} onToast={setToast} />}
        {view === "liquidaciones" && <SettlementsView role={role} onToast={setToast} />}
        {view === "alertas" && <AlertsView alerts={alerts} onNavigate={navigate} onResolve={resolveAlert} />}
        {view === "reportes" && <ReportsView onToast={setToast} />}
        {view === "configuracion" && <SettingsView onToast={setToast} />}
      </div>
      <nav className={styles.bottomNav} aria-label="Navegación móvil">{visibleNav.slice(0, 4).map((item) => { const Icon = item.icon; return <button type="button" key={item.id} className={view === item.id ? styles.bottomActive : ""} onClick={() => navigate(item.id)}><Icon /><span>{item.label}</span></button>; })}<button type="button" onClick={() => setMenuOpen(true)}><MoreHorizontal /><span>Más</span></button></nav>
    </section>
    {toast && <div className={styles.toast}><Check />{toast}</div>}
  </main>;
}

function PageHead({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className={styles.pageHead}><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Status({ value }: { value: string }) {
  return <em className={`${styles.status} ${styles[`tone_${statusTone(value)}`]}`}>{value}</em>;
}

function Dashboard({ role, alerts, onNavigate, onToast }: { role: DemoRole; alerts: AlertRecord[]; onNavigate: (view: View) => void; onToast: (text: string) => void }) {
  if (role === "Profesional") return <ProfessionalDashboard onNavigate={onNavigate} onToast={onToast} />;
  const metrics = [
    ["Profesionales activos", operationSummary.professionals, Users, "info"],
    ["Alumnos activos", operationSummary.students, GraduationCap, "success"],
    ["Escuelas activas", operationSummary.schools, Building2, "neutral"],
    ["Vacantes sin cubrir", operationSummary.vacancies, UserCheck, "danger"],
    ["Facturas pendientes", operationSummary.pendingInvoices, ReceiptText, "warning"],
    ["Liquidaciones pendientes", operationSummary.pendingSettlements, WalletCards, "warning"],
    ["CUD próximos a vencer", operationSummary.expiringCud, FileCheck2, "danger"],
    ["Autorizaciones próximas", operationSummary.expiringAuthorizations, ShieldCheck, "warning"],
    ["Documentación profesional", operationSummary.incompleteProfessionals, AlertTriangle, "danger"],
    ["Asistencias por validar", operationSummary.pendingAttendances, CalendarCheck, "info"],
  ] as const;
  return <><PageHead eyebrow="TABLERO EJECUTIVO" title="Operación institucional CIE" description="Vista demostrativa consolidada de una institución SAIE de gran escala." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Reporte ejecutivo preparado en modo demo")}><BookOpen /> Generar reporte</button>} /><div className={styles.metricGrid}>{metrics.map(([label, value, Icon, tone]) => <article className={`${styles.metric} ${styles[`metric_${tone}`]}`} key={label}><div><span>{label}</span><strong>{value}</strong><small>Escenario ficticio agosto 2026</small></div><i><Icon /></i></article>)}</div><div className={styles.dashboardColumns}><section className={styles.panel}><div className={styles.panelHead}><div><span>ATENCIÓN PRIORITARIA</span><h2>Alertas críticas</h2></div><button type="button" onClick={() => onNavigate("alertas")}>Ver todas <ChevronRight /></button></div><div className={styles.criticalList}>{alerts.slice(0, 5).map((alert) => <button type="button" key={alert.id} onClick={() => onNavigate(alert.target as View)}><i className={alert.severity === "Crítica" ? styles.critical : styles.high}><AlertTriangle /></i><span><strong>{alert.title}</strong><small>{alert.detail}</small></span><ChevronRight /></button>)}</div></section><section className={styles.panel}><div className={styles.panelHead}><div><span>CIERRE DEL PERÍODO</span><h2>Facturación y liquidaciones</h2></div></div><div className={styles.financeSummary}><div><span>Facturación presentada</span><strong>{formatCurrency(8215000)}</strong><i><b style={{ width: "78%" }} /></i><small>78% del período procesado</small></div><div><span>Liquidaciones preparadas</span><strong>{formatCurrency(6148000)}</strong><i><b style={{ width: "64%" }} /></i><small>11 pendientes de revisión</small></div></div><div className={styles.quickLinks}><button type="button" onClick={() => onNavigate("facturacion")}><ReceiptText /> Revisar facturas</button><button type="button" onClick={() => onNavigate("liquidaciones")}><WalletCards /> Preparar liquidaciones</button></div></section></div><section className={styles.panel}><div className={styles.panelHead}><div><span>MUESTRA OPERATIVA</span><h2>Asignaciones recientes</h2></div><button type="button" onClick={() => onNavigate("asignaciones")}>Gestionar <ChevronRight /></button></div><AssignmentTable compact /></section></>;
}

function ProfessionalDashboard({ onNavigate, onToast }: { onNavigate: (view: View) => void; onToast: (text: string) => void }) {
  return <><PageHead eyebrow="PORTAL PROFESIONAL" title="Buen día, Valentina" description="Tus asignaciones, documentación, asistencias y circuito de cobro en un solo lugar." action={<button type="button" className={styles.primaryButton} onClick={() => onNavigate("facturacion")}><UploadCloud /> Subir factura</button>} /><div className={styles.professionalMetrics}><article className={styles.panel}><i><GraduationCap /></i><span><strong>1</strong><small>Alumno asignado</small></span></article><article className={styles.panel}><i><CalendarCheck /></i><span><strong>18</strong><small>Asistencias del mes</small></span></article><article className={styles.panel}><i><FileCheck2 /></i><span><strong>100%</strong><small>Documentación vigente</small></span></article><article className={styles.panel}><i><WalletCards /></i><span><strong>{formatCurrency(494500)}</strong><small>Liquidación estimada</small></span></article></div><div className={styles.dashboardColumns}><section className={styles.panel}><div className={styles.panelHead}><div><span>ASIGNACIÓN ACTIVA</span><h2>Sofía Martínez</h2></div><Status value="Activa" /></div><div className={styles.profileAssignment}><div><span>Escuela</span><strong>Escuela Primaria Demo Norte</strong></div><div><span>Horario</span><strong>Lunes a viernes · mañana</strong></div><div><span>Coordinación</span><strong>Julieta Campos</strong></div><div><span>Autorización</span><strong>20 horas semanales · Vigente</strong></div></div></section><section className={styles.panel}><div className={styles.panelHead}><div><span>ACCIONES DEL MES</span><h2>Próximos pasos</h2></div></div><div className={styles.professionalActions}><button type="button" onClick={() => onNavigate("asistencias")}><CalendarCheck /><span><strong>Validar asistencias</strong><small>1 registro pendiente</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate("facturacion")}><ReceiptText /><span><strong>Presentar factura</strong><small>Período agosto 2026</small></span><ChevronRight /></button><button type="button" onClick={() => onToast("Documento demo descargado")}><FileText /><span><strong>Ver documentación</strong><small>Todo vigente</small></span><ChevronRight /></button></div></section></div></>;
}

function StudentsView({ onToast }: { onToast: (text: string) => void }) {
  const [query, setQuery] = useState("");
  const visible = students.filter((student) => student.name.toLowerCase().includes(query.toLowerCase()) || schoolById(student.schoolId).name.toLowerCase().includes(query.toLowerCase()));
  return <><PageHead eyebrow="LEGAJOS Y RELACIONES" title="Alumnos y familias" description="Relación visible entre alumno, familia, escuela, profesional, coordinación y cobertura." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Alta de alumno abierta en modo demo")}>+ Nuevo alumno</button>} /><Toolbar query={query} setQuery={setQuery} placeholder="Buscar alumno o escuela" /><section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.studentColumns} ${styles.tableHeader}`}><span>ALUMNO / FAMILIA</span><span>ESCUELA</span><span>PROFESIONAL</span><span>COBERTURA</span><span>CUD</span><span>ESTADO</span></div>{visible.map((student) => { const assignment = assignments.find((item) => item.studentId === student.id); const professional = professionalById(assignment?.professionalId ?? null); return <button type="button" className={`${styles.dataRow} ${styles.studentColumns}`} key={student.id} onClick={() => onToast(`Legajo de ${student.name} abierto`)}><span className={styles.person}><i>{student.name.split(" ").map((part) => part[0]).join("")}</i><b>{student.name}<small>{student.family} · {student.age} años</small></b></span><span><b>{schoolById(student.schoolId).name}</b><small>{schoolById(student.schoolId).zone}</small></span><span>{professional ? professional.name : <em>Sin asignar</em>}</span><span>{student.coverage}</span><span><Status value={student.cudStatus} /></span><span><Status value={student.status} /></span></button>; })}</section></>;
}

function ProfessionalsView({ role, onNavigate, onToast }: { role: DemoRole; onNavigate: (view: View) => void; onToast: (text: string) => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(role === "Profesional" ? "pro-valentina" : "");
  const visible = professionals.filter((professional) => professional.name.toLowerCase().includes(query.toLowerCase()) || professional.specialty.toLowerCase().includes(query.toLowerCase()));
  if (role === "Profesional") return <ProfessionalProfile onNavigate={onNavigate} onToast={onToast} />;
  return <><PageHead eyebrow="RED DE MÁS DE 200 PROFESIONALES" title="Profesionales" description="Muestra operativa de perfiles, disponibilidad, asignaciones, acreditaciones y circuito administrativo." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Registro profesional abierto en modo demo")}>+ Registrar profesional</button>} /><Toolbar query={query} setQuery={setQuery} placeholder="Buscar profesional o especialidad" /><section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.professionalColumns} ${styles.tableHeader}`}><span>PROFESIONAL</span><span>ZONA / DISPONIBILIDAD</span><span>ALUMNO / ESCUELA</span><span>DOCUMENTACIÓN</span><span>ACREDITACIÓN</span><span>GESTIÓN</span></div>{visible.map((professional) => { const student = professional.studentIds[0] ? studentById(professional.studentIds[0]) : null; return <button type="button" className={`${styles.dataRow} ${styles.professionalColumns}`} key={professional.id} onClick={() => setSelectedId(professional.id)}><span className={styles.person}><i>{professional.initials}</i><b>{professional.name}<small>{professional.specialty}</small></b></span><span><b>{professional.zones.join(" · ")}</b><small>{professional.availability} · Carga {professional.currentLoad}/3</small></span><span>{student ? <><b>{student.name}</b><small>{schoolById(student.schoolId).name}</small></> : <em>Sin alumno asignado</em>}</span><span><Status value={professional.documentation} /></span><span><b>{professional.accreditation}</b><small>Vence {professional.accreditationExpiry}</small></span><span><Status value={professional.billingStatus} /></span></button>; })}</section>{selectedId && <ProfessionalModal professionalId={selectedId} onClose={() => setSelectedId("")} onToast={onToast} />}</>;
}

function ProfessionalProfile({ onNavigate, onToast }: { onNavigate: (view: View) => void; onToast: (text: string) => void }) {
  const professional = professionalById("pro-valentina")!;
  const student = studentById("stu-sofia");
  return <><PageHead eyebrow="AUTOGESTIÓN PROFESIONAL" title="Mi perfil profesional" description="Información personal, acreditaciones, alumno asignado y estado administrativo." action={<button type="button" className={styles.secondaryButton} onClick={() => onToast("Edición de perfil abierta en modo demo")}>Editar datos</button>} /><div className={styles.profileHero}><section className={styles.panel}><div className={styles.profileIdentity}><i>{professional.initials}</i><div><h2>{professional.name}</h2><p>{professional.specialty}</p><Status value={professional.status} /></div></div><dl><div><dt>Matrícula</dt><dd>{professional.accreditation}</dd></div><div><dt>Zonas</dt><dd>{professional.zones.join(", ")}</dd></div><div><dt>Disponibilidad</dt><dd>{professional.availability}</dd></div><div><dt>Documentación</dt><dd><Status value={professional.documentation} /></dd></div></dl></section><section className={styles.panel}><div className={styles.panelHead}><div><span>ALUMNO Y ESCUELA ASIGNADOS</span><h2>{student.name}</h2></div><Status value="Activa" /></div><div className={styles.profileAssignment}><div><span>Escuela</span><strong>{schoolById(student.schoolId).name}</strong></div><div><span>Familia</span><strong>{student.family}</strong></div><div><span>Horario</span><strong>Lunes a viernes · mañana</strong></div><div><span>Coordinación</span><strong>{student.coordinator}</strong></div></div></section></div><div className={styles.portalCards}><button type="button" onClick={() => onNavigate("documentacion")}><FileCheck2 /><span><strong>Documentación</strong><small>Matrícula y seguro vigentes</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate("asistencias")}><CalendarCheck /><span><strong>Asistencias</strong><small>18 registradas · 1 pendiente</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate("facturacion")}><ReceiptText /><span><strong>Facturas</strong><small>Agosto pendiente de presentación</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate("liquidaciones")}><WalletCards /><span><strong>Liquidaciones</strong><small>{formatCurrency(494500)} estimados</small></span><ChevronRight /></button></div></>;
}

function ProfessionalModal({ professionalId, onClose, onToast }: { professionalId: string; onClose: () => void; onToast: (text: string) => void }) {
  const professional = professionalById(professionalId)!;
  return <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={`Perfil de ${professional.name}`}><section className={styles.modal}><header><div className={styles.person}><i>{professional.initials}</i><b>{professional.name}<small>{professional.specialty}</small></b></div><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header><div className={styles.modalGrid}><div><span>DOCUMENTACIÓN</span><strong>{professional.documentation}</strong><small>{professional.accreditation}</small></div><div><span>VENCIMIENTO</span><strong>{professional.accreditationExpiry}</strong><small>Acreditación profesional</small></div><div><span>ASISTENCIAS</span><strong>{professional.attendanceStatus}</strong><small>Período agosto 2026</small></div><div><span>FACTURACIÓN</span><strong>{professional.billingStatus}</strong><small>Último circuito registrado</small></div></div><h3>Asignaciones activas</h3>{professional.studentIds.length ? professional.studentIds.map((id) => { const student = studentById(id); return <div className={styles.assignmentCard} key={id}><GraduationCap /><span><strong>{student.name}</strong><small>{schoolById(student.schoolId).name}</small></span><Status value="Activa" /></div>; }) : <div className={styles.emptyState}>Sin asignaciones activas en esta muestra.</div>}<footer><button type="button" onClick={() => onToast("Documentación abierta en modo demo")}>Ver documentación</button><button type="button" onClick={() => onToast("Gestión administrativa abierta en modo demo")}>Gestionar profesional</button></footer></section></div>;
}

function AssignmentsView({ onToast }: { onToast: (text: string) => void }) {
  return <><PageHead eyebrow="RELACIÓN PROFESIONAL → ALUMNO → ESCUELA" title="Asignaciones" description="Cobertura de vacantes y trazabilidad de cada relación operativa." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Nueva asignación iniciada en modo demo")}>+ Nueva asignación</button>} /><section className={styles.panel}><div className={styles.panelHead}><div><span>ASIGNACIONES ACTUALES</span><h2>Mapa operativo</h2></div><Status value="4 activas · 1 vacante" /></div><AssignmentTable /></section><section className={`${styles.panel} ${styles.matchingPanel}`}><div className={styles.panelHead}><div><span>MATCHING DEMOSTRATIVO</span><h2>Necesidad: Sofía Martínez</h2></div><Status value="3 candidatos compatibles" /></div><div className={styles.requirementGrid}><div><span>Escuela</span><strong>Escuela Primaria Demo Norte</strong></div><div><span>Zona</span><strong>Palermo</strong></div><div><span>Horario</span><strong>Lunes a viernes · mañana</strong></div><div><span>Perfil requerido</span><strong>APND / Psicopedagogía</strong></div></div><div className={styles.candidateList}><Candidate professionalId="pro-valentina" score={98} reasons={["Zona exacta", "Horario completo", "Documentación vigente", "Perfil requerido"]} onToast={onToast} /><Candidate professionalId="pro-lucia" score={91} reasons={["Zona exacta", "Horario completo", "Sin carga actual", "Perfil requerido"]} onToast={onToast} /><Candidate professionalId="pro-federico" score={72} reasons={["Zona exacta", "Horario completo", "Documentación pendiente", "Perfil relacionado"]} onToast={onToast} /></div></section></>;
}

function AssignmentTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? assignments.slice(0, 4) : assignments;
  return <div className={styles.tableWrap}><div className={`${styles.dataRow} ${styles.assignmentColumns} ${styles.tableHeader}`}><span>ALUMNO</span><span>PROFESIONAL</span><span>ESCUELA</span><span>HORARIO</span><span>ESTADO</span></div>{rows.map((assignment) => <div className={`${styles.dataRow} ${styles.assignmentColumns}`} key={assignment.id}><span><b>{studentById(assignment.studentId).name}</b><small>{assignment.requiredProfile}</small></span><span>{professionalById(assignment.professionalId)?.name ?? <em>Vacante sin cubrir</em>}</span><span><b>{schoolById(assignment.schoolId).name}</b><small>{assignment.zone}</small></span><span>{assignment.schedule}</span><span><Status value={assignment.status} /></span></div>)}</div>;
}

function Candidate({ professionalId, score, reasons, onToast }: { professionalId: string; score: number; reasons: string[]; onToast: (text: string) => void }) {
  const professional = professionalById(professionalId)!;
  return <article><div className={styles.person}><i>{professional.initials}</i><b>{professional.name}<small>{professional.specialty}</small></b></div><div className={styles.matchReasons}>{reasons.map((reason) => <span key={reason}><Check />{reason}</span>)}</div><div className={styles.score}><strong>{score}%</strong><small>compatibilidad</small></div><button type="button" onClick={() => onToast(`${professional.name} seleccionado en modo demo`)}>Seleccionar</button></article>;
}

function SchoolsView({ onToast }: { onToast: (text: string) => void }) {
  return <><PageHead eyebrow="RED EDUCATIVA" title="Escuelas" description="Instituciones, contactos y relaciones activas con alumnos y profesionales." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Alta de escuela abierta en modo demo")}>+ Nueva escuela</button>} /><div className={styles.schoolGrid}>{schools.map((school) => <button type="button" className={styles.panel} key={school.id} onClick={() => onToast(`Ficha de ${school.name} abierta`)}><div><i><Building2 /></i><Status value={school.status} /></div><h2>{school.name}</h2><p>{school.address} · {school.zone}</p><dl><div><dt>Alumnos activos</dt><dd>{school.students}</dd></div><div><dt>Referente</dt><dd>{school.contact}</dd></div></dl><span>Ver alumnos y asignaciones <ChevronRight /></span></button>)}</div></>;
}

function AttendanceView({ role, onToast }: { role: DemoRole; onToast: (text: string) => void }) {
  const rows = role === "Profesional" ? attendances.filter((attendance) => assignmentByProfessional(attendance.assignmentId, "pro-valentina")) : attendances;
  return <><PageHead eyebrow="PRESENTISMO Y VALIDACIÓN" title={role === "Profesional" ? "Mis asistencias" : "Asistencias"} description="Registro profesional, alumno, escuela, fecha, horario y estado de validación." action={role === "Profesional" ? <button type="button" className={styles.primaryButton} onClick={() => onToast("Asistencia registrada en modo demo")}>Registrar asistencia</button> : undefined} /><section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.attendanceColumns} ${styles.tableHeader}`}><span>FECHA</span><span>PROFESIONAL</span><span>ALUMNO / ESCUELA</span><span>ENTRADA</span><span>SALIDA</span><span>VALIDACIÓN</span></div>{rows.map((attendance) => { const assignment = assignments.find((item) => item.id === attendance.assignmentId)!; return <div className={`${styles.dataRow} ${styles.attendanceColumns}`} key={attendance.id}><span><b>{attendance.date}</b></span><span>{professionalById(assignment.professionalId)?.name ?? "Sin profesional"}</span><span><b>{studentById(assignment.studentId).name}</b><small>{schoolById(assignment.schoolId).name}</small></span><span>{attendance.entry}</span><span>{attendance.exit}</span><span><Status value={attendance.status} />{role === "Administración" && attendance.status !== "Validada" && <button type="button" className={styles.inlineAction} onClick={() => onToast("Asistencia validada en modo demo")}>Validar</button>}</span></div>; })}</section></>;
}

function DocumentsView({ role, onToast }: { role: DemoRole; onToast: (text: string) => void }) {
  const rows = role === "Profesional" ? documents.filter((document) => document.ownerId === "pro-valentina") : documents;
  return <><PageHead eyebrow="GESTIÓN DOCUMENTAL" title={role === "Profesional" ? "Mi documentación" : "Documentación"} description="CUD, matrículas, seguros, títulos y vencimientos vinculados a cada legajo." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Selector de archivos abierto en modo demo")}><UploadCloud /> Subir documento</button>} /><div className={styles.documentKpis}><article className={styles.panel}><strong>83%</strong><span>Documentación completa</span></article><article className={styles.panel}><strong>12</strong><span>Próximos a vencer</span></article><article className={styles.panel}><strong>3</strong><span>Vencidos</span></article><article className={styles.panel}><strong>5</strong><span>Pendientes</span></article></div><section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.documentColumns} ${styles.tableHeader}`}><span>DOCUMENTO</span><span>TITULAR</span><span>TIPO</span><span>VENCIMIENTO</span><span>ESTADO</span></div>{rows.map((document) => { const owner = document.ownerType === "Alumno" ? studentById(document.ownerId).name : professionalById(document.ownerId)?.name; return <button type="button" className={`${styles.dataRow} ${styles.documentColumns}`} key={document.id} onClick={() => onToast(`Vista previa de ${document.name}`)}><span className={styles.fileName}><FileText /><b>{document.name}<small>Archivo PDF ficticio</small></b></span><span>{owner}</span><span>{document.type}</span><span>{document.expiresAt ?? "Sin vencimiento"}</span><span><Status value={document.status} /></span></button>; })}</section></>;
}

function AuthorizationsView({ onToast }: { onToast: (text: string) => void }) {
  return <><PageHead eyebrow="CONTROL DE COBERTURA" title="CUD y autorizaciones" description="Vigencias, horas autorizadas y alertas documentales por alumno y cobertura." action={<button type="button" className={styles.primaryButton} onClick={() => onToast("Nueva autorización abierta en modo demo")}>+ Registrar autorización</button>} /><section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.authorizationColumns} ${styles.tableHeader}`}><span>ALUMNO</span><span>COBERTURA</span><span>PRESTACIÓN</span><span>VIGENCIA</span><span>HORAS</span><span>ESTADO</span></div>{authorizations.map((authorization) => <button type="button" className={`${styles.dataRow} ${styles.authorizationColumns}`} key={authorization.id} onClick={() => onToast(`Autorización de ${studentById(authorization.studentId).name} abierta`)}><span><b>{studentById(authorization.studentId).name}</b><small>CUD: {studentById(authorization.studentId).cudStatus}</small></span><span>{authorization.coverage}</span><span>{authorization.service}</span><span><b>{authorization.validFrom}</b><small>hasta {authorization.validTo}</small></span><span>{authorization.weeklyHours} h/sem.</span><span><Status value={authorization.status} /></span></button>)}</section></>;
}

function BillingView({ role, invoices, onUpload, onToast }: { role: DemoRole; invoices: Invoice[]; onUpload: () => void; onToast: (text: string) => void }) {
  const rows = role === "Profesional" ? invoices.filter((invoice) => invoice.professionalId === "pro-valentina") : invoices;
  return <><PageHead eyebrow={role === "Profesional" ? "AUTOGESTIÓN PROFESIONAL" : "CIRCUITO ADMINISTRATIVO"} title={role === "Profesional" ? "Mis facturas" : "Facturación profesional"} description="Factura recibida, asistencia, autorización y validación en una única vista." action={<button type="button" className={styles.primaryButton} onClick={onUpload}><UploadCloud /> Subir factura</button>} />{role === "Profesional" && <section className={`${styles.panel} ${styles.uploadCard}`}><i><ReceiptText /></i><div><h2>Factura de agosto 2026</h2><p>La carga demo vincula automáticamente a Sofía Martínez, Salud Demo y las asistencias del período.</p></div><button type="button" onClick={onUpload}>Seleccionar PDF ficticio</button></section>}<section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.invoiceColumns} ${styles.tableHeader}`}><span>FACTURA / PROFESIONAL</span><span>PERÍODO / ALUMNO</span><span>COBERTURA</span><span>IMPORTE</span><span>CONTROLES</span><span>ESTADO</span></div>{rows.map((invoice) => <button type="button" className={`${styles.dataRow} ${styles.invoiceColumns}`} key={invoice.id} onClick={() => onToast(`Detalle de ${invoice.id} abierto`)}><span><b>{invoice.id}</b><small>{professionalById(invoice.professionalId)?.name}</small></span><span><b>{invoice.period}</b><small>{studentById(invoice.studentId).name}</small></span><span>{invoice.coverage}</span><span><b>{formatCurrency(invoice.amount)}</b></span><span className={styles.checks}><small className={invoice.received ? styles.checkOk : styles.checkMissing}>{invoice.received ? <Check /> : <X />} Factura</small><small className={invoice.attendanceValidated ? styles.checkOk : styles.checkMissing}>{invoice.attendanceValidated ? <Check /> : <X />} Asistencia</small><small className={invoice.authorizationValid ? styles.checkOk : styles.checkMissing}>{invoice.authorizationValid ? <Check /> : <X />} Autorización</small></span><span><Status value={invoice.status} /></span></button>)}</section></>;
}

function SettlementsView({ role, onToast }: { role: DemoRole; onToast: (text: string) => void }) {
  const rows = role === "Profesional" ? initialSettlements.filter((settlement) => settlement.professionalId === "pro-valentina") : initialSettlements;
  return <><PageHead eyebrow="CIERRE PROFESIONAL" title={role === "Profesional" ? "Mis liquidaciones" : "Liquidaciones"} description="Factura recibida → asistencia validada → autorización correcta → aprobación → liquidación." action={role === "Administración" ? <button type="button" className={styles.primaryButton} onClick={() => onToast("Lote de liquidaciones preparado en modo demo")}>Preparar lote</button> : undefined} /><div className={styles.flow}><span><ReceiptText />Factura recibida</span><ChevronRight /><span><CalendarCheck />Asistencia validada</span><ChevronRight /><span><ShieldCheck />Autorización correcta</span><ChevronRight /><span><BadgeCheck />Aprobación</span><ChevronRight /><span><WalletCards />Liquidación</span></div><section className={`${styles.panel} ${styles.tableWrap}`}><div className={`${styles.dataRow} ${styles.settlementColumns} ${styles.tableHeader}`}><span>PROFESIONAL / PERÍODO</span><span>HORAS</span><span>BRUTO</span><span>AJUSTES</span><span>NETO</span><span>ESTADO / OBSERVACIÓN</span></div>{rows.map((settlement) => <button type="button" className={`${styles.dataRow} ${styles.settlementColumns}`} key={settlement.id} onClick={() => onToast(`Detalle de ${settlement.id} abierto`)}><span><b>{professionalById(settlement.professionalId)?.name}</b><small>{settlement.period} · {settlement.id}</small></span><span>{settlement.hours} h</span><span>{formatCurrency(settlement.grossAmount)}</span><span>{formatCurrency(settlement.adjustments)}</span><span><b>{formatCurrency(settlement.netAmount)}</b></span><span><Status value={settlement.status} /><small>{settlement.note}</small></span></button>)}</section></>;
}

function AlertsView({ alerts, onNavigate, onResolve }: { alerts: AlertRecord[]; onNavigate: (view: View) => void; onResolve: (id: string) => void }) {
  return <><PageHead eyebrow="CONTROL PREVENTIVO" title="Alertas y vencimientos" description="Señales automáticas simuladas para anticipar riesgos documentales, operativos y financieros." /><div className={styles.alertGrid}>{alerts.length ? alerts.map((alert) => <article className={`${styles.panel} ${styles.alertCard}`} key={alert.id}><i className={alert.severity === "Crítica" ? styles.critical : alert.severity === "Alta" ? styles.high : styles.medium}><AlertTriangle /></i><div><span>{alert.category} · PRIORIDAD {alert.severity.toUpperCase()}</span><h2>{alert.title}</h2><p>{alert.detail}</p><div><button type="button" onClick={() => onNavigate(alert.target as View)}>Revisar casos <ChevronRight /></button><button type="button" onClick={() => onResolve(alert.id)}><Check /> Marcar resuelta</button></div></div><strong>{alert.count}</strong></article>) : <section className={`${styles.panel} ${styles.allClear}`}><BadgeCheck /><h2>Sin alertas abiertas</h2><p>Todas las alertas fueron resueltas durante esta sesión demo.</p></section>}</div></>;
}

function ReportsView({ onToast }: { onToast: (text: string) => void }) {
  return <><PageHead eyebrow="ANÁLISIS OPERATIVO" title="Reportes" description="Indicadores demostrativos derivados de la misma muestra relacional." action={<button type="button" className={styles.secondaryButton} onClick={() => onToast("Exportación preparada en modo demo")}>Exportar XLSX</button>} /><div className={styles.reportGrid}><section className={styles.panel}><div className={styles.panelHead}><div><span>ASISTENCIAS POR ESCUELA</span><h2>Agosto 2026</h2></div></div><BarChart values={[88, 72, 64, 53]} labels={["Demo Norte", "Horizonte", "Demo Sur", "Río"]} /></section><section className={styles.panel}><div className={styles.panelHead}><div><span>HORAS POR PROFESIONAL</span><h2>Top de la muestra</h2></div></div><div className={styles.ranking}>{professionals.slice(0, 5).map((professional, index) => <div key={professional.id}><i>{index + 1}</i><span><strong>{professional.name}</strong><small>{professional.specialty}</small></span><b>{68 - index * 7} h</b></div>)}</div></section><section className={styles.panel}><div className={styles.panelHead}><div><span>FACTURACIÓN Y LIQUIDACIÓN</span><h2>Resumen del período</h2></div></div><div className={styles.reportAmounts}><div><span>Facturado</span><strong>{formatCurrency(8215000)}</strong></div><div><span>Aprobado</span><strong>{formatCurrency(6940000)}</strong></div><div><span>A liquidar</span><strong>{formatCurrency(6148000)}</strong></div></div></section></div></>;
}

function SettingsView({ onToast }: { onToast: (text: string) => void }) {
  const [days, setDays] = useState("30");
  const [period, setPeriod] = useState("Agosto 2026");
  return <><PageHead eyebrow="PARÁMETROS DEL DEMO" title="Configuración" description="Preferencias locales y no persistentes de esta demostración." /><div className={styles.settingsGrid}><section className={styles.panel}><h2>Vencimientos</h2><label>Días para considerar “próximo a vencer”<input value={days} onChange={(event) => setDays(event.target.value)} /></label><label>Período operativo<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Agosto 2026</option><option>Julio 2026</option></select></label><button type="button" onClick={() => onToast("Configuración guardada durante esta sesión demo")}>Guardar cambios</button></section><section className={styles.panel}><h2>Notificaciones simuladas</h2><label className={styles.switchRow}><span><strong>Alertas documentales</strong><small>CUD, matrículas y seguros</small></span><input type="checkbox" defaultChecked /></label><label className={styles.switchRow}><span><strong>Cierre de facturación</strong><small>Recordatorios a profesionales</small></span><input type="checkbox" defaultChecked /></label><label className={styles.switchRow}><span><strong>Asistencias pendientes</strong><small>Aviso a coordinación</small></span><input type="checkbox" defaultChecked /></label></section><section className={`${styles.panel} ${styles.demoNotice}`}><ShieldCheck /><div><h2>Aislamiento del entorno</h2><p>Esta configuración no utiliza cookies, almacenamiento local ni datos de Arabela. Al recargar, el estado CIE vuelve a su escenario ficticio inicial.</p></div></section></div></>;
}

function Toolbar({ query, setQuery, placeholder }: { query: string; setQuery: (value: string) => void; placeholder: string }) {
  return <div className={`${styles.panel} ${styles.toolbar}`}><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></label><button type="button"><Filter /> Todos los estados</button><button type="button"><Filter /> Todas las zonas</button></div>;
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  return <div className={styles.barChart}>{values.map((value, index) => <div key={labels[index]}><i style={{ height: `${value}%` }}><b>{value}</b></i><span>{labels[index]}</span></div>)}</div>;
}

function assignmentByProfessional(assignmentId: string, professionalId: string) {
  return assignments.find((assignment) => assignment.id === assignmentId)?.professionalId === professionalId;
}

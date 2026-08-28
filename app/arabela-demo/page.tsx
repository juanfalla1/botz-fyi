"use client";

import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Clock3,
  Download,
  Disc3,
  FileCheck2,
  FileText,
  FileWarning,
  FolderOpen,
  Gauge,
  HeartHandshake,
  Home,
  History,
  IdCard,
  LogIn,
  LogOut,
  LockKeyhole,
  Menu,
  Mail,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  PhoneCall,
  Plus,
  Search,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  UserCog,
  UploadCloud,
  Workflow,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type View = "inicio" | "admisiones" | "casos" | "mensajes" | "agenda" | "documentos" | "profesionales" | "usuarios" | "indicadores";
type Role = "Familia" | "APND/profesional" | "Coordinación" | "Administración" | "Dirección";
type SavedRecording = { name: string; date: string; duration: string; participants: number };
type Admission = { id: string; family: string; child: string; service: string; zone: string; coverage: string; school: string; cud: string; need: string; status: string; professional: string; response: string };

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "admisiones", label: "Admisiones", icon: ClipboardList },
  { id: "casos", label: "Casos", icon: HeartHandshake },
  { id: "mensajes", label: "Mensajes", icon: MessageCircle },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
  { id: "profesionales", label: "Profesionales y CV", icon: IdCard },
  { id: "usuarios", label: "Usuarios y accesos", icon: UserCog },
  { id: "indicadores", label: "Indicadores", icon: Gauge },
];

const roleProfiles: Record<Role, { name: string; title: string; initials: string; summary: string }> = {
  "Familia": { name: "Mariana Gómez", title: "Familiar responsable", initials: "MG", summary: "Accede únicamente al caso de Sofía, sus mensajes, documentos y encuentros." },
  "APND/profesional": { name: "Valentina Ruiz", title: "APND / Profesional", initials: "VR", summary: "Gestiona los casos asignados, informes, conversaciones y videollamadas." },
  "Coordinación": { name: "Julieta Campos", title: "Coordinadora", initials: "JC", summary: "Supervisa casos, interviene en conversaciones y consulta la trazabilidad." },
  "Administración": { name: "Paula Benítez", title: "Administradora", initials: "PB", summary: "Gestiona usuarios, altas, bajas, accesos, asignaciones y documentos." },
  "Dirección": { name: "Andrea Ferraro", title: "Directora", initials: "AF", summary: "Consulta indicadores iniciales y la visión general de actividad." },
};

const cases = [
  { initials: "SM", name: "Sofía Martínez", age: "8 años", program: "Acompañamiento escolar", professional: "Lic. Valentina Ruiz", status: "Activo", tone: "blue" },
  { initials: "TJ", name: "Tomás Juárez", age: "12 años", program: "Inclusión educativa", professional: "Lic. Martín López", status: "Seguimiento", tone: "red" },
  { initials: "EA", name: "Emma Acosta", age: "6 años", program: "Apoyo domiciliario", professional: "Lic. Camila Ortiz", status: "Activo", tone: "green" },
  { initials: "LN", name: "Lucas Navarro", age: "10 años", program: "Acompañamiento escolar", professional: "Sin asignar", status: "Pendiente", tone: "amber" },
];

const conversations = [
  { initials: "SM", name: "Caso Sofía Martínez", preview: "Perfecto, nos vemos mañana.", time: "10:42", unread: 2 },
  { initials: "TJ", name: "Caso Tomás Juárez", preview: "Adjunté el informe semanal.", time: "Ayer", unread: 0 },
  { initials: "EA", name: "Caso Emma Acosta", preview: "Gracias por la actualización.", time: "Lun", unread: 0 },
];

const meetings = [
  { day: "06", month: "AGO", time: "09:30", title: "Seguimiento de Sofía", detail: "Familia + profesional", kind: "Videollamada", color: "blue" },
  { day: "06", month: "AGO", time: "12:00", title: "Revisión de caso Tomás", detail: "Coordinación interna", kind: "Reunión", color: "red" },
  { day: "07", month: "AGO", time: "10:15", title: "Entrevista inicial", detail: "Familia Navarro", kind: "Videollamada", color: "green" },
  { day: "08", month: "AGO", time: "16:00", title: "Seguimiento de Emma", detail: "Familia + profesional", kind: "Videollamada", color: "amber" },
];

const docs = [
  { name: "Informe de seguimiento - Sofía", type: "PDF", meta: "Actualizado hoy · 1.8 MB", owner: "Valentina Ruiz", state: "Validado" },
  { name: "Autorización familiar - Tomás", type: "PDF", meta: "2 ago 2026 · 620 KB", owner: "Coordinación", state: "Validado" },
  { name: "Plan de acompañamiento - Emma", type: "DOC", meta: "30 jul 2026 · 940 KB", owner: "Camila Ortiz", state: "En revisión" },
  { name: "CV profesional - Martín López", type: "PDF", meta: "24 jul 2026 · 1.2 MB", owner: "Administración", state: "Validado" },
];

export default function ArabelaDemoPage() {
  const [view, setView] = useState<View>("inicio");
  const [role, setRole] = useState<Role | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [admission, setAdmission] = useState<Admission>({ id: "ADM-2026-0184", family: "Mariana Gómez", child: "Sofía Martínez", service: "Integración escolar", zone: "Palermo", coverage: "OSDE", school: "Escuela Primaria N.º 18", cud: "Sí", need: "Buscamos acompañamiento para la jornada escolar.", status: "Profesional asignada", professional: "Valentina Ruiz", response: "Recibimos tu solicitud. Valentina Ruiz, profesional de integración escolar, fue asignada y se comunicará con vos." });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(next: View) {
    setView(next);
    setMobileOpen(false);
  }

  if (!role) return <DemoLogin onLogin={(selectedRole) => { setRole(selectedRole); setView(selectedRole === "Dirección" ? "indicadores" : selectedRole === "Administración" ? "admisiones" : "inicio"); }} onRequest={(request) => { setAdmission(request); setRole("Familia"); setView("admisiones"); }} />;

  const profile = roleProfiles[role];
  const visibleNav = navItems.filter((item) => {
    if (role === "Familia") return ["inicio", "admisiones", "casos", "mensajes", "agenda", "documentos"].includes(item.id);
    if (role === "APND/profesional") return !["usuarios", "indicadores"].includes(item.id);
    if (role === "Coordinación") return item.id !== "usuarios";
    if (role === "Administración") return item.id !== "indicadores";
    return ["inicio", "admisiones", "casos", "profesionales", "indicadores"].includes(item.id);
  });

  return (
    <main className="arabela-app">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Image src="/arabela-demo/icon.svg" alt="Arabela Salud" width={44} height={44} priority />
          </div>
          <div><strong>arabela <b>salud</b></strong><span>ASISTENCIA TERAPÉUTICA INTEGRAL</span></div>
          <button className="icon-button close-menu" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <div className="role-switcher">
          <span>VISTA DEL DEMO</span>
          <button onClick={() => setRoleOpen(!roleOpen)}><CircleUserRound size={20} /><span><small>Rol actual</small>{role}</span><ChevronDown size={16} /></button>
          {roleOpen && <div className="role-menu">{(Object.keys(roleProfiles) as Role[]).map((item) => <button key={item} onClick={() => { setRole(item); setView(item === "Dirección" ? "indicadores" : item === "Administración" ? "usuarios" : "inicio"); setRoleOpen(false); setToast(`Sesión cambiada a ${item}`); }}>{item}{role === item && <Check size={15} />}</button>)}</div>}
        </div>

        <nav>{visibleNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={20} /><span>{item.label}</span>{item.id === "mensajes" && <em>2</em>}</button>; })}</nav>

        <div className="secure-card"><ShieldCheck size={22} /><div><strong>Entorno de demostración</strong><span>Datos ficticios y seguros</span></div></div>
        <div className="sidebar-user"><div className="avatar avatar-jc">{profile.initials}</div><div><strong>{profile.name}</strong><span>{profile.title}</span></div><button className="logout-button" onClick={() => setRole(null)} aria-label="Cerrar sesión"><LogOut size={16} /><span>Salir</span></button></div>
      </aside>

      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}

      <section className="app-shell">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
          <div className="mobile-logo"><Image src="/arabela-demo/icon.svg" alt="Arabela" width={34} height={34} /><strong>arabela <b>salud</b></strong></div>
          <label className="global-search"><Search size={18} /><input aria-label="Buscar" placeholder="Buscar casos, personas o documentos..." /><kbd>⌘ K</kbd></label>
          <div className="top-actions"><button className="demo-pill"><Sparkles size={15} /> Demo interactivo</button><button className="icon-button notification"><Bell size={20} /><i /></button><div className="avatar avatar-jc">{profile.initials}</div></div>
        </header>

        <div className="content">
          {view === "inicio" && <Dashboard onNavigate={navigate} onToast={setToast} role={role} onStartCall={() => setCallOpen(true)} />}
          {view === "admisiones" && <><Admissions role={role} admission={admission} onChange={setAdmission} onToast={setToast} /><AdmissionEnhancements role={role} onToast={setToast} /></>}
          {view === "casos" && <Cases onToast={setToast} role={role} />}
          {view === "mensajes" && <Messages onToast={setToast} />}
          {view === "agenda" && <Agenda onToast={setToast} onStartCall={() => setCallOpen(true)} />}
          {view === "documentos" && <Documents onToast={setToast} recordings={recordings} />}
          {view === "profesionales" && <><Professionals onToast={setToast} role={role} />{role === "Administración" && <ProfessionalAdminPanel onToast={setToast} />}{role !== "Familia" && <ApplicationsBoard onToast={setToast} />}</>}
          {view === "usuarios" && <UserManagement onToast={setToast} />}
          {view === "indicadores" && <Indicators />}
        </div>

        <nav className="bottom-nav">{visibleNav.slice(0, 5).map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={20} /><span>{item.label}</span>{item.id === "mensajes" && <i>2</i>}</button>; })}</nav>
      </section>

      {callOpen && <VideoCall onClose={() => setCallOpen(false)} onSave={(recording) => { setRecordings((current) => [recording, ...current]); setToast("Grabación guardada en Documentos e historial"); }} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </main>
  );
}

function PageHead({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function DemoLogin({ onLogin, onRequest }: { onLogin: (role: Role) => void; onRequest: (admission: Admission) => void }) {
  const [selected, setSelected] = useState<Role>("Coordinación");
  const [requestOpen, setRequestOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [professionalSignup, setProfessionalSignup] = useState(false);
  return <main className="demo-login"><section className="login-brand"><div><Image src="/arabela-demo/icon.svg" alt="Arabela Salud" width={74} height={74} /><span><strong>arabela <b>salud</b></strong><small>ASISTENCIA TERAPÉUTICA INTEGRAL</small></span></div><h1>¿Necesitás acompañamiento<br />para tu familia?</h1><p>Contanos brevemente qué necesitás. Nuestro equipo recibe la solicitud, identifica el servicio adecuado y te conecta con un profesional.</p><div className="public-actions"><button onClick={() => setRequestOpen(true)}><HeartHandshake /> Solicitar atención</button><button onClick={() => setChatOpen(true)}><MessageCircle /> Hablar ahora</button></div><div className="login-points"><span><Bot /> Orientación inicial y respuesta inmediata</span><span><ClipboardList /> Solicitud centralizada y seguimiento</span><span><Users /> Derivación al equipo adecuado</span></div></section><section className="login-panel"><div className="login-card"><span className="eyebrow">ACCESO AL DEMO</span><h2>Elegí un usuario de prueba</h2><p>Cada perfil muestra las funciones y permisos que le corresponden.</p><div className="demo-users">{(Object.keys(roleProfiles) as Role[]).map((item) => { const person = roleProfiles[item]; return <button key={item} className={selected === item ? "selected" : ""} onClick={() => setSelected(item)}><i>{person.initials}</i><span><strong>{person.name}</strong><small>{item} · {person.title}</small></span>{selected === item ? <Check size={17} /> : <ChevronRight size={17} />}</button>; })}</div><div className="fake-credentials"><LockKeyhole size={16} /><span><strong>Ingreso demostrativo</strong><small>No requiere contraseña ni utiliza datos reales.</small></span></div><button className="login-button" onClick={() => onLogin(selected)}><LogIn size={18} /> Entrar como {selected}</button><button className="professional-register-link" onClick={() => setProfessionalSignup(true)}><BriefcaseBusiness size={16} /> Soy profesional · Crear cuenta</button></div></section>{requestOpen && <PublicRequest onClose={() => setRequestOpen(false)} onSubmit={onRequest} />}{chatOpen && <ImmediateChat onClose={() => setChatOpen(false)} onComplete={onRequest} />}{professionalSignup && <ProfessionalSignup onClose={() => setProfessionalSignup(false)} onComplete={() => onLogin("APND/profesional")} />}</main>;
}

function PublicRequest({ onClose, onSubmit }: { onClose: () => void; onSubmit: (admission: Admission) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ family: "Mariana Gómez", child: "Sofía Martínez", service: "Integración escolar", zone: "Palermo", coverage: "OSDE", school: "Escuela Primaria N.º 18", cud: "Sí", need: "Buscamos acompañamiento para la jornada escolar." });
  function update(field: keyof typeof data, value: string) { setData({ ...data, [field]: value }); }
  const result: Admission = { ...data, id: "ADM-2026-0184", status: "Profesional asignada", professional: "Valentina Ruiz", response: "Recibimos tu solicitud. Valentina Ruiz, profesional de integración escolar, fue asignada y se comunicará con vos dentro de las próximas 24 horas." };
  return <div className="public-request-overlay"><section className="public-request"><header><div><Image src="/arabela-demo/icon.svg" alt="Arabela" width={37} height={37} /><span><strong>Solicitud de atención</strong><small>Paso {step} de 3</small></span></div><button className="icon-button" onClick={onClose}><X /></button></header><div className="request-progress"><i className={step >= 1 ? "active" : ""} /><i className={step >= 2 ? "active" : ""} /><i className={step >= 3 ? "active" : ""} /></div>{step === 1 && <div className="request-body"><span className="eyebrow">DATOS INICIALES</span><h2>¿Con quién vamos a comunicarnos?</h2><p>Estos datos permiten identificar y responder tu solicitud.</p><label>Nombre del familiar<input value={data.family} onChange={(event) => update("family", event.target.value)} /></label><label>Nombre de la persona que requiere acompañamiento<input value={data.child} onChange={(event) => update("child", event.target.value)} /></label><div className="request-actions"><button onClick={onClose}>Cancelar</button><button onClick={() => setStep(2)}>Continuar <ChevronRight /></button></div></div>}{step === 2 && <div className="request-body"><span className="eyebrow">NECESIDAD Y COBERTURA</span><h2>Ayudanos a encontrar el equipo adecuado</h2><div className="request-grid"><label>Servicio<select value={data.service} onChange={(event) => update("service", event.target.value)}><option>Integración escolar</option><option>Apoyo domiciliario</option><option>Orientación familiar</option></select></label><label>Zona<input value={data.zone} onChange={(event) => update("zone", event.target.value)} /></label><label>Obra social<input value={data.coverage} onChange={(event) => update("coverage", event.target.value)} /></label><label>¿Cuenta con CUD?<select value={data.cud} onChange={(event) => update("cud", event.target.value)}><option>Sí</option><option>No</option><option>En trámite</option></select></label></div><label>Escuela<input value={data.school} onChange={(event) => update("school", event.target.value)} /></label><label>Contanos brevemente qué necesitás<textarea value={data.need} onChange={(event) => update("need", event.target.value)} /></label><div className="request-actions"><button onClick={() => setStep(1)}>Atrás</button><button onClick={() => setStep(3)}>Enviar solicitud <Send /></button></div></div>}{step === 3 && <div className="request-result"><i><Check /></i><span className="eyebrow">SOLICITUD RECIBIDA</span><h2>Ya encontramos el equipo adecuado</h2><p>Tu solicitud fue clasificada como <strong>{data.service}</strong> en zona <strong>{data.zone}</strong>.</p><div className="assigned-professional"><i>VR</i><span><small>PROFESIONAL SUGERIDA</small><strong>Valentina Ruiz</strong><em>APND · Integración educativa</em></span><Check /></div><div className="response-box"><MessageCircle /><span><strong>Respuesta para la familia</strong><p>{result.response}</p></span></div><small>Número de seguimiento: <b>{result.id}</b></small><button className="login-button" onClick={() => onSubmit(result)}>Ver mi solicitud y continuar</button></div>}</section></div>;
}

function ProfessionalSignup({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [mode, setMode] = useState<"options" | "form" | "profile" | "done">("options");
  const [google, setGoogle] = useState(false);
  return <div className="public-request-overlay"><section className="professional-signup"><header><div><Image src="/arabela-demo/icon.svg" alt="Arabela" width={37} height={37} /><span><strong>Registro de profesionales</strong><small>Postulación y perfil institucional</small></span></div><button className="icon-button" onClick={onClose}><X /></button></header>{mode === "options" && <div className="signup-body"><span className="eyebrow">CREAR CUENTA</span><h2>Sumate a la red profesional de Arabela</h2><p>Podés registrarte con Google o crear una cuenta con tu correo.</p><button className="google-button" onClick={() => { setGoogle(true); setMode("profile"); }}><GoogleIcon /> Continuar con Google</button><div className="or-divider"><span>o</span></div><button className="email-signup-button" onClick={() => setMode("form")}><Mail /> Crear cuenta con email</button><small>Tu postulación quedará pendiente de validación por Administración.</small></div>}{mode === "form" && <div className="signup-body"><span className="eyebrow">DATOS DE ACCESO</span><h2>Creá tu cuenta</h2><label>Nombre y apellido<input defaultValue="Valentina Ruiz" /></label><label>Correo profesional<input defaultValue="valentina.ruiz@demo.arabela.org" /></label><label>Contraseña<input type="password" defaultValue="demostracion" /></label><button className="login-button" onClick={() => setMode("profile")}>Continuar con el perfil <ChevronRight /></button></div>}{mode === "profile" && <div className="signup-body"><span className="eyebrow">PERFIL PROFESIONAL</span><h2>{google ? "Cuenta de Google vinculada" : "Completá tu postulación"}</h2><div className="request-grid"><label>Profesión<select defaultValue="APND"><option>APND</option><option>Psicopedagogía</option><option>Psicología</option><option>Terapia ocupacional</option></select></label><label>Especialidad<input defaultValue="Integración educativa" /></label><label>Zona<input defaultValue="Palermo y Belgrano" /></label><label>Disponibilidad<select><option>Mañana</option><option>Tarde</option><option>Jornada completa</option></select></label></div><button className="cv-upload"><UploadCloud /><span><strong>Adjuntar CV</strong><small>CV_Valentina_Ruiz.pdf · 1.2 MB</small></span><Check /></button><label>Matrícula o registro<input defaultValue="AR-2026-184" /></label><button className="login-button" onClick={() => setMode("done")}><Send /> Enviar postulación</button></div>}{mode === "done" && <div className="request-result signup-done"><i><Check /></i><span className="eyebrow">POSTULACIÓN RECIBIDA</span><h2>Tu perfil está en revisión</h2><p>Administración recibió tu cuenta, CV, especialidad, zona y disponibilidad. Te notificaremos cuando el perfil sea validado.</p><div className="response-box"><ShieldCheck /><span><strong>Estado de la cuenta</strong><p>Acceso profesional pendiente de aprobación.</p></span></div><button className="login-button" onClick={onComplete}>Entrar al perfil de demostración</button></div>}</section></div>;
}

function ImmediateChat({ onClose, onComplete }: { onClose: () => void; onComplete: (admission: Admission) => void }) {
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState<Array<{ from: "bot" | "user"; text: string }>>([{ from: "bot", text: "Hola, soy el asistente de Arabela. Puedo orientarte ahora mismo y conectarte con el profesional adecuado. ¿Qué tipo de ayuda necesitás?" }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const admission: Admission = { id: "ADM-2026-0185", family: "Mariana Gómez", child: "Sofía Martínez", service: "Integración escolar", zone: "Palermo", coverage: "OSDE", school: "Escuela Primaria N.º 18", cud: "Sí", need: "Acompañamiento durante la jornada escolar", status: "Profesional asignada", professional: "Valentina Ruiz", response: "Tu consulta fue atendida y derivada a Valentina Ruiz. La profesional ya recibió tus datos y puede continuar esta conversación." };
  const prompts = [["Integración escolar", "Apoyo domiciliario", "Quiero orientación"], ["Palermo", "Belgrano", "Otra zona"], ["Sí, tiene CUD", "Está en trámite", "No tiene CUD"], ["Hablar con Valentina", "Agendar videollamada", "Ver mi solicitud"]];
  function answer(text: string) {
    setMessages((current) => [...current, { from: "user", text }]);
    setTyping(true);
    window.setTimeout(() => {
      const replies = ["Perfecto. Para derivarte correctamente, ¿en qué zona necesitás el acompañamiento?", "Gracias. ¿La persona cuenta con CUD o está en trámite?", "Ya tengo los datos mínimos. Estoy buscando una profesional compatible con integración escolar y tu zona.", "Encontré una coincidencia: Valentina Ruiz, APND especializada en integración educativa. Ya le envié tu solicitud y podés continuar con ella."];
      setMessages((current) => [...current, { from: "bot", text: replies[stage] }]);
      setTyping(false);
      setStage((value) => Math.min(value + 1, 4));
    }, 450);
  }
  function sendFreeText() { if (!input.trim()) return; answer(input); setInput(""); }
  return <div className="immediate-chat-overlay"><section className="immediate-chat"><header><div><i><Bot /></i><span><strong>Asistente Arabela</strong><small><b /> Atención inmediata · En línea</small></span></div><button className="icon-button" onClick={onClose}><X /></button></header><div className="immediate-messages">{messages.map((message, index) => <div className={`immediate-message ${message.from}`} key={`${message.text}-${index}`}>{message.from === "bot" && <i><Bot /></i>}<p>{message.text}</p></div>)}{typing && <div className="typing"><i /><i /><i /></div>}{stage >= 3 && !typing && <div className="chat-assignment"><div className="person"><i className="blue">VR</i><b>Valentina Ruiz<small>APND · Integración educativa</small></b></div><em className="status green">Asignada</em><span><Check /> La profesional fue notificada</span></div>}</div><div className="quick-replies">{prompts[Math.min(stage, 3)].map((text) => <button key={text} onClick={() => stage >= 3 ? onComplete(admission) : answer(text)}>{text}</button>)}</div><div className="immediate-composer"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendFreeText(); }} placeholder="Escribí tu consulta..." /><button onClick={sendFreeText}><Send /></button></div><footer><ShieldCheck /> Conversación privada · Datos ficticios en este demo</footer></section></div>;
}

function GoogleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.8 9.4 6 12 6Z"/></svg>; }

function Dashboard({ onNavigate, onToast, role, onStartCall }: { onNavigate: (view: View) => void; onToast: (text: string) => void; role: Role; onStartCall: () => void }) {
  const profile = roleProfiles[role];
  return <>
    <PageHead eyebrow="LUNES, 3 DE AGOSTO" title={`Buen día, ${profile.name.split(" ")[0]}`} description={profile.summary} action={["Coordinación", "Administración"].includes(role) ? <button className="primary-button" onClick={() => onToast("Nuevo caso iniciado en modo demo")}><Plus size={18} /> Nuevo caso</button> : undefined} />
    <div className="kpi-grid">
      <article className="kpi blue"><div><span>Casos activos</span><strong>24</strong><small><b>+3</b> este mes</small></div><i><HeartHandshake /></i></article>
      <article className="kpi red"><div><span>Seguimientos hoy</span><strong>6</strong><small>Próximo a las 09:30</small></div><i><CalendarDays /></i></article>
      <article className="kpi green"><div><span>Profesionales</span><strong>18</strong><small><b>16</b> disponibles</small></div><i><Users /></i></article>
      <article className="kpi amber"><div><span>Documentos pendientes</span><strong>4</strong><small>Requieren revisión</small></div><i><FileText /></i></article>
    </div>
    <div className="dashboard-grid">
      <section className="panel next-meeting">
        <div className="panel-title"><div><Video size={20} /><div><span>PRÓXIMO ENCUENTRO</span><h2>Seguimiento de Sofía</h2></div></div><button onClick={() => onNavigate("agenda")}>Ver agenda <ChevronRight size={16} /></button></div>
        <div className="meeting-body"><div className="date-block"><strong>06</strong><span>AGO</span></div><div className="meeting-info"><span><Clock3 size={16} /> Mañana, 09:30 · 45 min</span><p>Encuentro de seguimiento entre familia, profesional y coordinación.</p><div className="people"><div className="avatar-stack"><i>VR</i><i>MG</i><i>JC</i></div><span>3 participantes confirmados</span></div></div><button className="video-button" onClick={onStartCall}><Video size={18} /> Entrar a sala</button></div>
      </section>
      <section className="panel quick-actions"><div className="panel-title"><h2>Accesos rápidos</h2></div><div className="action-list"><button onClick={() => onNavigate("mensajes")}><i className="blue"><MessageCircle /></i><span><strong>Mensajes del equipo</strong><small>2 conversaciones sin leer</small></span><ChevronRight /></button><button onClick={() => onNavigate("documentos")}><i className="red"><FileCheck2 /></i><span><strong>Revisar documentos</strong><small>4 archivos pendientes</small></span><ChevronRight /></button><button onClick={() => onNavigate("casos")}><i className="green"><CircleUserRound /></i><span><strong>Directorio profesional</strong><small>18 perfiles activos</small></span><ChevronRight /></button></div></section>
    </div>
    <section className="panel recent-cases"><div className="panel-title"><div><span>ACTIVIDAD RECIENTE</span><h2>Casos en seguimiento</h2></div><button onClick={() => onNavigate("casos")}>Ver todos <ChevronRight size={16} /></button></div><div className="case-table"><div className="table-row table-header"><span>PERSONA</span><span>PROGRAMA</span><span>PROFESIONAL</span><span>ESTADO</span><span /></div>{cases.slice(0, 3).map((item) => <div className="table-row" key={item.name}><span className="person"><i className={item.tone}>{item.initials}</i><b>{item.name}<small>{item.age}</small></b></span><span>{item.program}</span><span>{item.professional}</span><span><em className={`status ${item.tone}`}>{item.status}</em></span><button onClick={() => onToast(`Abriendo ficha de ${item.name}`)}><ChevronRight size={18} /></button></div>)}</div></section>
  </>;
}

function Admissions({ role, admission, onChange, onToast }: { role: Role; admission: Admission; onChange: (value: Admission) => void; onToast: (text: string) => void }) {
  const isFamily = role === "Familia";
  const isProfessional = role === "APND/profesional";
  const queue = [admission, { ...admission, id: "ADM-2026-0183", family: "Laura Navarro", child: "Lucas Navarro", service: "Integración escolar", zone: "Belgrano", status: "En revisión", professional: "Pendiente de asignación" }, { ...admission, id: "ADM-2026-0182", family: "Carolina Acosta", child: "Emma Acosta", service: "Apoyo domiciliario", zone: "Caballito", status: "Información pendiente", professional: "Camila Ortiz" }];
  if (isFamily) return <><PageHead eyebrow="SEGUIMIENTO DE ADMISIÓN" title="Mi solicitud" description="Consultá el estado, la respuesta y el profesional asignado." /><section className="panel family-admission"><div className="admission-status"><div><span>SOLICITUD {admission.id}</span><h2>{admission.service}</h2><p>{admission.child} · {admission.zone}</p></div><em className="status green">{admission.status}</em></div><div className="admission-steps"><div className="done"><i><Check /></i><span><strong>Solicitud recibida</strong><small>Hoy, 10:02</small></span></div><div className="done"><i><Bot /></i><span><strong>Clasificación completada</strong><small>{admission.service} · Prioridad normal</small></span></div><div className="done"><i><Users /></i><span><strong>Profesional asignada</strong><small>{admission.professional}</small></span></div><div><i><MessageCircle /></i><span><strong>Contacto inicial</strong><small>Previsto dentro de las próximas 24 horas</small></span></div></div><div className="family-response"><MessageCircle /><div><span>RESPUESTA DE ARABELA</span><p>{admission.response}</p></div></div><div className="admission-contact"><div className="person"><i className="blue">VR</i><b>{admission.professional}<small>APND · Integración educativa</small></b></div><button onClick={() => onToast("Conversación con la profesional abierta")}><MessageCircle /> Enviar mensaje</button><button onClick={() => onToast("Videollamada inicial solicitada")}><Video /> Solicitar encuentro</button></div></section></>;
  return <><PageHead eyebrow={isProfessional ? "SOLICITUDES DERIVADAS" : "MESA DE ENTRADA DIGITAL"} title={isProfessional ? "Nuevas derivaciones" : "Dashboard de admisiones"} description={isProfessional ? "Solicitudes compatibles con tu perfil y asignaciones pendientes de contacto." : "Solicitudes centralizadas, clasificación y responsables de atención."} action={!isProfessional ? <button className="primary-button" onClick={() => onToast("Nueva solicitud cargada manualmente")}><Plus /> Cargar solicitud</button> : undefined} /><div className="admission-kpis"><article className="panel"><strong>12</strong><span>Nuevas</span></article><article className="panel"><strong>8</strong><span>En revisión</span></article><article className="panel"><strong>5</strong><span>Pendientes</span></article><article className="panel"><strong>18</strong><span>Derivadas</span></article></div><section className="panel admissions-queue"><div className="panel-title"><div><span>ENTRADA CENTRALIZADA</span><h2>Solicitudes recientes</h2></div><label className="small-search"><Search /><input placeholder="Buscar solicitud" /></label></div>{queue.filter((item) => !isProfessional || item.professional.includes("Valentina") || item.professional.includes("Pendiente")).map((item, index) => <article key={item.id}><div><span>{item.id}</span><strong>{item.family}</strong><small>Por {item.child} · {item.zone}</small></div><div><span>SERVICIO</span><strong>{item.service}</strong><small>{item.coverage} · CUD: {item.cud}</small></div><div><span>CLASIFICACIÓN</span><em className={`status ${index === 2 ? "amber" : "blue"}`}>{item.status}</em><small>{index === 2 ? "Falta documentación" : "Datos completos"}</small></div><div><span>RESPONSABLE</span><strong>{item.professional}</strong><small>{index === 0 ? "Coincidencia 96%" : "Revisión manual"}</small></div><button onClick={() => { if (isProfessional) { onChange({ ...item, status: "Contacto iniciado", response: `Tu solicitud fue recibida por ${roleProfiles[role].name}. En breve coordinaremos una primera conversación.` }); onToast("Derivación aceptada y familia notificada"); } else { onChange({ ...item, status: "Profesional asignada", professional: "Valentina Ruiz", response: "Tu solicitud fue revisada y derivada a Valentina Ruiz. Se comunicará con vos dentro de las próximas 24 horas." }); onToast("Solicitud asignada y respuesta enviada a la familia"); } }}>{isProfessional ? "Aceptar y contactar" : "Asignar y responder"}<ChevronRight /></button></article>)}</section></>;
}

function AdmissionEnhancements({ role, onToast }: { role: Role; onToast: (text: string) => void }) {
  const [priority, setPriority] = useState("CUD + inicio próximo");
  const [reminderSent, setReminderSent] = useState(false);
  const [auditImproved, setAuditImproved] = useState(false);
  const isFamily = role === "Familia";

  if (isFamily) return <section className="admission-help-grid">
    <article className="panel guided-steps"><div className="panel-title"><div><span>GUÍA PASO A PASO</span><h2>¿Cómo funciona la admisión?</h2></div></div><ol><li><i>1</i><span><strong>Contanos qué necesitás</strong><small>Por chat, formulario, teléfono o WhatsApp.</small></span></li><li><i>2</i><span><strong>Validamos información</strong><small>Te avisamos si falta documentación.</small></span></li><li><i>3</i><span><strong>Buscamos coincidencias</strong><small>Servicio, zona y disponibilidad profesional.</small></span></li><li><i>4</i><span><strong>Te conectamos</strong><small>Recibís respuesta y responsable asignado.</small></span></li></ol></article>
    <article className="panel faq-panel"><div className="panel-title"><div><span>PREGUNTAS FRECUENTES</span><h2>Respuestas rápidas</h2></div></div><details open><summary>¿Qué documentación necesito?</summary><p>Datos de contacto, CUD si corresponde, obra social, escuela y una descripción breve de la necesidad.</p></details><details><summary>¿Cuánto demora la respuesta?</summary><p>La solicitud se confirma inmediatamente y el primer contacto se programa dentro de las próximas 24 horas.</p></details><details><summary>¿Cómo eligen al profesional?</summary><p>Se consideran servicio, especialidad, zona, disponibilidad y reglas definidas por Arabela.</p></details></article>
    <article className="panel channel-panel"><div className="panel-title"><div><span>CANALES DISPONIBLES</span><h2>Elegí cómo continuar</h2></div></div><div><button onClick={() => onToast("Llamada simulada solicitada")}><PhoneCall /><span><strong>Teléfono</strong><small>Solicitar llamada</small></span></button><button onClick={() => onToast("WhatsApp simulado abierto")}><MessageSquareText /><span><strong>WhatsApp</strong><small>Continuar conversación</small></span></button><button onClick={() => onToast("Chat inmediato abierto")}><Bot /><span><strong>Chat web</strong><small>Respuesta inmediata</small></span></button></div></article>
  </section>;

  return <section className="admission-ops">
    <div className="ops-metrics"><article className="panel"><span>VOLUMEN MENSUAL</span><strong>146</strong><small>+18% vs. julio</small></article><article className="panel"><span>TIEMPO DE RESPUESTA</span><strong>2h 18m</strong><small>Objetivo: menos de 4h</small></article><article className="panel"><span>SERVICIO MÁS SOLICITADO</span><strong>Integración escolar</strong><small>46% de solicitudes</small></article><article className="panel"><span>CONVERSIÓN A CASO</span><strong>68%</strong><small>99 admisiones activadas</small></article></div>
    <div className="ops-grid"><article className="panel priority-rules"><div className="panel-title"><div><span>REGLAS CONFIGURABLES</span><h2>Priorización automática</h2></div><SlidersHorizontal /></div>{["CUD + inicio próximo", "Documentación completa", "Zona con profesional disponible"].map((rule, index) => <button className={priority === rule ? "active" : ""} key={rule} onClick={() => { setPriority(rule); onToast(`Regla prioritaria: ${rule}`); }}><i>{index + 1}</i><span><strong>{rule}</strong><small>{index === 0 ? "Prioridad alta" : index === 1 ? "Reduce tiempos de revisión" : "Derivación inmediata"}</small></span><Check /></button>)}</article>
      <article className="panel missing-docs"><div className="panel-title"><div><span>DETECCIÓN DE FALTANTES</span><h2>Documentación pendiente</h2></div><FileWarning /></div><div><i>LN</i><span><strong>Solicitud ADM-2026-0183</strong><small>Faltan CUD y constancia escolar</small></span><em className="status amber">2 faltantes</em></div><button onClick={() => { setReminderSent(true); onToast("Recordatorio automático enviado por email"); }}><Mail /> {reminderSent ? "Recordatorio enviado" : "Enviar recordatorio"}</button></article>
      <article className="panel automation-panel"><div className="panel-title"><div><span>AUTOMATIZACIONES</span><h2>Comunicaciones recientes</h2></div><Workflow /></div><ul><li><i className="green"><Check /></i><span><strong>Email de confirmación</strong><small>Enviado a Mariana Gómez · 10:02</small></span></li><li><i className="amber"><Mail /></i><span><strong>Información faltante</strong><small>Programado para hoy · 16:00</small></span></li><li><i className="blue"><Bell /></i><span><strong>Notificación interna</strong><small>Profesional asignada notificada</small></span></li></ul></article>
      <article className="panel bot-audit"><div className="panel-title"><div><span>AUDITORÍA DE CANALES</span><h2>Bot y WhatsApp actual</h2></div><Bot /></div><div className="audit-score"><strong>{auditImproved ? "92" : "71"}</strong><span>/100<small>Cobertura de atención</small></span></div><ul><li><Check /> Resuelve preguntas frecuentes</li><li><Check /> Captura datos mínimos</li><li className={auditImproved ? "fixed" : "pending"}>{auditImproved ? <Check /> : <FileWarning />} Derivación con contexto completo</li></ul><button onClick={() => { setAuditImproved(true); onToast("Mejora simulada aplicada al canal"); }}>{auditImproved ? "Mejora aplicada" : "Aplicar mejora sugerida"}</button></article></div>
  </section>;
}

function Cases({ onToast, role }: { onToast: (text: string) => void; role: Role }) {
  const [query, setQuery] = useState("");
  const allowedCases = role === "Familia" ? cases.slice(0, 1) : role === "APND/profesional" ? cases.filter((item) => ["Sofía Martínez", "Tomás Juárez"].includes(item.name)) : cases;
  const filtered = allowedCases.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) || item.program.toLowerCase().includes(query.toLowerCase()));
  const [detail, setDetail] = useState<(typeof cases)[number] | null>(null);
  return <><PageHead eyebrow="GESTIÓN INSTITUCIONAL" title={role === "Familia" ? "Mi caso" : "Casos"} description={role === "Familia" ? "Información y actividad del acompañamiento asignado a tu familia." : "Seguimiento centralizado de personas, familias y profesionales."} action={["Coordinación", "Administración"].includes(role) ? <button className="primary-button" onClick={() => onToast("Formulario de alta abierto en modo demo")}><Plus size={18} /> Nuevo caso</button> : undefined} /><div className="toolbar panel"><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o programa" /></label><button>Todos los estados <ChevronDown size={16} /></button><button>Todos los programas <ChevronDown size={16} /></button></div><div className="case-cards">{filtered.map((item) => <article className="panel case-card" key={item.name}><div className="case-card-top"><i className={item.tone}>{item.initials}</i><em className={`status ${item.tone}`}>{item.status}</em></div><h2>{item.name}</h2><p>{item.age} · {item.program}</p><dl><div><dt>Profesional asignado</dt><dd>{item.professional}</dd></div><div><dt>Última actividad</dt><dd>Hoy, 10:42</dd></div></dl><div className="progress"><span><b>Plan de seguimiento</b><em>{item.status === "Pendiente" ? "20%" : "72%"}</em></span><i><b style={{ width: item.status === "Pendiente" ? "20%" : "72%" }} /></i></div><button onClick={() => setDetail(item)}>Ver ficha e historial <ChevronRight size={17} /></button></article>)}</div>{detail && <CaseDetail item={detail} role={role} onClose={() => setDetail(null)} onToast={onToast} />}</>;
}

function CaseDetail({ item, role, onClose, onToast }: { item: (typeof cases)[number]; role: Role; onClose: () => void; onToast: (text: string) => void }) {
  return <div className="modal-backdrop"><section className="case-detail-modal"><header><div className="person"><i className={item.tone}>{item.initials}</i><b>{item.name}<small>{item.age} · Caso #{item.initials}-024</small></b></div><button className="icon-button" onClick={onClose}><X /></button></header><div className="case-summary"><div><span>ESTADO</span><em className={`status ${item.tone}`}>{item.status}</em></div><div><span>PROGRAMA</span><strong>{item.program}</strong></div><div><span>PROFESIONAL</span><strong>{item.professional}</strong></div><div><span>COORDINACIÓN</span><strong>Julieta Campos</strong></div></div><div className="case-detail-grid"><section><h3><History size={17} /> Historial del caso</h3><div className="timeline"><article><i className="green"><Check /></i><div><strong>Informe semanal cargado</strong><span>Hoy, 09:58 · Valentina Ruiz</span><p>Se agregó un documento al seguimiento.</p></div></article><article><i className="blue"><MessageCircle /></i><div><strong>Conversación actualizada</strong><span>Ayer, 16:20 · Familia</span><p>La familia confirmó el próximo encuentro.</p></div></article><article><i className="red"><Video /></i><div><strong>Videollamada realizada</strong><span>29 jul, 10:15 · 42 minutos</span><p>Encuentro de seguimiento institucional.</p></div></article><article><i className="amber"><UserCog /></i><div><strong>Asignación actualizada</strong><span>24 jul, 12:10 · Administración</span><p>Se vinculó a la profesional responsable.</p></div></article></div></section><aside><h3>Acciones del caso</h3><button onClick={() => onToast("Conversación del caso abierta")}><MessageCircle /> Abrir conversación</button><button onClick={() => onToast("Documentos del caso abiertos")}><FolderOpen /> Ver documentos</button>{role !== "Familia" && <button onClick={() => onToast("Asignación editada en modo demo")}><Users /> Editar asignaciones</button>}{["Coordinación", "Administración"].includes(role) && <button className="danger-action" onClick={() => onToast("Accesos desactivados en modo demo")}><LockKeyhole /> Desactivar accesos</button>}</aside></div></section></div>;
}

function Messages({ onToast }: { onToast: (text: string) => void }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  function send() { if (!message.trim()) return; setSent([...sent, message]); setMessage(""); onToast("Mensaje enviado en la simulación"); }
  return <><PageHead eyebrow="COMUNICACIÓN POR CASO" title="Mensajes" description="Conversaciones organizadas y visibles solo para el equipo asignado." /><section className="messages-panel panel"><aside className="conversation-list"><label><Search size={17} /><input placeholder="Buscar conversación" /></label>{conversations.map((item, index) => <button className={index === 0 ? "selected" : ""} key={item.name}><i>{item.initials}</i><span><strong>{item.name}</strong><small>{item.preview}</small></span><em>{item.time}{item.unread > 0 && <b>{item.unread}</b>}</em></button>)}</aside><div className="chat"><header><div className="person"><i className="blue">SM</i><b>Caso Sofía Martínez<small>4 participantes · En línea</small></b></div><button className="icon-button" onClick={() => onToast("Videollamada simulada iniciada")}><Video size={20} /></button><button className="icon-button"><MoreHorizontal size={20} /></button></header><div className="chat-body"><span className="day-divider">HOY</span><div className="message received"><b>Valentina Ruiz <small>09:58</small></b><p>Buen día. Ya cargué el informe de seguimiento de esta semana.</p></div><div className="attachment"><FileText size={24} /><span><strong>Informe_seguimiento_Sofia.pdf</strong><small>PDF · 1.8 MB</small></span><button className="icon-button"><Download size={18} /></button></div><div className="message sent"><b>Julieta Campos <small>10:35</small></b><p>Gracias, Valentina. Lo revisamos y conversamos los avances mañana.</p></div><div className="message received"><b>Mariana Gómez <small>10:42</small></b><p>Perfecto, nos vemos mañana.</p></div>{sent.map((text, index) => <div className="message sent" key={`${text}-${index}`}><b>Tú <small>Ahora</small></b><p>{text}</p></div>)}</div><div className="composer"><button className="icon-button"><Paperclip size={20} /></button><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="Escribe un mensaje..." /><button className="send-button" onClick={send}><Send size={18} /></button></div></div></section></>;
}

function Agenda({ onToast, onStartCall }: { onToast: (text: string) => void; onStartCall: () => void }) {
  return <><PageHead eyebrow="AGENDA INSTITUCIONAL" title="Próximos encuentros" description="Coordinación de reuniones y videollamadas vinculadas a cada caso." action={<button className="primary-button" onClick={() => onToast("Nuevo encuentro creado en modo demo")}><Plus size={18} /> Agendar encuentro</button>} /><div className="agenda-layout"><section className="panel schedule"><div className="panel-title"><h2>Esta semana</h2><div><button>Hoy</button><button className="icon-button"><ChevronRight size={18} /></button></div></div>{meetings.map((item, index) => <article className="event" key={item.title}><div className={`date-block ${item.color}`}><strong>{item.day}</strong><span>{item.month}</span></div><span className="event-time">{item.time}</span><div><h3>{item.title}</h3><p>{item.detail}</p><em><Video size={14} /> {item.kind}</em></div><button onClick={index === 0 ? onStartCall : () => onToast(`Abriendo ${item.title}`)}>{index === 0 ? "Entrar a sala" : "Ver detalle"} <ChevronRight size={16} /></button></article>)}</section><aside className="panel agenda-side"><span>MIÉRCOLES 6</span><h2>3 encuentros</h2><div className="mini-calendar"><b>L</b><b>M</b><b>X</b><b>J</b><b>V</b><em>3</em><em>4</em><em>5</em><em className="today">6</em><em>7</em></div><hr /><h3>Disponibilidad del equipo</h3><div className="availability"><span><i className="green" /> 16 disponibles</span><span><i className="amber" /> 2 ocupados</span></div></aside></div></>;
}

function VideoCall({ onClose, onSave }: { onClose: () => void; onSave: (recording: SavedRecording) => void }) {
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [chat, setChat] = useState(false);
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [consentOpen, setConsentOpen] = useState(false);
  const [readyToSave, setReadyToSave] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const recordedTime = `${String(Math.floor(recordedSeconds / 60)).padStart(2, "0")}:${String(recordedSeconds % 60).padStart(2, "0")}`;

  function saveRecording() {
    onSave({ name: "Grabación - Seguimiento de Sofía", date: "3 ago 2026, ahora", duration: recordedTime, participants: 3 });
    setReadyToSave(false);
    onClose();
  }

  return <div className="call-overlay"><section className="call-room">
    <header className="call-header"><div className="call-brand"><Image src="/arabela-demo/icon.svg" alt="Arabela Salud" width={32} height={32} /><span><strong>Arabela Salud</strong><small>Seguimiento de Sofía Martínez</small></span></div>{recording ? <div className="recording-live"><i /> GRABANDO · {recordedTime}</div> : <div className="call-security"><ShieldCheck size={15} /> Sala privada · Demo</div>}<button className="icon-button" onClick={onClose} aria-label="Cerrar sala"><X /></button></header>
    <div className="call-stage"><div className="main-video"><div className="video-silhouette"><div className="video-face">VR</div><span>Valentina Ruiz</span></div><div className="video-label"><span className="live-dot" /> Valentina Ruiz · Profesional</div><div className="camera-off-note">{camera ? "Cámara simulada activa" : "Cámara desactivada"}</div></div><div className="participant-tile"><div className="video-silhouette small"><div className="video-face family">MG</div><span>Mariana Gómez</span></div><div className="video-label">Mariana Gómez · Familia</div></div>{sharing && <div className="share-notice"><Sparkles size={20} /><strong>Estás compartiendo pantalla</strong><span>Vista simulada de una presentación</span></div>}<div className="call-side-panel">{chat ? <div className="call-chat"><h3>Chat de la sala</h3><div className="call-chat-messages"><p><b>Valentina</b> ¿Podemos revisar el plan?</p><p className="mine"><b>Tú</b> Sí, lo tengo abierto.</p></div><div className="call-chat-compose"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe..." onKeyDown={(event) => { if (event.key === "Enter") setMessage(""); }} /><button onClick={() => setMessage("")}><Send size={15} /></button></div></div> : <><Users size={19} /><strong>3 participantes</strong><span>Todos conectados</span><CallPerson initials="VR" name="Valentina Ruiz" role="Profesional" color="blue" /><CallPerson initials="MG" name="Mariana Gómez" role="Familia" color="red" /><CallPerson initials="JC" name="Julieta Campos" role="Coordinación" color="green" /></>}</div></div>
    <footer className="call-controls"><span className="call-time">{elapsed}</span><div><button className={mic ? "control active" : "control off"} onClick={() => setMic(!mic)} aria-label="Micrófono"><Activity size={19} /></button><button className={camera ? "control active" : "control off"} onClick={() => setCamera(!camera)} aria-label="Cámara"><Video size={19} /></button><button className={sharing ? "control sharing" : "control active"} onClick={() => setSharing(!sharing)} aria-label="Compartir pantalla"><Sparkles size={19} /></button><button className={chat ? "control sharing" : "control active"} onClick={() => setChat(!chat)} aria-label="Chat"><MessageCircle size={19} /></button><button className={recording ? "control recording" : readyToSave ? "control save-ready" : "control active"} onClick={() => { if (recording) { setRecording(false); setReadyToSave(true); } else if (readyToSave) saveRecording(); else setConsentOpen(true); }} aria-label={recording ? "Detener grabación" : readyToSave ? "Guardar grabación" : "Grabar llamada"}>{readyToSave ? <Save size={19} /> : <Disc3 size={19} />}</button><button className="control leave" onClick={onClose} aria-label="Finalizar llamada"><PhoneOffIcon /></button></div><span className="call-quality"><span className="live-dot" /> Excelente conexión</span></footer>
    {consentOpen && <div className="consent-dialog"><section><i><Disc3 /></i><h2>Grabar esta videollamada</h2><p>En esta demostración se simulará la grabación. Los participantes serán notificados y la sesión aparecerá en Documentos e historial.</p><div className="consent-list"><span><Check /> Los 3 participantes prestaron consentimiento</span><span><LockKeyhole /> Acceso restringido a usuarios autorizados</span></div><div><button onClick={() => setConsentOpen(false)}>Cancelar</button><button onClick={() => { setConsentOpen(false); setRecording(true); setRecordedSeconds(0); }}><Disc3 size={16} /> Iniciar grabación</button></div></section></div>}
  </section></div>;
}

function CallPerson({ initials, name, role, color }: { initials: string; name: string; role: string; color: string }) {
  return <div className="call-person"><i className={color}>{initials}</i><span>{name}<small>{role}</small></span><b>•••</b></div>;
}

function PhoneOffIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.7 13.3a15.8 15.8 0 0 0 3.9 2.6l1.2-1.2a1.5 1.5 0 0 1 1.6-.3l2.2 1a1.5 1.5 0 0 1 .9 1.4v1.3a1.5 1.5 0 0 1-1.6 1.5C10 19 5 14 4.4 4.6A1.5 1.5 0 0 1 5.9 3h1.3a1.5 1.5 0 0 1 1.4.9l1 2.2a1.5 1.5 0 0 1-.3 1.6L8.1 9a15.8 15.8 0 0 0 2.6 3.9Z"/><path d="m3 3 18 18"/></svg>;
}

function Documents({ onToast, recordings }: { onToast: (text: string) => void; recordings: SavedRecording[] }) {
  return <><PageHead eyebrow="ARCHIVO INSTITUCIONAL" title="Documentos" description="Informes, autorizaciones, grabaciones y documentación profesional por caso." action={<button className="primary-button" onClick={() => onToast("Selector de archivos abierto en modo demo")}><Plus size={18} /> Cargar archivo</button>} /><div className="folder-grid"><article className="folder-card panel"><i className="blue"><FolderOpen /></i><span><strong>Informes de seguimiento</strong><small>28 archivos</small></span><ChevronRight /></article><article className="folder-card panel"><i className="red"><Disc3 /></i><span><strong>Grabaciones de sesiones</strong><small>{recordings.length} grabación{recordings.length === 1 ? "" : "es"} guardada{recordings.length === 1 ? "" : "s"}</small></span><ChevronRight /></article><article className="folder-card panel"><i className="green"><FolderOpen /></i><span><strong>Perfiles profesionales</strong><small>21 archivos</small></span><ChevronRight /></article></div>{recordings.length > 0 && <section className="panel recording-library"><div className="panel-title"><div><span>SESIONES GUARDADAS</span><h2>Grabaciones por caso</h2></div><em className="status red">Acceso restringido</em></div>{recordings.map((item, index) => <article key={`${item.name}-${index}`}><i><Video /></i><span><strong>{item.name}</strong><small>{item.date} · {item.duration} · {item.participants} participantes</small></span><em className="status green">Guardada</em><button onClick={() => onToast(`Reproduciendo ${item.name} en modo demo`)}><Video size={16} /> Reproducir</button></article>)}</section>}<section className="panel document-list"><div className="panel-title"><div><span>ACTUALIZADOS RECIENTEMENTE</span><h2>Todos los documentos</h2></div><label className="small-search"><Search size={17} /><input placeholder="Buscar archivo" /></label></div>{docs.map((doc) => <article key={doc.name}><i className="file-icon"><FileText /></i><span><strong>{doc.name}</strong><small>{doc.meta}</small></span><span className="doc-owner"><small>RESPONSABLE</small>{doc.owner}</span><em className={`status ${doc.state === "Validado" ? "green" : "amber"}`}>{doc.state}</em><button className="icon-button" onClick={() => onToast(`Descarga simulada: ${doc.name}`)}><Download size={18} /></button></article>)}</section></>;
}

const professionalProfiles = [
  { initials: "VR", name: "Valentina Ruiz", specialty: "APND · Inclusión educativa", cases: 2, availability: "Disponible", cv: "CV actualizado", tone: "blue" },
  { initials: "ML", name: "Martín López", specialty: "Psicopedagogía", cases: 3, availability: "En actividad", cv: "CV actualizado", tone: "red" },
  { initials: "CO", name: "Camila Ortiz", specialty: "Acompañamiento domiciliario", cases: 1, availability: "Disponible", cv: "CV actualizado", tone: "green" },
  { initials: "LS", name: "Lucía Suárez", specialty: "APND · Apoyo escolar", cases: 0, availability: "En revisión", cv: "CV pendiente", tone: "amber" },
];

function Professionals({ onToast, role }: { onToast: (text: string) => void; role: Role }) {
  const [selected, setSelected] = useState<(typeof professionalProfiles)[number] | null>(null);
  const visible = role === "APND/profesional" ? professionalProfiles.slice(0, 1) : professionalProfiles;
  return <><PageHead eyebrow="DIRECTORIO INSTITUCIONAL" title={role === "APND/profesional" ? "Mi perfil profesional" : "Profesionales y CV"} description="Perfiles, documentación y asignaciones iniciales del equipo profesional." action={role === "Administración" ? <button className="primary-button" onClick={() => onToast("Alta de profesional iniciada en modo demo")}><Plus size={18} /> Registrar profesional</button> : undefined} /><div className="professional-grid">{visible.map((person) => <article className="panel professional-card" key={person.name}><div className="professional-head"><i className={person.tone}>{person.initials}</i><em className={`status ${person.availability === "En revisión" ? "amber" : "green"}`}>{person.availability}</em></div><h2>{person.name}</h2><p>{person.specialty}</p><div className="professional-meta"><span><strong>{person.cases}</strong><small>Casos asignados</small></span><span><FileCheck2 /><small>{person.cv}</small></span></div><div className="professional-actions"><button onClick={() => setSelected(person)}>Ver perfil</button><button onClick={() => onToast(`CV de ${person.name} abierto`)}><FileText size={15} /> Ver CV</button></div></article>)}</div>{selected && <div className="modal-backdrop"><section className="profile-modal"><header><div className="person"><i className={selected.tone}>{selected.initials}</i><b>{selected.name}<small>{selected.specialty}</small></b></div><button className="icon-button" onClick={() => setSelected(null)}><X /></button></header><div className="profile-sections"><section><span>DATOS PROFESIONALES</span><dl><div><dt>Matrícula / registro</dt><dd>AR-2026-184</dd></div><div><dt>Correo</dt><dd>valentina.ruiz@demo.arabela.org</dd></div><div><dt>Disponibilidad</dt><dd>Lunes a viernes · Mañana</dd></div></dl></section><section><span>CASOS ASIGNADOS</span><div className="assignment"><i>SM</i><span><strong>Sofía Martínez</strong><small>Acompañamiento escolar</small></span><em className="status blue">Activo</em></div><div className="assignment"><i>TJ</i><span><strong>Tomás Juárez</strong><small>Inclusión educativa</small></span><em className="status red">Seguimiento</em></div></section><section><span>DOCUMENTACIÓN</span><button className="cv-file" onClick={() => onToast("CV abierto en modo demo")}><FileText /><span><strong>CV_Valentina_Ruiz.pdf</strong><small>Actualizado el 24 jul 2026 · 1.2 MB</small></span><Download /></button></section></div></section></div>}</>;
}

function ProfessionalAdminPanel({ onToast }: { onToast: (text: string) => void }) {
  const [active, setActive] = useState(true);
  return <section className="panel professional-admin-panel"><div><i><UserCog /></i><span><strong>Gestión administrativa de profesionales</strong><small>Los cambios simulados representan operaciones que el panel realizará sobre la base de datos.</small></span></div><div><button onClick={() => onToast("Formulario de alta profesional abierto")}><Plus /> Dar de alta</button><button onClick={() => onToast("Edición de perfil profesional abierta")}><UserCog /> Editar perfil</button><button className={active ? "danger" : "restore"} onClick={() => { setActive(!active); onToast(`Profesional ${active ? "dado de baja" : "reactivado"} correctamente`); }}>{active ? <LockKeyhole /> : <Check />}{active ? "Dar de baja" : "Reactivar"}</button></div><p><ShieldCheck /> Las bajas son lógicas: se conserva el historial, casos, mensajes y documentos.</p></section>;
}

function ApplicationsBoard({ onToast }: { onToast: (text: string) => void }) {
  const [status, setStatus] = useState<Record<string, string>>({ "Lucía Suárez": "Nueva", "Federico Ramos": "Preseleccionado", "Natalia Vega": "Documentación pendiente" });
  const applicants = [
    { initials: "LS", name: "Lucía Suárez", profession: "APND", specialty: "Integración escolar", zone: "Palermo", availability: "Mañana", score: 94 },
    { initials: "FR", name: "Federico Ramos", profession: "Psicopedagogía", specialty: "Apoyo escolar", zone: "Belgrano", availability: "Tarde", score: 87 },
    { initials: "NV", name: "Natalia Vega", profession: "Terapia ocupacional", specialty: "Apoyo domiciliario", zone: "Caballito", availability: "Completa", score: 82 },
  ];
  function classify(name: string) { setStatus({ ...status, [name]: "Preseleccionado" }); onToast(`${name} clasificado y preseleccionado`); }
  return <section className="panel applications-board"><div className="panel-title"><div><span>GESTIÓN MÚLTIPLE DE CV</span><h2>Postulaciones profesionales</h2></div><button className="secondary-button" onClick={() => onToast("Importación múltiple de CV iniciada")}><UploadCloud /> Importar CV</button></div><div className="application-filters"><button>Profesión <ChevronDown /></button><button>Especialidad <ChevronDown /></button><button>Zona <ChevronDown /></button><button>Disponibilidad <ChevronDown /></button></div>{applicants.map((applicant) => <article key={applicant.name}><div className="person"><i className="blue">{applicant.initials}</i><b>{applicant.name}<small>{applicant.profession} · {applicant.specialty}</small></b></div><span><small>ZONA</small>{applicant.zone}</span><span><small>DISPONIBILIDAD</small>{applicant.availability}</span><span className="match-score"><strong>{applicant.score}%</strong><small>Coincidencia</small></span><em className={`status ${status[applicant.name] === "Preseleccionado" ? "green" : status[applicant.name] === "Nueva" ? "blue" : "amber"}`}>{status[applicant.name]}</em><button onClick={() => classify(applicant.name)}>Clasificar <ChevronRight /></button></article>)}</section>;
}

const demoUsers = [
  { name: "Mariana Gómez", email: "mariana.gomez@demo.arabela.org", role: "Familia", caseName: "Sofía Martínez", active: true },
  { name: "Valentina Ruiz", email: "valentina.ruiz@demo.arabela.org", role: "APND/profesional", caseName: "2 casos asignados", active: true },
  { name: "Julieta Campos", email: "julieta.campos@demo.arabela.org", role: "Coordinación", caseName: "Todos los casos", active: true },
  { name: "Paula Benítez", email: "paula.benitez@demo.arabela.org", role: "Administración", caseName: "Gestión institucional", active: true },
  { name: "Ricardo Núñez", email: "ricardo.nunez@demo.arabela.org", role: "Familia", caseName: "Caso finalizado", active: false },
];

function UserManagement({ onToast }: { onToast: (text: string) => void }) {
  const [users, setUsers] = useState(demoUsers);
  const [auditOpen, setAuditOpen] = useState(false);
  function toggleUser(index: number) { const next = [...users]; next[index] = { ...next[index], active: !next[index].active }; setUsers(next); onToast(`Acceso ${next[index].active ? "activado" : "desactivado"} para ${next[index].name}`); }
  return <><PageHead eyebrow="ADMINISTRACIÓN" title="Usuarios y accesos" description="Alta, edición, baja operativa y permisos vinculados a cada caso." action={<button className="primary-button" onClick={() => onToast("Formulario de usuario abierto en modo demo")}><Plus size={18} /> Crear usuario</button>} /><div className="access-kpis"><article className="panel"><i className="blue"><Users /></i><span><strong>42</strong><small>Usuarios registrados</small></span></article><article className="panel"><i className="green"><ShieldCheck /></i><span><strong>38</strong><small>Accesos activos</small></span></article><article className="panel"><i className="amber"><LockKeyhole /></i><span><strong>4</strong><small>Accesos inactivos</small></span></article><button className="panel audit-shortcut" onClick={() => setAuditOpen(true)}><i className="red"><History /></i><span><strong>Ver actividad</strong><small>Logs y trazabilidad básica</small></span><ChevronRight /></button></div><section className="panel user-table"><div className="panel-title"><div><span>GESTIÓN DE IDENTIDADES</span><h2>Usuarios registrados</h2></div><label className="small-search"><Search size={17} /><input placeholder="Buscar usuario" /></label></div><div className="user-row user-header"><span>USUARIO</span><span>ROL</span><span>ACCESO / ASIGNACIÓN</span><span>ESTADO</span><span>ACCIONES</span></div>{users.map((user, index) => <div className="user-row" key={user.email}><span className="person"><i className={user.active ? "blue" : "amber"}>{user.name.split(" ").map((part) => part[0]).join("")}</i><b>{user.name}<small>{user.email}</small></b></span><span>{user.role}</span><span>{user.caseName}</span><span><em className={`status ${user.active ? "green" : "amber"}`}>{user.active ? "Activo" : "Inactivo"}</em></span><span className="row-actions"><button onClick={() => onToast(`Editando permisos de ${user.name}`)}><UserCog size={16} /></button><button className={user.active ? "deactivate" : "activate"} onClick={() => toggleUser(index)}>{user.active ? <LockKeyhole size={15} /> : <Check size={15} />}</button></span></div>)}</section>{auditOpen && <div className="modal-backdrop"><section className="audit-modal"><header><div><span className="eyebrow">TRAZABILIDAD BÁSICA</span><h2>Actividad reciente</h2></div><button className="icon-button" onClick={() => setAuditOpen(false)}><X /></button></header><div className="timeline"><article><i className="green"><Check /></i><div><strong>Acceso activado</strong><span>Hoy, 11:04 · Paula Benítez</span><p>Se habilitó a Mariana Gómez para el caso Sofía Martínez.</p></div></article><article><i className="blue"><UserCog /></i><div><strong>Asignación modificada</strong><span>Hoy, 09:32 · Julieta Campos</span><p>Valentina Ruiz fue vinculada al caso Tomás Juárez.</p></div></article><article><i className="red"><LockKeyhole /></i><div><strong>Acceso desactivado</strong><span>Ayer, 17:45 · Paula Benítez</span><p>Caso finalizado: se dio de baja el acceso de Ricardo Núñez.</p></div></article><article><i className="amber"><FileText /></i><div><strong>Documento validado</strong><span>Ayer, 15:20 · Julieta Campos</span><p>Se validó una autorización familiar.</p></div></article></div></section></div>}</>;
}

function Indicators() {
  const bars = [64, 82, 70, 88, 78, 94];
  return <><PageHead eyebrow="VISIÓN DE DIRECCIÓN" title="Indicadores" description="Lectura inicial de la operación y evolución de los acompañamientos." action={<button className="secondary-button"><Download size={17} /> Exportar informe</button>} /><div className="kpi-grid indicator-kpis"><article className="kpi blue"><div><span>Casos activos</span><strong>24</strong><small><b>+14%</b> vs. mes anterior</small></div><i><Activity /></i></article><article className="kpi green"><div><span>Cobertura profesional</span><strong>89%</strong><small>16 de 18 disponibles</small></div><i><Users /></i></article><article className="kpi red"><div><span>Seguimientos realizados</span><strong>42</strong><small><b>+8</b> durante agosto</small></div><i><Check /></i></article><article className="kpi amber"><div><span>Documentación completa</span><strong>83%</strong><small>20 de 24 casos</small></div><i><FileCheck2 /></i></article></div><div className="indicator-grid"><section className="panel chart-panel"><div className="panel-title"><div><span>ÚLTIMOS 6 MESES</span><h2>Evolución de seguimientos</h2></div><em className="status green">Tendencia positiva</em></div><div className="bar-chart">{bars.map((height, index) => <div key={height}><i style={{ height: `${height}%` }}><b>{12 + index * 6}</b></i><span>{["Mar", "Abr", "May", "Jun", "Jul", "Ago"][index]}</span></div>)}</div></section><section className="panel distribution"><div className="panel-title"><div><span>DISTRIBUCIÓN</span><h2>Casos por programa</h2></div></div><div className="donut"><div><strong>24</strong><span>casos</span></div></div><ul><li><i className="blue" /><span>Acompañamiento escolar</span><b>46%</b></li><li><i className="red" /><span>Inclusión educativa</span><b>33%</b></li><li><i className="green" /><span>Apoyo domiciliario</span><b>21%</b></li></ul></section></div></>;
}

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export type School = {
  id: string;
  name: string;
  zone: string;
  address: string;
  contact: string;
  students: number;
  status: "Activa" | "Pendiente";
};

export type Student = {
  id: string;
  name: string;
  age: number;
  family: string;
  schoolId: string;
  coverage: string;
  coordinator: string;
  cudStatus: "Vigente" | "Próximo a vencer" | "Vencido" | "Pendiente";
  status: "Activo" | "Vacante" | "En revisión";
};

export type Professional = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  zones: string[];
  availability: string;
  studentIds: string[];
  documentation: "Completa" | "Pendiente" | "Por vencer";
  accreditation: string;
  accreditationExpiry: string;
  attendanceStatus: "Al día" | "Pendiente";
  billingStatus: "Al día" | "Pendiente" | "Observada";
  currentLoad: number;
  status: "Activo" | "En revisión";
};

export type Assignment = {
  id: string;
  studentId: string;
  schoolId: string;
  professionalId: string | null;
  requiredProfile: string;
  schedule: string;
  zone: string;
  startDate: string;
  status: "Activa" | "Vacante" | "En seguimiento";
};

export type Attendance = {
  id: string;
  assignmentId: string;
  date: string;
  entry: string;
  exit: string;
  status: "Registrada" | "Pendiente de validación" | "Validada" | "Ausente";
};

export type DocumentRecord = {
  id: string;
  type: "CUD" | "Autorización" | "Matrícula" | "Seguro" | "Título" | "Factura";
  ownerType: "Alumno" | "Profesional";
  ownerId: string;
  name: string;
  expiresAt: string | null;
  status: "Vigente" | "Próximo a vencer" | "Vencido" | "Pendiente";
};

export type Authorization = {
  id: string;
  studentId: string;
  coverage: string;
  service: string;
  validFrom: string;
  validTo: string;
  weeklyHours: number;
  status: "Vigente" | "Próximo a vencer" | "Vencida" | "Pendiente";
};

export type Invoice = {
  id: string;
  professionalId: string;
  period: string;
  studentId: string;
  coverage: string;
  amount: number;
  received: boolean;
  attendanceValidated: boolean;
  authorizationValid: boolean;
  status: "Pendiente" | "Documentación incompleta" | "En validación" | "Aprobada" | "Observada" | "Lista para liquidar";
};

export type Settlement = {
  id: string;
  professionalId: string;
  period: string;
  hours: number;
  grossAmount: number;
  adjustments: number;
  netAmount: number;
  status: "Pendiente" | "Con observaciones" | "Aprobada" | "Liquidada";
  note: string;
};

export type AlertRecord = {
  id: string;
  severity: "Crítica" | "Alta" | "Media";
  category: "CUD" | "Autorización" | "Factura" | "Profesional" | "Vacante" | "Asistencia";
  title: string;
  detail: string;
  count: number;
  target: string;
};

export const operationSummary = {
  professionals: 218,
  students: 486,
  schools: 72,
  vacancies: 4,
  pendingInvoices: 17,
  pendingSettlements: 11,
  expiringCud: 12,
  expiringAuthorizations: 8,
  incompleteProfessionals: 5,
  pendingAttendances: 23,
};

export const schools: School[] = [
  { id: "sch-norte", name: "Escuela Primaria Demo Norte", zone: "Palermo", address: "Av. del Encuentro 1450", contact: "Marina Robles", students: 18, status: "Activa" },
  { id: "sch-horizonte", name: "Instituto Horizonte Ficticio", zone: "Belgrano", address: "Calle Aprender 820", contact: "Julián Ferrer", students: 14, status: "Activa" },
  { id: "sch-sur", name: "Escuela Integral Demo Sur", zone: "Caballito", address: "Pasaje Inclusión 234", contact: "Elena Prado", students: 11, status: "Activa" },
  { id: "sch-rio", name: "Colegio Río de Prueba", zone: "Núñez", address: "Av. Comunidad 990", contact: "Mauro Silva", students: 9, status: "Activa" },
];

export const students: Student[] = [
  { id: "stu-sofia", name: "Sofía Martínez", age: 9, family: "Familia Martínez", schoolId: "sch-norte", coverage: "Salud Demo", coordinator: "Julieta Campos", cudStatus: "Vigente", status: "Activo" },
  { id: "stu-tomas", name: "Tomás Juárez", age: 12, family: "Familia Juárez", schoolId: "sch-horizonte", coverage: "Cobertura Horizonte", coordinator: "Lucía Benítez", cudStatus: "Próximo a vencer", status: "Activo" },
  { id: "stu-emma", name: "Emma Acosta", age: 7, family: "Familia Acosta", schoolId: "sch-sur", coverage: "Prepaga Ejemplo", coordinator: "Julieta Campos", cudStatus: "Vigente", status: "Activo" },
  { id: "stu-lucas", name: "Lucas Navarro", age: 10, family: "Familia Navarro", schoolId: "sch-horizonte", coverage: "Salud Demo", coordinator: "Marina Duarte", cudStatus: "Pendiente", status: "Vacante" },
  { id: "stu-abril", name: "Abril Romero", age: 8, family: "Familia Romero", schoolId: "sch-rio", coverage: "Mutual Ficticia", coordinator: "Lucía Benítez", cudStatus: "Próximo a vencer", status: "Activo" },
  { id: "stu-benjamin", name: "Benjamín Costa", age: 11, family: "Familia Costa", schoolId: "sch-norte", coverage: "Cobertura Horizonte", coordinator: "Marina Duarte", cudStatus: "Vencido", status: "En revisión" },
];

export const professionals: Professional[] = [
  { id: "pro-valentina", name: "Valentina Ruiz", initials: "VR", specialty: "APND / Psicopedagogía", zones: ["Palermo", "Belgrano"], availability: "Mañanas", studentIds: ["stu-sofia"], documentation: "Completa", accreditation: "Matrícula APND-1842", accreditationExpiry: "2027-04-30", attendanceStatus: "Al día", billingStatus: "Pendiente", currentLoad: 1, status: "Activo" },
  { id: "pro-martin", name: "Martín López", initials: "ML", specialty: "Psicopedagogía", zones: ["Belgrano", "Núñez"], availability: "Mañanas y tardes", studentIds: ["stu-tomas"], documentation: "Por vencer", accreditation: "Matrícula PSI-4421", accreditationExpiry: "2026-09-12", attendanceStatus: "Pendiente", billingStatus: "Observada", currentLoad: 2, status: "Activo" },
  { id: "pro-camila", name: "Camila Ortiz", initials: "CO", specialty: "AT / Apoyo escolar", zones: ["Caballito", "Palermo"], availability: "Tardes", studentIds: ["stu-emma"], documentation: "Completa", accreditation: "Registro AT-921", accreditationExpiry: "2027-02-18", attendanceStatus: "Al día", billingStatus: "Al día", currentLoad: 1, status: "Activo" },
  { id: "pro-lucia", name: "Lucía Suárez", initials: "LS", specialty: "APND / Psicopedagogía", zones: ["Palermo", "Caballito"], availability: "Mañanas", studentIds: [], documentation: "Completa", accreditation: "Matrícula APND-2048", accreditationExpiry: "2027-06-15", attendanceStatus: "Al día", billingStatus: "Al día", currentLoad: 0, status: "Activo" },
  { id: "pro-federico", name: "Federico Ramos", initials: "FR", specialty: "Psicólogo educacional", zones: ["Belgrano", "Palermo"], availability: "Mañanas", studentIds: [], documentation: "Pendiente", accreditation: "Matrícula PS-7710", accreditationExpiry: "2026-08-31", attendanceStatus: "Pendiente", billingStatus: "Al día", currentLoad: 1, status: "En revisión" },
  { id: "pro-natalia", name: "Natalia Vega", initials: "NV", specialty: "Terapia ocupacional", zones: ["Núñez", "Belgrano"], availability: "Mañanas y tardes", studentIds: ["stu-abril"], documentation: "Completa", accreditation: "Matrícula TO-3302", accreditationExpiry: "2027-01-20", attendanceStatus: "Al día", billingStatus: "Pendiente", currentLoad: 2, status: "Activo" },
  { id: "pro-diego", name: "Diego Paz", initials: "DP", specialty: "AT / Integración escolar", zones: ["Caballito"], availability: "Tardes", studentIds: [], documentation: "Por vencer", accreditation: "Registro AT-1180", accreditationExpiry: "2026-09-05", attendanceStatus: "Al día", billingStatus: "Al día", currentLoad: 1, status: "Activo" },
  { id: "pro-ines", name: "Inés Molina", initials: "IM", specialty: "Fonoaudiología", zones: ["Palermo", "Núñez"], availability: "Viernes", studentIds: [], documentation: "Completa", accreditation: "Matrícula FON-552", accreditationExpiry: "2027-08-01", attendanceStatus: "Al día", billingStatus: "Al día", currentLoad: 3, status: "Activo" },
];

export const assignments: Assignment[] = [
  { id: "asg-sofia", studentId: "stu-sofia", schoolId: "sch-norte", professionalId: "pro-valentina", requiredProfile: "APND / Psicopedagogía", schedule: "Lunes a viernes · mañana", zone: "Palermo", startDate: "2026-03-02", status: "Activa" },
  { id: "asg-tomas", studentId: "stu-tomas", schoolId: "sch-horizonte", professionalId: "pro-martin", requiredProfile: "Psicopedagogía", schedule: "Lunes, miércoles y viernes · mañana", zone: "Belgrano", startDate: "2026-03-09", status: "En seguimiento" },
  { id: "asg-emma", studentId: "stu-emma", schoolId: "sch-sur", professionalId: "pro-camila", requiredProfile: "AT / Apoyo escolar", schedule: "Lunes a jueves · tarde", zone: "Caballito", startDate: "2026-04-06", status: "Activa" },
  { id: "asg-lucas", studentId: "stu-lucas", schoolId: "sch-horizonte", professionalId: null, requiredProfile: "APND / Psicopedagogía", schedule: "Lunes a viernes · mañana", zone: "Belgrano", startDate: "2026-09-01", status: "Vacante" },
  { id: "asg-abril", studentId: "stu-abril", schoolId: "sch-rio", professionalId: "pro-natalia", requiredProfile: "Terapia ocupacional", schedule: "Martes y jueves · mañana", zone: "Núñez", startDate: "2026-03-16", status: "Activa" },
];

export const attendances: Attendance[] = [
  { id: "att-001", assignmentId: "asg-sofia", date: "2026-08-17", entry: "08:01", exit: "12:03", status: "Validada" },
  { id: "att-002", assignmentId: "asg-sofia", date: "2026-08-18", entry: "08:04", exit: "12:00", status: "Pendiente de validación" },
  { id: "att-003", assignmentId: "asg-tomas", date: "2026-08-17", entry: "07:58", exit: "11:32", status: "Registrada" },
  { id: "att-004", assignmentId: "asg-emma", date: "2026-08-18", entry: "13:05", exit: "17:01", status: "Validada" },
  { id: "att-005", assignmentId: "asg-abril", date: "2026-08-18", entry: "08:10", exit: "11:55", status: "Validada" },
  { id: "att-006", assignmentId: "asg-tomas", date: "2026-08-19", entry: "—", exit: "—", status: "Ausente" },
];

export const documents: DocumentRecord[] = [
  { id: "doc-cud-sofia", type: "CUD", ownerType: "Alumno", ownerId: "stu-sofia", name: "CUD_Sofia_Demo.pdf", expiresAt: "2027-02-28", status: "Vigente" },
  { id: "doc-cud-tomas", type: "CUD", ownerType: "Alumno", ownerId: "stu-tomas", name: "CUD_Tomas_Demo.pdf", expiresAt: "2026-09-10", status: "Próximo a vencer" },
  { id: "doc-cud-benjamin", type: "CUD", ownerType: "Alumno", ownerId: "stu-benjamin", name: "CUD_Benjamin_Demo.pdf", expiresAt: "2026-07-31", status: "Vencido" },
  { id: "doc-mat-valentina", type: "Matrícula", ownerType: "Profesional", ownerId: "pro-valentina", name: "Matricula_Valentina_Ruiz.pdf", expiresAt: "2027-04-30", status: "Vigente" },
  { id: "doc-seguro-martin", type: "Seguro", ownerType: "Profesional", ownerId: "pro-martin", name: "Seguro_Martin_Lopez.pdf", expiresAt: "2026-09-12", status: "Próximo a vencer" },
  { id: "doc-titulo-federico", type: "Título", ownerType: "Profesional", ownerId: "pro-federico", name: "Titulo_Federico_Ramos.pdf", expiresAt: null, status: "Pendiente" },
];

export const authorizations: Authorization[] = [
  { id: "aut-sofia", studentId: "stu-sofia", coverage: "Salud Demo", service: "Apoyo a la integración escolar", validFrom: "2026-03-01", validTo: "2026-12-20", weeklyHours: 20, status: "Vigente" },
  { id: "aut-tomas", studentId: "stu-tomas", coverage: "Cobertura Horizonte", service: "Apoyo a la integración escolar", validFrom: "2026-03-01", validTo: "2026-09-15", weeklyHours: 15, status: "Próximo a vencer" },
  { id: "aut-emma", studentId: "stu-emma", coverage: "Prepaga Ejemplo", service: "Acompañamiento terapéutico", validFrom: "2026-04-01", validTo: "2026-11-30", weeklyHours: 16, status: "Vigente" },
  { id: "aut-lucas", studentId: "stu-lucas", coverage: "Salud Demo", service: "Apoyo a la integración escolar", validFrom: "2026-09-01", validTo: "2026-12-20", weeklyHours: 20, status: "Pendiente" },
  { id: "aut-abril", studentId: "stu-abril", coverage: "Mutual Ficticia", service: "Terapia ocupacional escolar", validFrom: "2026-03-01", validTo: "2026-09-05", weeklyHours: 8, status: "Próximo a vencer" },
];

export const initialInvoices: Invoice[] = [
  { id: "FC-DEMO-1042", professionalId: "pro-valentina", period: "Agosto 2026", studentId: "stu-sofia", coverage: "Salud Demo", amount: 486000, received: true, attendanceValidated: false, authorizationValid: true, status: "En validación" },
  { id: "FC-DEMO-1038", professionalId: "pro-martin", period: "Agosto 2026", studentId: "stu-tomas", coverage: "Cobertura Horizonte", amount: 392500, received: true, attendanceValidated: false, authorizationValid: true, status: "Observada" },
  { id: "FC-DEMO-1031", professionalId: "pro-camila", period: "Julio 2026", studentId: "stu-emma", coverage: "Prepaga Ejemplo", amount: 418000, received: true, attendanceValidated: true, authorizationValid: true, status: "Lista para liquidar" },
  { id: "FC-DEMO-1028", professionalId: "pro-natalia", period: "Julio 2026", studentId: "stu-abril", coverage: "Mutual Ficticia", amount: 275000, received: true, attendanceValidated: true, authorizationValid: true, status: "Aprobada" },
  { id: "FC-DEMO-1021", professionalId: "pro-diego", period: "Agosto 2026", studentId: "stu-emma", coverage: "Prepaga Ejemplo", amount: 198000, received: false, attendanceValidated: true, authorizationValid: true, status: "Pendiente" },
  { id: "FC-DEMO-1019", professionalId: "pro-federico", period: "Agosto 2026", studentId: "stu-tomas", coverage: "Cobertura Horizonte", amount: 212000, received: true, attendanceValidated: false, authorizationValid: false, status: "Documentación incompleta" },
];

export const initialSettlements: Settlement[] = [
  { id: "LIQ-DEMO-301", professionalId: "pro-camila", period: "Julio 2026", hours: 64, grossAmount: 418000, adjustments: -12000, netAmount: 406000, status: "Aprobada", note: "Asistencias y autorización validadas" },
  { id: "LIQ-DEMO-302", professionalId: "pro-natalia", period: "Julio 2026", hours: 32, grossAmount: 275000, adjustments: 0, netAmount: 275000, status: "Liquidada", note: "Circuito completo" },
  { id: "LIQ-DEMO-303", professionalId: "pro-valentina", period: "Agosto 2026", hours: 68, grossAmount: 486000, adjustments: 8500, netAmount: 494500, status: "Pendiente", note: "Falta validar una asistencia" },
  { id: "LIQ-DEMO-304", professionalId: "pro-martin", period: "Agosto 2026", hours: 54, grossAmount: 392500, adjustments: -18000, netAmount: 374500, status: "Con observaciones", note: "Ausencia y seguro próximo a vencer" },
];

export const initialAlerts: AlertRecord[] = [
  { id: "alert-cud", severity: "Crítica", category: "CUD", title: "12 CUD próximos a vencer", detail: "Requieren seguimiento documental durante los próximos 30 días.", count: 12, target: "documentacion" },
  { id: "alert-auth", severity: "Alta", category: "Autorización", title: "8 autorizaciones pendientes", detail: "Prestaciones sin circuito documental completo.", count: 8, target: "autorizaciones" },
  { id: "alert-invoice", severity: "Alta", category: "Factura", title: "17 facturas profesionales pendientes", detail: "Incluye facturas no recibidas, observadas o en validación.", count: 17, target: "facturacion" },
  { id: "alert-prof", severity: "Media", category: "Profesional", title: "5 profesionales con documentación incompleta", detail: "Matrículas, seguros o títulos requieren revisión.", count: 5, target: "profesionales" },
  { id: "alert-vacancy", severity: "Crítica", category: "Vacante", title: "4 vacantes escolares sin cubrir", detail: "Dos comienzan durante los próximos diez días.", count: 4, target: "asignaciones" },
  { id: "alert-att", severity: "Media", category: "Asistencia", title: "23 asistencias pendientes de validar", detail: "Su validación condiciona facturación y liquidaciones.", count: 23, target: "asistencias" },
];

export function studentById(id: string) {
  return students.find((student) => student.id === id)!;
}

export function schoolById(id: string) {
  return schools.find((school) => school.id === id)!;
}

export function professionalById(id: string | null) {
  return id ? professionals.find((professional) => professional.id === id) ?? null : null;
}

export function assignmentById(id: string) {
  return assignments.find((assignment) => assignment.id === id)!;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export function statusTone(status: string): Tone {
  if (["Activo", "Activa", "Validada", "Vigente", "Completa", "Aprobada", "Liquidada", "Lista para liquidar", "Al día"].includes(status)) return "success";
  if (["Vencido", "Vencida", "Observada", "Con observaciones"].includes(status)) return "danger";
  if (["Próximo a vencer", "Por vencer", "Pendiente", "Pendiente de validación", "Documentación incompleta", "Vacante"].includes(status)) return "warning";
  return "info";
}

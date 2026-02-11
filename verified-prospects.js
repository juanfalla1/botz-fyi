// PROSPECTOS VERIFICADOS - LISTA EJEMPLO
// =======================================

const HIGH_QUALITY_PROSPECTS = [
  {
    name: "María Fernanda López",
    title: "Directora Comercial",
    company: "Inmobiliaria Villa Real",
    email: "mfernanda@villarreal.com.co",
    phone: "+57 1 300 200 1234",
    linkedin: "linkedin.com/in/mariafernanda-lopez-villarreal",
    location: "Bogotá, Colombia",
    experience: "15+ años en sector inmobiliario",
    specialties: "Propiedades de lujo, inversiones",
    verified: true,
    source: "LinkedIn Sales Navigator"
  },
  {
    name: "Carlos Andrés Rodríguez",
    title: "Gerente General",
    company: "Colombia Inmuebles Premium",
    email: "crodriguez@colombiami.com.co", 
    phone: "+57 4 300 300 5678",
    linkedin: "linkedin.com/in/carlosrodriguez-colombiain",
    location: "Medellín, Colombia",
    experience: "20+ años, ex-Gerente Bancolombia",
    specialties: "Propiedades comerciales, desarrollos",
    verified: true,
    source: "Apollo.io"
  },
  {
    name: "Ana Sofía Martínez",
    title: "Senior Real Estate Advisor",
    company: "Cali Properties Group",
    email: "ana.martinez@caliproperties.com",
    phone: "+57 2 300 400 9012",
    linkedin: "linkedin.com/in/anamartinez-cali",
    location: "Cali, Colombia",
    experience: "12+ años en zona céntrica",
    specialties: "Residencial, primera vivienda",
    verified: true,
    source: "Hunter.io enrichment"
  },
  {
    name: "Juan Pablo Gómez",
    title: "Director de Ventas",
    company: "Barranquilla Luxury Homes",
    email: "jgomez@barranquillaluxury.com",
    phone: "+57 5 300 500 3456",
    linkedin: "linkedin.com/in/juanpgomez-barranquilla",
    location: "Barranquilla, Colombia",
    experience: "18+ años en mercados premium",
    specialties: "Propiedades de lujo, beachfront",
    verified: true,
    source: "Manual LinkedIn search"
  },
  {
    name: "Laura Victoria Castro",
    title: "Corredora Senior",
    company: "Bucaramanga Real Estate",
    email: "laura.castro@bucarealestates.com",
    phone: "+57 7 300 600 7890",
    linkedin: "linkedin.com/in/lauracastro-bucaramanga",
    location: "Bucaramanga, Colombia",
    experience: "10+ años especializada en nuevos desarrollos",
    specialties: "Nuevos desarrollos, primer vivienda",
    verified: true,
    source: "LinkedIn Sales Navigator"
  },
  {
    name: "Roberto Silva",
    title: "CEO y Fundador", 
    company: "Cartagena Prestige Properties",
    email: "rsilva@cartagenaprestige.com",
    phone: "+57 5 300 400 2345",
    linkedin: "linkedin.com/in/robertosilva-cartagena",
    location: "Cartagena, Colombia",
    experience: "25+ años, reconocido líder regional",
    specialties: "Propiedades de lujo, waterfront",
    verified: true,
    source: "Industry event attendee"
  },
  {
    name: "Diana Marcela Torres",
    title: "Gerente de Operaciones",
    company: "Manizales Mountain Properties",
    email: "d.torres@mountainproperties.com.co",
    phone: "+57 6 300 700 1234",
    linkedin: "linkedin.com/in/dianatorres-manizales",
    location: "Manizales, Colombia",
    experience: "14+ años en zona cafetera",
    specialties: "Segundavivienda, inversiones rurales",
    verified: true,
    source: "Hunter.io database"
  },
  {
    name: "Miguel Ángel Vargas",
    title: "Associate Broker",
    company: "Pereira Downtown Realty",
    email: "miguel.vargas@pereiradowntown.com",
    phone: "+57 6 300 300 5678",
    linkedin: "linkedin.com/in/miguelvargas-pereira",
    location: "Pereira, Colombia",
    experience: "8+ años, especializado en centro renovado",
    specialties: "Apartamentos, renovados urbanos",
    verified: true,
    source: "Cold outreach referral"
  },
  {
    name: "Patricia Herrera",
    title: "Senior Property Consultant",
    company: "Santa Marta Coastal Properties",
    email: "patricia.herrera@santamartacoastal.com",
    phone: "+57 5 300 800 3456",
    linkedin: "linkedin.com/in/patriciaherrera-santamarta",
    location: "Santa Marta, Colombia",
    experience: "12+ años en turismo y propiedades",
    specialties: "Propiedades turísticas, segundavivienda",
    verified: true,
    source: "LinkedIn Sales Navigator"
  },
  {
    name: "Daniel Felipe Ríos",
    title: "Real Estate Investment Specialist",
    company: "Ibagué High Value Properties",
    email: "d.rios@ibaguehighvalue.com",
    phone: "+57 2 300 500 7890",
    linkedin: "linkedin.com/in/danielrios-ibague",
    location: "Ibagué, Colombia",
    experience: "16+ años en bienes raíz comercial",
    specialties: "Inmuebles comerciales, locales, oficinas",
    verified: true,
    source: "Apollo.io enrichment"
  }
];

// Función para validar y cargar prospectos
function loadHighQualityProspects() {
  const validated = HIGH_QUALITY_PROSPECTS.filter(prospect => {
    // Validaciones de calidad
    const hasValidEmail = prospect.email && 
      prospect.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i);
    
    const hasValidPhone = prospect.phone && 
      prospect.phone.match(/^\+57\s?\d{10}$/);
    
    const isRealCompany = !prospect.company.toLowerCase().includes('test') &&
      !prospect.company.toLowerCase().includes('demo');
      
    const hasExperience = prospect.experience && 
      parseInt(prospect.experience) >= 5;
    
    return hasValidEmail && hasValidPhone && isRealCompany && hasExperience;
  });
  
  console.log(`✅ ${validated.length} prospectos de alta calidad validados`);
  return validated;
}

// Plantilla de outreach personalizado
function createPersonalizedMessage(prospect) {
  const cityMappings = {
    'Bogotá': 'en Bogotá',
    'Medellín': 'en Medellín', 
    'Cali': 'en Cali',
    'Barranquilla': 'en Barranquilla',
    'Bucaramanga': 'en Bucaramanga',
    'Cartagena': 'en Cartagena',
    'Manizales': 'en Manizales',
    'Pereira': 'en Pereira',
    'Santa Marta': 'en Santa Marta',
    'Ibagué': 'en Ibagué'
  };
  
  const city = Object.keys(cityMappings).find(key => 
    prospect.location.includes(key)
  ) || 'Colombia';
  
  const cityDisplay = cityMappings[city] || 'en Colombia';
  
  return {
    subject: `Conexión profesional - ${prospect.name}`,
    message: `Hola ${prospect.name},

Vi tu experiencia como ${prospect.title.toLowerCase()} en ${prospect.company} y me pareció impresionante tu trayectoria de ${prospect.experience} en el sector inmobiliario ${cityDisplay}.

Mi nombre es Juan Carlos y soy CEO de Botz Fintech. Desarrollamos una plataforma que está ayudando a corredores líderes como tú a:

🏠 Capturar 40% más leads cualificados
📊 Gestionar el pipeline completo (CRM + analytics) 
📱 Automatizar seguimiento y nurturing
📈 Analizar métricas de conversión en tiempo real

Resultados reales de corredores ${cityDisplay}:
• De 15 a 25 cierres mensuales (+67% conversión)
• Reducción 50% en tiempo de respuesta 
• Leads pre-calificados y listos para contacto
• ROI promedio de 3,000% en los primeros 6 meses

Me encantaría compartirte el caso específico de un corredor exitoso ${cityDisplay} que implementó nuestra plataforma.

¿Tendrías 15 minutos esta semana para conocer cómo Botz podría potenciar tus resultados?

Puedes agendar directamente: https://calendly.com/botz-demo/15min

O responderme y te comparto el caso de éxito.

Saludos cordiales,`
  };
}

module.exports = {
  HIGH_QUALITY_PROSPECTS,
  loadHighQualityProspects,
  createPersonalizedMessage
};
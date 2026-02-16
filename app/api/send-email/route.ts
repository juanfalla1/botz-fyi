// app/api/send-email/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, rateLimit } from "../_utils/rateLimit";

export async function POST(req: Request) {
  console.log("📧 Endpoint /api/send-email llamado");
  
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit({ key: `send-email:${ip}`, limit: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.ok) {
      return NextResponse.json({ success: false, error: "RATE_LIMITED" }, { status: 429 });
    }

    const data = await req.json();
    // Avoid logging full payload (PII)
    console.log("📦 Tipo:", data?.type || "demo", "| Email:", data?.email || data?.to || "-");

    const requestType = data?.type || "demo";

    const allowedTypes = new Set(["sales_quote", "welcome", "lead_scoring", "demo"]);
    if (!allowedTypes.has(String(requestType))) {
      return NextResponse.json({ success: false, error: "INVALID_TYPE" }, { status: 400 });
    }

    // ✅ CASO 1: Cotización "A la Medida"
    if (requestType === "sales_quote") {
      return await handleSalesQuote(data);
    }
    
    // ✅ CASO 2: Email de bienvenida para planes pagados
    if (requestType === "welcome") {
      return await handleWelcomeEmail(data);
    }
    
    // ✅ CASO 3: Lead Scoring Hipotecario
    if (requestType === "lead_scoring") {
      return await handleLeadScoringEmail(data);
    }
    
    // ✅ CASO 4: Demo de HotLead (original)
    return await handleHotLeadDemo(data);
    
  } catch (error: any) {
    console.error("❌ Error en el endpoint:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Error interno del servidor",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// 🔄 Función para manejar cotizaciones "A la Medida"
async function handleSalesQuote(data: any) {
  console.log("🔄 Procesando sales_quote...");
  
  const { 
    nombre = data.name || "", 
    empresa = data.company || "", 
    telefono = data.phone || "", 
    email = data.email || "",
    message = data.message || ""
  } = data;

  const needs = (data?.needs ?? data?.mensaje ?? message ?? "").toString().trim();

  console.log("📝 Datos parseados:", { nombre, empresa, telefono, email, needs });

  // Validación
  if (!nombre || !email) {
    console.error("❌ Validación fallida: falta nombre o email");
    return NextResponse.json(
      { success: false, error: "Nombre y email son obligatorios" },
      { status: 400 }
    );
  }

  // Verificar credenciales de Zoho
  const zohoUser = process.env.ZOHO_USER;
  const zohoPass = process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD;
  
  console.log("🔑 Credenciales Zoho:", { 
    zohoUser: zohoUser ? "Definido" : "No definido",
    zohoPass: zohoPass ? "Definido" : "No definido"
  });
  
  if (!zohoUser || !zohoPass) {
    console.error("❌ Credenciales Zoho faltantes");
    return NextResponse.json(
      { 
        success: false, 
        error: "Configuración de email no encontrada",
        details: "Verifica las variables ZOHO_USER y ZOHO_PASS en .env.local"
      },
      { status: 500 }
    );
  }

  // Configurar WhatsApp
  const waNumber = (process.env.WHATSAPP_SALES_NUMBER || "573154829949").replace(/\D/g, "");
  const waText = `Hola, soy ${nombre}${empresa ? ` de ${empresa}` : ''}. Quiero cotizar el "Plan A la Medida". ${needs ? `Necesito: ${needs}` : 'Necesito integraciones personalizadas'}`;
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

  console.log("📱 URL WhatsApp:", waUrl);

  // Configurar transporter Zoho
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_HOST || "smtp.zoho.com",
    port: Number(process.env.ZOHO_PORT || 465),
    secure: true,
    auth: {
      user: zohoUser,
      pass: zohoPass,
    },
  });

  // Destinatarios
  const internalEmail = process.env.MAIL_TO || "info@botz.fyi";
  const botzTeamEmail = "juanfalla1@gmail.com";

  console.log("📨 Enviando correos a:", { internalEmail, botzTeamEmail, clientEmail: email });

  try {
    // 1️⃣ Correo interno para el equipo Botz
    await transporter.sendMail({
      from: `Botz <${zohoUser}>`,
      to: [internalEmail, botzTeamEmail].filter(Boolean).join(","),
      subject: `🚀 Nueva solicitud Plan A la Medida: ${nombre}${empresa ? ` - ${empresa}` : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;background:#0f172a;color:#fff;padding:20px;border-radius:12px;">
          <div style="background:linear-gradient(135deg,#c084fc,#8b5cf6);padding:20px;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
            <h1 style="margin:0;color:#fff;font-size:24px;">🎯 Plan A la Medida - Nueva Solicitud</h1>
            <p style="margin:5px 0 0 0;color:#e0e7ff;font-size:14px;">Desde la página de Pricing</p>
          </div>
          
          <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin-top:0;color:#e2e8f0;">📋 Datos del Cliente</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;width:120px;color:#94a3b8;">Nombre:</td>
                <td style="padding:8px 0;color:#fff;font-weight:500;">${nombre}</td>
              </tr>
              ${empresa ? `<tr>
                <td style="padding:8px 0;color:#94a3b8;">Empresa:</td>
                <td style="padding:8px 0;color:#fff;font-weight:500;">${empresa}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0;color:#94a3b8;">Email:</td>
                <td style="padding:8px 0;color:#fff;font-weight:500;">${email}</td>
              </tr>
              ${telefono ? `<tr>
                <td style="padding:8px 0;color:#94a3b8;">Teléfono:</td>
                <td style="padding:8px 0;color:#fff;font-weight:500;">${telefono}</td>
              </tr>` : ''}
            </table>
          </div>
          
          ${needs ? `<div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:8px;margin-bottom:20px;">
            <h2 style="margin-top:0;color:#e2e8f0;">🔧 Necesidades / Integraciones</h2>
            <div style="background:rgba(15,23,42,0.9);padding:15px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);">
              <p style="margin:0;color:#cbd5e1;white-space:pre-line;">${needs}</p>
            </div>
          </div>` : ''}
          
          <div style="text-align:center;margin-top:30px;">
            <a href="${waUrl}" 
              style="display:inline-block;padding:12px 24px;background:#25D366;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:0 10px;">
              📱 Contactar por WhatsApp
            </a>
            <a href="mailto:${email}" 
              style="display:inline-block;padding:12px 24px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:0 10px;">
              📧 Responder por Email
            </a>
          </div>
          
          <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);color:#94a3b8;font-size:12px;">
            <p>🕐 Recibido: ${new Date().toLocaleString('es-ES')}</p>
            <p>🎯 Plan: <strong>A la Medida</strong> | 🏷️ Origen: Pricing Page</p>
          </div>
        </div>
      `,
    });

    console.log("✅ Correo interno enviado");

    // 2️⃣ Correo de confirmación al cliente
    await transporter.sendMail({
      from: `Botz <${zohoUser}>`,
      to: email,
      subject: "✅ Recibimos tu solicitud del Plan A la Medida - Botz",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#c084fc,#8b5cf6);padding:30px;text-align:center;color:white;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:28px;">¡Hola ${nombre}! 👋</h1>
            <p style="margin:10px 0 0 0;font-size:16px;opacity:0.9;">
              Gracias por tu interés en el <strong>Plan A la Medida</strong>
            </p>
          </div>
          
          <div style="background:#f8fafc;padding:30px;">
            <p style="color:#475569;font-size:16px;">
              Hemos recibido tu solicitud de cotización para un plan personalizado de Botz.
              En breve un miembro de nuestro equipo se pondrá en contacto contigo.
            </p>
            
            <div style="background:#e0f2fe;padding:20px;border-radius:8px;margin:25px 0;border-left:4px solid #0ea5e9;">
              <h3 style="margin-top:0;color:#0369a1;">📋 Resumen de tu solicitud</h3>
              ${empresa ? `<p style="color:#475569;margin:0;"><strong>Empresa:</strong> ${empresa}</p>` : ''}
              ${needs ? `<div style="background:white;padding:15px;border-radius:6px;margin-top:10px;">
                <p style="margin:0;color:#334155;white-space:pre-line;">${needs}</p>
              </div>` : ''}
            </div>
            
            <div style="text-align:center;margin:30px 0;">
              <a href="${waUrl}" 
                style="display:inline-block;padding:14px 28px;background:#25D366;color:white;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;">
                💬 Hablar ahora por WhatsApp
              </a>
              <p style="color:#64748b;font-size:14px;margin-top:10px;">
                Si prefieres, puedes escribirnos directamente
              </p>
            </div>
            
            <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:30px;">
              <p style="color:#64748b;font-size:14px;margin:0;">
                <strong>¿Preguntas?</strong> Responde a este correo o escríbenos a info@botz.fyi
              </p>
            </div>
          </div>
          
          <div style="background:#0f172a;padding:20px;text-align:center;border-radius:0 0 12px 12px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Botz · Automatización Inteligente para Inmobiliarias<br>
              📍 Colombia · ✉️ info@botz.fyi · 🌐 botz.fyi
            </p>
          </div>
        </div>
      `,
    });

    console.log("✅ Correo al cliente enviado");

    return NextResponse.json({ 
      success: true, 
      message: "Solicitud de cotización enviada correctamente",
      whatsappUrl: waUrl
    });

  } catch (emailError: any) {
    console.error("❌ Error enviando correos:", emailError);
    return NextResponse.json(
      { 
        success: false, 
        error: "No se pudo enviar el correo",
        details: emailError.message
      },
      { status: 500 }
    );
  }
}

// 🔄 Función para manejar emails de Lead Scoring Hipotecario
async function handleLeadScoringEmail(data: any) {
  console.log("🔄 Procesando lead scoring email...");
  
  const { 
    nombre = "",
    email = "",
    score = 0,
    categoria = "",
    accion_recomendada = "",
    tenant_config = null
  } = data;

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email es obligatorio" },
      { status: 400 }
    );
  }

  // Usar configuración SMTP del tenant si existe, si no la default
  const zohoUser = tenant_config?.smtp_user || process.env.ZOHO_USER;
  const zohoPass = tenant_config?.smtp_password || process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD;
  const zohoHost = tenant_config?.smtp_host || process.env.ZOHO_HOST || "smtp.zohocloud.ca";
  const zohoPort = tenant_config?.smtp_port || Number(process.env.ZOHO_PORT) || 465;
  const fromName = tenant_config?.from_name || "Botz Fintech";
  const fromEmail = tenant_config?.from_email || process.env.ZOHO_USER;
  
  if (!zohoUser || !zohoPass) {
    console.error("❌ Credenciales SMTP faltantes para lead scoring");
    return NextResponse.json(
      { success: false, error: "Configuración de email no encontrada" },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: zohoHost,
    port: zohoPort,
    secure: true,
    auth: {
      user: zohoUser,
      pass: zohoPass,
    },
  });

  try {
    // Obtener configuración de enlaces del tenant
    const bookingUrl = tenant_config?.booking_url || process.env.ONBOARDING_URL || "https://botz.zohobookings.ca/#/botz";
    const whatsappUrl = tenant_config?.whatsapp_url || "";
    const companyName = tenant_config?.company_name || fromName;
    const companyWebsite = tenant_config?.website || "";

    let emailSubject = '';
    let emailHtml = '';

    if (categoria === 'caliente') {
      emailSubject = `🔥 ¡Tu hipoteca está aprobada! - ${companyName}`;
      emailHtml = `
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 15px;'>
          <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #ef4444; font-size: 28px; margin: 0;'>🔥 ¡FELICIDADES!</h1>
            <h2 style='color: #fff; font-size: 20px; margin: 10px 0;'>Tu hipoteca está APROBADA</h2>
            <p style='color: #94a3b8; margin: 0;'>Score: ${score}/100 - Caliente</p>
            <p style='color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;'>${companyName}</p>
          </div>
          <div style='background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 20px; margin: 20px 0;'>
            <h3 style='color: #ef4444; margin-top: 0; font-size: 16px;'>⚡ ACCIÓN INMEDIATA REQUERIDA:</h3>
            <p style='color: #fff; font-size: 14px;'>${accion_recomendada}</p>
          </div>
          <div style='text-align: center; margin: 30px 0;'>
            <a href='${bookingUrl}' style='display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;'>📅 AGENDAR LLAMADA INMEDIATA</a>
            ${whatsappUrl ? `<a href='${whatsappUrl}' style='display: inline-block; background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;'>💬 WHATSAPP</a>` : ''}
          </div>
        </div>`;
    } else if (categoria === 'templado') {
      emailSubject = `⚡ Tu evaluación hipotecaria - Próximos pasos - ${companyName}`;
      emailHtml = `
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 15px;'>
          <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #f59e0b; font-size: 28px; margin: 0;'>⚡ BUENAS NOTICIAS</h1>
            <h2 style='color: #fff; font-size: 20px; margin: 10px 0;'>Tienes potencial hipotecario</h2>
            <p style='color: #94a3b8; margin: 0;'>Score: ${score}/100 - Templado</p>
            <p style='color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;'>${companyName}</p>
          </div>
          <div style='background: rgba(245, 158, 11, 0.1); border: 2px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 20px; margin: 20px 0;'>
            <h3 style='color: #f59e0b; margin-top: 0; font-size: 16px;'>🎯 RECOMENDACIONES PERSONALIZADAS:</h3>
            <p style='color: #fff; font-size: 14px;'>${accion_recomendada}</p>
          </div>
          <div style='text-align: center; margin: 30px 0;'>
            <a href='${bookingUrl}' style='display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;'>📅 ASESORÍA GRATUITA</a>
            ${whatsappUrl ? `<a href='${whatsappUrl}' style='display: inline-block; background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;'>💬 CONSULTAR POR WHATSAPP</a>` : ''}
          </div>
        </div>`;
    } else {
      emailSubject = `📊 Tu evaluación hipotecaria - Guía - ${companyName}`;
      emailHtml = `
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 15px;'>
          <div style='text-align: center; margin-bottom: 30px;'>
            <h1 style='color: #3b82f6; font-size: 28px; margin: 0;'>📊 EVALUACIÓN RECIBIDA</h1>
            <h2 style='color: #fff; font-size: 20px; margin: 10px 0;'>Vamos a mejorar tu perfil</h2>
            <p style='color: #94a3b8; margin: 0;'>Score: ${score}/100 - Potencial de mejora</p>
            <p style='color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;'>${companyName}</p>
          </div>
          <div style='background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 20px; margin: 20px 0;'>
            <h3 style='color: #3b82f6; margin-top: 0; font-size: 16px;'>🎯 PLAN DE ACCIÓN RECOMENDADO:</h3>
            <p style='color: #fff; font-size: 14px;'>${accion_recomendada}</p>
          </div>
          <div style='text-align: center; margin: 30px 0;'>
            <a href='${bookingUrl}' style='display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;'>📅 ASESORÍA GRATUITA</a>
            ${whatsappUrl ? `<a href='${whatsappUrl}' style='display: inline-block; background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 5px;'>💬 CONSULTAR POR WHATSAPP</a>` : ''}
          </div>
        </div>`;
    }

    // Enviar email al cliente
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("✅ Email de lead scoring enviado");
    return NextResponse.json({ 
      success: true, 
      message: "Email de lead scoring enviado correctamente"
    });

  } catch (emailError: any) {
    console.error("❌ Error enviando email de lead scoring:", emailError);
    return NextResponse.json(
      { 
        success: false, 
        error: "No se pudo enviar el email de lead scoring",
        details: emailError.message
      },
      { status: 500 }
    );
  }
}

// 🔄 Función para manejar email de bienvenida (planes pagados)
async function handleWelcomeEmail(data: any) {
  console.log("🔄 Procesando welcome email...");
  
  const { 
    name = "",
    email = "",
    plan = "",
    calendlyUrl = "https://botz.zohobookings.ca/#/botz"
  } = data;

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email es obligatorio" },
      { status: 400 }
    );
  }

  // Verificar credenciales de Zoho
  const zohoUser = process.env.ZOHO_USER;
  const zohoPass = process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD;
  
  if (!zohoUser || !zohoPass) {
    console.error("❌ Credenciales Zoho faltantes");
    return NextResponse.json(
      { success: false, error: "Configuración de email no encontrada" },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_HOST || "smtp.zoho.com",
    port: Number(process.env.ZOHO_PORT || 465),
    secure: true,
    auth: {
      user: zohoUser,
      pass: zohoPass,
    },
  });

  try {
    // Email de bienvenida al cliente
    await transporter.sendMail({
      from: `Botz <${zohoUser}>`,
      to: email,
      subject: `🚀 ¡Bienvenido/a a Botz! Tu Plan ${plan} está activo`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#22d3ee,#3b82f6);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:28px;color:#fff;">¡Bienvenido/a${name ? ` ${name}` : ''}! 🎉</h1>
            <p style="margin:10px 0 0 0;font-size:16px;opacity:0.9;">
              Tu Plan <strong>${plan}</strong> está ahora activo
            </p>
          </div>
          
          <div style="padding:30px;">
            <p style="color:#cbd5e1;font-size:16px;">
              ¡Gracias por confiar en Botz para automatizar tu inmobiliaria! 
              Estamos emocionados de que formes parte de nuestra comunidad.
            </p>
            
            <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:8px;margin:25px 0;border-left:4px solid #22d3ee;">
              <h3 style="margin-top:0;color:#22d3ee;">📋 Resumen de tu suscripción</h3>
              <p style="color:#cbd5e1;margin:10px 0;"><strong>Plan:</strong> ${plan}</p>
              <p style="color:#cbd5e1;margin:10px 0;"><strong>Estado:</strong> <span style="color:#22c55e;">✅ Activo</span></p>
              <p style="color:#cbd5e1;margin:10px 0;"><strong>Fecha de activación:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            
            <div style="background:rgba(30,41,59,0.8);padding:20px;border-radius:8px;margin:25px 0;">
              <h3 style="margin-top:0;color:#22d3ee;">🚀 Siguientes pasos</h3>
              <ol style="color:#cbd5e1;padding-left:20px;">
                <li style="margin-bottom:10px;">Agenda una sesión de configuración con nuestro equipo técnico</li>
                <li style="margin-bottom:10px;">Conectaremos tu WhatsApp Business y CRM</li>
                <li style="margin-bottom:10px;">Configuraremos los flujos automáticos según tus necesidades</li>
                <li>¡Empezarás a recibir leads automáticamente!</li>
              </ol>
            </div>
            
            <div style="text-align:center;margin:30px 0;">
              <a href="${calendlyUrl}" 
                style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:white;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;">
                📅 Agendar sesión de configuración
              </a>
              <p style="color:#94a3b8;font-size:14px;margin-top:10px;">
                Recomendado: 30 minutos para configurar todo
              </p>
            </div>
            
            <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;margin-top:30px;">
              <p style="color:#94a3b8;font-size:14px;margin:0;">
                <strong>¿Necesitas ayuda?</strong> Responde a este correo o escríbenos a info@botz.fyi
              </p>
              <p style="color:#94a3b8;font-size:12px;margin-top:10px;">
                Tu satisfacción es nuestra prioridad. ¡Estamos aquí para ayudarte!
              </p>
            </div>
          </div>
          
          <div style="background:rgba(15,23,42,0.9);padding:20px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Botz · Automatización Inteligente para Inmobiliarias<br>
              📍 Colombia · ✉️ info@botz.fyi · 🌐 botz.fyi
            </p>
          </div>
        </div>
      `,
    });

    console.log("✅ Email de bienvenida enviado");

    return NextResponse.json({ 
      success: true, 
      message: "Email de bienvenida enviado correctamente"
    });

  } catch (emailError: any) {
    console.error("❌ Error enviando email de bienvenida:", emailError);
    return NextResponse.json(
      { 
        success: false, 
        error: "No se pudo enviar el email de bienvenida",
        details: emailError.message
      },
      { status: 500 }
    );
  }
}

// 🔄 Función para manejar demos de HotLead (flujo original)
async function handleHotLeadDemo(data: any) {
  console.log("🔄 Procesando HotLead demo...");
  
  const { 
    nombre = data.name || "", 
    empresa = data.company || "", 
    telefono = data.phone || "", 
    interes = data.interes || data.interest || "",
    email = data.email || "",
    user_id 
  } = data;

  if (!nombre || !email) {
    return NextResponse.json(
      { success: false, error: "Nombre y email son obligatorios" },
      { status: 400 }
    );
  }

  // Crear cliente de Supabase
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Supabase env vars missing");
    return NextResponse.json(
      { success: false, error: "Supabase configuration is missing" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const leadId = user_id || randomUUID();

  // Verificar credenciales de Zoho
  const zohoUser = process.env.ZOHO_USER;
  const zohoPass = process.env.ZOHO_PASS || process.env.ZOHO_APP_PASSWORD;
  
  if (!zohoUser || !zohoPass) {
    console.error("Zoho credentials missing for main flow");
    return NextResponse.json(
      { success: false, error: "Email configuration is missing" },
      { status: 500 }
    );
  }

  // Configurar transporter
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_HOST || "smtp.zoho.com",
    port: Number(process.env.ZOHO_PORT || 465),
    secure: true,
    auth: {
      user: zohoUser,
      pass: zohoPass,
    },
  });

  // 1️⃣ Correo para el equipo de Botz (notificación interna)
  await transporter.sendMail({
    from: `"Notificaciones Botz" <${zohoUser}>`,
    to: "juanfalla1@gmail.com",
    subject: `🚀 Nuevo lead demo HotLead: ${nombre}${empresa ? ` - ${empresa}` : ''}`,
    html: `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b1120;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
            <tr>
              <td style="padding:24px 32px 16px 32px;background:linear-gradient(135deg,#0ea5e9,#22c55e);">
                <h1 style="margin:0;color:#0b1120;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;">
                  🚀 Nuevo lead para demo de HotLead
                </h1>
                <p style="margin:4px 0 0 0;color:#0b1120;font-size:14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Alguien acaba de solicitar la demo desde la web botz.fyi
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">
                <h2 style="margin-top:0;font-size:18px;color:#f9fafb;">📌 Datos del lead</h2>
                <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;width:120px;color:#9ca3af;">Nombre:</td>
                    <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${nombre}</td>
                  </tr>
                  ${empresa ? `<tr>
                    <td style="padding:8px 0;color:#9ca3af;">Empresa:</td>
                    <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${empresa}</td>
                  </tr>` : ''}
                  ${telefono ? `<tr>
                    <td style="padding:8px 0;color:#9ca3af;">Teléfono:</td>
                    <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${telefono}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:8px 0;color:#9ca3af;">Email:</td>
                    <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${email}</td>
                  </tr>
                  ${interes ? `<tr>
                    <td style="padding:8px 0;color:#9ca3af;">Interés:</td>
                    <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${interes}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:8px 0;color:#9ca3af;">Lead ID:</td>
                    <td style="padding:8px 0;color:#e5e7eb;font-weight:500;">${leadId}</td>
                  </tr>
                </table>

                <div style="margin-top:24px;padding:16px;border-radius:12px;background:rgba(15,23,42,0.9);border:1px solid #1e293b;">
                  <p style="margin:0 0 8px 0;color:#e5e7eb;font-size:14px;">
                    ✔ Este lead ya quedó guardado en Supabase en la tabla <b>"Demo Tracker Botz"</b>.
                  </p>
                  <p style="margin:0;color:#9ca3af;font-size:12px;">
                    Puedes ver el detalle en el dashboard de HotLead y en el n8n de la campaña.
                  </p>
                </div>

                <p style="margin-top:24px;color:#6b7280;font-size:12px;">
                  Recuerda actualizar el estado del lead después de la llamada o demo agendada.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px;border-top:1px solid #1e293b;background:#020617;color:#6b7280;font-size:12px;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Botz · Automatización y Flujos Cognitivos · www.botz.fyi
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    `,
  });

  // 🔑 Link a la página de demo
  const demoLink = `https://www.botz.fyi/demo?lead=${leadId}`;

  // 2️⃣ Correo automático para el cliente
  await transporter.sendMail({
    from: `"Equipo Botz" <${zohoUser}>`,
    to: email,
    subject: "🚀 Gracias por solicitar la demo de HotLead - Botz",
    html: `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
            <!-- Header -->
            <tr>
              <td style="padding:24px 32px;background:linear-gradient(135deg,#0ea5e9,#22c55e);">
                <h1 style="margin:0;color:#0b1120;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;">
                  ¡Hola, ${nombre}! 👋
                </h1>
                <p style="margin:4px 0 0 0;color:#0b1120;font-size:14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  Gracias por confiar en Botz para automatizar tus procesos de captación de leads.
                </p>
              </td>
            </tr>

            <!-- Contenido principal -->
            <tr>
              <td style="padding:24px 32px;color:#e5e7eb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">
                <p style="margin-top:0;">
                  Hemos recibido tu solicitud para la demo de <b>HotLead</b>, nuestra solución para
                  automatizar la captación, clasificación y seguimiento de leads en tiempo real.
                </p>

                <div style="margin:16px 0;padding:16px;border-radius:12px;background:rgba(15,23,42,0.9);border:1px solid #1e293b;">
                  <p style="margin:0 0 8px 0;color:#e5e7eb;">
                    En las próximas horas uno de los consultores de Botz se pondrá en contacto contigo para:
                  </p>
                  <ul style="margin:8px 0 0 16px;padding:0;color:#e5e7eb;">
                    ${empresa ? `<li>Entender mejor el proceso comercial de <b>${empresa}</b>.</li>` : ''}
                    <li>Mostrarte en vivo cómo HotLead gestiona los leads automáticamente.</li>
                    <li>Definir los siguientes pasos si deseas implementar la solución.</li>
                  </ul>
                </div>

                <p style="margin-top:16px;">
                  Mientras tanto, puedes ir revisando un resumen de cómo funciona nuestra demo:
                </p>

                <div style="text-align:center;margin:24px 0;">
                  <a href="${demoLink}" 
                    style="display:inline-block;padding:12px 24px;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#22c55e);color:#0b1120;font-weight:600;text-decoration:none;font-size:14px;">
                    Ver demo de HotLead
                  </a>
                </div>

                <p style="margin-top:16px;color:#9ca3af;font-size:13px;">
                  Si este correo no fue solicitado por ti, puedes ignorarlo o responder indicando que quieres
                  que eliminemos tus datos de nuestra base.
                </p>

                <p style="margin-top:24px;">
                  Un saludo,<br/>
                  <b>Equipo Botz</b><br/>
                  <span style="color:#9ca3af;">Automatización y flujos cognitivos para tu negocio.</span>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #1e293b;background:#020617;color:#6b7280;font-size:12px;text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                Botz · Automatización y Flujos Cognitivos · www.botz.fyi
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    `,
  });

  // 3️⃣ Guardar lead en Supabase
  const { error: dbError } = await supabase.from("Demo Tracker Botz").insert([
    {
      id: leadId,
      nombre,
      empresa: empresa || "",
      telefono: telefono || "",
      email,
      interes: interes || "",
      created_at: new Date().toISOString(),
      origen: "Formulario Web Botz",
    },
  ]);

  if (dbError) {
    console.error("❌ Error guardando lead en Supabase:", dbError);
    return NextResponse.json(
      { success: false, error: "Error guardando el lead en la base de datos" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Correos enviados y lead guardado correctamente 🚀",
  });
}

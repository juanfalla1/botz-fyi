-- SQL PARA VERIFICAR RESULTADOS DE LA CAMPAÑA
-- ===============================================

-- 1. Ver prospectos capturados hoy
SELECT 
    COUNT(*) as total_prospectos,
    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as con_email,
    COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_enviados,
    MIN(created_at) as primera_captura,
    MAX(created_at) as ultima_captura
FROM prospectos_botz 
WHERE DATE(created_at) = CURRENT_DATE;

-- 2. Ver emails por estado
SELECT 
    email_status,
    COUNT(*) as cantidad,
    COUNT(DISTINCT email) as emails_unicos
FROM prospectos_botz 
WHERE email IS NOT NULL AND email != ''
GROUP BY email_status 
ORDER BY cantidad DESC;

-- 3. Ver prospectos por fuente
SELECT 
    email_source,
    COUNT(*) as cantidad,
    COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_enviados
FROM prospectos_botz 
WHERE email IS NOT NULL AND email != ''
GROUP BY email_source 
ORDER BY cantidad DESC;

-- 4. Ver últimos prospectos capturados
SELECT 
    nombre,
    email,
    email_status,
    email_source,
    web,
    rating,
    created_at,
    email_sent_at
FROM prospectos_botz 
WHERE email IS NOT NULL AND email != ''
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Ver tasa de conversión
SELECT 
    CASE 
        WHEN email_sent = true THEN 'Emails enviados'
        WHEN email IS NOT NULL AND email != '' THEN 'Emails encontrados'
        ELSE 'Sin email'
    END as categoria,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM prospectos_botz), 2) as porcentaje
FROM prospectos_botz 
GROUP BY categoria 
ORDER BY porcentaje DESC;
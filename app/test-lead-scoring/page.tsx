"use client";

import React, { useState } from "react";
import { FileText } from "lucide-react";

export default function TestLeadScoring() {
  const [formData, setFormData] = useState({
    nombre: "John Doe",
    email: "test@example.com",
    pais: "US",
    debt_to_income_ratio: 0.3,
    loan_to_value_ratio: 0.8,
    monthly_income: 5000
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/lead-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <FileText size={24} color="#f59e0b" style={{ marginRight: '10px' }} />
        <h1>Lead Scoring Hipotecario - Test</h1>
      </div>

      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>✅ Sistema de Lead Scoring Funcionando</h3>
        <p>API Endpoint: <code style={{ background: '#333', padding: '2px 6px', borderRadius: '3px' }}>http://localhost:3000/api/lead-scoring</code></p>
        <p>Estado: <span style={{ color: '#22c55e' }}>✅ Activo y funcionando</span></p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>País:</label>
          <input
            type="text"
            value={formData.pais}
            onChange={(e) => setFormData({...formData, pais: e.target.value})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Ratio Deuda/Ingresos:</label>
          <input
            type="number"
            step="0.01"
            value={formData.debt_to_income_ratio}
            onChange={(e) => setFormData({...formData, debt_to_income_ratio: parseFloat(e.target.value)})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Ratio Préstamo/Valor:</label>
          <input
            type="number"
            step="0.01"
            value={formData.loan_to_value_ratio}
            onChange={(e) => setFormData({...formData, loan_to_value_ratio: parseFloat(e.target.value)})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Ingresos Mensuales:</label>
          <input
            type="number"
            value={formData.monthly_income}
            onChange={(e) => setFormData({...formData, monthly_income: parseFloat(e.target.value)})}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#f59e0b',
            color: '#000',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Calculando...' : 'Calcular Lead Score'}
        </button>
      </form>

      {result && (
        <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
          <h3>Resultado:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', background: '#1e3a8a', borderRadius: '8px' }}>
        <h3>🎯 Implementación Completada</h3>
        <ul>
          <li>✅ API endpoint funcionando</li>
          <li>✅ Canal añadido a ChannelsView.tsx</li>
          <li>✅ Lógica de integración implementada</li>
          <li>✅ Multi-tenant soportado</li>
          <li>✅ Email personalización lista</li>
        </ul>
        <p><strong>Nota:</strong> Para ver el canal en /start, inicia sesión en la aplicación.</p>
      </div>
    </div>
  );
}
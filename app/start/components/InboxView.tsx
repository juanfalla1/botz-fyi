"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from "./supabaseClient"; // Usando el mismo cliente que tu ChannelsView
import { Mail, Search, RefreshCw, User, Calendar, MessageSquare, ChevronRight } from 'lucide-react';

interface EmailMessage {
  id: string;
  sender_email: string; 
  subject: string;
  body_content: string; 
  received_at: string;
  is_read: boolean;
}

export const InboxView = () => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      // Consultamos tu tabla email_messages
      const { data, error } = await supabase
        .from('email_messages') 
        .select('*')
        .order('received_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmails(); }, []);

  return (
    <div style={{ display: 'flex', height: '80vh', background: '#0f172a', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      
      {/* LISTA DE MENSAJES */}
      <div style={{ width: '35%', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} color="#3b82f6" /> Bandeja de Entrada
          </h3>
          <button onClick={fetchEmails} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', color: '#64748b', textAlign: 'center' }}>Cargando...</div>
          ) : emails.length === 0 ? (
            <div style={{ padding: '40px 20px', color: '#64748b', textAlign: 'center' }}>No hay correos registrados.</div>
          ) : (
            emails.map((email) => (
              <div 
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                style={{ 
                  padding: '16px', 
                  borderBottom: '1px solid rgba(255,255,255,0.05)', 
                  cursor: 'pointer',
                  backgroundColor: selectedEmail?.id === email.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{email.sender_email}</span>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>{new Date(email.received_at).toLocaleDateString()}</span>
                </div>
                <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{email.subject}</div>
                <div style={{ color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email.body_content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DETALLE DEL MENSAJE */}
      <div style={{ width: '65%', display: 'flex', flexDirection: 'column', background: '#131c31' }}>
        {selectedEmail ? (
          <div style={{ padding: '30px', overflowY: 'auto' }}>
            <h2 style={{ color: 'white', marginTop: 0 }}>{selectedEmail.subject}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
                 <div style={{ margin: 'auto' }}>{selectedEmail.sender_email[0].toUpperCase()}</div>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 500 }}>{selectedEmail.sender_email}</div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Recibido el {new Date(selectedEmail.received_at).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {selectedEmail.body_content}
            </div>
          </div>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
            <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <p>Selecciona un mensaje para leer el contenido</p>
          </div>
        )}
      </div>
    </div>
  );
};
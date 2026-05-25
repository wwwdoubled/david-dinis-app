'use client';

import React from 'react';
import CampaignPlatform from './CampaignPlatform';

// v3.20.20: ErrorBoundary global — se algo crashar, o user vê fallback
// com botão de reload em vez da app inteira morrer.
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    // Sentry/log futuro aqui
    if (typeof console !== 'undefined') console.error('[AppErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 20, fontFamily: "'Geist', sans-serif",
          background: '#fdfbf7',
        }}>
          <div style={{
            maxWidth: 500, textAlign: 'center', padding: 40,
            background: '#fff', border: '1px solid #e5e3df', borderRadius: 12,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>Algo correu mal</h2>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 20 }}>
              A aplicação encontrou um erro inesperado. Recarrega a página para tentar novamente.
              Se o problema persistir, contacta o administrador.
            </p>
            <details style={{ fontSize: 11, color: '#999', textAlign: 'left', marginBottom: 20 }}>
              <summary style={{ cursor: 'pointer' }}>Detalhes técnicos</summary>
              <pre style={{
                marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace',
              }}>{String(this.state.error?.message || this.state.error)}</pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', background: '#1f1d1a', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Page() {
  return (
    <AppErrorBoundary>
      <CampaignPlatform />
    </AppErrorBoundary>
  );
}

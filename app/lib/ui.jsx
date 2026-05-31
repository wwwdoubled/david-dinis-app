// ─────────────────────────────────────────────────────────────────────────
// app/lib/ui.jsx — componentes de UI partilhados (v3.23.7)
// Extraídos de CampaignPlatform.jsx para permitir que vistas em ficheiros
// próprios os importem (sem dependência circular com o monolito).
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { T } from './theme';

export function Header({ eyebrow, title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
      <div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.15em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 12 }}>
          {eyebrow}
        </div>
        <h1 className="display" style={{ fontSize: 48, lineHeight: 1.02, margin: 0, letterSpacing: '-0.025em' }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 16, color: T.inkSoft, marginTop: 14, maxWidth: 620 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: T.inkMute, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

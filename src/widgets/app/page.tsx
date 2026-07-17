'use client';

import React from 'react';

export default function Home() {
  const widgets = [
    {
      name: 'Audit Feed',
      route: '/audit-feed',
      description: 'Shows a chronological feed of factual audits, indicating PASS/BLOCK status, trust scores, and mismatch lists.',
      icon: '📋',
      color: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    },
    {
      name: 'Trust Dashboard',
      route: '/trust-dashboard',
      description: 'Presents aggregated statistics, a radial trust score gauge, pass/block rates, and a historic SVG trend graph.',
      icon: '📊',
      color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, #1e1b4b, #0f172a 80%)',
      color: '#f8fafc',
      padding: '40px 24px',
      fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Headings */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px',
        maxWidth: '600px',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#f43f5e',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            background: '#f43f5e',
            borderRadius: '50%',
            boxShadow: '0 0 8px #f43f5e',
          }}></span>
          NitroStack Live
        </div>
        <h1 style={{
          fontSize: '42px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 12px 0',
          letterSpacing: '-0.02em',
        }}>
          Verifai Widgets
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          lineHeight: 1.6,
          margin: 0,
        }}>
          Welcome! NitroStack hosts your custom React widgets on the ports below. Select any widget route below to view details or load mock data.
        </p>
      </div>

      {/* Grid of widgets */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '1000px',
        marginBottom: '64px',
      }}>
        {widgets.map((widget, i) => (
          <a
            key={i}
            href={widget.route}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '28px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Color Accent bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: widget.color,
            }}></div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <span style={{
                fontSize: '36px',
              }}>{widget.icon}</span>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '4px 10px',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontFamily: 'monospace',
              }}>{widget.route}</span>
            </div>

            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              margin: '0 0 10px 0',
              color: '#ffffff',
            }}>{widget.name}</h3>

            <p style={{
              fontSize: '14px',
              color: '#94a3b8',
              lineHeight: 1.5,
              margin: 0,
            }}>{widget.description}</p>
          </a>
        ))}
      </div>

      {/* Footer info */}
      <div style={{
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748b',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '24px',
        width: '100%',
        maxWidth: '600px',
      }}>
        ✨ Built with <strong style={{ color: '#94a3b8' }}>NitroStack core</strong> & Next.js. Load tools in NitroStudio or ChatGPT to display live data.
      </div>
    </div>
  );
}

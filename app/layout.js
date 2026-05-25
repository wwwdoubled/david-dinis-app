export const metadata = {
  title: 'David Dinis · Gestão de Campanhas',
  description: 'Gestão de campanhas, stock e análise de vendas FNAC.',
  manifest: '/manifest.json',
  themeColor: '#5B9BD5',
  other: {
    'google-adsense-account': 'ca-pub-5956667787728172',
    // v3.20.22: meta-tag actual (apple-mobile-web-app-capable está deprecated)
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes', // ainda suportado por Safari iOS
    'apple-mobile-web-app-title': 'Campanhas',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5B9BD5" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

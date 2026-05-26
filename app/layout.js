export const metadata = {
  title: 'David Dinis · Gestão de Campanhas',
  description: 'Gestão de campanhas, stock e análise de vendas FNAC.',
  manifest: '/manifest.json',
  themeColor: '#5B9BD5',
  other: {
    'google-adsense-account': 'ca-pub-5956667787728172',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        {/* v3.20.23: meta-tags directos no head — Next.js metadata API
            às vezes não emite tags em 'other'. Garantir saída literal. */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5B9BD5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Campanhas" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  // v3.20.23: força update do SW para apanhar manifest novo
                  navigator.serviceWorker.register('/sw.js').then(reg => {
                    if (reg && reg.update) reg.update();
                  }).catch(() => {});
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

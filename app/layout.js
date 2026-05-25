export const metadata = {
  title: 'David Dinis · Gestão de Campanhas',
  description: 'Gestão de campanhas, stock e análise de vendas FNAC.',
  manifest: '/manifest.json',
  themeColor: '#5B9BD5',
  appleWebApp: {
    capable: true,
    title: 'Campanhas',
    statusBarStyle: 'default',
  },
  other: {
    'google-adsense-account': 'ca-pub-5956667787728172',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5B9BD5" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
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

export const metadata = {
  title: 'David Dinis · Campaign Studio',
  description: 'Gestão de campanhas, stock e materiais',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

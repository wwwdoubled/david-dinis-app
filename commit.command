#!/bin/bash
cd "$(dirname "$0")" || exit 1

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder}"

rm -f verificar-e-publicar.command

if ! command -v npm >/dev/null 2>&1; then
  echo "npm nao encontrado."; echo "Podes fechar esta janela."; exit 1
fi

if [ ! -d node_modules ]; then
  echo "-> A instalar dependencias (demora)..."
  npm ci >/tmp/dd-install.log 2>&1 || { echo "FALHOU npm ci. Ver /tmp/dd-install.log"; exit 1; }
fi

echo "-> Testes..."
if npm test >/tmp/dd-test.log 2>&1; then
  grep -E "Tests|Test Files" /tmp/dd-test.log | tail -2
  echo "OK testes"
else
  echo "TESTES FALHARAM - nada publicado."
  tail -25 /tmp/dd-test.log
  echo; echo "Podes fechar esta janela."; exit 1
fi

echo
echo "-> Build..."
if npm run build >/tmp/dd-build.log 2>&1; then
  grep -E "^(Route|├|└|┌)" /tmp/dd-build.log | head -5
  echo "OK build"
else
  echo "BUILD FALHOU - nada publicado."
  grep -iE "error|failed|not defined" /tmp/dd-build.log | head -15
  echo; echo "Podes fechar esta janela."; exit 1
fi

echo
echo "-> A publicar..."
git add -A
git commit -q -m "feat(etiquetas): leitor de barcodes partilhado com o Inventario

Extrai o motor de leitura do InventoryView para o hook reutilizavel
app/lib/useBarcodeScanner.js (BarcodeDetector nativo + fallback ZXing,
debounce/lockout e libertacao da camara no iOS) e usa-o no modo
Catalogo das etiquetas: ler o codigo de barras do artigo cria a
etiqueta. O InventoryView fica na implementacao antiga por agora." 2>/dev/null

git push origin main && echo "PUBLICADO" || echo "PUSH FALHOU"
echo
echo "Podes fechar esta janela."

#!/bin/bash
cd "$(dirname "$0")" || exit 1

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder}"

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
git commit -q -m "chore(v3.25.0): versao, data e hora no changelog da app

APP_VERSION 3.24.1 -> 3.25.0 e APP_BUILD_DATE actualizado. Entradas
novas no APP_CHANGELOG para o modulo de Etiquetas de Seguros (3.25.0) e
para o fix do Inventario/Notas (3.24.2), ambas com data e hora. O render
do changelog passa a mostrar a hora quando a entrada a regista." 2>/dev/null

git push origin main && echo "PUBLICADO" || echo "PUSH FALHOU"
echo
echo "Podes fechar esta janela."

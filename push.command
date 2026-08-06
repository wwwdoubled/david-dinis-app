#!/bin/bash
cd "$(dirname "$0")" || exit 1
git log --oneline origin/main..main
git push origin main && echo "✅ Publicado." || echo "❌ Falhou."
echo "Podes fechar esta janela."

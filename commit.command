#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

git add -A
git commit -q -m "fix(v3.25.1): EAN e scanner sempre visiveis nas etiquetas

O campo do EAN e o botao de ler codigo de barras estavam dentro do
bloco condicionado a catalogoApp.length > 0, por isso so apareciam
com dados de vendas em memoria - e nunca na pagina /etiquetas. Saem
da condicao. Sem catalogo a etiqueta sai com as designacoes da
familia e precos por preencher, com aviso laranja. EAN desconhecido
deixa de ser erro. Modo por defeito passa a Catalogo." 2>/dev/null

git push origin main && echo "PUBLICADO - o CI do GitHub corre testes+build" || echo "PUSH FALHOU"
echo
echo "Podes fechar esta janela."

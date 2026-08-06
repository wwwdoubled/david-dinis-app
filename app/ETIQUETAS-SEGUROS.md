# Etiquetas de seguros

Módulo de geração e impressão de etiquetas de seguros (A4, 2/4/6 por folha).
Acessível pelo menu lateral (**Etiquetas Seguros**, PTS) ou em `/etiquetas`.

**Não precisa de nenhuma chave de API.** Corre inteiramente no browser.

## Ficheiros

```
app/EtiquetasSeguros.jsx      componente principal (CSS incluído)
app/lib/etiquetasParser.js    parser local — funções puras, testadas
app/etiquetas/page.js         página autónoma em /etiquetas
tests/etiquetasParser.test.js 18 testes ao parser
```

## Os quatro modos de entrada

| Modo | Como funciona | Quando usar |
|---|---|---|
| **Colar texto** | Copias a lista do ecrã Planos Proteção e colas. Um parser por regex extrai designações, preços, franquia e deduz a categoria. Linha em branco separa artigos. | O caminho normal. Rápido e exacto. |
| **Manual** | Escolhes a categoria e a etiqueta nasce com as designações e coberturas habituais; escreves só os preços. | Quando não há acesso ao ecrã, ou para uma etiqueta pontual. |
| **Catálogo** | Usa as linhas de vendas **já carregadas na app** (`stockRowsPO2/PO3`), sem upload nenhum: escreves (ou lês com a pistola) o **EAN** e a etiqueta sai feita: o PVP do artigo determina o **escalão** de cada seguro e a designação determina a família. Se a família não for clara — drones, gaming, mobilidade — pergunta em vez de adivinhar. Se não houver dados em memória, podes importar o ficheiro de vendas à parte. | O caminho mais rápido e mais exacto. |
| **Print (OCR)** | Arrastas o print ou fotografas; o `tesseract.js` (carregado do CDN, só quando usado) faz o reconhecimento no browser e o texto passa pelo mesmo parser. | Último recurso — engana-se nos números. Confere sempre os preços. |

## Regras do parser

Replicam o que antes estava no prompt da IA:

- remove o intervalo de escalão — `(1001-1500)`, `(1449,96-1999,95)`
- normaliza `4ANOS` → `4 ANOS`, `4ANS` → `4 ANOS`, `2 ANO` → `2 ANOS`
- lê a franquia dos selos `Franquia 120€`
- deduz a categoria: `FOTO` → Foto; `INFORM|LAPTOP|NOMAD` → Informática;
  `TELM|SMTP` → Telecom; `TV|VIDEO` → TV; `AUSCUL|SOM` → Som;
  `COZ&LAR` ou `DANOS + EXT GARANT` → Casa
- só aceita designações que comecem por `SEG`, `PP`, `EXT`, `GAR`, `CONFIG` ou `CARTÃO`

## Impressão

O CSS de impressão esconde o resto da aplicação e deixa só as folhas A4.
Na janela de impressão: **A4**, margens **Nenhumas**, gráficos de fundo ligados.
Para guardar o ficheiro, muda a impressora para *Guardar como PDF*.

As etiquetas são sempre claras — não seguem o modo escuro, porque vão para papel.

## Alterar tipologias

As designações, franquias e coberturas por categoria estão no objeto
`CATEGORIAS`, no topo do `EtiquetasSeguros.jsx`. Acrescentar uma categoria é
copiar um bloco e mudar as linhas — o botão aparece sozinho no interface.

Se acrescentares categorias, junta as palavras-chave a `deduzCategoria()` em
`app/lib/etiquetasParser.js` para a detecção automática as apanhar, e um teste
em `tests/etiquetasParser.test.js`.

## Persistência (localStorage)

- `dd_coberturas_seguros` — coberturas corrigidas por categoria
- `dd_catalogo_seguros` — catálogo importado do ficheiro de vendas

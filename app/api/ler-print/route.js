// Rota que lê o print no servidor. A chave da API nunca chega ao browser.
export const runtime = 'nodejs';
export const maxDuration = 60;

const INSTRUCOES = `Estás a ler um print do sistema interno da Fnac (separador "Planos Proteção") com a lista de seguros de UM artigo.

Extrai TODAS as linhas de serviço visíveis. Para cada uma:
- "nome": a designação EM MAIÚSCULAS, tal como aparece, mas REMOVE o intervalo de escalão entre parênteses (ex.: "(1001-1500)", "(1449,96-1999,95)", "(0-250)"). Remove parênteses soltos. Normaliza espaços: "4ANOS" -> "4 ANOS", "+3ANOS" -> "+3 ANOS", "2 ANO" -> "2 ANOS", "4ANS" -> "4 ANOS".
- "preco": o valor do selo verde à direita, no formato "163,99 €". Se não houver, "".
Ignora linhas que só tenham o selo "Franquia" sem designação.

Devolve ainda:
- "franquia": o valor dos selos laranja "Franquia XX€", no formato "120 €". Se não aparecer, "".
- "equipamento": o artigo indicado na barra inferior do ecrã, sem códigos nem preço. Se não aparecer, "".
- "categoria": uma de Foto, Informática, Telecom, TV, Som, Casa, Recondicionados, deduzida das designações (FOTO -> Foto; INFORM/INFORMATICA/LAPTOP/NOMAD -> Informática; TELM/SMTP -> Telecom; TV/VIDEO -> TV; SOM/AUSCUL -> Som; COZ&LAR ou DANOS + EXT GARANT -> Casa). Em dúvida, "".

Responde APENAS com JSON válido, sem texto à volta e sem blocos de código:
{"equipamento":"","franquia":"","categoria":"","servicos":[{"nome":"","preco":""}]}`;

export async function POST(req) {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    return Response.json({ erro: 'Falta a variável ANTHROPIC_API_KEY.' }, { status: 500 });
  }

  try {
    const { imagem, media } = await req.json();
    if (!imagem) return Response.json({ erro: 'Não recebi nenhuma imagem.' }, { status: 400 });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media || 'image/jpeg', data: imagem } },
            { type: 'text', text: INSTRUCOES },
          ],
        }],
      }),
    });

    const data = await r.json();
    if (data.error) return Response.json({ erro: data.error.message }, { status: 502 });

    const txt = (data.content || [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .replace(/```json|```/g, '')
      .trim();

    return Response.json(JSON.parse(txt));
  } catch (e) {
    return Response.json({ erro: 'Falha na leitura: ' + e.message }, { status: 502 });
  }
}

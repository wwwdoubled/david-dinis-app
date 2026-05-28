# send-emails · Resend integration

Edge function que consome a fila `email_queue` e envia via [Resend](https://resend.com).

## Setup inicial (one-time)

### 1. Aplicar migration
SQL Editor → cola `supabase/migrations/20260528100000_email_queue.sql` → Run.

### 2. Criar conta Resend
- Regista em **resend.com** (gratuito até 3 000 emails/mês, 100/dia)
- Dashboard → **Domains** → Add domain (ex: `daviddinis.com`)
- Resend mostra 3-4 registos DNS — adiciona no teu provedor de domínio (Cloudflare, GoDaddy, …):
  - 1× `TXT` (SPF): `v=spf1 include:_spf.resend.com ~all`
  - 3× `CNAME` (DKIM): valores que o painel Resend dá
  - 1× `TXT` (DMARC, opcional): `v=DMARC1; p=none;`
- Aguarda 5–30 min até **Verified**

### 3. Gerar API Key
Dashboard Resend → **API Keys** → Create → copia `re_xxxxxxxxxxx`.

### 4. Configurar secrets no Supabase
Supabase Dashboard → **Edge Functions** → Manage secrets:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=relatorios@daviddinis.com
EMAIL_FROM_NAME=David Dinis · FNAC Aveiro
```

> **Sem domínio próprio?** Podes usar `onboarding@resend.dev` (limite 100/dia, só para testes — entrega irregular).

### 5. Deploy da função
Dashboard Supabase → **Edge Functions** → **New function**:
- Nome: `send-emails`
- Cola todo o conteúdo de `index.ts`
- Deploy

### 6. Cron diário
Dashboard Supabase → **Database** → **Cron Jobs** → **New cron**:
- Name: `send-emails-daily`
- Schedule: `0 9 * * *` (9h UTC = 10h Lisboa horário verão)
- Type: **HTTP request**
- Method: POST
- URL: `https://<seu-ref>.supabase.co/functions/v1/send-emails`
- Headers:
  ```
  Authorization: Bearer <SERVICE_ROLE_KEY>
  Content-Type: application/json
  ```
- Body: `{}` (vazio)

> O `SERVICE_ROLE_KEY` está em Dashboard → Settings → API → service_role.
> **NUNCA** coloques esta key no frontend — só nesta config de cron e nos secrets.

## Uso manual

Admin → Emails → **"📤 Enviar pendentes agora"** chama a edge function com o JWT do user. A função verifica que é admin antes de processar.

## Debug

- **Resend Dashboard → Logs**: vê cada email enviado, delivery status, opens/clicks
- **Supabase → Edge Functions → send-emails → Logs**: stdout/stderr
- **email_queue.status = 'error'**: ver `error_message` para o motivo (tipicamente: domínio não verificado, API key inválida, ou rate limit)

## Fluxo

```
queueEmail() em React  →  INSERT email_queue (status='pending')
                                        ↓
              ┌─────────────────────────┴──────────────────────────┐
              ↓                                                      ↓
   Botão "Enviar pendentes"                                Cron 9h diário
   (admin com JWT)                                  (service_role bearer)
              ↓                                                      ↓
              └──────────→  POST /functions/v1/send-emails  ←─────┘
                                        ↓
                              fetch pending (limit 50)
                                        ↓
                                for each → Resend API
                                        ↓
                            UPDATE status = 'sent' | retry | 'error'
```

## Categories actuais

- `campaign_ending` — notificações automáticas de fim de campanha
- `campaign_sales_report` — relatórios manuais de análise de vendas

Resend permite filtrar/segmentar por tag `category` no dashboard.

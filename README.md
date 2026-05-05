# David Dinis — Campaign Studio

Plataforma de gestão de campanhas, stock e materiais.

**Password de acesso**: `Faveiro2026`

---

## 🚀 Como pôr online (sem usar terminal)

Sem programação, sem comandos. Cinco passos no browser, ~15 minutos no total.

### Passo 1 — Criar conta no GitHub (se ainda não tiveres)

1. Vai a **https://github.com**
2. Clica em **"Sign up"** (canto superior direito)
3. Cria a conta com o teu email — escolhe o plano gratuito

### Passo 2 — Criar o repositório

1. No GitHub, clica no `+` no canto superior direito → **"New repository"**
2. **Repository name**: `david-dinis-app`
3. Marca **"Private"** (importante — porque tem dados internos)
4. **Não** marques nada em "Initialize this repository with..."
5. Clica em **"Create repository"**

### Passo 3 — Carregar os ficheiros

Na página do repositório vazio, vais ver um link a dizer **"uploading an existing file"** — clica nesse link.

Em alternativa, podes usar este URL diretamente substituindo o teu username:
`https://github.com/SEU-USERNAME/david-dinis-app/upload/main`

1. **Arrasta a pasta `david-dinis-app` inteira** para a área indicada (ou clica "choose your files" e seleciona tudo dentro da pasta)
   - **Importante**: arrasta o **conteúdo** da pasta, não a pasta em si. Ou seja, dentro do ZIP que recebes, abres a pasta `david-dinis-app/` e arrastas os ficheiros que estão lá dentro (`app/`, `package.json`, `next.config.js`, etc.)
2. No fundo da página, em "Commit changes", deixa o título como está
3. Clica em **"Commit changes"** (botão verde)

Aguarda alguns segundos. A página vai recarregar e vais ver os ficheiros listados.

### Passo 4 — Ligar à Vercel (alojamento gratuito)

1. Vai a **https://vercel.com**
2. Clica em **"Sign Up"** → **"Continue with GitHub"** (vai-te pedir para autorizar)
3. Já dentro da Vercel, clica em **"Add New..."** → **"Project"**
4. Vais ver o teu repositório `david-dinis-app` na lista — clica em **"Import"**
5. Na página seguinte, **não mexas em nada**. Clica diretamente em **"Deploy"**
6. Aguarda 1-2 minutos. Quando terminar, vais ver fogos de artifício 🎉 e um URL tipo:
   `david-dinis-app-xyz.vercel.app`

### Passo 5 — Aceder à aplicação

Clica no URL que a Vercel te deu, ou em **"Visit"**. Vai abrir o ecrã de login. Mete a password `Faveiro2026` e estás dentro.

**Esse URL é permanente** — partilha-o com quem precisar de aceder. Funciona em qualquer browser, em qualquer dispositivo.

---

## 🔄 Como atualizar a aplicação no futuro

Quando quiseres mudar alguma coisa (pedir-me ajustes, etc.):

1. Recebes-me o ficheiro atualizado
2. Vais a `https://github.com/SEU-USERNAME/david-dinis-app`
3. Navegas até `app/CampaignPlatform.jsx`, clicas no ícone do lápis (✏️), apagas tudo e colas o conteúdo novo
4. **Importante**: certifica-te que a primeira linha continua a ser `'use client';`
5. Em baixo, clica em **"Commit changes"**
6. A Vercel deteta a mudança automaticamente e em ~2 minutos o site online está atualizado. Não precisas de fazer mais nada.

---

## 💰 Custos

**Tudo gratuito** se ficares com o URL `.vercel.app`.

Se quiseres um domínio próprio (`davidinis.pt` ou similar):
- Compras o domínio em namecheap.com ou similar (~10-15€/ano)
- Na Vercel: Settings → Domains → adicionas o domínio
- A Vercel diz-te que registos DNS configurar no sítio onde compraste

---

## 🔐 Sobre a password

A password está **dentro do código JavaScript**, não num servidor seguro. Isto:
- ✅ Impede acesso casual (colegas que abram por curiosidade)
- ❌ **Não** protege contra alguém minimamente técnico que abra o DevTools

Para o caso de equipa pequena com dados internos não-sensíveis, é suficiente. Se precisares de proteção a sério (autenticação real, vários utilizadores com diferentes permissões), avisa-me que faço o upgrade para Supabase.

Para mudar a password, edita o ficheiro `app/CampaignPlatform.jsx` no GitHub e procura a linha:
```
const PASSWORD_PLAIN = 'Faveiro2026';
```
Substitui pela password nova. Depois faz commit e a Vercel atualiza sozinha.

---

## ❓ Problemas comuns

**"Build failed" na Vercel**
Vai ao log do build (clica no deployment falhado) e procura a linha vermelha. Quase sempre é um typo no código. Manda-me a mensagem.

**O site abre mas a aplicação não carrega**
Abre o DevTools do browser (F12 → Console). Se houver erros vermelhos, manda-me um screenshot.

**Não me lembro da password**
A password está em `app/CampaignPlatform.jsx`, na linha que começa por `const PASSWORD_PLAIN`.

**Quero remover tudo**
Vercel: Settings → Advanced → Delete Project.
GitHub: Settings (do repo) → fundo da página → Delete this repository.

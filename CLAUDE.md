# Vello ERP — Contexto do Projeto

## O que é este projeto

Mini ERP interno da **VELLO Inteligência Artificial** hospedado em `sistema.velloia.com.br`. Gerencia leads gerados por um agente de IA no WhatsApp (Evolution API + OpenAI + n8n) que insere dados diretamente no Supabase. O ERP **só consome** esses dados — não tem formulário de cadastro manual de leads.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 App Router |
| UI | shadcn/ui + Tailwind CSS v4 |
| Banco de dados | Supabase (PostgreSQL) — projeto `mfrawrvnaaqubhzihujf` |
| Autenticação | Supabase Auth |
| Deploy | Vercel (`app.velloia.com.br`) |
| Ícones | @phosphor-icons/react |
| Fontes | Montserrat (marca) · Outfit (títulos) · Work Sans (corpo) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Gráficos | recharts |
| Datas | date-fns + locale pt-BR |

## Estrutura de pastas

```
src/
├── app/
│   ├── (app)/              ← Layout autenticado com sidebar
│   │   ├── layout.tsx      ← Sidebar + mobile top bar
│   │   ├── page.tsx        ← Dashboard (server component)
│   │   ├── dashboard-client.tsx
│   │   ├── leads/
│   │   ├── kanban/
│   │   └── clientes/
│   ├── login/page.tsx
│   ├── globals.css          ← Design system completo (CSS variables)
│   └── layout.tsx           ← Root layout com fontes + TooltipProvider
├── components/
│   ├── layout/Sidebar.tsx
│   └── shared/
│       ├── VelloLogo.tsx    ← Logo reutilizável (usa /public/logo.png)
│       ├── ClassificacaoBadge.tsx
│       └── StatusBadge.tsx
├── lib/supabase/
│   ├── client.ts            ← createBrowserClient
│   └── server.ts            ← createServerClient
├── types/database.ts        ← Tipos TypeScript das tabelas
└── proxy.ts                 ← Auth middleware (Next.js 16 = proxy.ts)
```

## Design System

Todas as cores ficam em `globals.css` como CSS variables:

```css
--bg-base:     #16171C   /* fundo principal */
--bg-surface:  #1D1F25   /* cards, sidebar */
--bg-elevated: #252830   /* modais, dropdowns */
--cyan:        #41BEEA   /* destaque principal */
--deep:        #2E59A6
--mid:         #3992CC
--grad:        linear-gradient(135deg, #41BEEA 0%, #3992CC 55%, #2E59A6 100%)
--text-1:      #FFFFFF
--text-2:      #A3AECC
--text-3:      #6C7B9E
--border-dim:  rgba(65, 190, 234, 0.15)
```

- Interface **100% dark** — sem light mode
- Tudo em **português brasileiro**
- Logo: `/public/logo.png` → componente `<VelloLogo />`
- Identidade de marca: "VELLO" em Montserrat 700 + subtítulo "INTELIGÊNCIA ARTIFICIAL"

## Banco de dados — tabelas

| Tabela | Descrição |
|---|---|
| `leads` | Leads gerados pelo agente WhatsApp |
| `pipeline` | Histórico de estágios do lead |
| `clientes` | Leads convertidos em clientes |
| `interacoes` | Histórico de contatos por lead |

### Classificação de leads (pontuação pelo agente)

| Pontuação | Classificação | Cor |
|---|---|---|
| 80–110 | Quente | `#EF4444` |
| 50–79 | Morno | `#F59E0B` |
| 20–49 | Frio | `#3B82F6` |
| < 20 | Desqualificado | `#6B7280` |

### Estágios do Kanban

```
Novo → Em Qualificação → Proposta Enviada → Em Negociação → Fechado Ganho | Fechado Perdido
```

## Páginas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação com Supabase Auth |
| `/` | Dashboard — métricas, gráficos recharts, últimos leads |
| `/leads` | Tabela com filtros + painel lateral com detalhes e interações |
| `/kanban` | Quadro drag & drop com os 6 estágios |
| `/clientes` | Tabela de clientes convertidos |

## Convenções

- Server Components buscam dados no Supabase e passam para Client Components (`*-client.tsx`)
- Atualizações otimistas no Kanban: atualiza o estado local antes do `await supabase.update()`
- RLS ativo em todas as tabelas — somente `auth.role() = 'authenticated'` tem acesso
- `proxy.ts` (não `middleware.ts`) — convenção do Next.js 16

## Agente de IA WhatsApp (`agent/`)

Serviço Node.js independente que roda junto ao ERP.

**Fluxo:**
1. Evolution API recebe mensagem → dispara webhook para `POST /webhook`
2. Servidor extrai número + texto, ignora grupos e mídias
3. Carrega histórico da conversa no Supabase (`conversas`)
4. Chama `gpt-4.1-nano` com system prompt + histórico
5. Se o modelo chamar `registrar_lead` → salva na tabela `leads` e finaliza conversa
6. Caso contrário → envia resposta e atualiza histórico

**Tabela `conversas`:** id, whatsapp, historico (JSONB), finalizada, criado_em, atualizado_em

**Rodar em dev:** `cd agent && npm run dev`

**Configurar webhook na Evolution API:** `POST http://seu-servidor:3001/webhook`

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://mfrawrvnaaqubhzihujf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

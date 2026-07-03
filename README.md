# Climoo · Plano de Descarbonização (ferramenta standalone)

Versão **isolada da plataforma** do módulo de Plano de Descarbonização da Climoo.
Roda sozinha, sem o restante da plataforma e sem backend.

Fluxo coberto (mesmas telas da plataforma):

1. **Inventário** — fonte única de atividades (cadastro manual / CSV)
2. **Metas & Período** — SBTi, trajetória de redução
3. **Variáveis de Crescimento** (drivers) — índice base 100
4. **Projeção BAU** — matriz atividade × driver
5. **Projetos** — banco de iniciativas + projetos de descarbonização
6. **Cenários** — combinação de projetos, cascata/linhas/MACC, gap por meta
7. **Banco de Tecnologias** e **Gestão de Iniciativas**

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5174
```

No topo, o administrador seleciona a **empresa (CNPJ)** ou cadastra uma nova.
Cada empresa tem seus dados isolados por CNPJ.

## Autenticação e multi-empresa

O acesso usa **Supabase Auth** (e-mail + senha) com isolamento por empresa
garantido no servidor via RLS:

- **Administrador** (`mac@climoo.com.br`): vê todas as empresas, troca de
  empresa no topo e gerencia tudo no painel **Administração** (menu do avatar →
  rota `/admin`): cadastra empresas (nome + CNPJ) e usuários (nome, e-mail e
  senha), vincula cada usuário a uma empresa, redefine senhas e exclui acessos.
- **Usuário comum**: entra com o e-mail/senha criados pelo admin e cai direto
  na empresa à qual foi vinculado — as políticas RLS do banco impedem qualquer
  acesso aos dados de outras empresas (não é só filtro de interface).

As operações administrativas (criar/alterar/excluir usuários) rodam na função
serverless `/api/admin/users` com a `SUPABASE_SERVICE_ROLE_KEY` (Vercel em
produção; no `npm run dev`, o mesmo handler roda como middleware do Vite). A
API valida o token da sessão e só aceita chamadas de perfil `admin`.

### Configuração (uma vez)

1. Rode `supabase/schema.sql` no SQL Editor do Supabase (idempotente; cria
   `companies`, `profiles`, trigger e as policies RLS, e migra CNPJs já salvos
   para a tabela de empresas).
2. No Supabase, em **Authentication → Users → Add user**, crie
   `mac@climoo.com.br` com a sua senha (marque *Auto Confirm User*) — o perfil
   nasce como admin.
3. Defina `SUPABASE_SERVICE_ROLE_KEY` na Vercel e no seu `.env.local`
   (ver `.env.example`).
4. Entre como admin, cadastre as empresas e os usuários no painel `/admin`.

## Persistência

Três camadas, em ordem de prioridade:

1. **Supabase** (banco de dados) — usado sempre que `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` estiverem definidos. É o que mantém os dados
   persistidos **em produção/Vercel** (e também funciona em dev).
2. **Arquivo no projeto**: `decarbonization-data/<cnpj>.json` — *middleware de
   desenvolvimento* do Vite (ver `vite.config.js`). Fallback quando o Supabase
   não está configurado; só funciona com `npm run dev`.
3. **localStorage** (`climoo-decarbonization-data`), particionado por CNPJ —
   estado vivo das telas; usado quando nenhuma das camadas acima grava.

Os JSONs de exemplo já vêm em `decarbonization-data/` (empresas de demonstração).

## Deploy na Vercel (com Supabase)

1. **Crie um projeto no Supabase** e rode o SQL de `supabase/schema.sql`
   (Dashboard → SQL Editor): tabelas de dados, empresas, perfis e RLS.
2. **Pegue as credenciais** em Project Settings → API: `Project URL`, a
   `anon public` key e a `service_role` key.
3. **Importe o repositório na Vercel** (framework detectado: *Vite*) e defina as
   variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (para a API de administração `/api/admin/users`)
4. (Opcional) **Suba os dados de exemplo** para o banco:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
   ```
5. Deploy. A Vercel roda `npm run build` e publica `dist/` (config em
   `vercel.json`, com rewrite SPA para o React Router).

Para rodar localmente apontando ao Supabase, copie `.env.example` para
`.env.local` e preencha as mesmas variáveis.

## Build

```bash
npm run build    # gera dist/ (estático)
npm run preview
```

> Sem Supabase configurado, build/preview estáticos não persistem: o middleware
> de arquivo não existe e o estado fica só no localStorage. Para gravar em banco,
> configure o Supabase; para gravar em arquivo, use `npm run dev`.

## Como foi extraído da plataforma

- `src/features/decarbonization/` foi copiado **sem alterações** da plataforma.
- Os mesmos *aliases* (`@`, `@components`, `@apis`, `@utils`) e os caminhos que o
  módulo importa foram recriados, então o código-fonte do módulo não precisou de
  edição. As dependências da plataforma recriadas aqui são:
  - `@/shared/components/ui/Card`, `@components/shared/Tables/ActivityTable`,
    `@/store/uiStore`, `@/apis/apiClientV2`, `@/store/globalStore`,
    `@/store/technologyBankStore`, `@/utils/constants`,
    `@/features/emissions/emissions-table/store/emissionsStore` — cópias verbatim.
  - `@/features/auth/shared/store/authStore` — **shim** local: guarda apenas a
    empresa/CNPJ ativos (na plataforma vem do login).

## Limitações conhecidas

- **"Importar das Emissões"** (no Inventário) depende do backend da plataforma e
  não funciona aqui; use cadastro manual / importação por CSV.
- Os serviços do fluxo antigo `settings/*` apontam para endpoints da plataforma
  (`apiClientV2`); são *mock-first* e falham silenciosamente fora dela, sem
  afetar o fluxo principal Inventário → Cenários.

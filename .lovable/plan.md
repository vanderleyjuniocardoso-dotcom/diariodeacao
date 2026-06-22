
## 1. Reorganização das abas do ADM

- Aba **Engajamento** do espaço ADM passa a se chamar **GGL**.
- O bloco "Mensagem do ADM para todos os voluntários" (AdminBroadcastComposer) sai da aba GGL e vai para a aba **Base**, dentro do espaço ADM.

## 2. Base autorizada — novas colunas e importação

Acrescentar na tabela `admin_volunteers`:
- `phone` (telefone)
- `profession` (profissão)
- `ggl_group_id` (vínculo opcional ao GGL)

A importação por planilha (`AdminAuthorizedBase`) passa a aceitar 5 colunas: **Nome, CPF, Credencial, Telefone, Profissão, GGL** (as duas últimas opcionais). O nome do GGL na planilha bate com o nome do grupo cadastrado; se não existir, fica em branco.

## 3. Cadastro de Grupos de Gestão Local (GGL)

Nova tabela `ggl_local_groups` com: nome do grupo, descrição, cor/ícone do bloco.

Tabelas relacionadas:
- `ggl_units` — unidades sob gestão do grupo (nome da unidade).
- `ggl_local_members` — integrantes do GGL (nome, função, whatsapp).
- `ggl_calendar_events` — ações planejadas (data, unidade, título, descrição).
- `ggl_admin_emails` — até 2 e-mails autorizados como sub-admin daquele GGL.

Na aba **GGL** do espaço ADM, o ADM master vê os blocos de cada grupo. Botão "Novo GGL" abre formulário. Clicar num bloco abre tela do grupo com 4 sub-abas:

1. **Informações** — unidades sob gestão + integrantes (nome, função, whatsapp clicável).
2. **Calendário** — eventos por mês do ano (visualização mensal navegável). ADM cadastra/edita ações planejadas.
3. **Voluntários** — lista puxada de `admin_volunteers` com `ggl_group_id = grupo`, mostrando nome, profissão, telefone e credencial. Se o voluntário já se cadastrou no app (`profiles`), usa telefone/profissão de lá; senão, o que está em `admin_volunteers`. Botão para vincular/desvincular voluntários manualmente.
4. **Acesso ADM GGL** — campos para até 2 e-mails autorizados.

## 4. Novo papel "ggl_admin" e cadastro simplificado

- Adicionar valor `ggl_admin` ao enum `app_role`.
- Função `is_ggl_admin_email(email)` que verifica se o e-mail está em `ggl_admin_emails` e retorna o `ggl_group_id`.
- Novo fluxo de signup simplificado em `/cadastro-ggl` com: e-mail, unidade, senha, confirmar senha. Só funciona se o e-mail estiver previamente autorizado pelo ADM. Cria o usuário, grava papel `ggl_admin` e vincula ao `ggl_group_id`.
- No `CpfGate`/`Login`: link "Sou admin de GGL → cadastrar/entrar" para esse fluxo curto.
- `ProtectedRoute` ganha modo `gglAdminOnly`. Após login, se o usuário é `ggl_admin`, ele é redirecionado para `/ggl-admin/:groupId` e **não vê** Dashboard, Voluntagram, Trilha etc. — apenas a tela com os blocos/funcionalidades do GGL dele (mesmas 3 primeiras sub-abas do ADM master, sem a aba de cadastrar e-mails).

## 5. Visibilidade no app do voluntário comum

- Na aba **Impacto** (Dashboard) do voluntário, mostrar de qual GGL ele faz parte (a partir do vínculo em `admin_volunteers` cruzado com o CPF do `profiles`).
- Nova aba/visão **GGL** acessível ao voluntário: mostra o nome do grupo, unidades, integrantes (com whatsapp) e a lista de outros voluntários do mesmo grupo (nome, profissão).
- No espaço ADM master (aba GGL), cada voluntário também já aparece marcado com o GGL dele.

## 6. Segurança (RLS)

- `ggl_local_groups`, `ggl_units`, `ggl_local_members`, `ggl_calendar_events`: SELECT liberado para `authenticated` (qualquer voluntário pode ver seu próprio GGL); INSERT/UPDATE/DELETE só para `admin` ou `ggl_admin` daquele grupo (via função SECURITY DEFINER `is_ggl_admin_of(group_id)`).
- `ggl_admin_emails`: apenas `admin` (master) lê/escreve.
- `admin_volunteers`: continua restrito a admin para escrita; leitura segue como hoje.
- View pública `ggl_volunteers_view` que o voluntário usa para ver os colegas do mesmo grupo (sem expor CPF; mostra nome, profissão, telefone, credencial).

## Detalhes técnicos

- Migration única adicionando: colunas em `admin_volunteers`, enum `ggl_admin`, novas tabelas com GRANTs + RLS, funções `is_ggl_admin_of`, `is_ggl_admin_email`, `register_ggl_admin`.
- Componentes novos: `AdminGglLocalManager.tsx` (lista/CRUD de GGLs), `AdminGglLocalDetail.tsx` (sub-abas), `GglCalendar.tsx`, `GglAdminSignup.tsx`, `GglAdminHome.tsx`, e atualização de `AdminAuthorizedBase.tsx` para as novas colunas e `Volunteers`/`Dashboard` para mostrar o GGL do voluntário.
- Roteamento: novas rotas `/cadastro-ggl`, `/ggl-admin`, `/ggl-admin/:groupId`; redirecionamento pós-login conforme papel.
- Reaproveitar `AdminBroadcastComposer` na aba Base sem alterações de comportamento.

Posso seguir com a implementação?

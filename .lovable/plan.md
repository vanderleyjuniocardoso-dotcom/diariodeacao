## Visão geral

Adiciona um portão por CPF antes do fluxo de e-mail/senha atual, um formulário de cadastro completo com aprovação manual do ADM, e melhora o painel ADM com importação em massa de voluntários autorizados (Nome / CPF / Credencial).

## Fluxo do usuário

1. **Primeira abertura do app** (rota nova `/cpf-gate`, antes de Login/Signup)
   - Campo único: CPF (sem pontos/traços, validação dígito verificador).
   - **CPF encontrado** em `admin_volunteers` e ainda sem conta → vai para `/signup` com nome pré-preenchido e CPF travado.
   - **CPF encontrado** e já tem conta → vai para `/login` com e-mail pré-preenchido (se disponível) ou só pede e-mail+senha.
   - **CPF não encontrado** → vai para `/cadastro-completo` (formulário longo).
2. **Cadastro completo** → grava em `volunteer_registrations` com status `pending` e mostra tela "Aguarde aprovação do ADM".
3. **ADM aprova** no painel → registro vira linha em `admin_volunteers` (Nome+CPF+Credencial) e os demais campos ficam guardados em `volunteer_registrations` (aprovado) para o ADM consultar/exportar.
4. **Usuário volta**, digita CPF de novo → reconhecido → segue para signup normal.

A tela `/cpf-gate` é o destino padrão de quem não está autenticado. Login/Signup só são alcançáveis vindo dela.

## Painel ADM

- A página `/admin` continua existindo, mas vira a **aba "ADM"** na BottomNav (substitui a página atual no sentido de só ter um ponto de entrada). Aparece **só** para usuários com role `admin`.
- Aba "Voluntários" do painel ganha 3 sub-seções:
  - **Lista atual** (o que já existe: voluntários cadastrados, nível, credencial).
  - **Base autorizada** (`admin_volunteers`): tabela com Nome / CPF / Credencial, busca, editar/excluir linha, e dois botões de importação:
    - **Upload de planilha** (.xlsx ou .csv) — usa `xlsx` (já no projeto) para parsear no browser.
    - **Colar da planilha** — textarea que aceita TSV/CSV colado direto do Excel/Sheets.
    - Ambos mostram preview antes de gravar, deduplicam por CPF, e fazem upsert em lote.
  - **Pendentes de aprovação** (`volunteer_registrations` status=pending): card por solicitante com todos os campos + foto, botões **Aprovar** / **Rejeitar**.

## Mudanças técnicas

### Banco (migration)

- **Tabela `admin_volunteers`**
  - `cpf` text PK (11 dígitos), `full_name` text, `credencial` text nullable, `created_at`, `created_by` uuid.
  - RLS: SELECT para `authenticated` (qualquer logado pode validar CPF próprio via RPC), INSERT/UPDATE/DELETE só admin.
  - Mais seguro: SELECT bloqueado e validação via RPC `public.check_cpf(_cpf text)` SECURITY DEFINER que retorna `{ exists, full_name }` — assim ninguém enumera CPFs.
- **Tabela `volunteer_registrations`**
  - Todos os campos do formulário longo + `status` ('pending'|'approved'|'rejected') + `photo_url` + `created_at` + `reviewed_by`/`reviewed_at`.
  - RLS: INSERT permitido para `anon` (cadastro acontece antes do login), SELECT/UPDATE só admin. O próprio solicitante consulta status via RPC pública por CPF.
- **`profiles`**: adicionar coluna `cpf` text unique nullable, `nome_social`, `cadastro_completo_id` uuid → liga ao registration aprovado.
- **Storage**: novo bucket público `volunteer-photos` (ou usar `avatars`) para a foto de credencial enviada antes do login.

### Edge function

- `approve-registration` (service role): admin chama → cria linha em `admin_volunteers`, marca registration como `approved`. Não cria auth user — o usuário cria a conta normalmente via signup depois.
- `check-cpf` pode ser só uma RPC, não precisa edge function.

### Frontend

- Nova página `src/pages/CpfGate.tsx` — usada como destino raiz para não-autenticados.
- Nova página `src/pages/CadastroCompleto.tsx` — formulário longo com Zod (campos obrigatórios, validações de CPF/RG/data, upload de foto para `volunteer-photos`, checkbox de declaração).
- Nova página `src/pages/AguardandoAprovacao.tsx` — tela final do cadastro pendente.
- `src/pages/Login.tsx` e `src/pages/Signup.tsx`: aceitam state `{ cpf, fullName }` para travar campos.
- `src/pages/Index.tsx` / `ProtectedRoute`: redireciona para `/cpf-gate` quem não tem sessão.
- `BottomNav`: adiciona aba **ADM** condicional ao `isAdmin` do `AuthContext`, depois de "Seu GGL".
- `src/pages/Admin.tsx`: nova aba interna "Base autorizada" com importador (upload + paste) e nova aba "Pendentes".
- Novo componente `AdminBulkImport.tsx` com preview e upsert em lotes de 500.

## Validações importantes

- CPF: 11 dígitos numéricos, validação de dígito verificador.
- RG: só dígitos (texto, sem formato fixo).
- Tamanho máximo de campos com Zod, evitando injection em URLs.
- Foto: max 5MB, jpg/png/webp.
- "Declaro que li" obrigatório (boolean true).
- Mensagens de erro em português, claras.

## Ordem de execução

1. Migration (tabelas + RPC + bucket + grants + RLS).
2. Edge function `approve-registration`.
3. Páginas frontend novas (CpfGate, CadastroCompleto, AguardandoAprovacao).
4. Ajustar Login/Signup/Index/ProtectedRoute/BottomNav.
5. Painel ADM: importador e aba pendentes.

## Notas

- Como o cadastro completo acontece **antes** do login, a tabela `volunteer_registrations` aceita INSERT anônimo — por isso protegemos com rate limiting via Edge Function opcional num passo futuro se virar problema.
- Os e-mails de admin continuam sendo definidos via `user_roles` (role `admin`) como já é hoje — nada muda aí. Para promover novos admins, segue sendo manual no backend.
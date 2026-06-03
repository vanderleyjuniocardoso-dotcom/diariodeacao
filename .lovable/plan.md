# Plano de implementação

Funcionalidade grande dividida em 6 blocos. Vou executar todos em sequência se aprovar.

## 1. Liberar seu acesso ADM
- Inserir na `admin_volunteers` seu CPF `04950942182` com nome e credencial inicial.
- Garantir role `admin` no `user_roles` para o usuário com e-mail `vanderley.oliveira@cejam.org.br` (se ainda não tiver).
- Vincular CPF ao seu `profiles` para o gate passar.

## 2. Exportar voluntários (Aba Voluntários do ADM)
- Botão "Exportar Excel" em `AdminPendingRegistrations` e nova seção "Cadastros aprovados".
- Gera `.xlsx` via `xlsx` (já no projeto) com colunas **na mesma ordem do formulário longo**: Nome completo, Nome social, CPF, RG, Data nasc., Gênero, E-mail, WhatsApp, Estado civil, Município, Bairro, Endereço, Escolaridade, Área de atuação, Profissão, Trabalha CEJAM, Unidade CEJAM, Como conheceu, Foto (URL), Tamanho camiseta, Unidade kit, Aceitou termos, Status, Criado em.

## 3. Reunião de Boas-Vindas

### Banco
- `welcome_meeting_slots(id, month 1-12, slot_date, slot_time, capacity, notes, created_at)` — admin gerencia.
- `welcome_meeting_bookings(id, slot_id, registration_id (ou profile_id), volunteer_name, volunteer_phone, attended bool, checked_at, created_at)`.
- Trigger/coluna em `volunteer_registrations`: `welcome_meeting_booking_id`.

### Fluxo voluntário (logo após enviar cadastro longo)
- Nova página `/boas-vindas/agendar?reg=<id>`: título "Escolha a data da sua reunião de Boas Vindas" + texto explicativo + 12 blocos de meses.
- Clicar no mês → lista de horários disponíveis daquele mês. Selecionar grava booking com nome/whatsapp já do registration.
- Tela final: "Sua reunião de boas vindas será: [data, mês, hora]" + "Sua chegada é motivo de grande alegria para nós."
- Em vez de ir direto para `/aguardando-aprovacao`, vai para essa página primeiro.

### Notificação 08h do dia
- Função agendada (pg_cron + edge function `send-welcome-meeting-reminders`) que roda diariamente 08h e envia push para quem tem booking no dia: "Sua reunião de boas vindas é hoje às HH:MM".

## 4. Aba Gestão (ADM)
Nova aba "Gestão" na página `/admin`. Conteúdo:

### 4.1 Reunião de Boas Vindas
- 12 blocos de mês. Dentro de cada: lista de slots (data + hora + capacidade), botões adicionar/remover.
- Para cada slot, abaixo: "Os voluntários que participarão nesse dia serão:" + lista (nome + whatsapp) com **checkbox** para marcar presença.
- Ao marcar check → roda RPC `confirm_attendance(booking_id)` que:
  - marca `attended=true`
  - calcula turma destino: mês do slot N → turma `T(N+1)26` (jan→T0226, ..., nov→T1226). Dez (12) não tem destino, deixa pendente ou ignora.
  - cria/atribui voluntário ao `magna_class` correspondente.

### 4.2 Capacitação Magna
- 12 blocos de turmas: T0126…T1226.
- Cada bloco lista voluntários (nome + whatsapp) com:
  - Botão **Iniciar Capacitação** (libera a barra de progresso).
  - Slider/barra 0–100% (só editável após iniciar).
  - Salva em `magna_enrollments(id, class_code, registration_id, volunteer_name, volunteer_phone, started bool, progress int, completed_at, created_at)`.

### 4.3 Vídeo de Integração
- Upload de vídeo para bucket `integration-video` (público), guarda URL em `app_settings(key, value)`.
- Substituível a qualquer momento.

## 5. Tela do voluntário (pós cadastro/check)

Nova página `/minha-jornada` (ou dashboard do voluntário pendente) com estados:

1. **Booking feito, sem check**: "Sua reunião de boas vindas será: …"
2. **Recebeu check (attended=true) mas sem `started`**: "Parabéns! Você passou pela primeira etapa, aguarde o contato do ADM para iniciar a capacitação Magna."
3. **`started=true` e progress<100**: "Você começou a Capacitação Magna, veja sua progressão:" + barra espelho (read-only, realtime).
4. **progress=100 e vídeo não assistido**: "PARABÉNS, VOCÊ CONCLUIU A CAPACITAÇÃO MAGNA. VEJA AGORA O VIDEO DE INTEGRAÇÃO DO PROGRAMA." + botão "Iniciar vídeo de integração".
5. **Vídeo terminou**: botão "Pedir autorização para o VOLUNTAGRAM" → cria pendência tipo `voluntagram_access_requests`.
6. **ADM aprovou liberação** (novo card na aba Voluntários): aprovar → executa fluxo atual `approve_registration` que cria `admin_volunteers` com credencial **auto-gerada**.

Realtime via Supabase channels nas tabelas `magna_enrollments` e `welcome_meeting_bookings`.

## 6. Credencial automática
- Função `next_credential()` em SQL: pega a maior credencial existente em `admin_volunteers` no formato `VOLUNT<digits>`, incrementa preservando o nº de dígitos do maior (ex: VOLUNT01→VOLUNT02; VOLUNT1201→VOLUNT1202).
- `approve_registration` passa a chamar `next_credential()` se não houver credencial manual.
- Coluna nova `admin_volunteers.source` (`'manual' | 'auto'`) para identificar quem entrou via fluxo automático. Marcador visual na lista da Base autorizada.

## Resumo técnico de migrações
1. `admin_volunteers`: + coluna `source text default 'manual'`.
2. `welcome_meeting_slots` + RLS (admin CRUD, authenticated read).
3. `welcome_meeting_bookings` + RLS (anon insert se vier de registration; admin tudo; voluntário lê o próprio via RPC).
4. `magna_enrollments` + RLS.
5. `voluntagram_access_requests` + RLS.
6. `app_settings(key text pk, value jsonb)` + RLS (admin write, authenticated read).
7. Funções: `next_credential`, `confirm_attendance`, `start_magna`, `set_magna_progress`, `request_voluntagram_access`, atualização do `approve_registration`.
8. Storage bucket `integration-video` (público).
9. Cron + edge function `send-welcome-meeting-reminders` (08h).

## Notas
- Push notifications já existe estrutura (`push_subscriptions`, `send-push`); reaproveito.
- Vídeo: usa `<video>` HTML simples; detecto `onEnded` para liberar botão.
- Não vou tocar nas abas/animações já existentes.

Confirma para eu prosseguir?

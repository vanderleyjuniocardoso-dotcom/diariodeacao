# Rede Social de Voluntários (estilo Instagram)

Transformar a aba **Voluntários** em uma mini rede social embutida no app, com feed, perfis, curtidas, comentários, mensagens e "terapia motivacional".

## O que será construído

### 1. Feed (tela principal da aba)
- Lista vertical de posts (foto + legenda) dos voluntários, ordenada do mais recente para o mais antigo
- Cada post mostra: avatar, nome, credencial, tempo ("há 2h"), foto (opcional), texto, contador de curtidas e comentários
- Botões: ❤️ curtir, 💬 comentar, ✉️ mandar mensagem direta, 💙 enviar mensagem motivacional
- Botão flutuante **"+"** para criar nova postagem (foto da galeria/câmera + legenda)
- Pull-to-refresh e realtime (novo post aparece automaticamente)

### 2. Criar postagem
- Modal com upload de foto (opcional, bucket `feed-posts`) + textarea
- Validação (texto até 2000 caracteres, imagem até 5MB)

### 3. Curtidas
- Toque no coração curte/descurte instantaneamente (otimista)
- Mostra os 3 últimos nomes que curtiram + contador

### 4. Comentários
- Sheet/modal abre lista de comentários do post
- Campo para adicionar comentário (até 500 caracteres)
- Realtime

### 5. Perfil de voluntário (clique no avatar/nome)
- Página com: foto grande, nome, credencial, nível, horas totais, bio
- Grid dos posts dele (estilo Instagram)
- Botões: "Enviar mensagem" e "Enviar motivação"
- O próprio usuário pode editar a bio no seu perfil

### 6. Mensagens diretas
- Mantém o chat 1-a-1 já existente (`volunteer_messages`)
- Lista de conversas vira sub-aba "Mensagens" no topo do feed

### 7. Mensagens motivacionais ("Terapia")
- Botão dedicado: abre modal com sugestões prontas ("Você é incrível!", "Continue brilhando ✨", etc.) + campo livre
- Marca a mensagem com tipo `motivational` para destacar com visual diferente (gradiente + ícone 💙) no chat
- Pequeno feed extra "Mural de Motivação" no topo (carrossel horizontal das últimas motivações públicas recebidas pelo usuário)

### 8. Notificações
- Push (usa edge function `send-push` existente) quando alguém curte, comenta, manda mensagem ou motivação

## Banco de dados (novas tabelas)

- **`feed_posts`**: `id, user_id, content, image_url, created_at, updated_at`
- **`post_likes`**: `id, post_id, user_id, created_at` (unique post_id+user_id)
- **`post_comments`**: `id, post_id, user_id, content, created_at`
- **`motivational_messages`**: `id, sender_id, recipient_id, content, preset, created_at, read_at`
- **`profiles`**: adicionar coluna `bio text`

Todas com RLS:
- Posts/comentários/curtidas: visíveis para qualquer autenticado, criação/edição/exclusão só pelo dono
- Motivacionais: visíveis para sender e recipient

Realtime habilitado em `feed_posts`, `post_likes`, `post_comments`, `motivational_messages`.

Bucket de storage **`feed-posts`** (público) para imagens.

## Arquivos a criar/alterar

**Novos componentes**
- `src/components/feed/FeedList.tsx`
- `src/components/feed/PostCard.tsx`
- `src/components/feed/CreatePostModal.tsx`
- `src/components/feed/CommentsSheet.tsx`
- `src/components/feed/MotivationalModal.tsx`
- `src/components/feed/MotivationalMural.tsx`

**Novas páginas**
- `src/pages/VolunteerProfile.tsx` (rota `/voluntario/:id`)

**Alterar**
- `src/pages/Volunteers.tsx` → vira o feed (com sub-abas: Feed | Voluntários | Mensagens)
- `src/App.tsx` → adicionar rota do perfil
- `src/integrations/supabase/types.ts` → regenerado automaticamente após migration

## Fluxo
1. Migration (tabelas + RLS + bucket + realtime)
2. Componentes do feed + criar post + curtir/comentar
3. Perfil do voluntário com posts
4. Mensagens motivacionais (modal + mural + destaque no chat)
5. Notificações push nos eventos

Após sua aprovação eu rodo a migration e implemento tudo.

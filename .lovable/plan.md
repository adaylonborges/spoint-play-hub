## Objetivo

Criar sistema de Spoints: usuários ganham pontos ao criar jogo, convidar, realizar (com upload obrigatório de foto), e compartilhar. Saldo e regras visíveis no perfil. Loja "em breve".

## Valores (conservador)

- Criar jogo: **+50** (1x por evento, para o owner)
- Convidar amigo (cada confirmação de novo participante): **+10** ao owner, máx **100** por evento
- Realizar jogo (liberado por participante quando ele sobe a foto): **+100** + bônus foto **+50** = **+150** por participante que postou
- Compartilhar evento (botão "compartilhar resultado" pós-jogo, 1x por usuário/evento): **+20**

## Banco (migration)

### Tabela `spoint_transactions`
- `id uuid pk`, `user_id uuid`, `event_id uuid null`, `kind text` (`create_event`|`invite`|`play`|`photo`|`share`), `amount int`, `created_at`
- UNIQUE parcial por (`user_id`,`event_id`,`kind`) para evitar duplicar (exceto `invite` que pode ter múltiplos — usar `meta` jsonb com `invitee_id`).
- RLS: SELECT próprio; INSERT só via trigger/RPC (server-side).

### Tabela `event_photos`
- `id`, `event_id`, `user_id`, `storage_path text`, `created_at`
- UNIQUE (`event_id`,`user_id`) → 1 foto por participante.
- RLS: SELECT membros do evento; INSERT participante confirmado de si mesmo.

### Storage bucket `event-photos` (público)
- Path: `{event_id}/{user_id}.jpg`
- Policies: leitura pública; upload do próprio user_id em pastas de eventos onde é participante.

### Função/trigger `award_spoints()`
- Trigger AFTER INSERT em:
  - `events` → +50 ao `owner_id` (kind=`create_event`).
  - `event_participants` quando `rsvp_status='confirmed'` e user≠owner → +10 ao owner (kind=`invite`, com cap 100 via check no trigger).
  - `event_photos` → +100 (`play`) + +50 (`photo`) ao `user_id`, somente se `events.confirmed_date < now()`.
- Cada insert em `spoint_transactions` também faz `update profiles set spoints = spoints + amount`.

### Compartilhar
- Função RPC `award_share(event_id)` chamada pelo client ao clicar "Compartilhar" (com idempotência via UNIQUE).

## Frontend

### `src/routes/eventos.$eventId.tsx`
- **Após jogo realizado** (data confirmada passou): bloco "Foto do jogo"
  - Se usuário confirmado e ainda sem foto: botão "Enviar foto do jogo" → upload para storage → insert em `event_photos` → toast "+150 Spoints!"
  - Se já enviou: mostra a foto + chip "+150 ganhos"
  - Galeria horizontal das fotos dos participantes
- Botão "Compartilhar" (WhatsApp prefilled "Joguei BT no..." + link) → chama `award_share` 1x → "+20"
- Banner sutil no topo: "Ganhe +50 Spoints convidando amigos" (some quando cap atingido)

### `src/routes/perfil.tsx`
- Card de saldo destacado: ícone, número grande **`{spoints} Spoints`**, subtítulo "Acumule e troque por recompensas em breve"
- Seção **"Como ganhar Spoints"** (lista com ícones):
  - 🎯 Criar um jogo — +50
  - 👥 Convidar amigos que confirmam — +10 cada (até 100/jogo)
  - 🏐 Realizar o jogo — +100
  - 📸 Postar a foto do dia — +50
  - 🔗 Compartilhar o jogo — +20
- Seção **"Histórico de Spoints"**: últimas 10 transações (data, ação, +amount, evento)
- Botão **"Trocar Spoints"** → tela `/recompensas`

### Nova rota `src/routes/recompensas.tsx`
- Header com saldo
- Card central "Loja em breve 🎁" — "Continue acumulando Spoints. Em breve você troca por descontos e brindes dos nossos parceiros."
- Link voltar ao perfil

### `src/routes/criar.tsx`
- Após criar evento: toast "+50 Spoints por criar o jogo!"

## Arquivos

- `supabase/migrations/...` (nova migration)
- `src/routes/eventos.$eventId.tsx` (bloco foto + share)
- `src/routes/perfil.tsx` (saldo + como ganhar + histórico)
- `src/routes/recompensas.tsx` (novo)
- `src/lib/spoints.ts` (helpers: labels, ícones, RPC share, upload foto)

## Notas

- Auto-confirmação do jogo continua via data passada; pontos de "play" exigem upload da foto (regra do trigger).
- Cap de 100 por evento em `invite` aplicado no trigger.
- Idempotência garantida por UNIQUE em `spoint_transactions`.

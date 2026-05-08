## Objetivo

Transformar o Spoint em uma ferramenta funcional para usuários reais: autenticação real, banco de dados ligado ao usuário logado, convites por link, mapa do local e exportação para agenda. Remover todos os dados fictícios (Rafael seed, RAFAEL_ID, etc).

---

## 1. Autenticação real

- **Login/Cadastro**: email+senha e Google (já configurados). Auto-confirmar email ligado para facilitar testes.
- **Guard de rotas**: criar layout `_authenticated` (TanStack) que redireciona para `/login` se não houver sessão. Proteger: `/`, `/criar`, `/perfil`, `/eventos/$eventId`, `/chat/$eventId`, `/onboarding`, `/convite/$eventId`.
- **Trigger no signup**: criar automaticamente uma linha em `profiles` com `id = auth.users.id` e nome vindo do metadata (form ou Google).
- **Pós-signup**: se `profiles.main_sport` estiver vazio → redireciona para `/onboarding`.
- Remover completamente `RAFAEL_ID` e o seed do Rafael de `src/lib/constants.ts` e de todas as queries.

## 2. Banco de dados — schema real com RLS

Recriar políticas (hoje estão `USING true` — inseguras) e ligar tudo ao `auth.uid()`:

- **profiles**: `id` = auth.users.id (FK ON DELETE CASCADE). RLS: SELECT público (para mostrar nome de outros participantes), UPDATE só do dono, INSERT só do dono.
- **events**: `owner_id` = auth.uid no insert. RLS: SELECT se for owner ou participante; UPDATE/DELETE só owner. Adicionar campos `address`, `latitude`, `longitude`, `invite_code` (slug curto único para link).
- **event_participants**: RLS SELECT se eu sou participante do mesmo evento; INSERT permitido para qualquer autenticado (entrar via link); UPDATE só da própria linha; DELETE da própria linha ou se for owner.
- **event_dates / event_date_votes / event_messages**: RLS baseado em ser participante do evento (via security-definer function `is_event_participant(event_id, user_id)` para evitar recursão).
- Remover tabelas não usadas no MVP: `challenges`, `user_challenges`, `friendships`.

## 3. Mecânica funcional

### Criar evento
- Form pede: título, esporte, **local (com busca de endereço via Nominatim)**, data(s) propostas, custo total opcional.
- Owner é automaticamente inserido em `event_participants` como `confirmed`.
- Gera `invite_code` único (ex: `nanoid(8)`).

### Convidar amigos (apenas link)
- Tela do evento mostra botão "Convidar" → abre sheet com link `https://spoint.app/convite/{invite_code}`, botões "Copiar" e "Compartilhar no WhatsApp" (`wa.me/?text=...`).
- Rota pública `/convite/$code`: se não logado → manda pra `/login?redirect=/convite/$code`. Se logado → mostra prévia do evento + botão "Entrar no evento" que cria linha em `event_participants` (status `confirmed`) e redireciona para `/eventos/$eventId`.

### Página do evento
- Lista real de participantes (foto, nome, status RSVP, pago/pendente).
- RSVP do usuário logado (Vou / Talvez / Não).
- Votação de datas (real, baseada em `event_date_votes`).
- Racha real: divide por confirmados, cada um marca seu próprio "pago".
- Chat real (já existe, ajustar para usar `auth.uid()`).
- **Mapa**: bloco com endereço + mini-mapa Leaflet (OpenStreetMap) centrado em lat/lng. Botão "Abrir no Google Maps" (`https://www.google.com/maps?q=lat,lng`).
- **Adicionar à agenda**: botão "Adicionar ao calendário" → gera e baixa `.ics` (sem dependência externa, função pura).

### Perfil
- Edição real de nome, idade, cidade, esporte principal, nível, frequência, perfil social (atualiza `profiles` do usuário logado).
- "Meus eventos" lista eventos onde o usuário é owner OU participante, separados em **Próximos** (data futura) e **Histórico** (data passada).

### Home
- "Próximos jogos" = eventos onde sou participante com data ≥ hoje.
- "Histórico" = eventos passados.
- Vazio quando não houver eventos (com CTA "Criar primeiro evento").

## 4. Mapa e geocoding (Nominatim + Leaflet)

- Componente `<AddressSearch>` com debounce que chama `https://nominatim.openstreetmap.org/search?format=json&q=...&countrycodes=br` e retorna `{display_name, lat, lon}`. Cabeçalho `User-Agent` setado via server function (Nominatim exige).
- Componente `<EventMap lat lng />` usando `react-leaflet` + `leaflet` (CSS importado global), altura ~180px, marcador no local.
- Salvar `address`, `latitude`, `longitude` no evento.

## 5. Adicionar à agenda (.ics)

- Função `generateIcs(event)` monta string iCalendar (VEVENT com `DTSTART`, `DTEND` (start+2h), `SUMMARY`, `LOCATION` (endereço), `DESCRIPTION` com link do evento, `UID`).
- Botão dispara download via `Blob` + `<a download="evento.ics">`.

## 6. Telas e rotas finais

```
/login               público (email+senha + Google)
/convite/$code       público (preview), exige login para entrar
/_authenticated/
  /                  Home (próximos + histórico do usuário)
  /onboarding        Onboarding (4 etapas, salva no profile)
  /criar             Criar evento (com busca de endereço)
  /eventos/$eventId  Evento (mapa, RSVP, racha, datas, chat preview, convidar, .ics)
  /chat/$eventId     Chat realtime
  /perfil            Perfil + edição + meus eventos
```

## 7. Ordem de implementação

1. Migration: ajustar schema (add `address/lat/lng/invite_code` em events, FK profiles→auth.users, remover challenges), recriar RLS por usuário, criar trigger `handle_new_user`, security-definer `is_event_participant`.
2. Layout `_authenticated` + remover `RAFAEL_ID` em todas as rotas.
3. Refatorar Login/Onboarding para criar/atualizar profile do usuário real.
4. Instalar `leaflet`, `react-leaflet`, `nanoid`. Criar `AddressSearch` e `EventMap`.
5. Refatorar `/criar` com busca de endereço + invite_code.
6. Refatorar `/eventos/$eventId`: mapa, botão convidar, botão .ics, dados reais.
7. Criar `/convite/$code`.
8. Refatorar Home e Perfil para usar `auth.uid()` e separar próximos/histórico.
9. Limpar dados seed do banco.

## Detalhes técnicos

- **Cliente**: queries client-side com `supabase` (browser client) + RLS. Sem `createServerFn` por enquanto (mantém simplicidade do MVP).
- **Realtime do chat**: já configurado, só trocar `RAFAEL_ID` por `(await supabase.auth.getUser()).data.user.id`.
- **Auth state**: hook `useAuth()` que escuta `onAuthStateChange` e expõe `user`, `loading`. Usado pelo guard `_authenticated`.
- **Nominatim policy**: max 1 req/s, sempre incluir User-Agent. Fazemos debounce 500ms no input.
- **Leaflet SSR**: importar dinamicamente no client (`useEffect` ou `<ClientOnly>`) — Leaflet acessa `window`.
- **invite_code**: `nanoid(8)` gerado client-side, validado por unique constraint.

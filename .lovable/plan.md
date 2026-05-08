## Objetivo

Três ajustes focados:
1. Convite redireciona corretamente após cadastro/login (incluindo Google).
2. Home reorganizada com seções claras: convites pendentes, próximos jogos e histórico.
3. Cabeçalho dos eventos com imagem de capa por esporte (gerada por IA).

---

## 1. Fluxo do convite (cadastro + Google)

**Problema atual:** ao clicar em "Entrar para confirmar" no `/convite/$code`, o usuário vai para `/login?redirect=...`. O login com email/senha respeita o `redirect`, mas:
- O fluxo do **Google OAuth** redireciona para `window.location.origin` (raiz), perdendo o `redirect`.
- Após cadastro, se o perfil estiver incompleto, vai para `/onboarding` e o `redirect` é perdido para sempre.

**Correções:**
- Em `login.tsx`, passar o `redirect` para o `redirect_uri` do Google: `${window.location.origin}/login?redirect=${redirect}` para que ao retornar caia novamente em `/login`, detecte sessão e siga para o destino.
- Ao mandar para `/onboarding`, persistir o destino: `nav({ to: "/onboarding", search: { redirect } })`.
- Em `onboarding.tsx`, ler `?redirect=` e, ao terminar, redirecionar para esse destino em vez de `/`.
- Garantir que quando o usuário já logado abre `/convite/$code`, o "Entrar no evento" funcione sem rodar o fluxo de auth (já está OK, mas validar).

## 2. Home reorganizada

Substituir a lista única atual por três seções, em ordem:

1. **Convites pendentes** — eventos onde o usuário é participante com `rsvp_status = 'invited'` (ou onde foi adicionado mas ainda não confirmou). Card destacado com botões rápidos "Vou" / "Não posso".
2. **Próximos jogos** — eventos onde `rsvp_status in ('confirmed','maybe')` OU sou owner, com data futura ou ainda em votação.
3. **Histórico** — eventos passados (data confirmada < hoje).

Observação: hoje, ao entrar via link de convite, o usuário já é inserido como `confirmed`. Para ter "convites pendentes" reais, mudar essa inserção para `rsvp_status = 'invited'` no `/convite/$code`, e a confirmação acontece via botão "Vou" na home ou na página do evento. Owner continua entrando como `confirmed` automaticamente.

Estados vazios para cada seção.

## 3. Imagem de capa por esporte

- Gerar imagens (via `imagegen--generate_image`, qualidade `fast`, 16:9) para cada esporte do `SPORT_EMOJI`: futebol, futsal, vôlei, beach tennis, tênis, padel, basquete, corrida, ciclismo, etc.
- Salvar em `src/assets/sports/<slug>.jpg`.
- Criar `src/lib/sportImages.ts` mapeando `sport → import`.
- Em `eventos.$eventId.tsx`, adicionar header com a imagem (altura ~180px mobile / 280px desktop) e o título sobreposto com gradient para legibilidade.
- Fallback genérico para esportes sem imagem.

---

## Arquivos afetados

- `src/routes/login.tsx` — propagar `redirect` no Google e no caminho de onboarding.
- `src/routes/onboarding.tsx` — ler/usar `redirect` ao concluir.
- `src/routes/convite.$code.tsx` — inserir como `invited` em vez de `confirmed` (owner é exceção, mas owner não chega aqui).
- `src/routes/index.tsx` — três seções (Convites pendentes / Próximos / Histórico) com query incluindo `rsvp_status`.
- `src/routes/eventos.$eventId.tsx` — header com imagem.
- `src/lib/sportImages.ts` (novo) + `src/assets/sports/*.jpg` (novos, gerados por IA).

## Perguntas rápidas (opcional)

Se preferir, ao entrar pelo link de convite o usuário já vira **confirmado** automaticamente (mais simples, sem "convites pendentes" reais — a seção fica vazia até alguém adicionar manualmente). Posso seguir com a versão `invited` proposta acima — me avise se preferir o oposto.

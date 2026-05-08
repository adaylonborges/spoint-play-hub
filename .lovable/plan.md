## Objetivo

Adicionar prazo de votação (até 48h antes da primeira data sugerida) com countdown visível na página do evento, e destacar a opção "Adicionar à agenda" como CTA central após a confirmação da data.

## Mudanças

### 1. Lógica de prazo de votação (`src/routes/eventos.$eventId.tsx`)

- Calcular `earliestDate` = menor `proposed_date` entre as `dates` do evento.
- Calcular `votingDeadline` = `earliestDate - 48h`.
- Estado derivado:
  - `votingOpen` = `now < votingDeadline` e sem `confirmed_date`.
  - `votingClosed` = `now >= votingDeadline` e sem `confirmed_date`.
  - `dateConfirmed` = `event.confirmed_date` presente.

### 2. Countdown de votação

- Novo componente inline `<VotingCountdown deadline={Date} />` que atualiza a cada 1s via `setInterval` em `useEffect`.
- Formato: `Xd Yh Zm Ws` (ou só `Yh Zm Ws` quando < 24h, vermelho quando < 6h).
- Renderizado no card "Vote na melhor data" como banner topo:
  - "Votação encerra em **02d 14h 32m**"
- Quando expira: bloquear cliques de voto (`disabled`) e mostrar "Votação encerrada".

### 3. Auto-confirmação da data vencedora (cliente)

- Quando `votingClosed` e ainda sem `confirmed_date`:
  - Eleger a `event_date` com mais votos (desempate = data mais próxima).
  - Se o usuário for `owner`, fazer `update events set confirmed_date = winner.proposed_date`.
  - (Convidados apenas visualizam — owner consolida ao abrir a página.)

### 4. CTA central "Adicionar à agenda" pós-votação

- Quando `dateConfirmed`:
  - Esconder o card de votação.
  - Substituir a action row de 2 botões (Convidar / Agenda) por um **bloco destacado central** logo após o header:
    - Card com `bg-gradient-primary`, ícone calendário grande, título "Data confirmada", subtítulo com data/hora formatada, botão grande `btn-primary` "Adicionar à minha agenda" (chama `handleCalendarClick` existente).
    - Botão secundário menor "Convidar amigos" abaixo.
  - Mantém o sheet de escolha desktop (Google / .ics) já implementado.

### 5. UI states resumidas

```text
[ header ]
 ├─ votingOpen      → card "Vote" + countdown
 ├─ votingClosed    → card "Votação encerrada — confirmando..."
 └─ dateConfirmed   → CTA central "Adicionar à agenda" (destaque)
```

## Arquivos

- `src/routes/eventos.$eventId.tsx` — toda a lógica acima e UI.
- (Sem mudanças de schema, sem novas libs.)

## Notas

- Tudo client-side; sem cron. A consolidação acontece quando o owner abre o evento após o prazo. Suficiente para o caso de uso atual.
- Sem alteração de RLS — `owner` já pode dar update em `events`.

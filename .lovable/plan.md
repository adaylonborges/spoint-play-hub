# Ajustes: UI mobile do evento + Adicionar à agenda

## 1. UI do mobile na página do evento (`src/routes/eventos.$eventId.tsx`)

Problemas observados no viewport 390px:
- O header com imagem usa `min-h-[280px]` apenas em `lg:`, mas no mobile o conteúdo (chip + título + endereço + data) pode estourar/cortar dependendo do texto.
- O bloco de ações tem `-mt-6` sobreposto ao header — em telas estreitas os botões "Convidar" e "Agenda" ficam apertados / cortados.
- Título e endereço podem transbordar em uma linha sem `break-words`.
- Botão "voltar" e chip ficam grudados no topo (sem safe-area).

Ajustes:
- Header: usar `min-h-[220px]` no mobile, `lg:min-h-[280px]`. Adicionar `pt-[env(safe-area-inset-top)]` no botão voltar.
- Título com `break-words`, endereço com `line-clamp-2`.
- Trocar a action row de `grid grid-cols-2 gap-2` para botões com tamanho mínimo confortável e padding interno reduzido (`py-3` em vez de `py-3.5`), e remover/reduzir o `-mt-6` para `-mt-4` para evitar sobreposição visual estranha.
- Garantir `overflow-hidden` no wrapper do header para a imagem não vazar arredondamento.
- Conferir cards (datas/participantes/racha) para que `text-sm` longos não quebrem layout — adicionar `truncate` / `min-w-0` onde aplicável.
- Padding lateral consistente `px-4` no mobile e `px-5` em telas maiores.

## 2. Adicionar à agenda — abrir app nativo

Hoje: gera um `.ics` e força download. No mobile isso muitas vezes baixa o arquivo sem abrir o app.

Nova abordagem em `src/routes/eventos.$eventId.tsx` (substituir `addToCalendar`):
- Trocar o botão único por um pequeno menu/sheet com opções:
  - **Google Calendar** — abre URL universal:
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<title>&dates=<startUTC>/<endUTC>&details=<desc>&location=<addr>`
    No Android com app instalado, o sistema redireciona para o app; no desktop abre o site; no iOS abre no navegador (também funciona).
  - **Apple / Outlook (.ics)** — mantém `generateIcs` + `downloadIcs` para quem prefere.
- Detectar mobile (`useIsMobile`) e, no mobile, padrão = Google Calendar (1 clique direto). No desktop, abrir o sheet com as duas opções.
- Helper novo `src/lib/calendar.ts` com `buildGoogleCalendarUrl({ title, start, end, location, details })`.

## 3. Arquivos afetados

- `src/routes/eventos.$eventId.tsx` — ajustes responsivos do header/ações + nova lógica de calendário.
- `src/lib/calendar.ts` — novo helper para URL do Google Calendar.
- (opcional) pequeno componente `CalendarSheet.tsx` para as duas opções.

Sem mudanças de banco de dados nem de outras rotas.

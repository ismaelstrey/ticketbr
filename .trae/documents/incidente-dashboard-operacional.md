# Incidente: Dashboard Operacional indisponível (500)

## Sintoma
- A dashboard na rota `/` não carregava os dados e a API `GET /api/dashboard/tickets` retornava `500`.
- O export em PDF (`/api/dashboard/tickets/export?format=pdf`) retornava `500`.

## Diagnóstico
- Logs do servidor mostraram erro Prisma `P2010` com erro Postgres `42803`:
  - `column "c.nome" must appear in the GROUP BY clause or be used in an aggregate function`
- O erro ocorria em consultas agregadas que usam `COALESCE(c.nome, t.category, 'Sem categoria')` com `LEFT JOIN Categoria_Ticket`.

## Causa raiz
1) **GROUP BY usando alias ambíguo**
- O banco possui uma coluna real `t.category` e também um alias `AS category`.
- Em Postgres, `GROUP BY category` não referencia o alias do SELECT; ele é interpretado como coluna da tabela quando existe, deixando `c.nome` fora do agrupamento.

2) **Export PDF com caracteres não suportados (WinAnsi)**
- O export PDF usava fontes padrão (Helvetica) do `pdf-lib`, que não suportam alguns caracteres Unicode (ex.: `→`, `—`).
- Isso gerava erro de encoding e quebrava o download.

## Correção aplicada
- Ajuste das queries agregadas para usar `GROUP BY` posicional:
  - `GROUP BY 1, 2` e `GROUP BY 1`.
- Sanitização de texto antes de escrever no PDF:
  - substitui `→` por `->`, `—` por `-` e remove caracteres fora de faixa suportada.

## Prevenção/Monitoramento
- A API do dashboard agora responde com `requestId` e permite debug controlado em ambiente de dev (`?debug=1`) sem expor detalhes em produção.
- Adicionado teste unitário para evitar regressão de `GROUP BY category/bucket` em SQL do dashboard.

## Como validar
- Login e chamada autenticada:
  - `GET /api/dashboard/tickets?preset=7d`
  - `GET /api/dashboard/tickets/export?format=xlsx&preset=7d`
  - `GET /api/dashboard/tickets/export?format=pdf&preset=7d`


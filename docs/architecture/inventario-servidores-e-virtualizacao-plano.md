# Planejamento — Inventário de Servidores e Ambientes Virtualizados

> Objetivo: dar visibilidade e agilidade operacional sobre a infraestrutura virtualizada dos clientes
> (Proxmox, VMware, etc.), incluindo hosts, VMs, containers, gerenciamento fora de banda (iLO/iDRAC)
> e os dados de acesso de cada recurso — com busca rápida do tipo "onde está o Zabbix?".

Status: **proposta para aprovação** (nada implementado).
Base: reaproveita o módulo `/inventory` já existente (equipamentos + cofre de credenciais + ACL).

---

## 1. Problema e dores

| Dor relatada | Consequência hoje |
| --- | --- |
| Clientes possuem servidores com ambientes virtualizados (Proxmox, VMware) | Não há onde registrar a topologia (host → VM → container) |
| Precisa registrar se o servidor tem iLO ou iDRAC e o IP de gerenciamento | Informação fica em planilha/anotação; IP de gerência é opcional porque nem sempre há acesso |
| Precisa cadastrar as VMs de cada Proxmox | Sem relação entre VM e host, não se sabe "de quem é" a VM |
| VM do tipo Docker precisa listar os containers e suas instâncias | Serviços ficam invisíveis: não se sabe em qual VM/host estão |
| Precisa dos dados de acesso (SSH: host, porta, usuário, senha; HTTP/HTTPS) | Credencial não tem link direto; gerenciar exige copiar dados manualmente |
| "Tenho várias VMs e não lembro onde está o Zabbix" | É preciso abrir Proxmox por Proxmox, um a um |

**Meta central:** reduzir o tempo para localizar um serviço (ex.: Zabbix) e seus dados de acesso
de "vários minutos abrindo hypervisors" para **segundos, com busca única**.

---

## 2. Decisão de arquitetura (recomendada)

**Reaproveitar `Equipment` como nó de uma árvore de infraestrutura**, em vez de criar um módulo do zero.

Razão: o módulo atual já entrega, testado, tudo o que a nova dor exige:

- cofre com cifragem AES-256-GCM ([vault.ts](file:///c:/Users/Ismael/Documents/site/ticketbr/src/lib/vault.ts));
- ACL por usuário, grupo e papel (`CredentialAccessGrant`);
- senhas padrão por cliente (`ClientSharedSecret`);
- auditoria + `reveal` sob demanda;
- tenancy por `Solicitante`;
- telas de listagem, formulário e cofre.

O que falta é **hierarquia** e **campos de virtualização/gerenciamento**.

### 2.1 Modelo de dados proposto

```prisma
enum EquipmentType {          // valores existentes + 2 novos
  SWITCH
  ROUTER
  FIREWALL
  SERVER
  HYPERVISOR                  // NOVO: host de virtualização (Proxmox, ESXi, vCenter)
  VM
  CONTAINER                   // NOVO
  COMPUTER
  PRINTER
  ACCESS_POINT
  OTHER
}

enum VirtualizationPlatform { // NOVO
  PROXMOX_VE
  VMWARE_ESXI
  VMWARE_VCENTER
  MICROSOFT_HYPERV
  XCP_NG
  KVM
  OTHER
}

enum ManagementController {   // NOVO
  NONE
  ILO            // HP/HPE
  IDRAC          // Dell
  IPMI
  ILO_AND_IDRAC
  OTHER
}
```

Campos novos em `Equipment` (todos **opcionais** — nenhum quebra o que existe):

| Campo | Tipo | Uso |
| --- | --- | --- |
| `parentId` | `String?` + self-relation | Hierarquia: Host → VM → Container |
| `virtualizationPlatform` | `VirtualizationPlatform?` | Só em `HYPERVISOR` |
| `managementController` | `ManagementController?` | iLO/iDRAC do host físico |
| `managementIp` | `String? @db.VarChar(64)` | IP de gerenciamento (opcional, como pedido) |
| `managementUrl` | `String?` | Link de gerência (iLO/iDRAC web) |
| `url` | `String?` | Link de acesso web do recurso (painel Proxmox, app, etc.) |
| `vmid` | `Int?` | ID da VM/CT dentro do hypervisor |
| `guestOs` | `String?` | SO convidado |
| `cpuCores` / `memoryMb` / `diskGb` | `Int?` | Dimensionamento |
| `tags` | `String[]` | Busca rápida ("zabbix", "produção", "24x7") |
| `solicitanteId` | já existe | **Denormalizado nos filhos** para "todas as VMs do cliente" |

Índices novos: `@@index([parentId])`, `@@index([solicitanteId, type])`, e (fase 2) GIN trigram
para `name`/`hostname`/`ipAddress`.

Regras de integridade (validadas no serviço, não só no banco):

1. `parentId` só aponta para `HYPERVISOR`, `VM` ou `SERVER`.
2. Filho **herda o `solicitanteId` do pai** — tentar vincular a outro cliente retorna **HTTP 409**
   (mesma regra já usada em `sharedSecretId`).
3. Sem ciclos (um nó não pode ser ancestral de si mesmo) — validado no "mover".
4. `virtualizationPlatform` obrigatória quando `type = HYPERVISOR`.

### 2.2 Caminho canônico (breadcrumb)

Derivado em leitura, não armazenado:

```
ACME  /  proxmox-01 (Proxmox VE)  /  vm-zabbix  /  zbx-web (container)
```

Usado na listagem, na busca e no cabeçalho da página do equipamento.

### 2.3 Credenciais e link de acesso

`EquipmentCredential` **não precisa mudar de estrutura** (já tem `protocol`, `port`, `username`,
`secret`/`sharedSecretId`, `accessPolicy`). Ajustes:

- adicionar `url String?` na credencial (ex.: `https://10.0.0.5:8006`, `https://zbx.acme.com`);
- derivar `loginUrl` quando `url` estiver vazia: `protocol + host do equipamento + port + path`;
- botão **"Abrir"** (`target="_blank"`, `rel="noopener noreferrer"`) visível para `HTTP`/`HTTPS`;
- botão **"Copiar"** usuário/URL; **"Revelar"** segue o fluxo auditado atual (`/reveal`), sem nunca
  devolver a senha em listagens.

---

## 3. API proposta

Seguindo o padrão já existente (route handlers + serviços + `publicXSelect` + auditoria):

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/inventory` (existente) | Ganha filtros `type`, `parentId`, `platform`, `solicitanteId` |
| `GET` | `/api/inventory/tree?solicitanteId=&hostId=` | Árvore pronta para a UI (hosts → VMs → containers) |
| `GET` | `/api/inventory/servers?solicitanteId=` | Hosts de virtualização + contagem de VMs |
| `GET` | `/api/inventory/vms?solicitanteId=&hostId=&platform=` | Todas as VMs de um cliente |
| `GET` | `/api/inventory/[id]/children` | Filhos diretos de um nó |
| `GET` | `/api/inventory/search?q=&solicitanteId=&limit=` | **Busca rápida global** |
| `PATCH` | `/api/inventory/[id]/parent` | Mover nó na hierarquia (validando ciclo/tenancy) |

Exemplo de retorno da busca (o que resolve a dor do Zabbix):

```json
{
  "query": "zabbix",
  "results": [
    {
      "id": "ckx_vm",
      "name": "vm-zabbix",
      "type": "VM",
      "path": "ACME / proxmox-01 / vm-zabbix",
      "solicitante": { "id": "sol1", "nome": "ACME" },
      "hostIp": "10.0.0.5",
      "matchedOn": ["name"],
      "url": "https://10.0.0.5:8006"
    }
  ]
}
```

Campos pesquisados: `name`, `hostname`, `ipAddress`, `managementIp`, `func`, `tags`,
`description`, `vmid` e `label`/`username` das credenciais.

---

## 4. Interface

### 4.1 Nova página `/infraestrutura` (a página pedida)

- **Seletor de cliente** no topo (obrigatório para carregar).
- Cards de resumo: hosts, VMs, containers, hosts com iLO/iDRAC cadastrado.
- **Árvore expansível** `Cliente → Host → VM → Container`, com badges de plataforma e contagem.
- Busca local na página (filtra a árvore) **+** a busca global (item 4.2).
- Ações rápidas por linha: abrir link, ver credenciais, novo filho.

### 4.2 Busca rápida global

- Campo no topo da aplicação (padrão: `Ctrl/Cmd + K` abre o "Command palette").
- Busca em todos os clientes (staff) ou restrita ao cliente selecionado.
- Resultado mostra **caminho completo + cliente + link clicável** → um clique leva ao serviço.
- Vazio-para-resultado com `debounce` de ~300 ms e destaque do termo.

### 4.3 Ajustes em telas existentes

- [inventory/page.tsx](file:///c:/Users/Ismael/Documents/site/ticketbr/src/app/inventory/page.tsx):
  filtro por tipo (incluindo Host/VM/Container) e coluna "Cliente / Caminho".
- [inventory/[id]/page.tsx](file:///c:/Users/Ismael/Documents/site/ticketbr/src/app/inventory/[id]/page.tsx):
  abas **Visão geral · VMs/Containers · Credenciais · Gerenciamento (iLO/iDRAC)**.
- [EquipmentFormModal.tsx](file:///c:/Users/Ismael/Documents/site/ticketbr/src/components/inventory/EquipmentFormModal.tsx):
  campos condicionais por tipo (plataforma só para host; iLO/iDRAC + IP de gerência só para host físico;
  `vmid`/`guestOs`/recursos só para VM; `url` para qualquer um).
- [CredentialModal.tsx](file:///c:/Users/Ismael/Documents/site/ticketbr/src/components/inventory/CredentialModal.tsx):
  campo `url` + preview do link.
- [labels.ts](file:///c:/Users/Ismael/Documents/site/ticketbr/src/components/inventory/labels.ts):
  rótulos dos novos enums.

---

## 5. Camadas e arquivos previstos

| Camada | Arquivos |
| --- | --- |
| Schema/migração | `prisma/schema.prisma`, `prisma/migrations/<ts>_infra_virtualization/` |
| Serviços | `src/server/services/inventory-tree.ts` (árvore, caminho, ciclo), `inventory-search.ts` (busca) |
| Rotas | `src/app/api/inventory/tree`, `.../vms`, `.../servers`, `.../search`, `.../[id]/children`, `.../[id]/parent` |
| Validações | `src/lib/validations/inventory.ts` (novos schemas + `refine` de regras por tipo) |
| Cliente | `src/services/api.ts`, `src/hooks/useInventoryTree.ts`, `src/hooks/useInventorySearch.ts` |
| UI | `src/app/infraestrutura/page.tsx`, `src/components/inventory/InfraTree.tsx`, `GlobalSearch.tsx`, `NodeBadges.tsx` |
| Tipos | `src/types/inventory.ts` |
| Docs/Progresso | `README.md`, `src/app/progresso/page.tsx` |

Convenções obrigatórias do projeto: TypeScript sem `any`, camelCase em arquivos/funções/variáveis,
comentários em pt-BR, hook por acesso à API, sem hash de senha em resposta.

---

## 6. Segurança

- Todas as rotas novas sob `guardStaff()`; mutações auditadas (`inventory.node_moved`, etc.).
- Reaproveitar `resolveCredentialAccessBatch` / `decideCredentialAccess` — nenhuma rota nova inventa ACL.
- **Nunca** devolver `secret` em listagens/busca; `reveal` continua sendo o único caminho, com auditoria.
- Busca não indexa valores de senha (apenas labels/usuários/URLs).
- Isolamento por cliente: consultas sempre filtram `solicitanteId` quando o usuário não é staff global.

---

## 7. Roadmap por fases

### Fase 1 — MVP (a dor principal resolvida)
1. Migração: enums + campos novos + self-relation + índices.
2. Cadastro de **host** (plataforma, iLO/iDRAC + IP de gerência opcional, link do painel).
3. Cadastro de **VM** vinculada ao host (`vmid`, recursos, SO, credenciais com `url`).
4. Página `/infraestrutura` com seletor de cliente + árvore.
5. **Busca rápida** por nome/hostname/IP/vmid retornando o caminho completo.
6. Botão "Abrir" para credenciais HTTP/HTTPS.
7. Testes de API/serviço + atualização de `/progresso` e README.

### Fase 2 — Conforto operacional
8. **Containers** Docker sob a VM + "instâncias"/serviços com dados de acesso.
9. Tags, filtros combinados e busca com trigram (`pg_trgm`) para escala.
10. "Mover nó" na árvore, duplicar VM, importar em lote (CSV).
11. Atalho `Ctrl/Cmd + K` e busca escopada por cliente.

### Fase 3 — Automação (opcional, maior esforço)
12. Conector **Proxmox VE** (API read-only): descobrir hosts, VMs e containers automaticamente.
13. Conector **VMware vCenter/ESXi** (API read-only).
14. Sincronização periódica (cron diário, respeitando o limite do plano Hobby) + status/health
    (`online/offline`, última coleta) e alerta quando um recurso monitorado cai.

---

## 8. Critérios de aceite (Fase 1)

- [ ] Consigo cadastrar um host Proxmox com plataforma, iLO/iDRAC e IP de gerência (**ou deixar em branco**).
- [ ] Consigo cadastrar N VMs vinculadas a esse host, com `vmid` e credenciais próprias.
- [ ] Consigo cadastrar credencial SSH (host, porta, usuário, senha) e HTTP/HTTPS (com **link clicável**).
- [ ] Ao selecionar um cliente, vejo **todas as VMs** dele, agrupadas por host, com a plataforma.
- [ ] Busca por "zabbix" retorna o caminho `Cliente / Host / VM` em 1 consulta e me leva ao recurso.
- [ ] Vincular um filho a outro cliente é bloqueado (409); mover nó não permite ciclo.
- [ ] Nenhuma resposta de API expõe senha fora do fluxo de `reveal` auditado.
- [ ] `tsc`, ESLint e suíte de testes passando; `/progresso` e README atualizados.

---

## 9. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Escopo grande (4 níveis) | Faseamento acima; Fase 1 entrega a dor principal |
| `ALTER TYPE ... ADD VALUE` no Postgres | Migração dedicada só com os novos valores, sem usá-los no mesmo script |
| Busca lenta com muitos registros | Fase 2: índice GIN + `pg_trgm`; Fase 1 já limita e pagina |
| Hierarquia inconsistente (ciclos/cliente errado) | Validação no serviço + testes dedicados |
| Duplicar cadastro (cliente digita VM já existente) | Aviso de duplicidade por `(parentId, vmid)` e por `(solicitanteId, hostname)` |
| Vazamento de segredo em log/busca | Reuso do cofre; nunca logar `secret`; busca ignora valores de senha |

---

## 10. Métricas de sucesso

- Tempo médio para localizar um serviço: **< 10 s** (hoje: abrir hypervisor por hypervisor).
- % de hosts com plataforma e iLO/iDRAC registrados.
- % de VMs com pelo menos uma credencial cadastrada.
- Nº de buscas com clique em resultado (indica que a busca resolve).

---

## 11. Decisões aprovadas

1. **Modelagem**: **estender `Equipment`** com hierarquia (`parentId` + campos de virtualização),
   reaproveitando cofre, ACL, tenancy, auditoria e telas existentes.
2. **Fase 1**: **somente cadastro manual** (host, VM, credenciais). Descoberta via API fica na Fase 3.
3. **"Instâncias" dos containers**: **o container é o próprio recurso** — cada container é um nó da
   árvore (`VM → container`) com seus dados de acesso. Sem sub-nível de instância/serviço.
4. **Busca rápida**: **global no topo da aplicação** com atalho `Ctrl/Cmd + K`, buscando em todos os
   clientes (staff) ou restrita ao cliente selecionado.

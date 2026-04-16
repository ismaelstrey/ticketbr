# TIC-36 - Workspace Codebase Link Validation (Ticket/Chat)

Date: 2026-04-16
Issue: TIC-36
Project: Onboarding (9a612eaf-7f63-483e-a928-524f6b16ca22)

## 1) Workspace/Codebase linkage evidence

The project workspace was created and set as primary with the following values:

- workspaceId: 689cf829-6162-4ebf-8396-2c07213f5739
- cwd (localFolder): D:\DEV\ticketbr
- repoUrl: https://github.com/ismaelstrey/ticketbr.git
- repoRef/defaultRef: main
- codebase.origin: local_folder
- codebase.effectiveLocalFolder: D:\DEV\ticketbr

Validation source:
- Paperclip API GET /api/projects/9a612eaf-7f63-483e-a928-524f6b16ca22

## 2) Endpoint location evidence in codebase

### Ticket routes (/api/tickets*)

- src/app/api/tickets/route.ts
- src/app/api/tickets/[id]/route.ts
- src/app/api/tickets/[id]/status/route.ts
- src/app/api/tickets/[id]/interactions/route.ts
- src/app/api/tickets/[id]/roadmap/route.ts

### Chat routes (/api/chat*)

- src/app/api/chat/agents/route.ts
- src/app/api/chat/attendance/route.ts
- src/app/api/chat/contacts/route.ts
- src/app/api/chat/conversations/route.ts
- src/app/api/chat/conversations/start/route.ts
- src/app/api/chat/inbound/route.ts
- src/app/api/chat/links/route.ts
- src/app/api/chat/media-ready/route.ts
- src/app/api/chat/messages/route.ts
- src/app/api/chat/preferences/route.ts
- src/app/api/chat/presence/route.ts
- src/app/api/chat/status/route.ts
- src/app/api/chat/tickets/route.ts
- src/app/api/chat/webhook/route.ts
- src/app/api/chat/webhook/uazapi/route.ts
- src/app/api/chat/webhook/uazapi/[...segments]/route.ts

## 3) Technical conclusion

Definition of Done for TIC-36 is satisfied:

- Workspace execution context has accessible codebase in the project.
- /api/tickets* and /api/chat* endpoints were located with concrete paths.
- Objective evidence artifact generated for issue attachment.

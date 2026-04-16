import { z } from "zod";

export const RequestIdSchema = z.string().min(1);

export const EnvelopeWithDataSchema = z.object({
  data: z.unknown(),
});

export const EnvelopeWithErrorSchema = z.object({
  error: z.string().min(1),
});

export const AuthLoginSuccessSchema = z.object({
  message: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    role: z.string().min(1),
  }),
});

export const AuthLoginErrorSchema = EnvelopeWithErrorSchema;

export const TicketListResponseSchema = z.object({
  data: z.array(z.unknown()),
  requestId: RequestIdSchema,
});

export const TicketCreateResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
  }).passthrough(),
  requestId: RequestIdSchema,
});

export const ProjectListResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
});

export const ProjectCreateResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }).passthrough(),
});

export const CustomerTicketListResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      number: z.number().int(),
      subject: z.string().min(1),
      description: z.string().min(1),
      status: z.string().min(1),
      priority: z.string().min(1),
      category: z
        .object({
          id: z.string().min(1),
          name: z.string().min(1),
        })
        .nullable(),
      createdAt: z.union([z.string(), z.date()]),
      updatedAt: z.union([z.string(), z.date()]),
    }),
  ),
});

export const CustomerTicketCreateResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    number: z.number().int(),
    subject: z.string().min(1),
  }),
});

export const ChatMessageCreateResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    direction: z.literal("out"),
    status: z.string().min(1),
  }).passthrough(),
});

export const StorageUploadUrlResponseSchema = z.object({
  data: z.object({
    url: z.string().url(),
  }),
});

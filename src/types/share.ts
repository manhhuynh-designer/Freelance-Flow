import { z } from 'zod';

export const ShareKindEnum = z.enum(['quote', 'timeline', 'combined']);

// Quote payload mirrors PrintableQuote props subset
export const QuoteSnapshotSchema = z.object({
  kind: z.literal('quote'),
  schemaVersion: z.number().int().min(1).default(1),
  quote: z.any(),
  task: z.any(),
  settings: z.any(),
  clients: z.any(),
  categories: z.any(),
  clientName: z.string().optional(),
  categoryName: z.string().optional(),
  defaultColumns: z.any(),
  calculationResults: z.any(),
  grandTotal: z.number(),
});

// Timeline payload mirrors PrintableTimeline props subset
export const TimelineSnapshotSchema = z.object({
  kind: z.literal('timeline'),
  schemaVersion: z.number().int().min(1).default(1),
  task: z.any(),
  quote: z.any().optional(),
  milestones: z.any(),
  settings: z.any(),
  clients: z.any(),
  categories: z.any(),
  viewMode: z.enum(['day', 'week', 'month']),
  timelineScale: z.number(),
  displayDate: z.any(),
});

export const CombinedSnapshotSchema = z.object({
  kind: z.literal('combined'),
  schemaVersion: z.number().int().min(1).default(1),
  quote: QuoteSnapshotSchema.optional(),
  timeline: TimelineSnapshotSchema.optional(),
});

export const ShareSnapshotSchema = z.discriminatedUnion('kind', [
  QuoteSnapshotSchema,
  TimelineSnapshotSchema,
  CombinedSnapshotSchema,
]);

export type ShareSnapshot = z.infer<typeof ShareSnapshotSchema>;

export const ShareRecordSchema = z.object({
  id: z.string(),
  type: ShareKindEnum,
  title: z.string().default(''),
  taskId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  status: z.enum(['active', 'revoked', 'expired']).default('active'),
  blobKey: z.string(),
  viewCount: z.number().int().nonnegative().default(0),
  lastAccessAt: z.string().nullable().optional(),
});

export type ShareRecord = z.infer<typeof ShareRecordSchema>;

export const ShareBlobSchema = z.object({
  meta: z.object({
    id: z.string(),
    type: ShareKindEnum,
    createdAt: z.string(),
    updatedAt: z.string(),
    expiresAt: z.string().nullable().optional(),
  }),
  data: ShareSnapshotSchema,
});

export type ShareBlob = z.infer<typeof ShareBlobSchema>;

export const ShareIndexSchema = z.object({
  items: z.array(ShareRecordSchema).default([]),
});

export type ShareIndex = z.infer<typeof ShareIndexSchema>;

export const MAX_SHARE_PAYLOAD_BYTES = 500_000; // ~500KB cap

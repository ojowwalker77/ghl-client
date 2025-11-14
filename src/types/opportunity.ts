import { Type, Static } from '@sinclair/typebox';
import {
  GHLIdSchema,
  DateTimeSchema,
  CustomFieldsSchema,
  SuccessResponseSchema,
  PaginationMetaSchema
} from './common';

/**
 * Opportunity Status Values
 */
export const OpportunityStatusSchema = Type.Union([
  Type.Literal('open'),
  Type.Literal('won'),
  Type.Literal('lost'),
  Type.Literal('abandoned'),
  Type.String(), // Allow custom statuses
]);

/**
 * Monetary Value
 */
export const MonetaryValueSchema = Type.Object({
  amount: Type.Optional(Type.Number()),
  currency: Type.Optional(Type.String({ default: 'USD' })),
});

/**
 * Pipeline Stage
 */
export const PipelineStageSchema = Type.Object({
  id: GHLIdSchema,
  name: Type.String(),
  position: Type.Optional(Type.Number()),
  pipelineId: Type.Optional(GHLIdSchema),
});

/**
 * Pipeline
 */
export const PipelineSchema = Type.Object({
  id: GHLIdSchema,
  name: Type.String(),
  locationId: GHLIdSchema,
  stages: Type.Array(PipelineStageSchema),
  showInFunnel: Type.Optional(Type.Boolean()),
  showInPieChart: Type.Optional(Type.Boolean()),
});

/**
 * Opportunity Schema - Main opportunity object
 */
export const OpportunitySchema = Type.Object({
  id: GHLIdSchema,
  locationId: GHLIdSchema,

  // Basic Info
  name: Type.String(),
  pipelineId: GHLIdSchema,
  pipelineStageId: GHLIdSchema,

  // Contact Association
  contactId: Type.Optional(GHLIdSchema),
  contact: Type.Optional(Type.Object({
    id: Type.Optional(GHLIdSchema),
    name: Type.Optional(Type.String()),
    email: Type.Optional(Type.String()),
    phone: Type.Optional(Type.String()),
    companyName: Type.Optional(Type.String()),
  })),

  // Status and Value
  status: OpportunityStatusSchema,
  monetaryValue: Type.Optional(Type.Number()),
  monetaryValueCurrency: Type.Optional(Type.String({ default: 'USD' })),

  // Assignment
  assignedTo: Type.Optional(GHLIdSchema),

  // Timestamps
  dateAdded: Type.Optional(DateTimeSchema),
  dateUpdated: Type.Optional(DateTimeSchema),
  lastStatusChangeAt: Type.Optional(DateTimeSchema),

  // Source
  source: Type.Optional(Type.String()),

  // Custom Fields
  customFields: Type.Optional(CustomFieldsSchema),

  // Additional metadata
  leadValue: Type.Optional(Type.Number()),
  followers: Type.Optional(Type.Array(GHLIdSchema)),
}, { additionalProperties: true });

/**
 * Create Opportunity Request
 */
export const CreateOpportunityRequestSchema = Type.Object({
  locationId: GHLIdSchema,
  name: Type.String(),
  pipelineId: GHLIdSchema,
  pipelineStageId: GHLIdSchema,
  contactId: Type.Optional(GHLIdSchema),
  status: Type.Optional(OpportunityStatusSchema),
  monetaryValue: Type.Optional(Type.Number()),
  monetaryValueCurrency: Type.Optional(Type.String({ default: 'USD' })),
  assignedTo: Type.Optional(GHLIdSchema),
  source: Type.Optional(Type.String()),
  customFields: Type.Optional(CustomFieldsSchema),
});

/**
 * Update Opportunity Request
 */
export const UpdateOpportunityRequestSchema = Type.Partial(
  Type.Omit(CreateOpportunityRequestSchema, ['locationId'])
);

/**
 * Upsert Opportunity Request
 */
export const UpsertOpportunityRequestSchema = Type.Intersect([
  CreateOpportunityRequestSchema,
  Type.Object({
    id: Type.Optional(GHLIdSchema),
  })
]);

/**
 * Search Opportunities Request
 */
export const SearchOpportunitiesRequestSchema = Type.Object({
  locationId: GHLIdSchema,
  pipelineId: Type.Optional(GHLIdSchema),
  pipelineStageId: Type.Optional(GHLIdSchema),
  contactId: Type.Optional(GHLIdSchema),
  status: Type.Optional(OpportunityStatusSchema),
  assignedTo: Type.Optional(GHLIdSchema),
  query: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  startAfter: Type.Optional(Type.String()),
  startAfterId: Type.Optional(Type.String()),
});

/**
 * Get Pipelines Request
 */
export const GetPipelinesRequestSchema = Type.Object({
  locationId: GHLIdSchema,
});

/**
 * Response Schemas
 */
export const OpportunityResponseSchema = Type.Object({
  opportunity: OpportunitySchema,
});

export const OpportunitiesListResponseSchema = Type.Object({
  opportunities: Type.Array(OpportunitySchema),
  meta: Type.Optional(PaginationMetaSchema),
});

export const PipelinesResponseSchema = Type.Object({
  pipelines: Type.Array(PipelineSchema),
});

// Export types
export type OpportunityStatus = Static<typeof OpportunityStatusSchema>;
export type MonetaryValue = Static<typeof MonetaryValueSchema>;
export type PipelineStage = Static<typeof PipelineStageSchema>;
export type Pipeline = Static<typeof PipelineSchema>;
export type Opportunity = Static<typeof OpportunitySchema>;
export type CreateOpportunityRequest = Static<typeof CreateOpportunityRequestSchema>;
export type UpdateOpportunityRequest = Static<typeof UpdateOpportunityRequestSchema>;
export type UpsertOpportunityRequest = Static<typeof UpsertOpportunityRequestSchema>;
export type SearchOpportunitiesRequest = Static<typeof SearchOpportunitiesRequestSchema>;
export type GetPipelinesRequest = Static<typeof GetPipelinesRequestSchema>;
export type OpportunityResponse = Static<typeof OpportunityResponseSchema>;
export type OpportunitiesListResponse = Static<typeof OpportunitiesListResponseSchema>;
export type PipelinesResponse = Static<typeof PipelinesResponseSchema>;

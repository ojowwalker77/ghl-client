import { Type, Static } from '@sinclair/typebox';

/**
 * Common TypeBox schemas used across all GHL resources
 */

// ISO 8601 date-time string
export const DateTimeSchema = Type.String({
  format: 'date-time',
  description: 'ISO 8601 date-time string'
});

// GHL ID format (typically alphanumeric strings)
export const GHLIdSchema = Type.String({
  minLength: 1,
  description: 'GoHighLevel resource ID'
});

// Email format
export const EmailSchema = Type.String({
  format: 'email',
  description: 'Email address'
});

// Phone number (E.164 format recommended)
export const PhoneSchema = Type.String({
  minLength: 1,
  description: 'Phone number in E.164 format (e.g., +1234567890)'
});

// URL format
export const UrlSchema = Type.String({
  format: 'uri',
  description: 'URL string'
});

// Pagination meta information
export const PaginationMetaSchema = Type.Object({
  total: Type.Optional(Type.Number({ description: 'Total number of records' })),
  currentPage: Type.Optional(Type.Number({ description: 'Current page number' })),
  nextPage: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  prevPage: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  startAfter: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  startAfterId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

// Common error response
export const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  message: Type.String(),
  error: Type.Optional(Type.String()),
  statusCode: Type.Optional(Type.Number()),
  traceId: Type.Optional(Type.String()),
});

// Success wrapper
export const SuccessResponseSchema = <T extends ReturnType<typeof Type.Any>>(dataSchema: T) =>
  Type.Object({
    success: Type.Literal(true),
    data: dataSchema,
    meta: Type.Optional(PaginationMetaSchema),
  });

// Custom fields (dynamic key-value pairs)
export const CustomFieldsSchema = Type.Record(
  Type.String(),
  Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()])
);

// Tag object
export const TagSchema = Type.Object({
  id: Type.Optional(GHLIdSchema),
  name: Type.Optional(Type.String()),
  label: Type.Optional(Type.String()), // Some endpoints use 'label' instead of 'name'
});

// Address object
export const AddressSchema = Type.Object({
  address1: Type.Optional(Type.String()),
  city: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  postalCode: Type.Optional(Type.String()),
});

// Export types
export type DateTime = Static<typeof DateTimeSchema>;
export type GHLId = Static<typeof GHLIdSchema>;
export type Email = Static<typeof EmailSchema>;
export type Phone = Static<typeof PhoneSchema>;
export type Url = Static<typeof UrlSchema>;
export type PaginationMeta = Static<typeof PaginationMetaSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;
export type CustomFields = Static<typeof CustomFieldsSchema>;
export type Tag = Static<typeof TagSchema>;
export type Address = Static<typeof AddressSchema>;

import { Type, Static } from '@sinclair/typebox';
import {
  GHLIdSchema,
  DateTimeSchema,
  EmailSchema,
  PhoneSchema,
  CustomFieldsSchema,
  TagSchema,
  AddressSchema,
  SuccessResponseSchema,
  PaginationMetaSchema
} from './common';

/**
 * Contact Source
 */
export const ContactSourceSchema = Type.Object({
  type: Type.Optional(Type.String()),
  id: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  url: Type.Optional(Type.String()),
});

/**
 * Attribution Source
 */
export const AttributionSourceSchema = Type.Object({
  url: Type.Optional(Type.String()),
  campaign: Type.Optional(Type.String()),
  utmSource: Type.Optional(Type.String()),
  utmMedium: Type.Optional(Type.String()),
  utmContent: Type.Optional(Type.String()),
  referrer: Type.Optional(Type.String()),
  campaignId: Type.Optional(Type.String()),
  fbclid: Type.Optional(Type.String()),
  gclid: Type.Optional(Type.String()),
  mscklid: Type.Optional(Type.String()),
  dclid: Type.Optional(Type.String()),
  fbc: Type.Optional(Type.String()),
  fbp: Type.Optional(Type.String()),
  fbEventId: Type.Optional(Type.String()),
  userAgent: Type.Optional(Type.String()),
  ip: Type.Optional(Type.String()),
  medium: Type.Optional(Type.String()),
  mediumId: Type.Optional(Type.String()),
});

/**
 * Social Media Links
 */
export const SocialMediaLinksSchema = Type.Object({
  facebook: Type.Optional(Type.String()),
  twitter: Type.Optional(Type.String()),
  linkedin: Type.Optional(Type.String()),
  instagram: Type.Optional(Type.String()),
  tiktok: Type.Optional(Type.String()),
  youtube: Type.Optional(Type.String()),
});

/**
 * Contact Schema - Main contact object
 */
export const ContactSchema = Type.Object({
  id: GHLIdSchema,
  locationId: GHLIdSchema,

  // Basic Info
  firstName: Type.Optional(Type.String()),
  lastName: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(PhoneSchema),

  // Additional Contact Info
  companyName: Type.Optional(Type.String()),
  website: Type.Optional(Type.String()),

  // Address
  address1: Type.Optional(Type.String()),
  city: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  postalCode: Type.Optional(Type.String()),

  // Timestamps
  dateAdded: Type.Optional(DateTimeSchema),
  dateUpdated: Type.Optional(DateTimeSchema),
  dateOfBirth: Type.Optional(Type.String()), // Can be partial date

  // Tags and Organization
  tags: Type.Optional(Type.Array(Type.Union([Type.String(), TagSchema]))),
  source: Type.Optional(ContactSourceSchema),
  attributionSource: Type.Optional(AttributionSourceSchema),

  // Custom Fields
  customFields: Type.Optional(CustomFieldsSchema),
  customField: Type.Optional(CustomFieldsSchema), // Some endpoints use singular

  // Assignment
  assignedTo: Type.Optional(GHLIdSchema),

  // Social Media
  socialMediaLinks: Type.Optional(SocialMediaLinksSchema),

  // Additional Fields
  type: Type.Optional(Type.String()),
  contactType: Type.Optional(Type.String()),
  timezone: Type.Optional(Type.String()),
  dnd: Type.Optional(Type.Boolean()),
  dndSettings: Type.Optional(Type.Object({
    call: Type.Optional(Type.Object({
      status: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    })),
    email: Type.Optional(Type.Object({
      status: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    })),
    sms: Type.Optional(Type.Object({
      status: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    })),
    whatsapp: Type.Optional(Type.Object({
      status: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    })),
    gmb: Type.Optional(Type.Object({
      status: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    })),
    fb: Type.Optional(Type.Object({
      status: Type.Optional(Type.String()),
      message: Type.Optional(Type.String()),
      code: Type.Optional(Type.String()),
    })),
  })),

  // Business
  businessId: Type.Optional(GHLIdSchema),

  // Additional metadata
  followers: Type.Optional(Type.Array(GHLIdSchema)),
  inboundDndSettings: Type.Optional(Type.Any()),
}, { additionalProperties: true });

/**
 * Create Contact Request
 */
export const CreateContactRequestSchema = Type.Object({
  locationId: GHLIdSchema,
  firstName: Type.Optional(Type.String()),
  lastName: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(PhoneSchema),
  address1: Type.Optional(Type.String()),
  city: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  country: Type.Optional(Type.String()),
  postalCode: Type.Optional(Type.String()),
  website: Type.Optional(Type.String()),
  timezone: Type.Optional(Type.String()),
  dnd: Type.Optional(Type.Boolean()),
  tags: Type.Optional(Type.Array(Type.String())),
  customFields: Type.Optional(CustomFieldsSchema),
  source: Type.Optional(Type.String()),
  companyName: Type.Optional(Type.String()),
  assignedTo: Type.Optional(GHLIdSchema),
});

/**
 * Update Contact Request
 */
export const UpdateContactRequestSchema = Type.Partial(CreateContactRequestSchema);

/**
 * Search Contacts Request
 */
export const SearchContactsRequestSchema = Type.Object({
  locationId: GHLIdSchema,
  query: Type.Optional(Type.String()),
  email: Type.Optional(EmailSchema),
  phone: Type.Optional(PhoneSchema),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  startAfter: Type.Optional(Type.String()),
  startAfterId: Type.Optional(Type.String()),
});

/**
 * Upsert Contact Request (Create or Update based on matching)
 */
export const UpsertContactRequestSchema = Type.Intersect([
  CreateContactRequestSchema,
  Type.Object({
    // Upsert uses email/phone for matching
  })
]);

/**
 * Contact Note
 */
export const ContactNoteSchema = Type.Object({
  id: Type.Optional(GHLIdSchema),
  contactId: GHLIdSchema,
  userId: Type.Optional(GHLIdSchema),
  body: Type.String(),
  dateAdded: Type.Optional(DateTimeSchema),
});

/**
 * Create Contact Note Request
 */
export const CreateContactNoteRequestSchema = Type.Object({
  contactId: GHLIdSchema,
  body: Type.String(),
  userId: Type.Optional(GHLIdSchema),
});

/**
 * Response Schemas
 */
export const ContactResponseSchema = Type.Object({
  contact: ContactSchema,
});

export const ContactsListResponseSchema = Type.Object({
  contacts: Type.Array(ContactSchema),
  meta: Type.Optional(PaginationMetaSchema),
});

// Export types
export type Contact = Static<typeof ContactSchema>;
export type CreateContactRequest = Static<typeof CreateContactRequestSchema>;
export type UpdateContactRequest = Static<typeof UpdateContactRequestSchema>;
export type SearchContactsRequest = Static<typeof SearchContactsRequestSchema>;
export type UpsertContactRequest = Static<typeof UpsertContactRequestSchema>;
export type ContactNote = Static<typeof ContactNoteSchema>;
export type CreateContactNoteRequest = Static<typeof CreateContactNoteRequestSchema>;
export type ContactResponse = Static<typeof ContactResponseSchema>;
export type ContactsListResponse = Static<typeof ContactsListResponseSchema>;
export type ContactSource = Static<typeof ContactSourceSchema>;
export type AttributionSource = Static<typeof AttributionSourceSchema>;
export type SocialMediaLinks = Static<typeof SocialMediaLinksSchema>;

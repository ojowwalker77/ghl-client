import { Type, Static } from '@sinclair/typebox';
import {
  GHLIdSchema,
  DateTimeSchema,
  EmailSchema,
  PhoneSchema,
  SuccessResponseSchema,
} from './common';

/**
 * User Role
 */
export const UserRoleSchema = Type.Union([
  Type.Literal('admin'),
  Type.Literal('user'),
  Type.Literal('account'),
  Type.String(), // Allow custom roles
]);

/**
 * User Permissions
 */
export const UserPermissionsSchema = Type.Object({
  campaignsEnabled: Type.Optional(Type.Boolean()),
  campaignsReadOnly: Type.Optional(Type.Boolean()),
  contactsEnabled: Type.Optional(Type.Boolean()),
  workflowsEnabled: Type.Optional(Type.Boolean()),
  workflowsReadOnly: Type.Optional(Type.Boolean()),
  triggersEnabled: Type.Optional(Type.Boolean()),
  funnelsEnabled: Type.Optional(Type.Boolean()),
  websitesEnabled: Type.Optional(Type.Boolean()),
  opportunitiesEnabled: Type.Optional(Type.Boolean()),
  dashboardStatsEnabled: Type.Optional(Type.Boolean()),
  bulkRequestsEnabled: Type.Optional(Type.Boolean()),
  appointmentsEnabled: Type.Optional(Type.Boolean()),
  reviewsEnabled: Type.Optional(Type.Boolean()),
  onlineListingsEnabled: Type.Optional(Type.Boolean()),
  phoneCallEnabled: Type.Optional(Type.Boolean()),
  conversationsEnabled: Type.Optional(Type.Boolean()),
  assignedDataOnly: Type.Optional(Type.Boolean()),
  adwordsReportingEnabled: Type.Optional(Type.Boolean()),
  membershipEnabled: Type.Optional(Type.Boolean()),
  facebookAdsReportingEnabled: Type.Optional(Type.Boolean()),
  attributionReportingEnabled: Type.Optional(Type.Boolean()),
  settingsEnabled: Type.Optional(Type.Boolean()),
  tagsEnabled: Type.Optional(Type.Boolean()),
  leadValueEnabled: Type.Optional(Type.Boolean()),
  marketingEnabled: Type.Optional(Type.Boolean()),
  agentReportingEnabled: Type.Optional(Type.Boolean()),
  botService: Type.Optional(Type.Boolean()),
  socialPlanner: Type.Optional(Type.Boolean()),
  bloggingEnabled: Type.Optional(Type.Boolean()),
  invoiceEnabled: Type.Optional(Type.Boolean()),
  affiliateManagerEnabled: Type.Optional(Type.Boolean()),
  contentAiEnabled: Type.Optional(Type.Boolean()),
  refundsEnabled: Type.Optional(Type.Boolean()),
  recordPaymentEnabled: Type.Optional(Type.Boolean()),
  cancelSubscriptionEnabled: Type.Optional(Type.Boolean()),
  paymentsEnabled: Type.Optional(Type.Boolean()),
  communitiesEnabled: Type.Optional(Type.Boolean()),
  exportPaymentsEnabled: Type.Optional(Type.Boolean()),
});

/**
 * User Schema - Main user object
 */
export const UserSchema = Type.Object({
  id: GHLIdSchema,
  locationId: Type.Optional(GHLIdSchema),
  companyId: Type.Optional(GHLIdSchema),

  // Basic Info
  name: Type.String(),
  firstName: Type.Optional(Type.String()),
  lastName: Type.Optional(Type.String()),
  email: EmailSchema,
  phone: Type.Optional(PhoneSchema),

  // Role and Permissions
  role: Type.Optional(UserRoleSchema),
  type: Type.Optional(Type.String()),
  permissions: Type.Optional(UserPermissionsSchema),

  // Status
  deleted: Type.Optional(Type.Boolean()),

  // Timestamps
  dateAdded: Type.Optional(DateTimeSchema),
}, { additionalProperties: true });

/**
 * Get Users Request
 */
export const GetUsersRequestSchema = Type.Object({
  locationId: GHLIdSchema,
  email: Type.Optional(EmailSchema),
  role: Type.Optional(UserRoleSchema),
  includeDeleted: Type.Optional(Type.Boolean({ default: false })),
});

/**
 * Response Schemas
 */
export const UserResponseSchema = Type.Object({
  user: UserSchema,
});

export const UsersListResponseSchema = Type.Object({
  users: Type.Array(UserSchema),
});

// Export types
export type UserRole = Static<typeof UserRoleSchema>;
export type UserPermissions = Static<typeof UserPermissionsSchema>;
export type User = Static<typeof UserSchema>;
export type GetUsersRequest = Static<typeof GetUsersRequestSchema>;
export type UserResponse = Static<typeof UserResponseSchema>;
export type UsersListResponse = Static<typeof UsersListResponseSchema>;

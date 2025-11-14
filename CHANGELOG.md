# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-14

### Added

- Initial release of @pixel/ghl-client
- Core `GHLClient` class with resource-based API
- Support for API Key and OAuth 2.0 authentication
- **Contacts Resource**
  - Get, create, update, delete contacts
  - Search contacts by query, email, or phone
  - Upsert contact (create or update based on matching)
  - Add and retrieve contact notes
  - Multiple endpoint fallbacks for API compatibility
- **Opportunities Resource**
  - Get, create, update, delete opportunities
  - Search opportunities by various filters
  - Upsert opportunity (create or update)
  - Get pipelines for a location
  - Pipeline caching with 1-hour TTL
  - Find pipeline stage by name
  - Check if opportunity exists for contact
- **Users Resource**
  - List users for a location
  - Get user by ID
  - Find user by email
  - Get users by role
  - Multiple endpoint variations for compatibility
- **OAuth Client**
  - Generate authorization URLs
  - Exchange authorization code for tokens
  - Refresh access tokens
  - Token expiration checking
- **TypeBox Schemas**
  - Complete type definitions for all resources
  - Runtime validation for API responses
  - Type-safe request/response handling
- **Utilities**
  - HTTP client with automatic validation
  - Retry logic with exponential backoff
  - Custom error classes (HttpClientError, ValidationError)
- Comprehensive TypeScript types
- Debug logging support
- README with extensive usage examples

### Architecture

- Built with Bun and TypeBox for maximum type safety
- Resource-based API design for clean separation of concerns
- Automatic retry with configurable backoff strategy
- Smart caching for frequently accessed data (pipelines)
- Support for GHL API inconsistencies with fallback mechanisms

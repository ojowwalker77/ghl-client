import type { GHLClient } from '../client';
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  SearchContactsRequest,
  UpsertContactRequest,
  CreateContactNoteRequest,
  ContactNote,
} from '../types/contact';
import {
  ContactResponseSchema,
  ContactsListResponseSchema,
} from '../types/contact';

/**
 * Contacts Resource
 * Handles all contact-related API operations
 */
export class ContactsResource {
  constructor(private readonly client: GHLClient) {}

  /**
   * Get a contact by ID
   *
   * @example
   * ```ts
   * const contact = await client.contacts.get('contact-id');
   * ```
   */
  async get(contactId: string): Promise<Contact> {
    this.client.log('Getting contact', { contactId });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().get<{ contact: Contact }>(
        `/contacts/${contactId}`,
        {
          headers: this.client.buildAuthHeaders(),
          responseSchema: ContactResponseSchema,
        }
      )
    );

    return response.contact;
  }

  /**
   * Create a new contact
   *
   * @example
   * ```ts
   * const contact = await client.contacts.create({
   *   locationId: 'loc-123',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   email: 'john@example.com',
   * });
   * ```
   */
  async create(data: CreateContactRequest): Promise<Contact> {
    this.client.log('Creating contact', data);

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().post<{ contact: Contact }>(
        '/contacts/',
        {
          body: data,
          headers: this.client.buildAuthHeaders(),
          responseSchema: ContactResponseSchema,
        }
      )
    );

    return response.contact;
  }

  /**
   * Update an existing contact
   *
   * @example
   * ```ts
   * const contact = await client.contacts.update('contact-id', {
   *   firstName: 'Jane',
   * });
   * ```
   */
  async update(contactId: string, data: UpdateContactRequest): Promise<Contact> {
    this.client.log('Updating contact', { contactId, data });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().put<{ contact: Contact }>(
        `/contacts/${contactId}`,
        {
          body: data,
          headers: this.client.buildAuthHeaders(),
          responseSchema: ContactResponseSchema,
        }
      )
    );

    return response.contact;
  }

  /**
   * Delete a contact
   *
   * @example
   * ```ts
   * await client.contacts.delete('contact-id');
   * ```
   */
  async delete(contactId: string): Promise<void> {
    this.client.log('Deleting contact', { contactId });

    await this.client.withRetry(() =>
      this.client.getHttpClient().delete(
        `/contacts/${contactId}`,
        {
          headers: this.client.buildAuthHeaders(),
        }
      )
    );
  }

  /**
   * Search contacts
   *
   * @example
   * ```ts
   * // Search by query
   * const contacts = await client.contacts.search({
   *   locationId: 'loc-123',
   *   query: 'john',
   * });
   *
   * // Search by phone
   * const contacts = await client.contacts.search({
   *   locationId: 'loc-123',
   *   phone: '+1234567890',
   * });
   * ```
   */
  async search(params: SearchContactsRequest): Promise<Contact[]> {
    this.client.log('Searching contacts', params);

    // Try primary search endpoint
    try {
      const response = await this.client.withRetry(() =>
        this.client.getHttpClient().post<{ contacts: Contact[] }>(
          '/contacts/search',
          {
            body: params,
            headers: this.client.buildAuthHeaders(),
          }
        )
      );

      return response.contacts;
    } catch (error) {
      // Fallback to GET endpoint if POST fails
      this.client.log('Search POST failed, trying GET fallback', { error });

      const response = await this.client.withRetry(() =>
        this.client.getHttpClient().get<{ contacts: Contact[] }>(
          '/contacts/',
          {
            query: params,
            headers: this.client.buildAuthHeaders(),
          }
        )
      );

      return response.contacts;
    }
  }

  /**
   * Search contacts by phone number (convenience method)
   *
   * @example
   * ```ts
   * const contacts = await client.contacts.searchByPhone('loc-123', '+1234567890');
   * ```
   */
  async searchByPhone(locationId: string, phone: string): Promise<Contact[]> {
    return this.search({ locationId, phone });
  }

  /**
   * Search contacts by email (convenience method)
   *
   * @example
   * ```ts
   * const contacts = await client.contacts.searchByEmail('loc-123', 'john@example.com');
   * ```
   */
  async searchByEmail(locationId: string, email: string): Promise<Contact[]> {
    return this.search({ locationId, email });
  }

  /**
   * Upsert a contact (create or update based on matching)
   *
   * @example
   * ```ts
   * const contact = await client.contacts.upsert({
   *   locationId: 'loc-123',
   *   email: 'john@example.com',
   *   firstName: 'John',
   *   lastName: 'Doe',
   * });
   * ```
   */
  async upsert(data: UpsertContactRequest): Promise<Contact> {
    this.client.log('Upserting contact', data);

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().post<{ contact: Contact }>(
        '/contacts/upsert',
        {
          body: data,
          headers: this.client.buildAuthHeaders(),
          responseSchema: ContactResponseSchema,
        }
      )
    );

    return response.contact;
  }

  /**
   * Add a note to a contact
   *
   * @example
   * ```ts
   * const note = await client.contacts.addNote({
   *   contactId: 'contact-id',
   *   body: 'This is a note',
   *   userId: 'user-id', // optional
   * });
   * ```
   */
  async addNote(data: CreateContactNoteRequest): Promise<ContactNote> {
    this.client.log('Adding note to contact', data);

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().post<{ note: ContactNote }>(
        `/contacts/${data.contactId}/notes`,
        {
          body: {
            body: data.body,
            userId: data.userId,
          },
          headers: this.client.buildAuthHeaders(),
        }
      )
    );

    return response.note;
  }

  /**
   * Get all notes for a contact
   *
   * @example
   * ```ts
   * const notes = await client.contacts.getNotes('contact-id');
   * ```
   */
  async getNotes(contactId: string): Promise<ContactNote[]> {
    this.client.log('Getting notes for contact', { contactId });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().get<{ notes: ContactNote[] }>(
        `/contacts/${contactId}/notes`,
        {
          headers: this.client.buildAuthHeaders(),
        }
      )
    );

    return response.notes;
  }
}

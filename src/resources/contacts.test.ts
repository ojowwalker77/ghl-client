import { describe, expect, test, mock } from 'bun:test';
import { ContactsResource } from './contacts';
import type { GHLClient } from '../client';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '../types/contact';

// Create a mock GHLClient
function createMockClient() {
  const httpClient = {
    get: mock(async () => ({ contact: {} })),
    post: mock(async () => ({ contact: {} })),
    put: mock(async () => ({ contact: {} })),
    delete: mock(async () => ({})),
  };

  const client = {
    getHttpClient: mock(() => httpClient),
    withRetry: mock(async (fn: any) => await fn()),
    buildAuthHeaders: mock(() => ({ Authorization: 'Bearer test-token' })),
    log: mock(() => {}),
    audit: mock(() => {}),
  } as unknown as GHLClient;

  return { client, httpClient };
}

describe('ContactsResource', () => {
  describe('get', () => {
    test('should get contact by ID', async () => {
      const { client, httpClient } = createMockClient();
      const mockContact: Contact = {
        id: 'contact-123',
        locationId: 'loc-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      httpClient.get.mockResolvedValueOnce({ contact: mockContact });

      const contacts = new ContactsResource(client);
      const result = await contacts.get('contact-123');

      expect(result).toEqual(mockContact);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/contacts/contact-123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should use retry wrapper', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ contact: { id: 'contact-123' } });

      const contacts = new ContactsResource(client);
      await contacts.get('contact-123');

      expect(client.withRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    test('should create a new contact', async () => {
      const { client, httpClient } = createMockClient();
      const createData: CreateContactRequest = {
        locationId: 'loc-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+9876543210',
      };

      const createdContact: Contact = {
        id: 'contact-456',
        ...createData,
      };

      httpClient.post.mockResolvedValueOnce({ contact: createdContact });

      const contacts = new ContactsResource(client);
      const result = await contacts.create(createData);

      expect(result).toEqual(createdContact);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/',
        expect.objectContaining({
          body: createData,
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should handle tags and custom fields', async () => {
      const { client, httpClient } = createMockClient();
      const createData: CreateContactRequest = {
        locationId: 'loc-123',
        firstName: 'John',
        email: 'john@example.com',
        tags: ['lead', 'hot'],
        customFields: {
          field1: 'value1',
        },
      };

      httpClient.post.mockResolvedValueOnce({ contact: { id: 'contact-789', ...createData } });

      const contacts = new ContactsResource(client);
      const result = await contacts.create(createData);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/',
        expect.objectContaining({
          body: expect.objectContaining({
            tags: ['lead', 'hot'],
            customFields: { field1: 'value1' },
          }),
        })
      );
    });
  });

  describe('update', () => {
    test('should update an existing contact', async () => {
      const { client, httpClient } = createMockClient();
      const updateData: UpdateContactRequest = {
        firstName: 'UpdatedName',
        tags: ['customer'],
      };

      const updatedContact: Contact = {
        id: 'contact-123',
        locationId: 'loc-123',
        firstName: 'UpdatedName',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      httpClient.put.mockResolvedValueOnce({ contact: updatedContact });

      const contacts = new ContactsResource(client);
      const result = await contacts.update('contact-123', updateData);

      expect(result).toEqual(updatedContact);
      expect(httpClient.put).toHaveBeenCalledWith(
        '/contacts/contact-123',
        expect.objectContaining({
          body: updateData,
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should allow partial updates', async () => {
      const { client, httpClient } = createMockClient();
      const updateData: UpdateContactRequest = {
        email: 'newemail@example.com',
      };

      httpClient.put.mockResolvedValueOnce({
        contact: { id: 'contact-123', email: 'newemail@example.com' },
      });

      const contacts = new ContactsResource(client);
      await contacts.update('contact-123', updateData);

      expect(httpClient.put).toHaveBeenCalledWith(
        '/contacts/contact-123',
        expect.objectContaining({
          body: { email: 'newemail@example.com' },
        })
      );
    });
  });

  describe('delete', () => {
    test('should delete a contact', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.delete.mockResolvedValueOnce({});

      const contacts = new ContactsResource(client);
      await contacts.delete('contact-123');

      expect(httpClient.delete).toHaveBeenCalledWith(
        '/contacts/contact-123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });
  });

  describe('search', () => {
    test('should search contacts with query', async () => {
      const { client, httpClient } = createMockClient();
      const mockContacts: Contact[] = [
        {
          id: 'contact-1',
          locationId: 'loc-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        {
          id: 'contact-2',
          locationId: 'loc-123',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      ];

      httpClient.post.mockResolvedValueOnce({ contacts: mockContacts });

      const contacts = new ContactsResource(client);
      const result = await contacts.search({
        locationId: 'loc-123',
        query: 'Doe',
      });

      expect(result).toEqual(mockContacts);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/search',
        expect.objectContaining({
          body: { locationId: 'loc-123', query: 'Doe' },
        })
      );
    });

    test('should search by phone', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.post.mockResolvedValueOnce({ contacts: [{ id: 'contact-1' }] });

      const contacts = new ContactsResource(client);
      await contacts.search({
        locationId: 'loc-123',
        phone: '+1234567890',
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/search',
        expect.objectContaining({
          body: { locationId: 'loc-123', phone: '+1234567890' },
        })
      );
    });

    test('should search by email', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.post.mockResolvedValueOnce({ contacts: [{ id: 'contact-1' }] });

      const contacts = new ContactsResource(client);
      await contacts.search({
        locationId: 'loc-123',
        email: 'test@example.com',
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/search',
        expect.objectContaining({
          body: { locationId: 'loc-123', email: 'test@example.com' },
        })
      );
    });

    test('should fallback to GET endpoint if POST fails', async () => {
      const { client, httpClient } = createMockClient();
      const mockContacts: Contact[] = [{ id: 'contact-1', locationId: 'loc-123' }];

      // First attempt (POST) fails
      httpClient.post.mockRejectedValueOnce(new Error('POST not supported'));

      // Second attempt (GET) succeeds
      httpClient.get.mockResolvedValueOnce({ contacts: mockContacts });

      const contacts = new ContactsResource(client);
      const result = await contacts.search({
        locationId: 'loc-123',
        query: 'test',
      });

      expect(result).toEqual(mockContacts);
      expect(httpClient.post).toHaveBeenCalledTimes(1);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/contacts/',
        expect.objectContaining({
          query: { locationId: 'loc-123', query: 'test' },
        })
      );
    });

    test('should handle pagination parameters', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.post.mockResolvedValueOnce({ contacts: [] });

      const contacts = new ContactsResource(client);
      await contacts.search({
        locationId: 'loc-123',
        limit: 50,
        skip: 10,
      });

      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/search',
        expect.objectContaining({
          body: expect.objectContaining({
            limit: 50,
            skip: 10,
          }),
        })
      );
    });
  });

  describe('searchByPhone', () => {
    test('should search contacts by phone (convenience method)', async () => {
      const { client, httpClient } = createMockClient();
      const mockContact: Contact = {
        id: 'contact-1',
        locationId: 'loc-123',
        phone: '+1234567890',
      };

      httpClient.post.mockResolvedValueOnce({ contacts: [mockContact] });

      const contacts = new ContactsResource(client);
      const result = await contacts.searchByPhone('loc-123', '+1234567890');

      expect(result).toEqual([mockContact]);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/search',
        expect.objectContaining({
          body: { locationId: 'loc-123', phone: '+1234567890' },
        })
      );
    });
  });

  describe('searchByEmail', () => {
    test('should search contacts by email (convenience method)', async () => {
      const { client, httpClient } = createMockClient();
      const mockContact: Contact = {
        id: 'contact-1',
        locationId: 'loc-123',
        email: 'test@example.com',
      };

      httpClient.post.mockResolvedValueOnce({ contacts: [mockContact] });

      const contacts = new ContactsResource(client);
      const result = await contacts.searchByEmail('loc-123', 'test@example.com');

      expect(result).toEqual([mockContact]);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/search',
        expect.objectContaining({
          body: { locationId: 'loc-123', email: 'test@example.com' },
        })
      );
    });
  });

  describe('upsert', () => {
    test('should upsert a contact', async () => {
      const { client, httpClient } = createMockClient();
      const upsertData = {
        locationId: 'loc-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const upsertedContact: Contact = {
        id: 'contact-123',
        ...upsertData,
      };

      httpClient.post.mockResolvedValueOnce({ contact: upsertedContact });

      const contacts = new ContactsResource(client);
      const result = await contacts.upsert(upsertData);

      expect(result).toEqual(upsertedContact);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/upsert',
        expect.objectContaining({
          body: upsertData,
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });
  });

  describe('addNote', () => {
    test('should add a note to a contact', async () => {
      const { client, httpClient } = createMockClient();
      const noteData = {
        contactId: 'contact-123',
        body: 'This is a note',
        userId: 'user-456',
      };

      const createdNote = {
        id: 'note-789',
        contactId: 'contact-123',
        body: 'This is a note',
        userId: 'user-456',
        createdAt: '2023-01-01T00:00:00Z',
      };

      httpClient.post.mockResolvedValueOnce({ note: createdNote });

      const contacts = new ContactsResource(client);
      const result = await contacts.addNote(noteData);

      expect(result).toEqual(createdNote);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/contact-123/notes',
        expect.objectContaining({
          body: {
            body: 'This is a note',
            userId: 'user-456',
          },
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should add note without userId', async () => {
      const { client, httpClient } = createMockClient();
      const noteData = {
        contactId: 'contact-123',
        body: 'Note without user',
      };

      httpClient.post.mockResolvedValueOnce({
        note: { id: 'note-123', body: 'Note without user' },
      });

      const contacts = new ContactsResource(client);
      await contacts.addNote(noteData);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/contacts/contact-123/notes',
        expect.objectContaining({
          body: {
            body: 'Note without user',
            userId: undefined,
          },
        })
      );
    });
  });

  describe('getNotes', () => {
    test('should get all notes for a contact', async () => {
      const { client, httpClient } = createMockClient();
      const mockNotes = [
        {
          id: 'note-1',
          contactId: 'contact-123',
          body: 'First note',
          createdAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'note-2',
          contactId: 'contact-123',
          body: 'Second note',
          createdAt: '2023-01-02T00:00:00Z',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ notes: mockNotes });

      const contacts = new ContactsResource(client);
      const result = await contacts.getNotes('contact-123');

      expect(result).toEqual(mockNotes);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/contacts/contact-123/notes',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should return empty array when no notes exist', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ notes: [] });

      const contacts = new ContactsResource(client);
      const result = await contacts.getNotes('contact-123');

      expect(result).toEqual([]);
    });
  });
});

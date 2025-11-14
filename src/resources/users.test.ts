import { describe, expect, test, mock } from 'bun:test';
import { UsersResource } from './users';
import type { GHLClient } from '../client';
import type { User } from '../types/user';

// Create a mock GHLClient
function createMockClient(locationId?: string) {
  const httpClient = {
    get: mock(async () => ({ users: [] })),
  };

  const client = {
    getHttpClient: mock(() => httpClient),
    withRetry: mock(async (fn: any) => await fn()),
    buildAuthHeaders: mock(() => ({ Authorization: 'Bearer test-token' })),
    log: mock(() => {}),
    requireLocationId: mock((locId?: string) => {
      const id = locId ?? locationId;
      if (!id) throw new Error('Location ID required');
      return id;
    }),
  } as unknown as GHLClient;

  return { client, httpClient };
}

describe('UsersResource', () => {
  describe('get', () => {
    test('should get user by ID', async () => {
      const { client, httpClient } = createMockClient();
      const mockUser: User = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
      };

      httpClient.get.mockResolvedValueOnce({ user: mockUser });

      const users = new UsersResource(client);
      const result = await users.get('user-123');

      expect(result).toEqual(mockUser);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/users/user-123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should use retry wrapper', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ user: { id: 'user-123' } });

      const users = new UsersResource(client);
      await users.get('user-123');

      expect(client.withRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    test('should list all users for a location', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.list('loc-123');

      expect(result).toEqual(mockUsers);
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    test('should try first endpoint successfully', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockUsers: User[] = [{ id: 'user-1', name: 'Test', email: 'test@example.com', role: 'user' }];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.list('loc-123');

      expect(result).toEqual(mockUsers);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/users/?locationId=loc-123',
        expect.anything()
      );
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    test('should fallback to second endpoint if first fails', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockUsers: User[] = [{ id: 'user-1', name: 'Test', email: 'test@example.com', role: 'user' }];

      // First endpoint fails
      httpClient.get.mockRejectedValueOnce(new Error('404 Not Found'));
      // Second endpoint succeeds
      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.list('loc-123');

      expect(result).toEqual(mockUsers);
      expect(httpClient.get).toHaveBeenCalledTimes(2);
      expect(httpClient.get).toHaveBeenNthCalledWith(1, '/users/?locationId=loc-123', expect.anything());
      expect(httpClient.get).toHaveBeenNthCalledWith(2, '/users?locationId=loc-123', expect.anything());
    });

    test('should try all endpoints until one succeeds', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockUsers: User[] = [{ id: 'user-1', name: 'Test', email: 'test@example.com', role: 'user' }];

      // First three endpoints fail
      httpClient.get.mockRejectedValueOnce(new Error('Endpoint 1 failed'));
      httpClient.get.mockRejectedValueOnce(new Error('Endpoint 2 failed'));
      httpClient.get.mockRejectedValueOnce(new Error('Endpoint 3 failed'));
      // Fourth endpoint succeeds
      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.list('loc-123');

      expect(result).toEqual(mockUsers);
      expect(httpClient.get).toHaveBeenCalledTimes(4);
      expect(httpClient.get).toHaveBeenNthCalledWith(4, '/locations/loc-123/users/', expect.anything());
    });

    test('should throw error if all endpoints fail', async () => {
      const { client, httpClient } = createMockClient('loc-123');

      // All endpoints fail
      httpClient.get.mockRejectedValue(new Error('All endpoints failed'));

      const users = new UsersResource(client);

      await expect(users.list('loc-123')).rejects.toThrow('All endpoints failed');
      expect(httpClient.get).toHaveBeenCalledTimes(4); // All 4 endpoints tried
    });

    test('should use default location ID from client', async () => {
      const { client, httpClient } = createMockClient('loc-default');
      httpClient.get.mockResolvedValueOnce({ users: [] });

      const users = new UsersResource(client);
      await users.list();

      expect(client.requireLocationId).toHaveBeenCalledWith(undefined);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/users/?locationId=loc-default',
        expect.anything()
      );
    });

    test('should throw error if location ID not provided', async () => {
      const { client } = createMockClient(); // No default location
      client.requireLocationId.mockImplementation((locId?: string) => {
        if (!locId) throw new Error('Location ID required');
        return locId;
      });

      const users = new UsersResource(client);

      await expect(users.list()).rejects.toThrow('Location ID required');
    });

    test('should pass additional query parameters', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      httpClient.get.mockResolvedValueOnce({ users: [] });

      const users = new UsersResource(client);
      await users.list('loc-123', { limit: 50, skip: 10 });

      expect(httpClient.get).toHaveBeenCalledWith(
        '/users/?locationId=loc-123',
        expect.objectContaining({
          query: { limit: 50, skip: 10 },
        })
      );
    });

    test('should log each failed endpoint attempt', async () => {
      const { client, httpClient } = createMockClient('loc-123');

      // First endpoint fails, second succeeds
      httpClient.get.mockRejectedValueOnce(new Error('First failed'));
      httpClient.get.mockResolvedValueOnce({ users: [] });

      const users = new UsersResource(client);
      await users.list('loc-123');

      // Should log the failure
      expect(client.log).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.anything()
      );
    });
  });

  describe('findByEmail', () => {
    test('should find user by exact email match', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.findByEmail('loc-123', 'jane@example.com');

      expect(result).toEqual(mockUsers[1]);
    });

    test('should find user with case-insensitive email match', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'John@Example.com',
          role: 'admin',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.findByEmail('loc-123', 'john@example.com');

      expect(result).toEqual(mockUsers[0]);
    });

    test('should return null when user not found', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.findByEmail('loc-123', 'notfound@example.com');

      expect(result).toBeNull();
    });

    test('should return null when user list is empty', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ users: [] });

      const users = new UsersResource(client);
      const result = await users.findByEmail('loc-123', 'test@example.com');

      expect(result).toBeNull();
    });

    test('should handle email with mixed case in both search and data', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'Test User',
          email: 'TeSt@ExAmPlE.CoM',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.findByEmail('loc-123', 'test@example.com');

      expect(result).toEqual(mockUsers[0]);
    });

    test('should find first matching user if duplicates exist', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'First User',
          email: 'duplicate@example.com',
          role: 'admin',
        },
        {
          id: 'user-2',
          name: 'Second User',
          email: 'duplicate@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.findByEmail('loc-123', 'duplicate@example.com');

      expect(result?.id).toBe('user-1');
    });
  });

  describe('getByRole', () => {
    test('should get users by role', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'Admin One',
          email: 'admin1@example.com',
          role: 'admin',
        },
        {
          id: 'user-2',
          name: 'User One',
          email: 'user1@example.com',
          role: 'user',
        },
        {
          id: 'user-3',
          name: 'Admin Two',
          email: 'admin2@example.com',
          role: 'admin',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.getByRole('loc-123', 'admin');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('user-1');
      expect(result[1]?.id).toBe('user-3');
      expect(result.every(u => u.role === 'admin')).toBe(true);
    });

    test('should return empty array when no users with role exist', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'User One',
          email: 'user1@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.getByRole('loc-123', 'admin');

      expect(result).toEqual([]);
    });

    test('should return all users when all have the same role', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'User One',
          email: 'user1@example.com',
          role: 'user',
        },
        {
          id: 'user-2',
          name: 'User Two',
          email: 'user2@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.getByRole('loc-123', 'user');

      expect(result).toEqual(mockUsers);
    });

    test('should handle custom role names', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'Manager',
          email: 'manager@example.com',
          role: 'manager',
        },
        {
          id: 'user-2',
          name: 'User',
          email: 'user@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.getByRole('loc-123', 'manager');

      expect(result).toHaveLength(1);
      expect(result[0]?.role).toBe('manager');
    });

    test('should be case-sensitive for role matching', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'Admin',
          email: 'admin@example.com',
          role: 'admin',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.getByRole('loc-123', 'Admin'); // Capital A

      expect(result).toEqual([]);
    });

    test('should return empty array when user list is empty', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ users: [] });

      const users = new UsersResource(client);
      const result = await users.getByRole('loc-123', 'admin');

      expect(result).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete user lookup workflow', async () => {
      const { client, httpClient } = createMockClient();
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        },
        {
          id: 'user-2',
          name: 'Regular User',
          email: 'user@example.com',
          role: 'user',
        },
      ];

      httpClient.get.mockResolvedValue({ users: mockUsers });

      const users = new UsersResource(client);

      // List all users
      const allUsers = await users.list('loc-123');
      expect(allUsers).toHaveLength(2);

      // Find specific user by email
      const foundUser = await users.findByEmail('loc-123', 'admin@example.com');
      expect(foundUser?.role).toBe('admin');

      // Get users by role
      const admins = await users.getByRole('loc-123', 'admin');
      expect(admins).toHaveLength(1);
    });

    test('should handle endpoint fallback in real scenario', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockUsers: User[] = [
        {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
        },
      ];

      // Simulate first endpoint failing, third succeeding
      httpClient.get.mockRejectedValueOnce(new Error('404'));
      httpClient.get.mockRejectedValueOnce(new Error('404'));
      httpClient.get.mockResolvedValueOnce({ users: mockUsers });

      const users = new UsersResource(client);
      const result = await users.list('loc-123');

      expect(result).toEqual(mockUsers);
      expect(httpClient.get).toHaveBeenCalledTimes(3);

      // Verify it tried multiple endpoints
      expect(httpClient.get).toHaveBeenNthCalledWith(1, '/users/?locationId=loc-123', expect.anything());
      expect(httpClient.get).toHaveBeenNthCalledWith(2, '/users?locationId=loc-123', expect.anything());
      expect(httpClient.get).toHaveBeenNthCalledWith(3, '/locations/loc-123/users', expect.anything());
    });
  });
});

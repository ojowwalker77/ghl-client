import type { GHLClient } from '../client';
import type {
  User,
  GetUsersRequest,
} from '../types/user';
import { UsersListResponseSchema } from '../types/user';

/**
 * Users Resource
 * Handles all user-related API operations
 */
export class UsersResource {
  constructor(private readonly client: GHLClient) {}

  /**
   * Get all users for a location
   * Tries multiple endpoint variations for compatibility
   *
   * @example
   * ```ts
   * const users = await client.users.list('loc-123');
   * ```
   */
  async list(locationId?: string, params?: Omit<GetUsersRequest, 'locationId'>): Promise<User[]> {
    const locId = this.client.requireLocationId(locationId);
    this.client.log('Getting users', { locationId: locId });

    // Multiple endpoint variations to try (GHL API inconsistency)
    const endpoints = [
      `/users/?locationId=${locId}`,
      `/users?locationId=${locId}`,
      `/locations/${locId}/users`,
      `/locations/${locId}/users/`,
    ];

    let lastError: any;

    for (const endpoint of endpoints) {
      try {
        const response = await this.client.withRetry(() =>
          this.client.getHttpClient().get<{ users: User[] }>(
            endpoint,
            {
              query: params,
              headers: this.client.buildAuthHeaders(),
            }
          )
        );

        return response.users;
      } catch (error) {
        this.client.log(`Endpoint ${endpoint} failed, trying next`, { error });
        lastError = error;
        continue;
      }
    }

    // All endpoints failed
    throw lastError;
  }

  /**
   * Get a user by ID
   *
   * @example
   * ```ts
   * const user = await client.users.get('user-id');
   * ```
   */
  async get(userId: string): Promise<User> {
    this.client.log('Getting user', { userId });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().get<{ user: User }>(
        `/users/${userId}`,
        {
          headers: this.client.buildAuthHeaders(),
        }
      )
    );

    return response.user;
  }

  /**
   * Find a user by email
   *
   * @example
   * ```ts
   * const user = await client.users.findByEmail('loc-123', 'user@example.com');
   * ```
   */
  async findByEmail(locationId: string, email: string): Promise<User | null> {
    this.client.log('Finding user by email', { locationId, email });

    const users = await this.list(locationId);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    return user || null;
  }

  /**
   * Get users by role
   *
   * @example
   * ```ts
   * const admins = await client.users.getByRole('loc-123', 'admin');
   * ```
   */
  async getByRole(locationId: string, role: string): Promise<User[]> {
    this.client.log('Getting users by role', { locationId, role });

    const users = await this.list(locationId);
    return users.filter(u => u.role === role);
  }
}

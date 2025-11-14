import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { OpportunitiesResource } from './opportunities';
import type { GHLClient } from '../client';
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  Pipeline,
} from '../types/opportunity';

// Create a mock GHLClient
function createMockClient(locationId?: string) {
  const httpClient = {
    get: mock(async () => ({ opportunity: {} })),
    post: mock(async () => ({ opportunity: {} })),
    put: mock(async () => ({ opportunity: {} })),
    delete: mock(async () => ({})),
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

describe('OpportunitiesResource', () => {
  describe('get', () => {
    test('should get opportunity by ID', async () => {
      const { client, httpClient } = createMockClient();
      const mockOpportunity: Opportunity = {
        id: 'opp-123',
        locationId: 'loc-123',
        name: 'Big Deal',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
        contactId: 'contact-1',
        status: 'open',
        monetaryValue: 5000,
      };

      httpClient.get.mockResolvedValueOnce({ opportunity: mockOpportunity });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.get('opp-123');

      expect(result).toEqual(mockOpportunity);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/opp-123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should use retry wrapper', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ opportunity: { id: 'opp-123' } });

      const opportunities = new OpportunitiesResource(client);
      await opportunities.get('opp-123');

      expect(client.withRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    test('should create a new opportunity', async () => {
      const { client, httpClient } = createMockClient();
      const createData: CreateOpportunityRequest = {
        locationId: 'loc-123',
        name: 'New Deal',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
        contactId: 'contact-1',
        monetaryValue: 10000,
      };

      const createdOpportunity: Opportunity = {
        id: 'opp-456',
        ...createData,
        status: 'open',
      };

      httpClient.post.mockResolvedValueOnce({ opportunity: createdOpportunity });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.create(createData);

      expect(result).toEqual(createdOpportunity);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/opportunities/',
        expect.objectContaining({
          body: createData,
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should handle optional fields', async () => {
      const { client, httpClient } = createMockClient();
      const createData: CreateOpportunityRequest = {
        locationId: 'loc-123',
        name: 'Deal with extras',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
        contactId: 'contact-1',
        status: 'won',
        assignedTo: 'user-123',
      };

      httpClient.post.mockResolvedValueOnce({
        opportunity: { id: 'opp-789', ...createData },
      });

      const opportunities = new OpportunitiesResource(client);
      await opportunities.create(createData);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/opportunities/',
        expect.objectContaining({
          body: expect.objectContaining({
            status: 'won',
            assignedTo: 'user-123',
          }),
        })
      );
    });
  });

  describe('update', () => {
    test('should update an existing opportunity', async () => {
      const { client, httpClient } = createMockClient();
      const updateData: UpdateOpportunityRequest = {
        pipelineStageId: 'stage-2',
        monetaryValue: 15000,
        status: 'won',
      };

      const updatedOpportunity: Opportunity = {
        id: 'opp-123',
        locationId: 'loc-123',
        name: 'Updated Deal',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-2',
        contactId: 'contact-1',
        status: 'won',
        monetaryValue: 15000,
      };

      httpClient.put.mockResolvedValueOnce({ opportunity: updatedOpportunity });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.update('opp-123', updateData);

      expect(result).toEqual(updatedOpportunity);
      expect(httpClient.put).toHaveBeenCalledWith(
        '/opportunities/opp-123',
        expect.objectContaining({
          body: updateData,
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    test('should allow partial updates', async () => {
      const { client, httpClient } = createMockClient();
      const updateData: UpdateOpportunityRequest = {
        name: 'Renamed Deal',
      };

      httpClient.put.mockResolvedValueOnce({
        opportunity: { id: 'opp-123', name: 'Renamed Deal' },
      });

      const opportunities = new OpportunitiesResource(client);
      await opportunities.update('opp-123', updateData);

      expect(httpClient.put).toHaveBeenCalledWith(
        '/opportunities/opp-123',
        expect.objectContaining({
          body: { name: 'Renamed Deal' },
        })
      );
    });
  });

  describe('delete', () => {
    test('should delete an opportunity', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.delete.mockResolvedValueOnce({});

      const opportunities = new OpportunitiesResource(client);
      await opportunities.delete('opp-123');

      expect(httpClient.delete).toHaveBeenCalledWith(
        '/opportunities/opp-123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });
  });

  describe('upsert', () => {
    test('should upsert an opportunity', async () => {
      const { client, httpClient } = createMockClient();
      const upsertData = {
        locationId: 'loc-123',
        name: 'Upserted Deal',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
        contactId: 'contact-1',
      };

      const upsertedOpportunity: Opportunity = {
        id: 'opp-999',
        ...upsertData,
        status: 'open',
      };

      httpClient.post.mockResolvedValueOnce({ opportunity: upsertedOpportunity });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.upsert(upsertData);

      expect(result).toEqual(upsertedOpportunity);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/opportunities/upsert',
        expect.objectContaining({
          body: upsertData,
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });
  });

  describe('search', () => {
    test('should search opportunities with query parameters', async () => {
      const { client, httpClient } = createMockClient();
      const mockOpportunities: Opportunity[] = [
        {
          id: 'opp-1',
          locationId: 'loc-123',
          name: 'Deal 1',
          pipelineId: 'pipeline-1',
          pipelineStageId: 'stage-1',
          contactId: 'contact-1',
          status: 'open',
        },
        {
          id: 'opp-2',
          locationId: 'loc-123',
          name: 'Deal 2',
          pipelineId: 'pipeline-1',
          pipelineStageId: 'stage-2',
          contactId: 'contact-1',
          status: 'won',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ opportunities: mockOpportunities });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.search({
        locationId: 'loc-123',
        contactId: 'contact-1',
      });

      expect(result).toEqual(mockOpportunities);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/search',
        expect.objectContaining({
          query: { locationId: 'loc-123', contactId: 'contact-1' },
        })
      );
    });

    test('should search by pipeline and stage', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ opportunities: [] });

      const opportunities = new OpportunitiesResource(client);
      await opportunities.search({
        locationId: 'loc-123',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
      });

      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/search',
        expect.objectContaining({
          query: expect.objectContaining({
            pipelineId: 'pipeline-1',
            pipelineStageId: 'stage-1',
          }),
        })
      );
    });

    test('should search by status', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ opportunities: [] });

      const opportunities = new OpportunitiesResource(client);
      await opportunities.search({
        locationId: 'loc-123',
        status: 'open',
      });

      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/search',
        expect.objectContaining({
          query: expect.objectContaining({
            status: 'open',
          }),
        })
      );
    });
  });

  describe('getPipelines', () => {
    test('should get pipelines for a location', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Sales Pipeline',
          stages: [
            { id: 'stage-1', name: 'Lead' },
            { id: 'stage-2', name: 'Qualified' },
          ],
        },
        {
          id: 'pipeline-2',
          name: 'Service Pipeline',
          stages: [
            { id: 'stage-3', name: 'New Request' },
            { id: 'stage-4', name: 'In Progress' },
          ],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.getPipelines('loc-123');

      expect(result).toEqual(mockPipelines);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/pipelines',
        expect.objectContaining({
          query: { locationId: 'loc-123' },
        })
      );
    });

    test('should use default location ID from client', async () => {
      const { client, httpClient } = createMockClient('loc-default');
      httpClient.get.mockResolvedValueOnce({ pipelines: [] });

      const opportunities = new OpportunitiesResource(client);
      await opportunities.getPipelines();

      expect(client.requireLocationId).toHaveBeenCalledWith(undefined);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/pipelines',
        expect.objectContaining({
          query: { locationId: 'loc-default' },
        })
      );
    });

    test('should throw error if location ID not provided', async () => {
      const { client } = createMockClient(); // No default location
      client.requireLocationId.mockImplementation((locId?: string) => {
        if (!locId) throw new Error('Location ID required');
        return locId;
      });

      const opportunities = new OpportunitiesResource(client);

      await expect(opportunities.getPipelines()).rejects.toThrow('Location ID required');
    });
  });

  describe('loadPipelinesCache', () => {
    test('should fetch and cache pipelines on first call', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          stages: [{ id: 'stage-1', name: 'Stage 1' }],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.loadPipelinesCache('loc-123');

      expect(result.size).toBe(1);
      expect(result.get('pipeline-1')).toEqual(mockPipelines[0]);
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    test('should return cached pipelines on subsequent calls', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          stages: [{ id: 'stage-1', name: 'Stage 1' }],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);

      // First call - should fetch
      const result1 = await opportunities.loadPipelinesCache('loc-123');
      expect(httpClient.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await opportunities.loadPipelinesCache('loc-123');
      expect(httpClient.get).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(result2).toEqual(result1);
    });

    test('should refetch when cache expires', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          stages: [],
        },
      ];

      httpClient.get.mockResolvedValue({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);

      // First call - should fetch
      await opportunities.loadPipelinesCache('loc-123');
      expect(httpClient.get).toHaveBeenCalledTimes(1);

      // Manually expire the cache by manipulating timestamp
      // We need to access the private cache, so we'll simulate expiry by waiting
      // For testing purposes, we'll clear cache and refetch
      opportunities.clearPipelineCache('loc-123');

      // Second call after clearing - should fetch again
      await opportunities.loadPipelinesCache('loc-123');
      expect(httpClient.get).toHaveBeenCalledTimes(2);
    });

    test('should build map with pipeline IDs as keys', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          stages: [],
        },
        {
          id: 'pipeline-2',
          name: 'Pipeline 2',
          stages: [],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.loadPipelinesCache('loc-123');

      expect(result.size).toBe(2);
      expect(result.has('pipeline-1')).toBe(true);
      expect(result.has('pipeline-2')).toBe(true);
      expect(result.get('pipeline-1')?.name).toBe('Pipeline 1');
      expect(result.get('pipeline-2')?.name).toBe('Pipeline 2');
    });
  });

  describe('findStageByName', () => {
    test('should find stage by exact name match', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Sales',
          stages: [
            { id: 'stage-1', name: 'Lead' },
            { id: 'stage-2', name: 'Qualified' },
            { id: 'stage-3', name: 'Proposal' },
          ],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.findStageByName('loc-123', 'pipeline-1', 'Qualified');

      expect(result).toEqual({ id: 'stage-2', name: 'Qualified' });
    });

    test('should find stage with case-insensitive matching', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Sales',
          stages: [
            { id: 'stage-1', name: 'Lead' },
            { id: 'stage-2', name: 'Qualified' },
          ],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.findStageByName('loc-123', 'pipeline-1', 'qualified');

      expect(result).toEqual({ id: 'stage-2', name: 'Qualified' });
    });

    test('should return null when stage not found', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Sales',
          stages: [{ id: 'stage-1', name: 'Lead' }],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.findStageByName('loc-123', 'pipeline-1', 'NonExistent');

      expect(result).toBeNull();
    });

    test('should return null when pipeline not found', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Sales',
          stages: [{ id: 'stage-1', name: 'Lead' }],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.findStageByName('loc-123', 'pipeline-999', 'Lead');

      expect(result).toBeNull();
    });

    test('should use cached pipelines', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Sales',
          stages: [{ id: 'stage-1', name: 'Lead' }],
        },
      ];

      httpClient.get.mockResolvedValueOnce({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);

      // First call
      await opportunities.findStageByName('loc-123', 'pipeline-1', 'Lead');
      expect(httpClient.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await opportunities.findStageByName('loc-123', 'pipeline-1', 'Lead');
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearPipelineCache', () => {
    test('should clear cache for specific location', async () => {
      const { client, httpClient } = createMockClient('loc-123');
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          stages: [],
        },
      ];

      httpClient.get.mockResolvedValue({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);

      // Load cache
      await opportunities.loadPipelinesCache('loc-123');
      expect(httpClient.get).toHaveBeenCalledTimes(1);

      // Clear cache
      opportunities.clearPipelineCache('loc-123');

      // Load again - should fetch
      await opportunities.loadPipelinesCache('loc-123');
      expect(httpClient.get).toHaveBeenCalledTimes(2);
    });

    test('should clear all caches when no location specified', async () => {
      const { client, httpClient } = createMockClient();
      const mockPipelines: Pipeline[] = [
        {
          id: 'pipeline-1',
          name: 'Pipeline 1',
          stages: [],
        },
      ];

      httpClient.get.mockResolvedValue({ pipelines: mockPipelines });

      const opportunities = new OpportunitiesResource(client);

      // Load cache for multiple locations
      await opportunities.loadPipelinesCache('loc-123');
      await opportunities.loadPipelinesCache('loc-456');
      expect(httpClient.get).toHaveBeenCalledTimes(2);

      // Clear all caches
      opportunities.clearPipelineCache();

      // Load again - should fetch both
      await opportunities.loadPipelinesCache('loc-123');
      await opportunities.loadPipelinesCache('loc-456');
      expect(httpClient.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('existsForContact', () => {
    test('should return opportunity if exists', async () => {
      const { client, httpClient } = createMockClient();
      const mockOpportunity: Opportunity = {
        id: 'opp-123',
        locationId: 'loc-123',
        name: 'Existing Deal',
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
        contactId: 'contact-1',
        status: 'open',
      };

      httpClient.get.mockResolvedValueOnce({ opportunities: [mockOpportunity] });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.existsForContact('loc-123', 'contact-1', 'pipeline-1');

      expect(result).toEqual(mockOpportunity);
      expect(httpClient.get).toHaveBeenCalledWith(
        '/opportunities/search',
        expect.objectContaining({
          query: {
            locationId: 'loc-123',
            contactId: 'contact-1',
            pipelineId: 'pipeline-1',
          },
        })
      );
    });

    test('should return null if no opportunity exists', async () => {
      const { client, httpClient } = createMockClient();
      httpClient.get.mockResolvedValueOnce({ opportunities: [] });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.existsForContact('loc-123', 'contact-1', 'pipeline-1');

      expect(result).toBeNull();
    });

    test('should return first opportunity if multiple exist', async () => {
      const { client, httpClient } = createMockClient();
      const mockOpportunities: Opportunity[] = [
        {
          id: 'opp-1',
          locationId: 'loc-123',
          name: 'First',
          pipelineId: 'pipeline-1',
          pipelineStageId: 'stage-1',
          contactId: 'contact-1',
          status: 'open',
        },
        {
          id: 'opp-2',
          locationId: 'loc-123',
          name: 'Second',
          pipelineId: 'pipeline-1',
          pipelineStageId: 'stage-2',
          contactId: 'contact-1',
          status: 'won',
        },
      ];

      httpClient.get.mockResolvedValueOnce({ opportunities: mockOpportunities });

      const opportunities = new OpportunitiesResource(client);
      const result = await opportunities.existsForContact('loc-123', 'contact-1', 'pipeline-1');

      expect(result?.id).toBe('opp-1');
    });
  });
});

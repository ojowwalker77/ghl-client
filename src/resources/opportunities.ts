import type { GHLClient } from '../client';
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  UpsertOpportunityRequest,
  SearchOpportunitiesRequest,
  Pipeline,
  GetPipelinesRequest,
} from '../types/opportunity';
import {
  OpportunityResponseSchema,
  OpportunitiesListResponseSchema,
  PipelinesResponseSchema,
} from '../types/opportunity';

/**
 * Pipeline Cache Entry
 */
interface PipelineCacheEntry {
  pipelines: Map<string, Pipeline>;
  timestamp: number;
}

/**
 * Opportunities Resource
 * Handles all opportunity-related API operations
 */
export class OpportunitiesResource {
  private pipelineCache: Map<string, PipelineCacheEntry> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly client: GHLClient) {}

  /**
   * Get an opportunity by ID
   *
   * @example
   * ```ts
   * const opportunity = await client.opportunities.get('opp-id');
   * ```
   */
  async get(opportunityId: string): Promise<Opportunity> {
    this.client.log('Getting opportunity', { opportunityId });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().get<{ opportunity: Opportunity }>(
        `/opportunities/${opportunityId}`,
        {
          headers: this.client.buildAuthHeaders(),
          responseSchema: OpportunityResponseSchema,
        }
      )
    );

    return response.opportunity;
  }

  /**
   * Create a new opportunity
   *
   * @example
   * ```ts
   * const opportunity = await client.opportunities.create({
   *   locationId: 'loc-123',
   *   name: 'New Deal',
   *   pipelineId: 'pipeline-id',
   *   pipelineStageId: 'stage-id',
   *   contactId: 'contact-id',
   *   monetaryValue: 1000,
   * });
   * ```
   */
  async create(data: CreateOpportunityRequest): Promise<Opportunity> {
    this.client.log('Creating opportunity', data);

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().post<{ opportunity: Opportunity }>(
        '/opportunities/',
        {
          body: data,
          headers: this.client.buildAuthHeaders(),
          responseSchema: OpportunityResponseSchema,
        }
      )
    );

    return response.opportunity;
  }

  /**
   * Update an existing opportunity
   *
   * @example
   * ```ts
   * const opportunity = await client.opportunities.update('opp-id', {
   *   pipelineStageId: 'new-stage-id',
   *   monetaryValue: 2000,
   * });
   * ```
   */
  async update(opportunityId: string, data: UpdateOpportunityRequest): Promise<Opportunity> {
    this.client.log('Updating opportunity', { opportunityId, data });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().put<{ opportunity: Opportunity }>(
        `/opportunities/${opportunityId}`,
        {
          body: data,
          headers: this.client.buildAuthHeaders(),
          responseSchema: OpportunityResponseSchema,
        }
      )
    );

    return response.opportunity;
  }

  /**
   * Delete an opportunity
   *
   * @example
   * ```ts
   * await client.opportunities.delete('opp-id');
   * ```
   */
  async delete(opportunityId: string): Promise<void> {
    this.client.log('Deleting opportunity', { opportunityId });

    await this.client.withRetry(() =>
      this.client.getHttpClient().delete(
        `/opportunities/${opportunityId}`,
        {
          headers: this.client.buildAuthHeaders(),
        }
      )
    );
  }

  /**
   * Upsert an opportunity (create or update)
   *
   * @example
   * ```ts
   * const opportunity = await client.opportunities.upsert({
   *   locationId: 'loc-123',
   *   name: 'Deal',
   *   pipelineId: 'pipeline-id',
   *   pipelineStageId: 'stage-id',
   *   contactId: 'contact-id',
   * });
   * ```
   */
  async upsert(data: UpsertOpportunityRequest): Promise<Opportunity> {
    this.client.log('Upserting opportunity', data);

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().post<{ opportunity: Opportunity }>(
        '/opportunities/upsert',
        {
          body: data,
          headers: this.client.buildAuthHeaders(),
          responseSchema: OpportunityResponseSchema,
        }
      )
    );

    return response.opportunity;
  }

  /**
   * Search opportunities
   *
   * @example
   * ```ts
   * // Search by contact
   * const opportunities = await client.opportunities.search({
   *   locationId: 'loc-123',
   *   contactId: 'contact-id',
   * });
   *
   * // Search by pipeline and stage
   * const opportunities = await client.opportunities.search({
   *   locationId: 'loc-123',
   *   pipelineId: 'pipeline-id',
   *   pipelineStageId: 'stage-id',
   * });
   * ```
   */
  async search(params: SearchOpportunitiesRequest): Promise<Opportunity[]> {
    this.client.log('Searching opportunities', params);

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().get<{ opportunities: Opportunity[] }>(
        '/opportunities/search',
        {
          query: params,
          headers: this.client.buildAuthHeaders(),
        }
      )
    );

    return response.opportunities;
  }

  /**
   * Get all pipelines for a location
   *
   * @example
   * ```ts
   * const pipelines = await client.opportunities.getPipelines('loc-123');
   * ```
   */
  async getPipelines(locationId?: string): Promise<Pipeline[]> {
    const locId = this.client.requireLocationId(locationId);
    this.client.log('Getting pipelines', { locationId: locId });

    const response = await this.client.withRetry(() =>
      this.client.getHttpClient().get<{ pipelines: Pipeline[] }>(
        '/opportunities/pipelines',
        {
          query: { locationId: locId },
          headers: this.client.buildAuthHeaders(),
        }
      )
    );

    return response.pipelines;
  }

  /**
   * Get pipelines with caching
   *
   * @example
   * ```ts
   * const pipelinesMap = await client.opportunities.loadPipelinesCache('loc-123');
   * const pipeline = pipelinesMap.get('pipeline-id');
   * ```
   */
  async loadPipelinesCache(locationId?: string): Promise<Map<string, Pipeline>> {
    const locId = this.client.requireLocationId(locationId);

    // Check cache
    const cached = this.pipelineCache.get(locId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.client.log('Using cached pipelines', { locationId: locId });
      return cached.pipelines;
    }

    // Fetch fresh data
    this.client.log('Fetching fresh pipelines', { locationId: locId });
    const pipelines = await this.getPipelines(locId);

    // Build map
    const pipelinesMap = new Map<string, Pipeline>();
    for (const pipeline of pipelines) {
      pipelinesMap.set(pipeline.id, pipeline);
    }

    // Cache it
    this.pipelineCache.set(locId, {
      pipelines: pipelinesMap,
      timestamp: Date.now(),
    });

    return pipelinesMap;
  }

  /**
   * Find a pipeline stage by name
   *
   * @example
   * ```ts
   * const stage = await client.opportunities.findStageByName(
   *   'loc-123',
   *   'pipeline-id',
   *   'Qualified'
   * );
   * ```
   */
  async findStageByName(
    locationId: string,
    pipelineId: string,
    stageName: string
  ): Promise<{ id: string; name: string } | null> {
    const pipelinesMap = await this.loadPipelinesCache(locationId);
    const pipeline = pipelinesMap.get(pipelineId);

    if (!pipeline) {
      return null;
    }

    const stage = pipeline.stages.find(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );

    return stage ? { id: stage.id, name: stage.name } : null;
  }

  /**
   * Clear pipeline cache for a location
   *
   * @example
   * ```ts
   * client.opportunities.clearPipelineCache('loc-123');
   * ```
   */
  clearPipelineCache(locationId?: string): void {
    if (locationId) {
      this.pipelineCache.delete(locationId);
    } else {
      this.pipelineCache.clear();
    }
  }

  /**
   * Check if an opportunity exists for a contact and pipeline
   *
   * @example
   * ```ts
   * const exists = await client.opportunities.existsForContact(
   *   'loc-123',
   *   'contact-id',
   *   'pipeline-id'
   * );
   * ```
   */
  async existsForContact(
    locationId: string,
    contactId: string,
    pipelineId: string
  ): Promise<Opportunity | null> {
    const opportunities = await this.search({
      locationId,
      contactId,
      pipelineId,
    });

    return opportunities.length > 0 ? opportunities[0]! : null;
  }
}

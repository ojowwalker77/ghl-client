/**
 * Basic Usage Examples for @pixel/ghl-client
 */

import { GHLClient } from '../src';

// Initialize client with API key
const client = new GHLClient({
  auth: {
    type: 'api-key',
    apiKey: process.env.GHL_API_KEY!,
  },
  locationId: process.env.GHL_LOCATION_ID,
  debug: true, // Enable debug logging
});

/**
 * Example 1: Search and create contact
 */
async function example1_ContactManagement() {
  const locationId = process.env.GHL_LOCATION_ID!;

  // Search for existing contact by phone
  const existingContacts = await client.contacts.searchByPhone(
    locationId,
    '+1234567890'
  );

  if (existingContacts.length > 0) {
    console.log('Contact already exists:', existingContacts[0]);
    return existingContacts[0];
  }

  // Create new contact
  const contact = await client.contacts.create({
    locationId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    tags: ['lead', 'website'],
    customFields: {
      // Use your custom field IDs here
      source: 'website',
    },
  });

  console.log('Created contact:', contact);

  // Add a note
  await client.contacts.addNote({
    contactId: contact.id,
    body: 'Initial contact from website form',
  });

  return contact;
}

/**
 * Example 2: Create opportunity with duplicate prevention
 */
async function example2_OpportunityManagement() {
  const locationId = process.env.GHL_LOCATION_ID!;
  const contactId = 'your-contact-id';
  const pipelineId = 'your-pipeline-id';

  // Check if opportunity already exists
  const existing = await client.opportunities.existsForContact(
    locationId,
    contactId,
    pipelineId
  );

  if (existing) {
    // Check if it's in a terminal status
    if (['won', 'lost', 'abandoned'].includes(existing.status)) {
      console.log('Opportunity already closed, skipping');
      return existing;
    }

    // Update existing opportunity
    console.log('Updating existing opportunity');
    return await client.opportunities.update(existing.id, {
      monetaryValue: 5000,
      assignedTo: 'new-user-id',
    });
  }

  // Find the correct stage
  const stage = await client.opportunities.findStageByName(
    locationId,
    pipelineId,
    'Qualified'
  );

  if (!stage) {
    throw new Error('Stage "Qualified" not found');
  }

  // Create new opportunity
  const opportunity = await client.opportunities.create({
    locationId,
    name: 'Enterprise Deal',
    pipelineId,
    pipelineStageId: stage.id,
    contactId,
    monetaryValue: 5000,
    status: 'open',
  });

  console.log('Created opportunity:', opportunity);
  return opportunity;
}

/**
 * Example 3: Assign opportunity to user by email
 */
async function example3_UserLookupAndAssignment() {
  const locationId = process.env.GHL_LOCATION_ID!;
  const opportunityId = 'your-opportunity-id';
  const userEmail = 'sales@example.com';

  // Find user by email
  const user = await client.users.findByEmail(locationId, userEmail);

  if (!user) {
    throw new Error(`User with email ${userEmail} not found`);
  }

  // Assign opportunity to user
  const opportunity = await client.opportunities.update(opportunityId, {
    assignedTo: user.id,
  });

  console.log('Assigned opportunity to user:', user.name);
  return opportunity;
}

/**
 * Example 4: Pipeline caching for performance
 */
async function example4_PipelineCaching() {
  const locationId = process.env.GHL_LOCATION_ID!;

  // First call - fetches from API
  console.time('First pipeline fetch');
  const pipelines1 = await client.opportunities.loadPipelinesCache(locationId);
  console.timeEnd('First pipeline fetch');

  // Second call - uses cache (much faster)
  console.time('Cached pipeline fetch');
  const pipelines2 = await client.opportunities.loadPipelinesCache(locationId);
  console.timeEnd('Cached pipeline fetch');

  // Iterate through pipelines
  for (const [pipelineId, pipeline] of pipelines2) {
    console.log(`Pipeline: ${pipeline.name}`);
    for (const stage of pipeline.stages) {
      console.log(`  - Stage: ${stage.name} (${stage.id})`);
    }
  }

  // Clear cache when needed
  client.opportunities.clearPipelineCache(locationId);
}

/**
 * Example 5: Upsert pattern (create or update)
 */
async function example5_UpsertPattern() {
  const locationId = process.env.GHL_LOCATION_ID!;

  // Upsert contact - creates if doesn't exist, updates if it does
  const contact = await client.contacts.upsert({
    locationId,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    tags: ['customer'], // Will overwrite existing tags
  });

  console.log('Upserted contact:', contact);
  return contact;
}

/**
 * Example 6: Error handling
 */
async function example6_ErrorHandling() {
  try {
    const contact = await client.contacts.get('invalid-id');
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log('Contact not found');
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      console.log('Authentication error - check your API key');
    } else if (error.shouldRetry) {
      console.log('Temporary error, will be retried automatically');
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}

/**
 * Example 7: Batch operations
 */
async function example7_BatchOperations() {
  const locationId = process.env.GHL_LOCATION_ID!;

  const contactsToCreate = [
    { firstName: 'Alice', email: 'alice@example.com' },
    { firstName: 'Bob', email: 'bob@example.com' },
    { firstName: 'Charlie', email: 'charlie@example.com' },
  ];

  // Create all contacts in parallel
  const contacts = await Promise.all(
    contactsToCreate.map(data =>
      client.contacts.create({
        locationId,
        ...data,
      })
    )
  );

  console.log(`Created ${contacts.length} contacts`);
  return contacts;
}

// Run examples
async function main() {
  try {
    console.log('Example 1: Contact Management');
    await example1_ContactManagement();

    console.log('\nExample 2: Opportunity Management');
    await example2_OpportunityManagement();

    console.log('\nExample 3: User Lookup and Assignment');
    await example3_UserLookupAndAssignment();

    console.log('\nExample 4: Pipeline Caching');
    await example4_PipelineCaching();

    console.log('\nExample 5: Upsert Pattern');
    await example5_UpsertPattern();

    console.log('\nExample 6: Error Handling');
    await example6_ErrorHandling();

    console.log('\nExample 7: Batch Operations');
    await example7_BatchOperations();
  } catch (error) {
    console.error('Error in examples:', error);
  }
}

// Uncomment to run
// main();

/**
 * OAuth 2.0 Flow Example for @pixel/ghl-client
 *
 * This example demonstrates the complete OAuth flow:
 * 1. Generate authorization URL
 * 2. Handle callback and exchange code for tokens
 * 3. Use tokens with GHLClient
 * 4. Refresh tokens when needed
 */

import { GHLClient, OAuthClient } from '../src';

// OAuth configuration
const oauthClient = new OAuthClient({
  clientId: process.env.GHL_CLIENT_ID!,
  clientSecret: process.env.GHL_CLIENT_SECRET!,
  redirectUri: process.env.GHL_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  scopes: [
    'contacts.readonly',
    'contacts.write',
    'opportunities.readonly',
    'opportunities.write',
    'users.readonly',
  ],
});

/**
 * Step 1: Generate authorization URL and redirect user
 */
function step1_GenerateAuthUrl() {
  const authUrl = oauthClient.getAuthorizationUrl({
    state: generateRandomState(), // Use a secure random string
  });

  console.log('Redirect user to:', authUrl);
  return authUrl;
}

/**
 * Step 2: Handle OAuth callback
 * This would be your callback endpoint (e.g., Express route)
 */
async function step2_HandleCallback(code: string, state: string) {
  // Verify state matches what you sent (important for security!)
  if (state !== getStoredState()) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  // Exchange authorization code for tokens
  const tokens = await oauthClient.exchangeCodeForToken(code);

  console.log('Access token received:', tokens.access_token);
  console.log('Refresh token received:', tokens.refresh_token);
  console.log('Expires in:', tokens.expires_in, 'seconds');
  console.log('Location ID:', tokens.locationId);
  console.log('Company ID:', tokens.companyId);

  // Calculate expiration timestamp
  const expiresAt = oauthClient.calculateExpiresAt(tokens.expires_in);

  // Store tokens securely (database, encrypted storage, etc.)
  await storeTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    locationId: tokens.locationId,
    companyId: tokens.companyId,
  });

  return tokens;
}

/**
 * Step 3: Create GHL client with OAuth tokens
 */
async function step3_CreateClientWithTokens() {
  const tokens = await getStoredTokens();

  const client = new GHLClient({
    auth: {
      type: 'oauth',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      onTokenRefresh: async (newTokens) => {
        // Automatically save refreshed tokens
        console.log('Tokens refreshed automatically');
        await storeTokens(newTokens);
      },
    },
    locationId: tokens.locationId,
    debug: true,
  });

  // Use the client
  const contacts = await client.contacts.search({
    locationId: tokens.locationId,
    limit: 10,
  });

  console.log('Found', contacts.length, 'contacts');
  return client;
}

/**
 * Step 4: Manually refresh tokens when needed
 */
async function step4_RefreshTokens() {
  const tokens = await getStoredTokens();

  // Check if token is expired (with 5-minute buffer)
  if (oauthClient.isTokenExpired(tokens.expiresAt, 300)) {
    console.log('Access token expired, refreshing...');

    // Refresh the token
    const newTokens = await oauthClient.refreshToken(tokens.refreshToken);

    // Calculate new expiration
    const expiresAt = oauthClient.calculateExpiresAt(newTokens.expires_in);

    // Store new tokens
    await storeTokens({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt,
      locationId: tokens.locationId,
      companyId: tokens.companyId,
    });

    console.log('Tokens refreshed successfully');
    return newTokens;
  }

  console.log('Token still valid');
  return tokens;
}

/**
 * Complete OAuth flow with Express
 */
function exampleExpressIntegration() {
  // Pseudo-code for Express integration
  const express = require('express');
  const app = express();

  // Step 1: Initiate OAuth flow
  app.get('/auth/gohighlevel', (req, res) => {
    const state = generateRandomState();
    // Store state in session for verification
    req.session.oauthState = state;

    const authUrl = oauthClient.getAuthorizationUrl({ state });
    res.redirect(authUrl);
  });

  // Step 2: Handle callback
  app.get('/auth/gohighlevel/callback', async (req, res) => {
    try {
      const { code, state, error, error_description } = req.query;

      // Check for errors
      if (error) {
        return res.status(400).send(`OAuth error: ${error_description}`);
      }

      // Verify state
      if (state !== req.session.oauthState) {
        return res.status(400).send('Invalid state parameter');
      }

      // Exchange code for tokens
      const tokens = await oauthClient.exchangeCodeForToken(code);

      // Store tokens in session or database
      req.session.tokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: oauthClient.calculateExpiresAt(tokens.expires_in),
        locationId: tokens.locationId,
      };

      // Redirect to success page
      res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Use the client in your routes
  app.get('/api/contacts', async (req, res) => {
    try {
      const tokens = req.session.tokens;

      if (!tokens) {
        return res.status(401).send('Not authenticated');
      }

      // Check if token needs refresh
      if (oauthClient.isTokenExpired(tokens.expiresAt)) {
        const newTokens = await oauthClient.refreshToken(tokens.refreshToken);
        tokens.accessToken = newTokens.access_token;
        tokens.refreshToken = newTokens.refresh_token;
        tokens.expiresAt = oauthClient.calculateExpiresAt(newTokens.expires_in);
        req.session.tokens = tokens;
      }

      // Create client
      const client = new GHLClient({
        auth: {
          type: 'oauth',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
      });

      // Use the client
      const contacts = await client.contacts.search({
        locationId: tokens.locationId,
        limit: 100,
      });

      res.json({ contacts });
    } catch (error) {
      console.error('API error:', error);
      res.status(500).send('Internal server error');
    }
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// Helper functions (implement based on your storage solution)

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getStoredState(): string {
  // Implement based on your session management
  return '';
}

async function storeTokens(tokens: any): Promise<void> {
  // Implement based on your storage solution (database, Redis, etc.)
  console.log('Storing tokens:', tokens);
}

async function getStoredTokens(): Promise<any> {
  // Implement based on your storage solution
  return {
    accessToken: '',
    refreshToken: '',
    expiresAt: 0,
    locationId: '',
    companyId: '',
  };
}

// Export for use in your application
export {
  step1_GenerateAuthUrl,
  step2_HandleCallback,
  step3_CreateClientWithTokens,
  step4_RefreshTokens,
  oauthClient,
};

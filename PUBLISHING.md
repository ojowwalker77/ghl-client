# Publishing Guide

This document explains how to publish new versions of `@ojowwalker/ghl-client` to npm.

## Prerequisites

1. **npm Account**: You must have an npm account with publishing rights to the `@ojowwalker` scope
2. **GitHub Repository Access**: Push access to the repository
3. **npm Token**: Set up `NPM_TOKEN` secret in GitHub repository settings

## Setting Up npm Token

1. Generate an npm token:
   ```bash
   npm login
   npm token create --read-only=false
   ```

2. Add the token to GitHub:
   - Go to: `Settings` → `Secrets and variables` → `Actions`
   - Click `New repository secret`
   - Name: `NPM_TOKEN`
   - Value: Your npm token
   - Click `Add secret`

## Publishing Workflow

### Automated Publishing (Recommended)

Publishing is **automated via GitHub Actions** when you create a new release:

1. **Update the version** in `package.json`:
   ```bash
   # For a patch release (0.1.0 -> 0.1.1)
   npm version patch

   # For a minor release (0.1.0 -> 0.2.0)
   npm version minor

   # For a major release (0.1.0 -> 1.0.0)
   npm version major
   ```

2. **Push the version commit and tag**:
   ```bash
   git push && git push --tags
   ```

3. **Create a GitHub Release**:
   - Go to: `Releases` → `Create a new release`
   - Choose the tag you just pushed
   - Write release notes (what's new, what changed, breaking changes)
   - Click `Publish release`

4. **Automated workflow runs**:
   - GitHub Actions will automatically:
     - Run type checking
     - Run all tests
     - Build the package
     - Publish to npm with provenance

5. **Verify publication**:
   ```bash
   npm view @ojowwalker/ghl-client
   ```

### Manual Publishing (Not Recommended)

Only use this for testing or emergencies:

```bash
# 1. Ensure you're on the main branch and it's clean
git checkout main
git pull

# 2. Update version
npm version patch  # or minor/major

# 3. The prepublishOnly script will run automatically
npm publish --access public

# 4. Push the version tag
git push && git push --tags
```

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

## What Gets Published

The npm package includes only:
- `dist/` - Built JavaScript and TypeScript declarations
- `README.md` - Package documentation
- `LICENSE` - MIT license
- `CHANGELOG.md` - Version history
- `package.json` - Package metadata

**Excluded** (not published):
- `src/` - Source TypeScript files
- `examples/` - Example code
- `.github/` - GitHub workflows
- Test files
- Development configs

## Pre-publish Checks

The `prepublishOnly` script automatically runs:
1. TypeScript type checking (`bun run typecheck`)
2. All tests (`bun test`)
3. Build process (`bun run build`)

If any of these fail, publishing is aborted.

## Testing Before Publishing

Test the package contents without publishing:

```bash
# Create a tarball locally
npm pack

# Check what files will be included
tar -tzf ojowwalker-ghl-client-*.tgz

# Test installing the package locally
cd /tmp/test-project
npm install /path/to/ghl-client/ojowwalker-ghl-client-*.tgz
```

## Updating CHANGELOG

Before each release, update `CHANGELOG.md`:

```markdown
## [0.2.0] - 2024-11-27

### Added
- New feature X
- New feature Y

### Changed
- Updated behavior of Z

### Fixed
- Bug in component A
```

## Troubleshooting

### "You do not have permission to publish"
- Verify you're logged into npm: `npm whoami`
- Check you have access to the `@ojowwalker` scope
- Contact the scope owner to grant you access

### "Version already exists"
- Update the version in `package.json`
- You cannot republish the same version

### GitHub Action fails
- Check the `NPM_TOKEN` secret is set correctly
- Verify tests and build pass locally
- Check the workflow logs in the Actions tab

## Package Provenance

This package is published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), which:
- Links the package to the source code
- Shows where and how the package was built
- Increases supply chain security
- Is visible on the npm package page

# Changesets

This directory is used by [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs for the `@traek/*` packages.

## Workflow

1. **After making changes**, run `pnpm changeset` to create a changeset describing your change.
2. **On merge to main**, the CI will detect pending changesets.
3. **To release**, the maintainer runs `pnpm changeset version` (bumps versions + updates changelogs) and pushes a tag to trigger the `publish.yml` workflow.

## Quick Reference

```bash
# Create a changeset (interactive)
pnpm changeset

# Bump versions based on pending changesets
pnpm changeset version

# Publish (done automatically via publish.yml on tag push)
pnpm changeset publish
```

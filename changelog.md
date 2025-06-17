# 🎁 Complete Release History

## Initial Release: `v0.1.0`

### Initial Commits

- 2b0f1dc (HEAD -> main, tag: v0.1.0, origin/main) feat: Implement dynamic pagination with visible items and ellipsis - ([Thomas David](https://codeberg.org/tjdavid))
- 6b4d75f test: add fixtures to cover visibility feature - ([Thomas David](https://codeberg.org/tjdavid))
- 70f5a4b add npm ignore list - ([Thomas David](https://codeberg.org/tjdavid))
- 48cf1e0 docs: Add custom pager template user guide - ([Thomas David](https://codeberg.org/tjdavid))
- 065ff1a feat(pagination): improve pagination handling with dynamic path and adjusted length calculation - ([Thomas David](https://codeberg.org/tjdavid))
- ea200fe types: add visible property to pagination configuration - ([Thomas David](https://codeberg.org/tjdavid))
- 4f68032 chore: update pnpm, coralite peer dep and rename build script - ([Thomas David](https://codeberg.org/tjdavid))
- 1a4ebc2 docs: add readme - ([Thomas David](https://codeberg.org/tjdavid))
- 762a507 fix: correct pagination length calculation and offset generation - ([Thomas David](https://codeberg.org/tjdavid))
    Adjust pagination logic to use calculated `paginationLength` for determining
    page counts and offsets, ensuring accurate rendering of paginated content.

- 74ba4a0 fix: simplify page limit handling by removing array check and using offset correctly - ([Thomas David](https://codeberg.org/tjdavid))
- 2cf82e6 refactor: Use tokens instead of values in component definitions - ([Thomas David](https://codeberg.org/tjdavid))
- b5fde9d fix: fix previous navigation link generation in pagination - ([Thomas David](https://codeberg.org/tjdavid))
    Correctly adjust the "Previous" link href based on current index to ensure proper
    navigation when on pages beyond the second one. The fix updates the logic to
    reference the correct page number for the previous item, resolving invalid
    navigation links in multi-page scenarios.
    
    - Removed hardcoded index increments
    - Added dynamic calculation based on current page position

- 8b50d9d fix(pagination): use correct length value and adjust skip condition - ([Thomas David](https://codeberg.org/tjdavid))
- 4879d44 refactor: rename values to tokens in pagination_list - ([Thomas David](https://codeberg.org/tjdavid))
- 3b06c3c chore: upgrade coralite to 0.11.1 - ([Thomas David](https://codeberg.org/tjdavid))
- cfa07cb chore: update coralite to 0.10.0 - ([Thomas David](https://codeberg.org/tjdavid))
- 320f665 chore: add "type": "module" to package.json - ([Thomas David](https://codeberg.org/tjdavid))
- 0ad0f60 chore: update repository and issues URLs in package.json - ([Thomas David](https://codeberg.org/tjdavid))
- 679b3cf fix: use import.meta.dirname for template path - ([Thomas David](https://codeberg.org/tjdavid))
- 093b1ea fix: ensure context scope for new components - ([Thomas David](https://codeberg.org/tjdavid))
- f118211 refactor: update metadata processing to use name and content in filter - ([Thomas David](https://codeberg.org/tjdavid))
- 8d2a0e4 refactor: ensure consistent path formatting for pagination links - ([Thomas David](https://codeberg.org/tjdavid))
- 58bd08f fix: update pagination logic to skip when no directory name - ([Thomas David](https://codeberg.org/tjdavid))
- 7af1188 fix: token name spacing conflict - ([Thomas David](https://codeberg.org/tjdavid))
- 27a448a types: update CoraliteAggregate type to use string[] for path and add pagination.id - ([Thomas David](https://codeberg.org/tjdavid))
- 26b8b9a refactor: remove webServer config and update type imports in index.js - ([Thomas David](https://codeberg.org/tjdavid))
- 5fdc416 refactor(test): update posts aggregation parameters and add pagination support - ([Thomas David](https://codeberg.org/tjdavid))
    Refactor the posts aggregation logic to use `limit` instead of `pages`, split path into array,
    and add optional pagination configuration. This improves consistency and enables pagination.
    
    BREAKING CHANGE: The `pages` parameter has been replaced with `limit`. Existing code using `pages`
    may need adjustment to work with this change.

- 1a1d9af chore: remove unused blog index.html test fixture - ([Thomas David](https://codeberg.org/tjdavid))
- 398b775 refactor: wrap post title in link and remove coralite-header - ([Thomas David](https://codeberg.org/tjdavid))
- 12f9e54 tests: add blog posts fixtures - ([Thomas David](https://codeberg.org/tjdavid))
- 314b7e6 test: add index.html test fixture for paginated blog posts - ([Thomas David](https://codeberg.org/tjdavid))
- 19eb540 feat: add default coralite-pagination template - ([Thomas David](https://codeberg.org/tjdavid))
- 165ec10 fix(pagination): correct path handling and context value processing - ([Thomas David](https://codeberg.org/tjdavid))
    Use context.document.path instead of document.path to ensure accurate directory resolution.
    Introduce processed flag to prevent redundant pagination value computation.
    Update pagination template rendering to use context-aware values.
    
    BREAKING CHANGE: Pagination template behavior may change due to updated value context

- 8c0ea5a refactor: use context values and document in createComponent - ([Thomas David](https://codeberg.org/tjdavid))
- 59bd962 chore: remove html meta data processing logic - ([Thomas David](https://codeberg.org/tjdavid))
- 78b3bb0 fix: use context values - ([Thomas David](https://codeberg.org/tjdavid))
- f2c32d1 feat: support multiple aggregate paths in plugin method - ([Thomas David](https://codeberg.org/tjdavid))
- 5703d63 refactor: use page.result.meta instead of parsing HTML meta tags - ([Thomas David](https://codeberg.org/tjdavid))
- 7dbcc2c fix: handle excluding self reference in aggregation - ([Thomas David](https://codeberg.org/tjdavid))
- ca2f228 feat(test): Update blog posts test to exclude current page and adjust component structure - ([Thomas David](https://codeberg.org/tjdavid))
- 487a0b0 chore: Update script paths, pnpm version, and move coralite to peerDependencies - ([Thomas David](https://codeberg.org/tjdavid))
- 86af8d5 chore: update package metadata - ([Thomas David](https://codeberg.org/tjdavid))
- 6e9d733 chore: add jsconfig.json for TypeScript configuration - ([Thomas David](https://codeberg.org/tjdavid))
- 4b1fd18 build: add Playwright E2E tests and update build tools - ([Thomas David](https://codeberg.org/tjdavid))
- 1a4e8a0 chore: add coralite config to enable aggregation plugin - ([Thomas David](https://codeberg.org/tjdavid))
- 85be5fd fix: Update coralite import path to utils module - ([Thomas David](https://codeberg.org/tjdavid))
- 1a46a51 chore: update .gitignore with additional patterns - ([Thomas David](https://codeberg.org/tjdavid))

### Metadata
```
First version ------- v0.1.0
Total commits ------- 47
```

## Summary
```
Total releases ------ 1
Total commits ------- 47
```

# Coralite Aggregation Plugin

A [Coralite](https://coralite.dev) plugin for aggregating pages (like blog posts) with built-in support for filtering, sorting, and pagination.

## Installation

```bash
pnpm add coralite-plugin-aggregation
# or
npm install coralite-plugin-aggregation
```

## Usage

First, register the plugin in your Coralite configuration (e.g., `coralite.config.js` or wherever you initialize Coralite).

```javascript
import { Coralite } from 'coralite'
import { aggregation } from 'coralite-plugin-aggregation'

const coralite = new Coralite({
  // ... other config
  plugins: [aggregation]
})
```

Then, you can use the `aggregation` function within your component templates.

### Example: Blog List

Create a template for individual items (e.g., `templates/coralite-post.html`):

```html
<template id="coralite-post">
  <article class="post">
    <h2><a href="{{ $urlPathname }}">{{ meta_title }}</a></h2>
    <p>{{ meta_description }}</p>
  </article>
</template>
```

Create a component to list them (e.g., `templates/blog-list.html`):

```html
<template id="blog-list">
  <div class="posts">
    {{ posts }}
  </div>
</template>

<script type="module">
  import { defineComponent } from 'coralite'
  import { aggregation } from 'coralite/plugins'

  export default defineComponent({
    tokens: {
      posts: async () => {
        return await aggregation({
          // Path to aggregate pages from (relative to pages directory)
          path: ['blog'],
          // Template ID to render for each item
          template: 'coralite-post',
          // Sort by date descending (assuming meta_date exists)
          sort: (a, b) => new Date(b.meta_date) - new Date(a.meta_date),
          // Limit items per page
          limit: 10,
          // Enable pagination
          pagination: {
            segment: 'page', // URL segment: /blog/page/1
            maxVisible: 5,   // Max pagination links to show
            ariaLabel: 'Blog Pagination',
            ellipsis: '...'
          }
        })
      }
    }
  })
</script>
```

## Configuration

The `aggregation` function accepts an options object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string[]` | Array of paths to aggregate pages from, relative to the `pages` directory. |
| `template` | `string` | The ID of the template component to use for rendering each aggregated item. |
| `limit` | `number` | Maximum number of items to display per page. |
| `offset` | `number` | Starting index for the results (default: 0). |
| `recursive` | `boolean` | Whether to recursively search subdirectories (default: `false`). |
| `filter` | `function` | Callback to filter pages. Receives page values, returns `true`/`false`. |
| `sort` | `function` | Callback to sort pages. Receives `(a, b)` values. |
| `tokens` | `Object` | Map of token names to transform functions or value keys. |
| `pagination` | `Object` | Pagination configuration object. |

### Pagination Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `segment` | `string` | `'page'` | The URL segment used for pagination (e.g., `/page/2`). |
| `maxVisible` | `number` | `5` | Maximum number of visible page links in the pagination control. |
| `ariaLabel` | `string` | `'Pagination'` | Aria label for the navigation element. |
| `ellipsis` | `string` | `'...'` | Text to display for truncated page links. |
| `template` | `string` | `'coralite-pagination'` | Custom template ID for the pagination control. |

## How Pagination Works

When `pagination` is enabled and `limit` is set:

1.  **Automatic Page Generation**: If placed on a root page (e.g., `/blog/index.html`), the plugin automatically generates virtual pages for subsequent pages (e.g., `/blog/page/2.html`, `/blog/page/3.html`).
2.  **Context Aware**: It detects the current page from the URL to determine the correct offset and active page state.
3.  **Default Template**: A default Bootstrap-compatible pagination template (`coralite-pagination`) is provided out of the box.

## License

AGPL-3.0-or-later

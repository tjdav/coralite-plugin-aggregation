# Coralite Aggregation Plugin

[![npm version](https://img.shields.io/npm/v/coralite-plugin-aggregation.svg)](https://www.npmjs.com/package/coralite-plugin-aggregation)
[![License](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](https://codeberg.org/tjdavid/coralite-plugin-aggregation/src/branch/main/LICENSE)

A [Coralite](https://coralite.dev) plugin for aggregating pages (like blog posts) with built-in support for filtering, sorting, and pagination.

## Installation

```bash
pnpm add coralite-plugin-aggregation
# or
npm install coralite-plugin-aggregation
```

## Usage

First, register the plugin in your Coralite configuration (`coralite.config.js` or when initializing Coralite).

```javascript
import { createCoralite } from 'coralite'
import aggregation from 'coralite-plugin-aggregation'

const app = await createCoralite({
  output: './dist',
  pages: './src/pages',
  components: './src/components',
  plugins: [
    // Instantiate the plugin by calling the factory function
    aggregation()
  ]
})
```

You can also pass pre-defined static configurations to the plugin factory:

```javascript
plugins: [
  aggregation([
    {
      name: 'blog',
      path: ['blog'],
      component: 'coralite-post',
      limit: 10,
      page: 'blog.html', // Required for pre-registering pagination links in onBeforeBuild
      pagination: {
        segment: 'page',
        maxVisible: 5
      }
    }
  ])
]
```

Then, you can use the aggregation functions inside your component's `server` blocks.

### Example: Blog List

Create a component for individual items (e.g., `components/coralite-post.html`):

```html
<template id="coralite-post">
  <article class="post">
    <h2><a href="{{ url }}">{{ title }}</a></h2>
    <p>{{ description }}</p>
  </article>
</template>

<script type="module">
  import { defineComponent } from 'coralite'

  export default defineComponent({
    server: ({ page }) => {
      return {
        url: page.url.pathname,
        title: page.meta.title || 'Untitled',
        description: page.meta.description || ''
      }
    }
  })
</script>
```

Create a component to list them (e.g., `components/blog-list.html`). You can either pass inline options:

```html
<template id="blog-list">
  <div class="posts">
    {{ posts }}
  </div>
</template>

<script type="module">
  import { defineComponent } from 'coralite'

  export default defineComponent({
    server: async (context) => {
      const posts = await context.aggregation.aggregate({
        // Path to aggregate pages from (relative to pages directory)
        path: ['blog'],
        // Template ID to render for each item
        component: 'coralite-post',
        // Sort by date descending (assuming meta.date exists)
        sort: (a, b) => new Date(b.meta.date) - new Date(a.meta.date),
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

      return {
        posts
      }
    }
  })
</script>
```

Or reference a pre-defined static configuration by its name:

```javascript
server: async (context) => {
  const posts = await context.aggregation.aggregate('blog')
  return { posts }
}
```

## Configuration

The `aggregate` function accepts either a configuration name `string` or an options object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `path` | `string[]` | Array of paths to aggregate pages from, relative to the `pages` directory. |
| `component` | `string` | The ID of the component to use for rendering each aggregated item. |
| `limit` | `number` | Maximum number of items to display per page. |
| `offset` | `number` | Starting index for the results (default: 0). |
| `recursive` | `boolean` | Whether to recursively search subdirectories (default: `false`). |
| `filter` | `function` | Callback to filter pages. Receives page values, returns `true`/`false`. |
| `sort` | `function` | Callback to sort pages. Receives `(a, b)` values. |
| `transformState` | `Object` | Map of property names to transform functions or source property keys. |
| `pagination` | `Object` | Pagination configuration object. |

### Pagination Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `segment` | `string` | `'page'` | The URL segment used for pagination (e.g., `/page/2`). |
| `maxVisible` | `number` | `5` | Maximum number of visible page links in the pagination control. |
| `ariaLabel` | `string` | `'Page navigation'` | Aria label for the navigation element. |
| `ellipsis` | `string` | `'...'` | Text to display for truncated page links. |
| `component` | `string` | `'coralite-pagination'` | Custom component ID for the pagination control. |

### Transform State

The `transformState` option allows you to remap or transform the state of each aggregated item before it's passed to the item template. This is useful for mapping metadata keys to the properties expected by your component.

```javascript
const posts = await context.aggregation.aggregate({
  path: ['blog'],
  component: 'coralite-post',
  transformState: {
    // Map 'meta.title' from the page to 'displayTitle' in the component
    displayTitle: 'title',
    // Use a function for more complex transformations
    excerpt: (state) => state.description.substring(0, 100) + '...',
    // Pass through or format dates
    date: (state) => new Date(state.date).toLocaleDateString()
  }
})
```

## How Pagination Works

When `pagination` is enabled and `limit` is set:

1.  **Automatic Page Generation**: During the pre-build phase (`onBeforeBuild`), the plugin automatically discovers any paginated aggregate configurations (either pre-defined or declared inline inside page components) and pre-registers virtual pages (e.g., `/blog/page/2.html`, `/blog/page/3.html`).
2.  **Context Aware**: It detects the current page from the URL to determine the correct offset and active page state.
3.  **Default Template**: A default Bootstrap-compatible pagination component (`coralite-pagination`) is provided out of the box.

## License

MPL-2.0

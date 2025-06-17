# Coralite Aggregation Plugin

The **Coralite Aggregation Plugin** is a powerful tool designed to help developers dynamically collect, filter, sort, and display content across multiple sources within a Coralite project.


- [Installation](#installation)
- [Example](#example)
- [Type definition](#types)
- [Custom pager](#custom-pager)

---

## Features

- **Content Aggregation**: Gather content from multiple files or directories using path patterns (e.g., `blog/`, `['products/all','blog/']`).
- **Filtering & Sorting**: Use metadata-based filters and custom sort functions to refine results based on attributes like tags, categories, dates, or tokens.
- **Pagination Support**: Easily create paginated views with customizable templates for navigation controls and visible page links.
- **Token Handling**: Configure token aliases, defaults, and metadata mapping.

---

## Coralite Aggregation Plugin Guide

### Installation {#installation}  

```bash
npm install coralite-plugin-aggregation
```

### Setup Configuration
First, enable the plugin in your `coralite.config.js`:

```js
// coralite.config.js
import aggregation from 'coralite-plugin-aggregation'

export default {
  plugins: [aggregation]
}
```

> **Note**: The plugin must be imported as `'coralite-plugin-aggregation'` for compatibility with the core Coralite framework.

---

### Example Implementation {#example} 

#### Entry Point: Displaying Aggregated Results
Create a file like `coralite-posts.html` to define your aggregation logic and rendering template:

```html
<!-- templates/coralite-posts.html -->
<template id="coralite-posts">
  <div>
    {{ posts }}
    <!-- Pagination controls will be injected automatically if enabled. -->
  </div>
</template>

<script type="module">
import { defineComponent, aggregation } from 'coralite'

export default defineComponent({
  tokens: {
    // Aggregation function returns an array of content items.
    posts() {
      return aggregation({
        path: ['products'],              // Source directory.
        template: 'coralite-post',       // Template ID for individual items.
        limit: 20,                       // Maximum number of results per page.
        recursive: true,                 // Include subdirectories.
        pagination: {
          token: 'post_count',           // Page size control token.
          template: 'coralite-pagination', // Template for pagination controls.
          path: 'page',                  // Infix for paginated URLs (e.g., `page/1`).
          visible: 5                     // Max number of visible page links.
        },
        filter(meta) {
          return meta.name === 'category' && meta.content === 'tech'
        },
        sort(a, b) {
          return new Date(b.date) - new Date(a.date)
        },
        tokens: {
          default: {
            author: 'Anonymous',
            category: 'uncategorized'
          },
          aliases: {
            tags: ['tech', 'news', 'tutorial']
          }
        }
      })
    }
  }
})
</script>
```

#### Aggregated Content Files
Each file to be aggregated must include metadata via `<meta>` elements. For example:

```html
<!-- pages/products/product-1.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="title" content="Great Barrier Reef" />
  <meta name="description" content="The Great Barrier Reef—largest, comprising over 2,900 individual reefs and 900 islands stretching for over 2,600 kilometers." />
  <meta name="price" content="1000" />
  <meta name="published_time" content="2025-01-08T20:23:07.645Z" />
</head>
<body>
  <coralite-header>
    <h1>Great Barrier Reef</h1>
  </coralite-header>
  <coralite-author name="Nemo" datetime="2025-01-08T20:23:07.645Z"></coralite-author>
</body>
</html>
```

#### Single Result Template
Define a `<template>` element for rendering individual items:

```html
<!-- templates/coralite-post.html -->
<template id="coralite-post">
  <div class="post-item">
    <h2>{{ $title }}</h2>
    <p>{{ $description }} - {{ formattedPrice }}</p>
  </div>
</template>

<script type="module">
import { defineComponent } from 'coralite'

export default defineComponent({
  tokens: {
    // Custom token to format prices using Intl.NumberFormat.
    formattedPrice(values) {
      return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
        values.$price
      )
    }
  }
})
</script>
```

> **Token Syntax**: Metadata attributes are accessed in templates as `$<meta name>`. For example, the `<meta name="title">` element is referenced using `$title`.


### Configuration Options {#types}

#### `CoraliteAggregate` {#coralite-aggregate}  
Configuration object for content aggregation processes.  

| Property        | Type                                                                 | Description                                                                                     | Reference |
|-----------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|-----------|
| `path`          | `string[]`                                                         | Array of paths relative to the pages directory (e.g., `['products', 'blog/']`).               | -         |
| `template`      | `CoraliteAggregateTemplate` or `string`                            | Templates used to display the result. Must match an existing `<template>` element by ID.     | [CoraliteAggregateTemplate](#coralite-aggregate-template) |
| `pagination`    | `Object`                                                           | Pagination settings (optional).                                                              | -         |
| `filter`        | [`CoraliteAggregateFilter`](#coralite-aggregate-filter)            | Callback to filter out unwanted elements from the aggregated content.                         | [CoraliteAggregateFilter](#coralite-aggregate-filter) |
| `recursive`     | `boolean`                                                          | Whether to recursively search subdirectories.                                                 | -         |
| `tokens`        | [`CoraliteTokenOptions`](#coralite-token-options)                  | Token configuration options (optional).                                                       | [CoraliteTokenOptions](#coralite-token-options) |
| `sort`          | [`CoraliteAggregateSort`](#coralite-aggregate-sort)                | Sort aggregated pages.                                                                      | [CoraliteAggregateSort](#coralite-aggregate-sort) |
| `limit`         | `number`                                                           | Maximum number of results to retrieve (used with pagination).                                 | -         |
| `offset`        | `number`                                                           | Starting index for the results list (used with pagination).                                   | -         |

---

#### `CoraliteAggregateTemplate` {#coralite-aggregate-template}  
Configuration for templates used to render aggregated results.  

| Property | Type      | Description                                                                 | Reference |
|----------|-----------|-----------------------------------------------------------------------------|-----------|
| `item`   | `string`  | Unique identifier for the component used for each document (e.g., `'coralite-post'`). | -         |

---

#### `CoraliteTokenOptions` {#coralite-token-options}  
Configuration options for token handling during processing.  

| Property     | Type                                                  | Description                                                                 |
|--------------|-------------------------------------------------------|-----------------------------------------------------------------------------|
| `default`    | `Object.<string, string>`                             | Default token values for properties not explicitly set (e.g., `{ author: 'Anonymous' }`). |
| `aliases`    | `Object.<string, string[]>`                           | Token aliases and their possible values (e.g., `{ tags: ['tech', 'news'] }`). |

---

#### `CoraliteAggregateFilter` {#coralite-aggregate-filter}  
Callback function for filtering aggregated content based on metadata.  

| Parameter     | Type                                | Description                                                                 |
|---------------|-------------------------------------|-----------------------------------------------------------------------------|
| `metadata`    | [`CoraliteToken`](#coralite-token)  | Aggregated HTML page metadata (e.g., `{ name: 'category', content: 'tech' }`). |

---

#### `CoraliteAggregateSort` {#coralite-aggregate-sort}  
Callback function for sorting aggregated results based on metadata.  

| Parameter | Type                                | Description                                                                 |
|-----------|-------------------------------------|-----------------------------------------------------------------------------|
| `a`       | `Object.<string, string>`           | Metadata of the first item being compared (e.g., `{ date: '2025-01-08' }`). |
| `b`       | `Object.<string, string>`           | Metadata of the second item being compared.                                   |

---

#### `CoraliteToken` {#coralite-token}  
A representation of a token with name and value.  

| Property | Type   | Description                                                                 |
|----------|--------|-----------------------------------------------------------------------------|
| `name`   | `string`  | Token identifier (e.g., `'title'`, `'category'`).                            |
| `content`| `string`  | Token value or content (e.g., `'Great Barrier Reef'`, `'tech'`).            |

---

## Custom Pager Template User Guide for Coralite Pagination Component  {#custom-pager}  

This guide explains how to create a custom pagination template using the existing `coralite-pagination` component as a reference. The goal is to define a new pager layout below the default implementation, preserving compatibility with the core logic while enabling customization.

---

### Create a New Template Element
Define a unique `<template>` element for your custom pager. Use an ID distinct from the default (`coralite-pagination`) to avoid conflicts:

```html
<template id="coralite-pagination-custom">
  {{ pagination_list }}
</template>
```

---

### Implement Custom Logic in `<script type="module">`
Replace or extend the `pagination_list` token function with your custom logic. The core structure remains compatible with Coralite’s API, but you can modify rendering rules (e.g., ellipsis behavior, link formatting).

#### Example: Basic Custom Token Function
```javascript
<script type="module">
  import { defineComponent } from 'coralite'

  export default defineComponent({
    tokens: {
      /**
       * @param {Object} values
       * @param {string} values.pagination_visible - Max number of visible pages items.
       * @param {string} values.pagination_offset - Number of items to skip from the beginning (offset for pagination)
       * @param {string} values.pagination_index - Base URL path for generating pagination links
       * @param {string} values.pagination_dirname - Directory path component for routing context
       * @param {string} values.pagination_length - Total number of items across all pages
       * @param {string} values.pagination_current - Currently active page number or identifier
       */
      pagination_list (values) {
        const length = parseInt(values.pagination_length)
        if (!length) return ''

        // Custom logic: render a simplified pager with only previous/next and current page
        const currentPage = parseInt(values.pagination_current)
        const dirname = values.pagination_dirname[0] === '/' ? values.pagination_dirname : '/' + values.pagination_dirname

        let html = '<ul class="pagination">'

        // Previous link
        if (currentPage > 1) {
          html += `<li class="page-item"><a class="page-link" href="${dirname}/${currentPage - 1}.html">Previous</a></li>`
        } else {
          html += '<li class="page-item disabled"><span class="page-link">Previous</span></li>'
        }

        // Current page
        html += `<li class="page-item active"><span class="page-link">${currentPage}</span></li>`

        // Next link
        if (currentPage < length) {
          html += `<li class="page-item"><a class="page-link" href="${dirname}/${currentPage + 1}.html">Next</a></li>`
        } else {
          html += '<li class="page-item disabled"><span class="page-link">Next</span></li>'
        }

        html += '</ul>'
        return html
      }
    }
  })
</script>
```

---

### Key Parameters
The `pagination_list` token function receives these critical parameters from Coralite:

| Parameter              | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `values.pagination_length` | Total number of items across all pages (used to determine page count).     |
| `values.pagination_current` | Currently active page number.                                               |
| `values.pagination_dirname` | Base directory path for routing context (e.g., `/blog`).                   |
| `values.pagination_index`  | Base URL path for pagination links (e.g., `/blog/index.html`).             |

> **Note:** Avoid hardcoding values like `length`, `currentPage`, or `dirname`. Use the parameters provided by Coralite to ensure compatibility.

---

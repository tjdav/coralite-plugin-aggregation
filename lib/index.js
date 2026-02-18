import { createPlugin } from 'coralite'
import path from 'node:path'

/**
 * Aggregates content based on configuration
 * @param {import('../types/index.js').AggregationOptions} options
 * @param {Object} contextInstance
 * @returns {Promise<any[]>}
 */
async function aggregationMethod (options, contextInstance) {
  const {
    path: paths = [],
    template,
    pagination,
    filter,
    sort,
    limit,
    offset = 0,
    recursive = false,
    tokens
  } = options

  const contextValues = contextInstance.values
  const pagesRoot = this.options.pages

  // 1. Collect pages
  let allPages = []
  const uniquePaths = new Set()

  for (const relativePath of paths) {
    const targetPath = path.join(pagesRoot, relativePath)

    // Check direct path match in listByPath (non-recursive)
    if (!recursive) {
      const pagesInDir = this.pages.getListByPath(targetPath)
      if (pagesInDir) {
        for (const page of pagesInDir) {
          if (!uniquePaths.has(page.path.pathname)) {
            uniquePaths.add(page.path.pathname)
            allPages.push(page)
          }
        }
      }
    } else {
      // Recursive search
      for (const page of this.pages.list) {
        const dirname = page.path.dirname
        // Check if dirname is targetPath or a subdirectory of targetPath
        if (dirname === targetPath || dirname.startsWith(targetPath + path.sep)) {
          if (!uniquePaths.has(page.path.pathname)) {
            uniquePaths.add(page.path.pathname)
            allPages.push(page)
          }
        }
      }
    }
  }

  // 2. Filter
  if (typeof filter === 'function') {
    allPages = allPages.filter(page => {
      // Access values from result property
      const values = page.result && page.result.values ? page.result.values : page.values
      return filter(values)
    })
  }

  // 3. Sort
  if (typeof sort === 'function') {
    allPages.sort((a, b) => {
      const valA = a.result && a.result.values ? a.result.values : a.values
      const valB = b.result && b.result.values ? b.result.values : b.values
      return sort(valA, valB)
    })
  }

  // 4. Pagination
  let startIndex = offset
  let endIndex = allPages.length

  let currentPage = 1
  let totalPages = 1

  // Ensure renderContext is available
  const currentRenderContext = contextInstance.renderContext
  const buildId = currentRenderContext && currentRenderContext.buildId

  if (limit) {
    if (pagination) {
      const segment = pagination.segment || 'page'
      const urlPathname = contextValues.$urlPathname || ''

      const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Try to match segment in URL: /.../segment/Number
      const segmentRegex = new RegExp(`/${escapedSegment}/(\\d+)`)
      const match = urlPathname.match(segmentRegex)

      if (match) {
        currentPage = parseInt(match[1], 10)
      }

      startIndex = offset + (currentPage - 1) * limit
      endIndex = startIndex + limit

      totalPages = Math.ceil(allPages.length / limit)

      // Automatically generate subsequent pagination pages if we are on the "root" page
      // e.g., if we are on /blog/index.html (page 1), queue up /blog/page/2, /blog/page/3...
      if (!match && currentPage === 1 && totalPages > 1 && buildId) {
        const currentDocument = contextInstance.document
        const currentPathname = currentDocument.path.pathname
        const currentFilename = currentDocument.path.filename
        const currentDirname = currentDocument.path.dirname

        // Determine the output path structure based on rules
        let targetDir = currentDirname
        let urlPrefixBase = ''

        // Rules:
        // /index.html -> /page/1.html (relative to currentDirname)
        // /blog.html -> /blog/page/1.html (creates subdirectory)
        // /blog/index.html -> /blog/page/1.html (relative to currentDirname)
        // /blog/today.html -> /blog/today/page/1.html (creates subdirectory)

        if (currentFilename === 'index.html') {
          // Standard case: keep in same directory
          targetDir = currentDirname
          // Prefix for URL generation in child
          urlPrefixBase = path.dirname(urlPathname) // e.g. /blog/
        } else {
          // Named file: create subdirectory with same name (minus extension)
          const basename = path.basename(currentFilename, path.extname(currentFilename))
          targetDir = path.join(currentDirname, basename)

          // e.g. /blog.html -> /blog/
          urlPrefixBase = urlPathname.replace(path.extname(currentFilename), '')
        }

        // Ensure trailing slash for URL prefix
        if (!urlPrefixBase.endsWith('/')) urlPrefixBase += '/'
        // path.dirname returns / for /index.html, but /blog for /blog/index.html.
        // If /blog/index.html, urlPathname is /blog/index.html. dirname is /blog.

        if (currentFilename === 'index.html') {
          // Correct logic for index.html url prefix
          // If /index.html, urlPathname /index.html. dirname /. prefix /.
          // If /blog/index.html, urlPathname /blog/index.html. dirname /blog. prefix /blog/.
          urlPrefixBase = path.dirname(urlPathname)
          if (!urlPrefixBase.endsWith('/')) urlPrefixBase += '/'
        }

        // Retrieve the original item to get content
        const currentItem = this.pages.getItem(currentDocument.path.pathname)

        for (let i = 2; i <= totalPages; i++) {
          const newPathname = path.join(targetDir, segment, `${i}.html`)

          const virtualItem = {
            content: currentItem ? currentItem.content : '', // Use original content
            path: {
              pathname: newPathname,
              dirname: path.dirname(newPathname),
              filename: path.basename(newPathname)
            },
            values: {
              // Pass metadata to help resolve paths in children
              meta_pagination_base_url: urlPathname,
              // Calculate prefix once and pass it down
              meta_pagination_url_prefix: urlPrefixBase
            },
            type: 'page'
          }

          // Add to queue
          await this.addRenderQueue(virtualItem, buildId)
        }
      }
    } else {
      // Simple limit/offset without pagination logic
      endIndex = Math.min(startIndex + limit, allPages.length)
    }
  }

  const paginatedPages = allPages.slice(startIndex, endIndex)

  // 5. Render Items
  const resultNodes = []

  for (const page of paginatedPages) {
    const pageValues = page.result && page.result.values ? page.result.values : page.values
    let itemValues = { ...pageValues }

    // Apply token transformations
    if (tokens && typeof tokens === 'object') {
      for (const key in tokens) {
        if (Object.prototype.hasOwnProperty.call(tokens, key)) {
          const transform = tokens[key]
          if (typeof transform === 'string') {
            itemValues[key] = pageValues[transform]
          } else if (typeof transform === 'function') {
            itemValues[key] = transform(pageValues)
          }
        }
      }
    }

    // Render the item template
    if (template) {
      const component = await this.createComponent({
        id: template,
        values: itemValues,
        document: contextInstance.document,
        renderContext: currentRenderContext
      })

      if (component && component.children) {
        resultNodes.push(...component.children)
      }
    }
  }

  // 6. Render Pagination Controls
  if (pagination) {
    const segment = pagination.segment || 'page'
    const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const paginationTemplateId = pagination.template || 'coralite-pagination'

    // Construct baseUrl and urlPrefix for template
    const urlPathname = contextValues.$urlPathname
    let baseUrl = urlPathname
    let urlPrefix = ''

    if (contextValues.meta_pagination_base_url) {
      baseUrl = contextValues.meta_pagination_base_url
    }

    if (contextValues.meta_pagination_url_prefix) {
      urlPrefix = contextValues.meta_pagination_url_prefix
    } else {
      // Page 1 logic calculation if not passed
      if (baseUrl.endsWith('/index.html') || baseUrl.endsWith('/')) {
        urlPrefix = path.dirname(baseUrl)
      } else {
        // Named file
        const basename = path.basename(baseUrl, '.html')
        urlPrefix = path.join(path.dirname(baseUrl), basename)
      }
    }

    // Normalize urlPrefix to ensure trailing slash
    if (!urlPrefix.endsWith('/')) urlPrefix += '/'

    const paginationValues = {
      'current-page': String(currentPage),
      'total-pages': String(totalPages),
      'base-url': baseUrl,
      'url-prefix': urlPrefix,
      segment: pagination.segment || 'page',
      'max-visible': String(pagination.maxVisible || 5),
      'aria-label': pagination.ariaLabel || 'Pagination',
      ellipsis: pagination.ellipsis || '...'
    }

    const component = await this.createComponent({
      id: paginationTemplateId,
      values: paginationValues,
      document: contextInstance.document,
      renderContext: currentRenderContext
    })

    if (component && component.children) {
      resultNodes.push(...component.children)
    }
  }

  return resultNodes
}

export const aggregation = createPlugin({
  name: 'aggregation',
  method: aggregationMethod,
  templates: [
    path.join(import.meta.dirname, 'templates/coralite-pagination.html')
  ]
})

export default aggregation

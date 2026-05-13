import { definePlugin } from 'coralite'
import path from 'node:path'

/**
 * Aggregates content based on configuration
 * @param {import('../types/index.js').AggregationOptions} options
 * @param {Object} context
 * @returns {Promise<any[]>}
 */
async function aggregationMethod (options, context) {
  const {
  path: paths = [],
    template,
    pagination,
    filter,
    sort,
    limit,
    offset = 0,
    recursive = false,
    transformProperties
  } = options

  const contextProperties = context.properties || {}
  const pagesRoot = this.options.pages

  // Collect pages
  let allPages = []
  const uniquePaths = new Set()

  for (const relativePath of paths) {
    const targetPath = path.join(pagesRoot, relativePath)

    if (!recursive) {
      const pagesInDir = this.pages.getListByPath(targetPath)
      if (pagesInDir) {
        for (const page of pagesInDir) {
          const pagePath = page.url ? page.url.pathname : page.path.pathname
          if (!uniquePaths.has(pagePath)) {
            uniquePaths.add(pagePath)
            allPages.push(page)
          }
        }
      }
    } else {
      // Recursive search
      for (const page of this.pages.list) {
        const dirname = page.file ? page.file.dirname : page.path.dirname
        if (dirname === targetPath || dirname.startsWith(targetPath + path.sep)) {
          const pagePath = page.url ? page.url.pathname : page.path.pathname
          if (!uniquePaths.has(pagePath)) {
            uniquePaths.add(pagePath)
            allPages.push(page)
          }
        }
      }
    }
  }

  // Filter
  if (typeof filter === 'function') {
    allPages = allPages.filter(page => {
      const pageProps = (page.result && page.result.properties) ? page.result.properties : page.properties
      return filter(pageProps)
    })
  }

  // Sort
  if (typeof sort === 'function') {
    allPages.sort((a, b) => {
      const propsA = (a.result && a.result.properties) ? a.result.properties : a.properties
      const propsB = (b.result && b.result.properties) ? b.result.properties : b.properties
      return sort(propsA, propsB)
    })
  }

  // Pagination
  let startIndex = offset
  let endIndex = allPages.length

  let currentPage = 1
  let totalPages = 1

  const currentRenderContext = context.renderContext
  const buildId = currentRenderContext && currentRenderContext.buildId

  if (limit) {
    if (pagination) {
      const segment = pagination.segment || 'page'
      const urlPathname = context.page.url.pathname

      const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const segmentRegex = new RegExp(`/${escapedSegment}/(\\d+)`)
      const match = urlPathname.match(segmentRegex)

      if (match) {
        currentPage = parseInt(match[1], 10)
      }

      startIndex = offset + (currentPage - 1) * limit
      endIndex = startIndex + limit
      totalPages = Math.ceil(allPages.length / limit)

      if (!match && currentPage === 1 && totalPages > 1 && buildId) {
        const currentPathname = context.page.file.pathname
        const currentFilename = context.page.file.filename
        const currentDirname = context.page.file.dirname

        let targetDir = currentDirname
        let urlPrefixBase = ''

        if (currentFilename === 'index.html') {
          targetDir = currentDirname
          urlPrefixBase = path.dirname(urlPathname)
        } else {
          const basename = path.basename(currentFilename, path.extname(currentFilename))
          targetDir = path.join(currentDirname, basename)
          urlPrefixBase = urlPathname.replace(path.extname(currentFilename), '')
        }

        if (!urlPrefixBase.endsWith('/')) urlPrefixBase += '/'

        if (currentFilename === 'index.html') {
          urlPrefixBase = path.dirname(urlPathname)
          if (!urlPrefixBase.endsWith('/')) urlPrefixBase += '/'
        }

        const currentItem = this.pages.getItem(currentPathname)

        for (let i = 2; i <= totalPages; i++) {
          const newPathname = path.join(targetDir, segment, `${i}.html`)

          const virtualItem = {
            content: currentItem ? currentItem.content : '',
            path: {
              pathname: newPathname,
              dirname: path.dirname(newPathname),
              filename: path.basename(newPathname)
            },
            properties: {
              paginationBaseUrl: urlPathname,
              paginationUrlPrefix: urlPrefixBase
            },
            type: 'page'
          }

          await this.addRenderQueue(virtualItem, buildId)
        }
      }
    } else {
      endIndex = Math.min(startIndex + limit, allPages.length)
    }
  }

  const paginatedPages = allPages.slice(startIndex, endIndex)
  const resultNodes = []

  for (const page of paginatedPages) {
    const pageProps = (page.result && page.result.properties) ? page.result.properties : page.properties
    let itemProps = { ...pageProps }

    // Apply properties transformations
    if (transformProperties && typeof transformProperties === 'object') {
      for (const key in transformProperties) {
        if (Object.prototype.hasOwnProperty.call(transformProperties, key)) {
          const transform = transformProperties[key]
          if (typeof transform === 'string') {
            itemProps[key] = pageProps[transform]
          } else if (typeof transform === 'function') {
            itemProps[key] = transform(pageProps)
          }
        }
      }
    }

    if (template) {
      const component = await this.createComponentElement({
        id: template,
        properties: itemProps,
        page: context.page,
        renderContext: currentRenderContext
      })

      if (component && component.children) {
        resultNodes.push(...component.children)
      }
    }
  }

  if (pagination) {
    const paginationTemplateId = pagination.template || 'coralite-pagination'
    const urlPathname = context.page.url.pathname
    
    let baseUrl = urlPathname
    let urlPrefix = ''

    if (contextProperties.paginationBaseUrl) {
      baseUrl = contextProperties.paginationBaseUrl
    }

    if (contextProperties.paginationUrlPrefix) {
      urlPrefix = contextProperties.paginationUrlPrefix
    } else {
      if (baseUrl.endsWith('/index.html') || baseUrl.endsWith('/')) {
        urlPrefix = path.dirname(baseUrl)
      } else {
        const basename = path.basename(baseUrl, '.html')
        urlPrefix = path.join(path.dirname(baseUrl), basename)
      }
    }

    if (!urlPrefix.endsWith('/')) urlPrefix += '/'

    const paginationProps = {
      'current-page': String(currentPage),
      'total-pages': String(totalPages),
      'base-url': baseUrl,
      'url-prefix': urlPrefix,
      segment: pagination.segment || 'page',
      'max-visible': String(pagination.maxVisible || 5),
      'aria-label': pagination.ariaLabel || 'Pagination',
      ellipsis: pagination.ellipsis || '...'
    }

    const component = await this.createComponentElement({
      id: paginationTemplateId,
      properties: paginationProps,
      page: context.page,
      renderContext: currentRenderContext
    })

    if (component && component.children) {
      resultNodes.push(...component.children)
    }
  }

  return resultNodes
}

export const aggregation = definePlugin({
  name: 'aggregation',
  method: aggregationMethod,
  components: [
    // @ts-ignore
    path.join(import.meta.dirname, 'components/coralite-pagination.html')
  ]
})

export default aggregation
import { definePlugin } from 'coralite'
import path from 'node:path'

export const aggregation = definePlugin({
  name: 'aggregation',

  async exports(options) {
    const {
      path: paths = [],
      component,
      pagination,
      filter,
      sort,
      limit,
      offset = 0,
      recursive = false,
      transformState
    } = options
    const state = this.state || {}
    const app = this.app
    const pagesRoot = app.options.pages

    // Collect pages
    let allPages = []
    const uniquePaths = new Set()

    for (const relativePath of paths) {
      const targetPath = path.join(pagesRoot, relativePath)

      if (!recursive) {
        const pagesInDir = app.pages.getListByPath(targetPath)

        if (pagesInDir) {
          for (const page of pagesInDir) {
            const pagePath = page.path.pathname

            if (!uniquePaths.has(pagePath)) {
              uniquePaths.add(pagePath)
              allPages.push(page)
            }
          }
        }
      } else {
        // Recursive search
        for (const page of app.pages.list) {
          const dirname = page.path.dirname

          if (dirname === targetPath || dirname.startsWith(targetPath + path.sep)) {
            const pagePath = page.path.pathname

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
        return filter(page.result.state)
      })
    }

    // Sort
    if (typeof sort === 'function') {
      allPages.sort((a, b) => {
        const propsA = (a.result && a.result.state) ? a.result.state : a.state
        const propsB = (b.result && b.result.state) ? b.result.state : b.state
        return sort(propsA, propsB)
      })
    }

    // Pagination
    let startIndex = offset
    let endIndex = allPages.length

    let currentPage = 1
    let totalPages = 1

    const currentRenderContext = this.renderContext
    const buildId = currentRenderContext && currentRenderContext.buildId

    if (limit) {
      if (pagination) {
        const segment = pagination.segment || 'page'
        const urlPathname = this.page.url.pathname

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
          const currentPathname = this.page.file.pathname
          const currentFilename = this.page.file.filename
          const currentDirname = this.page.file.dirname

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

          const currentItem = app.pages.getItem(currentPathname)

          for (let i = 2; i <= totalPages; i++) {
            const newPathname = path.join(targetDir, segment, `${i}.html`)

            const virtualItem = {
              content: currentItem ? currentItem.content : '',
              path: {
                pathname: newPathname,
                dirname: path.dirname(newPathname),
                filename: path.basename(newPathname)
              },
              state: {
                paginationBaseUrl: urlPathname,
                paginationUrlPrefix: urlPrefixBase
              },
              type: 'page'
            }

            await app.addRenderQueue(virtualItem, buildId)
          }
        }
      } else {
        endIndex = Math.min(startIndex + limit, allPages.length)
      }
    }

    const paginatedPages = allPages.slice(startIndex, endIndex)
    const resultNodes = []

    for (const page of paginatedPages) {
      const pageProps = (page.result && page.result.state) ? page.result.state : page.state
      let itemProps = { ...pageProps }

      // Apply properties transformations
      if (transformState && typeof transformState === 'object') {
        for (const key in transformState) {
          if (Object.prototype.hasOwnProperty.call(transformState, key)) {
            const transform = transformState[key]
            if (typeof transform === 'string') {
              itemProps[key] = pageProps[transform]
            } else if (typeof transform === 'function') {
              itemProps[key] = transform(pageProps)
            }
          }
        }
      }

      if (component) {
        const componentElement = await app.createComponentElement({
          id: component,
          state: itemProps,
          page: this.page,
          renderContext: currentRenderContext
        })

        if (componentElement && componentElement.children) {
          resultNodes.push(...componentElement.children)
        }
      }
    }

    if (pagination) {
      const paginationComponentId = pagination.component || 'coralite-pagination'
      const urlPathname = this.page.url.pathname

      let baseUrl = urlPathname
      let urlPrefix = ''

      if (state.paginationBaseUrl) {
        baseUrl = state.paginationBaseUrl
      }

      if (state.paginationUrlPrefix) {
        urlPrefix = state.paginationUrlPrefix
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

      const componentElement = await app.createComponentElement({
        id: paginationComponentId,
        state: paginationProps,
        page: this.page,
        renderContext: currentRenderContext
      })

      if (componentElement && componentElement.children) {
        resultNodes.push(...componentElement.children)
      }
    }

    return resultNodes
  },
  components: [
    // @ts-ignore
    path.join(import.meta.dirname, 'components/coralite-pagination.html')
  ]
})

export default aggregation

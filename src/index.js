import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { Parser } from 'htmlparser2'
import {
  getHtmlFiles,
  createElement,
  createTextNode,
  createPlugin,
} from 'coralite/utils'

/**
 * @import {CoraliteAnyNode, CoraliteCollectionItem, CoraliteContentNode, CoraliteDocumentRoot} from 'coralite/types'
 * @import {CoraliteAggregate} from '#types'
 */

export default createPlugin({
  name: 'aggregation',
  /**
   * Aggregates HTML content from specified paths into a single collection of components.
   *
   * @param {CoraliteAggregate} options - Configuration object defining the aggregation behavior
   *
   * @returns {Promise<CoraliteAnyNode[]>} Array of processed content nodes from aggregated documents
   * @throws {Error} If pages directory path is undefined or aggregate path doesn't exist
   *
   */
  async method (options, context) {
    let templateId

    // Determine template component ID from configuration
    if (typeof options.template === 'string') {
      templateId = options.template
    } else if (typeof options.template === 'object') {
      templateId = options.template.item
    }

    if (!templateId) {
      /** @TODO Refer to documentation */
      throw new Error('Aggregate template was undefined')
    }

    /** @type {CoraliteCollectionItem[]} */
    let pages = []

    for (let i = 0; i < options.path.length; i++) {
      let path = options.path[i];
      const dirname = join(context.path.pages, path)

      if (!existsSync(dirname)) {
        /** @TODO Refer to documentation */
        throw new Error('Aggregate path does not exist: "' + dirname + '"')
      }

      if (path[0] !== '/') {
        path = '/' + path
      }

      const cachePages = this.pages.getListByPath(path)

      if (!cachePages || !cachePages.length) {
        // Retrieve HTML pages from specified path
        const collection = await getHtmlFiles({
          type: 'page',
          path: dirname
        })

        if (!collection.list.length) {
          throw new Error('Aggregation found no documents in "' + dirname + '"')
        }

        pages = pages.concat(collection.list)
      } else {
        pages = pages.concat(cachePages)
      }
    }

    let result = []
    let startIndex = 0
    let endIndex = pages.length
    let paginationOffset = context.values.pagination_offset

    // Sort results based on custom sort function
    if (typeof options.sort === 'function') {
      pages.sort((a, b) => {
        const metaA = a.result.values
        const metaB = b.result.values

        return options.sort(metaA, metaB)
      })
    }

    if (typeof options.filter === 'function') {
      const filteredPages = []

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const metadata = page.result.values
        let keepItem = false

        // Process metadata and populate token values for rendering
        for (const key in metadata) {
          if (Object.prototype.hasOwnProperty.call(metadata, key)) {
            const data = metadata[key]

            if (Array.isArray(data)) {
              for (let i = 0; i < data.length; i++) {

                if (!keepItem) {
                  keepItem = options.filter({ name: key, content: data[i] })
                }
              }
            } else {
              // Handle single metadata item
              if (!keepItem) {
                keepItem = options.filter({
                  name: key,
                  content: data
                })
              }
            }
          }
        }

        if (keepItem) {
          filteredPages.push(page)
        }
      }

      pages = filteredPages
      endIndex = pages.length
    }

    // Apply page offset
    if (Object.prototype.hasOwnProperty.call(options, 'offset') || paginationOffset != null) {
      let offset = paginationOffset || options.offset

      if (!Array.isArray(offset)) {
        if (typeof offset === 'string') {
          offset = parseInt(offset)
        }

        if (offset > endIndex) {
          startIndex = endIndex
        } else {
          startIndex = offset
        }
      }
    }

    // apply page limit
    let limit
    if (options.limit) {
      limit = options.limit

      if (typeof limit === 'string') {
        limit = parseInt(limit)
      }

      const limitOffset = limit + startIndex

      if (limitOffset < endIndex) {
        endIndex = limitOffset
      }
    }

    let pageLength = pages.length
    for (let i = startIndex; i < endIndex; i++) {
      let page = pages[i]

      if (page.path.filename === context.document.path.filename) {
        // skip to next page
        page = pages[++i]
        pageLength--

        if (!page) {
          // exit loop
          break
        }
      }

      // render component with current values and add to results
      const component = await this.createComponent({
        id: templateId,
        values: { ...context.values, ...page.result.values },
        document: context.document,
        contextId: context.id + i + templateId
      })

      if (typeof component === 'object') {
        // concat rendered components
        result = result.concat(component.children)
      }
    }

    if (options.pagination) {
      const pagination = options.pagination
      const paginationPath = context.values.pagination_path || pagination.path || 'page'
      const paginationLength = Math.floor(pageLength / limit)
      let processed = context.values.pagination_processed

      if (!processed && paginationLength) {
        const path = context.document.path
        const nameSplit = context.document.path.filename.split('.')
        const length = nameSplit.length - 1
        let name = ''

        for (let i = 0; i < length; i++) {
          name += nameSplit[i]
        }

        if (name === 'index') {
          name = ''
        }

        // @ts-ignore
        let dirname = join(path.dirname, name, paginationPath)
        let pageIndex = path.pathname
        const indexPage = this.pages.getItem(path.pathname)
        const maxVisiblePages = (pagination.visible || paginationLength).toString()

        // check if we are currently not on a pager page
        if (context.values.pagination_pager_dirname == null) {
          for (let i = 1; i < paginationLength; i++) {
            const currentPageIndex = i + 1
            const filename = currentPageIndex + '.html'
            const pathname = join(dirname, filename)
            const contextId = pathname + context.id.substring(path.pathname.length)
            
            // store global values for pagination page
            this.values[contextId] = {
              pagination_path: paginationPath,
              pagination_visible: maxVisiblePages,
              pagination_processed: 'true',
              pagination_offset: (endIndex * i).toString(),
              pagination_index: path.pathname,
              pagination_dirname: dirname,
              pagination_length: paginationLength.toString(),
              pagination_current: currentPageIndex.toString(),
            }

            // add pagination page to render queue
            this.addRenderQueue({
              values: {
                pagination_pager_dirname: path.dirname,
                pagination_pager_index: pageIndex,
              },
              path: {
                dirname,
                pathname,
                filename
              },
              content: indexPage.content
            })
          }
        } else {
          // @ts-ignore
          dirname = join(context.values.pagination_pager_dirname, paginationPath)
          // @ts-ignore
          pageIndex = context.values.pagination_pager_index
        }

        // store pagination values for current page
        context.values = { 
          ...context.values,
          pagination_path: paginationPath,
          pagination_visible: maxVisiblePages,
          pagination_processed: 'true',
          pagination_offset: endIndex.toString(),
          pagination_index: pageIndex,
          pagination_dirname: dirname,
          pagination_length: paginationLength.toString(),
          pagination_current: '1'
        }
      }

      const contextId = context.id
      let values = this.values[contextId]

      if (!values || !processed) {
        values = context.values
        this.values[contextId] = values
      }

      const templateId = pagination.template || 'coralite-pagination'

      const component = await this.createComponent({
        id: templateId,
        values,
        document: context.document,
        contextId: contextId + templateId
      })

      if (typeof component === 'object') {
        result = result.concat(component.children)
      }
    }

    return result
  },
  templates: [join(import.meta.dirname, 'templates/coralite-pagination.html')]
})

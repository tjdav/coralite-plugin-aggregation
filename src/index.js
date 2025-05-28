import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { Parser } from 'htmlparser2'
import render from 'dom-serializer'
import {
  getHtmlFiles,
  createElement,
  createTextNode,
  parseHTMLMeta,
  createPlugin
} from 'coralite/utils'

/**
 * @import {Aggregation, CoraliteAggregate} from '#types'
 */

export default createPlugin({
  name: 'aggregation',
  /**
   * Aggregates HTML content from specified paths into a single collection of components.
   *
   * @param {CoraliteAggregate} options - Configuration object defining the aggregation behavior
   *
   * @returns {Promise<Aggregation>} Array of processed content nodes from aggregated documents
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
        const metaA = a.result.meta
        const metaB = b.result.meta

        return options.sort(metaA, metaB)
      })
    }

    if (typeof options.filter === 'function') {
      const filteredPages = []

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const meta = page.result.meta
        let keepItem = false

        // Process metadata and populate token values for rendering
        for (const key in meta) {
          if (Object.prototype.hasOwnProperty.call(meta, key)) {
            const data = meta[key]

            if (Array.isArray(data)) {
              for (let i = 0; i < data.length; i++) {

                if (!keepItem) {
                  keepItem = options.filter(data[i])
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

    // Apply page limit
    if (options.limit) {
      if (!Array.isArray(options.limit)) {
        let limit = options.limit

        if (typeof limit === 'string') {
          limit = parseInt(limit)
        }

        limit += startIndex

        if (limit < endIndex) {
          endIndex = limit
        }
      }
    }

    for (let i = startIndex; i < endIndex; i++) {
      let page = pages[i]

      if (page.path.filename === context.document.path.filename) {
        // skip to next page
        page = pages[++i]

        if (!page) {
          // exit loop
          break
        }
      }

      // Render component with current values and add to results
      const component = await this.createComponent({
        id: templateId,
        values: { ...context.values, ...page.result.values },
        document: context.document,
        contextId: context.id
      })

      if (typeof component === 'object') {
        // concat rendered components
        result = result.concat(component.children)
      }
    }

    if (options.pagination) {
      const pagination = options.pagination
      const paginationInfix = pagination.path || 'page'
      let processed = context.values.pagination_processed

      if (!processed) {
        const path = context.document.path
        const paginationTotal = pages.length
        const paginationLength = Math.floor(pages.length / endIndex)
        const nameSplit = context.document.path.filename.split('.')
        const length = nameSplit.length - 1
        let name = ''

        for (let i = 0; i < length; i++) {
          name += nameSplit[i]
        }

        if (name === 'index') {
          name = ''
        }

        const dirname = join(context.document.path.dirname, name, paginationInfix)
        const indexPage = this.pages.getItem(context.document.path.pathname)

        context.values = { 
          ...context.values,
          pagination_processed: 'true',
          pagination_offset: endIndex.toString(),
          pagination_index: path.pathname,
          pagination_dirname: dirname,
          pagination_pathname: path.pathname,
          pagination_total: paginationTotal.toString(),
          pagination_current: path.filename
        }

        for (let i = endIndex; i < paginationLength; i++) {
          const filename = i + 1 + '.html'
          const pathname = join(dirname, filename)
          // const root = parsePagination(page.content)
          // const content = this._render(root)
          // const index = context.instanceId.lastIndexOf(templateId)
          const contextId = pathname + context.id.substring(context.document.path.pathname.length)
          this.values[contextId] = { 
            pagination_processed: 'true',
            pagination_offset: (endIndex * i).toString(),
            pagination_index: path.pathname,
            pagination_dirname: dirname,
            pagination_pathname: pathname,
            pagination_total: paginationTotal.toString(),
            pagination_current: i.toString(),
          }

          this.addRenderQueue({
            path: {
              dirname,
              pathname,
              filename
            },
            content: indexPage.content
          })
        }
      }

      const contextId = context.id
      let values = this.values[contextId]

      if (!values || !processed) {
        values = context.values
        this.values[contextId] = values
      }

      const component = await this.createComponent({
        id: pagination.template || 'coralite-pagination',
        values,
        document: context.document,
        contextId
      })

      if (typeof component === 'object') {
        result = result.concat(component.children)
      }
    }

    return result
  }
})

/**
 * Parse HTML content and return a CoraliteDocument object representing the parsed document structure
 *
 * @param {string} string - The HTML content to parse. This should be a valid HTML string input.
 * @param {Object} pagination - Configuration object for pagination templates
 * @param {string} pagination.template - The template tag name used to identify pagination elements
 * @param {Object.<string, string>} pagination.attributes - Additional attributes to merge into the template element
 * @example parsePagination('<pagination-element></pagination-element>', {
 *   template: 'pagination-element',
 *   attributes: { class: 'custom-pagination' }
 * })
 */
export function parsePagination (string, meta) {
  // root element reference
  /** @type {CoraliteDocumentRoot} */
  const root = {
    type: 'root',
    children: []
  }

  // stack to keep track of current element hierarchy
  /** @type {CoraliteContentNode[]} */
  const stack = [root]
  const parser = new Parser({
    onprocessinginstruction (name, data) {
      root.children.push({
        type: 'directive',
        name,
        data
      })
    },
    onopentag (originalName, attributes) {
      const parent = stack[stack.length - 1]
      const element = createElement({
        name: originalName,
        attributes,
        parent
      })
      // push element to stack as it may have children
      stack.push(element)
    },
    ontext (text) {
      const parent = stack[stack.length - 1]

      createTextNode(text, parent)
    },
    onclosetag () {
      const parent = stack[stack.length - 1]

      if (parent.type === 'tag' && parent.name === 'head') {
        for (let i = 0; i < meta.length; i++) {
          const [name, content] = meta[i]
          const element = createElement({
            name: 'meta',
            attributes: {
              name,
              content
            },
            parent
          })

          parent.children.push(element)
        }
      }
      // remove current element from stack as we're done with its children
      stack.pop()
    },
    oncomment (data) {
      const parent = stack[stack.length - 1]

      parent.children.push({
        type: 'comment',
        data,
        parent
      })
    }
  })

  parser.write(string)
  parser.end()

  return root
}

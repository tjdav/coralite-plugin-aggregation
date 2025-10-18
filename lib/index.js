import path from 'node:path'
import { existsSync } from 'node:fs'
import { getHtmlFiles, createPlugin } from 'coralite'
import { pathToFileURL } from 'node:url'

/**
 * @import {CoraliteAnyNode, CoraliteCollectionItem} from 'coralite/types'
 * @import {CoraliteAggregate} from '../types/index.js'
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
      const optionPath = options.path[i];
      const dirname = path.join(context.path.pages, optionPath)

      if (!existsSync(dirname)) {
        /** @TODO Refer to documentation */
        throw new Error('Aggregate path does not exist: "' + dirname + '"')
      }

      const cachePages = this.pages.getListByPath(dirname)

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
    let paginationOffset = context.values.paginationOffset

    // sort results based on custom sort function
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

        // process metadata and populate token values for rendering
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
              // handle single metadata item
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

    // apply page offset
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
        contextId: context.id + i + templateId,
        index: i
      })

      if (typeof component === 'object') {
        // concat rendered components
        result = result.concat(component.children)
      }
    }

    // process pagination
    if (options.pagination) {
      const pagination = options.pagination
      const paginationSegment = context.values.paginationSegment || pagination.segment || 'page'
      const paginationLength = Math.floor(pageLength / limit)
      let processed = context.values.paginationProcessed

      if (!processed && paginationLength) {
        const documentPath = context.document.path
        
        // remove file extension
        let name = context.document.path.filename.replace(path.extname(context.document.path.filename), '')

        if (name === 'index') {
          name = ''
        }

        // @ts-ignore
        let dirname = path.join(documentPath.dirname, name, paginationSegment)
        const indexPathname = documentPath.pathname
        let urlPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, indexPathname))).pathname
        let indexURLPathname = urlPathname
        let indexURLDirname = pathToFileURL(path.dirname(urlPathname)).pathname
        const indexPage = this.pages.getItem(documentPath.pathname)
        const maxVisiblePages = (pagination.maxVisible || paginationLength).toString()

        // check if we are currently not on a index page
        if (context.values.paginationFileDirname == null) {
          for (let i = 1; i < paginationLength; i++) {
            const currentPageIndex = i + 1
            const filename = currentPageIndex + '.html'
            const pathname = path.join(dirname, filename)
            const contextId = pathname + context.id.substring(documentPath.pathname.length)
            const urlPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, pathname))).pathname
            const urlDirname = pathToFileURL(path.dirname(urlPathname)).pathname
            // store context values for pagination page
            this.values[contextId] = {
              paginationIndexPathname: indexPathname,
              paginationSegment: paginationSegment,
              paginationMaxVisible: maxVisiblePages,
              paginationProcessed: 'true',
              paginationOffset: (endIndex * i).toString(),
              paginationFilePathname: pathname,
              paginationFileDirname: dirname,
              paginationURLPathname: urlPathname,
              paginationURLDirname: urlDirname,
              paginationLength: paginationLength.toString(),
              paginationCurrent: currentPageIndex.toString(),
            }

            // add pagination page to render queue
            await this.addRenderQueue({
              values: {
                paginationIndexURLPathname: indexURLPathname,
                paginationIndexURLDirname: indexURLDirname,
                paginationFileDirname: documentPath.dirname,
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
          dirname = path.dirname(documentPath.dirname)
          
          urlPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, dirname), name + '.html')).pathname

          indexURLPathname = urlPathname
          indexURLDirname = pathToFileURL(path.dirname(urlPathname)).pathname
        }

        // store pagination values for current page
        context.values = { 
          ...context.values,
          paginationIndexPathname: indexPathname,
          paginationIndexURLPathname: indexURLPathname,
          paginationIndexURLDirname: indexURLDirname,
          paginationSegment: paginationSegment,
          paginationMaxVisible: maxVisiblePages,
          paginationProcessed: 'true',
          paginationOffset: endIndex.toString(),
          paginationFilePathname: indexPathname,
          paginationFileDirname: dirname,
          paginationURLPathname: urlPathname,
          paginationURLDirname: pathToFileURL(path.dirname(urlPathname)).pathname,
          paginationLength: paginationLength.toString(),
          paginationCurrent: '1'
        }
      }

      const contextId = context.id
      let values = this.values[contextId]

      if (!values || !processed) {
        values = context.values
        this.values[contextId] = values
      }
      
      const templateId = pagination.template || 'coralite-pagination'

      if (typeof templateId === 'string') {
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
    }

    return result
  },
  async onPageSet ({ elements, values, data }) {
    // loop through all children of the root element to process metadata in <head> tags.
    for (let i = 0; i < elements.root.children.length; i++) {
      const rootNode = elements.root.children[i]
      
      // traverse html children to find the head element
      if (rootNode.type === 'tag' && rootNode.name === 'html') {
        for (let i = 0; i < rootNode.children.length; i++) {
          const node = rootNode.children[i];
          
          // check if the current node is a <head> tag where metadata is typically found.
          if (node.type === 'tag' && node.name === 'head') {
            // iterate over the children of the head element to locate meta tags or component slots.
            for (let i = 0; i < node.children.length; i++) {
              const element = node.children[i]
              
              // if the element is a tag named "meta" with both name and content attributes, store its metadata.
              if (element.type === 'tag') {
                if (element.name === 'meta'
                  && element.attribs.name
                  && element.attribs.content
                ) {
                  values['$' + element.attribs.name] = element.attribs.content
                } else if (element.slots) {
                  // process component slots by creating a component dynamically.
                  const component = await this.createComponent({
                    id: element.name,
                    values,
                    element,
                    document: data.result,
                    contextId: data.path.pathname + i + element.name,
                    index: i
                  })
                  
                  // if the created component returns valid children, iterate over them to extract meta information.
                  if (component) {
                    for (let i = 0; i < component.children.length; i++) {
                      const element = component.children[i];
                      
                      // for each child element in the component's returned HTML,
                      // check if it is a meta tag and store its metadata with a '$' prefix.
                      if (element.type === 'tag'
                        && element.name === 'meta' 
                        && element.attribs.name
                        && element.attribs.content
                      ) {
                        values['$' + element.attribs.name] = element.attribs.content
                      }
                    }
                  }
                }
              }
            }

            // once the <head> tag is processed, return to exit the loop.
            return
          }
        }  
      }
    }
  },
  templates: [path.join(import.meta.dirname, 'templates/coralite-pagination.html')]
})

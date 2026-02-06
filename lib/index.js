import path from 'node:path'
import { access } from 'node:fs/promises'
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

      try {
        await access(dirname)
      } catch (error) {
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

    // Filter out index.html and current page from pages array
    pages = pages.filter(p => {
      // Always exclude index.html from pagination
      if (p.path.filename === 'index.html') return false
      
      // Exclude current page if it matches
      if (p.path.filename === context.document.path.filename) return false
      
      return true
    })
    
    // Update endIndex after filtering
    endIndex = Math.min(endIndex, pages.length)
    
    // Render content
    for (let i = startIndex; i < endIndex; i++) {
      let page = pages[i]

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
    if (options.pagination && limit) {
      const pagination = options.pagination
      const paginationSegment = context.values.paginationSegment || pagination.segment || 'page'
      
      // Calculate pagination length based on the filtered pages array
      // Each page shows 'limit' items, so total pages = ceil(filteredPagesCount / limit)
      const filteredPagesCount = pages.length
      const paginationLength = Math.ceil(filteredPagesCount / limit)
      
      let processed = context.values.paginationProcessed

      if (!processed && paginationLength > 1) {
        const documentPath = context.document.path
        
        // remove file extension
        let name = context.document.path.filename.replace(path.extname(context.document.path.filename), '')

        if (name === 'index') {
          name = ''
        }

        // Base directory for pagination pages
        let baseDirname = documentPath.dirname
        if (name) {
          baseDirname = path.join(baseDirname, name)
        }
        
        const paginationDirname = path.join(baseDirname, paginationSegment.toString())
        
        // Index page path - always the base index.html
        const indexPathname = context.values.paginationIndexPathname || documentPath.pathname
        // For URL calculation, we need to find the index page in the same directory structure
        // If we're on /blog/page/2.html, the index is at /blog/index.html
        let indexURLPathname = context.values.paginationIndexURLPathname
        let indexURLDirname = context.values.paginationIndexURLDirname
        
        if (!indexURLDirname || !indexURLPathname) {
          if (name) {
            // Non-index page: index is in parent directory
            const parentDir = path.dirname(documentPath.dirname)
            const indexFile = path.join(parentDir, context.document.path.filename)
            indexURLPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, indexFile))).pathname
            indexURLDirname = pathToFileURL(path.dirname(indexURLPathname)).pathname
          } else {
            // Index page
            indexURLPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, indexPathname))).pathname
            indexURLDirname = pathToFileURL(path.dirname(indexURLPathname)).pathname
          }
        }
        
        const indexPage = this.pages.getItem(documentPath.pathname)
        const maxVisiblePages = (pagination.maxVisible || paginationLength).toString()

        // Generate pagination pages (page 2, 3, 4, etc.)
        if (context.values.paginationFileDirname == null) {
          for (let i = 1; i < paginationLength; i++) {
            const currentPageIndex = i + 1
            const filename = currentPageIndex + '.html'
            const pathname = path.join(paginationDirname, filename)
            const contextId = pathname + context.id.substring(documentPath.pathname.length)
            
            // Calculate offset for this page
            const pageOffset = i * limit
            
            // URL for this pagination page
            const urlPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, pathname))).pathname
            const urlDirname = pathToFileURL(path.dirname(urlPathname)).pathname

            // Store context values for pagination page
            // For pagination pages, use nested URL structure
            const nestedURLPathname = pathToFileURL(path.join('/', path.relative(this.options.path.pages, pathname))).pathname
            // For pagination pages, the URL dirname should be the full path without .html
            // e.g., /blog/page/2.html -> /blog/page/2
            const nestedURLDirname = nestedURLPathname.replace(/\.html$/, '')
            
            this.values[contextId] = {
              ...context.values,
              paginationIndexPathname: context.values.paginationIndexPathname,
              paginationIndexURLPathname: context.values.paginationIndexURLPathname,
              paginationIndexURLDirname: context.values.paginationIndexURLDirname,
              paginationSegment: paginationSegment,
              paginationMaxVisible: maxVisiblePages,
              paginationProcessed: 'true',
              paginationOffset: pageOffset.toString(),
              paginationFilePathname: pathname,
              paginationFileDirname: paginationDirname,
              paginationURLPathname: nestedURLPathname,
              paginationURLDirname: nestedURLDirname,
              paginationLength: paginationLength.toString(),
              paginationCurrent: currentPageIndex.toString(),
            }

            // Add pagination page to render queue
            await this.addRenderQueue({
              values: {
                paginationIndexPathname: indexPathname,
                paginationIndexURLPathname: indexURLPathname,
                paginationIndexURLDirname: indexURLDirname,
                paginationFileDirname: documentPath.dirname,
              },
              path: {
                dirname: paginationDirname,
                pathname,
                filename
              },
              content: indexPage.content
            })
          }
        }

        // Store pagination values for current page
        // For non-index pages, use nested URL structure
        let currentPaginationURLDirname
        let currentPaginationURLPathname
        
        if (name) {
          // Non-index page: use nested structure
          // e.g., /blog/page/2 for page 2
          currentPaginationURLPathname = indexURLPathname
          // Calculate the full nested path
          // For page 2: /blog/page/2
          const relativePath = path.relative(this.options.path.pages, documentPath.dirname)
          currentPaginationURLDirname = pathToFileURL(path.join('/', relativePath, name)).pathname
        } else {
          // Index page: use flat structure
          currentPaginationURLPathname = indexURLPathname
          currentPaginationURLDirname = indexURLDirname
        }
        context.values = { 
          ...context.values,
          paginationIndexPathname: indexPathname,
          paginationIndexURLPathname: indexURLPathname,
          paginationIndexURLDirname: indexURLDirname,
          paginationSegment: paginationSegment,
          paginationMaxVisible: maxVisiblePages,
          paginationProcessed: 'true',
          paginationOffset: limit.toString(),
          paginationFilePathname: indexPathname,
          paginationFileDirname: baseDirname,
          paginationURLPathname: currentPaginationURLPathname,
          paginationURLDirname: currentPaginationURLDirname,
          paginationLength: paginationLength.toString(),
          paginationCurrent: '1'
        }
      }

      // Handle pagination pages (non-index pages)
      const contextId = context.id
      let values = this.values[contextId]

      if (!values || !processed) {
        values = context.values
        this.values[contextId] = values
      }
      
      const paginationTemplateId = pagination.template || 'coralite-pagination'

      if (typeof paginationTemplateId === 'string') {
        const component = await this.createComponent({
          id: paginationTemplateId,
          values,
          document: context.document,
          contextId: contextId + paginationTemplateId
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

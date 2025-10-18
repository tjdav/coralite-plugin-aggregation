/**
 * @import {CoraliteToken, CoraliteTokenOptions, CoraliteDocument } from 'coralite/types'
 */

/**
 * Configuration for templates used to render aggregated results.
 * @typedef {Object} CoraliteAggregateTemplate - Templates used to display the result
 * @property {string} item - Unique identifier for the component used for each document
 */

/**
 * Callback function for filtering aggregated content based on metadata.
 * @callback CoraliteAggregateFilter
 * @param {CoraliteToken} metadata - Aggregated HTML page metadata
 */

/**
 * Callback function for sorting aggregated results based on metadata.
 * @callback CoraliteAggregateSort
 * @param {Object.<string, (string | CoraliteToken[])>} a - Aggregated HTML page metadata
 * @param {Object.<string, (string | CoraliteToken[])>} b - Aggregated HTML page metadata
 */

/**
 * Configuration object for content aggregation processes.
 * @typedef {Object} CoraliteAggregate – Configuration object for the aggregation process
 * @property {string[]} path - The path to aggregate, relative to pages directory
 * @property {CoraliteAggregateTemplate | string} template - Templates used to display the result
 * @property {Object} [pagination]
 * @property {CoraliteAggregateTemplate | string} pagination.template - Pagination template ID
 * @property {string} [pagination.segment='page'] - Pagination page segment (e.g. 'page' will result in 'page/1')
 * @property {number} pagination.maxVisible - Maximum visible number of pages.
 * @property {CoraliteAggregateFilter} [filter] - Callback to filter out unwanted elements from the aggregated content.
 * @property {boolean} [recursive] - Whether to recursively search subdirectories
 * @property {CoraliteTokenOptions} [tokens] - Token configuration options
 * @property {CoraliteAggregateSort} [sort] - Sort aggregated pages
 * @property {number} [limit] - Specifies the maximum number of results to retrieve.
 * @property {number} [offset] - Specifies the starting index for the results list.
 */

/**
 * @typedef {Object} PaginationMetadata
 * @property {string} paginationIndexPathname - The index path name for pagination.
 * @property {string} paginationSegment - The current segment of pagination.
 * @property {number} paginationMaxVisible - Maximum number of visible pages in the pagination UI.
 * @property {boolean} paginationProcessed - Indicates whether the pagination has been processed.
 * @property {string} paginationOffset - String representation of the offset.
 * @property {string} paginationFilePathname - The file path name for pagination context.
 * @property {string} paginationFileDirname - The directory name of the file for pagination context.
 * @property {string} paginationURLPathname - The URL path name used in pagination.
 * @property {string} paginationURLDirname - The URL directory name used in pagination.
 * @property {number} paginationLength - Total length of the paginated data set.
 * @property {number} paginationCurrent - Current page index (as a string).
 */

export default {}

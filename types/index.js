/**
 * @typedef {Object} AggregationPaginationOptions
 * @property {string} [segment='page'] - The URL segment used for pagination (e.g., /blog/page/2).
 * @property {string} [template='coralite-pagination'] - The ID of the component template to use for rendering pagination controls.
 * @property {number} [maxVisible=5] - The maximum number of pagination links to display.
 * @property {string} [ariaLabel='Pagination'] - The ARIA label for the pagination navigation element.
 * @property {string} [ellipsis='...'] - The text to display for truncated page numbers.
 */

/**
 * @typedef {Object} AggregationOptions
 * @property {string[]} [path=[]] - An array of relative paths to search for pages within `pagesRoot`.
 * @property {string} [template] - The component ID to use for rendering each item found.
 * @property {AggregationPaginationOptions} [pagination] - Configuration for pagination logic and controls. If present, pagination logic is enabled.
 * @property {function(Object): boolean} [filter] - A callback function to filter pages. It receives the page values object and should return `true` to keep the item.
 * @property {function(Object, Object): number} [sort] - A comparison function for sorting pages. It receives two page value objects (a, b) and should return a number.
 * @property {number} [limit] - The maximum number of items to return (or items per page if pagination is used).
 * @property {number} [offset=0] - The starting index for fetching items.
 * @property {boolean} [recursive=false] - If true, searches subdirectories of the specified paths.
 * @property {Object.<string, (string|function(Object): *)>} [tokens] - A map of key transformations. Keys are the new property names. Values can be a string (source property name) or a function (receiving page values and returning the new value).
 */

export default {}

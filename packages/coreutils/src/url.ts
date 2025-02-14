// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PartialJSONObject } from '@lumino/coreutils';

import urlparse from 'url-parse';

/**
 * The namespace for URL-related functions.
 */
export namespace URLExt {
  /**
   * Parse a url into a URL object.
   *
   * @param urlString - The URL string to parse.
   *
   * @returns A URL object.
   */
  export function parse(url: string): IUrl {
    if (typeof document !== 'undefined' && document) {
      let a = document.createElement('a');
      a.href = url;
      return a;
    }
    return urlparse(url);
  }

  /**
   * Normalize a url.
   */
  export function normalize(url: string): string;
  export function normalize(url: undefined): undefined;
  export function normalize(url: string | undefined): string | undefined {
    return url && parse(url).toString();
  }

  /**
   * Join a sequence of url components and normalizes as in node `path.join`.
   *
   * @param parts - The url components.
   *
   * @returns the joined url.
   */
  export function join(...parts: string[]): string {
    parts = parts || [];

    // Isolate the top element.
    const top = parts[0] || '';

    // Check whether protocol shorthand is being used.
    const shorthand = top.indexOf('//') === 0;

    // Parse the top element into a header collection.
    const header = top.match(/(\w+)(:)(\/\/)?/);
    const protocol = header && header[1];
    const colon = protocol && header![2];
    const slashes = colon && header![3];

    // Construct the URL prefix.
    const prefix = shorthand
      ? '//'
      : [protocol, colon, slashes].filter(str => str).join('');

    // Construct the URL body omitting the prefix of the top value.
    const body = [top.indexOf(prefix) === 0 ? top.replace(prefix, '') : top]
      // Filter out top value if empty.
      .filter(str => str)
      // Remove leading slashes in all subsequent URL body elements.
      .concat(parts.slice(1).map(str => str.replace(/^\//, '')))
      .join('/')
      // Replace multiple slashes with one.
      .replace(/\/+/g, '/');

    return prefix + body;
  }

  /**
   * Encode the components of a multi-segment url.
   *
   * @param url - The url to encode.
   *
   * @returns the encoded url.
   *
   * #### Notes
   * Preserves the `'/'` separators.
   * Should not include the base url, since all parts are escaped.
   */
  export function encodeParts(url: string): string {
    return join(...url.split('/').map(encodeURIComponent));
  }

  /**
   * Return a serialized object string suitable for a query.
   *
   * @param object - The source object.
   *
   * @returns an encoded url query.
   *
   * #### Notes
   * Modified version of [stackoverflow](http://stackoverflow.com/a/30707423).
   */
  export function objectToQueryString(value: PartialJSONObject): string {
    const keys = Object.keys(value).filter(key => key.length > 0);

    if (!keys.length) {
      return '';
    }

    return (
      '?' +
      keys
        .map(key => {
          const content = encodeURIComponent(String(value[key]));

          return key + (content ? '=' + content : '');
        })
        .join('&')
    );
  }

  /**
   * Return a parsed object that represents the values in a query string.
   */
  export function queryStringToObject(
    value: string
  ): { [key: string]: string } {
    return value
      .replace(/^\?/, '')
      .split('&')
      .reduce((acc, val) => {
        const [key, value] = val.split('=');

        if (key.length > 0) {
          acc[key] = decodeURIComponent(value || '');
        }

        return acc;
      }, {} as { [key: string]: string });
  }

  /**
   * Test whether the url is a local url.
   *
   * #### Notes
   * This function returns `false` for any fully qualified url, including
   * `data:`, `file:`, and `//` protocol URLs.
   */
  export function isLocal(url: string): boolean {
    const { protocol } = parse(url);

    return (
      (!protocol || url.toLowerCase().indexOf(protocol) !== 0) &&
      url.indexOf('/') !== 0
    );
  }

  /**
   * The interface for a URL object
   */
  export interface IUrl {
    /**
     * The full URL string that was parsed with both the protocol and host
     * components converted to lower-case.
     */
    href?: string;

    /**
     * Identifies the URL's lower-cased protocol scheme.
     */
    protocol?: string;

    /**
     * The full lower-cased host portion of the URL, including the port if
     * specified.
     */
    host?: string;

    /**
     * The lower-cased host name portion of the host component without the
     * port included.
     */
    hostname?: string;

    /**
     * The numeric port portion of the host component.
     */
    port?: string;

    /**
     * The entire path section of the URL.
     */
    pathname?: string;

    /**
     * The "fragment" portion of the URL including the leading ASCII hash
     * `(#)` character
     */
    hash?: string;

    /**
     * The search element, including leading question mark (`'?'`), if any,
     * of the URL.
     */
    search?: string;
  }
}

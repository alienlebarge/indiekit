import {decodeQueryParameter} from './string.js';

/**
 * Parse Microformats in form-encoded request.
 *
 * @param {string} body Form-encoded request body
 * @returns {string} Micropub action
 */
export const formEncodedToMf2 = body => {
  const type = body.h ? ['h-' + body.h] : ['h-entry'];

  const mf2 = {
    type,
    properties: {}
  };

  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const value = decodeQueryParameter(body[key]);
      const isReservedProperty = reservedProperties.includes(key);

      if (isReservedProperty) {
        delete body[key];
      } else {
        // Convert value to arrays
        // 'a' => ['a']
        mf2.properties[key] = [].concat(value);
      }
    }
  }

  return mf2;
};

/**
 * Reserved body property names
 *
 * @see https://www.w3.org/TR/micropub/#reserved-properties
 */
export const reservedProperties = Object.freeze([
  'access_token',
  'h',
  'action',
  'url'
]);

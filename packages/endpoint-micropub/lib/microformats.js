import got from 'got';
import parser from 'microformats-parser';
import {markdownToHtml, htmlToMarkdown} from './markdown.js';
import {reservedProperties} from './reserved-properties.js';
import {getDate} from './date.js';
import {
  decodeQueryParameter,
  excerptString,
  slugifyString,
  relativeMediaPath,
  randomString
} from './utils.js';

/**
 * Create JF2 object from form-encoded request
 *
 * @param {string} body Form-encoded request body
 * @returns {string} Micropub action
 */
export const formEncodedToJf2 = body => {
  const jf2 = {
    type: body.h ? body.h : 'entry'
  };

  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      // Delete reserved properties
      const isReservedProperty = reservedProperties.includes(key);
      if (isReservedProperty) {
        delete body[key];
        continue;
      }

      // Decode string values
      const isStringValue = typeof body[key] === 'string';
      const value = isStringValue ? decodeQueryParameter(body[key]) : body[key];

      // Adds values to JF2 object
      jf2[key] = value;
    }
  }

  return jf2;
};

/**
 * Get JF2 object
 *
 * @param {object} publication Publication configuration
 * @param {object} properties JF2 properties
 * @returns {object} Normalised Microformats2 object
 */
export const getJf2 = (publication, properties) => {
  const {me, slugSeparator, syndicationTargets, timeZone} = publication;

  const syndidateTo = getSyndicateToProperty(properties, syndicationTargets);
  if (syndidateTo) {
    properties['mp-syndicate-to'] = syndidateTo;
  }

  properties.published = getPublishedProperty(properties, timeZone);
  properties['mp-slug'] = getSlugProperty(properties, slugSeparator);

  if (properties.content) {
    properties.content = getContentProperty(properties);
  }

  if (properties.audio) {
    properties.audio = getAudioProperty(properties, me);
  }

  if (properties.photo) {
    properties.photo = getPhotoProperty(properties, me);
  }

  if (properties.video) {
    properties.video = getVideoProperty(properties, me);
  }

  return properties;
};

/**
 * Returns/selects microformat properties of a post.
 *
 * @param {object} mf2 Microformats2 object
 * @param {Array|string} requestedProperties mf2 properties to select
 * @returns {Promise|object} mf2 with requested properties
 */
export const getMf2Properties = (mf2, requestedProperties) => {
  const mf2HasItems = mf2.items && mf2.items.length > 0;
  if (!mf2HasItems) {
    throw new Error('Source has no items');
  }

  const item = mf2.items[0];
  const {properties} = item;

  // Return requested properties
  if (requestedProperties) {
    const selectedProperties = {};

    if (!Array.isArray(requestedProperties)) {
      requestedProperties = new Array(requestedProperties);
    }

    requestedProperties.forEach(key => {
      if (properties[key]) {
        selectedProperties[key] = properties[key];
      }
    });

    item.properties = selectedProperties;
  }

  // Return properties
  delete item.type;
  return item;
};

/**
 * Get audio property
 *
 * @param {object} properties JF2 properties
 * @param {object} me Publication URL
 * @returns {Array} Microformats2 `audio` property
 */
export const getAudioProperty = (properties, me) => {
  return properties.audio.map(item => ({
    url: relativeMediaPath(item.value || item, me)
  }));
};

/**
 * Get content property (HTML, else object value, else property value)
 *
 * @param {object} properties JF2 properties
 * @returns {Array} Microformats2 `content` property
 */
export const getContentProperty = properties => {
  const {content} = properties;
  let {html, text} = content;

  // Return existing text and HTML representations
  if (html && text) {
    return content;
  }

  // If HTML representation only, add text representation
  if (html && !text) {
    text = htmlToMarkdown(html);
    return {html, text};
  }

  // Return property with text and HTML representations
  text = text || content;
  html = markdownToHtml(text);
  return {html, text};
};

/**
 * Get photo property (adding text alternatives where provided)
 *
 * @param {object} properties JF2 properties
 * @param {object} me Publication URL
 * @returns {Array} Microformats2 `photo` property
 */
export const getPhotoProperty = (properties, me) => {
  const {photo} = properties;
  const photoAlt = properties['mp-photo-alt'];
  const property = photo.map((item, index) => ({
    url: relativeMediaPath(item.value || item, me),
    ...item.alt && {alt: item.alt},
    ...photoAlt && {alt: photoAlt[index]}
  }));
  delete properties['mp-photo-alt'];
  return property;
};

/**
 * Get video property
 *
 * @param {object} properties JF2 properties
 * @param {object} me Publication URL
 * @returns {Array} Microformats2 `video` property
 */
export const getVideoProperty = (properties, me) => {
  return properties.video.map(item => ({
    url: relativeMediaPath(item.value || item, me)
  }));
};

/**
 * Get published date (based on microformats2 data, else current date)
 *
 * @param {object} properties JF2 properties
 * @param {object} timeZone Publication time zone
 * @returns {Array} Microformats2 `published` property
 */
export const getPublishedProperty = (properties, timeZone) => {
  return getDate(timeZone, properties.published);
};

/**
 * Get slug
 *
 * @param {object} properties JF2 properties
 * @param {string} separator Slug separator
 * @returns {Array} Array containing slug value
 */
export const getSlugProperty = (properties, separator) => {
  const suggested = properties['mp-slug'];
  const {name} = properties;

  let string;
  if (suggested) {
    string = suggested;
  } else if (name) {
    string = excerptString(name, 5);
  } else {
    string = randomString();
  }

  return slugifyString(string, separator);
};

export const getSyndicateToProperty = (properties, syndicationTargets) => {
  const syndication = [];

  if (syndicationTargets.length === 0) {
    return;
  }

  for (const target of syndicationTargets) {
    const syndicateTo = properties && properties['mp-syndicate-to'];
    const clientChecked = syndicateTo && syndicateTo.includes(target.uid);
    const serverForced = target.options && target.options.forced;

    if (clientChecked || serverForced) {
      syndication.push(target.uid);
    }
  }

  if (syndication.length > 0) {
    return syndication;
  }
};

/**
 * Convert JF2 to Microformats2 object
 *
 * @param {string} jf2 JF2
 * @returns {string} Micropub action
 */
export const jf2ToMf2 = jf2 => {
  const mf2 = {
    type: [`h-${jf2.type}`],
    properties: {}
  };

  delete jf2.type;

  // Convert values to arrays, ie 'a' => ['a'] and move to properties object
  for (const key in jf2) {
    if (Object.prototype.hasOwnProperty.call(jf2, key)) {
      mf2.properties[key] = [].concat(jf2[key]);
    }
  }

  // Update key for plaintext content
  if (mf2.properties.content[0] && mf2.properties.content[0].text) {
    mf2.properties.content[0].value = jf2.content.text;
    delete mf2.properties.content[0].text;
  }

  return mf2;
};

/**
 * Return microformats of a given URL
 *
 * @param {string} url URL path to post
 * @returns {Promise|object} Microformats2 object
 */
export const url2Mf2 = async url => {
  const {body} = await got(url);
  const mf2 = parser.mf2(body, {
    baseUrl: url
  });

  return mf2;
};

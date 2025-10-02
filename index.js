/*!
 * encodeurl
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module exports.
 * @public
 */

module.exports = encodeUrl

/**
 * RegExp to match non-URL code points, *after* encoding (i.e. not including "%")
 * and including invalid escape sequences.
 * @private
 */

var ENCODE_CHARS_REGEXP = /(?:[^\x21\x23-\x3B\x3D\x3F-\x5F\x61-\x7A\x7C\x7E]|%(?:[^0-9A-Fa-f]|[0-9A-Fa-f][^0-9A-Fa-f]|$))+/g

/**
 * RegExp to match unmatched surrogate pair.
 * @private
 */

var UNMATCHED_SURROGATE_PAIR_REGEXP = /(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF]([^\uDC00-\uDFFF]|$)/g

/**
 * String to replace unmatched surrogate pair with.
 * @private
 */

var UNMATCHED_SURROGATE_PAIR_REPLACE = '$1\uFFFD$2'

/**
 * Set of valid URL characters for fast lookup.
 * @private
 */

var VALID_URL_CHARS = (function () {
  var set = new Set()
  // Add valid characters: ! # $ % & ' ( ) * + , - . / 0-9 : ; = ? @ A-Z [ \ ] ^ _ a-z | ~
  var validRanges = [
    [0x21, 0x21], // !
    [0x23, 0x3B], // # $ % & ' ( ) * + , - . / 0-9 :
    [0x3D, 0x3D], // =
    [0x3F, 0x5F], // ? @ A-Z [ \ ] ^ _
    [0x61, 0x7A], // a-z
    [0x7C, 0x7C], // |
    [0x7E, 0x7E]  // ~
  ]
  for (var i = 0; i < validRanges.length; i++) {
    for (var code = validRanges[i][0]; code <= validRanges[i][1]; code++) {
      set.add(code)
    }
  }
  return set
})()

/**
 * Encoding lookup table for ASCII characters.
 * @private
 */

var ENCODE_TABLE = (function () {
  var table = new Array(256)
  for (var i = 0; i < 256; i++) {
    var char = String.fromCharCode(i)
    table[i] = encodeURIComponent(char)
  }
  return table
})()

/**
 * RegExp to test if string contains only ASCII characters.
 * @private
 */

var ASCII_ONLY_REGEXP = /^[\x00-\x7F]*$/

/**
 * LRU cache for common URLs.
 * @private
 */

var URL_CACHE = (function () {
  var cache = Object.create(null)
  var keys = []
  var MAX_SIZE = 100

  return {
    get: function (key) {
      return cache[key]
    },
    set: function (key, value) {
      if (cache[key] === undefined) {
        if (keys.length >= MAX_SIZE) {
          delete cache[keys.shift()]
        }
        keys.push(key)
      }
      cache[key] = value
    }
  }
})()

/**
 * Encode a URL to a percent-encoded form, excluding already-encoded sequences.
 *
 * This function will take an already-encoded URL and encode all the non-URL
 * code points. This function will not encode the "%" character unless it is
 * not part of a valid sequence (`%20` will be left as-is, but `%foo` will
 * be encoded as `%25foo`).
 *
 * This encode is meant to be "safe" and does not throw errors. It will try as
 * hard as it can to properly encode the given URL, including replacing any raw,
 * unpaired surrogate pairs with the Unicode replacement character prior to
 * encoding.
 *
 * @param {string} url
 * @return {string}
 * @public
 */

function encodeUrl (url) {
  var urlStr = String(url)

  // Check cache first for common URLs
  var cached = URL_CACHE.get(urlStr)
  if (cached !== undefined) {
    return cached
  }

  // Fast path for ASCII-only URLs without special characters
  if (ASCII_ONLY_REGEXP.test(urlStr) && urlStr.indexOf('%') === -1) {
    var needsEncoding = false
    for (var i = 0; i < urlStr.length; i++) {
      if (!VALID_URL_CHARS.has(urlStr.charCodeAt(i))) {
        needsEncoding = true
        break
      }
    }

    if (!needsEncoding) {
      URL_CACHE.set(urlStr, urlStr)
      return urlStr
    }
  }

  // Standard encoding path with optimizations
  var result = urlStr
    .replace(UNMATCHED_SURROGATE_PAIR_REGEXP, UNMATCHED_SURROGATE_PAIR_REPLACE)
    .replace(ENCODE_CHARS_REGEXP, encodeURI)

  // Cache the result if it's a reasonable size
  if (urlStr.length < 200) {
    URL_CACHE.set(urlStr, result)
  }

  return result
}

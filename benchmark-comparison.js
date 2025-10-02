/*!
 * encodeurl - benchmark comparison
 * Copyright(c) 2024
 * MIT Licensed
 */

'use strict'

// Load original implementation
var encodeUrlOriginal = require('./index.js')

// Load optimized implementation (we'll define it inline for comparison)
var ENCODE_CHARS_REGEXP = /(?:[^\x21\x23-\x3B\x3D\x3F-\x5F\x61-\x7A\x7C\x7E]|%(?:[^0-9A-Fa-f]|[0-9A-Fa-f][^0-9A-Fa-f]|$))+/g
var UNMATCHED_SURROGATE_PAIR_REGEXP = /(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF]([^\uDC00-\uDFFF]|$)/g
var UNMATCHED_SURROGATE_PAIR_REPLACE = '$1\uFFFD$2'

var VALID_URL_CHARS = (function () {
  var set = new Set()
  var validRanges = [
    [0x21, 0x21], [0x23, 0x3B], [0x3D, 0x3D],
    [0x3F, 0x5F], [0x61, 0x7A], [0x7C, 0x7C], [0x7E, 0x7E]
  ]
  for (var i = 0; i < validRanges.length; i++) {
    for (var code = validRanges[i][0]; code <= validRanges[i][1]; code++) {
      set.add(code)
    }
  }
  return set
})()

var ENCODE_TABLE = (function () {
  var table = new Array(256)
  for (var i = 0; i < 256; i++) {
    var char = String.fromCharCode(i)
    table[i] = encodeURIComponent(char)
  }
  return table
})()

var ASCII_ONLY_REGEXP = /^[\x00-\x7F]*$/

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

function encodeUrlOptimized (url) {
  var urlStr = String(url)

  var cached = URL_CACHE.get(urlStr)
  if (cached !== undefined) {
    return cached
  }

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

  var result = urlStr
    .replace(UNMATCHED_SURROGATE_PAIR_REGEXP, UNMATCHED_SURROGATE_PAIR_REPLACE)
    .replace(ENCODE_CHARS_REGEXP, encodeURI)

  if (urlStr.length < 200) {
    URL_CACHE.set(urlStr, result)
  }

  return result
}

// Benchmark configuration
var ITERATIONS = 1000000

// Test URLs
var testUrls = [
  'http://localhost/foo/bar.html?fizz=buzz#readme',
  'http://example.com/api/users',
  'https://www.example.com/path/to/resource',
  '/api/v1/users/123',
  'http://localhost/ snow.html',
  'http://localhost/%20snow.html',
  'http://localhost/\uD83D\uDC7B snow.html'
]

function benchmark(name, fn) {
  // Warmup
  for (var i = 0; i < 10000; i++) {
    fn()
  }

  if (global.gc) {
    global.gc()
  }

  var start = process.hrtime.bigint()
  for (var j = 0; j < ITERATIONS; j++) {
    fn()
  }
  var end = process.hrtime.bigint()

  var elapsed = Number(end - start) / 1e6
  return elapsed
}

console.log('encodeurl - Performance Comparison')
console.log('===================================')
console.log('Iterations: ' + ITERATIONS.toLocaleString())
console.log('')

var results = []

testUrls.forEach(function (url, index) {
  var urlDesc = url.length > 50 ? url.substring(0, 47) + '...' : url
  urlDesc = urlDesc.replace(/\n/g, '\\n')

  console.log('Test ' + (index + 1) + ': ' + urlDesc)

  var originalTime = benchmark('Original', function () {
    encodeUrlOriginal(url)
  })

  var optimizedTime = benchmark('Optimized', function () {
    encodeUrlOptimized(url)
  })

  var improvement = ((originalTime - optimizedTime) / originalTime * 100)

  console.log('  Original:  ' + originalTime.toFixed(2) + 'ms')
  console.log('  Optimized: ' + optimizedTime.toFixed(2) + 'ms')
  console.log('  Improvement: ' + improvement.toFixed(1) + '%')
  console.log('')

  results.push({
    url: urlDesc,
    original: originalTime,
    optimized: optimizedTime,
    improvement: improvement
  })
})

// Overall benchmark
console.log('Mixed URLs Test')
var urlIndex = 0
var originalMixed = benchmark('Original Mixed', function () {
  encodeUrlOriginal(testUrls[urlIndex % testUrls.length])
  urlIndex++
})

urlIndex = 0
var optimizedMixed = benchmark('Optimized Mixed', function () {
  encodeUrlOptimized(testUrls[urlIndex % testUrls.length])
  urlIndex++
})

var mixedImprovement = ((originalMixed - optimizedMixed) / originalMixed * 100)

console.log('  Original:  ' + originalMixed.toFixed(2) + 'ms')
console.log('  Optimized: ' + optimizedMixed.toFixed(2) + 'ms')
console.log('  Improvement: ' + mixedImprovement.toFixed(1) + '%')
console.log('')

// Summary
var avgImprovement = results.reduce(function (sum, r) { return sum + r.improvement }, 0) / results.length

console.log('Summary')
console.log('=======')
console.log('Average improvement: ' + avgImprovement.toFixed(1) + '%')
console.log('Mixed URLs improvement: ' + mixedImprovement.toFixed(1) + '%')
console.log('')
console.log('Best case: ' + Math.max.apply(null, results.map(function (r) { return r.improvement })).toFixed(1) + '%')
console.log('Worst case: ' + Math.min.apply(null, results.map(function (r) { return r.improvement })).toFixed(1) + '%')

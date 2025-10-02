/*!
 * encodeurl - benchmark
 * Copyright(c) 2024
 * MIT Licensed
 */

'use strict'

var encodeUrl = require('./index.js')

// Benchmark configuration
var ITERATIONS = 1000000
var WARMUP_ITERATIONS = 10000

// Test URLs
var testUrls = [
  // Common valid URLs (should hit fast path)
  'http://localhost/foo/bar.html?fizz=buzz#readme',
  'http://example.com/api/users',
  'https://www.example.com/path/to/resource',
  '/api/v1/users/123',

  // URLs with special characters
  'http://localhost/ snow.html',
  'http://localhost/\ntest.html',
  'http://localhost/path with spaces',

  // URLs with percent encoding
  'http://localhost/%20snow.html',
  'http://localhost/%F0snow.html',

  // URLs with unicode
  'http://localhost/\uD83D\uDC7B snow.html',
  'http://example.com/文档/测试',

  // Complex URLs
  'http://localhost/path?param1=value1&param2=value2&param3=value3',
  'http://[::1]:8080/foo/bar',
  'http://localhost/\x00\x01\x02test.html'
]

function benchmark(name, fn) {
  // Warmup
  for (var i = 0; i < WARMUP_ITERATIONS; i++) {
    fn()
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }

  // Actual benchmark
  var start = process.hrtime.bigint()
  for (var j = 0; j < ITERATIONS; j++) {
    fn()
  }
  var end = process.hrtime.bigint()

  var elapsed = Number(end - start) / 1e6 // Convert to milliseconds
  var opsPerSec = (ITERATIONS / elapsed) * 1000

  console.log(name)
  console.log('  Time: ' + elapsed.toFixed(2) + 'ms')
  console.log('  Ops/sec: ' + opsPerSec.toFixed(0))
  console.log('  Avg: ' + (elapsed / ITERATIONS * 1000).toFixed(3) + 'μs')
  console.log('')

  return elapsed
}

console.log('encodeurl benchmark')
console.log('===================')
console.log('Iterations: ' + ITERATIONS.toLocaleString())
console.log('Warmup: ' + WARMUP_ITERATIONS.toLocaleString())
console.log('')

var totalTime = 0

// Benchmark each URL type
testUrls.forEach(function (url, index) {
  var urlDesc = url.length > 50 ? url.substring(0, 47) + '...' : url
  urlDesc = urlDesc.replace(/\n/g, '\\n').replace(/\x00/g, '\\x00')

  var time = benchmark('Test ' + (index + 1) + ': ' + urlDesc, function () {
    encodeUrl(url)
  })
  totalTime += time
})

// Overall benchmark with mixed URLs
var urlIndex = 0
var mixedTime = benchmark('Mixed URLs (all tests)', function () {
  encodeUrl(testUrls[urlIndex % testUrls.length])
  urlIndex++
})

console.log('Summary')
console.log('=======')
console.log('Total time (individual): ' + totalTime.toFixed(2) + 'ms')
console.log('Total time (mixed): ' + mixedTime.toFixed(2) + 'ms')
console.log('Average per URL type: ' + (totalTime / testUrls.length).toFixed(2) + 'ms')
console.log('')
console.log('Run with --expose-gc flag for more accurate results:')
console.log('  node --expose-gc benchmark.js')

// Pure-JS sanity tests for the edge DNS cache helpers in CodeFull.gs.
//
// Run from repo root:  node assets/apps_script/tests/edge_dns_test.js
//
// The tests extract the helpers that don't depend on the GAS runtime
// (Utilities, CacheService, UrlFetchApp) and exercise them against
// crafted DNS wire-format payloads. They catch the bugs most likely to
// regress when editing the parser: txid handling, name-pointer
// compression, TTL sign-extension, splice ordering with mixed batches.

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'CodeFull.gs');
const src = fs.readFileSync(SRC, 'utf8');

// Extract pure-JS helpers and eval them in a shared scope so cross-refs
// (_dnsMinTtl → _dnsSkipName) resolve.
const NAMES = [
  '_dnsSkipName',
  '_dnsParseQuestion',
  '_dnsMinTtl',
  '_dnsRewriteTxid',
  '_spliceTunnelResults',
];
let bundle = '';
for (const name of NAMES) {
  const re = new RegExp(`function ${name}\\b[\\s\\S]*?\\n\\}\\n`, 'g');
  const m = src.match(re);
  if (!m) throw new Error('helper not found in CodeFull.gs: ' + name);
  bundle += m[0] + '\n';
}
bundle += `return { ${NAMES.join(', ')} };`;
// eslint-disable-next-line no-new-func
const ctx = new Function(bundle)();

let passed = 0;
function ok(label) { console.log('  ok'); passed++; }
function check(label, cond, detail) {
  if (!cond) {
    console.error('FAIL: ' + label + (detail ? ' — ' + detail : ''));
    process.exit(1);
  }
}

// --- 1. parse a query for example.com A ---
const q1 = Buffer.from([
  0x12, 0x34,                                               // txid
  0x01, 0x00,                                               // flags: RD=1
  0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,           // counts
  0x07, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,           // "example"
  0x03, 0x63, 0x6f, 0x6d, 0x00,                             // "com" 0
  0x00, 0x01, 0x00, 0x01,                                   // qtype=A, qclass=IN
]);
console.log('TEST 1 query parse');
const r1 = ctx._dnsParseQuestion(q1);
check('txid',  r1.txid  === 0x1234, r1 && r1.txid.toString(16));
check('qname', r1.qname === 'example.com', r1 && r1.qname);
check('qtype', r1.qtype === 1);
ok();

// --- 2. case-fold (DNS names are case-insensitive on the wire) ---
const q2 = Buffer.from([
  0xab, 0xcd, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x07, 0x45, 0x58, 0x41, 0x4d, 0x50, 0x4c, 0x45,           // "EXAMPLE"
  0x03, 0x43, 0x4f, 0x4d, 0x00,                             // "COM" 0
  0x00, 0x1c, 0x00, 0x01,                                   // qtype=AAAA(28)
]);
console.log('TEST 2 case-fold to lowercase');
const r2 = ctx._dnsParseQuestion(q2);
check('lowercased qname', r2.qname === 'example.com', r2 && r2.qname);
check('qtype AAAA',       r2.qtype === 28);
ok();

// --- 3. txid rewrite preserves all other bytes ---
console.log('TEST 3 txid rewrite is byte-identical except [0..1]');
const rewritten = ctx._dnsRewriteTxid(q1, 0xdead);
check('hi byte',    (rewritten[0] & 0xFF) === 0xde);
check('lo byte',    (rewritten[1] & 0xFF) === 0xad);
check('length',     rewritten.length === q1.length);
for (let i = 2; i < q1.length; i++) {
  check('byte ' + i + ' unchanged', (rewritten[i] & 0xFF) === q1[i]);
}
check('source not mutated (cache safety)',
  q1[0] === 0x12 && q1[1] === 0x34, 'source bytes 0..1 = ' + q1[0] + ',' + q1[1]);
ok();

// --- 4. min-TTL extraction with answer name-pointer compression ---
const reply4 = Buffer.from([
  0x12, 0x34, 0x81, 0x80,
  0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x07, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
  0x03, 0x63, 0x6f, 0x6d, 0x00,
  0x00, 0x01, 0x00, 0x01,
  0xc0, 0x0c,                                               // pointer to QNAME
  0x00, 0x01, 0x00, 0x01,
  0x00, 0x00, 0x01, 0x2c,                                   // TTL=300
  0x00, 0x04,
  0x5d, 0xb8, 0xd8, 0x22,                                   // 93.184.216.34
]);
console.log('TEST 4 reply min-TTL (answer with pointer)');
check('TTL=300', ctx._dnsMinTtl(reply4) === 300);
ok();

// --- 5. NXDOMAIN with SOA in authority — TTL comes from authority RR ---
const soa = Buffer.from([
  0x02, 0x6e, 0x73, 0x04, 0x74, 0x65, 0x73, 0x74, 0x00,     // mname "ns.test."
  0x0a, 0x68, 0x6f, 0x73, 0x74, 0x6d, 0x61, 0x73, 0x74, 0x65, 0x72,
  0x04, 0x74, 0x65, 0x73, 0x74, 0x00,                        // rname
  0x00, 0x00, 0x00, 0x01,
  0x00, 0x00, 0x00, 0x02,
  0x00, 0x00, 0x00, 0x03,
  0x00, 0x00, 0x00, 0x04,
  0x00, 0x00, 0x00, 0x05,
]);
const nxHeader = Buffer.from([
  0x12, 0x34, 0x81, 0x83,                                   // RCODE=3
  0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
  0x07, 0x6d, 0x69, 0x73, 0x73, 0x69, 0x6e, 0x67,           // "missing"
  0x04, 0x74, 0x65, 0x73, 0x74, 0x00,                        // "test"
  0x00, 0x01, 0x00, 0x01,
]);
const authRR = Buffer.concat([
  Buffer.from([0xc0, 0x14]),                                 // pointer to "test"
  Buffer.from([0x00, 0x06, 0x00, 0x01]),                    // SOA / IN
  Buffer.from([0x00, 0x00, 0x00, 0x3c]),                    // TTL=60
  Buffer.from([0x00, soa.length]),
  soa,
]);
const nxReply = Buffer.concat([nxHeader, authRR]);
console.log('TEST 5 NXDOMAIN: rcode + SOA TTL parse');
check('rcode 3', (nxReply[3] & 0x0F) === 3);
check('soa TTL 60', ctx._dnsMinTtl(nxReply) === 60);
ok();

// --- 6. malformed (truncated header) → null ---
console.log('TEST 6 truncated input rejected');
check('null', ctx._dnsParseQuestion(Buffer.from([0x00, 0x00, 0x01])) === null);
ok();

// --- 7. illegal pointer in question section → null ---
const q7 = Buffer.from([
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xc0, 0x0c,                                               // illegal in question
  0x00, 0x01, 0x00, 0x01,
]);
console.log('TEST 7 reject compression in question');
check('null', ctx._dnsParseQuestion(q7) === null);
ok();

// --- 8. TTL with high bit set is clamped to 0 (RFC 2181 §8) ---
// Build a minimal A reply where the answer's 4-byte TTL field is 0x80000000.
const reply8 = Buffer.from([
  0x12, 0x34, 0x81, 0x80,
  0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x07, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
  0x03, 0x63, 0x6f, 0x6d, 0x00,
  0x00, 0x01, 0x00, 0x01,
  0xc0, 0x0c,
  0x00, 0x01, 0x00, 0x01,
  0x80, 0x00, 0x00, 0x00,                                   // TTL with top bit set
  0x00, 0x04,
  0x01, 0x02, 0x03, 0x04,
]);
console.log('TEST 8 TTL with high bit → clamped to 0');
const t8 = ctx._dnsMinTtl(reply8);
check('TTL clamped to 0 (not negative, not 2^31+)', t8 === 0, 'got ' + t8);
ok();

// --- 9. splice: forwarded results land at original op indices ---
console.log('TEST 9 splice into mixed-batch slots');
// Simulate a 5-op batch where indices 1 and 3 were served locally as DNS
// hits, indices 0/2/4 were forwarded as TCP ops.
const allResults = new Array(5);
allResults[1] = { sid: 'edns-cache-1', pkts: ['A'], eof: true };
allResults[3] = { sid: 'edns-doh-3',   pkts: ['B'], eof: true };
const forwardIdx = [0, 2, 4];
const forwardedResults = [
  { sid: 'tcp-0', d: 'X' },
  { sid: 'tcp-2', d: 'Y' },
  { sid: 'tcp-4', d: 'Z' },
];
const merged = ctx._spliceTunnelResults(forwardIdx, forwardedResults, allResults);
check('slot 0 from tunnel', merged[0].sid === 'tcp-0');
check('slot 1 from cache',  merged[1].sid === 'edns-cache-1');
check('slot 2 from tunnel', merged[2].sid === 'tcp-2');
check('slot 3 from doh',    merged[3].sid === 'edns-doh-3');
check('slot 4 from tunnel', merged[4].sid === 'tcp-4');
check('returns same array', merged === allResults);
ok();

// --- 10. splice when nothing is forwarded ---
console.log('TEST 10 splice with empty forward list');
const allDns = [{ sid: 'a' }, { sid: 'b' }];
const result10 = ctx._spliceTunnelResults([], [], allDns);
check('no mutation', result10[0].sid === 'a' && result10[1].sid === 'b');
ok();

// --- 11. splice when everything is forwarded ---
console.log('TEST 11 splice with everything forwarded');
const empty = new Array(3);
const result11 = ctx._spliceTunnelResults(
  [0, 1, 2],
  [{ sid: 'x' }, { sid: 'y' }, { sid: 'z' }],
  empty,
);
check('all filled', result11[0].sid === 'x' && result11[2].sid === 'z');
ok();

console.log('\n' + passed + ' tests passed');

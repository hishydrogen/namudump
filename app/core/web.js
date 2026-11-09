'use strict';
// namudump:// 주소로 내주는 화면 파일과, 밖으로 여는 링크 검사. Electron 없이 시험할 수 있게 따로 둔다.
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};
// 문서를 열기만 해서는 인터넷에 접속하지 않는다(외부 그림 금지). 동영상 틀만 누르면 https로 연다.
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; script-src 'self'; connect-src 'self'; frame-src https:; media-src https: http:; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'";
const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// web 폴더 안의 파일만 내준다(../ 등으로 밖을 가리키면 404)
async function staticResponse(webRoot, rel) {
  const root = path.resolve(webRoot);
  const file = path.resolve(root, String(rel || '').replace(/^\/+/, '') || 'index.html');
  if (file !== root && !file.startsWith(root + path.sep)) return new Response('not found', { status: 404 });
  let body;
  try { body = await fs.promises.readFile(file); } catch (e) { return new Response('not found', { status: 404 }); }
  const headers = { ...BASE_HEADERS, 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
  if (path.basename(file) === 'index.html') headers['Content-Security-Policy'] = CSP;
  return new Response(body, { status: 200, headers });
}

// 화면 안의 주소(/, /search, /w/문서)는 모두 index.html이 그린다
function isAppRoute(p) { return p === '/' || p === '/search' || p.startsWith('/w/'); }

// 기본 브라우저로 열어도 되는 주소: 웹 주소와 메일만
function isExternalUrl(url) {
  return /^(https?:\/\/|mailto:)/i.test(url || '') && !/[\r\n\0]/.test(url);
}

module.exports = { MIME, CSP, jsonResponse, staticResponse, isAppRoute, isExternalUrl };

'use strict';
// 덤프 읽기는 이 작업 스레드에서 한다. 큰 문서를 풀거나 제목 목록을 읽는 동안에도 창이 멈추지 않는다.
const { parentPort, workerData } = require('node:worker_threads');
const { UserStore } = require('./core/store');
const { App } = require('./core/api');

const app = new App(new UserStore(workerData.supportDir), workerData.info);

parentPort.on('message', (m) => {
  const r = app.handle(m.method, m.ep, m.query, m.body);
  parentPort.postMessage({ id: m.id, status: r.status, data: r.data });
});

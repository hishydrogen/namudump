'use strict';
// 화면이 창과 운영체제 기능(파일 선택, 외부 링크, 창 바탕색, 맥 스크롤 입력)을 부를 통로. 이것만 내보낸다.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ndNative', {
  platform: process.platform,
  call: (ep, body) => ipcRenderer.invoke('nd', String(ep), body === undefined ? null : body),
  // 맥 트랙패드, 휠 입력: [종류, 위상, 관성 위상, 쓸기 단계, dx, dy, x, y]
  onInput: (cb) => { ipcRenderer.on('nd-input', (e, m) => cb(m)); },
});

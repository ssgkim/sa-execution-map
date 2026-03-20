/* ===== data.js — Configuration & Static Data ===== */

const solutions = [
  { id: 'ocp', name: 'OpenShift (OCP)' }, { id: 'ocp-virt', name: 'OCP Virt' }, { id: 'rhel', name: 'RHEL' },
  { id: 'rhoai', name: 'OpenShift AI' }, { id: 'aap', name: 'Ansible' }, { id: 'acs', name: 'ACS (Security)' },
  { id: 'acm', name: 'ACM (Mgmt)' }, { id: 'middleware', name: 'Middleware' }, { id: 'storage', name: 'Storage' },
  { id: 'edge', name: 'Edge' }, { id: 'migration', name: 'Migration' }
];

const stages = ['Early Sales', 'Proposal / PoC', 'Pilot', 'Production'];
const stageIcons = ['🔍', '📝', '🧪', '🚀'];

// Editable kit items per pipeline stage (Fallback defaults)
// Editable kit items per pipeline stage (Fallback defaults)
let kits = [
  { solId: '*', stage: 0, cat: 'collateral', name: 'Discovery 질문지' },
  { solId: '*', stage: 0, cat: 'collateral', name: '1-Pager' },
  { solId: '*', stage: 0, cat: 'collateral', name: '성공사례 요약' },
  { solId: '*', stage: 0, cat: 'engagement', name: 'Discovery Session' },
  { solId: '*', stage: 0, cat: 'engagement', name: 'Roadshow' },
  { solId: '*', stage: 0, cat: 'engagement', name: 'Account Day' },
  { solId: '*', stage: 1, cat: 'collateral', name: 'Ref Architecture' },
  { solId: '*', stage: 1, cat: 'collateral', name: 'PoC 시나리오' },
  { solId: '*', stage: 1, cat: 'collateral', name: '경쟁비교표' },
  { solId: '*', stage: 1, cat: 'collateral', name: '상세 제안서' },
  { solId: '*', stage: 1, cat: 'engagement', name: 'Live Demo' },
  { solId: '*', stage: 1, cat: 'engagement', name: 'Navigate Workshop' },
  { solId: '*', stage: 1, cat: 'engagement', name: 'Hands-on (기초)' },
  { solId: '*', stage: 2, cat: 'collateral', name: '구축 체크리스트' },
  { solId: '*', stage: 2, cat: 'collateral', name: 'KPI 합의서' },
  { solId: '*', stage: 2, cat: 'collateral', name: '마이그레이션 플랜' },
  { solId: '*', stage: 2, cat: 'collateral', name: '문제해결 가이드' },
  { solId: '*', stage: 2, cat: 'engagement', name: 'Hands-on (심화)' },
  { solId: '*', stage: 2, cat: 'engagement', name: '에스컬레이션 체계' },
  { solId: '*', stage: 2, cat: 'engagement', name: '운영팀 온보딩' },
  { solId: '*', stage: 3, cat: 'collateral', name: '확산 로드맵' },
  { solId: '*', stage: 3, cat: 'collateral', name: '표준 운영 가이드(SOP)' },
  { solId: '*', stage: 3, cat: 'collateral', name: '성과 보고서' },
  { solId: '*', stage: 3, cat: 'collateral', name: '라이선스 최적화' },
  { solId: '*', stage: 3, cat: 'engagement', name: '챔피언 육성' },
  { solId: '*', stage: 3, cat: 'engagement', name: '전략 리뷰' },
  { solId: '*', stage: 3, cat: 'engagement', name: 'DevNation 연결' }
];

const colors = ['#EE0000', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722', '#8BC34A', '#E91E63', '#009688'];

/* ===== Cloud Sync (Google Sheets via GAS Web App) ===== */
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxF2Ufj5UKLAY2vQIbRbVsZ1fQCGA0S_mV1t6bQoG0urLIfGhF3XFSgDStGEEq39bos/exec";

let cloudSyncStatus = 'idle'; // idle | syncing | done | error

async function fetchCloudData() {
  cloudSyncStatus = 'syncing';
  updateSyncBadge();
  try {
    // Add cache-busting timestamp to prevent browser from caching the JSON response
    const res = await fetch(`${GAS_WEB_APP_URL}?t=${Date.now()}`);
    const json = await res.json();
    cloudSyncStatus = 'done';
    updateSyncBadge();
    console.log('☁️ Cloud Sync 완료:', json);
    return json;
  } catch (err) {
    cloudSyncStatus = 'error';
    updateSyncBadge();
    console.error('☁️ Cloud Sync 실패:', err);
    return null;
  }
}

async function postTimelineToCloud(payload) {
  try {
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'appendTimeline', payload }),
      headers: { 'Content-Type': 'text/plain' } // GAS는 text/plain으로 받아야 CORS 우회
    });
    console.log('☁️ Timeline 클라우드 저장 완료');
  } catch (err) {
    console.error('☁️ 저장 실패:', err);
  }
}

function updateSyncBadge() {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const map = { idle: '☁️', syncing: '🔄', done: '✅', error: '❌' };
  badge.textContent = map[cloudSyncStatus] || '☁️';
  badge.title = cloudSyncStatus === 'done' ? 'Cloud 동기화 완료' :
    cloudSyncStatus === 'syncing' ? '동기화 중...' :
      cloudSyncStatus === 'error' ? '동기화 실패' : 'Cloud Sync';
}

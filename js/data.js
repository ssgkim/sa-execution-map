/* ===== data.js — Configuration & Static Data (v8.3) ===== */

const solutions = [
  { id: 'ocp', name: 'OpenShift (OCP)', color: '#EE0000' },
  { id: 'ocp-virt', name: 'OCP Virt', color: '#CC0000' },
  { id: 'rhel', name: 'RHEL', color: '#4CAF50' },
  { id: 'rhoai', name: 'OpenShift AI', color: '#9C27B0' },
  { id: 'aap', name: 'Ansible', color: '#FF9800' },
  { id: 'acs', name: 'ACS (Security)', color: '#2196F3' },
  { id: 'acm', name: 'ACM (Mgmt)', color: '#00BCD4' },
  { id: 'middleware', name: 'Middleware', color: '#FF5722' },
  { id: 'storage', name: 'Storage', color: '#8BC34A' },
  { id: 'edge', name: 'Edge', color: '#E91E63' },
  { id: 'migration', name: 'Migration', color: '#607D8B' }
];

const stages = ['Early Sales', 'Proposal / PoC', 'Pilot', 'Production'];
const stageIcons = ['🔍', '📝', '🧪', '🚀'];

const discoveryGapItems = [
  { cat: 'collateral', name: 'Discovery 질문지', key: 'c:Discovery 질문지' },
  { cat: 'collateral', name: '1-Pager', key: 'c:1-Pager' },
  { cat: 'engagement', name: 'Discovery Session', key: 'e:Discovery Session' }
];

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

/* ===== Multi-Source & Profile Management (v8.0 → v8.2) ===== */
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxF2Ufj5UKLAY2vQIbRbVsZ1fQCGA0S_mV1t6bQoG0urLIfGhF3XFSgDStGEEq39bos/exec";

let currentSourceMode = localStorage.getItem('sa_map_source_mode') || 'cloud';
let profiles = JSON.parse(localStorage.getItem('sa_map_profiles') || 'null') || [
  { name: 'Default Profile', url: DEFAULT_GAS_URL }
];
let currentProfileIndex = parseInt(localStorage.getItem('sa_map_current_profile_idx')) || 0;
if (currentProfileIndex >= profiles.length) currentProfileIndex = 0;

function getActiveGASUrl() {
  return profiles[currentProfileIndex]?.url || DEFAULT_GAS_URL;
}

function saveProfiles() {
  localStorage.setItem('sa_map_profiles', JSON.stringify(profiles));
  localStorage.setItem('sa_map_current_profile_idx', String(currentProfileIndex));
}

function setSourceMode(mode) {
  currentSourceMode = mode;
  localStorage.setItem('sa_map_source_mode', mode);
  init();
}

function addProfile(name, url) {
  profiles.push({ name, url });
  saveProfiles();
  renderSettings();
}

function updateProfile(idx, name, url) {
  if (profiles[idx]) {
    profiles[idx] = { name, url };
    saveProfiles();
    renderSettings();
  }
}

function deleteProfile(idx) {
  if (profiles.length <= 1) return alert('최소 한 개의 프로필은 유지해야 합니다.');
  profiles.splice(idx, 1);
  if (currentProfileIndex >= profiles.length) currentProfileIndex = profiles.length - 1;
  saveProfiles();
  renderSettings();
}

function selectProfile(idx) {
  currentProfileIndex = parseInt(idx);
  localStorage.setItem('sa_map_current_profile_idx', String(currentProfileIndex));
  if (currentSourceMode === 'cloud') init();
  else syncUI(true);
}

/* ===== Cloud Sync ===== */
let cloudSyncStatus = 'idle';

async function fetchCloudData() {
  const url = getActiveGASUrl();
  if (!url) return null;

  cloudSyncStatus = 'syncing';
  updateSyncBadge();
  try {
    const res = await fetch(`${url}?t=${Date.now()}`);
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
  const url = getActiveGASUrl();
  if (!url || currentSourceMode !== 'cloud') return;

  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'appendTimeline', payload }),
      headers: { 'Content-Type': 'text/plain' }
    });
    console.log('☁️ Timeline 클라우드 저장 완료');
  } catch (err) {
    console.error('☁️ 저장 실패:', err);
  }
}

async function postKitsToCloud(payload) {
  const url = getActiveGASUrl();
  if (!url || currentSourceMode !== 'cloud') return;

  try {
    const badge = document.getElementById('sync-badge');
    if (badge) badge.textContent = '🔄';
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'overwriteKits', payload }),
      headers: { 'Content-Type': 'text/plain' }
    });
    if (badge) badge.textContent = '✅';
    console.log('☁️ Kits 클라우드 동기화 완료');
  } catch (err) {
    console.error('☁️ Kits 동기화 실패:', err);
  }
}

function updateSyncBadge() {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const map = { idle: '☁️', syncing: '🔄', done: '✅', error: '❌' };
  badge.textContent = map[cloudSyncStatus] || '☁️';

  let label = 'Cloud Sync';
  if (currentSourceMode === 'demo') label = 'Demo Mode (Read Only)';
  else if (currentSourceMode === 'local') label = 'Local Storage Mode';
  else label = profiles[currentProfileIndex]?.name || 'Cloud Mode';

  badge.title = `${label} [${cloudSyncStatus}]`;
}

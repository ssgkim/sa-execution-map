/* ===== state.js — State Management (v8.3) ===== */

let accounts = [];
let selectedStreamId = null;
let activeFilters = new Set(solutions.map(s => s.id));
let inactiveIndustries = new Set();
let kitMgrStage = 0;
let kitTab = 'checklist'; // 'checklist' | 'timeline'
let kitViewStage = null; // null = follow stream.stage
let timelineEditMode = false;
let timelineAccordionState = { 0: true, 1: true, 2: true, 3: true };

// Persist local data when in local mode
function saveLocalData() {
  if (currentSourceMode === 'local') {
    localStorage.setItem('sa_map_local_accounts', JSON.stringify(accounts));
    localStorage.setItem('sa_map_local_kits', JSON.stringify(kits));
  }
}

// Helper: get merged kit { collateral:[], engagement:[] } for a given solId + stage
// Rules: items with solId === '*' (wildcard) + items matching the exact solId
function getKitForStream(solId, stage) {
  const c = [], e = [];
  kits.forEach(k => {
    if (k.stage === stage && (k.solId === '*' || k.solId === solId)) {
      if (k.cat === 'engagement') e.push(k.name);
      else c.push(k.name);
    }
  });
  return { collateral: c, engagement: e };
}

// Build default effort checklist for a given stage (uses wildcard * only)
function buildEfforts(stage, solId) {
  const kit = getKitForStream(solId || '*', stage);
  const efforts = {};
  kit.collateral.forEach(k => efforts['c:' + k] = false);
  kit.engagement.forEach(k => efforts['e:' + k] = false);
  return efforts;
}

// Get current effort score for a stream
function getEffortScore(s) {
  const efforts = s.stageEfforts ? s.stageEfforts[s.stage] : s.efforts;
  if (!efforts) return 0;
  const keys = Object.keys(efforts);
  if (!keys.length) return 0;
  return keys.filter(k => efforts[k]).length / keys.length;
}

// Discovery Gap Detection (v8.0)
function hasDiscoveryGap(stream) {
  if (stream.stage < 1) return false;
  const score0 = getStageEffortScore(stream, 0);
  return score0 < 0.5;
}

function getStageEffortScore(stream, stage) {
  const efforts = stream.stageEfforts ? stream.stageEfforts[stage] : null;
  if (!efforts) return 0;
  const keys = Object.keys(efforts);
  if (!keys.length) return 0;
  return keys.filter(k => efforts[k]).length / keys.length;
}

function effortColor(score) {
  if (score >= 0.7) return '#4CAF50';
  if (score >= 0.4) return '#FF9800';
  return '#f44336';
}

// ===== ACCOUNT ACTIONS =====

function addAccount() {
  if (currentSourceMode === 'demo') return alert('Demo 모드에서는 수정할 수 없습니다.');
  const id = Date.now();
  accounts.push({
    id, industry: '산업', customer: '고객사', active: true,
    oppties: [{ id: id + 1, name: '신규 오퍼튜니티', streams: [] }]
  });
  saveLocalData();
  syncUI(true);
}

// ===== CHILD OPPORTUNITY (Cross-sell / Upsell) — v8.3 =====

function addChildOpp(aId, parentOppId, sellType) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === aId);
  if (!a) return;
  const id = Date.now();
  const label = sellType === 'upsell' ? '업셀' : '크로스셀';
  a.oppties.push({
    id,
    name: `${label} — 신규`,
    parentOppId: parentOppId,
    sellType: sellType, // 'cross-sell' | 'upsell'
    streams: []
  });
  saveLocalData();
  syncUI(true);
}

function updateOppSellType(aId, oId, sellType) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === aId);
  const o = a?.oppties.find(x => x.id === oId);
  if (o) o.sellType = sellType;
  saveLocalData();
  syncUI(false);
}

function deleteOpp(aId, oId) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === aId);
  if (!a) return;
  // Also delete all child oppties
  const childIds = a.oppties.filter(o => o.parentOppId === oId).map(o => o.id);
  a.oppties = a.oppties.filter(o => o.id !== oId && !childIds.includes(o.id));
  // Clear selected stream if it belonged to deleted opp
  const allStreamIds = new Set();
  a.oppties.forEach(o => o.streams.forEach(s => allStreamIds.add(s.id)));
  if (selectedStreamId && !allStreamIds.has(selectedStreamId)) {
    // Check all accounts
    let found = false;
    accounts.forEach(ac => ac.oppties.forEach(op => op.streams.forEach(st => { if (st.id === selectedStreamId) found = true; })));
    if (!found) selectedStreamId = null;
  }
  saveLocalData();
  syncUI(true);
}

// Helper: get parent opportunity name
function getParentOppName(a, opp) {
  if (!opp.parentOppId) return null;
  const parent = a.oppties.find(x => x.id === opp.parentOppId);
  return parent ? parent.name : null;
}

// Helper: get all root oppties (no parent) for an account
function getRootOppties(a) {
  return a.oppties.filter(o => !o.parentOppId);
}

// Helper: get child oppties for a given opp
function getChildOppties(a, oppId) {
  return a.oppties.filter(o => o.parentOppId === oppId);
}

// Helper: calculate total deal value for an opp tree (self + children)
function getOppTreeAmount(a, oppId) {
  const opp = a.oppties.find(o => o.id === oppId);
  if (!opp) return 0;
  let total = opp.streams.reduce((s, st) => s + (st.amount || 0), 0);
  getChildOppties(a, oppId).forEach(child => {
    total += getOppTreeAmount(a, child.id);
  });
  return total;
}

function updateAccount(id, field, val) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === id);
  if (a) a[field] = val;
  saveLocalData();
  syncUI(field === 'industry');
}

function updateOpp(aId, oId, val) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === aId);
  const o = a.oppties.find(x => x.id === oId);
  if (o) o.name = val;
  saveLocalData();
  syncUI(false);
}

function addStream(aId, oId) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === aId);
  const o = a.oppties.find(x => x.id === oId);
  const sid = `s-${Date.now()}`;
  o.streams.push({
    id: sid, solId: 'ocp', stage: 0, amount: 1000, hurdle: 30,
    stageEfforts: { 
      0: buildEfforts(0, 'ocp'), 
      1: buildEfforts(1, 'ocp'), 
      2: buildEfforts(2, 'ocp'), 
      3: buildEfforts(3, 'ocp') 
    },
    timeline: []
  });
  selectedStreamId = sid;
  kitViewStage = null;
  timelineEditMode = false;
  saveLocalData();
  syncUI(true);
}

function updateStream(sid, field, val) {
  if (currentSourceMode === 'demo') return;
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s) {
      s[field] = val;
      if (!s.stageEfforts || field === 'solId') {
        const oldEfforts = s.stageEfforts || { 0: {}, 1: {}, 2: {}, 3: {} };
        s.stageEfforts = { 
          0: buildEfforts(0, s.solId), 
          1: buildEfforts(1, s.solId), 
          2: buildEfforts(2, s.solId), 
          3: buildEfforts(3, s.solId) 
        };
        // Preserve check status if keys match
        for(let st=0; st<4; st++) {
          for(let key in s.stageEfforts[st]) {
            if(oldEfforts[st] && key in oldEfforts[st]) {
              s.stageEfforts[st][key] = oldEfforts[st][key];
            }
          }
        }
      }
    }
  }));
  saveLocalData();
  syncUI(false);
}

function toggleEffort(sid, key, vStage) {
  if (currentSourceMode === 'demo') return;
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s) {
      const targetStage = vStage !== undefined ? vStage : s.stage;
      if (!s.stageEfforts) s.stageEfforts = { 0: buildEfforts(0, s.solId), 1: buildEfforts(1, s.solId), 2: buildEfforts(2, s.solId), 3: buildEfforts(3, s.solId) };
      const currentVal = !!s.stageEfforts[targetStage][key];
      s.stageEfforts[targetStage][key] = !currentVal;

      if (!currentVal) {
        if (!s.timeline) s.timeline = [];
        const name = key.substring(2);
        const cat = key.startsWith('c:') ? 'collateral' : 'engagement';
        const date = new Date().toISOString().split('T')[0];

        const exists = s.timeline.some(ev => ev.date === date && ev.stage === targetStage && ev.name === name);
        if (!exists) {
          const newEvent = {
            id: Date.now(),
            date: date,
            stage: targetStage,
            cat: cat,
            name: name,
            memo: '체크리스트 완료'
          };
          s.timeline.push(newEvent);

          // Cloud Sync
          postTimelineToCloud({
            customer: a.customer,
            opportunity: o.name,
            solId: s.solId,
            stage: newEvent.stage,
            date: newEvent.date,
            name: newEvent.name,
            memo: '체크리스트 완료'
          });
        }
      }
    }
  }));
  saveLocalData();
  syncUI(false);
}

function addTimelineEvent(sid, cat, name, vStage) {
  if (currentSourceMode === 'demo') return;
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s) {
      const targetStage = vStage !== undefined ? vStage : s.stage;
      if (!s.timeline) s.timeline = [];
      const newEvent = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        stage: targetStage,
        cat: cat,
        name: name,
        memo: ''
      };
      s.timeline.push(newEvent);

      // Cloud Sync
      postTimelineToCloud({
        customer: a.customer,
        opportunity: o.name,
        solId: s.solId,
        stage: newEvent.stage,
        date: newEvent.date,
        name: newEvent.name,
        memo: newEvent.memo || ''
      });

      const key = (cat === 'collateral' ? 'c:' : 'e:') + name;
      if (!s.stageEfforts) s.stageEfforts = { 0: buildEfforts(0, s.solId), 1: buildEfforts(1, s.solId), 2: buildEfforts(2, s.solId), 3: buildEfforts(3, s.solId) };
      s.stageEfforts[targetStage][key] = true;
    }
  }));
  saveLocalData();
  syncUI(false);
}

async function syncTimelineUpdateToCloud(customer, opportunity, solId, stage, name, oldDate, updates) {
  const url = getActiveGASUrl();
  if (!url || currentSourceMode !== 'cloud') return;
  const badge = document.getElementById('sync-badge');
  try {
    if (badge) badge.textContent = '🔄';
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateTimeline',
        search: { customer, opportunity, solId, stage, date: oldDate, name },
        update: updates
      })
    });
    if (badge) badge.textContent = '☁️';
  } catch (e) {
    console.error('Update Timeline Sync Error:', e);
    if (badge) badge.textContent = '⚠️';
  }
}

function exportTimelineCSV() {
  let csv = [];
  accounts.forEach(a => {
    a.oppties.forEach(o => {
      o.streams.forEach(s => {
        if (s.timeline) {
          s.timeline.forEach(ev => {
            const memo = String(ev.memo || '').replace(/,/g, ' ');
            csv.push(`${a.customer},${o.name},${s.solId},${ev.stage},${ev.date},${ev.name},${memo}`);
          });
        }
      });
    });
  });

  const csvStr = csv.join('\n');
  const ta = document.getElementById('activity-csv-input');
  if (ta) {
    ta.value = csvStr;
    ta.select();
    try {
      document.execCommand('copy');
      alert('현재 화면의 모든 타임라인 데이터가 CSV 형식으로 텍스트 박스에 추출되고 클립보드에 복사되었습니다!\n\n이 텍스트를 구글 스프레드시트 Timeline 탭에 그대로 붙여넣기 하시면 완벽하게 수동 동기화됩니다.');
    } catch (e) {
      alert('데이터가 텍스트 박스에 추출되었습니다. 수동으로 복사해주세요.');
    }
  }
}

function updateTimelineEvent(sid, evId, field, val) {
  if (currentSourceMode === 'demo') return;
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s && s.timeline) {
      const ev = s.timeline.find(e => e.id === evId);
      if (ev) {
        const oldDate = ev.date;
        ev[field] = val;
        syncTimelineUpdateToCloud(a.customer, o.name, s.solId, ev.stage, ev.name, oldDate, { [field]: val });
      }
    }
  }));
  saveLocalData();
  syncUI(false);
}

function deleteTimelineEvent(sid, evId) {
  if (currentSourceMode === 'demo') return;
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s && s.timeline) {
      s.timeline = s.timeline.filter(ev => ev.id !== evId);
    }
  }));
  saveLocalData();
  syncUI(false);
}

function deleteStream(aId, oId, sid) {
  if (currentSourceMode === 'demo') return;
  const a = accounts.find(x => x.id === aId);
  const o = a.oppties.find(x => x.id === oId);
  o.streams = o.streams.filter(x => x.id !== sid);
  if (selectedStreamId === sid) selectedStreamId = null;
  saveLocalData();
  syncUI(true);
}

function selectStream(id) { selectedStreamId = id; kitViewStage = null; timelineEditMode = false; syncUI(true); }

// ===== FILTER & TAB ACTIONS =====

function toggleFilter() {
  const b = document.getElementById('filter-body');
  const i = document.getElementById('filter-icon');
  const h = b.style.display === 'none';
  b.style.display = h ? 'block' : 'none';
  i.textContent = h ? '▲' : '▼';
}

function toggleSolFilter(id) {
  if (activeFilters.has(id)) activeFilters.delete(id);
  else activeFilters.add(id);
  syncUI(false);
}

function toggleIndustryFilter(ind) {
  if (inactiveIndustries.has(ind)) inactiveIndustries.delete(ind);
  else inactiveIndustries.add(ind);
  syncUI(true);
}

function toggleAccountActive(aId, currentActive) {
  const a = accounts.find(x => x.id === aId);
  if (a) a.active = !currentActive;
  saveLocalData();
  syncUI(true);
}

function filterAll(v) {
  if (v) solutions.forEach(s => activeFilters.add(s.id));
  else activeFilters.clear();
  syncUI(false);
}

function setKitTab(tab) {
  kitTab = tab;
  renderKit();
}

function setKitViewStage(stage) {
  kitViewStage = stage;
  renderKit();
}

function toggleTimelineEdit() {
  timelineEditMode = !timelineEditMode;
  renderKit();
}

function toggleTimelineAccordion(st) {
  timelineAccordionState[st] = !timelineAccordionState[st];
  renderKit();
}

// ===== CSV IMPORT =====

async function importCSV() {
  const input = document.getElementById('csv-input').value;
  if (!input) return;
  document.getElementById('csv-input').value = '☁️ 클라우드로 전송 중입니다... (10~20초 소요될 수 있습니다)';

  const uploadRows = [];
  input.trim().split('\n').forEach((line) => {
    const p = line.split(',').map(s => s.trim());
    if (p.length < 6) return;
    const [ind, cus, opp, prod, stage, amt] = p;
    uploadRows.push([ind, cus, opp, prod, parseInt(stage) || 0, parseInt(amt) || 0]);
  });

  if (uploadRows.length > 0 && currentSourceMode === 'cloud') {
    const url = getActiveGASUrl();
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'bulkAppend', sheetName: 'Accounts', payload: uploadRows })
      });
      console.log('✅ Accounts Bulk Upload 완료');
    } catch (e) { console.error('Bulk Import Error:', e); }
  }

  await init();
  document.getElementById('csv-input').value = '';
  alert('데이터 임포트가 완료되었습니다.');
}

async function importActivityCSV() {
  const input = document.getElementById('activity-csv-input').value;
  if (!input) return;
  document.getElementById('activity-csv-input').value = '☁️ 클라우드로 전송 중입니다... (10~20초 소요될 수 있습니다)';

  const uploadRows = [];
  input.trim().split('\n').forEach(line => {
    const p = line.split(',').map(s => s.trim());
    if (p.length < 7) return;
    const [cus, opp, prod, stageStr, date, name, memo] = p;
    const actStage = parseInt(stageStr, 10);
    if (isNaN(actStage) || actStage < 0 || actStage > 3) return;
    uploadRows.push([cus, opp, prod, actStage, date, name, memo]);
  });

  if (uploadRows.length > 0 && currentSourceMode === 'cloud') {
    const url = getActiveGASUrl();
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'bulkAppend', sheetName: 'Timeline', payload: uploadRows })
      });
      console.log('✅ Timeline Bulk Upload 완료');
    } catch (e) { console.error('Activity Import Error:', e); }
  }

  await init();
  document.getElementById('activity-csv-input').value = '';
  alert('타임라인 데이터 전송이 완료되었습니다.');
}

// ===== KIT MANAGER ACTIONS (v8.1 — syncGlobalKitsToStreams) =====

function toggleKitMgr() {
  const b = document.getElementById('kit-mgr-body');
  const i = document.getElementById('kit-mgr-icon');
  const h = b.style.display === 'none';
  b.style.display = h ? 'block' : 'none';
  i.textContent = h ? '▲' : '▼';
  if (h) renderKitMgr();
}

function selectKitStage(s) { kitMgrStage = s; renderKitMgr(); }

/**
 * 전역 kits 설정 변경을 이미 생성된 모든 스트림의 stageEfforts에 반영 (CRITICAL)
 */
function syncGlobalKitsToStreams(stage, cat, action, oldName, newName) {
  const prefix = (cat === 'collateral' ? 'c:' : 'e:');
  const oldKey = prefix + oldName;
  const newKey = prefix + newName;

  accounts.forEach(a => {
    a.oppties.forEach(o => {
      o.streams.forEach(s => {
        if (!s.stageEfforts) {
          s.stageEfforts = { 0: buildEfforts(0, s.solId), 1: buildEfforts(1, s.solId), 2: buildEfforts(2, s.solId), 3: buildEfforts(3, s.solId) };
        }
        
        const efforts = s.stageEfforts[stage];
        if (!efforts) return;

        if (action === 'add') {
          if (!(newKey in efforts)) efforts[newKey] = false;
        } else if (action === 'delete') {
          delete efforts[oldKey];
        } else if (action === 'rename') {
          if (oldKey in efforts) {
            efforts[newKey] = efforts[oldKey];
            delete efforts[oldKey];
          } else {
            efforts[newKey] = false;
          }
          if (s.timeline) {
            s.timeline.forEach(ev => {
              if (ev.stage === stage && ev.name === oldName) ev.name = newName;
            });
          }
        }
      });
    });
  });
}

function addKitItem(stage, cat) {
  if (currentSourceMode === 'demo') return;
  const name = cat === 'collateral' ? '새 자료' : '새 활동';
  kits.push({ solId: '*', stage: stage, cat: cat, name: name });
  
  syncGlobalKitsToStreams(stage, cat, 'add', null, name);
  
  renderKitMgr();
  saveLocalData();
  syncUI(true);
  postKitsToCloud(kits);
  console.log('✅ 세일즈킷 추가 및 전역 동기화 완료');
}

function deleteKitItem(stage, cat, idx) {
  if (currentSourceMode === 'demo') return;
  const matching = kits.filter(k => k.stage === stage && k.cat === cat && k.solId === '*');
  if (idx >= matching.length) return;
  const target = matching[idx];
  const oldName = target.name;
  
  const realIdx = kits.indexOf(target);
  if (realIdx !== -1) kits.splice(realIdx, 1);
  
  syncGlobalKitsToStreams(stage, cat, 'delete', oldName, null);
  
  renderKitMgr();
  saveLocalData();
  syncUI(true);
  postKitsToCloud(kits);
  alert(`'${oldName}' 항목이 삭제되었습니다. 모든 파이프라인에서 해당 체크리스트가 제거되었습니다.`);
}

function renameKitItem(stage, cat, idx, newName) {
  if (currentSourceMode === 'demo') return;
  const matching = kits.filter(k => k.stage === stage && k.cat === cat && k.solId === '*');
  if (idx >= matching.length) return;
  const target = matching[idx];
  const oldName = target.name;
  if (oldName === newName) return;

  target.name = newName;
  
  syncGlobalKitsToStreams(stage, cat, 'rename', oldName, newName);
  
  saveLocalData();
  syncUI(true);
  postKitsToCloud(kits);
  console.log(`✅ 세일즈킷 이름 변경: ${oldName} -> ${newName} (전역 동기화 포함)`);
}

// ===== CLOUD DATA TRANSFORMATION (v7.0) =====
function transformCloudToTree(flatData, timelineData = []) {
  const tree = [];
  flatData.forEach((row, idx) => {
    let a = tree.find(x => x.customer === row.customer && x.industry === row.industry);
    if (!a) {
      a = { id: Date.now() + idx, industry: row.industry, customer: row.customer, oppties: [], active: true };
      tree.push(a);
    }

    let o = a.oppties.find(x => x.name === row.opportunity);
    if (!o) {
      o = { id: Date.now() + idx + 1000, name: row.opportunity, streams: [] };
      a.oppties.push(o);
    }

    const sid = row.id || `s-${row.customer}-${row.opportunity}-${row.product}`.replace(/\s+/g, '-');
    const stg = parseInt(row.stage) || 0;
    o.streams.push({
      id: sid,
      solId: row.product,
      stage: stg,
      amount: parseInt(row.amount) || 0,
      hurdle: 30,
      stageEfforts: { 
        0: buildEfforts(0, row.product), 
        1: buildEfforts(1, row.product), 
        2: buildEfforts(2, row.product), 
        3: buildEfforts(3, row.product) 
      },
      timeline: []
    });
  });

  timelineData.forEach(ev => {
    if (isNaN(parseInt(ev.stage))) return;

    tree.forEach(a => {
      if (a.customer !== ev.customer) return;
      a.oppties.forEach(o => {
        if (o.name !== ev.opportunity) return;
        o.streams.forEach(s => {
          if (s.solId !== ev.solId) return;

          let name = ev.name || '';
          let memo = ev.memo || '';
          const targetStage = parseInt(ev.stage) || 0;

          let cat = 'engagement';
          const kitForCat = getKitForStream(s.solId, targetStage);
          if (kitForCat.collateral.includes(name)) {
            cat = 'collateral';
          }

          let dateStr = ev.date;
          if (dateStr && String(dateStr).includes('T')) {
            dateStr = String(dateStr).split('T')[0];
          }

          const exist = s.timeline.find(x => x.date === dateStr && x.stage === targetStage && x.name === name);

          if (!exist) {
            s.timeline.push({
              id: Date.now() + Math.random(),
              date: dateStr,
              stage: targetStage,
              cat: cat,
              name: name,
              memo: memo
            });

            if (s.stageEfforts && s.stageEfforts[targetStage]) {
              const actKey = (cat === 'collateral' ? 'c:' : 'e:') + name;
              if (actKey in s.stageEfforts[targetStage]) {
                s.stageEfforts[targetStage][actKey] = true;
              }
            }
          }
        });
      });
    });
  });

  return tree;
}

// ===== THEME =====
function setTheme(t) {
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  setTimeout(() => syncUI(true), 50);
}

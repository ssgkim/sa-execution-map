/* ===== state.js — State Management ===== */

let accounts = [];
let selectedStreamId = null;
let activeFilters = new Set(solutions.map(s => s.id));
let kitMgrStage = 0;

// Build default effort checklist for a given stage
function buildEfforts(stage) {
  const kit = kits[stage];
  const efforts = {};
  kit.collateral.forEach(k => efforts['c:'+k] = false);
  kit.engagement.forEach(k => efforts['e:'+k] = false);
  return efforts;
}

// Calculate effort completion score (0~1)
function getEffortScore(s) {
  if (!s.efforts) return 0;
  const keys = Object.keys(s.efforts);
  if (!keys.length) return 0;
  return keys.filter(k => s.efforts[k]).length / keys.length;
}

// Color based on effort score
function effortColor(score) {
  if (score >= 0.7) return '#4CAF50';
  if (score >= 0.4) return '#FF9800';
  return '#f44336';
}

// ===== ACCOUNT ACTIONS =====

function addAccount() {
  const id = Date.now();
  accounts.push({ id, industry:'산업', customer:'고객사', oppties: [{ id: id+1, name:'신규 오퍼튜니티', streams:[] }] });
  syncUI(true);
}

function updateAccount(id, field, val) {
  const a = accounts.find(x => x.id === id);
  if (a) a[field] = val;
  syncUI(false);
}

function updateOpp(aId, oId, val) {
  const a = accounts.find(x => x.id === aId);
  const o = a.oppties.find(x => x.id === oId);
  if (o) o.name = val;
  syncUI(false);
}

function addStream(aId, oId) {
  const a = accounts.find(x => x.id === aId);
  const o = a.oppties.find(x => x.id === oId);
  const sid = `s-${Date.now()}`;
  o.streams.push({ id: sid, solId:'ocp', stage:0, amount:1000, hurdle:30, efforts: buildEfforts(0) });
  selectedStreamId = sid;
  syncUI(true);
}

function updateStream(sid, field, val) {
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s) {
      s[field] = val;
      if (field === 'stage') {
        const newEfforts = buildEfforts(val);
        Object.keys(newEfforts).forEach(k => { if (s.efforts && s.efforts[k]) newEfforts[k] = true; });
        s.efforts = newEfforts;
      }
    }
  }));
  syncUI(false);
}

function toggleEffort(sid, key) {
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s && s.efforts) s.efforts[key] = !s.efforts[key];
  }));
  syncUI(false);
}

function deleteStream(aId, oId, sid) {
  const a = accounts.find(x => x.id === aId);
  const o = a.oppties.find(x => x.id === oId);
  o.streams = o.streams.filter(x => x.id !== sid);
  if (selectedStreamId === sid) selectedStreamId = null;
  syncUI(true);
}

function selectStream(id) { selectedStreamId = id; syncUI(true); }

// ===== FILTER ACTIONS =====

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

function filterAll(v) {
  if (v) solutions.forEach(s => activeFilters.add(s.id));
  else activeFilters.clear();
  syncUI(false);
}

// ===== CSV IMPORT =====

function importCSV() {
  const input = document.getElementById('csv-input').value;
  if (!input) return;
  accounts = [];
  input.trim().split('\n').forEach((line, idx) => {
    const p = line.split(',').map(s => s.trim());
    if (p.length < 6) return;
    const [ind, cus, opp, prod, stage, amt] = p;
    let a = accounts.find(x => x.customer === cus);
    if (!a) { a = { id: Date.now()+idx, industry: ind, customer: cus, oppties: [] }; accounts.push(a); }
    let o = a.oppties.find(x => x.name === opp);
    if (!o) { o = { id: Date.now()+idx+100, name: opp, streams: [] }; a.oppties.push(o); }
    const stg = parseInt(stage) || 0;
    o.streams.push({ id: `s-${Date.now()}-${idx}`, solId: prod, stage: stg, amount: parseInt(amt)||0, hurdle: 30, efforts: buildEfforts(stg) });
  });
  syncUI(true);
}

// ===== KIT MANAGER ACTIONS =====

function toggleKitMgr() {
  const b = document.getElementById('kit-mgr-body');
  const i = document.getElementById('kit-mgr-icon');
  const h = b.style.display === 'none';
  b.style.display = h ? 'block' : 'none';
  i.textContent = h ? '▲' : '▼';
  if (h) renderKitMgr();
}

function selectKitStage(s) { kitMgrStage = s; renderKitMgr(); }

function addKitItem(stage, cat) {
  const name = cat === 'collateral' ? '새 자료' : '새 활동';
  kits[stage][cat].push(name);
  accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
    if (s.stage === stage && s.efforts) {
      s.efforts[(cat === 'collateral' ? 'c:' : 'e:') + name] = false;
    }
  })));
  renderKitMgr();
  syncUI(true);
}

function deleteKitItem(stage, cat, idx) {
  const oldName = kits[stage][cat][idx];
  const key = (cat === 'collateral' ? 'c:' : 'e:') + oldName;
  kits[stage][cat].splice(idx, 1);
  accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
    if (s.stage === stage && s.efforts) delete s.efforts[key];
  })));
  renderKitMgr();
  syncUI(true);
}

function renameKitItem(stage, cat, idx, newName) {
  const oldName = kits[stage][cat][idx];
  if (oldName === newName) return;
  const oldKey = (cat === 'collateral' ? 'c:' : 'e:') + oldName;
  const newKey = (cat === 'collateral' ? 'c:' : 'e:') + newName;
  kits[stage][cat][idx] = newName;
  accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
    if (s.stage === stage && s.efforts && oldKey in s.efforts) {
      s.efforts[newKey] = s.efforts[oldKey];
      delete s.efforts[oldKey];
    }
  })));
  syncUI(true);
}

// ===== THEME =====

function setTheme(t) {
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  setTimeout(() => syncUI(true), 50);
}

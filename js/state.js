/* ===== state.js — State Management (v6.3) ===== */

let accounts = [];
let selectedStreamId = null;
let activeFilters = new Set(solutions.map(s => s.id));
let kitMgrStage = 0;
let kitTab = 'checklist'; // 'checklist' | 'timeline'
let kitViewStage = null; // null = follow stream.stage
let timelineEditMode = false;
let timelineAccordionState = { 0: true, 1: true, 2: true, 3: true };

// Build default effort checklist for a given stage
function buildEfforts(stage) {
  const kit = kits[stage];
  const efforts = {};
  kit.collateral.forEach(k => efforts['c:'+k] = false);
  kit.engagement.forEach(k => efforts['e:'+k] = false);
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

function effortColor(score) {
  if (score >= 0.7) return '#4CAF50';
  if (score >= 0.4) return '#FF9800';
  return '#f44336';
}

// ===== ACCOUNT ACTIONS =====

function addAccount() {
  const id = Date.now();
  accounts.push({ 
    id, industry:'산업', customer:'고객사', 
    oppties: [{ id: id+1, name:'신규 오퍼튜니티', streams:[] }] 
  });
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
  o.streams.push({ 
    id: sid, solId:'ocp', stage:0, amount:1000, hurdle:30, 
    stageEfforts: { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) },
    timeline: []
  });
  selectedStreamId = sid;
  kitViewStage = null;
  timelineEditMode = false;
  syncUI(true);
}

function updateStream(sid, field, val) {
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s) {
      s[field] = val;
      if (!s.stageEfforts) {
        s.stageEfforts = { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) };
        if (s.efforts) s.stageEfforts[s.stage] = s.efforts;
      }
    }
  }));
  syncUI(false);
}

function toggleEffort(sid, key, vStage) {
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s) {
      const targetStage = vStage !== undefined ? vStage : s.stage;
      if (!s.stageEfforts) s.stageEfforts = { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) };
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
          
          // Cloud Sync (v7.0)
          postTimelineToCloud({
            accountId: sid, // stream id as account linkage
            date: newEvent.date,
            type: 'event',
            stage: newEvent.stage,
            content: `[${cat}] ${newEvent.name}`
          });
        }
      }
    }
  }));
  syncUI(false);
}

function addTimelineEvent(sid, cat, name, vStage) {
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
      
      // Cloud Sync (v7.0)
      postTimelineToCloud({
        accountId: sid,
        date: newEvent.date,
        type: 'memo',
        stage: newEvent.stage,
        content: newEvent.name
      });

      const key = (cat === 'collateral' ? 'c:' : 'e:') + name;
      if (!s.stageEfforts) s.stageEfforts = { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) };
      s.stageEfforts[targetStage][key] = true;
    }
  }));
  syncUI(false);
}

function updateTimelineEvent(sid, evId, field, val) {
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s && s.timeline) {
      const ev = s.timeline.find(e => e.id === evId);
      if (ev) ev[field] = val;
    }
  }));
  syncUI(false);
}

function deleteTimelineEvent(sid, evId) {
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === sid);
    if (s && s.timeline) {
      s.timeline = s.timeline.filter(ev => ev.id !== evId);
    }
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
    o.streams.push({ 
      id: `s-${Date.now()}-${idx}`, solId: prod, stage: stg, amount: parseInt(amt)||0, hurdle: 30, 
      stageEfforts: { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) },
      timeline: []
    });
  });
  syncUI(true);
}

function importActivityCSV() {
  const input = document.getElementById('activity-csv-input').value;
  if (!input) return;
  input.trim().split('\n').forEach(line => {
    const p = line.split(',').map(s => s.trim());
    if (p.length < 7) return;
    const [cus, opp, prod, stageStr, date, name, memo] = p;
    const actStage = parseInt(stageStr, 10);
    if (isNaN(actStage) || actStage < 0 || actStage > 3) return;

    let actCat = 'engagement';
    let actKey = 'e:' + name;
    
    if (kits[actStage].collateral.includes(name)) {
      actCat = 'collateral'; actKey = 'c:' + name;
    } else if (kits[actStage].engagement.includes(name)) {
      actCat = 'engagement'; actKey = 'e:' + name;
    }

    accounts.forEach(a => {
      if (a.customer !== cus) return;
      a.oppties.forEach(o => {
        if (o.name !== opp) return;
        const s = o.streams.find(st => st.solId === prod);
        if (s) {
          if (!s.timeline) s.timeline = [];
          
          const targetStage = actStage;
          const exists = s.timeline.some(ev => ev.date === date && ev.stage === targetStage && ev.name === name);
          if (!exists) {
            s.timeline.push({ id: Date.now() + Math.random(), date, stage: targetStage, cat: actCat, name, memo });
          }
          
          if (!s.stageEfforts) s.stageEfforts = { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) };
          if (s.stageEfforts[targetStage] && actKey in s.stageEfforts[targetStage]) {
             s.stageEfforts[targetStage][actKey] = true;
          }
        }
      });
    });
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
    if (!s.stageEfforts) s.stageEfforts = { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) };
    const key = (cat === 'collateral' ? 'c:' : 'e:') + name;
    s.stageEfforts[stage][key] = false;
  })));
  renderKitMgr();
  syncUI(true);
}

function deleteKitItem(stage, cat, idx) {
  const oldName = kits[stage][cat][idx];
  const key = (cat === 'collateral' ? 'c:' : 'e:') + oldName;
  kits[stage][cat].splice(idx, 1);
  accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
    if (s.stageEfforts) delete s.stageEfforts[stage][key];
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
    if (s.stageEfforts && oldKey in s.stageEfforts[stage]) {
      s.stageEfforts[stage][newKey] = s.stageEfforts[stage][oldKey];
      delete s.stageEfforts[stage][oldKey];
    }
    if (s.timeline) {
      s.timeline.forEach(ev => { if(ev.stage === stage && ev.name === oldName) ev.name = newName; });
    }
  })));
  syncUI(true);
}

// ===== THEME =====

// ===== CLOUD DATA TRANSFORMATION (v7.0) =====
function transformCloudToTree(flatData) {
  const tree = [];
  flatData.forEach((row, idx) => {
    // row: { industry, customer, opportunity, product, stage, amount }
    let a = tree.find(x => x.customer === row.customer);
    if (!a) {
      a = { id: Date.now() + idx, industry: row.industry, customer: row.customer, oppties: [] };
      tree.push(a);
    }
    
    let o = a.oppties.find(x => x.name === row.opportunity);
    if (!o) {
      o = { id: Date.now() + idx + 1000, name: row.opportunity, streams: [] };
      a.oppties.push(o);
    }
    
    const sid = `s-${Date.now()}-${idx}`;
    const stg = parseInt(row.stage) || 0;
    o.streams.push({
      id: sid,
      solId: row.product,
      stage: stg,
      amount: parseInt(row.amount) || 0,
      hurdle: 30,
      stageEfforts: { 0: buildEfforts(0), 1: buildEfforts(1), 2: buildEfforts(2), 3: buildEfforts(3) },
      timeline: []
    });
  });
  return tree;
}

function setTheme(t) {
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  setTimeout(() => syncUI(true), 50);
}

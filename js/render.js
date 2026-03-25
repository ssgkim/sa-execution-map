/* ===== render.js — All UI Rendering (v8.3) ===== */

function syncUI(full = true) {
  renderSourceSwitcher();
  renderProfileSelector();
  renderFilter();
  if (full) renderAccountList();
  renderMap();
  renderSwimLane();
  renderKit();
  renderDashboard();
}

// ===== SOURCE & PROFILE (v8.0 → v8.2) =====

function renderSourceSwitcher() {
  const modes = ['cloud', 'local', 'demo'];
  modes.forEach(m => {
    const btn = document.getElementById(`src-btn-${m}`);
    if (btn) btn.classList.toggle('active', currentSourceMode === m);
  });
  const profileCont = document.getElementById('profile-selector-container');
  if (profileCont) {
    profileCont.style.display = currentSourceMode === 'cloud' ? 'block' : 'none';
  }
}

function renderProfileSelector() {
  const select = document.getElementById('profile-select');
  if (!select) return;
  select.innerHTML = profiles.map((p, i) =>
    `<option value="${i}" ${currentProfileIndex === i ? 'selected' : ''}>${p.name}</option>`
  ).join('');
}

function openSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal) { modal.style.display = 'flex'; renderSettings(); }
}

function closeSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none';
}

function renderSettings() {
  const container = document.getElementById('profiles-list-container');
  if (!container) return;
  container.innerHTML = profiles.map((p, i) => `
    <div style="padding:8px; border:1px solid var(--border); border-radius:6px; margin-bottom:8px;">
      <input type="text" class="config-input" value="${p.name}" onchange="updateProfile(${i}, this.value, profiles[${i}].url)" style="width:100%; margin-bottom:4px; font-weight:bold;">
      <input type="text" class="config-input" value="${p.url}" onchange="updateProfile(${i}, profiles[${i}].name, this.value)" style="width:100%; font-size:0.75em;">
      <div style="display:flex; gap:5px; margin-top:5px;">
        <button class="btn-action" style="background:${currentProfileIndex === i ? '#4CAF50' : 'var(--border)'}; font-size:0.7em; ${currentProfileIndex === i ? 'color:#fff;' : ''}" onclick="selectProfile(${i})">
          ${currentProfileIndex === i ? '✅ 선택됨' : '선택'}
        </button>
        <button class="btn-action" style="background:#f44336; font-size:0.7em; color:#fff;" onclick="deleteProfile(${i})">삭제</button>
      </div>
    </div>
  `).join('');
}

function addNewProfile() {
  const nameInput = document.getElementById('new-profile-name');
  const urlInput = document.getElementById('new-profile-url');
  if (!nameInput.value || !urlInput.value) return alert('이름과 URL을 모두 입력하세요.');
  addProfile(nameInput.value, urlInput.value);
  nameInput.value = '';
  urlInput.value = '';
}

// ===== FILTER =====

function renderFilter() {
  const allInds = Array.from(new Set(accounts.map(a => a.industry)));
  const indHtml = allInds.map(ind =>
    `<div class="sol-tag ${inactiveIndustries.has(ind) ? '' : 'active'}" style="border-radius:12px; border-style:dashed;" onclick="toggleIndustryFilter('${ind}')">🏢 ${ind}</div>`
  ).join('');

  document.getElementById('filter-grid').innerHTML = `
    <div style="margin-bottom:8px; display:flex; gap:4px; flex-wrap:wrap;">${indHtml}</div>
    <div style="display:flex; gap:4px; flex-wrap:wrap;">
      ${solutions.map(s => `<div class="sol-tag ${activeFilters.has(s.id) ? 'active' : ''}" onclick="toggleSolFilter('${s.id}')">${s.name}</div>`).join('')}
    </div>
  `;
  renderLegend();
}

function renderLegend() {
  const container = document.getElementById('map-legend');
  if (!container) return;
  container.innerHTML = solutions.map(s =>
    `<div style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px;cursor:pointer;font-size:0.75em;${activeFilters.has(s.id) ? '' : 'opacity:0.4'}" onclick="toggleSolFilter('${s.id}')">
      <span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block;"></span>
      <span>${s.name}</span>
    </div>`
  ).join('');
}

// ===== KIT MANAGER =====

function renderKitMgr() {
  document.getElementById('kit-stage-tabs').innerHTML = stages.map((st, i) =>
    `<div class="kit-stage-btn ${kitMgrStage === i ? 'active' : ''}" onclick="selectKitStage(${i})">${stageIcons[i]} ${st}</div>`
  ).join('');

  const kit = getKitForStream('*', kitMgrStage);
  document.getElementById('kit-mgr-content').innerHTML = `
    <div class="kit-cat-title">📦 세일즈 자료 (Collateral)</div>
    ${kit.collateral.map((item, idx) => `
      <div class="kit-edit-item">
        <input class="kit-edit-input" value="${item}" onchange="renameKitItem(${kitMgrStage},'collateral',${idx},this.value)" onclick="event.stopPropagation()">
        <button class="kit-del-btn" onclick="deleteKitItem(${kitMgrStage},'collateral',${idx})">✕</button>
      </div>
    `).join('')}
    <button class="kit-add-btn" onclick="addKitItem(${kitMgrStage},'collateral')">＋ 자료 추가</button>
    <div class="kit-cat-title">🤝 활동 (Engagement)</div>
    ${kit.engagement.map((item, idx) => `
      <div class="kit-edit-item">
        <input class="kit-edit-input" value="${item}" onchange="renameKitItem(${kitMgrStage},'engagement',${idx},this.value)" onclick="event.stopPropagation()">
        <button class="kit-del-btn" onclick="deleteKitItem(${kitMgrStage},'engagement',${idx})">✕</button>
      </div>
    `).join('')}
    <button class="kit-add-btn" onclick="addKitItem(${kitMgrStage},'engagement')">＋ 활동 추가</button>
  `;
}

// ===== ACCOUNT LIST (v8.3 — Opp Tree as flat siblings) =====

// Renders a single opp box (no child nesting — children are rendered as siblings)
function renderSingleOppBox(acc, opp, depth) {
  const sellBadge = opp.sellType
    ? `<span class="sell-badge sell-${opp.sellType}" title="${opp.sellType === 'upsell' ? '업셀' : '크로스셀'}">${opp.sellType === 'upsell' ? '⬆️ 업셀' : '🔀 크로스셀'}</span>`
    : '';
  const indent = depth > 0 ? `margin-left:${depth * 16}px; border-left:2px solid ${opp.sellType === 'upsell' ? '#FF9800' : '#2196F3'}; padding-left:8px;` : '';
  const treeAmount = getOppTreeAmount(acc, opp.id);
  const children = getChildOppties(acc, opp.id);

  return `<div class="oppty-box" style="${indent}">
    <div style="display:flex;align-items:center;gap:5px;">
      ${depth > 0 ? '<span style="font-size:0.7em;opacity:0.5;">↳</span>' : ''}
      ${sellBadge}
      <input class="oppty-name-input" style="flex:1;" value="${opp.name}" oninput="updateOpp(${acc.id},${opp.id},this.value)" onclick="event.stopPropagation()">
      ${depth > 0 ? `
        <select style="font-size:0.6em;padding:1px 3px;border:1px solid var(--border);border-radius:3px;background:var(--bg-card);color:var(--text-base);" onchange="updateOppSellType(${acc.id},${opp.id},this.value)" onclick="event.stopPropagation()">
          <option value="cross-sell" ${opp.sellType === 'cross-sell' ? 'selected' : ''}>🔀 크로스셀</option>
          <option value="upsell" ${opp.sellType === 'upsell' ? 'selected' : ''}>⬆️ 업셀</option>
        </select>
      ` : ''}
      <button style="font-size:0.6em;border:none;background:none;cursor:pointer;color:var(--text-muted);opacity:0.6;" onclick="event.stopPropagation();deleteOpp(${acc.id},${opp.id})" title="오퍼튜니티 삭제">✕</button>
    </div>
    ${treeAmount > 0 && children.length > 0 ? `<div style="font-size:0.6em;color:var(--text-muted);margin:2px 0;">📊 트리 합계: ${treeAmount.toLocaleString()}만원</div>` : ''}
    ${opp.streams.map(s => {
      const score = getEffortScore(s);
      const eColor = effortColor(score);
      const isSel = selectedStreamId === s.id;
      const gap = hasDiscoveryGap(s);
      return `<div class="stream-item ${isSel ? 'active-stream' : ''}" onclick="selectStream('${s.id}')">
        <div class="stream-row">
          ${gap ? '<span title="Discovery Gap — Early Sales 완료율 50% 미만" style="margin-right:4px;">⚠️</span>' : ''}
          <select class="stream-select" style="flex:1" onchange="updateStream('${s.id}','solId',this.value)" onclick="event.stopPropagation()">
            ${solutions.map(sol => `<option value="${sol.id}" ${s.solId === sol.id ? 'selected' : ''}>${sol.name}</option>`).join('')}
          </select>
          <select class="stream-select" onchange="updateStream('${s.id}','stage',parseInt(this.value))" onclick="event.stopPropagation()">
            ${stages.map((st, i) => `<option value="${i}" ${s.stage === i ? 'selected' : ''}>${stageIcons[i]}</option>`).join('')}
          </select>
          <input class="acc-input stream-amount" type="number" value="${s.amount}" oninput="updateStream('${s.id}','amount',parseInt(this.value))" onclick="event.stopPropagation()">
          <button style="font-size:0.7em;border:none;background:none;cursor:pointer;color:var(--text-muted)" onclick="event.stopPropagation();deleteStream(${acc.id},${opp.id},'${s.id}')">✕</button>
        </div>
        <div class="effort-bar-wrap">
          <span>Effort ${Math.round(score * 100)}%</span>
          <div class="effort-bar"><div class="effort-bar-fill" style="width:${score * 100}%;background:${eColor}"></div></div>
        </div>
      </div>`;
    }).join('')}
    <div style="display:flex;gap:4px;flex-wrap:wrap;">
      <button class="btn-action" style="font-size:0.65em;padding:2px 6px" onclick="addStream(${acc.id},${opp.id})">＋ 스트림</button>
      <button class="btn-action" style="font-size:0.6em;padding:2px 5px;background:var(--surface,#f5f5f5);color:#2196F3;border:1px dashed #2196F3;" onclick="addChildOpp(${acc.id},${opp.id},'cross-sell')">🔀 크로스셀</button>
      <button class="btn-action" style="font-size:0.6em;padding:2px 5px;background:var(--surface,#f5f5f5);color:#FF9800;border:1px dashed #FF9800;" onclick="addChildOpp(${acc.id},${opp.id},'upsell')">⬆️ 업셀</button>
    </div>
  </div>`;
}

// Flatten opp tree into sibling divs (parent first, then children) — no DOM nesting
function renderOppTree(acc, opp, depth) {
  let html = renderSingleOppBox(acc, opp, depth);
  const children = getChildOppties(acc, opp.id);
  children.forEach(child => {
    html += renderOppTree(acc, child, depth + 1);
  });
  return html;
}

function renderAccountList() {
  document.getElementById('account-list').innerHTML = accounts.map((acc, ai) => {
    const isInactive = acc.active === false || inactiveIndustries.has(acc.industry);
    const rootOppties = getRootOppties(acc);
    return `<div class="account-card ${isInactive ? 'inactive-account' : ''}" style="border-top:3px solid ${colors[ai % colors.length]}">
      <div class="acc-header">
        <input class="acc-input industry" value="${acc.industry}" oninput="updateAccount(${acc.id},'industry',this.value)" onclick="event.stopPropagation()">
        <input class="acc-input customer" value="${acc.customer}" oninput="updateAccount(${acc.id},'customer',this.value)" onclick="event.stopPropagation()">
        <button style="border:none;background:none;cursor:pointer;font-size:1.1em;opacity:0.6;margin-left:auto;" onclick="event.stopPropagation();toggleAccountActive(${acc.id}, ${acc.active !== false})">
          ${acc.active !== false ? '👁️' : '🚫'}
        </button>
      </div>
      ${isInactive ? '' : rootOppties.map(opp => renderOppTree(acc, opp, 0)).join('')}
    </div>`;
  }).join('');
}

// ===== MAP (Canvas) =====

function renderMap() {
  const canvas = document.getElementById('map-canvas');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth * 2; canvas.height = wrap.clientHeight * 2;
  const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
  const W = wrap.clientWidth, H = wrap.clientHeight, pad = 60;
  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const sMax = parseInt(document.getElementById('cfg-single-max').value) || 100000;
  const tMax = parseInt(document.getElementById('cfg-total-max').value) || 300000;
  const colW = (W - 2 * pad) / 4;

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.005)';
    ctx.fillRect(pad + i * colW, pad, colW, H - 2 * pad);
  }
  ctx.strokeStyle = cs.getPropertyValue('--q-border').trim(); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, H / 2); ctx.lineTo(W - pad, H / 2); ctx.stroke();
  ctx.setLineDash([3, 3]);
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(pad + i * colW, pad); ctx.lineTo(pad + i * colW, H - pad); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = cs.getPropertyValue('--text-muted').trim(); ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'center';
  stages.forEach((st, i) => ctx.fillText(`${stageIcons[i]} ${st}`, pad + i * colW + colW / 2, H - pad + 15));

  // 1. 전체 데이터 기준으로 모든 스트림의 고정(절대) 좌표 먼저 계산
  const allSlots = [[], [], [], []];
  accounts.forEach((acc, ai) => {
    const accTotal = acc.oppties.reduce((s, o) => s + o.streams.reduce((s2, st) => s2 + st.amount, 0), 0);
    acc.oppties.forEach(opp => opp.streams.forEach(s => {
      allSlots[s.stage].push({ s, acc, ai, accTotal });
    }));
  });

  allSlots.forEach((sl, si) => {
    const cx = pad + si * colW + colW / 2;
    const jR = colW * 0.35;
    sl.forEach((item, idx) => {
      const { s, accTotal } = item;
      const jSeed = (idx - (sl.length - 1) / 2);
      const jStep = sl.length > 1 ? jR / (sl.length - 1) : 0;
      s._rx = cx + jSeed * jStep;
      const yVal = (Math.min(1, s.amount / sMax) * 0.6) + (Math.min(1, accTotal / tMax) * 0.4);
      s._ry = (H - pad) - yVal * (H - 2 * pad);
      s._rr = 5 + Math.min(7, (s.amount / sMax) * 7);
    });
  });

  // 2. 가시성 필터(Account, Industry, Solution)를 적용하여 그리기만 수행
  allSlots.forEach(sl => {
    sl.forEach(item => {
      const { s, acc, ai } = item;

      if (acc.active === false || inactiveIndustries.has(acc.industry)) return;
      if (!activeFilters.has(s.solId)) return;

      const sol = solutions.find(x => x.id === s.solId);
      const color = sol ? sol.color : '#999';
      const xPos = s._rx;
      const yPos = s._ry;
      const baseR = s._rr;
      const isSel = s.id === selectedStreamId;
      const r = isSel ? baseR + 3 : baseR;
      const score = getEffortScore(s);
      const eColor = effortColor(score);
      const gap = hasDiscoveryGap(s);

      // Discovery Gap → dashed ring
      if (gap) ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(xPos, yPos, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 4; ctx.stroke();
      if (gap) ctx.setLineDash([]);

      if (score > 0) {
        ctx.beginPath(); ctx.arc(xPos, yPos, r + 3, -Math.PI / 2, -Math.PI / 2 + score * Math.PI * 2);
        ctx.strokeStyle = gap ? '#f44336' : eColor; ctx.lineWidth = 4; ctx.stroke();
      }
      ctx.globalAlpha = isSel ? 1 : 0.85;
      ctx.fillStyle = color;
      if (isSel) { ctx.shadowBlur = 14; ctx.shadowColor = color; }
      ctx.beginPath(); ctx.arc(xPos, yPos, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isSel ? '#000' : 'rgba(0,0,0,0.1)';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.beginPath(); ctx.arc(xPos, yPos, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = isSel ? cs.getPropertyValue('--text-heading') : cs.getPropertyValue('--text-dim');
      ctx.font = isSel ? 'bold 10px Segoe UI' : '9px Segoe UI'; ctx.textAlign = 'center';
      const gapIcon = gap ? '⚠️ ' : '';
      ctx.fillText(`${gapIcon}${acc.customer}:${sol ? sol.name : s.solId}`, xPos, yPos - r - 8);
    });
  });

  // 3. Cross-sell / Upsell 연결선 (v8.3)
  accounts.forEach(a => {
    if (a.active === false || inactiveIndustries.has(a.industry)) return;
    a.oppties.forEach(childOpp => {
      if (!childOpp.parentOppId) return;
      const parentOpp = a.oppties.find(o => o.id === childOpp.parentOppId);
      if (!parentOpp) return;

      // Connect each parent stream to each child stream
      parentOpp.streams.forEach(ps => {
        if (!activeFilters.has(ps.solId) || ps._rx == null) return;
        childOpp.streams.forEach(cs2 => {
          if (!activeFilters.has(cs2.solId) || cs2._rx == null) return;

          const lineColor = childOpp.sellType === 'upsell' ? '#FF9800' : '#2196F3';
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(ps._rx, ps._ry);

          // Curved line
          const cpx = (ps._rx + cs2._rx) / 2;
          const cpy = Math.min(ps._ry, cs2._ry) - 20;
          ctx.quadraticCurveTo(cpx, cpy, cs2._rx, cs2._ry);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(cs2._ry - cpy, cs2._rx - cpx);
          ctx.setLineDash([]);
          ctx.fillStyle = lineColor;
          ctx.beginPath();
          ctx.moveTo(cs2._rx, cs2._ry);
          ctx.lineTo(cs2._rx - 8 * Math.cos(angle - 0.4), cs2._ry - 8 * Math.sin(angle - 0.4));
          ctx.lineTo(cs2._rx - 8 * Math.cos(angle + 0.4), cs2._ry - 8 * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      });
    });
  });
}

// ===== SWIM LANE =====

function renderSwimLane() {
  const container = document.getElementById('swimlane-container');
  const canvas = document.getElementById('swimlane-canvas');
  if (!canvas) return;

  let selectedAcc = null;
  accounts.forEach(a => {
    if (a.active === false || inactiveIndustries.has(a.industry)) return;
    a.oppties.forEach(o => {
      if (o.streams.find(s => s.id === selectedStreamId)) selectedAcc = a;
    });
  });

  if (!selectedAcc) {
    container.style.display = 'none'; return;
  }

  const allEvents = [];
  selectedAcc.oppties.forEach(o => o.streams.forEach(s => {
    if (s.timeline) s.timeline.forEach(ev => allEvents.push({ ...ev, solId: s.solId }));
  }));

  if (allEvents.length === 0) {
    container.style.display = 'none'; return;
  }

  container.style.display = 'block';
  document.getElementById('swimlane-title').innerText = `🏊 ${selectedAcc.customer} — Activity Swim Lane`;

  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth * 2;
  const streamsWithEvents = selectedAcc.oppties.reduce((acc, o) => {
    o.streams.forEach(s => { if (s.timeline && s.timeline.length) acc.push(s); });
    return acc;
  }, []);

  canvas.height = Math.max(120, streamsWithEvents.length * 40 + 60) * 2;
  const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
  const W = wrap.clientWidth, H = canvas.height / 2, padX = 80, padY = 40;
  ctx.clearRect(0, 0, W, H);

  window.swimlaneHitboxes = [];
  window.swimlaneMeta = null;

  let minDate = new Date(), maxDate = new Date(0);
  allEvents.forEach(ev => {
    const d = new Date(ev.date);
    if (d < minDate) minDate = new Date(d);
    if (d > maxDate) maxDate = new Date(d);
  });

  if (maxDate < minDate) maxDate = new Date();
  minDate.setDate(minDate.getDate() - 5);
  maxDate.setDate(maxDate.getDate() + 5);
  const timeSpan = maxDate - minDate;

  window.swimlaneMeta = { minDate: new Date(minDate), timeSpan, padX, innerW: W - padX - 40 };

  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padX, H - 20); ctx.lineTo(W - 20, H - 20); ctx.stroke();

  const dayMs = 1000 * 60 * 60 * 24;
  const totalDays = timeSpan / dayMs;
  let stepDays = 1;
  if (totalDays > 365 * 2) stepDays = 365;
  else if (totalDays > 180) stepDays = 30;
  else if (totalDays > 60) stepDays = 14;
  else if (totalDays > 21) stepDays = 7;
  else if (totalDays > 7) stepDays = 2;

  const cs = getComputedStyle(document.documentElement);
  ctx.fillStyle = cs.getPropertyValue('--text-dim') || '#888';
  ctx.font = '10px Segoe UI'; ctx.textAlign = 'center';

  let curr = new Date(minDate);
  while (curr <= maxDate) {
    const px = padX + ((curr - minDate) / timeSpan) * (W - padX - 40);
    ctx.beginPath(); ctx.moveTo(px, H - 20); ctx.lineTo(px, H - 15); ctx.stroke();
    let label = '';
    if (stepDays >= 365) label = curr.getFullYear() + '년';
    else if (stepDays >= 30) label = `${curr.getFullYear()}.${String(curr.getMonth() + 1).padStart(2, '0')}`;
    else label = `${curr.getMonth() + 1}/${curr.getDate()}`;
    ctx.fillText(label, px, H - 5);
    curr.setDate(curr.getDate() + stepDays);
  }

  const laneH = (H - padY - 30) / streamsWithEvents.length;
  streamsWithEvents.forEach((s, i) => {
    const y = padY + i * laneH;
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    ctx.fillRect(padX, y - laneH / 2, W - padX - 20, laneH);
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - 20, y); ctx.stroke();

    ctx.fillStyle = '#666'; ctx.font = 'bold 10px Segoe UI'; ctx.textAlign = 'right';
    ctx.fillText(solutions.find(x => x.id === s.solId)?.name || s.solId, padX - 10, y + 3);

    if (s.timeline) {
      s.timeline.forEach(ev => {
        const x = padX + ((new Date(ev.date) - minDate) / timeSpan) * (W - padX - 40);
        const evColor = ['#9e9e9e', '#2196f3', '#ff9800', '#4caf50'][ev.stage];

        ctx.fillStyle = evColor;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

        window.swimlaneHitboxes.push({ x, y, r: 5, ev, sId: s.id });

        ctx.save();
        ctx.translate(x, y - 8);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#444'; ctx.font = '9px Segoe UI'; ctx.textAlign = 'left';
        ctx.fillText(ev.name, 0, 0);
        ctx.restore();
      });
    }
  });
}

// ===== KIT PANEL (Checklist & Timeline) =====

function renderKit() {
  const panel = document.getElementById('kit-panel');
  if (!selectedStreamId) { panel.style.display = 'none'; return; }

  let stream = null, acc = null, opp = null;
  accounts.forEach(a => a.oppties.forEach(o => {
    const s = o.streams.find(x => x.id === selectedStreamId);
    if (s) { stream = s; acc = a; opp = o; }
  }));
  if (!stream) return;

  panel.style.display = 'block';
  const sol = solutions.find(x => x.id === stream.solId);
  const score = getEffortScore(stream);

  document.getElementById('kit-title').innerHTML = `🏢 [${acc.industry}] <b>${acc.customer}</b> — ${sol ? sol.name : stream.solId}`;
  document.getElementById('kit-meta').innerHTML = `오퍼튜니티: ${opp.name} | 딜 단계: <b>${stages[stream.stage]}</b> | 금액: <b>${stream.amount.toLocaleString()}만원</b>`;

  document.getElementById('kit-tabs').innerHTML = `
    <div class="kit-tab ${kitTab === 'checklist' ? 'active' : ''}" onclick="setKitTab('checklist')">✅ 체크리스트 관리</div>
    <div class="kit-tab ${kitTab === 'timeline' ? 'active' : ''}" onclick="setKitTab('timeline')">📜 활동 이력 (${stream.timeline ? stream.timeline.length : 0})</div>
  `;

  if (kitTab === 'checklist') {
    document.getElementById('timeline-content').style.display = 'none';
    const cCont = document.getElementById('kit-content');
    cCont.style.display = 'block';

    const vStage = kitViewStage !== null ? kitViewStage : stream.stage;
    const kit = getKitForStream(stream.solId, vStage);

    let subTabsHtml = `<div class="kit-sub-tabs">` + stages.map((st, i) => `
      <div class="kit-sub-tab ${vStage === i ? 'active' : ''}" onclick="setKitViewStage(${i})">
        ${stageIcons[i]} ${st}
      </div>
    `).join('') + `</div>`;

    const renderItems = (items, cat) => items.map(item => {
      const key = (cat === 'c' ? 'c:' : 'e:') + item;
      const done = stream.stageEfforts ? !!stream.stageEfforts[vStage][key] : false;
      const count = stream.timeline ? stream.timeline.filter(ev => ev.name === item && ev.stage === vStage).length : 0;
      return `<div class="check-item" onclick="event.stopPropagation();toggleEffort('${stream.id}','${key}', ${vStage})">
        <div class="check-box ${done ? 'checked' : ''}">${done ? '✓' : ''}</div>
        <span class="check-label ${done ? 'done' : ''}">${item}</span>
        ${count > 0 ? `<span class="badge-count">×${count}</span>` : ''}
        <button class="add-event-btn" onclick="event.stopPropagation();addTimelineEvent('${stream.id}','${cat === 'c' ? 'collateral' : 'engagement'}','${item}', ${vStage})">＋</button>
      </div>`;
    }).join('');

    cCont.innerHTML = `
      ${subTabsHtml}
      <div class="kit-grid" style="margin-top:10px;">
        <div class="kit-box">
          <h5>📦 세일즈 자료 (Collateral)</h5>
          ${renderItems(kit.collateral, 'c')}
        </div>
        <div class="kit-box">
          <h5>🤝 활동 (Engagement)</h5>
          ${renderItems(kit.engagement, 'e')}
        </div>
      </div>
    `;

    const total = Object.keys(kit.collateral).length + Object.keys(kit.engagement).length;
    const done = stream.stageEfforts ? Object.values(stream.stageEfforts[vStage]).filter(Boolean).length : 0;
    const sScore = total ? done / total : 0;
    document.getElementById('effort-summary').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8em;">
        <b>${stages[vStage]} 달성도</b>
        <span style="color:${effortColor(sScore)};font-weight:800;font-size:1.1em;">${done}/${total} (${Math.round(sScore * 100)}%)</span>
      </div>
      <div class="effort-summary-bar"><div class="effort-summary-fill" style="width:${sScore * 100}%;background:${effortColor(sScore)}"></div></div>
    `;
  } else {
    document.getElementById('kit-content').style.display = 'none';
    const tCont = document.getElementById('timeline-content');
    tCont.style.display = 'block';

    if (!stream.timeline) stream.timeline = [];
    const grouped = { 0: [], 1: [], 2: [], 3: [] };
    stream.timeline.forEach(ev => grouped[ev.stage].push(ev));

    const sStage = stream.stage;
    const stageKits = getKitForStream(stream.solId, sStage);
    const existingNames = stream.timeline.filter(ev => ev.stage === sStage).map(ev => ev.name);

    const recommended = [];
    ['collateral', 'engagement'].forEach(cat => {
      stageKits[cat].forEach(item => {
        if (!existingNames.includes(item)) recommended.push({ cat, name: item });
      });
    });

    let recHtml = '';
    if (recommended.length > 0) {
      recHtml = `<div style="margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 6px; border-left: 3px solid var(--primary);">
        <div style="font-size: 0.7em; font-weight: bold; color: var(--text); margin-bottom: 6px;">💡 [${stages[sStage]}] 단계 추천 (Next Best Action)</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${recommended.map(r => `<button onclick="addTimelineEvent('${stream.id}', '${r.cat}', '${r.name}', ${sStage})" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 3px 8px; font-size: 0.65em; cursor: pointer; color: var(--text-heading); transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-heading)';">+ ${r.name}</button>`).join('')}
        </div>
      </div>`;
    }

    let tlHtml = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <button class="btn-action" style="font-size:0.7em;padding:4px 8px;background:var(--surface);color:var(--text);border:1px solid var(--border);" onclick="addTimelineEvent('${stream.id}', 'engagement', '신규 커스텀 활동', ${sStage})">➕ 사용자 이력 직접 추가</button>
      <button class="btn-action ${timelineEditMode ? 'edit-active' : ''}" style="font-size:0.7em;padding:4px 8px;" onclick="toggleTimelineEdit()">
        ${timelineEditMode ? '✅ 수정 완료' : '✏️ 이력 수정'}
      </button>
    </div>
    ${recHtml}
    <div class="timeline-list">`;

    if (stream.timeline.length === 0) {
      tlHtml += '<p style="padding:20px;text-align:center;color:#888;font-size:0.8em;">기록된 활동이 없습니다. 위 추천 활동을 누르거나 직접 추가 버튼을 눌러 시작하세요.</p>';
    } else {
      [0, 1, 2, 3].forEach(st => {
        if (grouped[st].length === 0) return;
        grouped[st].sort((a, b) => new Date(b.date) - new Date(a.date));

        const isOpen = timelineAccordionState[st];
        tlHtml += `
          <div class="timeline-group stage-${st}">
            <div class="tl-group-header" onclick="toggleTimelineAccordion(${st})" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; user-select:none;">
              <span>${stageIcons[st]} ${stages[st]} <small style="font-weight:normal; opacity:0.8;">(${grouped[st].length}건)</small></span>
              <span>${isOpen ? '▼' : '◀'}</span>
            </div>
            ${isOpen ? `
            <div class="tl-group-body">
              ${grouped[st].map(ev => `
                <div class="timeline-item">
                  <div class="tl-header">
                    ${timelineEditMode
            ? `<input type="date" class="tl-date-input" value="${ev.date}" onchange="updateTimelineEvent('${stream.id}', ${ev.id}, 'date', this.value)">`
            : `<span class="tl-date">${ev.date}</span>`
          }
                    <span class="tl-name">${ev.name}</span>
                    ${timelineEditMode ? `<button class="tl-del" onclick="event.stopPropagation();deleteTimelineEvent('${stream.id}', ${ev.id})">✕</button>` : ''}
                  </div>
                  ${timelineEditMode
            ? `<input type="text" class="tl-memo-input" value="${ev.memo || ''}" placeholder="메모 입력..." onchange="updateTimelineEvent('${stream.id}', ${ev.id}, 'memo', this.value)">`
            : (ev.memo ? `<div class="tl-memo">${ev.memo}</div>` : '<div class="tl-memo empty-memo">메모 없음</div>')
          }
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>
        `;
      });
    }
    tlHtml += '</div>';
    tCont.innerHTML = tlHtml;
    document.getElementById('effort-summary').innerHTML = '';
  }
}

// ===== DASHBOARD =====

function renderDashboard() {
  const dash = document.getElementById('dashboard-content');
  let totalEvents = 0, thisMonth = 0, activeDeals = 0;
  let crossSellCount = 0, upsellCount = 0, crossSellAmount = 0, upsellAmount = 0;
  const now = new Date();
  const monthStr = now.toISOString().substring(0, 7);
  const accountStats = {};

  accounts.forEach(a => {
    if (a.active === false || inactiveIndustries.has(a.industry)) return;
    let accEvents = 0;
    a.oppties.forEach(o => {
      activeDeals += o.streams.length;
      const oppAmount = o.streams.reduce((s, st) => s + (st.amount || 0), 0);
      if (o.sellType === 'cross-sell') { crossSellCount++; crossSellAmount += oppAmount; }
      if (o.sellType === 'upsell') { upsellCount++; upsellAmount += oppAmount; }
      o.streams.forEach(s => {
        if (s.timeline) {
          totalEvents += s.timeline.length;
          accEvents += s.timeline.length;
          s.timeline.forEach(ev => { if (ev.date.startsWith(monthStr)) thisMonth++; });
        }
      });
    });
    if (accEvents > 0) accountStats[a.customer] = accEvents;
  });

  const topAccs = Object.entries(accountStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const hasSellData = crossSellCount + upsellCount > 0;

  dash.innerHTML = `
    <div class="dash-grid">
      <div class="dash-stat"><span>총 활동</span><strong>${totalEvents}건</strong></div>
      <div class="dash-stat"><span>이번 달</span><strong>${thisMonth}건</strong></div>
      <div class="dash-stat"><span>활성 딜</span><strong>${activeDeals}건</strong></div>
    </div>
    ${hasSellData ? `
    <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.02); border-radius:8px;">
      <div style="font-size:0.8em; font-weight:bold; margin-bottom:8px;">🔀⬆️ Cross-sell / Upsell</div>
      <div class="dash-grid">
        <div class="dash-stat" style="border-left:3px solid #2196F3;">
          <span>🔀 크로스셀</span>
          <strong>${crossSellCount}건</strong>
          <small style="font-size:0.7em;color:var(--text-muted);">${crossSellAmount.toLocaleString()}만</small>
        </div>
        <div class="dash-stat" style="border-left:3px solid #FF9800;">
          <span>⬆️ 업셀</span>
          <strong>${upsellCount}건</strong>
          <small style="font-size:0.7em;color:var(--text-muted);">${upsellAmount.toLocaleString()}만</small>
        </div>
      </div>
    </div>
    ` : ''}
    <div style="margin-top:15px; font-size:0.8em;">
      <b>🥇 Top 5 Active Accounts</b>
      ${topAccs.map(([name, count]) => `
        <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
          <div style="width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
          <div style="flex:1; height:8px; background:#eee; border-radius:4px;">
            <div style="width:${(count / topAccs[0][1]) * 100}%; height:100%; background:var(--accent); border-radius:4px;"></div>
          </div>
          <div style="width:30px; text-align:right;">${count}</div>
        </div>
      `).join('')}
    </div>
  `;
}

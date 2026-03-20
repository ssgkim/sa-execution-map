/* ===== render.js — All UI Rendering ===== */

function syncUI(full = true) {
  renderFilter();
  if (full) renderAccountList();
  renderMap();
  renderKit();
}

// ===== FILTER =====

function renderFilter() {
  document.getElementById('filter-grid').innerHTML = solutions.map(s =>
    `<div class="sol-tag ${activeFilters.has(s.id)?'active':''}" onclick="toggleSolFilter('${s.id}')">${s.name}</div>`
  ).join('');
}

// ===== KIT MANAGER =====

function renderKitMgr() {
  document.getElementById('kit-stage-tabs').innerHTML = stages.map((st, i) =>
    `<div class="kit-stage-btn ${kitMgrStage===i?'active':''}" onclick="selectKitStage(${i})">${stageIcons[i]} ${st}</div>`
  ).join('');

  const kit = kits[kitMgrStage];
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

// ===== ACCOUNT LIST =====

function renderAccountList() {
  document.getElementById('account-list').innerHTML = accounts.map((acc, ai) => {
    return `<div class="account-card" style="border-top:3px solid ${colors[ai%colors.length]}">
      <div class="acc-header">
        <input class="acc-input industry" value="${acc.industry}" oninput="updateAccount(${acc.id},'industry',this.value)" onclick="event.stopPropagation()">
        <input class="acc-input customer" value="${acc.customer}" oninput="updateAccount(${acc.id},'customer',this.value)" onclick="event.stopPropagation()">
      </div>
      ${acc.oppties.map(opp => `<div class="oppty-box">
        <input class="oppty-name-input" value="${opp.name}" oninput="updateOpp(${acc.id},${opp.id},this.value)" onclick="event.stopPropagation()">
        ${opp.streams.map(s => {
          const score = getEffortScore(s);
          const eColor = effortColor(score);
          return `<div class="stream-item ${selectedStreamId===s.id?'active-stream':''}" onclick="selectStream('${s.id}')">
            <div class="stream-row">
              <select class="stream-select" style="flex:1" onchange="updateStream('${s.id}','solId',this.value)" onclick="event.stopPropagation()">
                ${solutions.map(sol=>`<option value="${sol.id}" ${s.solId===sol.id?'selected':''}>${sol.name}</option>`).join('')}
              </select>
              <select class="stream-select" onchange="updateStream('${s.id}','stage',parseInt(this.value))" onclick="event.stopPropagation()">
                ${stages.map((st,i)=>`<option value="${i}" ${s.stage===i?'selected':''}>${stageIcons[i]}</option>`).join('')}
              </select>
              <input class="acc-input stream-amount" type="number" value="${s.amount}" oninput="updateStream('${s.id}','amount',parseInt(this.value))" onclick="event.stopPropagation()">
              <button style="font-size:0.7em;border:none;background:none;cursor:pointer;color:var(--text-muted)" onclick="event.stopPropagation();deleteStream(${acc.id},${opp.id},'${s.id}')">✕</button>
            </div>
            <div class="effort-bar-wrap">
              <span>Effort ${Math.round(score*100)}%</span>
              <div class="effort-bar"><div class="effort-bar-fill" style="width:${score*100}%;background:${eColor}"></div></div>
            </div>
          </div>`;
        }).join('')}
        <button class="btn-action" style="font-size:0.65em;padding:2px 6px" onclick="addStream(${acc.id},${opp.id})">＋ 스트림</button>
      </div>`).join('')}
    </div>`;
  }).join('');
}

// ===== MAP (Canvas) =====

function renderMap() {
  const canvas = document.getElementById('map-canvas');
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth * 2;
  canvas.height = wrap.clientHeight * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const W = wrap.clientWidth, H = wrap.clientHeight, pad = 60;
  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const sMax = parseInt(document.getElementById('cfg-single-max').value) || 100000;
  const tMax = parseInt(document.getElementById('cfg-total-max').value) || 300000;
  const colW = (W - 2*pad) / 4;

  // Column backgrounds
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.005)';
    ctx.fillRect(pad + i*colW, pad, colW, H - 2*pad);
  }

  // Grid lines
  ctx.strokeStyle = cs.getPropertyValue('--q-border').trim();
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, H/2); ctx.lineTo(W-pad, H/2); ctx.stroke();
  ctx.setLineDash([3, 3]);
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(pad + i*colW, pad); ctx.lineTo(pad + i*colW, H-pad); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Stage labels
  ctx.fillStyle = cs.getPropertyValue('--text-muted').trim();
  ctx.font = 'bold 10px Segoe UI';
  ctx.textAlign = 'center';
  stages.forEach((st, i) => ctx.fillText(`${stageIcons[i]} ${st}`, pad + i*colW + colW/2, H - pad + 15));

  // Collect & jitter streams
  const slots = [[], [], [], []];
  accounts.forEach((acc, ai) => {
    const accTotal = acc.oppties.reduce((s, o) => s + o.streams.reduce((s2, st) => s2 + st.amount, 0), 0);
    acc.oppties.forEach(opp => opp.streams.forEach(s => {
      if (!activeFilters.has(s.solId)) return;
      slots[s.stage].push({ s, acc, ai, accTotal });
    }));
  });

  slots.forEach((sl, si) => {
    const cx = pad + si * colW + colW / 2;
    const jR = colW * 0.35;
    sl.forEach((item, idx) => {
      const { s, acc, ai, accTotal } = item;
      const color = colors[ai % colors.length];
      const jSeed = (idx - (sl.length - 1) / 2);
      const jStep = sl.length > 1 ? jR / (sl.length - 1) : 0;
      const xPos = cx + jSeed * jStep;
      const yVal = (Math.min(1, s.amount / sMax) * 0.6) + (Math.min(1, accTotal / tMax) * 0.4);
      const yPos = (H - pad) - yVal * (H - 2*pad);
      const baseR = 5 + Math.min(7, (s.amount / sMax) * 7);
      const isSel = s.id === selectedStreamId;
      const r = isSel ? baseR + 3 : baseR;
      const score = getEffortScore(s);
      const eColor = effortColor(score);

      // Donut background ring
      ctx.beginPath(); ctx.arc(xPos, yPos, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 4; ctx.stroke();

      // Donut fill (effort arc)
      if (score > 0) {
        ctx.beginPath();
        ctx.arc(xPos, yPos, r + 3, -Math.PI/2, -Math.PI/2 + score * Math.PI * 2);
        ctx.strokeStyle = eColor; ctx.lineWidth = 4; ctx.stroke();
      }

      // Inner dot
      ctx.globalAlpha = isSel ? 1 : 0.85;
      ctx.fillStyle = color;
      if (isSel) { ctx.shadowBlur = 14; ctx.shadowColor = color; }
      ctx.beginPath(); ctx.arc(xPos, yPos, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = isSel ? '#000' : 'rgba(0,0,0,0.1)';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.beginPath(); ctx.arc(xPos, yPos, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle = isSel ? cs.getPropertyValue('--text-heading') : cs.getPropertyValue('--text-dim');
      ctx.font = isSel ? 'bold 10px Segoe UI' : '9px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(`${acc.customer}:${solutions.find(x => x.id === s.solId).name}`, xPos, yPos - r - 8);

      // Store position for click detection
      s._rx = xPos; s._ry = yPos; s._rr = r;
    });
  });
}

// ===== KIT PANEL (Checklist) =====

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
  const kit = kits[stream.stage];
  const score = getEffortScore(stream);
  const eColor = effortColor(score);

  document.getElementById('kit-title').innerHTML = `🏢 [${acc.industry}] <b>${acc.customer}</b> — ${sol.name}`;
  document.getElementById('kit-meta').innerHTML = `오퍼튜니티: ${opp.name} | 단계: <b>${stages[stream.stage]}</b> | 금액: <b>${stream.amount.toLocaleString()}만원</b>`;

  document.getElementById('kit-collateral').innerHTML = kit.collateral.map(item => {
    const key = 'c:' + item;
    const done = stream.efforts && stream.efforts[key];
    return `<div class="check-item" onclick="event.stopPropagation();toggleEffort('${stream.id}','${key}')">
      <div class="check-box ${done?'checked':''}">${done?'✓':''}</div>
      <span class="check-label ${done?'done':''}">${item}</span>
    </div>`;
  }).join('');

  document.getElementById('kit-engagement').innerHTML = kit.engagement.map(item => {
    const key = 'e:' + item;
    const done = stream.efforts && stream.efforts[key];
    return `<div class="check-item" onclick="event.stopPropagation();toggleEffort('${stream.id}','${key}')">
      <div class="check-box ${done?'checked':''}">${done?'✓':''}</div>
      <span class="check-label ${done?'done':''}">${item}</span>
    </div>`;
  }).join('');

  const total = Object.keys(stream.efforts || {}).length;
  const done = Object.values(stream.efforts || {}).filter(Boolean).length;
  document.getElementById('effort-summary').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8em;">
      <b>Effort Score</b>
      <span style="color:${eColor};font-weight:800;font-size:1.1em;">${done}/${total} (${Math.round(score*100)}%)</span>
    </div>
    <div class="effort-summary-bar"><div class="effort-summary-fill" style="width:${score*100}%;background:${eColor}"></div></div>
    <p style="font-size:0.7em;color:var(--text-muted);margin-top:6px;">
      ${score>=0.7?'✅ 다음 단계 승격 준비 완료':score>=0.4?'⚠️ 핵심 활동이 남아있습니다':'🚨 초기 단계 — 투입 가속 필요'}
    </p>
  `;
}

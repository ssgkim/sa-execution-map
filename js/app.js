/* ===== app.js — Event Bindings & Initialization (v6.0) ===== */

// Map click handler
document.getElementById('map-canvas').addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let closest = null, minD = 25;

  accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
    if (!activeFilters.has(s.solId) || s._rx == null) return;
    const d = Math.sqrt((s._rx - x) ** 2 + (s._ry - y) ** 2);
    if (d < minD) { minD = d; closest = s.id; }
  })));

  if (closest) { selectedStreamId = closest; syncUI(true); }
});

// Window resize
window.addEventListener('resize', () => {
  syncUI(false);
});

// Initialize with Cloud Data (v7.0)
async function init() {
  const data = await fetchCloudData();

  if (data && data.kits && data.kits.length > 0) {
    kits = {
      0: { collateral: [], engagement: [] },
      1: { collateral: [], engagement: [] },
      2: { collateral: [], engagement: [] },
      3: { collateral: [], engagement: [] }
    };
    data.kits.forEach(k => {
      const st = k.stage;
      const c = k.cat === 'engagement' ? 'engagement' : 'collateral';
      if (kits[st]) kits[st][c].push(String(k.name).trim());
    });
    console.log('☁️ 동적 세일즈 킷 로드 완료:', data.kits.length, '개 항목');
  }

  if (data && data.accounts && data.accounts.length > 0) {
    accounts = transformCloudToTree(data.accounts, data.timeline || []);
    console.log('☁️ 클라우드 데이터 로드 완료:', accounts.length, '개 계정');
  } else {
    // Fallback to demo if cloud is empty
    addAccount();
    accounts[0].industry = '금융';
    accounts[0].customer = 'A은행';
    addStream(accounts[0].id, accounts[0].oppties[0].id);
  }
  syncUI(true);
}

// ===== Swimlane Drag & Drop =====
let slDragEv = null;

const slCanvas = document.getElementById('swimlane-canvas');
if (slCanvas) {
  slCanvas.addEventListener('mousedown', (e) => {
    if (!window.swimlaneHitboxes) return;
    const rect = slCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let closest = null, minD = 10;
    window.swimlaneHitboxes.forEach(hb => {
      const d = Math.sqrt((hb.x - x) ** 2 + (hb.y - y) ** 2);
      if (d < minD) { minD = d; closest = hb; }
    });

    if (closest) {
      slDragEv = closest;
      slDragEv.originalDate = closest.ev.date;
      slCanvas.style.cursor = 'grabbing';
    }
  });

  slCanvas.addEventListener('mousemove', (e) => {
    if (!slDragEv || !window.swimlaneMeta) {
      if (window.swimlaneHitboxes && !slDragEv) {
        const rect = slCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        let hover = false;
        window.swimlaneHitboxes.forEach(hb => {
          if (Math.sqrt((hb.x - x) ** 2 + (hb.y - y) ** 2) < 10) hover = true;
        });
        slCanvas.style.cursor = hover ? 'grab' : 'default';
      }
      return;
    }

    const rect = slCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    const m = window.swimlaneMeta;

    if (x < m.padX) x = m.padX;
    if (x > m.padX + m.innerW) x = m.padX + m.innerW;

    const ratio = (x - m.padX) / m.innerW;
    const ms = m.minDate.getTime() + ratio * m.timeSpan;
    const nd = new Date(ms);
    const Y = nd.getFullYear();
    const M = String(nd.getMonth() + 1).padStart(2, '0');
    const D = String(nd.getDate()).padStart(2, '0');
    slDragEv.ev.date = `${Y}-${M}-${D}`;

    renderSwimLane();
    renderKit(); // Immediately update the text input inside Kit Panel history
  });

  slCanvas.addEventListener('mouseleave', () => {
    if (!slDragEv) slCanvas.style.cursor = 'default';
  });

  window.addEventListener('mouseup', () => {
    if (slDragEv) {
      const origDate = slDragEv.originalDate;
      const newDate = slDragEv.ev.date;
      const ev = slDragEv.ev;

      slDragEv = null;
      if (slCanvas) slCanvas.style.cursor = 'default';
      syncUI(false);

      if (origDate !== newDate) {
        let tS = null, tO = null, tA = null;
        accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
          if (s.timeline && s.timeline.find(x => x.id === ev.id)) {
            tS = s; tO = o; tA = a;
          }
        })));
        if (tS) {
          syncTimelineUpdateToCloud(tA.customer, tO.name, tS.solId, ev.stage, ev.name, origDate, { date: newDate, memo: ev.memo });
        }
      }
    }
  });
}

init();

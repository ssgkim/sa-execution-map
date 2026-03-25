/* ===== app.js — Event Bindings & Initialization (v8.2) ===== */

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

// ===== Multi-Source Initialization (v8.0 → v8.2) =====

async function init() {
  updateSyncBadge();

  if (currentSourceMode === 'demo') {
    loadDemoData();
  } else if (currentSourceMode === 'local') {
    loadLocalStoreData();
  } else {
    await loadCloudData();
  }

  syncUI(true);
}

async function loadCloudData() {
  const data = await fetchCloudData();

  if (data && data.kits && data.kits.length > 0) {
    kits = data.kits.map(k => ({
      solId: String(k.solId || '*').trim(),
      stage: parseInt(k.stage) || 0,
      cat: k.cat === 'engagement' ? 'engagement' : 'collateral',
      name: String(k.name).trim()
    }));
    console.log('☁️ 동적 세일즈 킷 로드 완료:', kits.length, '개 항목');
  }

  if (data && data.accounts && data.accounts.length > 0) {
    accounts = transformCloudToTree(data.accounts, data.timeline || []);
    console.log('☁️ 클라우드 데이터 로드 완료:', accounts.length, '개 계정');
  } else {
    console.log('⚠️ 클라우드 데이터 비어있음 — Demo 데이터로 전환');
    loadDemoData();
  }
}

function loadLocalStoreData() {
  const localAcc = localStorage.getItem('sa_map_local_accounts');
  const localKits = localStorage.getItem('sa_map_local_kits');

  if (localAcc) {
    accounts = JSON.parse(localAcc);
    if (localKits) kits = JSON.parse(localKits);
    console.log('📦 Local Storage 데이터 로드 완료');
  } else {
    loadDemoData();
    saveLocalData();
  }
}

function loadDemoData() {
  let sid = 1000;
  const mkStream = (solId, stage, amount, timeline) => {
    const se = { 0: buildEfforts(0, solId), 1: buildEfforts(1, solId), 2: buildEfforts(2, solId), 3: buildEfforts(3, solId) };
    if (timeline) {
      timeline.forEach(ev => {
        const kitForStage = getKitForStream(solId, ev.stage);
        let cat = 'engagement';
        if (kitForStage.collateral.includes(ev.name)) cat = 'collateral';
        const key = (cat === 'collateral' ? 'c:' : 'e:') + ev.name;
        if (se[ev.stage] && key in se[ev.stage]) {
          se[ev.stage][key] = true;
        }
      });
    }
    return {
      id: `s${sid++}`, solId, stage, amount,
      stageEfforts: se,
      timeline: timeline || []
    };
  };
  const mkOpp = (id, name, streams) => ({ id, name, streams });
  const mkAcc = (id, industry, customer, oppties, active) => ({ id, industry, customer, oppties, active: active !== false });

  accounts = [
    mkAcc(1, '금융', 'A은행', [
      mkOpp(10, '코어뱅킹 현대화', [
        mkStream('ocp', 2, 45000, [
          { id:1, stage:0, date:'2026-01-05', name:'Discovery Session', memo:'CTO 참석, 긍정적 반응' },
          { id:2, stage:1, date:'2026-01-20', name:'PoC 시나리오', memo:'3주 PoC 합의' },
          { id:3, stage:2, date:'2026-02-10', name:'Hands-on (심화)', memo:'운영팀 5명 참가' },
          { id:4, stage:2, date:'2026-02-25', name:'에스컬레이션 체계', memo:'SLA 협의 완료' }
        ]),
        mkStream('rhoai', 1, 18000, [
          { id:5, stage:0, date:'2026-01-15', name:'Roadshow', memo:'AI 활용 사례 소개' },
          { id:6, stage:1, date:'2026-02-05', name:'Live Demo', memo:'이상거래 탐지 PoC' }
        ])
      ]),
      mkOpp(11, '클라우드 인프라 전환', [
        mkStream('rhel', 3, 30000, [
          { id:7, stage:3, date:'2026-01-08', name:'확산 로드맵', memo:'2026 전체 이관 계획' },
          { id:8, stage:3, date:'2026-03-01', name:'성과 보고서', memo:'ROI 35% 달성' }
        ]),
        mkStream('acm', 2, 12000, [
          { id:9, stage:1, date:'2026-02-14', name:'Navigate Workshop', memo:'멀티클러스터 관리 시연' }
        ])
      ])
    ]),
    mkAcc(2, '통신', 'B통신', [
      mkOpp(20, '5G 엣지 플랫폼', [
        mkStream('edge', 1, 38000, [
          { id:10, stage:0, date:'2026-01-10', name:'Account Day', memo:'임원진 설득 성공' },
          { id:11, stage:1, date:'2026-01-28', name:'Ref Architecture', memo:'엣지 노드 3개소 설계' },
          { id:12, stage:1, date:'2026-02-18', name:'Hands-on (기초)', memo:'NE팀 10명 참가' }
        ]),
        mkStream('ocp', 1, 22000, [
          { id:14, stage:1, date:'2026-02-02', name:'PoC 시나리오', memo:'6주 PoC' }
        ])
      ]),
      mkOpp(21, '운영 자동화', [
        mkStream('aap', 2, 15000, [
          { id:15, stage:1, date:'2026-01-22', name:'Live Demo', memo:'네트워크 자동화 시연' },
          { id:16, stage:2, date:'2026-03-05', name:'구축 체크리스트', memo:'망 분리 환경 확인' }
        ])
      ])
    ]),
    mkAcc(3, '제조', 'C제조', [
      mkOpp(30, 'MES 현대화', [
        mkStream('ocp-virt', 0, 28000, [
          { id:17, stage:0, date:'2026-01-18', name:'1-Pager', memo:'공장 자동화 사례' },
          { id:18, stage:0, date:'2026-02-01', name:'Discovery Session', memo:'공장장 직접 참여' }
        ]),
        mkStream('migration', 1, 20000, [
          { id:19, stage:0, date:'2026-01-25', name:'성공사례 요약', memo:'유사 제조사 3개 사례' },
          { id:20, stage:1, date:'2026-03-10', name:'경쟁비교표', memo:'레거시 AS400 이관' }
        ])
      ]),
      mkOpp(31, '보안 강화', [
        mkStream('acs', 1, 16000, [
          { id:21, stage:0, date:'2026-02-06', name:'Roadshow', memo:'CISO 참석' },
          { id:22, stage:1, date:'2026-02-20', name:'경쟁비교표', memo:'타사 대비 우위 정리' },
          { id:23, stage:1, date:'2026-03-03', name:'Navigate Workshop', memo:'컨테이너 보안 체험' }
        ])
      ])
    ]),
    mkAcc(4, '공공', 'D공공기관', [
      mkOpp(40, '디지털 정부 플랫폼', [
        mkStream('ocp', 3, 50000, [
          { id:24, stage:2, date:'2026-01-07', name:'KPI 합의서', memo:'서비스 가용성 99.9%' },
          { id:25, stage:3, date:'2026-02-15', name:'표준 운영 가이드(SOP)', memo:'전산팀 50명 배포' },
          { id:26, stage:3, date:'2026-03-12', name:'전략 리뷰', memo:'2027 확산 계획 협의' }
        ]),
        mkStream('storage', 3, 25000, [
          { id:27, stage:3, date:'2026-01-14', name:'라이선스 최적화', memo:'스토리지 30% 절감' },
          { id:28, stage:3, date:'2026-02-28', name:'성과 보고서', memo:'연간 성과 보고 완료' }
        ])
      ]),
      mkOpp(41, '클라우드 네이티브 전환', [
        mkStream('rhel', 2, 18000, [
          { id:29, stage:1, date:'2026-01-30', name:'상세 제안서', memo:'3년 로드맵 포함' },
          { id:30, stage:2, date:'2026-02-22', name:'운영팀 온보딩', memo:'전산 직원 교육 완료' }
        ]),
        mkStream('middleware', 1, 12000, [])
      ])
    ]),
    mkAcc(5, '유통', 'E유통', [
      mkOpp(50, '이커머스 플랫폼 재구축', [
        mkStream('ocp', 1, 32000, [
          { id:32, stage:0, date:'2026-01-09', name:'Account Day', memo:'CTO, CMO 동반 참석' },
          { id:33, stage:1, date:'2026-01-27', name:'PoC 시나리오', memo:'블랙프라이데이 트래픽 시뮬레이션' },
          { id:34, stage:1, date:'2026-02-17', name:'Hands-on (기초)', memo:'개발팀 15명 참가' }
        ]),
        mkStream('rhoai', 0, 14000, [
          { id:35, stage:0, date:'2026-02-08', name:'1-Pager', memo:'추천 엔진 AI 활용' }
        ])
      ]),
      mkOpp(51, '물류 자동화', [
        mkStream('aap', 2, 19000, [
          { id:36, stage:1, date:'2026-02-03', name:'Live Demo', memo:'물류센터 자동화 시연' },
          { id:37, stage:2, date:'2026-02-24', name:'구축 체크리스트', memo:'5개 물류센터 동시 적용' },
          { id:38, stage:2, date:'2026-03-08', name:'에스컬레이션 체계', memo:'24/7 지원 체계 수립' }
        ]),
        mkStream('storage', 1, 8000, [
          { id:39, stage:0, date:'2026-01-21', name:'성공사례 요약', memo:'글로벌 유통사 스토리지 사례' }
        ])
      ])
    ])
  ];
  console.log('🧪 Demo 데이터 로드 완료');
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
    renderKit();
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

/* ===== app.js — Event Bindings & Initialization (v6.0) ===== */

// Map click handler
document.getElementById('map-canvas').addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  let closest = null, minD = 25;

  accounts.forEach(a => a.oppties.forEach(o => o.streams.forEach(s => {
    if (!activeFilters.has(s.solId) || s._rx == null) return;
    const d = Math.sqrt((s._rx - x)**2 + (s._ry - y)**2);
    if (d < minD) { minD = d; closest = s.id; }
  })));

  if (closest) { selectedStreamId = closest; syncUI(true); }
});

// Window resize
window.addEventListener('resize', () => {
  syncUI(false);
});

// Initialize with demo data
(function init() {
  addAccount();
  accounts[0].industry = '금융';
  accounts[0].customer = 'A은행';
  addStream(accounts[0].id, accounts[0].oppties[0].id);
  syncUI(true);
})();

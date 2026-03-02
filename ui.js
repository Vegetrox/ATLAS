/* ═══════════════════════════════════════════════════
   ATLAS — Interface Utilisateur
   ui.js  (dépend de engine.js)
   ═══════════════════════════════════════════════════ */

'use strict';

// ── PAGE NAVIGATION ──
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function goHome() {
  pauseTimer();
  document.getElementById('outcome-overlay').classList.remove('show');
  showPage('page-home');
}

// ── TABS ──
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  const btn = document.querySelector(`[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
  if (name === 'resolution') updateResolutionUI();
}

// ── TIMER UI ──
function updateTimerUI() {
  const faceEl = document.getElementById('timer-face');
  const fillEl = document.getElementById('timer-fill');
  if (!faceEl) return;

  const ratio = ATLAS.timerLeft / ATLAS.timerTotal;
  faceEl.textContent = formatTime(ATLAS.timerLeft);
  faceEl.className   = 'timer-face' + (ratio < 0.15 ? ' warning' : '');
  if (fillEl) {
    fillEl.style.width = (ratio * 100) + '%';
    fillEl.style.background = ratio < 0.15
      ? 'linear-gradient(90deg, #8b1a1a, #c0392b)'
      : ratio < 0.3
        ? 'linear-gradient(90deg, #7a5a1e, #e8c84b)'
        : 'linear-gradient(90deg, var(--gold-dark), var(--gold))';
  }
}

function toggleTimer() {
  const btn = document.getElementById('btn-timer-toggle');
  if (ATLAS.timerRunning) {
    pauseTimer();
    if (btn) btn.textContent = '▶ Start';
  } else {
    startTimer(
      (left) => { updateTimerUI(); updateTensionUI(); },
      () => { updateTimerUI(); triggerDefeat(); }
    );
    if (btn) btn.textContent = '⏸ Pause';
  }
}

function doResetTimer() {
  pauseTimer();
  const btn = document.getElementById('btn-timer-toggle');
  if (btn) btn.textContent = '▶ Start';
  resetTimer(updateTimerUI);
}

// ── ACT UI ──
function updateActUI() {
  const act = ATLAS.act;
  const actNames = ATLAS.data?.act_names || ['INTRODUCTION','MONTÉE EN TENSION','CRISE','CLIMAX','RÉSOLUTION'];

  document.querySelectorAll('.act-pip').forEach((p, i) => {
    p.className = 'act-pip' + (i < act ? ' done' : i === act ? ' current' : '');
  });
  document.querySelectorAll('.act-label').forEach((l, i) => {
    l.className = 'act-label' + (i === act ? ' current' : '');
  });
  const nameEl = document.getElementById('act-name-display');
  const hdrEl  = document.getElementById('hdr-act');
  if (nameEl) nameEl.textContent = actNames[act];
  if (hdrEl)  hdrEl.textContent  = 'ACTE ' + (act + 1);
}

function nextAct() {
  if (ATLAS.act >= 4) return;
  ATLAS.act++;
  updateActUI();
  const actNames = ATLAS.data?.act_names || [];
  notify(`Acte ${ATLAS.act + 1} — ${actNames[ATLAS.act] || ''}`);
  if (ATLAS.act >= 4) setTimeout(triggerVictory, 1500);
}

function prevAct() {
  if (ATLAS.act <= 0) return;
  ATLAS.act--;
  updateActUI();
}

// ── TENSION UI ──
function updateTensionUI() {
  const labels = ATLAS.data?.tension_labels || ['CALME','TENDU','OPPRESSANT','CRITIQUE','DÉSESPÉRÉ'];
  const blocks = document.querySelectorAll('.tension-block');
  blocks.forEach((b, i) => {
    b.className = 'tension-block' + (i < ATLAS.tension ? ' tension-on' : '');
    if (i < ATLAS.tension && ATLAS.tension === 5) b.classList.add('tension-on-5');
  });
  const lbl = document.getElementById('tension-label');
  if (lbl) {
    lbl.textContent = labels[ATLAS.tension - 1] || '';
    lbl.className   = 'tension-label' + (ATLAS.tension >= 4 ? ' critical' : '');
  }
}

function changeTension(d) {
  ATLAS.tension = Math.max(1, Math.min(5, ATLAS.tension + d));
  updateTensionUI();
  if (ATLAS.tension === 5) notify('⚠ TENSION MAXIMALE — DÉSESPOIR', true);
}

// ── EVENTS ──
function triggerEvent(i) {
  ATLAS.events[i].triggered = true;
  const el = document.getElementById('ev-' + i);
  if (el) el.classList.add('triggered');
  notify('Événement déclenché : ' + ATLAS.events[i].nom, true);
  changeTension(1);
}

function resolveEvent(i) {
  ATLAS.events[i].resolved  = true;
  ATLAS.events[i].triggered = false;
  const el = document.getElementById('ev-' + i);
  if (el) { el.classList.remove('triggered'); el.classList.add('resolved'); }
  notify('Événement résolu : ' + ATLAS.events[i].nom);
  // Check victoire totale
  const crises = ATLAS.events.filter(e => e.type === 'crisis');
  if (crises.every(e => e.resolved) && ATLAS.act >= 3) setTimeout(triggerVictory, 800);
}

// ── OBJECTS ──
function useObject(i) {
  ATLAS.objects[i].used = true;
  const card = document.getElementById('obj-' + i);
  const btn  = document.getElementById('objbtn-' + i);
  if (card) card.classList.add('used');
  if (btn)  btn.disabled = true;
  notify('Objet utilisé : ' + ATLAS.objects[i].nom);
}

// ── RESOLUTION ──
function updateResolutionUI() {
  const p = ATLAS.players[ATLAS.currentResPlayer % ATLAS.players.length];
  if (!p) return;
  const badge = document.getElementById('res-player-badge');
  const prompt = document.getElementById('res-prompt');
  const result = document.getElementById('matrix-result');
  const desc   = document.getElementById('matrix-desc');
  const dot    = document.getElementById('matrix-dot');
  if (badge)  badge.textContent  = `▸ ${p.prenom} — ${p.archetype} · ${p.profession}`;
  if (prompt) prompt.textContent = `${p.prenom} tente une action. Cliquez sur la matrice — le centre garantit le succès, les bords l'échec.`;
  if (result) { result.textContent = '— CLIQUEZ —'; result.style.color = 'var(--text-dim)'; }
  if (desc)   desc.textContent   = `La zone intérieure dorée = succès. Les cercles rouges extérieurs = échec.`;
  if (dot)    dot.style.display  = 'none';
}

function nextResolutionPlayer() {
  ATLAS.currentResPlayer = (ATLAS.currentResPlayer + 1) % ATLAS.players.length;
  updateResolutionUI();
}

// ── HINTS ──
function giveHint(level) {
  const hints = ATLAS.data?.hints?.[level] || [];
  const h = rnd(hints);
  const el = document.getElementById('hint-display');
  if (el) { el.textContent = h; el.classList.add('show'); }
  notify('Indice révélé au groupe');
}

// ── OUTCOME ──
function triggerVictory() {
  pauseTimer();
  const sc = ATLAS.scenario;
  document.getElementById('outcome-title').textContent  = 'VICTOIRE';
  document.getElementById('outcome-title').className    = 'outcome-title win';
  document.getElementById('outcome-story').textContent  =
    `Le groupe a surmonté le ${sc.pb.nom.toLowerCase()} et s'est échappé du ${sc.lieu.nom.toLowerCase()}. Chaque personnage a joué un rôle crucial. Cette aventure marquera les mémoires.`;
  document.getElementById('outcome-overlay').classList.add('show');
}

function triggerDefeat() {
  const sc = ATLAS.scenario;
  document.getElementById('outcome-title').textContent  = 'DÉFAITE';
  document.getElementById('outcome-title').className    = 'outcome-title lose';
  document.getElementById('outcome-story').textContent  = sc.echec;
  document.getElementById('outcome-overlay').classList.add('show');
}

// ── BUILD UI AFTER GENERATION ──
function buildGameUI() {
  const sc = ATLAS.scenario;

  // Header
  const hdrName = document.getElementById('hdr-scenario-name');
  if (hdrName) hdrName.textContent = sc.lieu.nom.toUpperCase();

  // Scenario
  const scTitle = document.getElementById('sc-title');
  const scNarr  = document.getElementById('sc-narrative');
  const scLieu  = document.getElementById('sc-lieu-tag');
  const scPb    = document.getElementById('sc-pb-tag');
  if (scTitle) scTitle.textContent = sc.titre;
  if (scNarr)  scNarr.textContent  = `${sc.lieu.desc} ${sc.lieu.contexte} ${sc.lieu.declencheur} — ${sc.pb.desc}`;
  if (scLieu)  scLieu.textContent  = sc.lieu.tag;
  if (scPb)    scPb.textContent    = sc.pb.tag;

  // Events
  buildEventsUI();

  // Players
  buildPlayersUI();

  // Objects
  buildObjectsUI();

  // MJ
  buildMJUI();

  // Timer init
  updateTimerUI();
  updateActUI();
  updateTensionUI();
  updateResolutionUI();

  // Matrix
  initMatrix();
}

function buildEventsUI() {
  const list = document.getElementById('event-list');
  if (!list) return;
  list.innerHTML = ATLAS.events.map((ev, i) => `
    <div class="event-card ${ev.triggered ? 'triggered' : ev.resolved ? 'resolved' : ''}" id="ev-${i}">
      <div class="event-top">
        <div class="event-name">${ev.nom}</div>
        <div class="event-time">${ev.time}</div>
      </div>
      <div class="event-desc">${ev.desc}</div>
      <span class="badge badge-${ev.type === 'crisis' ? 'crisis' : ev.type === 'info' ? 'info' : 'object'}">${ev.type}</span>
      <div class="event-actions">
        <button class="btn btn-danger btn-sm" onclick="triggerEvent(${i})">▸ Déclencher</button>
        <button class="btn btn-outline btn-sm" onclick="resolveEvent(${i})">✓ Résolu</button>
      </div>
    </div>`).join('');
}

function buildPlayersUI() {
  const grid = document.getElementById('players-grid');
  if (!grid) return;
  grid.innerHTML = ATLAS.players.map((p, i) => `
    <div class="player-card">
      <div class="pc-top">
        <div class="pc-avatar">${p.icon}</div>
        <div>
          <div class="pc-name">${p.prenom}, ${p.age} ans</div>
          <div class="pc-meta">${p.profession}</div>
          <span class="pc-archetype-badge">${p.archetype}</span>
        </div>
      </div>
      <div class="pc-body">
        <span class="pc-section-title" style="font-family:var(--font-title);font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);opacity:0.5;display:block;margin-bottom:8px;">Compétences</span>
        <div class="skill-tags">${p.competences.map(c => `<span class="skill-tag">${c}</span>`).join('')}</div>
        <span class="weakness-tag">⚠ ${p.faiblesse}</span>
        <div class="pc-info-row">
          <span class="pc-info-label">Motivation</span>
          <div class="pc-info-text">${p.motivation}</div>
        </div>
        <div class="pc-info-row">
          <span class="pc-info-label">Enjeu personnel</span>
          <div class="pc-info-text">${p.enjeu}</div>
        </div>
        <div class="secret-box" onclick="this.classList.toggle('open')">
          <span class="secret-label">▸ Secret personnel</span>
          <div class="secret-text">${p.secret}</div>
        </div>
      </div>
    </div>`).join('');
}

function buildObjectsUI() {
  const grid = document.getElementById('objects-grid');
  if (!grid) return;
  grid.innerHTML = ATLAS.objects.map((o, i) => `
    <div class="object-card ${o.used ? 'used' : ''}" id="obj-${i}">
      <span class="obj-icon">${o.icon}</span>
      <div class="obj-name">${o.nom}</div>
      <div class="obj-use">${o.use}</div>
      <button class="btn btn-outline btn-sm" onclick="useObject(${i})" id="objbtn-${i}" ${o.used ? 'disabled' : ''}>
        ${o.used ? '✓ Utilisé' : 'Utiliser'}
      </button>
    </div>`).join('');
}

function buildMJUI() {
  const sc = ATLAS.scenario;

  const mjActs = document.getElementById('mj-acts');
  if (mjActs) mjActs.innerHTML = sc.actes.map((a, i) => `
    <div class="mj-section">
      <div style="font-family:var(--font-title);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:5px;opacity:0.7;">Acte ${i + 1} — ${a.titre}</div>
      <div class="mj-text">${a.desc}</div>
    </div>`).join('');

  const mjV = document.getElementById('mj-victory');
  if (mjV) mjV.innerHTML = sc.victoire.map(v => `<li>${v}</li>`).join('');

  const mjF = document.getElementById('mj-fail');
  if (mjF) mjF.textContent = sc.echec;

  const mjAlt = document.getElementById('mj-alt-end');
  if (mjAlt) mjAlt.textContent = sc.fin_alternative;

  const mjS = document.getElementById('mj-secrets');
  if (mjS) mjS.innerHTML = sc.secrets.map(s => `<li>${s}</li>`).join('');

  const mjE = document.getElementById('mj-escalade');
  if (mjE) mjE.innerHTML = sc.escalade.map(e => `<li>${e}</li>`).join('');
}

// ── MATRIX ──
function initMatrix() {
  const svg = document.getElementById('matrix-svg');
  if (!svg) return;

  svg.onclick = (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dot = document.getElementById('matrix-dot');
    if (dot) { dot.style.left = x + 'px'; dot.style.top = y + 'px'; dot.style.display = 'block'; }

    const player = ATLAS.players[ATLAS.currentResPlayer % ATLAS.players.length];
    const res = computeMatrixResult(x, y, rect.width, rect.height, player.archetype);
    const desc = getMatrixDesc(res.level, player.prenom);

    const resultEl = document.getElementById('matrix-result');
    const descEl   = document.getElementById('matrix-desc');
    if (resultEl) { resultEl.textContent = res.label; resultEl.style.color = res.color; }
    if (descEl)   descEl.textContent = desc;
  };
}

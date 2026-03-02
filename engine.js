/* ═══════════════════════════════════════════════════
   ATLAS — Moteur de Génération Procédurale
   engine.js
   ═══════════════════════════════════════════════════ */

'use strict';

// ── STATE GLOBAL ──
const ATLAS = {
  data: null,
  config: { players: 2, tone: 'horreur', complexity: 'simple', type: 'evasion', duration: 60 },
  scenario: null,
  players: [],
  objects: [],
  events: [],
  act: 0,
  tension: 1,
  timerTotal: 3600,
  timerLeft: 3600,
  timerRunning: false,
  timerInterval: null,
  currentResPlayer: 0,
};

// ── UTILS ──
function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rndN(arr, n) {
  const a = [...arr];
  const result = [];
  for (let i = 0; i < n && a.length; i++) {
    const j = Math.floor(Math.random() * a.length);
    result.push(a.splice(j, 1)[0]);
  }
  return result;
}

function notify(msg, isAlert = false) {
  const el = document.getElementById('notif');
  if (!el) return;
  el.textContent = msg;
  el.className = 'notif show' + (isAlert ? ' alert' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'notif', 3500);
}

// ── DATA LOADING ──
async function loadData() {
  try {
    const res = await fetch('./data/atlas.json');
    ATLAS.data = await res.json();
  } catch (e) {
    console.error('Erreur chargement données:', e);
    notify('Erreur de chargement des données.', true);
  }
}

// ── CONFIG SELECTION ──
function pickOption(group, btn) {
  const parent = btn.closest('.opt-group');
  if (parent) parent.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  ATLAS.config[group] = btn.dataset.val;
}

// ── ÉQUILIBRAGE DES ARCHÉTYPES ──
function balancedPlayerSelection(pool, count) {
  const archetypes = ['Physique', 'Technique', 'Mental', 'Social'];
  let selected = [];
  let remaining = [...pool];

  // Garantir diversité
  for (const arch of archetypes) {
    if (selected.length >= count) break;
    const idx = remaining.findIndex(p => p.archetype === arch);
    if (idx >= 0) {
      selected.push(remaining.splice(idx, 1)[0]);
    }
  }

  // Compléter si nécessaire
  while (selected.length < count && remaining.length > 0) {
    const j = Math.floor(Math.random() * remaining.length);
    selected.push(remaining.splice(j, 1)[0]);
  }

  return selected.slice(0, count);
}

// ── GÉNÉRATION ──
function generateScenario() {
  if (!ATLAS.data) { notify('Données non chargées.', true); return null; }

  const d = ATLAS.data;
  const { players: count, complexity, duration } = ATLAS.config;
  const playerCount = parseInt(count) || 2;

  const lieu = rnd(d.lieux);
  const pb   = rnd(d.problemes);

  // Joueurs équilibrés
  const players = balancedPlayerSelection(d.personnages, playerCount);

  // Objets selon complexité
  const objCount = complexity === 'simple' ? 4 : complexity === 'complexe' ? 8 : 6;
  const objects  = rndN(d.objets, objCount).map(o => ({ ...o, used: false }));

  // Événements (copie avec état)
  const events = d.evenements.map(e => ({ ...e, triggered: false, resolved: false }));

  // Durée
  const dur = parseInt(duration) || 60;

  // Conditions de victoire
  const victoire = [
    `Résoudre le ${pb.nom.toLowerCase()} avant la fin du chrono`,
    `Tous les joueurs doivent sortir vivants du ${lieu.nom.toLowerCase()}`,
    `Identifier et utiliser correctement l'objet clé`,
  ];

  // Actes
  const actes = [
    { titre: 'Introduction',        desc: `${lieu.desc} ${lieu.contexte} ${lieu.declencheur}` },
    { titre: 'Montée en tension',   desc: `Le ${pb.nom.toLowerCase()} se confirme. Les premières tentatives échouent. ${rnd(lieu.complications)}.` },
    { titre: 'Crise',               desc: `${rnd(lieu.complications)}. La situation dégénère. Un choix difficile doit être fait — avec des conséquences durables.` },
    { titre: 'Climax',              desc: `Tout est en jeu. L'action finale est possible mais coûteuse. Chaque personnage doit se surpasser.` },
    { titre: 'Résolution',          desc: `La vérité éclate. Les survivants font face aux conséquences de chaque décision.` },
  ];

  const scenario = {
    titre: `${lieu.nom} — ${pb.nom}`,
    lieu, pb, actes,
    victoire,
    echec: `Si le chrono atteint 0 avec le problème non résolu — ${rnd(['tous les joueurs périssent', 'la situation devient irréparable', "l'issue est scellée définitivement"])}.`,
    fin_alternative: `Si le groupe découvre le secret d'Inès avant l'acte 4, une voie de sortie alternative s'ouvre — plus courte mais plus dangereuse.`,
    secrets: players.map(p => `${p.prenom} — ${p.secret}`),
    escalade: [
      `Acte 2 : si aucune action en 15 min → déclencher "${events[0].nom}"`,
      `Acte 3 : tension automatique +1 toutes les 10 min`,
      `T−10 min : révéler automatiquement un indice critique`,
      `T−5 min : la menace principale passe en phase active`,
    ],
  };

  // Stocker dans state
  ATLAS.scenario = scenario;
  ATLAS.players  = players;
  ATLAS.objects  = objects;
  ATLAS.events   = events;
  ATLAS.act      = 0;
  ATLAS.tension  = 1;
  ATLAS.timerTotal  = dur * 60;
  ATLAS.timerLeft   = dur * 60;
  ATLAS.timerRunning = false;
  if (ATLAS.timerInterval) clearInterval(ATLAS.timerInterval);

  return scenario;
}

// ── TIMER ──
function startTimer(onTick, onEnd) {
  if (ATLAS.timerRunning) return;
  ATLAS.timerRunning = true;
  ATLAS.timerInterval = setInterval(() => {
    if (ATLAS.timerLeft <= 0) {
      clearInterval(ATLAS.timerInterval);
      ATLAS.timerRunning = false;
      if (onEnd) onEnd();
      return;
    }
    ATLAS.timerLeft--;
    // Auto-escalade
    const ratio = ATLAS.timerLeft / ATLAS.timerTotal;
    if (ATLAS.timerLeft === Math.floor(ATLAS.timerTotal * 0.5)) notify('⚡ Mi-temps — la pression monte !', true);
    if (ATLAS.timerLeft === Math.floor(ATLAS.timerTotal * 0.25)) { notify('⚠ 25% du temps — ESCALADE !', true); ATLAS.tension = Math.min(5, ATLAS.tension + 1); }
    if (ATLAS.timerLeft === Math.floor(ATLAS.timerTotal * 0.1))  { notify('🔴 Temps critique !', true);          ATLAS.tension = Math.min(5, ATLAS.tension + 1); }
    if (onTick) onTick(ATLAS.timerLeft, ATLAS.timerTotal);
  }, 1000);
}

function pauseTimer() {
  clearInterval(ATLAS.timerInterval);
  ATLAS.timerRunning = false;
}

function resetTimer(onTick) {
  pauseTimer();
  ATLAS.timerLeft = ATLAS.timerTotal;
  if (onTick) onTick(ATLAS.timerLeft, ATLAS.timerTotal);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── RESOLUTION MATRIX ──
function computeMatrixResult(x, y, w, h, archetype) {
  const cx = w / 2, cy = h / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const maxR = Math.min(w, h) / 2;
  const ratio = dist / maxR;

  // Bonus archétype
  const bonuses = { Technique: 0.1, Physique: 0.07, Mental: 0.05, Social: 0.03 };
  const bonus = bonuses[archetype] || 0;
  const eff = ratio - bonus;

  if (eff < 0.18)  return { level: 'critique', label: '✦ SUCCÈS CRITIQUE', color: '#4ac0a0' };
  if (eff < 0.42)  return { level: 'succes',   label: '◎ SUCCÈS',          color: '#c8963c' };
  if (eff < 0.68)  return { level: 'partiel',  label: '◑ PARTIEL',         color: '#e8c84b' };
  if (eff < 0.86)  return { level: 'echec',    label: '✗ ÉCHEC',           color: '#c0392b' };
  return                  { level: 'critique_echec', label: '☠ ÉCHEC CRITIQUE', color: '#8b1a1a' };
}

function getMatrixDesc(level, playerName) {
  const descs = {
    critique:        `${playerName} excelle. Action réussie avec brio — un bénéfice supplémentaire est accordé.`,
    succes:          `${playerName} réussit l'action. L'objectif est atteint.`,
    partiel:         `${playerName} réussit partiellement. Il y a une complication mineure.`,
    echec:           `${playerName} échoue. Aucun progrès — une conséquence possible.`,
    critique_echec:  `${playerName} aggrave la situation. Conséquence grave pour le groupe.`,
  };
  return descs[level] || '';
}

// ── SAVE / LOAD ──
function saveSession() {
  if (!ATLAS.scenario) return;
  const data = {
    config: ATLAS.config,
    scenario: ATLAS.scenario,
    players: ATLAS.players,
    objects: ATLAS.objects,
    events: ATLAS.events,
    act: ATLAS.act,
    tension: ATLAS.tension,
    timerLeft: ATLAS.timerLeft,
    timerTotal: ATLAS.timerTotal,
  };
  sessionStorage.setItem('atlas_session', JSON.stringify(data));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem('atlas_session');
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(ATLAS, data);
    return true;
  } catch (e) {
    return false;
  }
}

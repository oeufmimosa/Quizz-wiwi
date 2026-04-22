const QUESTION_FILES = [
  'questions/genetique.json',
  'questions/anapath.json',
  'questions/traumato.json'
];
const FICHE_FILES = [
  'fiches/fiches_genetique.json',
  'fiches/fiches_anapath.json',
  'fiches/fiches_traumato.json'
];
const HISTORY_KEY = 'quizz-wiwi-history-v1';

let state = {
  subjects: [],
  fichesBySubject: [],
  currentSubject: null,
  currentSubjectIdx: 0,
  currentExam: null,
  currentFiche: null,
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0,
  mode: 'exam',
  timer: { interval: null, timeLeft: 0, duration: 0, startTime: 0 }
};

// ─── Load data ───
async function loadData() {
  const subjects = [];
  for (const file of QUESTION_FILES) {
    try {
      const res = await fetch(file);
      subjects.push(await res.json());
    } catch (e) { console.warn(`Could not load ${file}:`, e); }
  }
  state.subjects = subjects;

  const fiches = [];
  for (const file of FICHE_FILES) {
    try {
      const res = await fetch(file);
      fiches.push(await res.json());
    } catch (e) {
      fiches.push({ fiches: [] });
    }
  }
  state.fichesBySubject = fiches;
  renderHome();
}

// ─── Navigation ───
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ─── Home ───
function renderHome() {
  const grid = document.getElementById('subject-grid');
  grid.innerHTML = '';
  for (let i = 0; i < state.subjects.length; i++) {
    const subject = state.subjects[i];
    const totalQ = subject.examens.reduce((sum, ex) => sum + ex.questions.length, 0);
    const examCount = subject.examens.length;
    const fichesCount = (state.fichesBySubject[i]?.fiches || []).length;
    const card = document.createElement('div');
    card.className = 'subject-card' + (totalQ === 0 ? ' disabled' : '');
    card.innerHTML = `
      <div class="icon">${subject.icon || '📚'}</div>
      <div class="info">
        <h3>${subject.matiere}</h3>
        <p>${examCount} examens · ${totalQ} questions · ${fichesCount} fiches</p>
      </div>
    `;
    if (totalQ > 0) card.addEventListener('click', () => selectSubject(i));
    grid.appendChild(card);
  }
}

function selectSubject(idx) {
  state.currentSubjectIdx = idx;
  state.currentSubject = state.subjects[idx];
  document.getElementById('mode-subject-name').textContent = state.currentSubject.matiere;
  showScreen('screen-mode');
}

// ─── Exam list (from annales) ───
function showExamList() {
  state.mode = 'exam';
  const list = document.getElementById('exam-list');
  list.innerHTML = '';
  document.getElementById('exam-subject-name').textContent = state.currentSubject.matiere;
  for (const exam of state.currentSubject.examens) {
    if (exam.questions.length === 0) continue;
    const card = document.createElement('div');
    card.className = 'exam-card';
    const typeLabel = { cc: 'CC', normale: 'Normale', rattrapage: 'Rattrapage' };
    card.innerHTML = `
      <div class="exam-info">
        <span class="exam-type type-${exam.type}">${typeLabel[exam.type] || exam.type}</span>
        <h3>${exam.nom}</h3>
        <p>${exam.questions.length} questions</p>
      </div>
      <div class="exam-arrow">→</div>
    `;
    card.addEventListener('click', () => startExam(exam));
    list.appendChild(card);
  }
  showScreen('screen-exams');
}

// ─── Course list ───
function showCoursList() {
  state.mode = 'cours';
  const list = document.getElementById('cours-list');
  list.innerHTML = '';
  document.getElementById('cours-subject-name').textContent = state.currentSubject.matiere;
  const coursMap = {};
  for (const exam of state.currentSubject.examens) {
    for (const q of exam.questions) {
      const cours = q.cours || 'Non classé';
      if (!coursMap[cours]) coursMap[cours] = [];
      coursMap[cours].push({ ...q, _examNom: exam.nom });
    }
  }
  const sorted = Object.entries(coursMap).sort((a, b) => b[1].length - a[1].length);
  for (const [coursName, questions] of sorted) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <div class="exam-info">
        <span class="exam-type type-cours">Cours</span>
        <h3>${coursName}</h3>
        <p>${questions.length} questions</p>
      </div>
      <div class="exam-arrow">→</div>
    `;
    card.addEventListener('click', () => startCours(coursName, questions));
    list.appendChild(card);
  }
  showScreen('screen-cours');
}

function startCours(coursName, questions) {
  state.mode = 'cours';
  state.currentExam = { nom: coursName, _coursTag: coursName };
  state.questions = shuffle([...questions]);
  state.currentIndex = 0;
  state.answers = state.questions.map(() => new Set());
  state.score = 0;
  showScreen('screen-quiz');
  renderQuestion();
}

function startExam(exam) {
  state.mode = 'exam';
  state.currentExam = exam;
  state.questions = [...exam.questions];
  state.currentIndex = 0;
  state.answers = state.questions.map(() => new Set());
  state.score = 0;
  showScreen('screen-quiz');
  renderQuestion();
}

function startRandom() {
  state.mode = 'random';
  let allQuestions = [];
  for (const exam of state.currentSubject.examens) {
    for (const q of exam.questions) allQuestions.push({ ...q, _examNom: exam.nom });
  }
  allQuestions = shuffle(allQuestions);
  state.questions = allQuestions.slice(0, Math.min(20, allQuestions.length));
  state.currentIndex = 0;
  state.answers = state.questions.map(() => new Set());
  state.score = 0;
  state.currentExam = { nom: '20 Questions Aléatoires' };
  showScreen('screen-quiz');
  renderQuestion();
}

// ─── Timed exam modes ───
function startTimedExam() {
  state.mode = 'exam50';
  let allQuestions = [];
  for (const exam of state.currentSubject.examens) {
    for (const q of exam.questions) allQuestions.push({ ...q, _examNom: exam.nom });
  }
  allQuestions = shuffle(allQuestions);
  state.questions = allQuestions.slice(0, Math.min(50, allQuestions.length));
  state.currentIndex = 0;
  state.answers = state.questions.map(() => new Set());
  state.score = 0;
  state.currentExam = { nom: `Examen blanc - ${state.questions.length} Q · 1h` };
  showScreen('screen-quiz');
  renderQuestion();
  startTimer(60 * 60); // 1 hour
}

function showCoursExamList() {
  state.mode = 'coursExam';
  const list = document.getElementById('cours-exam-list');
  list.innerHTML = '';
  document.getElementById('cours-exam-subject-name').textContent = state.currentSubject.matiere;
  const coursMap = {};
  for (const exam of state.currentSubject.examens) {
    for (const q of exam.questions) {
      const cours = q.cours || 'Non classé';
      if (!coursMap[cours]) coursMap[cours] = [];
      coursMap[cours].push({ ...q, _examNom: exam.nom });
    }
  }
  const sorted = Object.entries(coursMap)
    .filter(([, qs]) => qs.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [coursName, questions] of sorted) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.innerHTML = `
      <div class="exam-info">
        <span class="exam-type type-cours">Examen cours</span>
        <h3>${coursName}</h3>
        <p>10 Q · 12 min · (${questions.length} Q disponibles)</p>
      </div>
      <div class="exam-arrow">→</div>
    `;
    card.addEventListener('click', () => startTimedCoursExam(coursName, questions));
    list.appendChild(card);
  }
  showScreen('screen-cours-exam');
}

function startTimedCoursExam(coursName, questions) {
  state.mode = 'coursExam';
  state.currentExam = { nom: `Examen cours - ${coursName}`, _coursTag: coursName };
  const n = Math.min(10, questions.length);
  state.questions = shuffle([...questions]).slice(0, n);
  state.currentIndex = 0;
  state.answers = state.questions.map(() => new Set());
  state.score = 0;
  showScreen('screen-quiz');
  renderQuestion();
  // 12 min for 10 Q, prorated if less
  startTimer(Math.round(12 * 60 * n / 10));
}

// ─── Timer ───
function startTimer(seconds) {
  state.timer.duration = seconds;
  state.timer.timeLeft = seconds;
  state.timer.startTime = Date.now();
  updateTimerDisplay();
  document.getElementById('timer').style.display = '';
  if (state.timer.interval) clearInterval(state.timer.interval);
  state.timer.interval = setInterval(() => {
    state.timer.timeLeft--;
    updateTimerDisplay();
    if (state.timer.timeLeft <= 0) {
      stopTimer();
      finishQuiz();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timer.interval) {
    clearInterval(state.timer.interval);
    state.timer.interval = null;
  }
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const t = Math.max(0, state.timer.timeLeft);
  const m = Math.floor(t / 60);
  const s = t % 60;
  el.textContent = `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('timer-warning', t <= 60);
  el.classList.toggle('timer-critical', t <= 15);
}

function hideTimer() {
  const el = document.getElementById('timer');
  if (el) el.style.display = 'none';
}

// ─── Fiches list ───
function showFichesList() {
  state.mode = 'fiches';
  const list = document.getElementById('fiches-list');
  list.innerHTML = '';
  document.getElementById('fiches-subject-name').textContent = state.currentSubject.matiere;
  const fiches = state.fichesBySubject[state.currentSubjectIdx]?.fiches || [];
  if (fiches.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">Aucune fiche disponible pour cette matière pour le moment.</p>';
  } else {
    const sorted = [...fiches].sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
    for (const fiche of sorted) {
      const card = document.createElement('div');
      card.className = 'exam-card';
      card.innerHTML = `
        <div class="exam-info">
          <span class="exam-type type-fiche">Fiche</span>
          <h3>${fiche.titre}</h3>
          <p>${fiche.prof || ''}</p>
        </div>
        <div class="exam-arrow">→</div>
      `;
      card.addEventListener('click', () => showFiche(fiche));
      list.appendChild(card);
    }
  }
  showScreen('screen-fiches');
}

function showFiche(fiche) {
  state.currentFiche = fiche;
  document.getElementById('fiche-title').textContent = fiche.titre;
  document.getElementById('fiche-prof').textContent = fiche.prof || '';
  document.getElementById('fiche-content').innerHTML = renderMarkdown(fiche.contenu_md || '');

  const linksEl = document.getElementById('fiche-quiz-links');
  linksEl.innerHTML = '';
  const tags = fiche.cours_tags || [fiche.cours_tag].filter(Boolean);
  const coursMap = {};
  for (const exam of state.currentSubject.examens) {
    for (const q of exam.questions) {
      if (tags.includes(q.cours)) {
        if (!coursMap[q.cours]) coursMap[q.cours] = [];
        coursMap[q.cours].push({ ...q, _examNom: exam.nom });
      }
    }
  }
  for (const [coursName, questions] of Object.entries(coursMap)) {
    if (questions.length === 0) continue;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary fiche-quiz-btn';
    btn.innerHTML = `▶ Quiz : ${coursName} (${questions.length} Q)`;
    btn.addEventListener('click', () => startCours(coursName, questions));
    linksEl.appendChild(btn);
  }
  showScreen('screen-fiche-view');
}

function goBackToFiches() { showScreen('screen-fiches'); }

// ─── Simple Markdown renderer ───
function renderMarkdown(md) {
  if (!md) return '';
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/^---+$/gm, '<hr>');
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/gs, m => '<ul>' + m + '</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\|(.+)\|$/gm, (m, content) => {
    const cells = content.split('|').map(c => c.trim()).filter(c => c);
    if (cells.every(c => /^-+$/.test(c))) return '';
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*?<\/tr>\n?)+/gs, m => '<table>' + m + '</table>');
  html = html.split(/\n\n+/).map(block => {
    if (block.match(/^<(h\d|ul|ol|table|hr|blockquote)/)) return block;
    if (block.trim() === '') return '';
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');
  return html;
}

// ─── Quiz ───
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  document.getElementById('progress-fill').style.width = ((state.currentIndex / total) * 100) + '%';
  document.getElementById('question-counter').textContent = `Question ${state.currentIndex + 1} / ${total}`;
  document.getElementById('quiz-exam-name').textContent = state.currentExam.nom;
  if (q.contexte) {
    document.getElementById('question-context').textContent = q.contexte;
    document.getElementById('question-context').style.display = '';
  } else {
    document.getElementById('question-context').style.display = 'none';
  }
  document.getElementById('question-text').textContent = q.enonce;
  const list = document.getElementById('options-list');
  list.innerHTML = '';
  const currentAnswers = state.answers[state.currentIndex];
  for (const opt of q.options) {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (currentAnswers.has(opt.label) ? ' selected' : '');
    btn.innerHTML = `<span class="option-label">${opt.label}</span><span>${opt.text}</span>`;
    btn.addEventListener('click', () => toggleOption(btn, opt.label));
    list.appendChild(btn);
  }
  document.getElementById('btn-prev').style.display = state.currentIndex > 0 ? '' : 'none';
  const isLast = state.currentIndex === total - 1;
  document.getElementById('btn-next').style.display = isLast ? 'none' : '';
  document.getElementById('btn-finish').style.display = isLast ? '' : 'none';
}

function toggleOption(btn, label) {
  const currentAnswers = state.answers[state.currentIndex];
  if (currentAnswers.has(label)) {
    currentAnswers.delete(label);
    btn.classList.remove('selected');
  } else {
    currentAnswers.add(label);
    btn.classList.add('selected');
  }
}

function prevQuestion() {
  if (state.currentIndex > 0) { state.currentIndex--; renderQuestion(); }
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) { state.currentIndex++; renderQuestion(); }
}

function finishQuiz() {
  stopTimer();
  hideTimer();
  state.score = 0;
  for (let i = 0; i < state.questions.length; i++) {
    const q = state.questions[i];
    if (q.reponses.length > 0 && setsEqual(state.answers[i], new Set(q.reponses))) state.score++;
  }
  saveResult();
  showResults();
}

// ─── Save result to localStorage ───
function saveResult() {
  // Only save timed modes (for progression tracking)
  if (state.mode !== 'exam50' && state.mode !== 'coursExam') return;

  const answeredWithCorrection = state.questions.filter(q => q.reponses.length > 0).length;
  if (answeredWithCorrection === 0) return;

  // Per-course breakdown
  const byCourse = {};
  for (let i = 0; i < state.questions.length; i++) {
    const q = state.questions[i];
    if (q.reponses.length === 0) continue;
    const cours = q.cours || 'Non classé';
    if (!byCourse[cours]) byCourse[cours] = { correct: 0, total: 0 };
    byCourse[cours].total++;
    if (setsEqual(state.answers[i], new Set(q.reponses))) byCourse[cours].correct++;
  }

  const elapsed = state.timer.duration - state.timer.timeLeft;
  const result = {
    date: new Date().toISOString(),
    subject: state.currentSubject.matiere,
    mode: state.mode,
    modeLabel: state.mode === 'exam50' ? 'Examen 50Q' : 'Examen cours',
    examName: state.currentExam.nom,
    coursTag: state.currentExam._coursTag || null,
    score: state.score,
    total: answeredWithCorrection,
    pct: Math.round((state.score / answeredWithCorrection) * 100),
    timeTaken: elapsed,
    duration: state.timer.duration,
    byCourse
  };

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch (e) { history = []; }
  history.push(result);
  if (history.length > 500) history = history.slice(-500);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch (e) { return []; }
}

function clearHistory() {
  if (confirm('Effacer tout l\'historique ?')) {
    localStorage.removeItem(HISTORY_KEY);
    showProgression();
  }
}

// ─── Find fiche for a course tag ───
function findFicheForCours(coursTag) {
  for (const fichesData of state.fichesBySubject) {
    for (const fiche of (fichesData.fiches || [])) {
      const tags = fiche.cours_tags || [fiche.cours_tag].filter(Boolean);
      if (tags.includes(coursTag)) return fiche;
    }
  }
  return null;
}

function openFicheFromQuiz(coursTag) {
  const fiche = findFicheForCours(coursTag);
  if (fiche) {
    for (let i = 0; i < state.fichesBySubject.length; i++) {
      const fichesData = state.fichesBySubject[i];
      if ((fichesData.fiches || []).some(f => f === fiche)) {
        state.currentSubjectIdx = i;
        state.currentSubject = state.subjects[i];
        break;
      }
    }
    showFiche(fiche);
  }
}

// ─── Results with analysis ───
function showResults() {
  const answeredWithCorrection = state.questions.filter(q => q.reponses.length > 0).length;
  const pct = answeredWithCorrection > 0 ? Math.round((state.score / answeredWithCorrection) * 100) : 0;
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-correct').textContent = state.score;
  document.getElementById('score-wrong').textContent = answeredWithCorrection - state.score;
  document.getElementById('score-total').textContent = `${answeredWithCorrection} questions corrigées`;

  // Show time if timed mode
  const timeEl = document.getElementById('score-time');
  if ((state.mode === 'exam50' || state.mode === 'coursExam') && state.timer.duration > 0) {
    const elapsed = state.timer.duration - state.timer.timeLeft;
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    timeEl.textContent = `⏱ Temps : ${m}m ${s}s / ${Math.floor(state.timer.duration / 60)}m`;
    timeEl.style.display = '';
  } else {
    timeEl.style.display = 'none';
  }

  // Build analysis
  renderAnalysis();

  // Correction review
  const reviewContainer = document.getElementById('correction-review');
  reviewContainer.innerHTML = '';
  for (let i = 0; i < state.questions.length; i++) {
    const q = state.questions[i];
    const userAnswers = state.answers[i];
    const correctAnswers = new Set(q.reponses);
    const isCorrect = q.reponses.length > 0 && setsEqual(userAnswers, correctAnswers);
    const hasCorrection = q.reponses.length > 0;
    const div = document.createElement('div');
    div.className = 'review-question ' + (hasCorrection ? (isCorrect ? 'review-correct' : 'review-wrong') : 'review-nodata');
    let optionsHtml = '';
    for (const opt of q.options) {
      const isUserPick = userAnswers.has(opt.label);
      const isCorrectOpt = correctAnswers.has(opt.label);
      let cls = '';
      if (hasCorrection) {
        if (isCorrectOpt && isUserPick) cls = 'opt-correct';
        else if (isCorrectOpt && !isUserPick) cls = 'opt-missed';
        else if (!isCorrectOpt && isUserPick) cls = 'opt-wrong';
      } else if (isUserPick) cls = 'opt-selected';
      optionsHtml += `<div class="review-opt ${cls}"><span class="review-opt-label">${opt.label}</span> ${opt.text}</div>`;
    }
    let statusIcon = '';
    if (hasCorrection) statusIcon = isCorrect ? '<span class="status-icon correct-icon">✓</span>' : '<span class="status-icon wrong-icon">✗</span>';
    const fiche = q.cours ? findFicheForCours(q.cours) : null;
    const ficheBtn = fiche ? `<button class="fiche-link-btn" onclick="openFicheFromQuiz('${q.cours.replace(/'/g, "\\'")}')">📖 Fiche : ${fiche.titre}</button>` : '';
    div.innerHTML = `
      <div class="review-header">${statusIcon}<span class="review-num">Q${i + 1}</span></div>
      <div class="review-enonce">${q.enonce}</div>
      <div class="review-options">${optionsHtml}</div>
      ${hasCorrection ? `<div class="review-answer">Réponse${correctAnswers.size > 1 ? 's' : ''} : ${q.reponses.join(', ')}</div>` : '<div class="review-answer no-correction">Pas de correction disponible</div>'}
      ${ficheBtn}
      ${q.cours_extrait ? `<details class="review-cours-details"><summary class="review-cours-toggle">Voir l'extrait du cours</summary><div class="review-cours">${q.cours_extrait}</div></details>` : ''}
    `;
    reviewContainer.appendChild(div);
  }
  showScreen('screen-results');
}

function renderAnalysis() {
  const analysisEl = document.getElementById('analysis-container');
  analysisEl.innerHTML = '';

  // Per-course stats for current quiz
  const byCourse = {};
  for (let i = 0; i < state.questions.length; i++) {
    const q = state.questions[i];
    if (q.reponses.length === 0) continue;
    const cours = q.cours || 'Non classé';
    if (!byCourse[cours]) byCourse[cours] = { correct: 0, total: 0 };
    byCourse[cours].total++;
    if (setsEqual(state.answers[i], new Set(q.reponses))) byCourse[cours].correct++;
  }

  const coursStats = Object.entries(byCourse).map(([c, s]) => ({
    cours: c,
    correct: s.correct,
    total: s.total,
    pct: Math.round((s.correct / s.total) * 100)
  }));

  const weak = coursStats.filter(c => c.pct < 60 && c.total >= 1).sort((a, b) => a.pct - b.pct);
  const strong = coursStats.filter(c => c.pct >= 80 && c.total >= 1).sort((a, b) => b.pct - a.pct);

  let html = '<h3 class="analysis-title">📊 Analyse de ta performance</h3>';

  // Performance par cours
  if (coursStats.length > 1) {
    html += '<div class="analysis-section"><h4>Score par cours</h4><div class="cours-stats">';
    const sorted = [...coursStats].sort((a, b) => b.pct - a.pct);
    for (const c of sorted) {
      const color = c.pct >= 80 ? 'green' : c.pct >= 60 ? 'orange' : 'red';
      html += `
        <div class="cours-stat-item">
          <div class="cours-stat-header">
            <span class="cours-stat-name">${c.cours}</span>
            <span class="cours-stat-pct ${color}">${c.correct}/${c.total} · ${c.pct}%</span>
          </div>
          <div class="cours-stat-bar"><div class="cours-stat-fill ${color}" style="width:${c.pct}%"></div></div>
        </div>
      `;
    }
    html += '</div></div>';
  }

  // Points faibles
  if (weak.length > 0) {
    html += '<div class="analysis-section weak-section"><h4>⚠️ À réviser en priorité</h4><ul>';
    for (const c of weak) {
      const fiche = findFicheForCours(c.cours);
      const link = fiche
        ? `<button class="inline-link" onclick="openFicheFromQuiz('${c.cours.replace(/'/g, "\\'")}')">→ Voir la fiche</button>`
        : '';
      html += `<li><strong>${c.cours}</strong> : ${c.correct}/${c.total} (${c.pct}%) ${link}</li>`;
    }
    html += '</ul></div>';
  }

  // Points forts
  if (strong.length > 0) {
    html += '<div class="analysis-section strong-section"><h4>✅ Cours maîtrisés</h4><ul>';
    for (const c of strong) html += `<li><strong>${c.cours}</strong> : ${c.correct}/${c.total} (${c.pct}%)</li>`;
    html += '</ul></div>';
  }

  // Comparaison avec historique
  if (state.mode === 'exam50' || state.mode === 'coursExam') {
    const history = loadHistory();
    const previous = history
      .filter(h => h.subject === state.currentSubject.matiere && h.mode === state.mode &&
                   (state.mode !== 'coursExam' || h.coursTag === state.currentExam._coursTag))
      .slice(-6, -1); // exclude current

    if (previous.length > 0) {
      const pcts = previous.map(p => p.pct);
      const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
      const currentPct = state.questions.filter(q => q.reponses.length > 0).length > 0
        ? Math.round((state.score / state.questions.filter(q => q.reponses.length > 0).length) * 100)
        : 0;
      const diff = currentPct - avg;
      const trend = diff > 5 ? '📈 Progression' : diff < -5 ? '📉 Régression' : '➡️ Stable';
      html += `
        <div class="analysis-section history-section">
          <h4>📈 Progression</h4>
          <p><strong>${trend}</strong> : ${currentPct}% maintenant vs ${avg}% en moyenne sur ${previous.length} essais précédents (${diff >= 0 ? '+' : ''}${diff}%)</p>
          <p class="history-list">Derniers scores : ${pcts.join('% · ')}%</p>
        </div>
      `;
    } else {
      html += `<div class="analysis-section history-section"><h4>📈 Progression</h4><p>Premier essai enregistré. Refais le test pour suivre ta progression !</p></div>`;
    }
  }

  analysisEl.innerHTML = html;
}

// ─── Progression screen ───
function showProgression() {
  const history = loadHistory();
  const container = document.getElementById('progression-content');
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-light); padding:2rem;">Aucun résultat enregistré. Fais un examen chronométré pour commencer le suivi.</p>';
    showScreen('screen-progression');
    return;
  }

  // Group by subject
  const bySubject = {};
  for (const h of history) {
    if (!bySubject[h.subject]) bySubject[h.subject] = [];
    bySubject[h.subject].push(h);
  }

  let html = `<div class="progression-actions"><button class="btn btn-secondary" onclick="clearHistory()">🗑️ Effacer l'historique</button></div>`;

  for (const [subject, results] of Object.entries(bySubject)) {
    results.sort((a, b) => new Date(a.date) - new Date(b.date));
    const avg = Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length);
    const last5 = results.slice(-5);
    const last5Avg = Math.round(last5.reduce((s, r) => s + r.pct, 0) / last5.length);
    const trend = last5Avg - avg;

    html += `
      <div class="progression-subject">
        <h3>${subject}</h3>
        <div class="progression-stats">
          <div class="stat"><div class="stat-value">${results.length}</div><div class="stat-label">Examens</div></div>
          <div class="stat"><div class="stat-value">${avg}%</div><div class="stat-label">Moyenne</div></div>
          <div class="stat"><div class="stat-value ${trend >= 0 ? 'green' : 'red'}">${trend >= 0 ? '+' : ''}${trend}%</div><div class="stat-label">Tendance</div></div>
        </div>
        <div class="progression-list">
    `;
    for (const r of results.slice().reverse()) {
      const date = new Date(r.date);
      const dateStr = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const color = r.pct >= 80 ? 'green' : r.pct >= 60 ? 'orange' : 'red';
      html += `
        <div class="progression-item">
          <div class="progression-meta">
            <div class="progression-mode">${r.modeLabel || r.mode} · ${r.examName || ''}</div>
            <div class="progression-date">${dateStr}</div>
          </div>
          <div class="progression-score ${color}">${r.score}/${r.total} · ${r.pct}%</div>
        </div>
      `;
    }
    html += '</div></div>';
  }

  container.innerHTML = html;
  showScreen('screen-progression');
}

function restartQuiz() {
  stopTimer();
  if (state.mode === 'exam') startExam(state.currentExam);
  else if (state.mode === 'exam50') startTimedExam();
  else if (state.mode === 'coursExam') {
    const coursName = state.currentExam._coursTag;
    const questions = [];
    for (const exam of state.currentSubject.examens) {
      for (const q of exam.questions) {
        if (q.cours === coursName) questions.push({ ...q, _examNom: exam.nom });
      }
    }
    startTimedCoursExam(coursName, questions);
  } else if (state.mode === 'cours') {
    const coursName = state.currentExam.nom;
    const questions = [];
    for (const exam of state.currentSubject.examens) {
      for (const q of exam.questions) {
        if (q.cours === coursName) questions.push({ ...q, _examNom: exam.nom });
      }
    }
    startCours(coursName, questions);
  } else startRandom();
}

function goHome() { stopTimer(); hideTimer(); showScreen('screen-home'); }
function goBackToMode() { stopTimer(); hideTimer(); showScreen('screen-mode'); }
function quitQuiz() {
  if (state.mode === 'exam50' || state.mode === 'coursExam') {
    if (!confirm('Abandonner cet examen chronométré ? Le temps sera perdu.')) return;
  }
  stopTimer();
  hideTimer();
  showScreen('screen-home');
}

// ─── Utils ───
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

document.addEventListener('DOMContentLoaded', loadData);

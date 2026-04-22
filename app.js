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

let state = {
  subjects: [],
  fichesBySubject: [],
  currentSubject: null,
  currentExam: null,
  currentFiche: null,
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0,
  mode: 'exam'
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

// ─── Exam list ───
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
  state.currentExam = { nom: coursName, _coursTag: coursName };
  state.questions = shuffle([...questions]);
  state.currentIndex = 0;
  state.answers = state.questions.map(() => new Set());
  state.score = 0;
  showScreen('screen-quiz');
  renderQuestion();
}

function startExam(exam) {
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
    for (const q of exam.questions) {
      allQuestions.push({ ...q, _examNom: exam.nom });
    }
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
    // Group by prof if multiple profs
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

// ─── Display a fiche ───
function showFiche(fiche) {
  state.currentFiche = fiche;
  document.getElementById('fiche-title').textContent = fiche.titre;
  document.getElementById('fiche-prof').textContent = fiche.prof || '';

  const contentEl = document.getElementById('fiche-content');
  contentEl.innerHTML = renderMarkdown(fiche.contenu_md || '');

  // Add links to related quizzes
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

function goBackToFiches() {
  showScreen('screen-fiches');
}

// ─── Simple Markdown renderer ───
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // Bold + italic
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // Code
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>');
  // Lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/gs, m => '<ul>' + m + '</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Tables (simple)
  html = html.replace(/^\|(.+)\|$/gm, (m, content) => {
    const cells = content.split('|').map(c => c.trim()).filter(c => c);
    if (cells.every(c => /^-+$/.test(c))) return ''; // separator row
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*?<\/tr>\n?)+/gs, m => '<table>' + m + '</table>');
  // Paragraphs from double newlines
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
  document.getElementById('progress-fill').style.width =
    ((state.currentIndex / total) * 100) + '%';
  document.getElementById('question-counter').textContent =
    `Question ${state.currentIndex + 1} / ${total}`;
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
  state.score = 0;
  for (let i = 0; i < state.questions.length; i++) {
    const q = state.questions[i];
    if (q.reponses.length > 0 && setsEqual(state.answers[i], new Set(q.reponses))) state.score++;
  }
  showResults();
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
    // Find the subject this fiche belongs to
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

// ─── Results ───
function showResults() {
  const answeredWithCorrection = state.questions.filter(q => q.reponses.length > 0).length;
  const pct = answeredWithCorrection > 0 ? Math.round((state.score / answeredWithCorrection) * 100) : 0;
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-correct').textContent = state.score;
  document.getElementById('score-wrong').textContent = answeredWithCorrection - state.score;
  document.getElementById('score-total').textContent = `${answeredWithCorrection} questions corrigées`;

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
    if (hasCorrection) {
      statusIcon = isCorrect ? '<span class="status-icon correct-icon">✓</span>' : '<span class="status-icon wrong-icon">✗</span>';
    }

    // Check if there's a fiche for this course
    const fiche = q.cours ? findFicheForCours(q.cours) : null;
    const ficheBtn = fiche ? `<button class="fiche-link-btn" onclick="openFicheFromQuiz('${q.cours.replace(/'/g, "\\'")}')">📖 Fiche : ${fiche.titre}</button>` : '';

    div.innerHTML = `
      <div class="review-header">
        ${statusIcon}
        <span class="review-num">Q${i + 1}</span>
      </div>
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

function restartQuiz() {
  if (state.mode === 'exam') startExam(state.currentExam);
  else if (state.mode === 'cours') {
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

function goHome() { showScreen('screen-home'); }
function goBackToMode() { showScreen('screen-mode'); }

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

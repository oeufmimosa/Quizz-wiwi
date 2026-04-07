const QUESTION_FILES = [
  'questions/genetique.json',
  'questions/anapath.json',
  'questions/traumato.json'
];

let state = {
  subjects: [],
  currentSubject: null,
  currentExam: null,
  questions: [],
  currentIndex: 0,
  answers: [], // array of Sets, one per question
  score: 0,
  mode: 'exam' // 'exam' or 'random'
};

// ─── Load data ───
async function loadSubjects() {
  const subjects = [];
  for (const file of QUESTION_FILES) {
    try {
      const res = await fetch(file);
      const data = await res.json();
      subjects.push(data);
    } catch (e) {
      console.warn(`Could not load ${file}:`, e);
    }
  }
  state.subjects = subjects;
  renderHome();
}

// ─── Navigation ───
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ─── Home screen ───
function renderHome() {
  const grid = document.getElementById('subject-grid');
  grid.innerHTML = '';

  for (const subject of state.subjects) {
    const totalQ = subject.examens.reduce((sum, ex) => sum + ex.questions.length, 0);
    const examCount = subject.examens.length;
    const card = document.createElement('div');
    card.className = 'subject-card' + (totalQ === 0 ? ' disabled' : '');
    card.innerHTML = `
      <div class="icon">${subject.icon || '📚'}</div>
      <div class="info">
        <h3>${subject.matiere}</h3>
        <p>${examCount} examen${examCount > 1 ? 's' : ''} · ${totalQ} question${totalQ > 1 ? 's' : ''}</p>
      </div>
    `;
    if (totalQ > 0) {
      card.addEventListener('click', () => selectSubject(subject));
    }
    grid.appendChild(card);
  }
}

// ─── Subject selected → mode selection ───
function selectSubject(subject) {
  state.currentSubject = subject;
  document.getElementById('mode-subject-name').textContent = subject.matiere;
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
  // Pool all questions from all exams of this subject
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

// ─── Quiz ───
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;

  // Progress
  document.getElementById('progress-fill').style.width =
    ((state.currentIndex / total) * 100) + '%';
  document.getElementById('question-counter').textContent =
    `Question ${state.currentIndex + 1} / ${total}`;
  document.getElementById('quiz-exam-name').textContent =
    state.currentExam.nom;

  // Question text
  if (q.contexte) {
    document.getElementById('question-context').textContent = q.contexte;
    document.getElementById('question-context').style.display = '';
  } else {
    document.getElementById('question-context').style.display = 'none';
  }
  document.getElementById('question-text').textContent = q.enonce;

  // Options
  const list = document.getElementById('options-list');
  list.innerHTML = '';

  const currentAnswers = state.answers[state.currentIndex];

  for (const opt of q.options) {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (currentAnswers.has(opt.label) ? ' selected' : '');
    btn.innerHTML = `
      <span class="option-label">${opt.label}</span>
      <span>${opt.text}</span>
    `;
    btn.addEventListener('click', () => toggleOption(btn, opt.label));
    list.appendChild(btn);
  }

  // Nav buttons
  document.getElementById('btn-prev').style.display =
    state.currentIndex > 0 ? '' : 'none';

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
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
  }
}

function finishQuiz() {
  // Calculate score
  state.score = 0;
  for (let i = 0; i < state.questions.length; i++) {
    const q = state.questions[i];
    if (q.reponses.length > 0 && setsEqual(state.answers[i], new Set(q.reponses))) {
      state.score++;
    }
  }
  showResults();
}

// ─── Results ───
function showResults() {
  const total = state.questions.length;
  const answeredWithCorrection = state.questions.filter(q => q.reponses.length > 0).length;
  const pct = answeredWithCorrection > 0 ? Math.round((state.score / answeredWithCorrection) * 100) : 0;

  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-correct').textContent = state.score;
  document.getElementById('score-wrong').textContent = answeredWithCorrection - state.score;
  document.getElementById('score-total').textContent = `${answeredWithCorrection} questions corrigées`;

  // Render correction review
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
      } else {
        if (isUserPick) cls = 'opt-selected';
      }
      optionsHtml += `<div class="review-opt ${cls}">
        <span class="review-opt-label">${opt.label}</span> ${opt.text}
      </div>`;
    }

    let statusIcon = '';
    if (hasCorrection) {
      statusIcon = isCorrect ? '<span class="status-icon correct-icon">✓</span>' : '<span class="status-icon wrong-icon">✗</span>';
    }

    div.innerHTML = `
      <div class="review-header">
        ${statusIcon}
        <span class="review-num">Q${i + 1}</span>
      </div>
      <div class="review-enonce">${q.enonce}</div>
      <div class="review-options">${optionsHtml}</div>
      ${hasCorrection ? `<div class="review-answer">Réponse${correctAnswers.size > 1 ? 's' : ''} : ${q.reponses.join(', ')}</div>` : '<div class="review-answer no-correction">Pas de correction disponible</div>'}
    `;
    reviewContainer.appendChild(div);
  }

  showScreen('screen-results');
}

function restartQuiz() {
  if (state.mode === 'exam') {
    startExam(state.currentExam);
  } else {
    startRandom();
  }
}

function goHome() {
  showScreen('screen-home');
}

function goBackToMode() {
  showScreen('screen-mode');
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
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', loadSubjects);

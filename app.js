const els = {
  word: document.querySelector('#word'),
  posBadge: document.querySelector('#posBadge'),
  progressText: document.querySelector('#progressText'),
  choices: document.querySelector('#choices'),
  feedback: document.querySelector('#feedback'),
  feedbackTitle: document.querySelector('#feedbackTitle'),
  correctMeaning: document.querySelector('#correctMeaning'),
  example: document.querySelector('#example'),
  nextButton: document.querySelector('#nextButton'),
  loadedCount: document.querySelector('#loadedCount'),
  answeredCount: document.querySelector('#answeredCount'),
  accuracy: document.querySelector('#accuracy'),
  streak: document.querySelector('#streak'),
  resetStats: document.querySelector('#resetStats'),
  familiarityFilter: document.querySelector('#familiarityFilter'),
  wrongFirst: document.querySelector('#wrongFirst'),
  errorBox: document.querySelector('#errorBox'),
};

const STORAGE_KEY = 'toeic-vocab-quiz-stats-v1';
const OPTION_KEYS = ['1', '2', '3', '4'];
const LETTER_KEYS = ['a', 'b', 'c', 'd'];

let allWords = [];
let pool = [];
let poolCursor = 0;
let current = null;
let answered = false;

let stats = loadStats();

function loadStats() {
  try {
    return {
      total: 0,
      correct: 0,
      streak: 0,
      maxStreak: 0,
      wrong: {},
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),
    };
  } catch {
    return { total: 0, correct: 0, streak: 0, maxStreak: 0, wrong: {} };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function filteredWords() {
  const value = els.familiarityFilter.value;
  return allWords.filter(w => value === 'all' || w.familiarity === value);
}

function rebuildPool() {
  const base = filteredWords();
  if (base.length < 1) {
    throw new Error('這個篩選條件下目前沒有單字。');
  }

  if (els.wrongFirst.checked) {
    const wrong = base.filter(w => (stats.wrong[w.word] || 0) > 0)
      .sort((a, b) => (stats.wrong[b.word] || 0) - (stats.wrong[a.word] || 0));
    const rest = shuffle(base.filter(w => !(stats.wrong[w.word] > 0)));
    pool = [...wrong, ...rest];
  } else {
    pool = shuffle(base);
  }
  poolCursor = 0;
}

function nextWordFromPool() {
  if (!pool.length || poolCursor >= pool.length) rebuildPool();
  return pool[poolCursor++];
}

function makeChoices(target) {
  const focusedCandidates = filteredWords()
    .filter(w => w.word !== target.word && w.meaning !== target.meaning);
  const fallbackCandidates = allWords
    .filter(w => w.word !== target.word && w.meaning !== target.meaning);

  // 篩選題庫有至少 4 個不同單字時，四個選項都從同一題庫出。
  // 例如選「考前字」時，就只會拿考前字互相當干擾選項。
  const candidates = focusedCandidates.length >= 3 ? focusedCandidates : fallbackCandidates;
  const distractors = shuffle(candidates).slice(0, 3);
  if (distractors.length < 3) throw new Error('可用的不同中文選項不足 4 個。');
  return shuffle([target, ...distractors]);
}

function renderQuestion() {
  hideError();
  answered = false;
  els.feedback.classList.add('hidden');
  els.nextButton.classList.add('hidden');
  els.choices.innerHTML = '';

  current = nextWordFromPool();
  current.options = makeChoices(current);

  els.word.textContent = current.word;
  els.posBadge.textContent = current.pos || 'other';
  els.progressText.textContent = `${Math.min(poolCursor, pool.length)} / ${pool.length}`;

  current.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.word = option.word;
    button.innerHTML = `<span class="choice-key">${index + 1}</span><span></span>`;
    button.querySelector('span:last-child').textContent = option.meaning;
    button.addEventListener('click', () => answer(option.word, button));
    els.choices.appendChild(button);
  });

  updateStatsUI();
}

function answer(selectedWord, selectedButton) {
  if (answered) return;
  answered = true;

  const isCorrect = selectedWord === current.word;
  stats.total += 1;

  if (isCorrect) {
    stats.correct += 1;
    stats.streak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    if (stats.wrong[current.word]) {
      stats.wrong[current.word] = Math.max(0, stats.wrong[current.word] - 1);
    }
  } else {
    stats.streak = 0;
    stats.wrong[current.word] = (stats.wrong[current.word] || 0) + 1;
  }

  saveStats();
  updateStatsUI();

  [...els.choices.children].forEach(button => {
    button.disabled = true;
    if (button.dataset.word === current.word) button.classList.add('correct');
  });
  if (!isCorrect) selectedButton.classList.add('wrong');

  els.feedbackTitle.textContent = isCorrect ? '✓ 答對了' : '✕ 答錯了';
  els.correctMeaning.textContent = `${current.word}：${current.meaning}`;
  els.example.textContent = current.example ? `例句：${current.example}` : '';
  els.feedback.classList.remove('hidden');
  els.nextButton.classList.remove('hidden');
  els.nextButton.focus({ preventScroll: true });
}

function updateStatsUI() {
  els.loadedCount.textContent = filteredWords().length || allWords.length || '—';
  els.answeredCount.textContent = stats.total;
  els.accuracy.textContent = stats.total ? `${Math.round((stats.correct / stats.total) * 100)}%` : '—';
  els.streak.textContent = stats.streak;
}

function showError(message) {
  els.errorBox.textContent = message;
  els.errorBox.classList.remove('hidden');
}

function hideError() {
  els.errorBox.classList.add('hidden');
}

async function loadWords() {
  const response = await fetch(`./data/words.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`讀取題庫失敗：HTTP ${response.status}`);
  const data = await response.json();

  if (!Array.isArray(data) || data.length < 4) {
    throw new Error('words.json 至少需要 4 筆資料。');
  }

  allWords = data
    .filter(item => item.word && item.meaning)
    .map(item => ({
      word: String(item.word).trim(),
      meaning: String(item.meaning).trim(),
      example: String(item.example || '').trim(),
      familiarity: String(item.familiarity || '').trim(),
      pos: String(item.pos || 'other').trim(),
      addedDate: String(item.addedDate || '').trim(),
    }));

  rebuildPool();
  renderQuestion();
}

els.nextButton.addEventListener('click', renderQuestion);

els.familiarityFilter.addEventListener('change', () => {
  try {
    rebuildPool();
    renderQuestion();
  } catch (error) {
    showError(error.message);
  }
});

els.wrongFirst.addEventListener('change', () => {
  try {
    rebuildPool();
    renderQuestion();
  } catch (error) {
    showError(error.message);
  }
});

els.resetStats.addEventListener('click', () => {
  const ok = confirm('確定要清除作答統計與錯題紀錄嗎？');
  if (!ok) return;
  stats = { total: 0, correct: 0, streak: 0, maxStreak: 0, wrong: {} };
  saveStats();
  updateStatsUI();
  if (els.wrongFirst.checked) {
    rebuildPool();
    renderQuestion();
  }
});

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (!answered) {
    let index = OPTION_KEYS.indexOf(key);
    if (index === -1) index = LETTER_KEYS.indexOf(key);
    if (index >= 0 && index < els.choices.children.length) {
      els.choices.children[index].click();
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    renderQuestion();
  }
});

loadWords().catch(error => {
  els.word.textContent = '載入失敗';
  els.progressText.textContent = '—';
  showError(`${error.message} 若你是直接雙擊 index.html，請改用 GitHub Pages 或本機 HTTP server 開啟。`);
});

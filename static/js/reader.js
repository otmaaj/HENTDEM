let allManga = [];
let activeGenre = 'all';
let currentUser = localStorage.getItem('hd_user') || null;

updateProfileUI();

window.addEventListener('load', () => {
  setTimeout(() => { document.getElementById('search').value = ''; }, 100);
  const match = location.pathname.match(/^\/read\/(.+)$/);
  if (match) openReader(decodeURIComponent(match[1]));
});

window.addEventListener('popstate', e => {
  if (e.state?.manga) openReader(e.state.manga);
  else { closeReader(); closeFav(); }
});

document.addEventListener('click', e => {
  const wrap = document.getElementById('profile-dropdown');
  const btn  = document.getElementById('profile-btn');
  if (!wrap.contains(e.target) && !btn.contains(e.target)) {
    wrap.classList.remove('open');
  }
});

function toggleDropdown() {
  document.getElementById('profile-dropdown').classList.toggle('open');
}

function switchTab(tab) {
  document.querySelectorAll('.dtab').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'reg'))
  );
  document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('reg-form').style.display   = tab === 'reg'   ? 'flex' : 'none';
  document.getElementById('l-msg').textContent = '';
  document.getElementById('r-msg').textContent = '';
}

function updateProfileUI() {
  const btn         = document.getElementById('profile-btn');
  const badge       = document.getElementById('profile-badge');
  const authPanel   = document.getElementById('auth-panel');
  const loggedPanel = document.getElementById('logged-panel');
  const loggedName  = document.getElementById('logged-name');
  if (currentUser) {
    btn.classList.add('logged');
    badge.textContent = currentUser.slice(0, 3).toUpperCase();
    authPanel.style.display   = 'none';
    loggedPanel.style.display = 'block';
    loggedName.textContent    = currentUser;
  } else {
    btn.classList.remove('logged');
    badge.textContent = '';
    authPanel.style.display   = 'block';
    loggedPanel.style.display = 'none';
  }
}

function parseError(data) {
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map(e => e.msg.replace('Value error, ', '')).join(' / ');
  return 'Ошибка';
}

async function doLogin() {
  const name = document.getElementById('l-name').value.trim();
  const pass = document.getElementById('l-pass').value.trim();
  const msg  = document.getElementById('l-msg');
  if (!name || !pass) { setMsg(msg, 'Заполни все поля', 'err'); return; }
  try {
    const r = await fetch('/users/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pass })
    });
    const data = await r.json();
    if (!r.ok) { setMsg(msg, parseError(data), 'err'); return; }
    currentUser = name;
    localStorage.setItem('hd_user', name);
    updateProfileUI();
    document.getElementById('profile-dropdown').classList.remove('open');
    render(allManga);
  } catch(e) { setMsg(msg, 'Ошибка сети', 'err'); }
}

async function doRegister() {
  const name = document.getElementById('r-name').value.trim();
  const pass = document.getElementById('r-pass').value.trim();
  const msg  = document.getElementById('r-msg');
  if (!name || !pass) { setMsg(msg, 'Заполни все поля', 'err'); return; }
  try {
    const r = await fetch('/users/reg', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pass })
    });
    const data = await r.json();
    if (!r.ok) { setMsg(msg, parseError(data), 'err'); return; }
    setMsg(msg, 'Готово! Теперь войди', 'ok');
    setTimeout(() => switchTab('login'), 1200);
  } catch(e) { setMsg(msg, 'Ошибка сети', 'err'); }
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem('hd_user');
  updateProfileUI();
  document.getElementById('profile-dropdown').classList.remove('open');
  render(allManga);
}

function setMsg(el, text, type) {
  el.textContent = text;
  el.className = 'dmsg ' + type;
}

// FAVOURITES
async function toggleFav(e, mangaName) {
  e.stopPropagation();
  if (!currentUser) { alert('Войдите в аккаунт'); return; }
  const btn = e.currentTarget;
  const isActive = btn.classList.contains('active');
  const url = isActive
    ? `/manga/fav_del?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(mangaName)}`
    : `/manga/add?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(mangaName)}`;
  try {
    const r = await fetch(url, { method: 'POST' });
    if (!r.ok) { const d = await r.json(); alert(parseError(d)); return; }
    btn.classList.toggle('active');
  } catch(e) { alert('Ошибка сети'); }
}

async function openFav() {
  document.getElementById('profile-dropdown').classList.remove('open');
  const overlay = document.getElementById('fav-overlay');
  const list    = document.getElementById('fav-list');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  list.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  try {
    const r = await fetch(`/manga/fav_list?user_name=${encodeURIComponent(currentUser)}`);
    if (!r.ok) { const d = await r.json(); list.innerHTML = `<div class="empty">${d.detail}</div>`; return; }
    const data = await r.json();
    renderCards(data.manga || [], list, true);
  } catch(e) {
    list.innerHTML = `<div class="empty">Ошибка: ${e.message}</div>`;
  }
}

function closeFav() {
  document.getElementById('fav-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// SEARCH
let searchTimer;
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 300);
});
document.getElementById('search').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

async function loadManga() {
  try {
    const r = await fetch('/manga/');
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    allManga = data.manga || [];
    buildGenres(allManga);
    render(allManga);
  } catch(e) {
    document.getElementById('card-list').innerHTML =
      `<div class="empty">Ошибка загрузки: ${e.message}</div>`;
  }
}

function buildGenres(list) {
  const set = new Set();
  list.forEach(m => (m.genre || 'другое').split(',').forEach(g => set.add(g.trim())));
  const bar = document.getElementById('genre-bar');
  set.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genre-btn'; btn.textContent = g; btn.dataset.genre = g;
    btn.onclick = () => setGenre(btn, g);
    bar.appendChild(btn);
  });
}

function setGenre(btn, genre) {
  document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); activeGenre = genre; doSearch();
}

function doSearch() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  let list = allManga;
  if (activeGenre !== 'all')
    list = list.filter(m => (m.genre||'').split(',').map(g=>g.trim()).includes(activeGenre));
  if (q)
    list = list.filter(m => m.name.toLowerCase().includes(q));
  render(list, q || activeGenre !== 'all');
}

function render(list, filtered = false) {
  const el = document.getElementById('card-list');
  document.getElementById('results-info').textContent = filtered ? `Найдено: ${list.length}` : '';
  renderCards(list, el, false);
}

function renderCards(list, el, isFav = false) {
  if (!list.length) { el.innerHTML = `<div class="empty">${isFav ? 'Избранное пусто' : 'Ничего не найдено'}</div>`; return; }
  el.innerHTML = '';
  list.forEach((m, i) => {
    const genres = (m.genre || 'другое').split(',').map(g => g.trim());
    const imgSrc = m.photo ? `/media/${encodeURIComponent(m.name)}/${m.photo}` : null;
    const num    = String(i + 1).padStart(2, '0');
    const card   = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${Math.min(i * 0.05, 0.8)}s`;
    card.innerHTML = `
      <div class="card-thumb">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${m.name}" loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=card-thumb-placeholder>${m.name.slice(0,2).toUpperCase()}</div>'">`
          : `<div class="card-thumb-placeholder">${m.name.slice(0,2).toUpperCase()}</div>`}
        <div class="read-badge">Читать</div>
      </div>
      <div class="card-info">
        <div class="card-num">${num}</div>
        <div class="card-meta">
          <div class="card-name">${m.name}</div>
          <div class="card-genres">${genres.map(g=>`<span class="tag">${g}</span>`).join('')}</div>
        </div>
        <div class="card-arrow">›</div>
        ${currentUser ? `<div class="fav-heart ${isFav ? 'active' : ''}">♥</div>` : ''}
      </div>`;

    // вешаем обработчик через querySelector — не через onclick в html
    const heart = card.querySelector('.fav-heart');
    if (heart) {
      heart.addEventListener('click', e => toggleFav(e, m.name));
    }

    if (isFav) {
      card.onclick = () => { closeFav(); openReader(m.name); };
    } else {
      card.onclick = () => openReader(m.name);
    }
    el.appendChild(card);
  });
}

async function openReader(name) {
  history.pushState({ manga: name }, '', `/read/${encodeURIComponent(name)}`);
  const reader = document.getElementById('reader');
  const wrap   = document.getElementById('pages-wrap');
  document.getElementById('reader-title').textContent = name;
  document.getElementById('reader-count').textContent = '';
  wrap.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  reader.classList.add('open');
  document.body.style.overflow = 'hidden';
  try {
    const r = await fetch(`/manga/${encodeURIComponent(name)}`);
    if (!r.ok) throw new Error(r.status);
    const data  = await r.json();
    const pages = data.pages || [];
    document.getElementById('reader-count').textContent = `${pages.length} стр.`;
    wrap.innerHTML = '';
    pages.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'page-item';
      item.innerHTML = `
        <div class="page-badge">${i + 1}</div>
        <img src="/media/${encodeURIComponent(name)}/${p}"
             alt="стр. ${i+1}"
             loading="${i < 2 ? 'eager' : 'lazy'}">`;
      wrap.appendChild(item);
    });
  } catch(e) {
    wrap.innerHTML = `<div class="empty">Ошибка: ${e.message}</div>`;
  }
}

function closeReader() {
  history.pushState({}, '', '/');
  document.getElementById('reader').classList.remove('open');
  document.getElementById('pages-wrap').innerHTML = '';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeReader(); closeFav(); } });

loadManga();
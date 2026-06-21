let allManga = [];
let activeGenres = new Set();
let currentUser = localStorage.getItem('hd_user') || null;

const eyeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const thumbIcon = `<svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor; vertical-align: middle; margin-right: 4px;"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.75 0 1.41-.41 1.75-1.03l3.58-8.35c.09-.23.15-.48.15-.75v-2z"/></svg> `;
const heartIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: block;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

updateProfileUI();

window.addEventListener('load', () => {
  setTimeout(() => { document.getElementById('search').value = ''; }, 100);
  const match = location.pathname.match(/^\/read\/(.+)$/);
  if (match) openReader(decodeURIComponent(match[1]), { fromPopState: true });
});

window.addEventListener('popstate', e => {
  if (e.state?.manga) openReader(e.state.manga, { fromPopState: true });
  else { closeReader({ fromPopState: true }); closeFav(); }
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
    loadManga();
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

// ТОСТ — правый нижний угол
function showGlobalToast(msg, type = 'default') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.className = type === 'error' ? 'error' : '';
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showToast(msg, targetBtn) {
  const oldToast = targetBtn.querySelector('.toast');
  if (oldToast) oldToast.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.display = 'inline-flex';
  t.style.alignItems = 'center';
  t.style.gap = '4px';
  t.innerHTML = msg;
  targetBtn.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 200);
  }, 2000);
}

function showHeartToast(btn, msg) {
  let t = btn.querySelector('.heart-toast');
  if (t) t.remove();
  t = document.createElement('span');
  t.className = 'heart-toast';
  t.textContent = msg;
  btn.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 200);
  }, 1800);
}

async function toggleFav(e, mangaName) {
  e.stopPropagation();
  if (!currentUser) { showGlobalToast('✕ &nbsp;Войдите в аккаунт', 'error'); return; }
  const btn = e.currentTarget;
  const isActive = btn.classList.contains('active');
  const url = isActive
    ? `/manga/fav_del?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(mangaName)}`
    : `/manga/add?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(mangaName)}`;
  try {
    const r = await fetch(url, { method: 'POST' });
    if (!r.ok) { const d = await r.json(); showGlobalToast('✕ &nbsp;' + parseError(d), 'error'); return; }
    btn.classList.toggle('active');
    showHeartToast(btn, isActive ? '✕ Удалено' : '♥ Добавлено');
  } catch(e) { alert('Ошибка сети'); }
}

// ИЗБРАННОЕ
let favLastScrollY = 0;
let favHeaderVisible = true;
let favScrollListener = null;

function setupFavScrollBehavior() {
  const body = document.querySelector('.fav-body');
  const header = document.querySelector('.fav-header');
  if (!body || !header) return;
  if (favScrollListener) body.removeEventListener('scroll', favScrollListener);
  favLastScrollY = 0;
  favHeaderVisible = true;
  header.classList.remove('fav-header--hidden');
  favScrollListener = () => {
    const currentY = body.scrollTop;
    const diff = currentY - favLastScrollY;
    if (diff > 8 && favHeaderVisible) {
      favHeaderVisible = false;
      header.classList.add('fav-header--hidden');
    } else if (diff < -8 && !favHeaderVisible) {
      favHeaderVisible = true;
      header.classList.remove('fav-header--hidden');
    }
    favLastScrollY = currentY;
  };
  body.addEventListener('scroll', favScrollListener, { passive: true });
}

async function openFav() {
  document.getElementById('profile-dropdown').classList.remove('open');
  const overlay = document.getElementById('fav-overlay');
  const list    = document.getElementById('fav-list');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setupFavScrollBehavior();
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
  const header = document.querySelector('.fav-header');
  if (header) header.classList.remove('fav-header--hidden');
}

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
    const bar = document.getElementById('genre-bar');
    if (bar) {
      const allBtn = bar.querySelector('[data-genre="all"]');
      bar.innerHTML = '';
      if (allBtn) bar.appendChild(allBtn);
    }
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

  // 1. Превращаем Set в массив, чтобы можно было отсортировать
  const sortedGenres = Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));

  const bar = document.getElementById('genre-bar');

  // 2. Используем отсортированный массив для создания кнопок
  sortedGenres.forEach(g => {
    if (bar.querySelector(`[data-genre="${g}"]`)) return;
    const btn = document.createElement('button');
    btn.className = 'genre-btn';
    btn.textContent = g;
    btn.dataset.genre = g;
    btn.onclick = () => setGenre(btn, g);
    bar.appendChild(btn);
  });
}

function setGenre(btn, genre) {
  if (genre === 'all') {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGenres = new Set();
  } else {
    const allBtn = document.querySelector('[data-genre="all"]');
    if (allBtn) allBtn.classList.remove('active');
    btn.classList.toggle('active');
    if (activeGenres.has(genre)) activeGenres.delete(genre);
    else activeGenres.add(genre);
    if (activeGenres.size === 0 && allBtn) allBtn.classList.add('active');
  }
  doSearch();
}

function doSearch() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  let list = allManga;
  if (activeGenres.size > 0)
    list = list.filter(m => [...activeGenres].every(g => (m.genre||'').split(',').map(x=>x.trim()).includes(g)));
  if (q)
    list = list.filter(m => m.name.toLowerCase().includes(q));
  render(list, q || activeGenres.size > 0);
}

let currentPage = 1;
const PAGE_SIZE = 15;

function render(list, filtered = false) {
  currentPage = 1;
  renderPage(list, filtered);
}

function renderPage(list, filtered = false) {
  const el = document.getElementById('card-list');
  const total = list.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  document.getElementById('results-info').textContent = filtered ? `Найдено: ${total}` : '';
  renderCards(pageItems, el, false);

  let pag = document.getElementById('pagination');
  if (!pag) {
    pag = document.createElement('div');
    pag.id = 'pagination';
    document.querySelector('.container').appendChild(pag);
  }
  if (totalPages <= 1) { pag.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i}, event)">${i}</button>`;
  }
  pag.innerHTML = html;
  pag._list = list;
  pag._filtered = filtered;
}

function goPage(n, e) {
  e.stopPropagation();
  const pag = document.getElementById('pagination');
  currentPage = n;
  renderPage(pag._list, pag._filtered);
  window.scrollTo({top: 0, behavior: 'smooth'});
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

    const pagesInfo = m.pages_count
      ? `<span class="card-pages">${m.pages_count} стр.</span>`
      : '';

    card.innerHTML = `
      <div class="card-thumb">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${m.name}" loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=card-thumb-placeholder>${m.name.slice(0,2).toUpperCase()}</div>'">`
          : `<div class="card-thumb-placeholder">${m.name.slice(0,2).toUpperCase()}</div>`}
        <div class="read-badge">Читать</div>
        ${(m.views ?? 0) > 100 ? '<div class="popular-badge">Популярно</div>' : ''}
      </div>
      <div class="card-info">
        <div class="card-num">${num}</div>
        <div class="card-meta">
          <div class="card-name">${m.name}</div>
          <div class="card-genres">${genres.map(g => `<span class="tag">${g}</span>`).join('')}</div>
        </div>
        ${pagesInfo}
        <div class="card-like card-like--readonly" data-name="${m.name}">${thumbIcon}${m.likes ?? 0}</div>
        <div class="card-views">${eyeIcon} ${m.views ?? 0}</div>
        <div class="card-arrow">›</div>
        ${currentUser && !isFav ? `<div class="fav-heart">${heartIcon}</div>` : ''}
        ${isFav ? '<div class="fav-delete"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></div>' : ''}
      </div>`;

    const heart = card.querySelector('.fav-heart');
    if (heart) heart.addEventListener('click', e => toggleFav(e, m.name));

    const del = card.querySelector('.fav-delete');
    if (del) {
      del.addEventListener('click', async e => {
        e.stopPropagation();
        const url = `/manga/fav_del?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(m.name)}`;
        await fetch(url, { method: 'POST' });
        card.remove();
        showGlobalToast('✕ &nbsp;Удалено из избранного');
      });
    }

    const like = card.querySelector('.card-like--readonly');
    if (like) like.addEventListener('click', e => e.stopPropagation());

    if (isFav) {
      card.onclick = () => { closeFav(); openReader(m.name); };
    } else {
      card.onclick = () => openReader(m.name);
    }
    el.appendChild(card);
  });
}

// РИДЕР
let readerLastScrollY = 0;
let readerHeaderVisible = true;
let readerScrollListener = null;

function setupReaderScrollBehavior() {
  const wrap = document.getElementById('pages-wrap');
  const header = document.getElementById('reader-header');
  if (!wrap || !header) return;
  if (readerScrollListener) wrap.removeEventListener('scroll', readerScrollListener);
  readerLastScrollY = 0;
  readerHeaderVisible = true;
  header.classList.remove('reader-header--hidden');
  readerScrollListener = () => {
    const currentY = wrap.scrollTop;

    const diff = currentY - readerLastScrollY;
    if (diff > 8 && readerHeaderVisible) {
      readerHeaderVisible = false;
      header.classList.add('reader-header--hidden');
    } else if (diff < -8 && !readerHeaderVisible) {
      readerHeaderVisible = true;
      header.classList.remove('reader-header--hidden');

    }
    readerLastScrollY = currentY;
  };
  wrap.addEventListener('scroll', readerScrollListener, { passive: true });
}

async function toggleLikeInReader(mangaName) {
  if (!currentUser) { showGlobalToast('✕ &nbsp;Войдите в аккаунт', 'error'); return; }
  const btns = document.querySelectorAll('.reader-like-btn');
  const headerLike = document.getElementById('reader-header-like');
  const allBtns = [...btns, headerLike].filter(Boolean);
  const isActive = allBtns[0]?.classList.contains('active');
  const url = isActive
    ? `/manga/like_del?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(mangaName)}`
    : `/manga/like?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(mangaName)}`;
  try {
    const r = await fetch(url, { method: 'POST' });
    const data = await r.json();
    if (r.ok) {
      allBtns.forEach(btn => {
        btn.classList.toggle('active');
        const cnt = btn.querySelector('.reader-like-count');
        if (cnt) cnt.textContent = data.likes;
      });
    }
  } catch (err) { console.error('Ошибка лайка:', err); }
}

let readerCurrentManga = null;
let readerFavActive = false;

async function toggleFavInReader() {
  if (!currentUser) { showGlobalToast('✕ &nbsp;Войдите в аккаунт', 'error'); return; }
  const url = readerFavActive
    ? `/manga/fav_del?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(readerCurrentManga)}`
    : `/manga/add?user_name=${encodeURIComponent(currentUser)}&manga_name=${encodeURIComponent(readerCurrentManga)}`;
  try {
    const r = await fetch(url, { method: 'POST' });
    if (!r.ok) return;
    readerFavActive = !readerFavActive;
    const btn = document.getElementById('reader-header-fav');
    if (btn) btn.classList.toggle('active', readerFavActive);
    showGlobalToast(readerFavActive
      ? `${heartIcon}&nbsp; Добавлено в избранное`
      : '✕ &nbsp;Удалено из избранного'
    );
  } catch(e) { console.error(e); }
}

function buildReaderLikeBtn(mangaName, likesCount) {
  const btn = document.createElement('button');
  btn.className = 'reader-like-btn';
  btn.innerHTML = `${thumbIcon}<span class="reader-like-count">${likesCount}</span>`;
  btn.addEventListener('click', e => { e.stopPropagation(); toggleLikeInReader(mangaName); });
  return btn;
}

// readerHistory хранит стек НАЗВАНИЙ манги, по которым пользователь переходил
// через "Похожая манга" / карточки внутри ридера (не системную историю браузера).
let readerHistory = [];

async function openReader(name, options = {}) {
  const { fromPopState = false } = options;

  // Если переход вызван системной кнопкой "Назад" (popstate), новую запись
  // в history НЕ добавляем — иначе стек "скачет" и кнопка назад перестаёт работать.
  if (!fromPopState) {
    history.pushState({ manga: name }, '', `/read/${encodeURIComponent(name)}`);
  }
  readerCurrentManga = name;

  const reader = document.getElementById('reader');
  const wrap   = document.getElementById('pages-wrap');

  ['reader-header-like', 'reader-header-fav'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Запоминаем предыдущую открытую мангу в readerHistory только для обычных
  // (не popstate) переходов — например, клик по "Похожая манга".
  const currentTitle = document.getElementById('reader-title').textContent;
  if (!fromPopState && reader.classList.contains('open') && currentTitle && currentTitle !== '—') {
    readerHistory.push(currentTitle);
  }

  document.getElementById('reader-title').textContent = name;
  document.getElementById('reader-count').textContent = '';
  wrap.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  reader.classList.add('open');
  document.body.style.overflow = 'hidden';
  wrap.scrollTop = 0;
  setupReaderScrollBehavior();

  try {
    const r = await fetch(`/manga/${encodeURIComponent(name)}`);
    if (!r.ok) throw new Error(r.status);
    const data  = await r.json();
    const pages = data.pages || [];
    const likesCount = data.likes ?? 0;

    document.getElementById('reader-count').innerHTML =
      `${pages.length} стр. &nbsp;·&nbsp; ${eyeIcon} ${data.views ?? 0}`;

    const closeBtn = document.querySelector('#reader .close-btn');

    if (currentUser) {
      readerFavActive = false;
      const favBtn = document.createElement('button');
      favBtn.id = 'reader-header-fav';
      favBtn.className = 'reader-header-btn';
      favBtn.innerHTML = heartIcon;
      favBtn.addEventListener('click', e => { e.stopPropagation(); toggleFavInReader(); });
      if (closeBtn) closeBtn.parentNode.insertBefore(favBtn, closeBtn);
    }

    const headerLikeBtn = document.createElement('button');
    headerLikeBtn.id = 'reader-header-like';
    headerLikeBtn.className = 'reader-header-btn';
    headerLikeBtn.innerHTML = `${thumbIcon}<span class="reader-like-count">${likesCount}</span>`;
    headerLikeBtn.addEventListener('click', e => { e.stopPropagation(); toggleLikeInReader(name); });
    if (closeBtn) closeBtn.parentNode.insertBefore(headerLikeBtn, closeBtn);

    wrap.innerHTML = '';
    pages.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'page-item';
      item.innerHTML = `
        <div class="page-num">${String(i + 1).padStart(2, '0')}</div>
        <img src="/media/${encodeURIComponent(name)}/${p}" alt="стр. ${i+1}" loading="${i < 2 ? 'eager' : 'lazy'}">`;
      wrap.appendChild(item);
    });

    const likeBottom = document.createElement('div');
    likeBottom.className = 'reader-like-wrap--bottom';

    const mangaInfoForTags = allManga.find(m => m.name === name);
    const currentMangaGenres = (mangaInfoForTags?.genre || '').split(',').map(g => g.trim()).filter(Boolean);
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'reader-bottom-tags';
    tagsDiv.innerHTML = currentMangaGenres.map(g => `<span class="tag">${g}</span>`).join('');
    likeBottom.appendChild(tagsDiv);

    likeBottom.appendChild(buildReaderLikeBtn(name, likesCount));
    wrap.appendChild(likeBottom);

    // Похожая манга
    const mangaGenres = (allManga.find(m => m.name === name)?.genre || '').split(',').map(g => g.trim());
    const similar = allManga.filter(m => m.name !== name && m.genre && mangaGenres.some(g => m.genre.split(',').map(x => x.trim()).includes(g))).slice(0, 6);
    if (similar.length) {
      const simBlock = document.createElement('div');
      simBlock.className = 'similar-block';
      simBlock.innerHTML = `<div class="similar-title">Похожая манга</div><div class="similar-grid"></div>`;
      similar.forEach(m => {
        const imgSrc = m.photo ? `/media/${encodeURIComponent(m.name)}/${m.photo}` : null;
        const div = document.createElement('div');
        div.className = 'similar-card';
        div.innerHTML = `
          ${imgSrc ? `<img src="${imgSrc}" alt="${m.name}">` : `<div class="similar-placeholder">${m.name.slice(0,2).toUpperCase()}</div>`}
          <div class="similar-name">${m.name}</div>`;
        div.onclick = () => openReader(m.name);
        simBlock.querySelector('.similar-grid').appendChild(div);
      });
      wrap.appendChild(simBlock);
    }
  } catch(e) {
    wrap.innerHTML = `<div class="empty">Ошибка: ${e.message}</div>`;
  }
}

function closeReader(options = {}) {
  const { fromPopState = false } = options;

  document.getElementById('reader').classList.remove('open');
  document.getElementById('pages-wrap').innerHTML = '';
  document.body.style.overflow = '';

  const header = document.getElementById('reader-header');
  if (header) header.classList.remove('reader-header--hidden');
  ['reader-header-like', 'reader-header-fav'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  if (readerHistory.length > 0) {
    const prev = readerHistory.pop();
    // Это закрытие именно по кнопке-крестику ("назад" внутри ридера по readerHistory),
    // поэтому здесь НЕ fromPopState — нужно запушить новую запись в history.
    openReader(prev);
  } else if (!fromPopState) {
    // Закрытие крестиком без истории похожих манг — обычный переход на главную.
    history.pushState({}, '', '/');
  }
  // Если fromPopState === true и readerHistory пуста — ничего не делаем,
  // адресная строка уже верная (popstate сам её обновил браузером).

  readerHistory = [];
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeReader(); closeFav(); } });

loadManga();

const genreBar = document.getElementById('genre-bar');
if (genreBar) {
  genreBar.addEventListener('wheel', (e) => {
    e.preventDefault();
    genreBar.scrollLeft += e.deltaY;
  });
}

(function() {
  function initAgeGate() {
    const ageGate = document.getElementById('age-gate-overlay');
    const acceptBtn = document.getElementById('age-gate-accept');
    const rejectBtn = document.getElementById('age-gate-reject');
    if (!ageGate) return;
    if (localStorage.getItem('age_verified') === 'true') {
      ageGate.style.setProperty('display', 'none', 'important');
    } else {
      document.body.style.overflow = 'hidden';
    }
    if (acceptBtn) {
      acceptBtn.onclick = function() {
        localStorage.setItem('age_verified', 'true');
        ageGate.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = '';
      };
    }
    if (rejectBtn) {
      rejectBtn.onclick = function() { window.location.href = 'https://www.google.com'; };
    }
  }
  initAgeGate();
  document.addEventListener('DOMContentLoaded', initAgeGate);
})();
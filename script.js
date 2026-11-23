/* Анкета Салазара Стормгарда — только выбор темы, без библиотек и обращений к серверу. */
(() => {
  'use strict';

  // 01. Приоритет: ?theme=light/dark, затем сохранённый выбор, затем тема окружения.
  // ?theme=auto сбрасывает ручной выбор и возвращает синхронизацию.
  const root = document.documentElement;
  const storageKey = 'stormgard-sheet-theme';
  const query = new URLSearchParams(location.search).get('theme');
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const isTheme = value => value === 'light' || value === 'dark';
  let manual = null;

  try {
    if (query === 'auto') localStorage.removeItem(storageKey);
    const stored = localStorage.getItem(storageKey);
    if (isTheme(stored)) manual = stored;
  } catch {
    // В iframe браузер может запретить хранилище. Кнопка продолжит работать.
  }
  if (isTheme(query)) manual = query;

  // 02. В iframe prefers-color-scheme может наследовать color-scheme форума,
  // даже если анкета загружена с другого домена. Иначе это настройка браузера.
  const preferredTheme = () => preference.matches ? 'dark' : 'light';
  function applyTheme(theme) {
    root.dataset.theme = theme;
    const button = document.querySelector('[data-action="theme"]');
    if (!button) return;
    const next = theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
    button.setAttribute('aria-label', next);
    button.title = next;
  }
  applyTheme(manual || preferredTheme());

  // 03. Смена темы форума/браузера учитывается, пока пользователь не выбрал свою.
  preference.addEventListener('change', () => {
    if (!manual) applyTheme(preferredTheme());
  });

  // 04. Кнопка доступна с клавиатуры; ручной выбор сохраняется по возможности.
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('[data-action="theme"]');
    if (!button) return;
    applyTheme(root.dataset.theme);
    button.addEventListener('click', () => {
      manual = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(manual);
      try { localStorage.setItem(storageKey, manual); } catch { /* iframe без хранилища */ }
    });
  }, {once: true});
})();

/* 05. Предпочтения: длинные и короткие пункты подбираются в плотные строки.
   Ширина плашек остаётся естественной. Пересчёт нужен после загрузки шрифта
   и при изменении ширины колонки; без JavaScript работает обычный перенос. */
(() => {
  'use strict';

  function packPreferences() {
    const lists = [...document.querySelectorAll('.Facts--preferences ul')].map(list => ({
      list,
      items: [...list.children],
      width: 0
    }));

    function arrange(group, force = false) {
      const width = group.list.getBoundingClientRect().width;
      if (!width || (!force && Math.abs(width - group.width) < .5)) return;
      group.width = width;
      const gap = parseFloat(getComputedStyle(group.list).columnGap) || 0;
      const remaining = group.items.map((item, index) => ({
        item, index, width: item.getBoundingClientRect().width
      })).sort((a, b) => b.width - a.width || a.index - b.index);
      const rows = [];

      // Каждый следующий пункт кладём в самую заполненную подходящую строку.
      // Так короткие слова занимают зазоры между более длинными фразами.
      for (const entry of remaining) {
        let best = null;
        for (const row of rows) {
          if (row.used + gap + entry.width <= width - .5 && (!best || row.used > best.used)) best = row;
        }
        if (best) {
          best.items.push(entry.item);
          best.used += gap + entry.width;
        } else {
          rows.push({items: [entry.item], used: entry.width});
        }
      }

      // Меняем и визуальный порядок, и порядок чтения, сохраняя все исходные li.
      const fragment = document.createDocumentFragment();
      for (const row of rows) for (const item of row.items) fragment.append(item);
      group.list.append(fragment);
    }

    for (const group of lists) arrange(group);
    if (document.fonts) document.fonts.ready.then(() => lists.forEach(group => arrange(group, true)));
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => lists.forEach(group => arrange(group)));
      for (const group of lists) observer.observe(group.list);
    } else {
      window.addEventListener('resize', () => lists.forEach(group => arrange(group)));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', packPreferences, {once: true});
  else packPreferences();
})();

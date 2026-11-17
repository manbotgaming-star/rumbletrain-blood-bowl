// ========================================
// GitHub extra-reference.js
// ========================================

import {
  getInducementRules,
  getSpecialRules,
  getStarPlayers
} from '../shared/reference-data.js?v=2';

const main = document.querySelector('main');

const text = value =>
  value == null || value === '' ? '—' : String(value);

const gp = value =>
  Number(value).toLocaleString('en-GB') + ' GP';

function node(tag, value) {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = text(value);
  return element;
}

function toggle(labelText) {
  const label = node('label');
  const input = node('input');

  input.type = 'checkbox';
  label.append(input, document.createTextNode(' ' + labelText));

  return { label, input };
}

function description(entries) {
  const dl = node('dl');

  entries.forEach(([label, value]) => {
    dl.append(node('dt', label), node('dd', value));
  });

  return dl;
}

function section(title, loader, render) {
  const section = node('section');
  const body = node('div');

  body.setAttribute('aria-live', 'polite');
  section.append(node('h2', title), body);
  main.append(section);

  async function load() {
    body.replaceChildren(node('p', 'Loading…'));

    try {
      const rows = await loader();
      body.replaceChildren();
      render(body, rows);
    } catch (error) {
      const retry = node('button', 'Retry');
      retry.addEventListener('click', load);

      body.replaceChildren(
        node('p', 'Unable to load: ' + error.message),
        retry
      );
    }
  }

  load();
}

// TEAM SPECIAL RULES
section('Team special rules', getSpecialRules, (body, rows) => {
  body.append(node('p', rows.length + ' rules'));

  body.append(description(
    rows.map(row => [row['Special Rule'], row.Description])
  ));
});

// INDUCEMENTS
section('Inducements', getInducementRules, (body, rows) => {
  const { label, input } = toggle('Include inactive inducements');
  const count = node('p');
  const scroll = node('div');

  scroll.className = 'scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('aria-label', 'Inducement table');

  const table = node('table');
  const head = node('thead');
  const heading = node('tr');
  const tbody = node('tbody');

  ['Inducement', 'Cost', 'Max quantity', 'Status', 'Notes']
    .forEach(title => heading.append(node('th', title)));

  head.append(heading);
  table.append(head, tbody);
  scroll.append(table);
  body.append(label, count, scroll);

  function render() {
    const shown = rows.filter(
      row => input.checked || row.Active === true
    );

    count.textContent = `${shown.length} of ${rows.length} entries`;

    tbody.replaceChildren(...shown.map(row => {
      const tr = node('tr');

      const cost = row.Inducement === 'Star Players'
        ? 'See individual star costs'
        : Number(row.Cost) === 0
          ? 'See notes; cost not specified'
          : gp(row.Cost);

      [
        row.Inducement,
        cost,
        row['Max Qty'],
        row.Active ? 'Active' : 'Inactive',
        row.Notes
      ].forEach(value => tr.append(node('td', value)));

      return tr;
    }));
  }

  input.addEventListener('change', render);
  render();
});

// STAR PLAYERS
section('Star players', getStarPlayers, (body, rows) => {
  body.append(node(
    'p',
    'Reference profiles only. “Active” does not confirm eligibility ' +
    'for a particular team. Paired stars share one listed profile; ' +
    'see their notes.'
  ));

  const searchLabel = node(
    'label',
    'Search by name, league, skill or notes'
  );

  const search = node('input');
  search.type = 'search';
  search.style.cssText =
    'font:inherit;padding:10px;width:100%;margin-bottom:16px';

  searchLabel.append(search);

  const { label, input } = toggle('Include inactive star players');
  const count = node('p');
  const list = node('div');

  body.append(searchLabel, label, count, list);

  function render() {
    const query = search.value.trim().toLowerCase();

    const shown = rows.filter(row =>
      (input.checked || row.Active === true) &&
      [
        row.Name,
        row['Plays For'],
        row['Skills & Traits'],
        row.Notes
      ].some(value =>
        String(value || '').toLowerCase().includes(query)
      )
    ).sort((a, b) => a.Name.localeCompare(b.Name));

    count.textContent = `${shown.length} of ${rows.length} profiles`;

    list.replaceChildren(...shown.map(row => {
      const details = node('details');

      details.style.cssText =
        'padding:14px 0;border-bottom:1px solid #dce4e7';

      const summary = node(
        'summary',
        `${row.Name} — ${gp(row.Cost)}` +
        (row.Active ? '' : ' — Inactive')
      );

      summary.style.cursor = 'pointer';

      details.append(summary, description([
        ['Star ID', row['Star ID']],
        [
          'Characteristics',
          `MA ${row.MA} · ST ${row.ST} · AG ${row.AG} · ` +
          `PA ${row.PA} · AV ${row.AV}`
        ],
        ['Skills & traits', row['Skills & Traits']],
        ['Plays for', row['Plays For']],
        ['Special rule', row['Special Rule']],
        ['Rule description', row['Special Rule Description']],
        ['Roster slots', row['Roster Slots']],
        ['Keywords', row.Keywords],
        ['Notes', row.Notes]
      ]));

      try {
        const url = new URL(row['Source URL']);

        if (url.protocol === 'https:') {
          const link = node('a', 'Profile source');

          link.href = url.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';

          const source = node('p');
          source.append(link);
          details.append(source);
        }
      } catch {
        // Source links are optional.
      }

      return details;
    }));

    if (!shown.length) {
      list.append(node('p', 'No matching profiles.'));
    }
  }

  search.addEventListener('input', render);
  input.addEventListener('change', render);
  render();
});

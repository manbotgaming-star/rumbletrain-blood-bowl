// ========================================
// GitHub advancement-reference.js
// ========================================

import {
  getSppAwards,
  getAdvancementCosts,
  getAdvancementValueIncreases,
  getCharacteristicRollOptions
} from '../shared/reference-data.js?v=3';

const main = document.querySelector('main');

const gp = value =>
  Number(value).toLocaleString('en-GB') + ' GP';

function node(tag, value) {
  const element = document.createElement(tag);

  if (value !== undefined) {
    element.textContent =
      value == null || value === '' ? '—' : String(value);
  }

  return element;
}

function addTable(title, loader, columns, note, compare) {
  const section = node('section');
  const body = node('div');
  const status = node('p');

  status.setAttribute('role', 'status');

  section.append(
    node('h2', title),
    node('p', note),
    status,
    body
  );

  main.append(section);

  async function load() {
    status.textContent = 'Loading…';
    body.replaceChildren();

    try {
      const rows = [...await loader()];

      if (compare) rows.sort(compare);

      if (!rows.length) {
        throw new Error('The reference table is empty.');
      }

      const scroll = node('div');
      scroll.className = 'scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('aria-label', title + ' table');

      const table = node('table');
      const head = node('thead');
      const header = node('tr');
      const tbody = node('tbody');

      columns.forEach(([label]) => {
        const th = node('th', label);
        th.scope = 'col';
        header.append(th);
      });

      head.append(header);

      rows.forEach(row => {
        const tr = node('tr');

        columns.forEach(([, value]) => {
          tr.append(node('td', value(row)));
        });

        tbody.append(tr);
      });

      table.append(head, tbody);
      scroll.append(table);
      body.append(scroll);

      status.textContent = rows.length + ' reference entries';
    } catch (error) {
      status.textContent = 'Unable to load: ' + error.message;

      const retry = node('button', 'Retry');
      retry.addEventListener('click', load);
      body.append(retry);
    }
  }

  load();
}

addTable(
  'SPP awards',
  getSppAwards,
  [
    ['Code', row => row.action_code],
    ['Action', row => row.action_name],
    ['Standard SPP', row => row.standard_spp],
    ['Brawlin’ Brutes SPP', row => row.brawlin_brutes_spp],
    ['Conditions', row => row.notes]
  ],
  'TTM rewards the qualifying thrower; LAND rewards the ' +
  'qualifying landing player. These are separate awards.'
);

addTable(
  'Advancement SPP costs',
  getAdvancementCosts,
  [
    ['Advancement #', row => row.advancement_number],
    ['Rank', row => row.rank],
    ['Random primary', row => row.random_primary],
    ['Choose primary', row => row.choose_primary],
    ['Choose secondary', row => row.choose_secondary],
    ['Characteristic', row => row.characteristic]
  ],
  'SPP spent for the player’s next normal advancement. ' +
  'Free Captain grants do not consume a normal advancement.',
  (a, b) => a.advancement_number - b.advancement_number
);

addTable(
  'Advancement value increases',
  getAdvancementValueIncreases,
  [
    ['Value type', row => row.value_type],
    ['Value increase', row => gp(row.value_increase)],
    ['Notes', row => row.notes]
  ],
  'These amounts increase player value. The Elite Skill Bonus ' +
  'is additional to the applicable skill value increase.'
);

addTable(
  'Characteristic roll options',
  getCharacteristicRollOptions,
  [
    ['D8 result', row => row.d8_result],
    ['Characteristic choices', row => row.characteristics.join(' or ')]
  ],
  'Options shown are the roll table. Player-specific characteristic ' +
  'limits and other eligibility checks still apply.',
  (a, b) => a.d8_result - b.d8_result
);

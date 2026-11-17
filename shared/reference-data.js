const BASE_URL = 'https://dahuwcfrwkshtkjxudij.supabase.co';
const PUBLIC_KEY = 'sb_publishable_xZaw1wxRCmMrQDo5Cojz3Q_FhUuDUFX';

const TABLES = {
  roster_rules: ['Roster'],
  base_positions: ['Position Key', 'Roster', 'Position'],
  skill_lists: ['Category', 'Skill', 'Elite?'],
  inducement_rules: ['Inducement', 'Cost', 'Max Qty', 'Active'],
  special_rules: ['Special Rule', 'Description'],
  star_players: ['Star ID', 'Name', 'Cost', 'Active']
};

const cache = new Map();
const pending = new Map();

async function readTable(table) {
  const cached = cache.get(table);

  if (cached && Date.now() - cached.time < 300000) {
    return cached.rows;
  }

  if (pending.has(table)) return pending.get(table);

  const request = (async () => {
    const rows = [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const keys = table === 'skill_lists'
        ? ['Category', 'Skill']
        : [TABLES[table][0]];

      const order = keys.map(key => `"${key}".asc`).join(',');

      for (let offset = 0; ; offset += 500) {
        const query = new URLSearchParams({
          select: '*',
          order,
          limit: '500',
          offset: String(offset)
        });

        const response = await fetch(
          `${BASE_URL}/rest/v1/${table}?${query}`,
          {
            headers: { apikey: PUBLIC_KEY },
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error(`${table}: HTTP ${response.status}`);
        }

        const page = await response.json();

        if (
          !Array.isArray(page) ||
          page.some(row =>
            !row || TABLES[table].some(key => !(key in row))
          )
        ) {
          throw new Error(`${table}: unexpected data format`);
        }

        rows.push(...page);
        if (page.length < 500) break;
      }

      const frozen = Object.freeze(
        rows.map(row => Object.freeze(row))
      );

      cache.set(table, { time: Date.now(), rows: frozen });
      return frozen;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`${table}: request timed out`);
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  })();

  pending.set(table, request);

  try {
    return await request;
  } finally {
    pending.delete(table);
  }
}

export const getRosterRules = () => readTable('roster_rules');
export const getBasePositions = () => readTable('base_positions');
export const getSkillLists = () => readTable('skill_lists');
export const getInducementRules = () => readTable('inducement_rules');
export const getSpecialRules = () => readTable('special_rules');
export const getStarPlayers = () => readTable('star_players');

export async function loadReferenceData() {
  const [rosters, positions, skills] = await Promise.all([
    getRosterRules(),
    getBasePositions(),
    getSkillLists()
  ]);

  return { rosters, positions, skills };
}

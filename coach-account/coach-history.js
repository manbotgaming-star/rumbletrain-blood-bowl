// ========================================
// GitHub: coach-account/coach-history.js
// ========================================
import { supabase } from '../shared/supabase-client.js?v=2';

const host = document.createElement('div');
host.id = 'coach-history'; host.hidden = true;
document.querySelector('main').append(host);
let revision = 0, controller;

const money = value => value == null
  ? '—' : Number(value).toLocaleString('en-GB') + ' GP';
const yesNo = value => value == null ? 'Not recorded' : value ? 'Yes' : 'No';

function node(tag, value) {
  const element = document.createElement(tag);
  if (value !== undefined) {
    element.textContent = value == null || value === '' ? '—' : String(value);
  }
  return element;
}

export function clearCoachHistory() {
  revision++; controller?.abort();
  host.replaceChildren(); host.hidden = true;
}

export function loadCoachHistory(seasonId, teamId, players) {
  clearCoachHistory();
  const current = revision;
  controller = new AbortController();
  const signal = controller.signal;
  const names = new Map(players.map(player => [player.player_id, player.name]));
  const playerName = row => names.get(row.player_id) || row.player_id || '—';
  const filter = query => query.eq('season_id', seasonId).eq('team_id', teamId);
  host.hidden = false;

  async function readAll(makeQuery) {
    const result = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await makeQuery()
        .range(offset, offset + 499).abortSignal(signal);
      if (error) throw new Error(error.message);
      if (!Array.isArray(data)) throw new Error('Unexpected history response.');
      result.push(...data);
      if (data.length < 500) return result;
    }
  }

  function panel(title, note, loader, columns) {
    const section = node('section'), status = node('p'), body = node('div');
    status.setAttribute('role', 'status');
    section.append(node('h2', title), node('p', note), status, body);
    host.append(section);
    let attempt = 0;

    async function load() {
      const request = ++attempt;
      status.textContent = 'Loading…'; body.replaceChildren();

      try {
        const rows = await loader();
        if (current !== revision || request !== attempt) return;
        status.textContent = rows.length + ' records';

        if (!rows.length) {
          body.append(node('p', 'No records for this team and season.'));
          return;
        }

        const scroll = node('div'), table = node('table'), head = node('thead');
        const heading = node('tr'), tbody = node('tbody');
        scroll.className = 'scroll'; scroll.tabIndex = 0;
        scroll.setAttribute('aria-label', title + ' table');

        columns.forEach(([label]) => {
          const th = node('th', label);
          th.scope = 'col'; heading.append(th);
        });

        rows.forEach(row => {
          const tr = node('tr');
          columns.forEach(([, value]) => tr.append(node('td', value(row))));
          tbody.append(tr);
        });

        head.append(heading); table.append(head, tbody);
        scroll.append(table); body.append(scroll);
      } catch (error) {
        if (current !== revision || request !== attempt) return;
        status.textContent = 'Unable to load: ' + error.message;
        const retry = node('button', 'Retry');
        retry.addEventListener('click', load); body.append(retry);
      }
    }

    load();
  }

  panel(
    'Fixtures and results',
    'Scores are shown from your team’s perspective.',
    () => readAll(() => supabase.rpc('get_coach_fixtures', {
      p_season_id: seasonId, p_team_id: teamId
    }).order('round').order('game_id')),
    [
      ['Round', row => row.round], ['Game', row => row.game_id],
      ['Date', row => row.game_date || 'Not scheduled'],
      ['Home/Away', row => row.side], ['Opponent', row => row.opponent_name],
      ['Status', row => row.status],
      ['Score', row => row.score_for == null || row.score_against == null
        ? '—' : `${row.score_for}–${row.score_against}`],
      ['Winnings', row => money(row.winnings)]
    ]
  );

  panel(
    'Player match statistics',
    'Your team’s submitted player records, ordered by game and player ID.',
    () => readAll(() => filter(supabase.from('player_match_stats').select(
      'game_id,player_id,completions,throw_team_mate,landings,interceptions,touchdowns,casualties,mvp,spp_adjustment,spp_earned,kills'
    )).order('game_id').order('player_id')),
    [
      ['Game', row => row.game_id], ['Player', playerName],
      ['COMP', row => row.completions], ['TTM', row => row.throw_team_mate],
      ['LAND', row => row.landings], ['INT', row => row.interceptions],
      ['TD', row => row.touchdowns], ['CAS', row => row.casualties],
      ['MVP', row => row.mvp], ['SPP adjustment', row => row.spp_adjustment],
      ['SPP earned', row => row.spp_earned], ['Kills', row => row.kills]
    ]
  );

  panel(
    'Injury history',
    'Historical injury records; the roster above shows the imported current player status.',
    () => readAll(() => filter(supabase.from('player_injuries').select(
      'injury_id,game_id,player_id,injury_result,lasting_injury,miss_next_game,mng_cleared,niggling,dead,hatred_keyword,notes'
    )).order('injury_id')),
    [
      ['Injury', row => row.injury_id], ['Game', row => row.game_id],
      ['Player', playerName], ['Result', row => row.injury_result],
      ['Lasting injury', row => row.lasting_injury],
      ['MNG recorded', row => yesNo(row.miss_next_game)],
      ['MNG cleared', row => yesNo(row.mng_cleared)],
      ['Niggling', row => row.niggling], ['Dead', row => yesNo(row.dead)],
      ['Hatred', row => row.hatred_keyword], ['Notes', row => row.notes]
    ]
  );

  panel(
    'Treasury transactions',
    'Dates were not recorded; entries are ordered by transaction ID.',
    () => readAll(() => filter(supabase.from('team_transactions').select(
      'transaction_id,game_id,type,description,player_id,amount,treasury_change,treasury_before,treasury_after,notes'
    )).order('transaction_id')),
    [
      ['Transaction', row => row.transaction_id], ['Game', row => row.game_id],
      ['Type', row => row.type], ['Description', row => row.description],
      ['Amount', row => money(row.amount)],
      ['Treasury change', row => money(row.treasury_change)],
      ['Before', row => money(row.treasury_before)],
      ['After', row => money(row.treasury_after)], ['Notes', row => row.notes]
    ]
  );
}

// ========================================
// GitHub coach-account/coach-account.js
// ========================================

import './password-recovery.js?v=2';
import { supabase } from '../shared/supabase-client.js?v=2';
import { loadCoachHistory, clearCoachHistory } from './coach-history.js?v=2';

const el = id => document.getElementById(id);
const number = value => Number(value).toLocaleString('en-GB');
let userId = null, memberships = [], revision = 0, controller;

function node(tag, value) {
  const element = document.createElement(tag);
  element.textContent = value == null || value === '' ? '—' : String(value);
  return element;
}

function clearTeam() {
  clearCoachHistory();
  el('team').hidden = true;
  el('roster').replaceChildren();
  el('team-stats').replaceChildren();
  el('team-name').textContent = '';
  el('team-meta').textContent = '';
}

function beginRequest() {
  controller?.abort();
  controller = new AbortController();
  return { id: ++revision, signal: controller.signal };
}

async function rows(query, signal) {
  const { data, error } = await query.abortSignal(signal);
  if (error) throw new Error(error.message);
  return data;
}

async function loadTeam() {
  const member = memberships[Number(el('team-choice').value)];
  if (!userId || !member) return;

  const { id, signal } = beginRequest();
  clearTeam();
  el('message').textContent = 'Loading your team…';

  try {
    const { season_id, team_id } = member;
    const filter = query => query.eq('season_id', season_id).eq('team_id', team_id);

    const [team, season, state, players, development] = await Promise.all([
      rows(supabase.from('teams').select('team_id,name')
        .eq('team_id', team_id).single(), signal),
      rows(supabase.from('seasons').select('season_id,name')
        .eq('season_id', season_id).single(), signal),
      rows(filter(supabase.from('team_seasons')
        .select('roster,coach_name,treasury,dedicated_fans,rerolls,apothecaries,assistant_coaches,cheerleaders'))
        .single(), signal),
      rows(filter(supabase.from('league_players')
        .select('player_id,player_number,name,position,base_ma,base_st,base_ag,base_pa,base_av,starting_skills,added_skills_snapshot,current_value_snapshot,status,miss_next_game,niggling_injuries'))
        .order('player_number'), signal),
      rows(filter(supabase.from('player_development')
        .select('player_id,career_spp,spp_spent,available_spp')), signal)
    ]);

    if (id !== revision || !userId) return;
    const progress = new Map(development.map(row => [row.player_id, row]));

    el('team-name').textContent = team.name;
    el('team-meta').textContent =
      `${season.name} (${season_id}) · ${state.roster} · Coach: ${state.coach_name}`;

    const stats = [
      ['Treasury', number(state.treasury) + ' GP'], ['Players', players.length],
      ['Re-rolls', state.rerolls], ['Apothecary', state.apothecaries],
      ['Assistant coaches', state.assistant_coaches],
      ['Cheerleaders', state.cheerleaders], ['Dedicated fans', state.dedicated_fans]
    ];

    el('team-stats').replaceChildren(...stats.map(([label, value]) => {
      const group = document.createElement('div');
      group.append(node('dt', label), node('dd', value));
      return group;
    }));

    el('roster').replaceChildren(...players.map(player => {
      const p = progress.get(player.player_id);
      if (!p) throw new Error('Player development data is missing.');

      const tr = document.createElement('tr');
      const status = [
        player.status, player.miss_next_game ? 'MNG' : '',
        player.niggling_injuries ? `${player.niggling_injuries} niggling` : ''
      ].filter(Boolean).join(' · ');

      const values = [
        player.player_number, player.name, player.position,
        player.base_ma, player.base_st, player.base_ag, player.base_pa, player.base_av,
        [player.starting_skills, player.added_skills_snapshot].filter(Boolean).join(', '),
        p.career_spp, p.spp_spent, p.available_spp,
        number(player.current_value_snapshot), status
      ];

      values.forEach(value => tr.append(node('td', value)));
      return tr;
    }));

    el('team').hidden = false;
    loadCoachHistory(season_id, team_id, players);
    el('message').textContent = `${players.length} players loaded. Read-only access.`;
  } catch (error) {
    if (id !== revision) return;
    clearTeam();
    el('message').textContent =
      'Unable to load your team: ' + error.message + ' Use Refresh team to retry.';
  }
}

async function applySession(session) {
  const nextId = session?.user?.id || null;
  if (nextId && nextId === userId) return;

  userId = nextId;
  const { id, signal } = beginRequest();
  memberships = [];
  clearTeam();
  el('team-choice').replaceChildren();
  el('team-picker').hidden = true;
  el('login').hidden = !!userId;
  el('account').hidden = !userId;
  el('identity').textContent = session?.user?.email || '';
  el('sign-in').disabled = false;

  if (!userId) {
    el('password').value = '';
    el('message').textContent = 'Sign in with your coach email and password.';
    return;
  }

  el('message').textContent = 'Checking your team access…';

  try {
    const links = await rows(supabase.from('coach_team_access')
      .select('season_id,team_id').order('season_id'), signal);

    if (id !== revision) return;
    memberships = links;

    if (!links.length) {
      el('message').textContent =
        'You are signed in, but no team is assigned. Contact the league commissioner.';
      return;
    }

    el('team-choice').replaceChildren(...links.map((link, index) => {
      const option = node('option', `${link.team_id} · ${link.season_id}`);
      option.value = String(index);
      return option;
    }));

    el('team-picker').hidden = false;
    await loadTeam();
  } catch (error) {
    if (id === revision) {
      el('message').textContent =
        'Unable to check team access: ' + error.message + ' Reload this page to retry.';
    }
  }
}

el('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  el('sign-in').disabled = true;
  el('message').textContent = 'Signing in…';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: el('email').value.trim(), password: el('password').value
    });
    if (error) throw error;
    el('password').value = '';
    await applySession(data.session);
  } catch (error) {
    el('message').textContent = 'Sign-in failed: ' + error.message;
  } finally {
    el('sign-in').disabled = false;
  }
});

el('sign-out').addEventListener('click', async () => {
  el('sign-out').disabled = true;
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    await applySession(null);
  } catch (error) {
    el('message').textContent = 'Sign-out failed: ' + error.message;
  } finally {
    el('sign-out').disabled = false;
  }
});

el('team-choice').addEventListener('change', loadTeam);
el('refresh').addEventListener('click', loadTeam);

// Run database queries after the authentication callback releases its lock.
supabase.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => applySession(session), 0);
});

// =========================================================
// SPECTATOR TEAM ROSTER
// =========================================================

const TEAM_ROSTER_API_URL='https://script.google.com/macros/s/AKfycbwxdWB--Gqs1SapVbDXHLB4-C1Ib5ublMzgQ38P05sOdZXN5KF6d_8nh5xZqAL957ie/exec';


// =========================================================
// START
// =========================================================

document.addEventListener('DOMContentLoaded',function(){
  const params=new URLSearchParams(window.location.search);
  const teamId=String(params.get('team')||params.get('teamId')||'').trim().toUpperCase();

  if(!teamId){
    showRosterError('No team was selected.');
    return;
  }

  loadTeamRoster(teamId);
});


// =========================================================
// LOAD PUBLIC TEAM DATA
// =========================================================

function loadTeamRoster(teamId){
  const app=document.querySelector('.roster-page');
  if(!app) return;

  app.innerHTML='<div class="status-message">Loading team roster...</div>';

  const callbackName='rumbleTeamRoster_'+Date.now();
  const script=document.createElement('script');

  window[callbackName]=function(data){
    delete window[callbackName];
    script.remove();

    if(!data||data.ok===false){
      showRosterError(data&&data.error?data.error:'Unable to load this team roster.');
      return;
    }

    renderTeamRoster(data);
  };

  script.onerror=function(){
    delete window[callbackName];
    script.remove();
    showRosterError('Unable to connect to the league roster feed.');
  };

  script.src=TEAM_ROSTER_API_URL+'?view=teamroster&teamId='+encodeURIComponent(teamId)+'&callback='+encodeURIComponent(callbackName);
  document.body.appendChild(script);
}


// =========================================================
// RENDER TEAM
// =========================================================

function renderTeamRoster(data){
  const app=document.querySelector('.roster-page');
  if(!app) return;

  const team=data.team||{};
  const players=Array.isArray(data.players)?data.players:[];
  const activePlayers=players.filter(function(player){
    const status=String(player.status||'Active').trim().toLowerCase();
    return status!=='dead'&&status!=='retired';
  }).length;

  app.innerHTML=`
    <header class="team-header">
      <div class="team-header-logo">
        ${team.logoUrl?`<img src="${escapeAttr(team.logoUrl)}" alt="${escapeAttr(team.teamName||'Team')} logo">`:''}
      </div>

      <div class="team-header-details">
        <h1>${escapeHtml(team.teamName||team.teamId||'Team')}</h1>
        <div class="team-race">${escapeHtml(team.race||'')}</div>
        <div class="team-coach">Coach: ${escapeHtml(team.coach||'-')}</div>
      </div>

      <div class="team-header-meta">
        <div><strong>${escapeHtml(team.teamId||'')}</strong> Team ID</div>
        <div><strong>${escapeHtml(team.seasonId||'')}</strong> Season</div>
      </div>
    </header>

    <section class="roster-section">
      <h2>Team Management</h2>

      <div class="management-grid">
        ${managementBox('Treasury',formatMoney(team.treasury))}
        ${managementBox('Players',activePlayers)}
        ${managementBox('Re-Rolls',team.rerolls)}
        ${managementBox('Apothecary',team.apothecary)}
        ${managementBox('Assistant Coaches',team.assistantCoaches)}
        ${managementBox('Cheerleaders',team.cheerleaders)}
        ${managementBox('Dedicated Fans',team.dedicatedFans)}
      </div>
    </section>

    <section class="roster-section">
      <h2>Team Roster</h2>

      <div class="roster-table-wrap">
        <table class="roster-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Position</th>
              <th>MA</th>
              <th>ST</th>
              <th>AG</th>
              <th>PA</th>
              <th>AV</th>
              <th>Skills</th>
              <th>SPP</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderPlayers(players)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}


// =========================================================
// RENDER PLAYERS
// =========================================================

function renderPlayers(players){
  if(!players.length){
    return '<tr><td colspan="12" style="text-align:center;padding:22px;">No players found.</td></tr>';
  }

  return players.map(function(player){
    const status=String(player.status||'Active').trim();
    const statusClass=getStatusClass(status);
    const skills=player.skills||[player.startingSkills,player.addedSkills].filter(Boolean).join(', ');

    return `
      <tr>
        <td>${escapeHtml(player.number||'')}</td>
        <td>${escapeHtml(player.playerName||'')}</td>
        <td>${escapeHtml(player.position||'')}</td>
        <td>${escapeHtml(player.ma||'')}</td>
        <td>${escapeHtml(player.st||'')}</td>
        <td>${escapeHtml(player.ag||'')}</td>
        <td>${escapeHtml(player.pa||'-')}</td>
        <td>${escapeHtml(player.av||'')}</td>
        <td>${escapeHtml(skills||'')}</td>
        <td>${escapeHtml(player.spp||0)}</td>
        <td>${formatMoney(player.value)}</td>
        <td class="${statusClass}">${escapeHtml(status)}</td>
      </tr>
    `;
  }).join('');
}


// =========================================================
// DISPLAY HELPERS
// =========================================================

function managementBox(label,value){
  return `<div class="management-stat"><span>${escapeHtml(label)}</span><strong>${value===undefined||value===null||value===''?0:value}</strong></div>`;
}

function getStatusClass(status){
  const value=String(status||'').trim().toLowerCase();
  if(value==='dead') return 'status-dead';
  if(value==='retired') return 'status-retired';
  if(value==='mng'||value==='miss next game') return 'status-mng';
  return 'status-active';
}

function formatMoney(value){
  const number=Number(value)||0;
  return number.toLocaleString('en-GB');
}

function showRosterError(message){
  const app=document.querySelector('.roster-page');
  if(app) app.innerHTML='<div class="status-message error-message">'+escapeHtml(message)+'</div>';
}


// =========================================================
// SAFETY HELPERS
// =========================================================

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,function(char){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
  });
}

function escapeAttr(value){
  return escapeHtml(value);
}

// =====================================================
// RUMBLE TRAIN - COACH PORTAL
// =====================================================

let coachSessionToken = '';


// -----------------------------------------------------
// LOGIN
// -----------------------------------------------------
function portalLogin() {

  const input =
    document.getElementById('access-code');

  const message =
    document.getElementById('login-message');

  const code =
    String(input.value || '').trim();

  message.textContent = '';
  message.className = 'portal-message';


  if (!code) {

    message.textContent =
      'Enter your Coach Access Code.';

    message.classList.add(
      'portal-error'
    );

    return;
  }


  message.textContent =
    'Signing in...';


  google.script.run

    .withSuccessHandler(
      handleLoginResult
    )

    .withFailureHandler(
      handlePortalError
    )

    .coachPortalLogin(
      code
    );

}


// -----------------------------------------------------
// LOGIN RESULT
// -----------------------------------------------------
function handleLoginResult(result) {

  const message =
    document.getElementById('login-message');


  if (
    !result ||
    !result.ok
  ) {

    message.textContent =
      result && result.message
        ? result.message
        : 'Unable to sign in.';

    message.className =
      'portal-message portal-error';

    return;
  }


  coachSessionToken =
    result.sessionToken;


  document
    .getElementById('login-view')
    .classList
    .add('hidden');


  document
    .getElementById('portal-view')
    .classList
    .remove('hidden');


  document
    .getElementById('portal-team-name')
    .textContent =
      result.team || 'TEAM';


  document
    .getElementById('portal-coach-name')
    .textContent =
      'Coach: ' +
      (result.coach || '');


  loadCoachDashboard();

}


// -----------------------------------------------------
// LOAD DASHBOARD
// -----------------------------------------------------
function loadCoachDashboard() {

  google.script.run

    .withSuccessHandler(
      renderCoachDashboard
    )

    .withFailureHandler(
      handlePortalError
    )

    .getCoachPortalDashboard(
      coachSessionToken
    );

}


// -----------------------------------------------------
// RENDER DASHBOARD
// -----------------------------------------------------
function renderCoachDashboard(data) {

  const container =
    document.getElementById(
      'current-games'
    );


  container.innerHTML = '';


  if (
    !data ||
    !data.ok
  ) {

    container.innerHTML =
      '<div class="portal-error">' +
      'Unable to load dashboard.' +
      '</div>';

    return;
  }


  const games =
    data.games || [];


  if (!games.length) {

    container.innerHTML =
      '<p>No current games.</p>';

    return;
  }


  games.forEach(game => {

    const card =
      document.createElement('div');

    card.className =
      'game-card';


    card.innerHTML = `
      <div class="game-title">
        ${escapePortalHtml(game.homeTeam)}
        vs
        ${escapePortalHtml(game.awayTeam)}
      </div>

      <div class="game-status">
        ${escapePortalHtml(game.gameId)}
        &nbsp; | &nbsp;
        Round ${escapePortalHtml(game.round)}
        &nbsp; | &nbsp;
        ${escapePortalHtml(game.status)}
      </div>
    `;


    container.appendChild(card);

  });

}


// -----------------------------------------------------
// ERROR
// -----------------------------------------------------
function handlePortalError(error) {

  const message =
    error && error.message
      ? error.message
      : String(error || 'Unknown error');


  alert(
    'Coach Portal Error:\n\n' +
    message
  );

}


// -----------------------------------------------------
// BASIC HTML ESCAPING
// -----------------------------------------------------
function escapePortalHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}

// =====================================================
// RUMBLE TRAIN - COACH PORTAL
// GitHub Front End
// =====================================================


// =====================================================
// CONFIG
// =====================================================
//
// IMPORTANT:
// Paste the permanent Apps Script Web App URL below.
//
// It must end in:
//
// /exec
//
// Example:
// https://script.google.com/macros/s/XXXXXXXXXXXX/exec
// =====================================================

const COACH_API_URL =
  'https://script.google.com/macros/s/AKfycbwxdWB--Gqs1SapVbDXHLB4-C1Ib5ublMzgQ38P05sOdZXN5KF6d_8nh5xZqAL957ie/exec';


// Used only for the current browser tab.
// Closing the tab clears the saved login.
const SESSION_KEY =
  'rumbleTrainCoachAccessCode';


// =====================================================
// STARTUP
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  initCoachPortal
);


function initCoachPortal() {

  const loginForm =
    document.getElementById(
      'coach-login-form'
    );

  const logoutButton =
    document.getElementById(
      'coach-logout'
    );


  if (loginForm) {

    loginForm.addEventListener(
      'submit',
      function(event) {

        event.preventDefault();

        const input =
          document.getElementById(
            'coach-access-code'
          );

        const accessCode =
          String(
            input.value || ''
          ).trim();


        loginCoach(
          accessCode
        );
      }
    );
  }


  if (logoutButton) {

    logoutButton.addEventListener(
      'click',
      logoutCoach
    );
  }


  // ---------------------------------------------------
  // Restore login for this browser tab
  // ---------------------------------------------------

  const savedCode =
    sessionStorage.getItem(
      SESSION_KEY
    );


  if (savedCode) {

    const input =
      document.getElementById(
        'coach-access-code'
      );

    if (input) {
      input.value = savedCode;
    }

    loginCoach(
      savedCode,
      true
    );
  }
}


// =====================================================
// LOGIN
// =====================================================

function loginCoach(
  accessCode,
  restoringSession = false
) {

  clearLoginMessage();


  if (!accessCode) {

    showLoginMessage(
      'Enter your Coach Access Code.',
      true
    );

    return;
  }


  if (
    !COACH_API_URL ||
    COACH_API_URL.includes(
      'PASTE_YOUR'
    )
  ) {

    showLoginMessage(
      'Coach Portal API URL has not been configured.',
      true
    );

    return;
  }


  showLoading();


  coachApiRequest(
    accessCode
  )

    .then(function(data) {

      if (
        !data ||
        data.ok !== true
      ) {

        throw new Error(
          data && data.error
            ? data.error
            : 'Unable to sign in.'
        );
      }


      sessionStorage.setItem(
        SESSION_KEY,
        accessCode
      );


      renderCoachPortal(
        data
      );


      showDashboard();

    })

    .catch(function(error) {

      sessionStorage.removeItem(
        SESSION_KEY
      );


      showLogin();


      if (!restoringSession) {

        showLoginMessage(
          error.message ||
          'Unable to sign in.',
          true
        );
      }

    });
}


// =====================================================
// APPS SCRIPT API REQUEST
//
// JSONP is used because the Coach Portal lives on
// GitHub while Apps Script is on another domain.
// =====================================================

function coachApiRequest(accessCode) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        'rumbleCoachCallback_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
        );


      const script =
        document.createElement(
          'script'
        );


      let finished = false;


      const cleanup =
        function() {

          if (script.parentNode) {
            script.parentNode.removeChild(
              script
            );
          }


          try {
            delete window[
              callbackName
            ];
          }
          catch (error) {

            window[
              callbackName
            ] = undefined;
          }
        };


      const timeout =
        setTimeout(
          function() {

            if (finished) {
              return;
            }

            finished = true;

            cleanup();

            reject(
              new Error(
                'The Coach Portal request timed out.'
              )
            );

          },
          15000
        );


      window[
        callbackName
      ] =
        function(data) {

          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(
            timeout
          );

          cleanup();

          resolve(
            data
          );
        };


      script.onerror =
        function() {

          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(
            timeout
          );

          cleanup();

          reject(
            new Error(
              'Unable to connect to the Coach Portal service.'
            )
          );
        };


      const separator =
        COACH_API_URL.includes('?')
          ? '&'
          : '?';


      script.src =
        COACH_API_URL +
        separator +
        'view=coach' +
        '&code=' +
        encodeURIComponent(
          accessCode
        ) +
        '&callback=' +
        encodeURIComponent(
          callbackName
        );


      document.head.appendChild(
        script
      );

    }
  );
}


// =====================================================
// RENDER PORTAL
// =====================================================

function renderCoachPortal(data) {

  const coach =
    data.coach || {};

  const team =
    data.team || {};

  const players =
    Array.isArray(
      data.players
    )
      ? data.players
      : [];

  const advancementPlayers =
  data.advancements &&
  Array.isArray(
    data.advancements.players
  )
    ? data.advancements.players
    : [];
  
  const games =
    Array.isArray(
      data.games
    )
      ? data.games
      : [];


  // ---------------------------------------------------
  // TEAM HEADER
  // ---------------------------------------------------

  setText(
    'coach-team-name',
    team.teamName ||
    coach.teamName ||
    'Team'
  );


  setText(
    'coach-team-race',
    team.race || ''
  );


  setText(
    'coach-name',
    coach.name ||
    team.coach ||
    ''
  );


  setText(
    'coach-team-id',
    team.teamId ||
    coach.teamId ||
    '-'
  );


  setText(
    'coach-season',
    coach.seasonId ||
    team.seasonId ||
    '-'
  );


  setText(
    'coach-dedicated-fans',
    displayValue(
      team.dedicatedFans
    )
  );


  setText(
    'coach-treasury',
    formatGold(
      team.treasury
    )
  );


  setText(
    'coach-rerolls',
    displayValue(
      team.rerolls
    )
  );


  setText(
    'coach-apothecary',
    displayValue(
      team.apothecary
    )
  );


  // ---------------------------------------------------
  // TEAM LOGO
  // ---------------------------------------------------

  const logo =
    document.getElementById(
      'coach-team-logo'
    );


  if (logo) {

    if (team.logoUrl) {

      logo.src =
        team.logoUrl;

      logo.hidden =
        false;

    }
    else {

      logo.removeAttribute(
        'src'
      );

      logo.hidden =
        true;
    }
  }


  renderCoachGames(
    games,
    team,
    coach
  );

  renderCoachAdvancements(
  advancementPlayers
);

  renderCoachRoster(
    players
  );
}

// =====================================================
// PLAYER ADVANCEMENTS
// =====================================================

function renderCoachAdvancements(players) {

  const container =
    document.getElementById(
      'coach-advancements'
    );


  if (!container) {
    return;
  }


  container.innerHTML = '';


  // ---------------------------------------------------
  // NO ELIGIBLE PLAYERS
  // ---------------------------------------------------

  if (!players.length) {

    const empty =
      document.createElement(
        'div'
      );


    empty.className =
      'coach-advancement-empty';


    empty.innerHTML = `
      <strong>No players can currently advance.</strong>

      <span>
        Players will appear here automatically when they
        have enough available SPP to purchase their next
        legal advancement.
      </span>
    `;


    container.appendChild(
      empty
    );

    return;
  }


  // ---------------------------------------------------
  // ELIGIBLE PLAYERS
  // ---------------------------------------------------

  players.forEach(
    function(player) {

      const card =
        document.createElement(
          'div'
        );


      card.className =
        'coach-advancement-card';


      const header =
        document.createElement(
          'div'
        );


      header.className =
        'coach-advancement-player';


      header.innerHTML = `
        <div class="coach-advancement-number">
          #${escapePortalHtml(player.number)}
        </div>

        <div>
          <strong>
            ${escapePortalHtml(player.playerName)}
          </strong>

          <span>
            ${escapePortalHtml(player.position)}
          </span>
        </div>
      `;


      const stats =
        document.createElement(
          'div'
        );


      stats.className =
        'coach-advancement-stats';


      stats.innerHTML = `
        <div>
          <span>Available SPP</span>
          <strong>
            ${escapePortalHtml(player.availableSpp)}
          </strong>
        </div>

        <div>
          <span>Career SPP</span>
          <strong>
            ${escapePortalHtml(player.careerSpp)}
          </strong>
        </div>

        <div>
          <span>Next Advancement</span>
          <strong>
            #${escapePortalHtml(player.nextAdvancement)}
          </strong>
        </div>

        <div>
          <span>Primary</span>
          <strong>
            ${escapePortalHtml(player.primary)}
          </strong>
        </div>

        <div>
          <span>Secondary</span>
          <strong>
            ${escapePortalHtml(player.secondary)}
          </strong>
        </div>
      `;


      const options =
        document.createElement(
          'div'
        );


      options.className =
        'coach-advancement-options';


      const title =
        document.createElement(
          'div'
        );


      title.className =
        'coach-advancement-options-title';


      title.textContent =
        'Affordable Options';


      options.appendChild(
        title
      );


      (
        player.options || []
      ).forEach(
        function(option) {

          const item =
            document.createElement(
              'button'
            );
          
          
          item.type = 'button';
          
          item.className =
            'coach-advancement-option';
          
          
          item.innerHTML = `
            <span>
              ${escapePortalHtml(option.type)}
            </span>
          
            <strong>
              ${escapePortalHtml(option.cost)} SPP
            </strong>
          `;
          
          
          item.addEventListener(
            'click',
            function() {
          
              showCoachAdvancementSelection(
                card,
                player,
                option
              );
            }
          );
          
          
          options.appendChild(
            item
          );

        }
      );


      card.appendChild(
        header
      );

      card.appendChild(
        stats
      );

      card.appendChild(
        options
      );


      container.appendChild(
        card
      );

    }
  );
}

// =====================================================
// ADVANCEMENT SELECTION PREVIEW
// =====================================================

function showCoachAdvancementSelection(
  card,
  player,
  option
) {

  // Remove an existing selector from this card
  const existing =
    card.querySelector(
      '.coach-advancement-selection'
    );


  if (existing) {
    existing.remove();
  }


  // Clear selected state from the option buttons
  card
    .querySelectorAll(
      '.coach-advancement-option'
    )
    .forEach(
      function(button) {

        button.classList.remove(
          'selected'
        );
      }
    );


  // Highlight the clicked option
  const buttons =
    card.querySelectorAll(
      '.coach-advancement-option'
    );


  buttons.forEach(
    function(button) {

      const label =
        button
          .querySelector('span');


      if (
        label &&
        label.textContent.trim() ===
        String(option.type).trim()
      ) {

        button.classList.add(
          'selected'
        );
      }
    }
  );


  const selection =
    document.createElement(
      'div'
    );


  selection.className =
    'coach-advancement-selection';


  selection.innerHTML = `
    <div class="coach-advancement-selection-title">
      Advancement Selection
    </div>

    <div class="coach-advancement-selection-grid">

      <div>
        <span>Player</span>
        <strong>
          #${escapePortalHtml(player.number)}
          ${escapePortalHtml(player.playerName)}
        </strong>
      </div>

      <div>
        <span>Type</span>
        <strong>
          ${escapePortalHtml(option.type)}
        </strong>
      </div>

      <div>
        <span>Cost</span>
        <strong>
          ${escapePortalHtml(option.cost)} SPP
        </strong>
      </div>

      <div>
        <span>SPP After</span>
        <strong>
          ${escapePortalHtml(
            Number(player.availableSpp) -
            Number(option.cost)
          )}
        </strong>
      </div>

    </div>

    <div class="coach-advancement-selection-note">
      Selection preview only. Nothing has been submitted
      to the league yet.
    </div>
  `;


  card.appendChild(
    selection
  );
}

// =====================================================
// FIXTURES
// =====================================================

function renderCoachGames(
  games,
  team,
  coach
) {

  const container =
    document.getElementById(
      'coach-games'
    );


  if (!container) {
    return;
  }


  container.innerHTML = '';


  if (!games.length) {

    container.textContent =
      'No fixtures available.';

    return;
  }


  games.forEach(
    function(game) {

      const card =
        document.createElement(
          'div'
        );


      card.className =
        'coach-game-card';


      const round =
        document.createElement(
          'div'
        );


      round.className =
        'coach-game-round';


      round.textContent =
        game.round
          ? 'Round ' + game.round
          : game.gameId || 'Fixture';


      const matchup =
        document.createElement(
          'strong'
        );


      const home =
        game.homeTeamName ||
        displayTeamForGame(
          game.homeTeamId,
          team,
          coach
        );
      
      
      const away =
        game.awayTeamName ||
        displayTeamForGame(
          game.awayTeamId,
          team,
          coach
        );


      matchup.textContent =
        home +
        ' vs ' +
        away;


      const details =
        document.createElement(
          'div'
        );


      details.className =
        'coach-game-details';


      const detailParts =
        [];


      if (game.gameId) {

        detailParts.push(
          game.gameId
        );
      }


      if (game.date) {

        detailParts.push(
          game.date
        );
      }


      if (game.status) {

        detailParts.push(
          game.status
        );
      }


      if (
        game.homeScore !== '' &&
        game.homeScore !== null &&
        game.homeScore !== undefined &&
        game.awayScore !== '' &&
        game.awayScore !== null &&
        game.awayScore !== undefined
      ) {

        detailParts.push(
          'Score ' +
          game.homeScore +
          '-' +
          game.awayScore
        );
      }


      details.textContent =
        detailParts.join(
          ' | '
        );


      card.appendChild(
        round
      );

      card.appendChild(
        matchup
      );

      card.appendChild(
        details
      );


      container.appendChild(
        card
      );
    }
  );
}


function displayTeamForGame(
  teamId,
  team,
  coach
) {

  const id =
    String(
      teamId || ''
    ).trim();


  const ownId =
    String(
      team.teamId ||
      coach.teamId ||
      ''
    ).trim();


  if (
    id &&
    id === ownId
  ) {

    return (
      team.teamName ||
      coach.teamName ||
      id
    );
  }


  return id || '-';
}


// =====================================================
// ROSTER
// =====================================================

function renderCoachRoster(players) {

  const body =
    document.getElementById(
      'coach-roster-body'
    );


  if (!body) {
    return;
  }


  body.innerHTML = '';


  if (!players.length) {

    const row =
      document.createElement(
        'tr'
      );


    const cell =
      document.createElement(
        'td'
      );


    cell.colSpan = 12;

    cell.textContent =
      'No players found.';


    row.appendChild(
      cell
    );

    body.appendChild(
      row
    );

    return;
  }


  players.forEach(
    function(player) {

      const row =
        document.createElement(
          'tr'
        );


      if (
        String(
          player.status || ''
        ).toLowerCase() ===
        'dead'
      ) {

        row.classList.add(
          'coach-player-dead'
        );
      }


      appendCell(
        row,
        player.number
      );

      appendCell(
        row,
        player.playerName
      );

      appendCell(
        row,
        player.position
      );

      appendCell(
        row,
        player.ma
      );

      appendCell(
        row,
        player.st
      );

      appendCell(
        row,
        player.ag
      );

      appendCell(
        row,
        player.pa
      );

      appendCell(
        row,
        player.av
      );

      appendCell(
        row,
        player.skills
      );

      appendCell(
        row,
        player.spp
      );

      appendCell(
        row,
        formatGold(
          player.value
        )
      );


      let status =
        player.status || '';


      if (
        String(
          player.mng || ''
        ).toLowerCase() ===
        'yes'
      ) {

        status +=
          status
            ? ' / MNG'
            : 'MNG';
      }


      if (
        Number(
          player.niggling || 0
        ) > 0
      ) {

        status +=
          ' / Niggling ' +
          Number(
            player.niggling
          );
      }


      appendCell(
        row,
        status
      );


      body.appendChild(
        row
      );

    }
  );
}


// =====================================================
// LOG OUT
// =====================================================

function logoutCoach() {

  sessionStorage.removeItem(
    SESSION_KEY
  );


  const input =
    document.getElementById(
      'coach-access-code'
    );


  if (input) {
    input.value = '';
  }


  clearLoginMessage();

  showLogin();
}


// =====================================================
// VIEW HELPERS
// =====================================================

function showLoading() {

  setHidden(
    'coach-login',
    true
  );

  setHidden(
    'coach-dashboard',
    true
  );

  setHidden(
    'coach-loading',
    false
  );
}


function showDashboard() {

  setHidden(
    'coach-login',
    true
  );

  setHidden(
    'coach-loading',
    true
  );

  setHidden(
    'coach-dashboard',
    false
  );
}


function showLogin() {

  setHidden(
    'coach-loading',
    true
  );

  setHidden(
    'coach-dashboard',
    true
  );

  setHidden(
    'coach-login',
    false
  );
}


// =====================================================
// MESSAGE HELPERS
// =====================================================

function showLoginMessage(
  message,
  isError
) {

  const element =
    document.getElementById(
      'coach-login-message'
    );


  if (!element) {
    return;
  }


  element.textContent =
    message || '';


  element.className =
    isError
      ? 'coach-message coach-message-error'
      : 'coach-message';
}


function clearLoginMessage() {

  showLoginMessage(
    '',
    false
  );
}


// =====================================================
// GENERAL HELPERS
// =====================================================

function setHidden(
  id,
  hidden
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.hidden =
      hidden;
  }
}


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value === null ||
      value === undefined ||
      value === ''
        ? '-'
        : String(value);
  }
}


function appendCell(
  row,
  value
) {

  const cell =
    document.createElement(
      'td'
    );


  cell.textContent =
    displayValue(
      value
    );


  row.appendChild(
    cell
  );
}


function displayValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return '-';
  }


  return String(
    value
  );
}


function formatGold(value) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return '-';
  }


  const number =
    Number(value);


  if (Number.isNaN(number)) {

    return String(
      value
    );
  }


  return number
    .toLocaleString(
      'en-GB'
    ) +
    ' gp';
}

// =====================================================
// HTML ESCAPING
// =====================================================

function escapePortalHtml(value) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

// =====================================================
// RUMBLE TRAIN - COACH PORTAL
// GitHub Front End  coach-portal.js
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
// ACCESS CODE URL CLEANUP
// =====================================================

function clearAccessCodeFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('accessCode')) return;
  url.searchParams.delete('accessCode');
  history.replaceState(null,'',url.pathname + url.search + url.hash);
}


// =====================================================
// STARTUP
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  initCoachPortal
);


function initCoachPortal() {

  clearAccessCodeFromUrl();
  
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
          45000
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
// COACH ADVANCEMENT CHOICES REQUEST
//
// Loads legal choices only after the coach clicks an
// advancement option.
// =====================================================

function coachApiAdvancementChoicesRequest(
  accessCode,
  playerId,
  type
) {

  return new Promise(function(resolve, reject) {

    const callbackName =
      'rumbleCoachChoicesCallback_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement('script');

    let finished = false;

    const cleanup = function() {

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      }
      catch (error) {
        window[callbackName] = undefined;
      }
    };

    const timeout =
      setTimeout(function() {

        if (finished) return;

        finished = true;
        cleanup();

        reject(
          new Error(
            'Advancement choices request timed out.'
          )
        );

      }, 45000);

    window[callbackName] =
      function(data) {

        if (finished) return;

        finished = true;

        clearTimeout(timeout);
        cleanup();

        resolve(data);
      };

    script.onerror =
      function() {

        if (finished) return;

        finished = true;

        clearTimeout(timeout);
        cleanup();

        reject(
          new Error(
            'Unable to load advancement choices.'
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
      'view=coachchoices' +
      '&code=' +
      encodeURIComponent(accessCode) +
      '&playerId=' +
      encodeURIComponent(playerId) +
      '&type=' +
      encodeURIComponent(type) +
      '&callback=' +
      encodeURIComponent(callbackName);

    document.head.appendChild(script);
  });
}

// =====================================================
// COACH ADVANCEMENT VALIDATION REQUEST
//
// READ ONLY.
// Uses JSONP because GitHub and Apps Script are
// on different domains.
// =====================================================

function coachApiValidateAdvancementRequest(
  accessCode,
  playerId,
  type,
  category,
  improvement
) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        'rumbleCoachValidateCallback_' +
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
                'Advancement validation timed out.'
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
              'Unable to validate the advancement.'
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

        'view=coachvalidate' +

        '&code=' +
        encodeURIComponent(
          accessCode
        ) +

        '&playerId=' +
        encodeURIComponent(
          playerId
        ) +

        '&type=' +
        encodeURIComponent(
          type
        ) +

        '&category=' +
        encodeURIComponent(
          category
        ) +

        '&improvement=' +
        encodeURIComponent(
          improvement
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
// COACH ADVANCEMENT SUBMISSION REQUEST
//
// WRITES to PlayerAdvancements after server validation.
// Uses JSONP because GitHub and Apps Script are
// on different domains.
// =====================================================

function coachApiSubmitAdvancementRequest(
  accessCode,
  playerId,
  type,
  category,
  improvement,
  expectedAdvancement,
  randomDice,
  witnessCoach
) {

  return new Promise(function(resolve, reject) {

    const callbackName =
      'rumbleCoachSubmitCallback_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script = document.createElement('script');
    let finished = false;

    const cleanup = function() {
      if (script.parentNode) script.parentNode.removeChild(script);

      try {
        delete window[callbackName];
      }
      catch (error) {
        window[callbackName] = undefined;
      }
    };

    const timeout = setTimeout(function() {
      if (finished) return;

      finished = true;
      cleanup();

      reject(new Error('Advancement submission timed out.'));
    }, 45000);

    window[callbackName] = function(data) {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      cleanup();

      reject(new Error('Unable to submit the advancement.'));
    };

    const separator = COACH_API_URL.includes('?') ? '&' : '?';

    script.src =
      COACH_API_URL +
      separator +
      'view=coachsubmit' +
      '&code=' + encodeURIComponent(accessCode) +
      '&playerId=' + encodeURIComponent(playerId) +
      '&type=' + encodeURIComponent(type) +
      '&category=' + encodeURIComponent(category) +
      '&improvement=' + encodeURIComponent(improvement) +
      '&expectedAdvancement=' + encodeURIComponent(expectedAdvancement) +
      '&randomDice=' + encodeURIComponent(JSON.stringify(randomDice || [])) +
      '&witnessCoach=' + encodeURIComponent(witnessCoach || '') +
      '&callback=' + encodeURIComponent(callbackName);

    document.head.appendChild(script);
  });
}

// =====================================================
// API - TEAM MANAGEMENT PURCHASE
//
// WRITES to TeamTransactions after server validation.
// Uses JSONP because GitHub and Apps Script are
// on different domains.
// =====================================================

function coachApiSubmitTeamManagementPurchaseRequest(
  accessCode,
  purchaseKey
) {

  return new Promise(function(resolve, reject) {

    const callbackName =
      'rumbleCoachManagementPurchaseCallback_' +
      Date.now() +
      '_' +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement('script');

    let finished = false;

    const cleanup = function() {

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      }
      catch (error) {
        window[callbackName] = undefined;
      }
    };

    const timeout =
      setTimeout(function() {

        if (finished) return;

        finished = true;
        cleanup();

        reject(
          new Error(
            'Team Management purchase request timed out.'
          )
        );

      }, 45000);

    window[callbackName] =
      function(data) {

        if (finished) return;

        finished = true;

        clearTimeout(timeout);
        cleanup();

        resolve(data);
      };

    script.onerror =
      function() {

        if (finished) return;

        finished = true;

        clearTimeout(timeout);
        cleanup();

        reject(
          new Error(
            'Unable to submit the Team Management purchase.'
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
      'view=coachbuymanagement' +
      '&code=' +
      encodeURIComponent(accessCode) +
      '&purchase=' +
      encodeURIComponent(purchaseKey) +
      '&callback=' +
      encodeURIComponent(callbackName);

    document.head.appendChild(
      script
    );
  });
}


// Legacy wrapper retained for older code paths.
function coachApiSubmitRerollPurchaseRequest(accessCode) {

  return coachApiSubmitTeamManagementPurchaseRequest(
    accessCode,
    'reroll'
  );
}

// =====================================================
// COACH BUY PLAYER REQUESTS
// =====================================================

function coachApiPlayerRequest(view,params,errorMessage,timeoutMs=45000) {
  return new Promise(function(resolve,reject) {
    const callbackName = 'rumbleCoachPlayerCallback_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const script = document.createElement('script');
    let finished = false;

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[callbackName]; }
      catch (error) { window[callbackName] = undefined; }
    }

    const timeout = setTimeout(function() {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error(errorMessage || 'Coach Player request timed out.'));
    },timeoutMs);

    window[callbackName] = function(data) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      reject(new Error(errorMessage || 'Unable to complete the Coach Player request.'));
    };

    const query = Object.keys(params || {}).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key] ?? '');
    }).join('&');

    script.src = COACH_API_URL + '?view=' + encodeURIComponent(view) + (query ? '&' + query : '') + '&callback=' + encodeURIComponent(callbackName);
    document.head.appendChild(script);
  });
}

let coachGameSubmissionCache=null;
const COACH_GAME_CACHE_MS=5*60*1000;

// =====================================================
// COACH GAME SUBMISSION OPTIONS
// =====================================================
function coachApiGetGameSubmissionOptionsRequest(accessCode){
  return coachApiPlayerRequest(
    'coachgamesubmissionoptions',
    {code:accessCode},
    'Unable to load post-game submission options.'
  );
}

// =====================================================
// GAME SUBMISSION
// Allow extra time for stats, injuries and inducements.
// =====================================================
function coachApiSubmitGameSubmissionRequest(accessCode,payload){
  return coachApiPlayerRequest('coachgamesubmit',{
    code:accessCode,
    payload:JSON.stringify(payload)
  },'Unable to submit the game.',120000);
}

function coachApiGetPlayerPurchaseOptionsRequest(accessCode) {
  return coachApiPlayerRequest('coachplayeroptions',{code:accessCode},'Unable to load Buy Player options.');
}

function coachApiGeneratePlayerNameRequest(accessCode,position) {
  return coachApiPlayerRequest('coachplayername',{code:accessCode,position:position},'Unable to generate a player name.');
}

function coachApiSubmitPlayerPurchaseRequest(accessCode,position,playerNumber,playerName) {
  return coachApiPlayerRequest('coachbuyplayer',{
    code:accessCode,
    position:position,
    number:playerNumber,
    name:playerName
  },'Unable to submit the player purchase.');
}

// =====================================================
// RAISE THE DEAD REQUESTS
// =====================================================

function coachApiGetRaiseDeadOptionsRequest(accessCode){
  return coachApiPlayerRequest('coachraisedeadoptions',{code:accessCode},'Unable to load Raise the Dead options.');
}

function coachApiSubmitRaiseDeadRequest(accessCode,gameId,position,playerNumber,playerName){
  return coachApiPlayerRequest('coachraisedead',{
    code:accessCode,
    gameId:gameId,
    position:position,
    number:playerNumber,
    name:playerName
  },'Unable to submit Raise the Dead.');
}

function coachApiSubmitJourneymanHireRequest(accessCode,journeymanId,playerNumber){
  return coachApiPlayerRequest('coachhirejourneyman',{
    code:accessCode,
    journeymanId:journeymanId,
    number:playerNumber
  },'Unable to hire the Journeyman.');
}

// =====================================================
// RETIRE PLAYER REQUEST
// =====================================================
function coachApiSubmitPlayerRetirementRequest(accessCode,playerId){
  return coachApiPlayerRequest('coachretireplayer',{
    code:accessCode,
    playerId:playerId
  },'Unable to retire the player.');
}

// =====================================================
// RENDER PORTAL
// =====================================================

function renderCoachPortal(data) {

  const coach =
    data.coach || {};

  const team =
    data.team || {};

  const management =
    data.management || {};

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
  setText('coach-team-name',team.teamName || coach.teamName || 'Team');
  setText('coach-team-race',team.race || '');
  setText('coach-name',coach.name || team.coach || '');
  setText('coach-team-id',team.teamId || coach.teamId || '-');
  setText('coach-season',coach.seasonId || team.seasonId || '-');
  renderCoachGameDayPackLink(team,coach,games);
  setText('coach-dedicated-fans',displayValue(team.dedicatedFans));
  setText('coach-treasury',formatGold(team.treasury));
  setText('coach-rerolls',displayValue(team.rerolls));
  setText('coach-apothecary',displayValue(team.apothecary));
  
  // ---------------------------------------------------
  // RENDER TEAM MANAGEMENT SUMMARY
  // ---------------------------------------------------

  const currentPlayers=players.filter(function(player){
    return !isCoachPlayerOffRoster(player.status);
  }).length;

  setText(
    'coach-management-players',
    currentPlayers
  );

  renderCoachManagement(
    team,
    management
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

      logo.src = team.logoUrl;

      logo.hidden = false;

    }
    else {

      logo.removeAttribute('src');

      logo.hidden = true;
    }
  }


  renderCoachGames(games,team,coach);
  renderCoachAdvancements(advancementPlayers);
  renderCoachRoster(players,data.journeymen||[]);
}

// =====================================================
// GAME DAY PACK LINK
// =====================================================
function renderCoachGameDayPackLink(team,coach,games) {
  const link = document.getElementById('coach-game-day-pack');
  if (!link) return;

  const teamId = String(team.teamId || coach.teamId || '').trim();
  const seasonId = String(coach.seasonId || team.seasonId || '').trim();

  const hasUpcomingGame = Array.isArray(games) && games.some(function(game) {
    const status=String(game.status||'').trim().toLowerCase();
    return game.isBye!==true && status!=='' && status!=='completed';
  });

  if (!teamId || !seasonId || !hasUpcomingGame) {
    link.hidden = true;
    link.removeAttribute('href');
    link.onclick = null;
    return;
  }

  const packUrl = COACH_API_URL + '?view=gameDayPack&teamId=' + encodeURIComponent(teamId) + '&seasonId=' + encodeURIComponent(seasonId);

  link.href=packUrl;
  link.hidden=false;
  
  // Disabled until the submission-status check finishes.
  setCoachGameDayPackState('checking');
  
  link.onclick=function(event){
    event.preventDefault();
  
      // ---------------------------------------------------
      // DO NOT REOPEN A SUBMITTED GAME
      // ---------------------------------------------------
      if(link.getAttribute('aria-disabled')==='true') return;
    
      const packWindow=window.open('','_blank');
    
      if (!packWindow) {
        window.open(packUrl,'_blank');
        return;
      }

    packWindow.document.open();
    packWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Preparing Game Day Pack</title>
<style>
html,body{margin:0;width:100%;height:100%;background:#eef3f5;font-family:Georgia,serif;color:#123f4e}
body{display:flex;align-items:center;justify-content:center}
.loading-card{background:#fff;border:1px solid #9eb4bd;border-top:6px solid #174f61;border-radius:8px;padding:38px 48px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.12);min-width:320px}
.loading-card h1{margin:0 0 12px;font-size:26px;text-transform:uppercase}
.loading-card p{margin:0 0 22px;color:#5d7078}
.spinner{width:38px;height:38px;margin:0 auto;border:4px solid #d8e1e5;border-top-color:#174f61;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="loading-card">
<h1>Preparing Game Day Pack</h1>
<p>Loading current roster and game information...</p>
<div class="spinner"></div>
</div>
</body>
</html>`);
    packWindow.document.close();

    setTimeout(function(){ packWindow.location.href = packUrl; },100);
  };
}

// =====================================================
// GAME DAY PACK - BUTTON STATE
// =====================================================
function setCoachGameDayPackState(state,gameId,reason){
  const link=document.getElementById('coach-game-day-pack');
  if(!link) return;

  link.classList.remove('is-checking','is-pending','is-unavailable');
  delete link.dataset.pendingText;
  delete link.dataset.pendingGameId;
  link.removeAttribute('title');

  if(state==='checking'){
    link.classList.add('is-checking');
    link.setAttribute('aria-disabled','true');
    link.setAttribute('tabindex','-1');
    return;
  }

    if(state==='review'){
    link.classList.add('is-pending');
    link.dataset.pendingText='PENDING COMMISSIONER REVIEW';
    link.dataset.pendingGameId=String(gameId||'');
    link.setAttribute('aria-disabled','true');
    link.setAttribute('tabindex','-1');
    return;
  }

  if(state==='pending'||state==='locked'){
    link.classList.add('is-pending');
    link.dataset.pendingText=state==='locked'?'WAITING FOR EARLIER GAMES':'PENDING OPPONENT SUBMISSION';
    link.dataset.pendingGameId=String(gameId||'');
    if(state==='locked') link.title=reason||'Both teams must complete their earlier games first.';
    link.setAttribute('aria-disabled','true');
    link.setAttribute('tabindex','-1');
    return;
  }

  if(state==='unavailable'){
    link.classList.add('is-unavailable');
    link.setAttribute('aria-disabled','true');
    link.setAttribute('tabindex','-1');
    return;
  }

  link.removeAttribute('aria-disabled');
  link.removeAttribute('tabindex');
}

// =====================================================
// TEAM MANAGEMENT - RENDER & PURCHASE ACTIONS
// =====================================================

function renderCoachManagement(team, management) {

  team = team || {};
  management = management || {};

  const purchases =
    management.purchases || {};

  setText(
    'coach-management-treasury',
    formatGold(team.treasury)
  );

  setText(
    'coach-management-rerolls',
    displayValue(team.rerolls)
  );

  setText(
    'coach-management-apothecary',
    displayValue(team.apothecary)
  );

  setText(
    'coach-management-assistant-coaches',
    displayValue(team.assistantCoaches)
  );

  setText(
    'coach-management-cheerleaders',
    displayValue(team.cheerleaders)
  );

  setText(
    'coach-management-dedicated-fans',
    displayValue(team.dedicatedFans)
  );

  // Keep any existing header/stat fields synchronized.
  setText('coach-treasury', formatGold(team.treasury));
  setText('coach-rerolls', displayValue(team.rerolls));
  setText('coach-apothecary', displayValue(team.apothecary));

    // Check current legal and affordable player/Journeyman options.
    refreshCoachBuyPlayerButtonState();
  
    // ---------------------------------------------------
    // RAISE THE DEAD - ONLY CHECK ROSTERS WITH THE RULE
    // ---------------------------------------------------
    const raiseDeadButton=document.getElementById('coach-management-raise-dead');
    const specialRules=management.details&&Array.isArray(management.details.specialRules)?management.details.specialRules:[];
    const hasMastersOfUndeath=specialRules.some(rule=>String(rule||'').trim().toLowerCase()==='masters of undeath');
  
    if(raiseDeadButton){
      raiseDeadButton.hidden=!hasMastersOfUndeath;
      raiseDeadButton.disabled=true;
      raiseDeadButton.onclick=null;
  
      if(hasMastersOfUndeath) refreshCoachRaiseDeadButtonState();
    }

  const options = [
    {
      key: 'reroll',
      buttonId: 'coach-management-buy-reroll',
      buttonLabel: 'Buy Re-roll',
      confirmLabel: 'Team Re-roll'
    },
    {
      key: 'apothecary',
      buttonId: 'coach-management-buy-apothecary',
      buttonLabel: 'Buy Apothecary',
      confirmLabel: 'Apothecary'
    },
    {
      key: 'assistantCoach',
      buttonId: 'coach-management-buy-assistant-coach',
      buttonLabel: 'Buy Assistant Coach',
      confirmLabel: 'Assistant Coach'
    },
    {
      key: 'cheerleader',
      buttonId: 'coach-management-buy-cheerleader',
      buttonLabel: 'Buy Cheerleader',
      confirmLabel: 'Cheerleader'
    }
  ];

  options.forEach(function(item) {

    const purchase =
      purchases[item.key] || {};

    const button =
      document.getElementById(
        item.buttonId
      );

    if (!button) {
      return;
    }

    const cost =
      Number(
        purchase.cost
      ) || 0;

    const costDisplay =
      cost > 0
        ? formatGold(cost)
        : '-';

    button.innerHTML = `
      <span>${escapePortalHtml(item.buttonLabel)}</span>
      <strong>${escapePortalHtml(costDisplay)}</strong>
    `;

    button.disabled =
      purchase.allowed !== true;

    button.title =
      purchase.reason || '';

    button.onclick = async function() {

      const accessCode =
        sessionStorage.getItem(
          SESSION_KEY
        ) || '';

      if (!accessCode) {

        alert(
          'Your Coach Portal session has expired. Please log in again.'
        );

        return;
      }

      const confirmed =
        await showCoachPurchaseConfirmation(
          item.confirmLabel,
          cost
        );

      if (!confirmed) {
        return;
      }

      button.disabled = true;

      button.innerHTML = `
        <span>Purchasing...</span>
        <strong>${escapePortalHtml(costDisplay)}</strong>
      `;

      coachApiSubmitTeamManagementPurchaseRequest(
        accessCode,
        item.key
      )

        .then(function(result) {

          if (
            !result ||
            result.ok !== true ||
            result.submitted !== true
          ) {

            throw new Error(
              result && result.reason
                ? result.reason
                : result && result.error
                  ? result.error
                  : 'The purchase could not be completed.'
            );
          }

          if (
            !result.team ||
            !result.management
          ) {

            throw new Error(
              'The purchase succeeded, but updated Team Management data was not returned.'
            );
          }

          renderCoachManagement(
            result.team,
            result.management
          );

          showCoachManagementSuccess(
            item.confirmLabel +
            ' purchased successfully.'
          );
        })

        .catch(function(error) {

          alert(
            error && error.message
              ? error.message
              : 'The Team Management purchase failed.'
          );

          // Failure-path safety refresh only.
          coachApiRequest(
            accessCode
          )

            .then(function(data) {

              if (
                data &&
                data.ok === true
              ) {

                renderCoachPortal(
                  data
                );
              }
            })

            .catch(function(refreshError) {

              console.error(
                'Coach Portal refresh failed:',
                refreshError
              );
            });
        });
    };
  });
}

// =====================================================
// RAISE THE DEAD BUTTON STATE
// =====================================================
function applyCoachRaiseDeadButtonState(result){
  const button=document.getElementById('coach-management-raise-dead');
  if(!button) return;

  const hasRule=result&&result.ok===true&&result.hasMastersOfUndeath===true;
  const available=hasRule&&result.available===true;
  const pending=hasRule&&result.pending===true;
  const kills=Number(result&&result.kills)||0;

  if(!hasRule){
    button.hidden=true; button.disabled=true; button.onclick=null;
    return;
  }

  button.hidden=false;

  if(available){
    button.disabled=false;
    button.title='Raise the Dead available.';
    button.innerHTML='<span>Raise the Dead</span><strong>Available</strong>';
    button.onclick=openCoachRaiseDead;
    return;
  }

  if(pending){
    button.disabled=true;
    button.title=result.reason||'Pending Opponent Submission.';
    button.innerHTML='<span>Raise the Dead</span><strong>Pending Opponent</strong>';
    button.onclick=null;
    return;
  }

  button.disabled=true;
  button.title=result.reason||'No eligible opposing dead player.';
  button.innerHTML='<span>Raise the Dead</span><strong>'+kills+' Kill'+(kills===1?'':'s')+' — No Eligible Dead</strong>';
  button.onclick=null;
}

// =====================================================
// REFRESH RAISE THE DEAD BUTTON STATE
// =====================================================
async function refreshCoachRaiseDeadButtonState(){
  const accessCode=sessionStorage.getItem(SESSION_KEY)||'';
  const button=document.getElementById('coach-management-raise-dead');

  if(!button||!accessCode) return;

  // Show the control while checking, similar to Buy Player.
  button.hidden=false;
  button.disabled=true;
  button.title='Checking Raise the Dead availability...';
  button.innerHTML='<span>Raise the Dead</span><strong>Checking...</strong>';
  button.onclick=null;

  try{
    const result=await coachApiGetRaiseDeadOptionsRequest(accessCode);
    applyCoachRaiseDeadButtonState(result);
  }
  catch(error){
    button.hidden=false;
    button.disabled=true;
    button.title=error&&error.message?error.message:'Unable to check Raise the Dead availability.';
    button.innerHTML='<span>Raise the Dead</span><strong>Unavailable</strong>';
    button.onclick=null;
    console.error('Raise the Dead availability check failed:',error);
  }
}

// =====================================================
// RAISE THE DEAD MODAL
// =====================================================

async function openCoachRaiseDead(){
  const accessCode=sessionStorage.getItem(SESSION_KEY)||'';
  const launchButton=document.getElementById('coach-management-raise-dead');

  if(!accessCode){
    alert('Your Coach Portal session has expired. Please log in again.');
    return;
  }

  if(launchButton){
    launchButton.disabled=true;
    launchButton.innerHTML='<span>Loading...</span><strong>Please wait</strong>';
  }

  try{
    const [raiseOptions,playerOptions]=await Promise.all([
      coachApiGetRaiseDeadOptionsRequest(accessCode),
      coachApiGetPlayerPurchaseOptionsRequest(accessCode)
    ]);

    if(!raiseOptions||raiseOptions.ok!==true) throw new Error(raiseOptions&&raiseOptions.error?raiseOptions.error:'Unable to load Raise the Dead options.');
    if(raiseOptions.available!==true) throw new Error(raiseOptions.reason||'Raise the Dead is not currently available.');
    if(!playerOptions||playerOptions.ok!==true) throw new Error(playerOptions&&playerOptions.error?playerOptions.error:'Unable to load the current roster.');

    showCoachRaiseDeadModal(accessCode,raiseOptions,playerOptions);
    applyCoachRaiseDeadButtonState(raiseOptions);
  }
  catch(error){
    alert(error&&error.message?error.message:'Unable to load Raise the Dead.');
    refreshCoachRaiseDeadButtonState();
  }
}

// =====================================================
// RAISE THE DEAD - DISPLAY / SUBMIT
// =====================================================

function showCoachRaiseDeadModal(accessCode,raiseOptions,playerOptions){
  const modal=document.getElementById('coach-raise-dead-modal');
  const gameSelect=document.getElementById('coach-raise-dead-game');
  const opponentText=document.getElementById('coach-raise-dead-opponent');
  const positionSelect=document.getElementById('coach-raise-dead-position');
  const numberSelect=document.getElementById('coach-raise-dead-number');
  const nameInput=document.getElementById('coach-raise-dead-name');
  const randomButton=document.getElementById('coach-raise-dead-random-name');
  const valueText=document.getElementById('coach-raise-dead-value');
  const message=document.getElementById('coach-raise-dead-message');
  const cancelButton=document.getElementById('coach-raise-dead-cancel');
  const confirmButton=document.getElementById('coach-raise-dead-confirm');

  if(!modal||!gameSelect||!opponentText||!positionSelect||!numberSelect||!nameInput||!randomButton||!valueText||!message||!cancelButton||!confirmButton){
    alert('The Raise the Dead window could not be opened.');
    return;
  }

  const games=Array.isArray(raiseOptions.games)?raiseOptions.games:[];
  const raisePositions=Array.isArray(raiseOptions.positions)?raiseOptions.positions:[];
  const legalPositions=Array.isArray(playerOptions.positions)?playerOptions.positions:[];
  const numbers=Array.isArray(playerOptions.availableNumbers)?playerOptions.availableNumbers:[];

  // ---------------------------------------------------
  // ONLY KEEP RAISED POSITIONS STILL LEGAL ON THE ROSTER
  // ---------------------------------------------------
  const positions=raisePositions.filter(function(item){
    return legalPositions.some(function(legal){
      return String(legal.position||'')===String(item.position||'');
    });
  });

  if(!games.length||!positions.length||!numbers.length){
    alert('No legal Raise the Dead option is currently available.');
    refreshCoachRaiseDeadButtonState();
    return;
  }

  // ---------------------------------------------------
  // LOAD GAMES
  // ---------------------------------------------------
  gameSelect.innerHTML='';

  games.forEach(function(game){
    const option=document.createElement('option');
    option.value=String(game.gameId||'');
    option.textContent='Round '+(game.round||'-')+' — '+(game.opponentTeam||game.opponentTeamId||'Opponent')+' — '+(game.kills||0)+' Kill'+(Number(game.kills)===1?'':'s');
    gameSelect.appendChild(option);
  });

  // ---------------------------------------------------
  // LOAD POSITIONS
  // ---------------------------------------------------
  positionSelect.innerHTML='';

  positions.forEach(function(item){
    const option=document.createElement('option');
    option.value=String(item.position||'');
    option.textContent=(item.position||'Lineman')+' — '+formatGold(item.cost);
    positionSelect.appendChild(option);
  });

  // ---------------------------------------------------
  // LOAD AVAILABLE NUMBERS
  // ---------------------------------------------------
  numberSelect.innerHTML='';

  numbers.forEach(function(number){
    const option=document.createElement('option');
    option.value=String(number);
    option.textContent='#'+number;
    numberSelect.appendChild(option);
  });

  // ---------------------------------------------------
  // CURRENT SELECTION
  // ---------------------------------------------------
  function selectedGame(){
    return games.find(item=>String(item.gameId||'')===gameSelect.value)||null;
  }

  function selectedPosition(){
    return positions.find(item=>String(item.position||'')===positionSelect.value)||null;
  }

  function refreshState(){
    const game=selectedGame();
    const position=selectedPosition();
    const playerName=String(nameInput.value||'').trim();

    opponentText.textContent=game?(game.opponentTeam||game.opponentTeamId||'-'):'-';
    valueText.textContent=position?formatGold(position.cost):'-';

    randomButton.disabled=!position;
    confirmButton.disabled=!game||!position||!numberSelect.value||!playerName;
  }

  // ---------------------------------------------------
  // RANDOM NAME
  // ---------------------------------------------------
  randomButton.onclick=async function(){
    const position=selectedPosition();
    if(!position) return;

    randomButton.disabled=true;
    randomButton.textContent='Generating...';
    message.textContent='';

    try{
      const result=await coachApiGeneratePlayerNameRequest(accessCode,position.position);

      if(!result||result.ok!==true||!result.name){
        throw new Error(result&&result.error?result.error:'Unable to generate a player name.');
      }

      nameInput.value=result.name;
      refreshState();
      nameInput.focus();
    }
    catch(error){
      message.textContent=error&&error.message?error.message:'Unable to generate a player name.';
    }
    finally{
      randomButton.textContent='Random Name';
      refreshState();
    }
  };

  // ---------------------------------------------------
  // CLOSE
  // Do NOT close from an outside click.
  // ---------------------------------------------------
  function closeModal(){
    modal.hidden=true;
    cancelButton.onclick=null;
    confirmButton.onclick=null;
    randomButton.onclick=null;
    gameSelect.onchange=null;
    positionSelect.onchange=null;
    numberSelect.onchange=null;
    nameInput.oninput=null;
    document.removeEventListener('keydown',handleKey);
  }

  function handleKey(event){
    if(event.key==='Escape') closeModal();
  }

  // ---------------------------------------------------
  // FIELD CHANGES
  // ---------------------------------------------------
  gameSelect.onchange=refreshState;

  positionSelect.onchange=function(){
    nameInput.value='';
    message.textContent='';
    refreshState();
  };

  numberSelect.onchange=refreshState;
  nameInput.oninput=refreshState;
  cancelButton.onclick=closeModal;

  // ---------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------
  confirmButton.onclick=async function(){
    const game=selectedGame();
    const position=selectedPosition();
    const playerNumber=Number(numberSelect.value);
    const playerName=String(nameInput.value||'').trim();

    if(!game||!position||!playerNumber||!playerName){
      message.textContent='Choose a game, position, player number and player name.';
      refreshState();
      return;
    }

    confirmButton.disabled=true;
    cancelButton.disabled=true;
    randomButton.disabled=true;
    message.textContent='Raising player...';

    try{
      const result=await coachApiSubmitRaiseDeadRequest(
        accessCode,
        game.gameId,
        position.position,
        playerNumber,
        playerName
      );

      if(!result||result.ok!==true||result.submitted!==true||result.raised!==true){
        throw new Error(
          result&&result.reason?result.reason:
          result&&result.error?result.error:
          'The player could not be raised.'
        );
      }

      closeModal();

      // Refresh the full Portal so roster, CTV, player count
      // and Raise the Dead availability all update together.
      const refreshed=await coachApiRequest(accessCode);

      if(refreshed&&refreshed.ok===true){
        renderCoachPortal(refreshed);
      }

      showCoachManagementSuccess(
        '#'+result.playerNumber+' '+result.playerName+' — '+result.position+' raised from the dead.'
      );
    }
    catch(error){
      message.textContent=error&&error.message?error.message:'Raise the Dead failed.';
      cancelButton.disabled=false;
      refreshState();
    }
  };

  // ---------------------------------------------------
  // OPEN
  // ---------------------------------------------------
  nameInput.value='';
  message.textContent='';
  cancelButton.disabled=false;
  confirmButton.disabled=true;

  document.addEventListener('keydown',handleKey);

  modal.hidden=false;
  refreshState();

  // Generate an initial name automatically.
  randomButton.click();
}

// =====================================================
// BUY PLAYER MODAL
// =====================================================

function applyCoachBuyPlayerButtonState(result){
  const button=document.getElementById('coach-management-buy-player');
  if(!button) return;

  const available=result&&result.ok===true&&(result.canBuy===true||result.canHireJourneyman===true);

  button.disabled=!available;
  button.title=result&&(result.reason||result.error)?(result.reason||result.error):'';
  button.innerHTML='<span>Buy Player</span><strong>Select</strong>';
  button.onclick=available?openCoachPlayerPurchase:null;
}

async function refreshCoachBuyPlayerButtonState() {
  const accessCode=sessionStorage.getItem(SESSION_KEY)||'';
  const button=document.getElementById('coach-management-buy-player');
  if(!button) return;

  const checkToken={};
  button.coachBuyPlayerCheck=checkToken;
  button.disabled=true;
  button.onclick=null;
  button.title='Checking affordable player options...';
  button.innerHTML='<span>Buy Player</span><strong>Checking...</strong>';

  if(!accessCode){
    button.title='Log in to check player purchase availability.';
    button.innerHTML='<span>Buy Player</span><strong>Unavailable</strong>';
    return;
  }

  const isCurrent=()=>button.coachBuyPlayerCheck===checkToken&&
    (sessionStorage.getItem(SESSION_KEY)||'')===accessCode;

  try {
    const result=await coachApiGetPlayerPurchaseOptionsRequest(accessCode);
    if(!isCurrent()) return;
    applyCoachBuyPlayerButtonState(result);
  }
  catch(error){
    if(!isCurrent()) return;
    button.disabled=true;
    button.title=error&&error.message?error.message:'Unable to check player purchase availability.';
    button.innerHTML='<span>Buy Player</span><strong>Unavailable</strong>';
    button.onclick=null;
  }
}
async function openCoachPlayerPurchase() {
  const accessCode=sessionStorage.getItem(SESSION_KEY)||'';
  const launchButton=document.getElementById('coach-management-buy-player');

  if(!accessCode){
    alert('Your Coach Portal session has expired. Please log in again.');
    return;
  }

  if(launchButton){
    launchButton.disabled=true;
    launchButton.innerHTML='<span>Loading...</span><strong>Please wait</strong>';
  }

  try{
    const result=await coachApiGetPlayerPurchaseOptionsRequest(accessCode);

    if(!result||result.ok!==true) throw new Error(result&&result.error?result.error:'Unable to load Buy Player options.');

    const journeymen=Array.isArray(result.availableJourneymen)?result.availableJourneymen:[];
    const canHireJourneyman=result.canHireJourneyman===true||journeymen.some(item=>item.affordable===true);
    const canOpen=result.canBuy===true||canHireJourneyman;

    if(!canOpen) throw new Error(result.reason||'No player is currently available to purchase.');
    
    applyCoachBuyPlayerButtonState(result);

    showCoachPlayerPurchaseModal(accessCode,result);
  }
  catch(error){
    alert(error&&error.message?error.message:'Unable to load Buy Player options.');
  }
  finally{
    if(launchButton){
      launchButton.innerHTML='<span>Buy Player</span><strong>Select</strong>';
    }
  }
}

function showCoachPlayerPurchaseModal(accessCode,options){
  const modal=document.getElementById('coach-player-modal');
  const typeSelect=document.getElementById('coach-player-purchase-type');
  const positionLabel=document.getElementById('coach-player-position-label');
  const positionSelect=document.getElementById('coach-player-position');
  const numberSelect=document.getElementById('coach-player-number');
  const nameInput=document.getElementById('coach-player-name');
  const randomButton=document.getElementById('coach-player-random-name');
  const costText=document.getElementById('coach-player-cost');
  const message=document.getElementById('coach-player-message');
  const cancelButton=document.getElementById('coach-player-cancel');
  const confirmButton=document.getElementById('coach-player-confirm');

  if(!modal||!typeSelect||!positionLabel||!positionSelect||!numberSelect||!nameInput||!randomButton||!costText||!message||!cancelButton||!confirmButton){
    alert('The Buy Player window could not be opened.');
    return;
  }

  const positions=Array.isArray(options.positions)?options.positions:[];
  const numbers=Array.isArray(options.availableNumbers)?options.availableNumbers:[];
  const journeymen=Array.isArray(options.availableJourneymen)?options.availableJourneymen:[];
  const canBuyNew=options.canBuy===true;
  const canHire=options.canHireJourneyman===true||journeymen.some(item=>item.affordable===true);

  typeSelect.innerHTML='';

  const newOption=document.createElement('option');
  newOption.value='new';
  newOption.textContent='New Player';
  newOption.disabled=!canBuyNew;
  typeSelect.appendChild(newOption);

  const journeymanOption=document.createElement('option');
  journeymanOption.value='journeyman';
  journeymanOption.textContent='Hire Journeyman';
  journeymanOption.disabled=!canHire;
  typeSelect.appendChild(journeymanOption);

  typeSelect.value=canBuyNew?'new':'journeyman';

  function selectedPosition(){
    return positions.find(item=>item.position===positionSelect.value)||null;
  }

  function selectedJourneyman(){
    return journeymen.find(item=>item.journeymanId===positionSelect.value)||null;
  }

  // ---------------------------------------------------
  // PLAYER NUMBER OPTIONS
  // New Player = unreserved permanent numbers.
  // Journeyman = legal permanent numbers for that JM.
  // ---------------------------------------------------
  function loadPlayerNumbers(){
    numberSelect.innerHTML='';
  
    let available=numbers;
    let preferredNumber=0;
  
    if(typeSelect.value==='journeyman'){
      const selected=selectedJourneyman();
  
      available=
        selected&&Array.isArray(selected.availableNumbers)
          ?selected.availableNumbers
          :[];
  
      preferredNumber=
        selected
          ?Number(selected.journeymanNumber)
          :0;
    }
  
    available.forEach(function(number){
      const option=document.createElement('option');
      option.value=String(number);
      option.textContent='#'+number;
      numberSelect.appendChild(option);
    });
  
    numberSelect.disabled=false;
  
    if(
      typeSelect.value==='journeyman' &&
      available.includes(preferredNumber)
    ){
      numberSelect.value=String(preferredNumber);
    }
  }

  function loadPurchaseType(){
    positionSelect.innerHTML='';
    message.textContent='';

    if(typeSelect.value==='journeyman'){
      positionLabel.textContent='Journeyman';
      nameInput.readOnly=true;
      randomButton.hidden=true;
      confirmButton.textContent='Hire Journeyman';

      journeymen.forEach(function(item){
        const option=document.createElement('option');
        option.value=item.journeymanId||'';
        option.textContent=(item.journeymanNumber||'JM')+' '+(item.playerName||'Journeyman')+' — '+(item.position||'Player')+' — '+formatGold(item.cost);
        option.disabled=item.affordable!==true;
        positionSelect.appendChild(option);
      });

      const firstAffordable=journeymen.find(item=>item.affordable===true);
      if(firstAffordable) positionSelect.value=firstAffordable.journeymanId;

      const selected=selectedJourneyman();
      nameInput.value=selected?selected.playerName:'';
    }
    else{
      positionLabel.textContent='Position';
      nameInput.readOnly=false;
      nameInput.value='';
      randomButton.hidden=false;
      confirmButton.textContent='Buy Player';

      positions.forEach(function(item){
        const option=document.createElement('option');
        option.value=item.position||'';
        option.textContent=(item.position||'Player')+' — '+formatGold(item.cost)+' ('+item.current+'/'+item.max+')';
        option.disabled=item.affordable!==true;
        positionSelect.appendChild(option);
      });

      const firstAffordable=positions.find(item=>item.affordable===true);
      if(firstAffordable) positionSelect.value=firstAffordable.position;
    }

    loadPlayerNumbers();
    refreshState();
  }

  function refreshState(){
    if(typeSelect.value==='journeyman'){
      const selected=selectedJourneyman();
      nameInput.value=selected?selected.playerName:'';
      costText.textContent=selected?formatGold(selected.cost):'-';
      confirmButton.disabled=!selected||selected.affordable!==true||!numberSelect.value;
      return;
    }

    const selected=selectedPosition();
    costText.textContent=selected?formatGold(selected.cost):'-';
    randomButton.disabled=!selected;
    confirmButton.disabled=!selected||selected.affordable!==true||!numberSelect.value||!String(nameInput.value||'').trim();
  }

  function closeModal(){
    modal.hidden=true;
    nameInput.readOnly=false;
    randomButton.hidden=false;
    cancelButton.onclick=null;
    confirmButton.onclick=null;
    randomButton.onclick=null;
    typeSelect.onchange=null;
    positionSelect.onchange=null;
    modal.onclick=null;
    document.removeEventListener('keydown',handleKey);
  }

  function handleKey(event){
    if(event.key==='Escape') closeModal();
  }

  typeSelect.onchange=loadPurchaseType;

  positionSelect.onchange=function(){
    message.textContent='';

    if(typeSelect.value==='journeyman'){
      const selected=selectedJourneyman();
      nameInput.value=selected?selected.playerName:'';
    }
    else{
      nameInput.value='';
    }

    loadPlayerNumbers();
    refreshState();
  };

  numberSelect.onchange=refreshState;
  nameInput.oninput=refreshState;

  randomButton.onclick=async function(){
    if(typeSelect.value!=='new') return;

    const selected=selectedPosition();
    if(!selected) return;

    randomButton.disabled=true;
    randomButton.textContent='Generating...';
    message.textContent='';

    try{
      const result=await coachApiGeneratePlayerNameRequest(accessCode,selected.position);

      if(!result||result.ok!==true||!result.name){
        throw new Error(result&&result.error?result.error:'Unable to generate a player name.');
      }

      nameInput.value=result.name;
      refreshState();
      nameInput.focus();
    }
    catch(error){
      message.textContent=error&&error.message?error.message:'Unable to generate a player name.';
    }
    finally{
      randomButton.textContent='Random Name';
      refreshState();
    }
  };

  cancelButton.onclick=closeModal;

  confirmButton.onclick=async function(){
    const playerNumber=Number(numberSelect.value);

if(typeSelect.value==='journeyman'){
  const selected=selectedJourneyman();

  if(!selected||!playerNumber){
    message.textContent='Choose a Journeyman and an available player number.';
    refreshState();
    return;
  }

  confirmButton.disabled=true;
  cancelButton.disabled=true;
  randomButton.disabled=true;
  message.textContent='Hiring Journeyman...';

  try{
    const result=await coachApiSubmitJourneymanHireRequest(accessCode,selected.journeymanId,playerNumber);

    if(!result||result.ok!==true||result.submitted!==true||result.purchased!==true){
      throw new Error(
        result&&result.reason?result.reason:
        result&&result.error?result.error:
        'The Journeyman could not be hired.'
      );
    }

    if(!result.team||!result.management||!Array.isArray(result.players)){
      throw new Error('The Journeyman was hired, but updated team data was not returned.');
    }

    closeModal();
    renderCoachManagement(result.team,result.management);

    const currentPlayers=result.players.filter(function(player){
      return !isCoachPlayerOffRoster(player.status);
    }).length;

    setText('coach-management-players',currentPlayers);
    renderCoachRoster(result.players);

    const advancementPlayers=result.advancements&&Array.isArray(result.advancements.players)
      ?result.advancements.players
      :[];

    renderCoachAdvancements(advancementPlayers);

    showCoachManagementSuccess(
      'Journeyman #'+result.playerNumber+' '+result.playerName+' — '+result.position+' hired successfully.'
    );
  }
  catch(error){
    message.textContent=error&&error.message?error.message:'The Journeyman hire failed.';
    cancelButton.disabled=false;
    refreshState();
  }

  return;
}

    const selected=selectedPosition();
    const playerName=String(nameInput.value||'').trim();

    if(!selected||!playerNumber||!playerName){
      message.textContent='Choose a position, player number and player name.';
      refreshState();
      return;
    }

    confirmButton.disabled=true;
    cancelButton.disabled=true;
    randomButton.disabled=true;
    message.textContent='Purchasing player...';

    try{
      const result=await coachApiSubmitPlayerPurchaseRequest(accessCode,selected.position,playerNumber,playerName);

      if(!result||result.ok!==true||result.submitted!==true||result.purchased!==true){
        throw new Error(
          result&&result.reason?result.reason:
          result&&result.error?result.error:
          'The player purchase could not be completed.'
        );
      }

      if(!result.team||!result.management||!Array.isArray(result.players)){
        throw new Error('The player was purchased, but updated team data was not returned.');
      }

      closeModal();
      renderCoachManagement(result.team,result.management);

      const currentPlayers=result.players.filter(function(player){
        return !isCoachPlayerOffRoster(player.status);
      }).length;

      setText('coach-management-players',currentPlayers);
      renderCoachRoster(result.players);

      const advancementPlayers=result.advancements&&Array.isArray(result.advancements.players)
        ?result.advancements.players
        :[];

      renderCoachAdvancements(advancementPlayers);

      showCoachManagementSuccess(
        'Player #'+result.playerNumber+' '+result.playerName+' — '+result.position+' purchased successfully.'
      );
    }
    catch(error){
      message.textContent=error&&error.message?error.message:'The player purchase failed.';
      cancelButton.disabled=false;
      refreshState();
    }
  };

  modal.onclick=function(event){
    if(event.target===modal) closeModal();
  };

  document.addEventListener('keydown',handleKey);
  loadPurchaseType();
  modal.hidden=false;
  typeSelect.focus();
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
          
              showCoachAdvancementSelection(card, player, option);
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

function showCoachAdvancementSelection(card, player, option) {

  const existing =
    card.querySelector(
      '.coach-advancement-selection'
    );


  if (existing) {
    existing.remove();
  }


  // Clear previous selected option
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


  // Highlight current advancement type
  card
    .querySelectorAll(
      '.coach-advancement-option'
    )
    .forEach(
      function(button) {

        const label =
          button.querySelector(
            'span'
          );


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


  // ---------------------------------------------------
  // LOAD CHOICES ON DEMAND
  // ---------------------------------------------------

  if (!option.choices) {

    const loading =
      document.createElement('div');

    loading.className =
      'coach-advancement-selection';

    loading.innerHTML = `
      <div class="coach-advancement-selection-title">
        Advancement Selection
      </div>

      <div class="coach-advancement-selection-note">
        Loading legal advancement choices...
      </div>
    `;

    card.appendChild(loading);

    const accessCode =
      sessionStorage.getItem(SESSION_KEY) || '';

    if (!accessCode) {

      loading.innerHTML = `
        <div class="coach-advancement-selection-note">
          Your Coach Portal session has expired. Please log in again.
        </div>
      `;

      return;
    }

    coachApiAdvancementChoicesRequest(
      accessCode,
      player.playerId,
      option.type
    )

      .then(function(result) {

        if (
          !result ||
          result.ok !== true
        ) {
          throw new Error(
            result && result.error
              ? result.error
              : 'Unable to load advancement choices.'
          );
        }

        option.choices =
          result.choices || {
            categories: []
          };

        if (result.cost !== undefined) {
          option.cost = result.cost;
        }

        if (result.nextAdvancement) {
          player.nextAdvancement =
            result.nextAdvancement;
        }

        showCoachAdvancementSelection(
          card,
          player,
          option
        );

      })

      .catch(function(error) {

        loading.innerHTML = `
          <div class="coach-advancement-selection-note">
            ${escapePortalHtml(
              error && error.message
                ? error.message
                : 'Unable to load advancement choices.'
            )}
          </div>
        `;

      });

    return;
  }


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
  `;


  // ===================================================
  // LEGAL CHOICES
  // ===================================================

  const choices =
    option &&
    option.choices &&
    Array.isArray(
      option.choices.categories
    )
      ? option.choices.categories
      : [];


  const choiceArea =
    document.createElement(
      'div'
    );


  choiceArea.className =
    'coach-advancement-choice-area';


  // ---------------------------------------------------
  // NO CHOICE DATA
  // ---------------------------------------------------

  if (!choices.length) {

    choiceArea.innerHTML = `
      <div class="coach-advancement-selection-note">
        No legal advancement choices were returned.
      </div>
    `;

  }

  // ---------------------------------------------------
  // RANDOM PRIMARY
  // ---------------------------------------------------

  else if (option.type === 'Random Primary') {

    const heading =
      document.createElement('div');

    heading.className =
      'coach-advancement-choice-title';

    heading.textContent =
      'Choose Random Primary Category';

    choiceArea.appendChild(heading);


    const categoryButtons =
      document.createElement('div');

    categoryButtons.className =
      'coach-advancement-category-buttons';


    const randomArea =
      document.createElement('div');

    randomArea.className =
      'coach-advancement-improvements';


    choiceArea.appendChild(categoryButtons);
    choiceArea.appendChild(randomArea);


    const randomCategories =
      choices.filter(function(category) {

        return (
          Array.isArray(category.improvements) &&
          category.improvements.length > 0
        );
      });


    randomCategories.forEach(
      function(category) {

        const button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'coach-advancement-category';

        button.textContent =
          category.category;


        button.addEventListener(
          'click',
          function() {

            categoryButtons
              .querySelectorAll(
                '.coach-advancement-category'
              )
              .forEach(
                function(other) {

                  other.classList.remove(
                    'selected'
                  );
                }
              );


            button.classList.add(
              'selected'
            );


            renderCoachRandomPrimaryConfirmation(
              randomArea,
              player,
              option,
              category
            );

          }
        );


        categoryButtons.appendChild(
          button
        );

      }
    );


    if (!randomCategories.length) {

      randomArea.innerHTML = `
        <div class="coach-advancement-selection-note">
          No legal Random Primary skills remain for this player.
        </div>
      `;

    }
    else if (
      randomCategories.length === 1
    ) {

      const firstButton =
        categoryButtons.querySelector(
          '.coach-advancement-category'
        );

      if (firstButton) {
        firstButton.click();
      }
    }
  }


  // ---------------------------------------------------
  // CHOOSE / CHARACTERISTIC
  // ---------------------------------------------------

  else {

    const heading =
      document.createElement(
        'div'
      );


    heading.className =
      'coach-advancement-choice-title';


    heading.textContent =
      option.type === 'Characteristic'
        ? 'Choose Characteristic'
        : 'Choose Skill Category';


    choiceArea.appendChild(
      heading
    );


    const categoryButtons =
      document.createElement(
        'div'
      );


    categoryButtons.className =
      'coach-advancement-category-buttons';


    const improvementArea =
      document.createElement(
        'div'
      );


    improvementArea.className =
      'coach-advancement-improvements';


    choiceArea.appendChild(
      categoryButtons
    );


    choiceArea.appendChild(
      improvementArea
    );


    choices.forEach(
      function(category) {

        const button =
          document.createElement(
            'button'
          );


        button.type =
          'button';


        button.className =
          'coach-advancement-category';


        button.textContent =
          category.category;


        button.addEventListener(
          'click',
          function() {

            categoryButtons
              .querySelectorAll(
                '.coach-advancement-category'
              )
              .forEach(
                function(other) {

                  other.classList.remove(
                    'selected'
                  );
                }
              );


            button.classList.add(
              'selected'
            );


            renderCoachAdvancementImprovements(
              improvementArea,
              category,
              player,
              option
            );

          }
        );


        categoryButtons.appendChild(
          button
        );

      }
    );


    // Automatically open if there is only one category
    if (
      choices.length === 1
    ) {

      const firstButton =
        categoryButtons.querySelector(
          '.coach-advancement-category'
        );


      if (firstButton) {
        firstButton.click();
      }
    }

  }


  selection.appendChild(
    choiceArea
  );


  const note =
    document.createElement(
      'div'
    );


  note.className =
    'coach-advancement-selection-note';


  note.textContent =
    'Selection preview only. Nothing has been submitted to the league yet.';


  selection.appendChild(
    note
  );


  card.appendChild(
    selection
  );
}

// =====================================================
// RENDER LEGAL SKILLS / CHARACTERISTICS
// =====================================================

function renderCoachAdvancementImprovements(container, category, player, option) {

  container.innerHTML = '';


  const improvements =
    Array.isArray(
      category.improvements
    )
      ? category.improvements
      : [];


  if (!improvements.length) {

    container.innerHTML = `
      <div class="coach-advancement-selection-note">
        No legal improvements are available in this category.
      </div>
    `;

    return;
  }


  const title =
    document.createElement(
      'div'
    );


  title.className =
    'coach-advancement-choice-title';


  title.textContent =
    'Choose Improvement';


  container.appendChild(
    title
  );


  const grid =
    document.createElement(
      'div'
    );


  grid.className =
    'coach-advancement-skill-grid';


  improvements.forEach(
    function(improvement) {

      const button =
        document.createElement(
          'button'
        );


      button.type =
        'button';


      button.className =
        'coach-advancement-skill';


      button.textContent =
        improvement;


      button.addEventListener(
        'click',
        function() {

          grid
            .querySelectorAll(
              '.coach-advancement-skill'
            )
            .forEach(
              function(other) {

                other.classList.remove(
                  'selected'
                );
              }
            );


          button.classList.add(
            'selected'
          );


          renderCoachAdvancementConfirmation(container, player, option, category, improvement);

        }
      );


      grid.appendChild(
        button
      );

    }
  );


  container.appendChild(
    grid
  );
}

// =====================================================
// ADVANCEMENT FINAL CONFIRMATION PREVIEW
// =====================================================

function renderCoachAdvancementConfirmation(container, player, option, category, improvement) {

  const existing =
    container.querySelector(
      '.coach-advancement-confirmation'
    );


  if (existing) {
    existing.remove();
  }


  const remainingSpp = Number(player.availableSpp) - Number(option.cost);

  const confirmation =
    document.createElement(
      'div'
    );


  confirmation.className =
    'coach-advancement-confirmation';


  confirmation.innerHTML = `
    <div class="coach-advancement-confirmation-title">
      Advancement Ready
    </div>

    <div class="coach-advancement-confirmation-grid">

      <div>
        <span>Player</span>

        <strong>
          #${escapePortalHtml(player.number)}
          ${escapePortalHtml(player.playerName)}
        </strong>
      </div>

      <div>
        <span>Advancement</span>
        <strong>${escapePortalHtml(option.type)}</strong>
      </div>

      <div>
        <span>Category</span>

        <strong>
          ${escapePortalHtml(category.category)}
        </strong>
      </div>

      <div>
        <span>Improvement</span>

        <strong>
          ${escapePortalHtml(improvement)}
        </strong>
      </div>

      <div>
        <span>Cost</span>

        <strong>
          ${escapePortalHtml(option.cost)} SPP
        </strong>
      </div>

      <div>
        <span>SPP Remaining</span>

        <strong>
          ${escapePortalHtml(remainingSpp)}
        </strong>
      </div>

    </div>

    <button
      type="button"
      class="coach-advancement-confirm-button"
    >
      Validate Advancement
    </button>

    <div class="coach-advancement-confirmation-note">
      Validation only. Nothing will be submitted to the league.
    </div>
  `;


  container.appendChild(
    confirmation
  );


  const button =
    confirmation.querySelector(
      '.coach-advancement-confirm-button'
    );


  const note =
    confirmation.querySelector(
      '.coach-advancement-confirmation-note'
    );

  if (!button || !note) {
    return;
  }

  let readyToSubmit = false;
  
  button.addEventListener('click', function() {
  
    const accessCode = sessionStorage.getItem(SESSION_KEY) || '';
  
    if (!accessCode) {
      note.textContent = 'Your Coach Portal session has expired. Please log in again.';
      return;
    }
  
  
    // ===================================================
    // SECOND CLICK = SUBMIT
    // ===================================================
  
    if (readyToSubmit) {
  
      button.disabled = true;
      button.textContent = 'Submitting...';
      note.textContent = 'Writing the advancement to the league...';
  
      coachApiSubmitAdvancementRequest(
        accessCode,
        player.playerId,
        option.type,
        category.category,
        improvement,
        player.nextAdvancement
      )
  
        .then(function(result) {
  
          if (
            !result ||
            result.ok !== true ||
            result.submitted !== true
          ) {
            throw new Error(
              result && result.error
                ? result.error
                : 'The advancement could not be submitted.'
            );
          }
  
          button.textContent = 'Advancement Submitted';
          
          const successMessage =
            '#' + player.number + ' ' +
            player.playerName + ' gained ' +
            improvement + ' — ' +
            (result.advancementId || 'Advancement recorded');
          
          note.textContent = 'Successfully submitted.';

          const refreshedPlayers =
            Array.isArray(result.players)
              ? result.players
              : [];
          
          const refreshedAdvancements =
            result.advancements &&
            Array.isArray(result.advancements.players)
              ? result.advancements.players
              : [];
          
          renderCoachAdvancements(refreshedAdvancements);
          renderCoachRoster(refreshedPlayers);
          
          showCoachAdvancementSuccess(successMessage);
  
        })
  
        .catch(function(error) {
  
          button.disabled = false;
          button.textContent = 'SUBMIT ADVANCEMENT';
  
          note.textContent =
            error && error.message
              ? error.message
              : 'Advancement submission failed.';
  
        });
  
      return;
    }
  
  
    // ===================================================
    // FIRST CLICK = VALIDATE
    // ===================================================
  
    button.disabled = true;
    button.textContent = 'Validating...';
    note.textContent = 'Checking the current league data...';
  
    coachApiValidateAdvancementRequest(
      accessCode,
      player.playerId,
      option.type,
      category.category,
      improvement
    )
  
      .then(function(result) {
  
        if (
          !result ||
          result.ok !== true ||
          result.validated !== true
        ) {
          throw new Error(
            result && result.error
              ? result.error
              : 'The advancement could not be validated.'
          );
        }
  
        readyToSubmit = true;
  
        button.disabled = false;
        button.textContent = 'SUBMIT ADVANCEMENT';
  
        note.textContent =
          'Server validation passed. Click SUBMIT ADVANCEMENT to add this advancement to the league.';
  
      })
  
      .catch(function(error) {
  
        readyToSubmit = false;
  
        button.disabled = false;
        button.textContent = 'Validate Advancement';
  
        note.textContent =
          error && error.message
            ? error.message
            : 'Advancement validation failed.';
  
      });
  
  });

}

// =====================================================
// RANDOM PRIMARY CONFIRMATION
// =====================================================

function renderCoachRandomPrimaryConfirmation(container, player, option, category){
  container.innerHTML='';

  const table=Array.isArray(category.randomTable)?category.randomTable:[];
  const witnessRequired=category.witnessRequired===true;

  if(table.length!==12||typeof category.witnessRequired!=='boolean'){
    container.textContent='The manual Random Primary table is unavailable. Refresh the Coach Portal and try again.';
    return;
  }

  const confirmation=document.createElement('div');
  confirmation.className='coach-advancement-confirmation';

  const diceOptions='<option value="">D6</option>'+
    [1,2,3,4,5,6].map(value=>
      '<option value="'+value+'">'+value+'</option>'
    ).join('');

  confirmation.innerHTML=`
    <div class="coach-advancement-confirmation-title">
      Random Primary — enter your dice rolls
    </div>

    <div class="coach-advancement-confirmation-grid">
      <div>
        <span>Player</span>
        <strong>#${escapePortalHtml(player.number)} ${escapePortalHtml(player.playerName)}</strong>
      </div>
      <div>
        <span>Category</span>
        <strong>${escapePortalHtml(category.category)}</strong>
      </div>
      <div>
        <span>Cost / SPP after</span>
        <strong>${escapePortalHtml(option.cost)} / ${escapePortalHtml(Number(player.availableSpp)-Number(option.cost))} SPP</strong>
      </div>
    </div>

    <p class="coach-manual-random-help">
      Roll two D6, one after the other, for each skill option.
      The first die selects the half of the table; the second selects
      the skill. Enter all four results below.
    </p>

    <div class="coach-manual-random-rolls">
      ${[1,2].map(number=>`
        <div class="coach-manual-random-card">
          <strong>Skill option ${number}</strong>

          <div class="coach-manual-random-dice">
            <label>
              First D6
              <select class="coach-manual-random-die"
                aria-label="Skill option ${number} first D6">
                ${diceOptions}
              </select>
            </label>

            <label>
              Second D6
              <select class="coach-manual-random-die"
                aria-label="Skill option ${number} second D6">
                ${diceOptions}
              </select>
            </label>
          </div>

          <div class="coach-manual-random-result"
            aria-live="polite"></div>
        </div>
      `).join('')}
    </div>

    <div class="coach-manual-random-choices"></div>

    <label class="coach-manual-random-witness">
      Witnessing coach ${witnessRequired?'(required)':'(optional)'}
      <input type="text"
        class="coach-manual-random-witness-name"
        maxlength="80"
        autocomplete="off"
        ${witnessRequired?'required':''}>
    </label>

    <div class="coach-manual-random-review"
      aria-live="polite"></div>

    <details class="coach-manual-random-table">
      <summary>
        View ${escapePortalHtml(category.category)} skill table
      </summary>

      <table>
        <thead>
          <tr>
            <th>First D6</th>
            <th>Second D6</th>
            <th>Skill</th>
            <th>Availability</th>
          </tr>
        </thead>
        <tbody>
          ${table.map(row=>`
            <tr>
              <td>${escapePortalHtml(row.firstD6)}</td>
              <td>${escapePortalHtml(row.secondD6)}</td>
              <td>${escapePortalHtml(row.tableSkill||row.skill)}</td>
              <td>${escapePortalHtml(row.allowed?'Available':row.reason)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </details>

    <button type="button"
      class="coach-advancement-confirm-button" disabled>
      SUBMIT RANDOM PRIMARY
    </button>

    <div class="coach-advancement-confirmation-note">
      Enter your physical dice results. Nothing is saved until you submit.
    </div>
  `;

  container.appendChild(confirmation);

  const inputs=Array.from(
    confirmation.querySelectorAll('.coach-manual-random-die')
  );

  const outputs=Array.from(
    confirmation.querySelectorAll('.coach-manual-random-result')
  );

  const choices=confirmation.querySelector('.coach-manual-random-choices');
  const review=confirmation.querySelector('.coach-manual-random-review');
  const witness=confirmation.querySelector('.coach-manual-random-witness-name');
  const button=confirmation.querySelector('.coach-advancement-confirm-button');
  const note=confirmation.querySelector('.coach-advancement-confirmation-note');

  let selected='',pending=false;

  function readResults(){
    return [0,2].map(offset=>{
      const first=inputs[offset].value;
      const second=inputs[offset+1].value;

      if(!/^[1-6]$/.test(first)||!/^[1-6]$/.test(second)){
        return null;
      }

      return table[
        (Number(first)<=3?0:6)+Number(second)-1
      ];
    });
  }

  function updateReview(){
    button.disabled=
      pending||
      !selected||
      (witnessRequired&&!witness.value.trim());

    review.textContent=selected
      ?'Selected: '+selected+
       ' — '+option.cost+' SPP; '+
       (Number(player.availableSpp)-Number(option.cost))+
       ' SPP remaining.'+
       (witness.value.trim()?' Witness: '+witness.value.trim():'')
      :'';

    reportCoachPortalHeight();
  }

  function refreshRolls(){
    selected='';
    choices.replaceChildren();

    const results=readResults();

    results.forEach((result,index)=>{
      outputs[index].textContent=!result
        ?'Enter both dice.'
        :result.allowed
          ?(result.tableSkill||result.skill)
          :((result.tableSkill||result.skill)+' — '+result.reason);
    });

    if(results.every(result=>result&&result.allowed===true)){
      const unique=[...new Set(results.map(result=>result.skill))];

      if(unique.length===1){
        selected=unique[0];

        choices.textContent=
          'Both options rolled '+selected+
          '. This is the skill the player receives.';
      }else{
        unique.forEach(skill=>{
          const label=document.createElement('label');
          label.className='coach-manual-random-pick';

          const input=document.createElement('input');
          input.type='radio';
          input.name='manual-random-'+player.playerId;
          input.value=skill;

          input.addEventListener('change',function(){
            selected=skill;
            updateReview();
          });

          label.appendChild(input);
          label.appendChild(document.createTextNode(skill));
          choices.appendChild(label);
        });
      }

      note.textContent=unique.length===1
        ?'Review the result, then submit.'
        :'Choose one of the two rolled skills, then submit.';
    }else{
      note.textContent=
        'Enter all four results. Reroll any pair that produces an unavailable skill.';
    }

    updateReview();
  }

  inputs.forEach(input=>
    input.addEventListener('change',refreshRolls)
  );

  witness.addEventListener('input',updateReview);

  function setPending(value){
    pending=value;

    confirmation.querySelectorAll('select,input').forEach(field=>{
      field.disabled=value;
    });

    const selection=confirmation.closest('.coach-advancement-selection');

    if(selection){
      selection.querySelectorAll('.coach-advancement-category').forEach(field=>{
        field.disabled=value;
      });
    }

    updateReview();
  }

  button.addEventListener('click',async function(){
    if(pending) return;

    const results=readResults();

    if(
      !results.every(result=>result&&result.allowed===true)||
      !results.some(result=>result.skill===selected)
    ){
      note.textContent=
        'Enter two available skill results and select one of them.';
      return;
    }

    const accessCode=sessionStorage.getItem(SESSION_KEY)||'';

    if(!accessCode){
      note.textContent=
        'Your Coach Portal session has expired. Please log in again.';
      return;
    }

    const witnessName=witness.value.replace(/\s+/g,' ').trim();

    if(witnessRequired&&!witnessName){
      note.textContent='Enter the coach who witnessed the dice rolls.';
      witness.focus();
      return;
    }

    if(witnessName.length>80||witnessName.startsWith('=')){
      note.textContent=
        'Enter a witnessing coach name of up to 80 characters.';
      witness.focus();
      return;
    }

    const dice=inputs.map(input=>Number(input.value));

    setPending(true);
    button.textContent='SUBMITTING...';

    note.textContent=
      'Saving '+selected+' with the four recorded dice results...';

    try{
      const result=await coachApiSubmitAdvancementRequest(
        accessCode,
        player.playerId,
        option.type,
        category.category,
        selected,
        player.nextAdvancement,
        dice,
        witnessName
      );

      if(!result||result.ok!==true||result.submitted!==true){
        throw new Error(
          result&&result.error||
          'The Random Primary advancement could not be submitted.'
        );
      }

      renderCoachAdvancements(
        result.advancements&&Array.isArray(result.advancements.players)
          ?result.advancements.players
          :[]
      );

      renderCoachRoster(
        Array.isArray(result.players)?result.players:[]
      );

      showCoachAdvancementSuccess(
        '#'+player.number+' '+player.playerName+
        ' gained '+result.improvement+' — '+
        (result.advancementId||'Advancement recorded')
      );
    }catch(error){
      const message=error&&error.message
        ?error.message
        :'Random Primary advancement failed.';

      if(message==='Advancement submission timed out.'){
        button.textContent='CHECK SAVED RESULT';

        note.textContent=
          'The server did not respond in time. Refresh the portal and check whether the advancement was recorded before trying again.';

        return;
      }

      setPending(false);
      button.textContent='SUBMIT RANDOM PRIMARY';
      note.textContent=message;
    }
  });

  refreshRolls();
}

// =====================================================
// FIXTURES
// =====================================================
function renderCoachGames(games,team,coach){
  const container=document.getElementById('coach-games');
  if(!container) return;

  container.innerHTML='';

  if(!games.length){
    container.textContent='No fixtures available.';
    return;
  }

  games.forEach(function(game){
    const card=document.createElement('div');
    card.className='coach-game-card';
    card.dataset.gameId=String(game.gameId||'');

    
    // =====================================================
    // BYE ROUND - DISPLAY ONLY
    // =====================================================
    if(game.isBye===true){
      const round=document.createElement('div');
      round.className='coach-game-round';
      round.textContent='Round '+game.round;

      const matchup=document.createElement('strong');
      matchup.textContent='BYE WEEK';

      const details=document.createElement('div');
      details.className='coach-game-details';
      details.textContent='No game this round';

      card.classList.add('coach-game-bye');
      card.appendChild(round);
      card.appendChild(matchup);
      card.appendChild(details);
      container.appendChild(card);
      return;
    }


    const round=document.createElement('div');
    round.className='coach-game-round';
    round.textContent=game.round?'Round '+game.round:(game.gameId||'Fixture');

    const matchup=document.createElement('strong');
    const home=game.homeTeamName||displayTeamForGame(game.homeTeamId,team,coach);
    const away=game.awayTeamName||displayTeamForGame(game.awayTeamId,team,coach);
    matchup.textContent=home+' vs '+away;

    const details=document.createElement('div');
    details.className='coach-game-details';

    const detailParts=[];

    if(game.gameId) detailParts.push(game.gameId);
    if(game.date) detailParts.push(game.date);
    if(game.status) detailParts.push(game.status);

    if(
      game.homeScore!==''&&game.homeScore!==null&&game.homeScore!==undefined &&
      game.awayScore!==''&&game.awayScore!==null&&game.awayScore!==undefined
    ){
      detailParts.push('Score '+game.homeScore+'-'+game.awayScore);
    }

    details.textContent=detailParts.join(' | ');

    card.appendChild(round);
    card.appendChild(matchup);
    card.appendChild(details);
    container.appendChild(card);
  });

  // Check the server and add SUBMIT GAME only to the
  // fixture currently eligible for post-game submission.
  refreshCoachGameSubmissionButton();
}

// =====================================================
// POST-GAME SUBMISSION - AVAILABLE GAME BUTTON
// =====================================================
function setCoachPendingGameNotice(show,isReview){
  const notice=document.querySelector('.coach-management-pending-game');
  if(!notice) return;

  notice.hidden=!show;

  if(show){
    notice.textContent=isReview
      ?'Game winnings pending commissioner review.'
      :'Game winnings pending opponent submission.';
  }
}

async function refreshCoachGameSubmissionButton(){
  const accessCode=sessionStorage.getItem(SESSION_KEY)||'';

  if(!accessCode){
    setCoachPendingGameNotice(false);
    setCoachGameDayPackState('unavailable');
    return;
  }

  try{
    const result=await coachApiGetGameSubmissionOptionsRequest(accessCode);

    coachGameSubmissionCache=result&&result.ok===true&&result.game&&result.canSubmit===true
      ?{accessCode:accessCode,loadedAt:Date.now(),data:result}
      :null;
    
    console.log('Star Players returned by API:',
      (result&&result.inducementRules||[]).filter(r=>String(r.inducement||'').includes('Star')));

    // ---------------------------------------------------
    // STATUS CHECK FAILED
    // ---------------------------------------------------
    if(!result||result.ok!==true){
      setCoachPendingGameNotice(false);
      setCoachGameDayPackState('unavailable');
      return;
    }
    
    // ---------------------------------------------------
    // NO CURRENT POST-GAME SUBMISSION
    // ---------------------------------------------------
    if(!result.game){
      setCoachPendingGameNotice(false);
      setCoachGameDayPackState('ready');
      return;
    }

    // ---------------------------------------------------
    // PENDING / COMMISSIONER REVIEW STATE
    // ---------------------------------------------------
    const submission=result.existingSubmission||null;
    const validationStatus=String(submission&&submission.validationStatus||'').trim();
    const isReview=validationStatus==='Mismatch'||validationStatus==='Pending Commissioner Review';
    
    setCoachPendingGameNotice(!!submission,isReview);
    setCoachGameDayPackState(result.fixtureLocked===true?'locked':submission?(isReview?'review':'pending'):'ready',result.game.gameId,result.reason);
    
    // Keep Commissioner Review warning visible until resolved.
    const existingResult=document.querySelector('.coach-game-submission-result');
    
    if(isReview){
      showCoachGameSubmissionResult({
        validationStatus:validationStatus,
        mismatchFields:Array.isArray(submission.mismatchFields)?submission.mismatchFields:[]
      },true);
    }
    else if(existingResult){
      existingResult.remove();
    }

    const cards=Array.from(document.querySelectorAll('.coach-game-card'));
    const card=cards.find(function(item){
      return item.dataset.gameId===String(result.game.gameId||'');
    });

    if(!card) return;

    let button=card.querySelector('.coach-game-submit-button');

    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='coach-game-submit-button';
      card.appendChild(button);
    }

    // ---------------------------------------------------
    // ALREADY SUBMITTED
    // ---------------------------------------------------
    if(result.existingSubmission){
      button.disabled=true;
      button.textContent='Game Submitted';
      button.title='This game has already been submitted.';
      button.onclick=null;
      return;
    }

    if(result.fixtureLocked===true){
      button.disabled=true;
      button.textContent='Waiting for Earlier Games';
      button.title=result.reason||'Both teams must complete their earlier games first.';
      button.onclick=null;
      return;
    }
    
    // ---------------------------------------------------
    // AVAILABLE TO SUBMIT
    // ---------------------------------------------------
    if(result.canSubmit===true){
      button.disabled=false;
      button.textContent='Submit Game';
      button.title='';
      button.onclick=function(){ openCoachGameSubmissionPreview(button); };
      return;
    }

    button.remove();
  }
  catch(error){
    setCoachPendingGameNotice(false);
    setCoachGameDayPackState('unavailable');
    console.error('Post-game submission availability check failed:',error);
  }
}

// =====================================================
// POST-GAME SUBMISSION - GAME DAY PACK ENTRY FORM
// Frontend only. No league write yet.
// =====================================================
const COACH_HATRED_DESCRIPTION = 'When blocking a player who has the keyword in brackets, this player can re-roll one Player Down result.';

function coachGettingEvenApplies(injury) {
  return ['Seriously Hurt','Serious Injury','Lasting Injury'].includes(String(injury || '').trim());
}

function addCoachGettingEvenControls(cell, injurySelect, sources) {
  const panel = document.createElement('div');
  panel.className = 'coach-submit-hatred';
  panel.hidden = true;

  const heading = document.createElement('strong');
  heading.textContent = 'Getting Even / Hatred';
  panel.appendChild(heading);

  function addSelect(labelText, className, placeholder) {
    const label = document.createElement('label');
    label.className = 'coach-submit-hatred-label';

    const text = document.createElement('span');
    text.textContent = labelText;

    const select = document.createElement('select');
    select.className = className;
    select.add(new Option(placeholder, ''));

    label.appendChild(text);
    label.appendChild(select);
    panel.appendChild(label);

    return {label:label, select:select};
  }

  const cause = addSelect('Casualty caused by', 'coach-submit-casualty-source', 'Select opposing player');

  (sources || []).forEach(player => {
    const label = '#' + player.playerNumber + ' ' + player.playerName + ' — ' + player.position + ' [' + player.playerId + ']';
    cause.select.add(new Option(label, player.playerId));
  });

  cause.select.add(new Option('No opposing player caused this injury', '__OTHER__'));

  const roll = addSelect('Getting Even D6', 'coach-submit-hatred-roll', 'Select rolled result');
  for (let value = 1; value <= 6; value++) roll.select.add(new Option(String(value), String(value)));
  roll.label.hidden = true;

  const keyword = addSelect('Hatred keyword', 'coach-submit-hatred-keyword', 'Select keyword');
  keyword.label.hidden = true;

  const status = document.createElement('small');
  status.className = 'coach-submit-hatred-note';
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  const description = document.createElement('small');
  description.className = 'coach-submit-hatred-note';
  description.textContent = 'Enter the D6 result already rolled for this injury. On 4+, choose one eligible keyword. ' + COACH_HATRED_DESCRIPTION;
  panel.appendChild(description);

  function refresh() {
    const eligible = coachGettingEvenApplies(injurySelect.value);
    panel.hidden = !eligible;

    if (!eligible) {
      cause.select.value = '';
      roll.select.value = '';
      keyword.select.value = '';
    }

    const source = (sources || []).find(player => player.playerId === cause.select.value);
    const showRoll = eligible && !!source;
    const passed = showRoll && Number(roll.select.value) >= 4;

    roll.label.hidden = !showRoll;
    keyword.label.hidden = !passed;

    const previousKeyword = keyword.select.value;
    keyword.select.replaceChildren(new Option('Select keyword', ''));

    if (passed) {
      (source.keywords || []).forEach(value => keyword.select.add(new Option(value, value)));
    }

    keyword.select.value = passed && (source.keywords || []).includes(previousKeyword) ? previousKeyword : '';

    if (cause.select.value === '__OTHER__') {
      status.textContent = 'Injury effects still apply; no Hatred will be recorded.';
    } else if (!source) {
      status.textContent = 'Select the opposing player who caused this casualty.';
    } else if (passed && source.keywordError) {
      status.textContent = 'Opponent keywords are unavailable. Ask the commissioner to check this player.';
    } else if (passed) {
      status.textContent = 'Choose one eligible keyword.';
    } else if (roll.select.value) {
      status.textContent = 'Roll failed: no Hatred gained.';
    } else {
      status.textContent = 'Enter the Getting Even D6 result.';
    }

    reportCoachPortalHeight();
  }

  cause.select.onchange = function() {
    roll.select.value = '';
    keyword.select.value = '';
    refresh();
  };

  roll.select.onchange = function() {
    keyword.select.value = '';
    refresh();
  };

  injurySelect.addEventListener('change', refresh);
  cell.appendChild(panel);
}

function readCoachGettingEven(row, sources) {
  const injury = row.querySelector('.coach-submit-injury-result');
  if (!injury || !coachGettingEvenApplies(injury.value)) return {};

  const cause = row.querySelector('.coach-submit-casualty-source');
  const roll = row.querySelector('.coach-submit-hatred-roll');
  const keyword = row.querySelector('.coach-submit-hatred-keyword');

  function fail(field, message) {
    const error = new Error(message);
    error.field = field;
    throw error;
  }

  if (!cause || !cause.value) {
    fail(cause || injury, 'Select who caused the casualty, or select that no opposing player caused it.');
  }

  if (cause.value === '__OTHER__') return {};

  const source = (sources || []).find(player => player.playerId === cause.value);

  if (!source) {
    fail(cause, 'The selected casualty-causing player is unavailable. Refresh the Coach Portal.');
  }

  if (!roll || !/^[1-6]$/.test(roll.value)) {
    fail(roll || cause, 'Enter the Getting Even D6 result from 1 to 6.');
  }

  const result = Number(roll.value);
  const selectedKeyword = String(keyword && keyword.value || '').trim();

  if (result >= 4) {
    if (source.keywordError) {
      fail(cause, 'Opponent keywords are unavailable. Ask the commissioner to check this player.');
    }

    if (!(source.keywords || []).includes(selectedKeyword)) {
      fail(keyword || cause, 'Select the Hatred keyword for the successful Getting Even roll.');
    }
  } else if (selectedKeyword) {
    fail(keyword, 'A failed Getting Even roll cannot award Hatred.');
  }

  return {
    causedByPlayerId:source.playerId,
    hatredRoll:result,
    hatredKeyword:result >= 4 ? selectedKeyword : ''
  };
}

async function openCoachGameSubmissionPreview(launchButton){
  const accessCode=sessionStorage.getItem(SESSION_KEY)||'';
  const modal=document.getElementById('coach-game-submission-modal');
  const summary=document.getElementById('coach-game-submission-summary');
  const body=document.getElementById('coach-game-submission-players');
  const closeButton=document.getElementById('coach-game-submission-close');
  const reviewButton=document.getElementById('coach-game-submission-review');
  const message=document.getElementById('coach-game-submission-message');

  if(!accessCode){ alert('Your Coach Portal session has expired. Please log in again.'); return; }
  if(!modal||!summary||!body||!closeButton||!reviewButton||!message){ alert('The Game Submission window could not be opened.'); return; }

  if(launchButton){ launchButton.disabled=true; launchButton.textContent='Loading...'; }

  
  try{
    const cached=coachGameSubmissionCache;
    const useCache=cached&&cached.accessCode===accessCode&&
      Date.now()-cached.loadedAt<COACH_GAME_CACHE_MS;
  
    const result=useCache
      ?cached.data
      :await coachApiGetGameSubmissionOptionsRequest(accessCode);
  
    console.log('Submit Game data source:',useCache?'CACHE':'SERVER');
  
    if(!result||result.ok!==true||!result.game) throw new Error(result&&result.error?result.error:'Unable to load the game submission.');
    if(result.canSubmit!==true) throw new Error(result.reason||'This game is not currently available for submission.');
    if(!Array.isArray(result.hatredSources)) throw new Error('The game options are out of date. Refresh the Coach Portal and try again.');

    const game=result.game;
    const team=result.team||{};

    // =====================================================
    // SUBMITTING SIDE
    // =====================================================
    const submittingIsHome=String(game.submittingSide||game.side||'').trim().toUpperCase()==='HOME';

    // =====================================================
    // DOM REFERENCES
    // =====================================================
    const homeDfBefore=document.getElementById('coach-submit-home-df-before');
    const awayDfBefore=document.getElementById('coach-submit-away-df-before');
    const homeFair=document.getElementById('coach-submit-home-fair');
    const awayFair=document.getElementById('coach-submit-away-fair');
    const homeFactor=document.getElementById('coach-submit-home-factor');
    const awayFactor=document.getElementById('coach-submit-away-factor');
    const attendance=document.getElementById('coach-submit-fan-attendance');
    
    const homeTeam=document.getElementById('coach-submit-home-team');
    const awayTeam=document.getElementById('coach-submit-away-team');
    const homeIcon=document.getElementById('coach-submit-home-icon');
    const awayIcon=document.getElementById('coach-submit-away-icon');
    const homeScore=document.getElementById('coach-submit-home-score');
    const awayScore=document.getElementById('coach-submit-away-score');
    const homeStalled=document.getElementById('coach-submit-home-stalled');
    const awayStalled=document.getElementById('coach-submit-away-stalled');
    // =====================================================
    // FORFEIT - HOME / AWAY CONTROLS
    // =====================================================
    const homeForfeit=document.getElementById('coach-submit-home-forfeit');
    const awayForfeit=document.getElementById('coach-submit-away-forfeit');
    if(!homeForfeit||!awayForfeit) throw new Error('The Forfeit controls could not be loaded.');

    const postHomeTeam=document.getElementById('coach-submit-post-home-team');
    const postAwayTeam=document.getElementById('coach-submit-post-away-team');
    const postHomeBefore=document.getElementById('coach-submit-post-home-before');
    const postAwayBefore=document.getElementById('coach-submit-post-away-before');
    const postHomeResult=document.getElementById('coach-submit-post-home-result');
    const postAwayResult=document.getElementById('coach-submit-post-away-result');
    const homeDfRoll=document.getElementById('coach-submit-home-df-roll');
    const awayDfRoll=document.getElementById('coach-submit-away-df-roll');
    const postHomeChange=document.getElementById('coach-submit-post-home-change');
    const postAwayChange=document.getElementById('coach-submit-post-away-change');
    const postHomeAfter=document.getElementById('coach-submit-post-home-after');
    const postAwayAfter=document.getElementById('coach-submit-post-away-after');
    const notes=document.getElementById('coach-game-submission-notes');

    // =====================================================
    // INDUCEMENTS
    // =====================================================
    const inducementBody=document.getElementById('coach-game-submission-inducements');
    const inducementRole=document.getElementById('coach-submit-inducement-role');
    const inducementDifference=document.getElementById('coach-submit-inducement-difference');
    const inducementHighSpend=document.getElementById('coach-submit-inducement-high-spend');
    const inducementPetty=document.getElementById('coach-submit-inducement-petty');
    const inducementTreasury=document.getElementById('coach-submit-inducement-treasury');
    const inducementTotal=document.getElementById('coach-submit-inducement-total');
    const inducementMessage=document.getElementById('coach-submit-inducement-message');

    const apothecaryUsed=document.getElementById('coach-game-submission-apothecary');
    const apothecaryNote=document.getElementById('coach-game-submission-apothecary-note');
    
    if(!apothecaryUsed||!apothecaryNote) throw new Error('The Apothecary game field could not be loaded.');
    if(!inducementBody||!inducementRole||!inducementDifference||!inducementHighSpend||!inducementPetty||!inducementTreasury||!inducementTotal||!inducementMessage) throw new Error('The Inducement game fields could not be loaded.');

    // =====================================================
    // HEADER / GAME DATA
    // =====================================================
    summary.textContent='GAME: '+game.gameId+'   ROUND: '+game.round+'   SUBMITTING AS: '+game.submittingSide;

    homeTeam.textContent=String(game.homeTeam||'HOME TEAM').toUpperCase();
    awayTeam.textContent=String(game.awayTeam||'AWAY TEAM').toUpperCase();

    function setSubmitTeamIcon(img,url,altText){
      if(!img) return;
      if(url){
        img.src=url;
        img.alt=altText||'';
        img.classList.remove('is-empty');
      } else {
        img.removeAttribute('src');
        img.alt='';
        img.classList.add('is-empty');
      }
    }

    setSubmitTeamIcon(homeIcon,game.homeIconUrl||game.homeLogoUrl||'',String(game.homeTeam||'Home Team')+' icon');
    setSubmitTeamIcon(awayIcon,game.awayIconUrl||game.awayLogoUrl||'',String(game.awayTeam||'Away Team')+' icon');

    homeDfBefore.textContent=displayValue(game.homeDfBefore);
    awayDfBefore.textContent=displayValue(game.awayDfBefore);

    postHomeTeam.textContent=String(game.homeTeam||'');
    postAwayTeam.textContent=String(game.awayTeam||'');
    postHomeBefore.textContent=displayValue(game.homeDfBefore);
    postAwayBefore.textContent=displayValue(game.awayDfBefore);

    // =====================================================
    // POST-GAME DF — COACH SUBMITS OWN TEAM ONLY
    // =====================================================
    const postHomeRow=homeDfRoll.closest('tr');
    const postAwayRow=awayDfRoll.closest('tr');
    
    if(postHomeRow) postHomeRow.hidden=!submittingIsHome;
    if(postAwayRow) postAwayRow.hidden=submittingIsHome;

    homeFair.value='';
    awayFair.value='';
    homeScore.value='';
    awayScore.value='';
    homeStalled.value='';
    awayStalled.value='';
    // =====================================================
    // FORFEIT - DEFAULT TO GAME PLAYED
    // =====================================================
    homeForfeit.value='No';
    awayForfeit.value='No';
    homeForfeit.disabled=false;
    awayForfeit.disabled=false;
    homeScore.disabled=false;
    awayScore.disabled=false;
    homeStalled.disabled=false;
    awayStalled.disabled=false;
    reviewButton.disabled=false;
    
    homeDfRoll.value='';
    awayDfRoll.value='';
    notes.value='';

        // =====================================================
    // INDUCEMENTS
    // =====================================================
    const inducementRules=Array.isArray(result.inducementRules)?result.inducementRules:[];
    const ctvRole=String(game.submittingCtvRole||'EQUAL').trim().toUpperCase();
    const ctvDifference=Math.max(0,Number(game.ctvDifference)||0);
    const treasuryAvailable=Math.max(0,Number(team.treasury)||0);
    const lowerTreasuryMax=Math.min(50000,treasuryAvailable);

    let inducementFundingState={valid:true,error:'',higherCtvTreasurySpent:0,pettyCashAvailable:0,pettyCashUsed:0,treasuryUsed:0,totalPurchased:0,purchases:[]};

    function inducementInputValue(input){
      const value=String(input&&input.value||'').replace(/,/g,'').trim();
      return /^\d+$/.test(value)?Number(value):0;
    }

    function setInducementInput(input,value){
      if(input) input.value=String(Math.max(0,Math.floor(Number(value)||0)));
    }

    inducementRole.textContent=ctvRole==='HIGHER'?'HIGHER CTV':ctvRole==='LOWER'?'LOWER CTV':'EQUAL CTV';
    inducementDifference.textContent=formatGold(ctvDifference);
    inducementBody.innerHTML='';

    inducementRules.forEach(function(rule){
      const cost=Math.max(0,Number(rule.cost)||0);
      const maxQty=Math.max(1,Number(rule.maxQty)||1);
      const variableCost=rule.variableCost===true&&rule.inducement==='Star Players';
      const row=document.createElement('tr');

      row.dataset.inducement=String(rule.inducement||'');
      row.dataset.cost=String(cost);
      row.dataset.variableCost=variableCost?'true':'false';

      const name=document.createElement('td');
      name.textContent=String(rule.inducement||'');
      if(rule.notes) name.title=String(rule.notes);

      const costCell=document.createElement('td');
      costCell.textContent=variableCost?'Variable':formatGold(cost);

      const maxCell=document.createElement('td');
      maxCell.textContent=maxQty;

      const qtyCell=document.createElement('td');
      const qty=document.createElement('select');
      qty.className='coach-submit-inducement-qty';

      for(let i=0;i<=maxQty;i++){
        const option=document.createElement('option');
        option.value=String(i);
        option.textContent=String(i);
        qty.appendChild(option);
      }

      qty.disabled=ctvRole==='EQUAL';
      qtyCell.appendChild(qty);

      const totalCell=document.createElement('td');
      totalCell.className='coach-submit-inducement-row-total';
      
      if(variableCost){
        const input=document.createElement('input');
        input.type='text';
        input.inputMode='numeric';
        input.maxLength=7;
        input.placeholder='Total GP';
        input.className='coach-submit-inducement-variable-cost';
        input.disabled=true;
        input.oninput=updateInducementFunding;
        totalCell.appendChild(input);
      }
      else{
        totalCell.textContent='0';
      }

      const pettyCell=document.createElement('td');
      pettyCell.className='coach-submit-inducement-row-petty';
      pettyCell.textContent='0';

      const treasuryCell=document.createElement('td');
      treasuryCell.className='coach-submit-inducement-row-treasury';
      treasuryCell.textContent='0';

      const sourceCell=document.createElement('td');
      sourceCell.className='coach-submit-inducement-row-source';
      sourceCell.textContent='-';

      row.appendChild(name);
      row.appendChild(costCell);
      row.appendChild(maxCell);
      row.appendChild(qtyCell);
      row.appendChild(totalCell);
      row.appendChild(pettyCell);
      row.appendChild(treasuryCell);
      row.appendChild(sourceCell);

      qty.onchange=function(){
        const input=row.querySelector('.coach-submit-inducement-variable-cost');
        if(input){
          input.disabled=ctvRole==='EQUAL'||Number(qty.value)===0;
          if(input.disabled) input.value='';
        }
        updateInducementFunding();
      };
      inducementBody.appendChild(row);
    });

    if(!inducementRules.length){
      const row=document.createElement('tr');
      const cell=document.createElement('td');
      cell.colSpan=8;
      cell.textContent='No legal inducements are available for this team.';
      row.appendChild(cell);
      inducementBody.appendChild(row);
    }

    function updateInducementFunding(){
      const rows=Array.from(inducementBody.querySelectorAll('tr[data-inducement]')).map(function(row){
        
      const qty=row.querySelector('.coach-submit-inducement-qty');
      const quantity=Number(qty?qty.value:0)||0;
      const variableCost=row.dataset.variableCost==='true';
      const unitCost=variableCost?0:Number(row.dataset.cost)||0;
      const costInput=row.querySelector('.coach-submit-inducement-variable-cost');
      const costText=costInput?String(costInput.value||'').replace(/,/g,'').trim():'';
      const totalCost=variableCost?(quantity>0?Number(costText)||0:0):quantity*unitCost;
      
      return {
        row:row,
        inducement:String(row.dataset.inducement||''),
        qty:quantity,
        unitCost:unitCost,
        totalCost:totalCost,
        variableCost:variableCost,
        costText:costText
      };
      });

      const totalPurchased=rows.reduce(function(sum,item){ return sum+item.totalCost; },0);

      let highSpend=0;
      let pettyAvailable=0;
      let pettyUsed=0;
      let treasuryUsed=0;
      let valid=true;
      let error='';

      const invalidVariable=rows.find(function(item){
        if(!item.variableCost||item.qty===0) return false;
        return !/^\d+$/.test(item.costText) ||
          item.totalCost<5000 ||
          item.totalCost>9999999 ||
          item.totalCost%5000!==0;
      });

      if(ctvRole==='HIGHER'){
        highSpend=totalPurchased;
        treasuryUsed=totalPurchased;

        setInducementInput(inducementHighSpend,highSpend);
        setInducementInput(inducementTreasury,treasuryUsed);

        inducementHighSpend.disabled=true;
        inducementTreasury.disabled=true;

        if(totalPurchased>treasuryAvailable){
          valid=false;
          error='Inducement purchases exceed this team\'s available Treasury.';
        }
      }
      else if(ctvRole==='LOWER'){
        inducementHighSpend.disabled=false;
        inducementTreasury.disabled=false;

        highSpend=inducementInputValue(inducementHighSpend);
        pettyAvailable=ctvDifference+highSpend;

        let enteredTreasury=inducementInputValue(inducementTreasury);
        enteredTreasury=Math.min(enteredTreasury,lowerTreasuryMax,totalPurchased);

        const requiredTreasury=Math.max(0,totalPurchased-pettyAvailable);

        if(requiredTreasury<=lowerTreasuryMax&&enteredTreasury<requiredTreasury){
          enteredTreasury=requiredTreasury;
        }

        setInducementInput(inducementTreasury,enteredTreasury);

        treasuryUsed=enteredTreasury;
        pettyUsed=Math.max(0,totalPurchased-treasuryUsed);

        if(requiredTreasury>lowerTreasuryMax){
          valid=false;
          error='These inducements require more than the allowed 50,000 Treasury contribution.';
        }
        else if(pettyUsed>pettyAvailable){
          valid=false;
          error='These inducements exceed the available Petty Cash plus allowed Treasury.';
        }
      }
      else{
        setInducementInput(inducementHighSpend,0);
        setInducementInput(inducementTreasury,0);

        inducementHighSpend.disabled=true;
        inducementTreasury.disabled=true;

        if(totalPurchased>0){
          valid=false;
          error='CTV is equal. Treasury cannot be spent on Inducements.';
        }
      }

      if(ctvRole==='HIGHER') pettyUsed=0;
      if(ctvRole==='EQUAL'){ pettyAvailable=0; pettyUsed=0; treasuryUsed=0; highSpend=0; }

      let pettyRemaining=pettyUsed;
      const purchases=[];

      rows.forEach(function(item){
        let rowPetty=0;
        let rowTreasury=0;

        if(item.qty>0){
          if(ctvRole==='LOWER'){
            rowPetty=Math.min(item.totalCost,pettyRemaining);
            pettyRemaining-=rowPetty;
            rowTreasury=item.totalCost-rowPetty;
          }
          else if(ctvRole==='HIGHER'){
            rowTreasury=item.totalCost;
          }

          const fundingSource=rowPetty>0&&rowTreasury>0?'Mixed':rowPetty>0?'Petty Cash':rowTreasury>0?'Treasury':'';

          purchases.push({
            inducement:item.inducement,
            qty:item.qty,
            unitCost:item.unitCost,
            totalCost:item.totalCost,
            pettyCashUsed:rowPetty,
            treasuryUsed:rowTreasury,
            fundingSource:fundingSource
          });

          item.row.querySelector('.coach-submit-inducement-row-source').textContent=fundingSource||'-';
        }
        else{
          item.row.querySelector('.coach-submit-inducement-row-source').textContent='-';
        }

        if(!item.variableCost){
          item.row.querySelector('.coach-submit-inducement-row-total').textContent=formatGold(item.totalCost);
        }
        item.row.querySelector('.coach-submit-inducement-row-petty').textContent=formatGold(rowPetty);
        item.row.querySelector('.coach-submit-inducement-row-treasury').textContent=formatGold(rowTreasury);
      });

      inducementPetty.textContent=formatGold(pettyAvailable);
      inducementTotal.textContent=formatGold(totalPurchased);

      inducementMessage.className='coach-game-submission-message';

      if(invalidVariable){
        valid=false;
        error='Enter a valid Star Player total cost in multiples of 5,000 GP.';
      }
      
      if(!valid){
        inducementMessage.classList.add('is-error');
        inducementMessage.textContent=error;
      }
      else if(ctvRole==='LOWER'){
        inducementMessage.textContent='Petty Cash used: '+formatGold(pettyUsed)+' | Treasury used: '+formatGold(treasuryUsed)+' | Treasury limit: '+formatGold(lowerTreasuryMax);
      }
      else if(ctvRole==='HIGHER'){
        inducementMessage.textContent='Inducement spend comes from Treasury. Available Treasury: '+formatGold(treasuryAvailable);
      }
      else{
        inducementMessage.textContent='CTV is equal. Neither team may spend Treasury on Inducements.';
      }

      inducementFundingState={
        valid:valid,
        error:error,
        higherCtvTreasurySpent:highSpend,
        pettyCashAvailable:pettyAvailable,
        pettyCashUsed:pettyUsed,
        treasuryUsed:treasuryUsed,
        totalPurchased:totalPurchased,
        purchases:purchases
      };
    }

    inducementHighSpend.oninput=updateInducementFunding;
    inducementTreasury.oninput=updateInducementFunding;
    updateInducementFunding();

    message.className='coach-game-submission-message';
    message.textContent='Complete the Game Day Pack entries, then select Review Entries.';

    // =====================================================
    // PRE-GAME FAN CALCULATION
    // =====================================================
    function updateFans(){
      const homeRoll=homeFair.value===''?null:Number(homeFair.value);
      const awayRoll=awayFair.value===''?null:Number(awayFair.value);

      const homeValue=homeRoll===null?null:Number(game.homeDfBefore||0)+homeRoll;
      const awayValue=awayRoll===null?null:Number(game.awayDfBefore||0)+awayRoll;

      homeFactor.textContent=homeValue===null?'-':homeValue;
      awayFactor.textContent=awayValue===null?'-':awayValue;
      attendance.textContent=(homeValue===null||awayValue===null)?'-':homeValue+awayValue;
    }

    homeFair.onchange=updateFans;
    awayFair.onchange=updateFans;
    updateFans();

    // =====================================================
    // SCORE / RESULT
    // =====================================================
    function scoreValue(input){
      const value=String(input.value||'').trim();
      return /^\d+$/.test(value)?Number(value):null;
    }

    // =====================================================
    // SCORE / RESULT + DEDICATED FANS PREVIEW
    // =====================================================
    function updateResults(){
      const home=scoreValue(homeScore);
      const away=scoreValue(awayScore);
    
      function enableSubmittingDfRoll(enabled){
        homeDfRoll.disabled=!submittingIsHome||!enabled;
        awayDfRoll.disabled=submittingIsHome||!enabled;
        if(submittingIsHome) awayDfRoll.value=''; else homeDfRoll.value='';
      }
    
      function previewDf(before,result,roll,changeEl,afterEl){
        if(!changeEl||!afterEl) return;
    
        if(result==='DRAW'){
          changeEl.textContent='0';
          afterEl.textContent=String(before);
          return;
        }
    
        if(!roll){
          changeEl.textContent='—';
          afterEl.textContent='—';
          return;
        }
    
        let change=0;
        if(result==='WIN'&&roll>=before) change=1;
        if(result==='LOSS'&&roll<=before) change=-1;
    
        const after=Math.max(1,Math.min(7,before+change));
        changeEl.textContent=change>0?'+1':String(change);
        afterEl.textContent=String(after);
      }
    
      if(home===null||away===null){
        postHomeResult.textContent='-'; postAwayResult.textContent='-';
        postHomeChange.textContent='—'; postAwayChange.textContent='—';
        postHomeAfter.textContent='—'; postAwayAfter.textContent='—';
        enableSubmittingDfRoll(true);
        return;
      }
    
      if(home===away){
        postHomeResult.textContent='DRAW'; postAwayResult.textContent='DRAW';
        homeDfRoll.value=''; awayDfRoll.value='';
        enableSubmittingDfRoll(false);
        previewDf(Number(game.homeDfBefore)||0,'DRAW',0,postHomeChange,postHomeAfter);
        previewDf(Number(game.awayDfBefore)||0,'DRAW',0,postAwayChange,postAwayAfter);
        return;
      }
    
      const homeResult=home>away?'WIN':'LOSS';
      const awayResult=away>home?'WIN':'LOSS';
    
      postHomeResult.textContent=homeResult;
      postAwayResult.textContent=awayResult;
      enableSubmittingDfRoll(true);
    
      previewDf(Number(game.homeDfBefore)||0,homeResult,Number(homeDfRoll.value)||0,postHomeChange,postHomeAfter);
      previewDf(Number(game.awayDfBefore)||0,awayResult,Number(awayDfRoll.value)||0,postAwayChange,postAwayAfter);
    }

    homeScore.oninput=updateResults;
    awayScore.oninput=updateResults;
    homeDfRoll.onchange=updateResults;
    awayDfRoll.onchange=updateResults;
    updateResults();

    // =====================================================
    // FORFEIT - SCORE PREVIEW / STAGED SUBMISSION
    // =====================================================
    let normalGameValues=null;
    let forfeitControlValues=null;

    function refreshForfeitFields(){
      const homeLost=homeForfeit.value==='Yes',awayLost=awayForfeit.value==='Yes';
      const active=homeLost||awayLost;
      const teamWins=active && !(homeLost&&awayLost) && (submittingIsHome?!homeLost:!awayLost);
      const lockControls=[homeFair,awayFair,inducementHighSpend,inducementTreasury,apothecaryUsed];
      const inducementControls=Array.from(inducementBody.querySelectorAll('select,input'));
      const playerRows=Array.from(body.querySelectorAll('tr[data-player-id]'));

      if(active && !forfeitControlValues){
        forfeitControlValues={homeFair:homeFair.value,awayFair:awayFair.value,apothecary:apothecaryUsed.value,
          inducements:inducementControls.map(el=>({el:el,value:el.value,disabled:el.disabled})),
          mvp:playerRows.map(row=>({el:row.querySelector('.coach-submit-mvp'),value:row.querySelector('.coach-submit-mvp')?.value||''}))};
      }
      if(!active && forfeitControlValues){
        homeFair.value=forfeitControlValues.homeFair; awayFair.value=forfeitControlValues.awayFair;
        apothecaryUsed.value=forfeitControlValues.apothecary;
        forfeitControlValues.inducements.forEach(x=>{x.el.value=x.value;x.el.disabled=x.disabled;});
        forfeitControlValues.mvp.forEach(x=>{if(x.el)x.el.value=x.value;});
        forfeitControlValues=null;
        updateInducementFunding();
      }
      [homeFair,awayFair,apothecaryUsed].forEach(el=>{el.disabled=active||(!active&&el===apothecaryUsed&&!ownsApothecary);});
      if(active){
        inducementControls.forEach(el=>{el.disabled=true;});
        forfeitControlValues.mvp.forEach(x=>{if(x.el)x.el.value='';});
      }
      playerRows.forEach(row=>{
        row.querySelectorAll('input.coach-game-submission-stat,.coach-submit-injury-result,.coach-submit-lasting-injury,.coach-submit-casualty-source,.coach-submit-hatred-roll,.coach-submit-hatred-keyword').forEach(el=>{el.disabled=active;});
        const mvp=row.querySelector('.coach-submit-mvp');
        if(mvp) mvp.disabled=active&&!teamWins;
      });
      if(active){
        const allMvp=playerRows.map(row=>row.querySelector('.coach-submit-mvp')).filter(Boolean);
        allMvp.forEach(sel=>{sel.disabled=!teamWins;});
      }
      inducementMessage.textContent=active?'Not applicable: fixture not played.':'';
    }

    
    function updateForfeitPreview(){
      const homeLost=homeForfeit.value==='Yes';
      const awayLost=awayForfeit.value==='Yes';
      const isForfeit=homeLost||awayLost;
    
      if(isForfeit){
        if(!normalGameValues) normalGameValues={home:homeScore.value,away:awayScore.value,homeStalled:homeStalled.value,awayStalled:awayStalled.value};
    
        homeScore.value=homeLost?'0':'2';
        awayScore.value=awayLost?'0':'2';
        homeScore.disabled=true;
        awayScore.disabled=true;
        homeStalled.value='';
        awayStalled.value='';
        homeStalled.disabled=true;
        awayStalled.disabled=true;
    
        updateResults();
        homeDfRoll.value='';
        awayDfRoll.value='';
        homeDfRoll.disabled=true;
        awayDfRoll.disabled=true;
    
        reviewButton.disabled=false;
        refreshForfeitFields();
        message.className='coach-game-submission-message';
        message.textContent=homeLost&&awayLost
          ?'DOUBLE FORFEIT: Both teams lose 0-0. Select Review Entries to submit for commissioner review.'
          :'FORFEIT: '+(homeLost?game.homeTeam:game.awayTeam)+' forfeits. Opponent wins 2-0. Select Review Entries to report it.';
        return;
      }
    
      if(normalGameValues){
        homeScore.value=normalGameValues.home;
        awayScore.value=normalGameValues.away;
        homeStalled.value=normalGameValues.homeStalled;
        awayStalled.value=normalGameValues.awayStalled;
        normalGameValues=null;
      }
    
      homeScore.disabled=false;
      awayScore.disabled=false;
      homeStalled.disabled=false;
      awayStalled.disabled=false;
      reviewButton.disabled=false;
      refreshForfeitFields();
      message.className='coach-game-submission-message';
      message.textContent='Complete the Game Day Pack entries, then select Review Entries.';
      updateResults();
    }
    
    homeForfeit.onchange=updateForfeitPreview;
    awayForfeit.onchange=updateForfeitPreview;

    // =====================================================
    // PLAYER STATS
    // =====================================================
    body.innerHTML='';

    function createStatInput(field,max){
      const input=document.createElement('input');
      input.type='text';
      input.inputMode='numeric';
      input.maxLength=2;
      input.className='coach-game-submission-stat';
      input.dataset.field=field;
      input.dataset.max=max===undefined?'':String(max);
      return input;
    }

    function createInjurySelect(){
      const select=document.createElement('select');
      select.className='coach-submit-injury-result';
      select.innerHTML=
        '<option value="">-</option>'+
        '<option value="Badly Hurt">Badly Hurt</option>'+
        '<option value="Seriously Hurt">Seriously Hurt</option>'+
        '<option value="Serious Injury">Serious Injury</option>'+
        '<option value="Lasting Injury">Lasting Injury</option>'+
        '<option value="Dead">Dead</option>';
      return select;
    }

    function createLastingSelect(){
      const select=document.createElement('select');
      select.className='coach-submit-lasting-injury is-hidden';
      select.innerHTML=
        '<option value="">Select Lasting Injury</option>'+
        '<option value="Head Injury">Head Injury</option>'+
        '<option value="Smashed Knee">Smashed Knee</option>'+
        '<option value="Broken Arm">Broken Arm</option>'+
        '<option value="Dislocated Hip">Dislocated Hip</option>'+
        '<option value="Broken Shoulder">Broken Shoulder</option>';
      return select;
    }

    (result.players||[]).forEach(function(player){
      const row=document.createElement('tr');
      row.dataset.playerId=String(player.playerId||'');
      row.dataset.playerNumber=String(player.playerNumber||'');
      row.dataset.playerName=String(player.playerName||'');
      row.dataset.position=String(player.position||'');
      row.dataset.journeyman=player.isJourneyman?'true':'false';

      const number=document.createElement('td');
      number.textContent=displayValue(player.playerNumber);

      const name=document.createElement('td');
      name.className='coach-game-submission-player-cell';

      const nameText=document.createElement('span');
      nameText.className='coach-game-submission-player-name';
      nameText.textContent=String(player.playerName||'');
      name.appendChild(nameText);

      if(player.isJourneyman){
        const jmTag=document.createElement('span');
        jmTag.className='coach-game-submission-jm';
        jmTag.textContent='JM';
        name.appendChild(jmTag);
      }

      const position=document.createElement('td');
      position.textContent=displayValue(player.position);

      const fields=['comp','ttm','land','int','td','cas','kills'];
      const statCells=fields.map(function(field){
        const cell=document.createElement('td');
        cell.appendChild(createStatInput(field));
        return cell;
      });

      const mvp=document.createElement('td');
      const mvpSelect=document.createElement('select');
      mvpSelect.className='coach-game-submission-stat coach-submit-mvp';
      mvpSelect.dataset.field='mvp';
      mvpSelect.innerHTML='<option value="">-</option><option value="1">1</option>';
      mvp.appendChild(mvpSelect);

      const injury=document.createElement('td');
      injury.className='coach-submit-injury-cell';

      const injurySelect=createInjurySelect();
      const lastingSelect=createLastingSelect();

      injurySelect.onchange=function(){
        const showLasting=injurySelect.value==='Lasting Injury';
        lastingSelect.classList.toggle('is-hidden',!showLasting);
        if(!showLasting) lastingSelect.value='';
      };

      injury.appendChild(injurySelect);
      injury.appendChild(lastingSelect);
      addCoachGettingEvenControls(injury, injurySelect, result.hatredSources);

      row.appendChild(number);
      row.appendChild(name);
      row.appendChild(position);
      statCells.forEach(function(cell){ row.appendChild(cell); });
      row.appendChild(mvp);
      row.appendChild(injury);

      body.appendChild(row);
    });

    // -----------------------------------------------------
    // MVP - NO MORE THAN TWO PLAYERS ON AN UNPLAYED FIXTURE
    // -----------------------------------------------------
    body.addEventListener('change',function(event){
      if(!event.target.matches('.coach-submit-mvp')) return;
      if(homeForfeit.value!=='Yes'&&awayForfeit.value!=='Yes') return;
      const selected=Array.from(body.querySelectorAll('.coach-submit-mvp')).filter(el=>el.value==='1');
      if(selected.length>2){event.target.value='';message.textContent='Only two different players can receive a forfeit MVP.';}
    });

// =====================================================
// APOTHECARY
// =====================================================
const ownsApothecary=Number(team.apothecary||0)>0;

apothecaryUsed.value='No';
apothecaryUsed.disabled=!ownsApothecary;
apothecaryNote.textContent=ownsApothecary?'Available this game':'No Apothecary rostered';
updateForfeitPreview();

// =====================================================
// BUILD SUBMISSION PAYLOAD
// =====================================================
function collectGameSubmissionPayload(){
  // ---------------------------------------------------
  // FORFEIT - NO MATCH STATS OR INDUCEMENTS
  // ---------------------------------------------------
  const homeLost=homeForfeit.value==='Yes';
  const awayLost=awayForfeit.value==='Yes';
  if(homeLost||awayLost){
    const forfeitMvpPlayerIds=Array.from(body.querySelectorAll('tr[data-player-id]')).filter(row=>row.querySelector('.coach-submit-mvp')?.value==='1').map(row=>row.dataset.playerId);
    return {gameId:String(game.gameId||''),homeForfeit:homeForfeit.value,awayForfeit:awayForfeit.value,homeScore:homeLost?0:2,awayScore:awayLost?0:2,coachNotes:String(notes.value||'').trim(),forfeitMvpPlayerIds:forfeitMvpPlayerIds,players:[],inducements:[]};
  }

  const home=scoreValue(homeScore);
  const away=scoreValue(awayScore);

  const players=Array.from(body.querySelectorAll('tr')).map(function(row){
    function stat(field){
      const input=row.querySelector('[data-field="'+field+'"]');
      const value=String(input?input.value:'').trim();
      return value===''?0:Number(value);
    }
  
    const injury=row.querySelector('.coach-submit-injury-result');
    const lasting=row.querySelector('.coach-submit-lasting-injury');
  
    // Keep every player so Games Played still works,
    // but only send entered results. The server already
    // knows player number, name and position.
    const entry={playerId:String(row.dataset.playerId||'')};
  
    const stats={
      comp:stat('comp'),
      ttm:stat('ttm'),
      land:stat('land'),
      int:stat('int'),
      td:stat('td'),
      cas:stat('cas'),
      kills:stat('kills'),
      mvp:stat('mvp')
    };
  
    Object.keys(stats).forEach(function(key){
      if(stats[key]) entry[key]=stats[key];
    });
  
    if(injury&&injury.value) entry.injuryResult=injury.value;
    if(lasting&&lasting.value) entry.lastingInjury=lasting.value;
    Object.assign(entry, readCoachGettingEven(row, result.hatredSources));
  
    return entry;
  });

  return {
    gameId:String(game.gameId||''),
    homeForfeit:'No',awayForfeit:'No',

    higherCtvTreasurySpent:inducementFundingState.higherCtvTreasurySpent,
    inducementTreasuryUsed:inducementFundingState.treasuryUsed,
    inducements:inducementFundingState.purchases,

    homeFairWeather:Number(homeFair.value),
    awayFairWeather:Number(awayFair.value),

    homeScore:home,
    awayScore:away,

    homeStalled:homeStalled.value,
    awayStalled:awayStalled.value,

    homeDfRoll:home===away?'':(submittingIsHome?Number(homeDfRoll.value):''),
    awayDfRoll:home===away?'':(!submittingIsHome?Number(awayDfRoll.value):''),

    apothecaryUsed:apothecaryUsed.value,
    coachNotes:String(notes.value||'').trim(),
    players:players
  };
}


// =====================================================
// FINAL REVIEW
// =====================================================
function openFinalGameReview(payload){
  const reviewModal=document.getElementById('coach-game-review-modal');
  const reviewMatch=document.getElementById('coach-game-review-match');
  const reviewDetails=document.getElementById('coach-game-review-details');
  const reviewPlayers=document.getElementById('coach-game-review-players');
  const reviewNotes=document.getElementById('coach-game-review-notes');
  const reviewMessage=document.getElementById('coach-game-review-message');
  const backButton=document.getElementById('coach-game-review-back');
  const submitButton=document.getElementById('coach-game-review-submit');
  const reviewInducements=document.getElementById('coach-game-review-inducements');

  if(!reviewModal||!reviewMatch||!reviewDetails||!reviewInducements||!reviewPlayers||!reviewNotes||!reviewMessage||!backButton||!submitButton){
    alert('The Final Review window could not be opened.');
    return;
  }

  const homeFan=Number(game.homeDfBefore||0)+Number(payload.homeFairWeather||0);
  const awayFan=Number(game.awayDfBefore||0)+Number(payload.awayFairWeather||0);
  const attendance=homeFan+awayFan;
  
  const submittingDfRoll=submittingIsHome?payload.homeDfRoll:payload.awayDfRoll;
  const submittingDfTeam=submittingIsHome?game.homeTeam:game.awayTeam;

  reviewMatch.textContent=
    String(game.homeTeam||'HOME')+'  '+payload.homeScore+
    '  —  '+payload.awayScore+'  '+
    String(game.awayTeam||'AWAY');

  reviewDetails.innerHTML=
    '<div class="coach-game-review-detail"><strong>Home Fair-Weather</strong><span>'+escapePortalHtml(payload.homeFairWeather)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Away Fair-Weather</strong><span>'+escapePortalHtml(payload.awayFairWeather)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Home Fan Factor</strong><span>'+escapePortalHtml(homeFan)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Away Fan Factor</strong><span>'+escapePortalHtml(awayFan)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Fan Attendance</strong><span>'+escapePortalHtml(attendance)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Submitting Side</strong><span>'+escapePortalHtml(game.submittingSide||game.side||'')+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Apothecary Rostered</strong><span>'+(Number(team.apothecary||0)>0?'Yes':'No')+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Apothecary Used?</strong><span>'+escapePortalHtml(payload.apothecaryUsed)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Home Stalled?</strong><span>'+escapePortalHtml(payload.homeStalled)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>Away Stalled?</strong><span>'+escapePortalHtml(payload.awayStalled)+'</span></div>'+
    '<div class="coach-game-review-detail"><strong>'+escapePortalHtml(submittingDfTeam)+' DF Roll</strong><span>'+escapePortalHtml(submittingDfRoll===''?'-':submittingDfRoll)+'</span></div>';

  // =====================================================
  // INDUCEMENTS REVIEW
  // =====================================================
  reviewInducements.innerHTML='';

  const reviewPurchases=Array.isArray(payload.inducements)?payload.inducements:[];

  if(!reviewPurchases.length){
    const row=document.createElement('tr');
    const cell=document.createElement('td');

    cell.colSpan=6;
    cell.textContent='No inducements purchased.';

    row.appendChild(cell);
    reviewInducements.appendChild(row);
  }
  else{
    reviewPurchases.forEach(function(item){
      const row=document.createElement('tr');

      [item.inducement,item.qty,formatGold(item.totalCost),formatGold(item.pettyCashUsed),formatGold(item.treasuryUsed),item.fundingSource].forEach(function(value){
        const cell=document.createElement('td');
        cell.textContent=displayValue(value);
        row.appendChild(cell);
      });

      reviewInducements.appendChild(row);
    });
  }

  reviewPlayers.innerHTML='';

  const meaningfulPlayers=payload.players.filter(function(player){
    return Number(player.comp)||Number(player.ttm)||Number(player.land)||Number(player.int)||
           Number(player.td)||Number(player.cas)||Number(player.kills)||Number(player.mvp)||
           String(player.injuryResult||'').trim();
  });

  if(!meaningfulPlayers.length){
    const row=document.createElement('tr');
    const cell=document.createElement('td');

    cell.colSpan=3;
    cell.textContent='No player statistics or injuries recorded.';

    row.appendChild(cell);
    reviewPlayers.appendChild(row);
  }
  else{
    meaningfulPlayers.forEach(function(player){
      const row=document.createElement('tr');

      const sourceRow=Array.from(body.querySelectorAll('tr')).find(function(item){
        return String(item.dataset.playerId||'')===String(player.playerId||'');
      });
      
      const number=document.createElement('td');
      number.textContent=sourceRow?String(sourceRow.dataset.playerNumber||''):'';
      
      const name=document.createElement('td');
      name.textContent=sourceRow?String(sourceRow.dataset.playerName||''):'';
      
      const resultCell=document.createElement('td');

      const parts=[];

      if(player.comp) parts.push('COMP '+player.comp);
      if(player.ttm) parts.push('TTM '+player.ttm);
      if(player.land) parts.push('LAND '+player.land);
      if(player.int) parts.push('INT '+player.int);
      if(player.td) parts.push('TD '+player.td);
      if(player.cas) parts.push('CAS '+player.cas);
      if(player.kills) parts.push('KILLS '+player.kills);
      if(player.mvp) parts.push('MVP '+player.mvp);

      if(player.injuryResult){
        parts.push(
          player.injuryResult==='Lasting Injury'
            ?'Lasting Injury — '+player.lastingInjury
            :player.injuryResult
        );
      }

      if(player.causedByPlayerId){
        const cause=result.hatredSources.find(source=>source.playerId===player.causedByPlayerId);

        parts.push('Caused by '+(cause?'#'+cause.playerNumber+' '+cause.playerName:player.causedByPlayerId)+' ['+player.causedByPlayerId+']');
        parts.push('Getting Even D6 '+player.hatredRoll);
        parts.push(player.hatredKeyword?'Hatred ('+player.hatredKeyword+')':'No Hatred gained');
      }
      else if(coachGettingEvenApplies(player.injuryResult)){
        parts.push('No opposing player; no Hatred recorded');
      }
      
      resultCell.textContent=parts.join(' | ');

      row.appendChild(number);
      row.appendChild(name);
      row.appendChild(resultCell);

      reviewPlayers.appendChild(row);
    });
  }

  // ---------------------------------------------------
  // FORFEIT - OVERRIDE NORMAL MATCH REVIEW DETAILS
  // ---------------------------------------------------
  const isForfeit=payload.homeForfeit==='Yes'||payload.awayForfeit==='Yes';
  if(isForfeit){
    const type=payload.homeForfeit==='Yes'&&payload.awayForfeit==='Yes'?'Double Forfeit':payload.homeForfeit==='Yes'?'Home Forfeit':'Away Forfeit';
    reviewDetails.innerHTML='<div class="coach-game-review-detail"><strong>Resolution</strong><span>'+escapePortalHtml(type)+'</span></div>'+
      '<div class="coach-game-review-detail"><strong>Home forfeits?</strong><span>'+escapePortalHtml(payload.homeForfeit)+'</span></div>'+
      '<div class="coach-game-review-detail"><strong>Away forfeits?</strong><span>'+escapePortalHtml(payload.awayForfeit)+'</span></div>'+
      '<div class="coach-game-review-detail"><strong>Result</strong><span>Unplayed fixture — commissioner review required</span></div>';
    reviewInducements.innerHTML='<tr><td colspan="6">None — match not played.</td></tr>';
    const mvpChoices=(payload.forfeitMvpPlayerIds||[]).map(id=>{
      const row=Array.from(body.querySelectorAll('tr[data-player-id]')).find(x=>x.dataset.playerId===id);
      return row?('#'+row.dataset.playerNumber+' '+row.dataset.playerName):id;
    });
    reviewPlayers.innerHTML='<tr><td colspan="3">'+(mvpChoices.length?'Forfeit MVP nominations: '+escapePortalHtml(mvpChoices.join(' / ')):'No MVP awards nominated for this team.')+'</td></tr>';
  }

  reviewNotes.textContent=payload.coachNotes||'None';

  reviewMessage.className='coach-game-review-warning';
  reviewMessage.textContent=isForfeit
    ?'Confirm which team forfeited. This will record a report only; no scores, SPP, winnings or league results will be posted until commissioner resolution.'
    :'Check the information carefully before submitting. Once submitted, this game will be sent to the commissioner for review.';

  modal.hidden=true;
  reviewModal.hidden=false;

  document.removeEventListener('keydown',handleKey);

  backButton.onclick=function(){
    reviewModal.hidden=true;
    modal.hidden=false;
    document.addEventListener('keydown',handleKey);
  };

  submitButton.onclick=async function(){
    submitButton.disabled=true;
    submitButton.textContent='Submitting...';

    reviewMessage.className='coach-game-review-warning';
    reviewMessage.textContent='Submitting game...';

    try{
      const submitted=await coachApiSubmitGameSubmissionRequest(accessCode,payload);

      if(!submitted||submitted.ok!==true||submitted.submitted!==true){
        throw new Error(submitted&&submitted.error?submitted.error:'The game could not be submitted.');
      }

      reviewModal.hidden=true;
      modal.hidden=true;
      coachGameSubmissionCache=null;
      
      // =====================================================
      // IMMEDIATELY LOCK THE SUBMITTED FIXTURE
      // Do not make the coach wait for the portal refresh.
      // =====================================================
      if(launchButton){
        launchButton.disabled=true;
        launchButton.textContent='Game Submitted';
        launchButton.title='This game has already been submitted.';
        launchButton.onclick=null;
      }
      
      setCoachPendingGameNotice(true,submitted.validationStatus==='Mismatch'||submitted.validationStatus==='Pending Commissioner Review');
      setCoachGameDayPackState(submitted.validationStatus==='Pending Commissioner Review'?'review':'pending',game.gameId);
      showCoachGameSubmissionResult(submitted);
      
      // Refresh the full portal in the background.
      coachApiRequest(accessCode)
        .then(function(data){
          if(data&&data.ok===true) renderCoachPortal(data);
        })
        .catch(function(refreshError){
          console.error('Coach Portal refresh failed:',refreshError);
        });
    }
    catch(error){
      reviewMessage.className='coach-game-review-warning is-error';
      reviewMessage.textContent=error&&error.message?error.message:'The game submission failed.';
    }
    finally{
      submitButton.disabled=false;
      submitButton.textContent='Submit Game';
    }
  };
}

// =====================================================
// VALIDATE THEN REVIEW
// =====================================================
reviewButton.onclick=function(){
  message.className='coach-game-submission-message';

  // ---------------------------------------------------
  // FORFEIT - SKIP ALL PLAYED-GAME VALIDATION
  // ---------------------------------------------------
  if(homeForfeit.value==='Yes'||awayForfeit.value==='Yes'){
    const homeLost=homeForfeit.value==='Yes',awayLost=awayForfeit.value==='Yes';
    const winningCoach=!(homeLost&&awayLost)&&(submittingIsHome?!homeLost:!awayLost);
    const selected=Array.from(body.querySelectorAll('.coach-submit-mvp')).filter(el=>el.value==='1');
    if(selected.length!==(winningCoach?2:0)){
      message.classList.add('is-error');
      message.textContent=winningCoach?'Select exactly two different players to receive the winner’s MVP awards.':'No MVPs can be awarded to a forfeiting team.';
      return;
    }
    const coachNotes=String(notes.value||'').trim();
    if(coachNotes.length>500){ message.classList.add('is-error'); message.textContent='Coach Notes cannot exceed 500 characters.'; return; }
    openFinalGameReview(collectGameSubmissionPayload());
    return;
  }

  updateInducementFunding();

  if(!inducementFundingState.valid){
    message.classList.add('is-error');
    message.textContent=inducementFundingState.error||'Check the Inducement purchases and funding.';
    inducementBody.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }

  const home=scoreValue(homeScore);
  const away=scoreValue(awayScore);

  if(home===null||away===null){
    message.classList.add('is-error');
    message.textContent='Enter both final scores.';
    return;
  }

  if(!homeFair.value||!awayFair.value){
    message.classList.add('is-error');
    message.textContent='Enter both Fair-Weather D3 rolls.';
    return;
  }

  if(!homeStalled.value||!awayStalled.value){
    message.classList.add('is-error');
    message.textContent='Select Stalled? for both teams.';
    return;
  }

  const submittingDfRoll=submittingIsHome?homeDfRoll:awayDfRoll;

  if(home!==away&&!submittingDfRoll.value){
    message.classList.add('is-error');
    message.textContent='Enter your Post-Game Dedicated Fans D6 roll.';
    return;
  }

  const statInputs=Array.from(body.querySelectorAll('input.coach-game-submission-stat'));

  const invalidStat=statInputs.find(function(input){
    const value=String(input.value||'').trim();

    if(value==='') return false;
    if(!/^\d+$/.test(value)) return true;

    const max=input.dataset.max!==''?Number(input.dataset.max):null;

    return max!==null&&Number(value)>max;
  });

  if(invalidStat){
    invalidStat.focus();
    message.classList.add('is-error');
    message.textContent='Player stat entries must be whole numbers.';
    return;
  }

  const injuryCells=Array.from(body.querySelectorAll('.coach-submit-injury-cell'));

  const missingLasting=injuryCells.find(function(cell){
    const injury=cell.querySelector('.coach-submit-injury-result');
    const lasting=cell.querySelector('.coach-submit-lasting-injury');

    return injury&&lasting&&injury.value==='Lasting Injury'&&!lasting.value;
  });

  if(missingLasting){
    missingLasting.querySelector('.coach-submit-lasting-injury').focus();
    message.classList.add('is-error');
    message.textContent='Select the specific Lasting Injury.';
    return;
  }

  let payload;

  try{
    payload=collectGameSubmissionPayload();
  }
  catch(error){
    message.classList.add('is-error');
    message.textContent=error.message||'Check the Getting Even entries.';
    if(error.field) error.field.focus();
    return;
  }

  message.classList.add('is-success');
  message.textContent='Entries look valid. Opening Final Review...';

  openFinalGameReview(payload);
};
    
    // =====================================================
    // CLOSE MODAL
    // =====================================================
    function closeModal(){
      modal.hidden=true;
      reportCoachPortalHeight();
      closeButton.onclick=null;
      reviewButton.onclick=null;
      modal.onclick=null;
      document.removeEventListener('keydown',handleKey);
    }

    function handleKey(event){
      if(event.key==='Escape') closeModal();
    }

    closeButton.onclick=closeModal;
    document.addEventListener('keydown',handleKey);

    modal.hidden=false;
    reportCoachPortalHeight();
    setTimeout(reportCoachPortalHeight,50);
    homeFair.focus();
  }
  catch(error){
    alert(error&&error.message?error.message:'Unable to load the game submission.');
  }
  finally{
    if(launchButton){ launchButton.disabled=false; launchButton.textContent='Submit Game'; }
  }
}

// =====================================================
// FIXTURE TEAM DISPLAY
// =====================================================
function displayTeamForGame(teamId,team,coach){
  const id=String(teamId||'').trim();
  const ownId=String(team.teamId||coach.teamId||'').trim();

  if(id&&id===ownId){
    return team.teamName||coach.teamName||id;
  }

  return id||'-';
}

// =====================================================
// ROSTER
// =====================================================
function renderCoachRoster(players,journeymen=[]){
  const body=document.getElementById('coach-roster-body');
  if(!body) return;

  // =====================================================
  // INCLUDE ASSIGNED JOURNEYMEN IN THE ROSTER DISPLAY
  // =====================================================
  const rosterPlayers=players.concat((journeymen||[]).map(jm=>({
    ...jm,
    isJourneyman:true,
    status:'Journeyman',
    mng:'No',
    niggling:0
  })));

  body.innerHTML='';

  if(!rosterPlayers.length){
    const row=document.createElement('tr');
    const cell=document.createElement('td');
    cell.colSpan=12;
    cell.textContent='No players found.';
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  // ---------------------------------------------------
  // ROSTER DISPLAY ORDER
  // Active → MNG → Retired/Released → Dead
  // ---------------------------------------------------
  const sortedPlayers=rosterPlayers.slice().sort(function(a,b){
    function rosterRank(player){
      const status=String(player.status||'').trim().toLowerCase();
      const mng=String(player.mng||'').trim().toLowerCase()==='yes';
  
      if(status==='dead') return 3;
      if(status==='retired'||status==='released') return 2;
      if(mng) return 1;
      return 0;
    }
  
    return rosterRank(a)-rosterRank(b);
  });
  
  sortedPlayers.forEach(function(player){
    const row=document.createElement('tr');
    const playerStatus=String(player.status||'').trim().toLowerCase();

    // ---------------------------------------------------
    // PLAYER ROW STATE
    // ---------------------------------------------------
    if(playerStatus==='dead') row.classList.add('coach-player-dead');
    if(playerStatus==='retired') row.classList.add('coach-player-retired');

    
    // =====================================================
    // JOURNEYMAN PLAYER NUMBER - INLINE EDITOR
    // =====================================================
    appendCell(row,player.number);
    if(player.isJourneyman){
      const cell=row.lastElementChild;
      const edit=document.createElement('button');
      edit.type='button'; edit.textContent='✎'; edit.title='Edit Journeyman number';
      edit.style.cssText='margin-left:5px;cursor:pointer;padding:1px 4px;font-size:11px;';
      cell.appendChild(edit);


      // =====================================================
      // JOURNEYMAN NUMBER - FLOATING EDIT PANEL
      // =====================================================
      edit.onclick=function(){
        document.querySelectorAll('.jm-number-editor').forEach(el=>el.remove());

        const panel=document.createElement('div');
        panel.className='jm-number-editor';
        panel.style.cssText='position:fixed;z-index:99999;width:205px;padding:12px;background:#fff;border:1px solid #8da6b1;border-radius:8px;box-shadow:0 6px 22px rgba(0,0,0,.25);font-family:inherit;color:#173d4d;';

        const title=document.createElement('div');
        title.textContent='EDIT JOURNEYMAN #';
        title.style.cssText='font-size:12px;font-weight:bold;margin-bottom:8px;';

        const controls=document.createElement('div');
        controls.style.cssText='display:flex;align-items:center;gap:6px;';

        const input=document.createElement('input');
        input.type='number'; input.min='1'; input.max='99';
        input.value=String(player.number||20);
        input.style.cssText='width:54px;min-width:0;padding:6px;border:1px solid #9aadb5;border-radius:4px;font-size:13px;';

        const save=document.createElement('button');
        save.type='button'; save.textContent='SAVE';
        save.style.cssText='padding:7px 10px;background:#17495c;color:white;border:0;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;';

        const cancel=document.createElement('button');
        cancel.type='button'; cancel.textContent='✕';
        cancel.style.cssText='padding:7px 9px;background:#edf1f3;border:1px solid #b9c8ce;border-radius:4px;cursor:pointer;';

        const message=document.createElement('div');
        message.style.cssText='margin-top:6px;color:#b3261e;font-size:11px;';

        controls.append(input,save,cancel);
        panel.append(title,controls,message);
        document.body.appendChild(panel);

        // Position beside the pencil without changing table dimensions.
        const rect=edit.getBoundingClientRect();
        const left=Math.max(8,Math.min(rect.right+8,window.innerWidth-225));
        const top=Math.max(8,Math.min(rect.top-12,window.innerHeight-135));
        panel.style.left=left+'px'; panel.style.top=top+'px';

        const close=()=>panel.remove();
        cancel.onclick=close;
        input.focus(); input.select();

        input.addEventListener('keydown',e=>{
          if(e.key==='Enter') save.click();
          if(e.key==='Escape') close();
        });

        save.onclick=async function(){
          const number=Number(input.value);
          if(!input.value.trim()||!Number.isInteger(number)||number<1||number>99){
            message.textContent='Choose a number from 1 to 99.'; return;
          }

          const code=sessionStorage.getItem(SESSION_KEY)||'';
          if(!code){message.textContent='Session expired. Please log in.';return;}

          save.disabled=true; cancel.disabled=true;
          message.style.color='#173d4d'; message.textContent='Saving...';

          try{
            const result=await coachApiPlayerRequest('coachjourneymannumber',{
              code:code,journeymanId:player.journeymanId,number:number
            },'Unable to save Journeyman number.');

            if(!result||result.ok!==true) throw new Error(result?.error||'Number update failed.');

            const data=await coachApiRequest(code);
            if(!data||data.ok!==true) throw new Error('Saved, but unable to refresh roster.');

            close();
            renderCoachPortal(data);
          }
          catch(error){
            message.style.color='#b3261e';
            message.textContent=error.message||'Unable to save.';
            save.disabled=false; cancel.disabled=false;
          }
        };
      };
    }

    appendCell(row,player.playerName);
    appendCell(row,player.position);
    appendCell(row,player.ma);
    appendCell(row,player.st);
    appendCell(row,player.ag);
    appendCell(row,player.pa);
    appendCell(row,player.av);
    appendCell(row,player.skills);
    if(/\bhatred\s*\(/i.test(String(player.skills||''))){
      row.lastElementChild.title=COACH_HATRED_DESCRIPTION;
      row.lastElementChild.setAttribute('aria-label',String(player.skills)+'. '+COACH_HATRED_DESCRIPTION);
    }
    appendCell(row,player.spp);
    appendCell(row,formatGold(player.value));

    // ---------------------------------------------------
    // STATUS + RETIRE PLAYER
    // ---------------------------------------------------
    let status=player.status||'';

    if(String(player.mng||'').toLowerCase()==='yes'){
      status+=status?' / MNG':'MNG';
    }

    if(Number(player.niggling||0)>0){
      status+=' / Niggling '+Number(player.niggling);
    }

    const statusCell=document.createElement('td');
    statusCell.className='coach-roster-status-cell';
    
    const statusContent=document.createElement('div');
    statusContent.className='coach-roster-status-content';
    
    const statusText=document.createElement('span');
    statusText.className='coach-roster-status-text';
    statusText.textContent=displayValue(status);
    
    statusContent.appendChild(statusText);
    statusCell.appendChild(statusContent);
    
    if(playerStatus==='active'&&!player.isJourneyman){
      const retireButton=document.createElement('button');
      retireButton.type='button';
      retireButton.className='coach-roster-retire-button';
      retireButton.textContent='×';
      retireButton.title='Retire '+player.playerName;
      retireButton.setAttribute('aria-label','Retire '+player.playerName);

      retireButton.onclick=async function(){
        const accessCode=sessionStorage.getItem(SESSION_KEY)||'';

        if(!accessCode){
          alert('Your Coach Portal session has expired. Please log in again.');
          return;
        }

        const confirmed=await showCoachRetirementConfirmation(player);
        if(!confirmed) return;

        retireButton.disabled=true;
        retireButton.textContent='…';

        try{
          const result=await coachApiSubmitPlayerRetirementRequest(accessCode,player.playerId);

          if(!result||result.ok!==true||result.submitted!==true||result.retired!==true){
            throw new Error(
              result&&result.error
                ?result.error
                :'The player could not be retired.'
            );
          }

          if(!result.team||!result.management||!Array.isArray(result.players)){
            throw new Error('The player was retired, but updated team data was not returned.');
          }

          renderCoachManagement(result.team,result.management);

          const currentPlayers=result.players.filter(function(item){
            return !isCoachPlayerOffRoster(item.status);
          }).length;

          setText('coach-management-players',currentPlayers);
          renderCoachRoster(result.players);

          const advancementPlayers=
            result.advancements&&Array.isArray(result.advancements.players)
              ?result.advancements.players
              :[];

          renderCoachAdvancements(advancementPlayers);

          showCoachRosterSuccess(
            '#'+result.playerNumber+' '+result.playerName+' — '+result.position+' retired.'
          );
        }
        catch(error){
          alert(
            (error&&error.message?error.message:'The player retirement failed.')+
            '\n\nThe portal will refresh before another retirement is attempted.'
          );

          coachApiRequest(accessCode)
            .then(function(data){
              if(data&&data.ok===true) renderCoachPortal(data);
            })
            .catch(function(refreshError){
              console.error('Coach Portal refresh failed:',refreshError);
            });
        }
      };

      statusContent.appendChild(retireButton);
    }

    row.appendChild(statusCell);
    body.appendChild(row);
  });
}

// =====================================================
// LOG OUT
// =====================================================

function logoutCoach() {
  coachGameSubmissionCache=null;
  sessionStorage.removeItem(SESSION_KEY);

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

function showCoachAdvancementSuccess(message) {

  const container = document.getElementById('coach-advancements');

  if (!container) return;

  const success = document.createElement('div');

  success.className = 'coach-advancement-success';

  success.innerHTML = `
    <strong>Advancement successfully recorded</strong>
    <span>${escapePortalHtml(message)}</span>
  `;

  container.prepend(success);

  setTimeout(function() {
    if (success.parentNode) success.remove();
  }, 5000);
}

// =====================================================
// UI MESSAGE - TEAM MANAGEMENT PURCHASE SUCCESS
// =====================================================

function showCoachManagementSuccess(message) {

  const button =
    document.getElementById(
      'coach-management-buy-reroll'
    );

  if (!button) {
    return;
  }


  const panel =
    button.closest(
      '.coach-panel'
    );

  if (!panel) {
    return;
  }


  const existing =
    panel.querySelector(
      '.coach-management-success'
    );

  if (existing) {
    existing.remove();
  }


  const success =
    document.createElement(
      'div'
    );


  success.className =
    'coach-management-success';


  success.innerHTML = `
    <strong>Purchase completed</strong>
    <span>${escapePortalHtml(message)}</span>
  `;


  const heading =
    panel.querySelector(
      'h2'
    );


  if (heading) {

    heading.insertAdjacentElement(
      'afterend',
      success
    );
  }
  else {

    panel.prepend(
      success
    );
  }


  setTimeout(function() {

    if (success.parentNode) {
      success.remove();
    }

  }, 5000);
}

// =====================================================
// GAME SUBMISSION RESULT MESSAGE
// =====================================================
function showCoachGameSubmissionResult(submitted,persistent=false){
  const container=document.getElementById('coach-games');
  if(!container) return;

  const panel=container.closest('.coach-panel');
  if(!panel) return;

  const existing=panel.querySelector('.coach-game-submission-result');
  if(existing) existing.remove();

  const status=String(submitted&&submitted.validationStatus||'').trim();
  const fields=Array.isArray(submitted&&submitted.mismatchFields)?submitted.mismatchFields.filter(Boolean):[];

  let title='Game Submitted';
  let message='Your game submission has been recorded. The game will be validated when both coach submissions are available.';

  if(status==='Pending Commissioner Review'){
    title='Forfeit Reported';
    message='Both coaches reported the same forfeit. Commissioner approval is required before the fixture is resolved.';
  }
  else if(status==='Matched'){
    title='Match Verified';
    message='Both coach submissions match. The game has been completed automatically.';
  }
  else if(status==='Mismatch'){
    title='Commissioner Review Required';
    message='The two coach submissions do not match'+(fields.length?': '+fields.join(', '):'.')+' The game remains pending for commissioner review.';
  }

  const result=document.createElement('div');
  result.className='coach-management-success coach-game-submission-result';
  result.innerHTML='<strong>'+escapePortalHtml(title)+'</strong><span>'+escapePortalHtml(message)+'</span>';

  const heading=panel.querySelector('h2');
  if(heading) heading.insertAdjacentElement('afterend',result);
  else panel.prepend(result);

  if(!persistent){
    setTimeout(function(){
      if(result.parentNode) result.remove();
    },8000);
  }
}

// =====================================================
// ROSTER SUCCESS MESSAGE
// =====================================================
function showCoachRosterSuccess(message){
  const body=document.getElementById('coach-roster-body');
  if(!body) return;

  const panel=body.closest('.coach-panel');
  if(!panel) return;

  const existing=panel.querySelector('.coach-management-success');
  if(existing) existing.remove();

  const success=document.createElement('div');
  success.className='coach-management-success';
  success.innerHTML='<strong>Player retired</strong><span>'+escapePortalHtml(message)+'</span>';

  const heading=panel.querySelector('h2');
  if(heading) heading.insertAdjacentElement('afterend',success);
  else panel.prepend(success);

  setTimeout(function(){
    if(success.parentNode) success.remove();
  },5000);
}

// =====================================================
// GENERAL HELPERS
// =====================================================

function isCoachPlayerOffRoster(status){
  return ['dead','retired','released'].includes(String(status||'').trim().toLowerCase());
}

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
    );
}

// =====================================================
// RETIRE PLAYER CONFIRMATION
// =====================================================
function showCoachRetirementConfirmation(player){
  const modal=document.getElementById('coach-purchase-modal');
  const heading=modal?modal.querySelector('h2'):null;
  const messageText=document.getElementById('coach-purchase-modal-text');
  const costText=document.getElementById('coach-purchase-modal-cost');
  const cancelButton=document.getElementById('coach-purchase-cancel');
  const confirmButton=document.getElementById('coach-purchase-confirm');

  if(!modal||!heading||!messageText||!costText||!cancelButton||!confirmButton) return Promise.resolve(false);

  heading.textContent='Retire Player';
  messageText.textContent='Are you sure you want to retire #'+player.number+' '+player.playerName+'? Career statistics and history will be preserved.';
  costText.textContent='No Treasury refund';
  confirmButton.textContent='Retire Player';
  modal.classList.add('coach-retire-confirmation');
  modal.hidden=false;

  return new Promise(function(resolve){
    let finished=false;

    function close(result){
      if(finished) return;
      finished=true;

      modal.hidden=true;
      modal.classList.remove('coach-retire-confirmation');

      heading.textContent='Confirm Purchase';
      messageText.textContent='Confirm this Team Management purchase?';
      costText.textContent='-';
      confirmButton.textContent='Confirm Purchase';

      cancelButton.onclick=null;
      confirmButton.onclick=null;
      modal.onclick=null;
      document.removeEventListener('keydown',handleKey);

      resolve(result);
    }

    function handleKey(event){
      if(event.key==='Escape') close(false);
    }

    cancelButton.onclick=function(){ close(false); };
    confirmButton.onclick=function(){ close(true); };
    modal.onclick=function(event){ if(event.target===modal) close(false); };

    document.addEventListener('keydown',handleKey);
    confirmButton.focus();
  });
}

// =====================================================
// PURCHASE CONFIRMATION
// =====================================================

function showCoachPurchaseConfirmation(itemLabel, cost) {

  const modal = document.getElementById('coach-purchase-modal');
  const messageText = document.getElementById('coach-purchase-modal-text');
  const costText = document.getElementById('coach-purchase-modal-cost');
  const cancelButton = document.getElementById('coach-purchase-cancel');
  const confirmButton = document.getElementById('coach-purchase-confirm');

  if (
    !modal ||
    !messageText ||
    !costText ||
    !cancelButton ||
    !confirmButton
  ) {
    return Promise.resolve(false);
  }

  messageText.textContent =
    'Buy one ' +
    itemLabel +
    '?';

  costText.textContent =
    formatGold(cost);

  modal.hidden = false;

  return new Promise(function(resolve) {

    let finished = false;

    function close(result) {

      if (finished) return;

      finished = true;
      modal.hidden = true;

      cancelButton.onclick = null;
      confirmButton.onclick = null;
      modal.onclick = null;

      document.removeEventListener(
        'keydown',
        handleKey
      );

      resolve(result);
    }

    function handleKey(event) {

      if (event.key === 'Escape') {
        close(false);
      }
    }

    cancelButton.onclick = function() {
      close(false);
    };

    confirmButton.onclick = function() {
      close(true);
    };

    modal.onclick = function(event) {

      if (event.target === modal) {
        close(false);
      }
    };

    document.addEventListener(
      'keydown',
      handleKey
    );

    confirmButton.focus();
  });
}

// =====================================================
// HTML ESCAPING
// =====================================================
function escapePortalHtml(value) {
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
// ============================================================
// COACH PORTAL — REPORT DYNAMIC HEIGHT TO EMBEDDED SITE
// ============================================================
function reportCoachPortalHeight(){
  const height=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
  window.parent.postMessage({type:'rtCoachPortalHeight',height:height},'*');
}

window.addEventListener('load',()=>{ reportCoachPortalHeight(); setTimeout(reportCoachPortalHeight,300); setTimeout(reportCoachPortalHeight,1000); });

if('ResizeObserver' in window){
  const portalHeightObserver=new ResizeObserver(()=>reportCoachPortalHeight());
  portalHeightObserver.observe(document.body);
}

window.addEventListener('resize',reportCoachPortalHeight);

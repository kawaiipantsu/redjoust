// Preload JS
const { contextBridge, ipcRenderer, powerMonitor } = require('electron')
const electron = require('electron');
const Store = require('electron-store');
const os = require('os')

// This is not used yet, but i want to sanitize it so we cant destroy how i
// expect the settings to look like. So this is the future :)
const defaultSettingsSchema = {
	settings: {
    exist: { type: 'boolean', default: true },
    theme: { type: 'string', default: 'system' },
    debug: { type: 'boolean', default: false }
  },
  info: {
    target: { type: 'string', default: null },
    mode: { type: 'string', default: null },
    itemDefaults: {
      username: { type: 'string', default: 'admin' },
      password: { type: 'string', default: 'admin' },
      timeout: {
        type: 'number',
        maximum: 30,
        minimum: 1,
        default: 5
      }
    }
  }
};

const store = new Store(defaultSettingsSchema);
const settingsExist = store.has('settings.exist');
if ( !settingsExist ) loadDefaultSettings();

// Not sure if i want to use this yet, trying settings out for now
//const storage = require('electron-json-storage')
//const defaultDataPath = storage.getDefaultDataPath()
//const dataPath = storage.getDataPath();
//console.log(defaultDataPath);

const sysUserInfo = os.userInfo();

// Redjoust vars
var myDebug = store.get('settings.debug')
var myTheme = store.get('settings.theme')
var myTarget = store.get('info.target')
var myMode = store.get('info.mode')
var myStatusbarMessage = "";
var myStatusbarIcon = "";
var statusIcons = ['statusicon--idle','statusicon--busy','statusicon--error','statusicon--warning','statusicon--done','statusicon--pizza','statusicon--info']
var itemsRunning = []

// Silly things for the statusbar random quotes
var randomQuotes = [
  "Ain't no party like a localhost party",
  "Codes are a puzzle. A game, just like any other game",
  "Java is to JavaScript as ham is to hamster",
  "Code is like humor. When you have to explain it, it’s bad",
  "Truth can only be found in one place: the code",
  "Frameworks pass; language remains",
  "If you want breakfast in bed, sleep in the kitchen",
  "Broken pencils are pointless",
  "This e-mail is encrypted with 2ROT-13",
  "Scars are like tattoos with better stories",
  "Benchmarks don't lie, but liars do benchmarks",
  "Don't follow advice you get from fortune cookies",
  "Playing Solitaire is its own punishment",
  "Save energy. Use a small font",
  "With great power comes great heat sinks",
  "Security through Obscenity",
  "Hmmm... I wonder what this button doe",
  "A jester unemployed is nobody's fool",
  "With the second line of code, you already have a legacy",
  "Don't be evil unless you know how",
  "Never bring tequila to a key-signing party",
  "Two years from now, spam will be solved",
  "On IRC everyone is male until proven IRL",
  "Join the dark side, we have cookies...",
  "Hit any user to continue",
  "A hacker does for love what others wouldn't do for money",
  "X Windows: A terminal disease",
  "Eat right, exercise, die anyway",
  "111,111,111 x 111,111,111 = 12,345,678,987,654,321",
  "#exclude <windows.h>",
  "She sells C shells",
  "Core files are the dog shit of UNIX",
  "This email will self-destruct upon deletion",
  "C++ is to C as Lung Cancer is to Lung",
  "Contrary to popular belief, the world is not ASCII",
  "WWW is the MS-DOS of hypertext systems...",
  "Be careful when playing under the anvil tree",
  "It is very difficult to compare an apple",
  "You are, of course, correct, and I disagree completely",
  "As far as I know we never had an undetected error",
  "The early patch blocks the worm",
  "Pro tip for users: There is no 'any key'",
  "You look like you could use a beer right now",
  "Passwords are like underwear. Change them regularly",
  "May your systems never hang, nor go out with a bang",
  "Data leaks can sink companies",
  "Ransomware is just an unscheduled business continuity audit",
  "The great flood was God doing a DDoS",
  "Traceroutes are IP packets way of cyber-stalking",
]

// For future idle/os suspension/ lock events



// Initialize default things
window.onload = () => {
  
  if (myDebug) console.log("loading theme: "+myTheme)
  ipcRenderer.invoke('theme:'+myTheme)

  window.$ = window.jQuery = require('jquery');
  if ( !myMode ) $("#redjoustmode").html("No mode set")
  else $("#redjoustmode").html(myMode)

  showPage("pagedefault");

  // Only hide all if we need to
  // If mode is set from last time, show those !
  //$(".item--external").hide();
  $(".item--passive").hide();
  $(".item--active").hide();
  $(".item--redteam").hide();

  switch (myMode) {
    case "Passive":
      $(".item--passive").show();
      break;
    case "Active+Passive":
      $(".item--passive").show();
      $(".item--active").show();
      break;
    case "Red-Team+Active+Passive":
      $(".item--passive").show();
      $(".item--active").show();
      $(".item--redteam").show();
      break;
  }




  // Statusbar handler section
  // Set default statusbar text for now
  updateQuoteFrequency = 120;
  const startQuote = randomQuotes[Math.floor(Math.random() * randomQuotes.length)];
  statusbarMessage(startQuote,0,"pizza");
  var doUpdate = false;
  var dottss;
  var timeSinceLastUpdate = 0;
  setInterval(() => {
    state = 'test'
    idle = 123
    //if (myDebug) console.log("System state: "+state+" (Idle time: "+idle+")");
    // We always prioritize showing if anything is running ...
    if ( itemsRunning.length > 0) {
      if ( !dottss || dottss.length >= 5 ) dottss = ".";
      statusbarMessage(itemsRunning.length+" of "+visibleItems()+" items running "+dottss,0,"busy")
      if ( dottss.length < 5 ) dottss = dottss+".";
      doUpdate = true;
    } else {
      // Now lets make up more rules for statusbar shinannigans :)
      timeSinceLastUpdate = timeSinceLastUpdate+0.5; // We count in seconds .. sort of :D
      if ( timeSinceLastUpdate == updateQuoteFrequency) {
        doUpdate = true;
        timeSinceLastUpdate = 0;
      }
      if ( doUpdate ) {
        statusbarMessage(randomQuotes[Math.floor(Math.random() * randomQuotes.length)],0,"pizza");
        doUpdate = false;
      }
    }
  }, 500);

  
  
}

function loadDefaultSettings() {
  store.set({
    settings: {
      exist: true,
      theme: 'system',
      debug: false
    },
    info: {
      target: null,
      mode: null,
      itemDefaults: {
        username: 'admin',
        password: 'admin',
        timeout: 5
      }
    }
  });
  if (myDebug) console.log("Loaded default settings, first time run!");
}

function visibleItems() {
  var visibleCount = 0;
  $(".menuitem.status--ready").each(function() {
    if ( $(this).is(":visible") ) {
      visibleCount++;
    }
  });
  $(".menuitem.status--done").each(function() {
    if ( $(this).is(":visible") ) {
      visibleCount++;
    }
  });
  $(".menuitem.status--working").each(function() {
    if ( $(this).is(":visible") ) {
      visibleCount++;
    }
  });
  return visibleCount;
}

/*
contextBridge.exposeInMainWorld('systemAPI', {
  idleState: () => ipcRenderer.invoke('idle:state'),
  idleTime: () => ipcRenderer.invoke('idle:time')
})
*/

contextBridge.exposeInMainWorld('themeAPI', {
  setLight: () => ipcRenderer.invoke('theme:light'),
  setDark: () => ipcRenderer.invoke('theme:dark'),
  setSystem: () => ipcRenderer.invoke('theme:system')
})

contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system')
})

contextBridge.exposeInMainWorld('userInfo', {
  username: sysUserInfo.username
});

contextBridge.exposeInMainWorld('setMode', {
    activate (data) {
      $("#btnpassive").removeClass("enabled");
      $("#btnactive").removeClass("enabled");
      $("#btnredteam").removeClass("enabled");
      $(".item--passive").hide();
      $(".item--active").hide();
      $(".item--redteam").hide();

      $(".info1").removeClass("highlight");
      $(".info2").removeClass("highlight");
      $(".info3").removeClass("highlight");

      if ( data == "passive" ) {
        myMode = "Passive"
        $("#btnpassive").addClass("enabled");
        $(".info1").addClass("highlight");
        $(".item--passive").show();
      } else if ( data == "active" ) {
        myMode = "Active+Passive"
        $("#btnactive").addClass("enabled");
        $(".info2").addClass("highlight");
        $(".item--passive").show();
        $(".item--active").show();
      } else if ( data == "redteam" ) {
        myMode = "Red-Team+Active+Passive"
        $("#btnredteam").addClass("enabled");
        $(".info3").addClass("highlight");
        $(".item--passive").show();
        $(".item--active").show();
        $(".item--redteam").show();
      } else {
        myMode = null
      }
      store.set('info.mode', myMode);
      $("#redjoustmode").html(myMode)
    }
});

contextBridge.exposeInMainWorld('itemAPI', {
  clickItem (id,mode,state) {
    if ( state == "ready") showPage("runpage");
    if ( state == "done") showPage(id+"page");
    if ( state == "working") alert("Item '"+id+"' is working, please wait");
  }
});


function showPage( pagename=null ) {
 if ( pagename ) {
    if ( $("#"+pagename ).length ) {
        if (pagename != "pagepreferences") $(".pages").hide();
        $("#"+pagename).show()
    } else {
        $(".pages").hide();
        $("#pagenotfound").show()
    }
 } else {
  $(".pages").hide();
  $("#pageerror").show()
 }
}


function runAll() {
  // simulate run section (like if F5 is used or someone press "SCAN")
  let doRun = true;
  if ( myMode == "Red-Team+Active+Passive" ) {
    doRun = confirm("Please note Red-Team options are on! Want to continue ?");
  }
 if (doRun) {
  $(".menuitem.status--ready").each(function() {
    if ( $(this).is(":visible") ) {
      //console.log("Found: "+$(this).attr('id'));
      var simTime = getRandomInt(1000,5000);
      //console.log("Simulating work time - "+simTime);
      $this = $(this);
      var myID = $this.attr('id');
      imRunning(myID)
      setTimeout(function() {
        imDone(myID)
        if (myDebug) console.log("[ " + myID + " ] Simulated work time done ...");
      }, simTime);
    }
  });
 }
}
function resetAll() {
  $(".menuitem").removeClass("status--done");
  $(".menuitem").removeClass("status--disabled");
  $(".menuitem").removeClass("status--working");
  $(".menuitem").addClass("status--ready");
}



contextBridge.exposeInMainWorld('usage', {
  cpu: process.getCPUUsage().percentCPUUsage.toString().slice(0, 5)
});

ipcRenderer.on('cpu', (event, data) => {
  document.getElementById('cpu').innerHTML = Math.round(data.toFixed(2));
});
ipcRenderer.on('mem', (event, data) => {
  document.getElementById('mem').innerHTML = Math.round(data.toFixed(2));
});
ipcRenderer.on('total-mem', (event, data) => {
  document.getElementById('total-mem').innerHTML = Math.round(data.toFixed(2));
});

ipcRenderer.on('lockscreen', (event) => {
  if ( lockscreenVisible() ) {
    ipcRenderer.invoke('locked:unlock')
    if (myDebug) console.log("Disable lockscreen")
    disableLockscreen()
  } else {
    ipcRenderer.invoke('locked:lock')
    if (myDebug) console.log("Enable lockscreen")
    enableLockscreen("","lock")
  }
});
ipcRenderer.on('resetitems', (event) => {
  resetAll();
});
ipcRenderer.on('runitems', (event) => {
  runAll();
});
ipcRenderer.on('showpagedefault', (event) => {
  showPage("defaultpage");
});
ipcRenderer.on('showpagetarget', (event) => {
  showPage("pagetarget");
});
ipcRenderer.on('showpagemode', (event) => {
  $("#btnpassive").removeClass("enabled");
  $("#btnactive").removeClass("enabled");
  $("#btnredteam").removeClass("enabled");
  $(".info1").removeClass("highlight");
  $(".info2").removeClass("highlight");
  $(".info3").removeClass("highlight");
  switch (myMode) {
    case "Passive":
      $("#btnpassive").addClass("enabled");
      $(".info1").addClass("highlight");
      break;
    case "Active+Passive":
      $("#btnactive").addClass("enabled");
      $(".info2").addClass("highlight");
      break;
    case "Red-Team+Active+Passive":
      $("#btnredteam").addClass("enabled");
      $(".info3").addClass("highlight");
      break;
  }    
  showPage("pagemode");
});
ipcRenderer.on('showpagetestlong', (event) => {
  showPage("pagetestlong");
});
ipcRenderer.on('showpreferences', (event) => {
  showPage("pagepreferences");
});

function reloadStylesheets() {
  var queryString = '?reload=' + new Date().getTime();
  $('link[rel="stylesheet"]').each(function () {
      this.href = this.href.replace(/\?.*|$/, queryString);
  });
}

function lockscreenVisible() {
  if ( $(".lockscreen").is(":visible") ) return true;
  else return false;
}

function enableLockscreen(msg=null,icon=false,spinner=false) {
  
  if ( icon ) {
      $(".spinnerplaceholder").removeClass("spinner");
      switch(icon) {
          case "lock":
              $(".spinnerplaceholder").addClass("iconlock");
            break;
          default:
              $(".spinnerplaceholder").addClass("icondefault");
        } 
  } else {
      if ( spinner ) $(".spinnerplaceholder").addClass("spinner");
      else $(".spinnerplaceholder").removeClass("spinner");
  }
  if ( msg ) $(".lockscreentext").html(msg);
  else $(".lockscreentext").html("");
  $(".lockscreen").show();
}
function disableLockscreen() {
  $(".lockscreen").hide();
  $(".spinnerplaceholder").removeClass("spinner iconlock icondefault");
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function statusbarMessage(msg,sec=0,icon="unknown") {
  
  if ( icon ) {
   $.each(statusIcons,function(index, value) {
    $("#statusicon").removeClass(value);
   });
  }
  if ( sec > 0 ) {
    var oldStatusbarMessage = myStatusbarMessage;
    var oldStatusbarIcon = myStatusbarIcon;
  }
  if (icon) {
   switch(icon) {
    case "info":
      $("#statusicon").addClass("statusicon--info");
      myStatusbarIcon = "info";
      break;
    case "busy":
      $("#statusicon").addClass("statusicon--busy");
      myStatusbarIcon = "busy";
      break;
    case "idle":
      $("#statusicon").addClass("statusicon--idle");
      myStatusbarIcon = "idle";
      break;
    case "done":
      $("#statusicon").addClass("statusicon--done");
      myStatusbarIcon = "done";
      break;
      case "pizza":
      $("#statusicon").addClass("statusicon--pizza");
      myStatusbarIcon = "pizza";
      break;
      case "donut":
      $("#statusicon").addClass("statusicon--donut");
      myStatusbarIcon = "donut";
      break;
      case "warning":
      $("#statusicon").addClass("statusicon--warning");
      myStatusbarIcon = "warning";
      break;
      case "error":
      $("#statusicon").addClass("statusicon--error");
      myStatusbarIcon = "error";
      break;
    default:
      $("#statusicon").addClass("statusicon--pizza");
      myStatusbarIcon = "unknown";
   }
  }
  myStatusbarMessage = msg;
  $("#statusmessage").text(myStatusbarMessage).html();

  if ( sec > 0 ) {
    milliSec = sec*1000;
    setTimeout(function() {
      $("#statusmessage").html(oldStatusbarMessage);
      if ( icon ) {
        $.each(statusIcons,function(index, value) {
          $("#statusicon").removeClass(value);
        });
        $("#statusicon").addClass("statusicon--"+oldStatusbarIcon);
      }
    },milliSec);
  }
}

function itemClear(myID) {
  $("#"+myID).removeClass("status--disabled");imRunning
  $("#"+myID).removeClass("status--ready");
  $("#"+myID).removeClass("status--working");
  $("#"+myID).removeClass("status--done");
}
function imRunning(myID) {
  itemClear(myID);
  itemsRunning.push(myID);
  $("#"+myID).addClass("status--working");
}
function imDone(myID) {
  itemClear(myID);
  const index = itemsRunning.indexOf(myID);
  if (index > -1) itemsRunning.splice(index, 1);
  $("#"+myID).addClass("status--done");
}

// Lets just dump all the item functions below here...
// Make a function that has the same ID as your item div.
// So the setup looks like this
//
// id=doBLABLA
// Then you need to things
// A div page with id=doBLABLApage
// and a js function with the name doBLABLA()
// when running run "imRunning(id)" in the beginning
// and finish of with "imDone(id)" in the end.
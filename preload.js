// Preload JS
const { contextBridge, ipcRenderer, powerMonitor } = require('electron')
const electron = require('electron');
const Store = require('electron-store');
const os = require('os')
const net = require('net');
const { Resolver } = require('dns');
const { isNull } = require('util');
const { exit } = require('process');


const defaultSettingsSchema = require('./assets/js/config-scheme.js')
// We are now using the scheme to set the overall template of the config file.
// This is super as even if the user has an old config file any new "settings"
// will apply based on the schemes default values when using the "store.get".

const store = new Store({defaults: defaultSettingsSchema});

// Not sure if i want to use this yet, trying settings out for now
//const storage = require('electron-json-storage')
//const defaultDataPath = storage.getDefaultDataPath()
//const dataPath = storage.getDataPath();
//console.log(defaultDataPath);

const sysUserInfo = os.userInfo();

// Our DNS resolver
const resolver = new Resolver();

// Redjoust vars
var myDebug = store.get('settings.debug')
var myTheme = store.get('settings.theme')
var myTarget = store.get('info.target')
var myMode = store.get('info.mode')
var streamerMode = store.get('settings.streamermode')
var showExternals = store.get('menuitems.externaltools.show')
var myStatusbarMessage = "";
var myStatusbarIcon = "";
var dnsServer = store.get('info.itemDefaults.dnsresolver')
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

// Cleanup config target history if needed ...
if ( store.get('targetHistory.targets').length > store.get('targetHistory.maxtargets') ) {
  maxtargets = store.get('targetHistory.maxtargets');
  curtargets = store.get('targetHistory.targets').length;
  targetlist = store.get('targetHistory.targets');
  removenum = curtargets-maxtargets;
  targetlist.splice(curtargets-removenum,removenum);
  store.set('targetHistory.targets',targetlist);
}

// For future idle/os suspension/ lock events



// Initialize default things
window.onload = () => {
  
  if (myDebug) console.log("loading theme: "+myTheme)
  ipcRenderer.invoke('theme:'+myTheme)

  window.$ = window.jQuery = require('jquery');

  // Set default mode stuff
  if ( !myMode ) $("#redjoustmode").html("No mode set")
  else $("#redjoustmode").html(myMode)

  // Set default target stuff ....
  if ( !myTarget ) $("#redjousttarget").html("No target set")
  else $("#redjousttarget").html(myTarget)
  setTarget();
  if ( myTarget ) $("#inputTarget").val(myTarget);

  // Update public IP
  reloadPublicIP();

  // Show default front page
  showPage("pagedefault");

  // Only hide all if we need to
  // If mode is set from last time, show those !
  
  if ( showExternals ) $("#haveExternal").show();
  else $("#haveExternal").hide();
  
  $(".item--passive").hide();
  $(".item--active").hide();
  $(".item--redteam").hide();

  itemsTitleDefault(); // On load set all titles on items

  updateItemVisibility();

  // Since this is first load, reset everything !
  // So we are in the right state of mind all around :)
  resetAll();

  // Statusbar handler section
  // Set default statusbar text for now
  updateQuoteFrequency = 120;
  const startQuote = randomQuotes[Math.floor(Math.random() * randomQuotes.length)];
  var randomQuotesIcons = ['pizza','donut','coffee','shades'];
  statusbarMessage(startQuote,0,randomQuotesIcons[Math.floor(Math.random() * randomQuotesIcons.length)]);
  var doUpdate = false;
  var dottss;
  var timeSinceLastUpdate = 0;
  
  setInterval(() => {
    // System OS power saving/monitor options not functional
    state = 'normal' // Was supposed to be state from the OS powermonitr part (ie idle/suspension event)
    idle = 0; // Was supposed to be numbers from the OS powermonitr part (ie idle/suspension event)
    //if (myDebug) console.log("System state: "+state+" (Idle time: "+idle+")");
    // We always prioritize showing if anything is running ...
    if ( itemsRunning.length > 0) {
      if ( !$("#btngotorun").hasClass("enabled") ) $("#btngotorun").addClass("enabled");
      if ( !dottss || dottss.length >= 5 ) dottss = ".";
      statusbarMessage(itemsRunning.length+" of "+visibleItems()+" items running "+dottss,0,"busy")
      if ( dottss.length < 5 ) dottss = dottss+".";
      doUpdate = true;
    } else {
      // Now lets make up more rules for statusbar shinannigans :)
      timeSinceLastUpdate = timeSinceLastUpdate+0.5; // We count in seconds .. sort of :D
      // OS idle handler (just show something else if no user input ie. idle timer grows)
      if ( idle > 0 ) {
        if ( doUpdate ) {
          statusbarMessage("I'm idle...",0,"idle");
          doUpdate = false;
        }
      } else {
        // Normal operations
        if ( timeSinceLastUpdate == updateQuoteFrequency) {
          doUpdate = true;
          timeSinceLastUpdate = 0;
        }
        if ( doUpdate ) {
          if ( $("#btngotorun").hasClass("enabled") ) $("#btngotorun").removeClass("enabled");
          statusbarMessage(randomQuotes[Math.floor(Math.random() * randomQuotes.length)],0,randomQuotesIcons[Math.floor(Math.random() * randomQuotesIcons.length)]);
          doUpdate = false;
        }
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

function updateItemVisibility() {
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
    default:
      $(".item--passive").hide();
      $(".item--active").hide();
      $(".item--redteam").hide();
      break;
  }
}
function updateItemState(itemID=false) {
  if ( itemID ) {
    if ( myTarget && myMode ) {
      $("#"+itemID).removeClass("status--disabled");
      $("#"+itemID).removeClass("status--ready");
      $("#"+itemID).removeClass("status--working");
      $("#"+itemID).removeClass("status--done");
      $("#"+itemID).addClass("status--ready");
      itemTitleDefault(itemID)
    } else {
      $("#"+itemID).removeClass("status--disabled");
      $("#"+itemID).removeClass("status--ready");
      $("#"+itemID).removeClass("status--working");
      $("#"+itemID).removeClass("status--done");
      if ( myTarget && !myMode ) {
        $("#"+itemID).addClass("status--disabled");
        itemBroke(itemID,"Please also set mode");
      } else if ( !myTarget && myMode ) {
        $("#"+itemID).addClass("status--disabled");
        itemBroke(itemID,"Please also set target");
      } else {
        $("#"+itemID).addClass("status--disabled");
        itemBroke(itemID,"Please set target and mode");
      }
    }
  } else {
    // We do em all :D
    $('.menuitem').each(function(){
      itemID = $(this).attr("id");
      if ( !$("#"+itemID).hasClass("item--external") ) {
        if ( myTarget && myMode ) {
          $("#"+itemID).removeClass("status--disabled");
          $("#"+itemID).removeClass("status--ready");
          $("#"+itemID).removeClass("status--working");
          $("#"+itemID).removeClass("status--done");
          $("#"+itemID).addClass("status--ready");
          itemTitleDefault(itemID)
        } else {
          $("#"+itemID).removeClass("status--disabled");
          $("#"+itemID).removeClass("status--ready");
          $("#"+itemID).removeClass("status--working");
          $("#"+itemID).removeClass("status--done");
          if ( myTarget && !myMode ) {
            $("#"+itemID).addClass("status--disabled");
            itemBroke(itemID,"Please also set mode");
          } else if ( !myTarget && myMode ) {
            $("#"+itemID).addClass("status--disabled");
            itemBroke(itemID,"Please also set target");
          } else {
            $("#"+itemID).addClass("status--disabled");
            itemBroke(itemID,"Please set target and mode");
          }
        }
      }
    });
  }
  updateItemVisibility();
}


function itemsTitleDefault() {
  $(".menuitem").each(function() {
    var itemID = $(this).attr('id');
    var itemTitle = $(this).data("title");
    var itemPage = $(this).data("page");
    var itemFunc = $(this).data("function");
    if (itemTitle) $(this).attr("title",itemTitle);
  });
}
function itemTitleDefault(myID) {
    var itemID = $("#"+myID).attr('id');
    var itemTitle = $("#"+myID).data("title");
    var itemPage = $("#"+myID).data("page");
    var itemFunc = $("#"+myID).data("function");
    if (itemTitle) $("#"+myID).attr("title",itemTitle);
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
      updateItemState();
    }
});

contextBridge.exposeInMainWorld('actionHandler', {
  updateTarget (newTarget) {
    setTarget(newTarget);
  },
  targethistoryarray () {
    return store.get('targetHistory.targets');
  },
  targethistory (lookup) {
    if ( currentTargetHistory.length > 0 ) {
      return "["+currentTargetHistory.length+"] Lookup: "+lookup;
    }
  },
  goto (key) {
    switch (key) {
      case "btngotonext":
        if ( !myTarget && !myMode ) showPage("pagetarget");
        if ( myTarget && !myMode ) showPage("pagemode");
        if ( myMode && !myTarget ) showPage("pagetarget");
        if (myMode && myTarget ) showPage("pagedefault");
        break;
      case "btngototarget":
        showPage("pagetarget");
        break;
      case "btngotomode":
        showPage("pagemode");
        break;
      case "btngotorun":
        if ( myTarget && myMode ) {
          // We are good to go, RUN!
          runAll();
        } else {
          if ( !myTarget && !myMode ) alert('Please choose both a TARGET and MODE!');
          if ( !myTarget && myMode ) alert('Please choose a TARGET!');
          if ( myTarget && !myMode ) alert('Please choose a MODE!');
        }
        break;
      default:
        showPage("pagedefault"); // Show our self ?! Atleast its some time of error handling ....
        break;
    }
  }
});

contextBridge.exposeInMainWorld('itemAPI', {
  clickItem (id,mode,state) {
    var itemID = $("#"+id).attr('id');
    var itemTitle = $("#"+id).data("title");
    var itemPage = $("#"+id).data("page");
    var itemFunc = $("#"+id).data("function");
    var itemMode = mode;
    var itemState = state;

    if ( itemState == "ready") showPage("pagedefault");
    if ( itemState == "done") {
      showPage(itemPage);
    }
    if ( itemState == "info") {
      showPage(itemPage);
    }    // I think this is useful but annoying :D 
    //if ( state == "working") alert("Item '"+id+"' is working, please wait");
  }
});

contextBridge.exposeInMainWorld('toolAPI', {
  clickItem (myID,myPage) {
    if (myDebug) console.log("Clicked '"+myID+"' -> goto: "+myPage);
    var pattern = /^((http|https|ftp):\/\/)/i;
    if (pattern.test(myPage)) require('electron').shell.openExternal(myPage);
    else showPage(myPage);    
  },
  base64Encode(data) {
    let buff = new Buffer.from(String(data));
    let base64data = buff.toString('base64');
    return base64data;
   },
  base64Decode(data) { 
    let buff = new Buffer.from(String(data), 'base64');
    let asciidata = buff.toString('ascii');
    return asciidata;
  }
});

function reloadPublicIP() {
  $.ajax({
    dataType: 'json',
    url: "https://api.buffer.dk/myip",
    success: function(result){
      if ( streamerMode ) {
        $("#myip").html("Privacy mode");
      } else {
        $("#myip").html(result.ip);
      }
    },
    fail: function(xhr, textStatus, errorThrown){
      $("#myip").html("Unknown?");
    }
  });
}

function showPage( pagename=null ) {
 if ( pagename ) {
    if ( $("#"+pagename ).length ) {
        if (pagename != "pagepreferences") $(".pages").hide();
        // We need to prep defaultpage a bit ...
        if ( pagename == "pagedefault") {
          if ( myTarget ) $("#btngototarget").addClass("enabled");
          else $("#btngototarget").removeClass("enabled");
          if ( myMode ) $("#btngotomode").addClass("enabled");
          else $("#btngotomode").removeClass("enabled");
          if ( itemsRunning.length > 0 ) $("#btngotorun").addClass("enabled");
          else $("#btngotorun").removeClass("enabled");
        }
        // We need to prep pagemode a bit ....
        if ( pagename == "pagemode" ) {
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
        }
        $("#"+pagename).show()
        // A bit of focus handling ...
        if ( pagename == "pagetarget" ) {
          if ( myTarget ) $("#inputTarget").val(myTarget);
          $("#inputTarget").trigger('focus');
        }
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

  if ( $(".menuitem.status--ready").is(":visible") ) {
    if ( store.get("menuitems.passive.runwarning") && myMode == "Passive") {
      doRun = confirm("Please note PASSIVE MODE options are on! Want to continue ?");
      if (doRun === false) return;
    }
    if ( store.get("menuitems.active.runwarning") && myMode == "Active+Passive" ) {
      doRun = confirm("Please note ACTIVE MODE options are on! Want to continue ?");
      if (doRun === false) return;
    }
    if ( store.get("menuitems.redteam.runwarning") && myMode == "Red-Team+Active+Passive" ) {
      doRun = confirm("Please note RED-TEAM MODE options are on! Want to continue ?");
      if (doRun === false) return;
    }
  } else {
    alert("No items are ready to collect, perhaps reset? (Hit: F6)");
    return;
  }

  

  $(".menuitem.status--ready").each( async function() {
    if ( $(this).is(":visible") ) {
      var itemID = $(this).attr('id');
      var itemTitle = $(this).data("title");
      var itemPage = $(this).data("page");
      var itemFunc = $(this).data("function");
      if (myDebug) console.log("Starting ["+itemID+"] calling '"+itemFunc+"' output to: "+itemPage);
      imRunning(itemID); // Mark it running
      try {
        // Finally, got it to work properly and not using eval() !! Phew !
        window[itemFunc](itemID)
        // TODO: Here is where i left of :=)
        // Make some logic to keep checking if its still running
        // perhaps use the itemsRunning array ?? async rubbish keeps me up late
        
      } catch (err) {
        if (myDebug) console.log(itemFunc+"() is not a function!");
        $("#"+itemID).data('status',"done");
        itemBroke(itemID,"Fatal error: Item broke, no function found");
      }
      imDone(itemID); // Mark it done! (Should somehow wait for the function to finish!)
    }
  });
}

function resetAll() {
  itemsTitleDefault();
  $("#btngotorun").removeClass("enabled");
  $('.menuitem').each(function(){
    itemID = $(this).attr("id");
    clearInterval($("#"+itemID).data('interval'));
    $("#"+itemID).data("status","nan");
    const index = itemsRunning.indexOf(itemID);
    if (index > -1) itemsRunning.splice(index, 1);
    if ( !$("#"+itemID).hasClass("item--external") ) {
      $("#"+itemID).removeClass("status--disabled");
      $("#"+itemID).removeClass("status--ready");
      $("#"+itemID).removeClass("status--working");
      $("#"+itemID).removeClass("status--done");
      updateItemState(itemID);
    }
  });
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
ipcRenderer.on('escpressed', (event) => {
  showPage("pagedefault");
});

ipcRenderer.on('togglestreamermode', (event) => {
  if ( streamerMode ) {
    // Streamer mode enabled - toggle to disabled!
    streamerMode = false;
    store.set('settings.streamermode', false);
  } else {
    // Streamer mode disabled - toggle to enabled!
    streamerMode = true;
    store.set('settings.streamermode', true);
  }
  reloadPublicIP();
});


ipcRenderer.on('toggleexternaltools', (event) => {
  if ( showExternals ) {
    // External tools enabled - toggle to disabled!
    showExternals = false;
    store.set('menuitems.externaltools.show', false);
    $("#haveExternal").hide();
  } else {
    // External tools disabled - toggle to enabled!
    showExternals = true;
    store.set('menuitems.externaltools.show', true);
    $("#haveExternal").show();
  }
});

ipcRenderer.on('resetitems', (event) => {
  resetAll();
});
ipcRenderer.on('runitems', (event) => {
  runAll();
});

ipcRenderer.on('showprocessinfo', (event) => {
  // The idea was to make a debug thing to show process info
  // in order to see the pid's on hanging item functions that
  // was still running when needed a "reset" ...
  //
  // The idea is trashed for now ... They will just have to
  // timeout/hang until they finish ...
  if (myDebug) console.log("==[ PROCESS INFORMATION ]==============");
});

ipcRenderer.on('showpagedefault', (event) => {
  showPage("pagedefault");
});
ipcRenderer.on('showpageclear', (event) => {
  myTarget = null;
  myMode = null;
  store.set("info.mode",null);
  store.set("info.target", null);
  resetAll();
  $(".menuitems.item--passive").hide();
  $(".menuitems.item--active").hide();
  $(".menuitems.item--redteam").hide();
  $("#haveIP").hide();
  $("#haveHostname").hide();
  $("#haveDomainname").hide();
  $("#redjoustmode").html("No mode set")
  $("#redjousttarget").html("No target set")
  $("#inputTarget").val(null);
  showPage("pagedefault");
});
ipcRenderer.on('showpagetarget', (event) => {
  showPage("pagetarget");
});
ipcRenderer.on('showpagemode', (event) => {   
  showPage("pagemode");
});
ipcRenderer.on('showpagetestlong', (event) => {
  showPage("pagetestlong");
});
ipcRenderer.on('showpreferences', (event) => {
  $("#prefFile").text(store.path).html();
  var pretty = JSON.stringify(store.store,null,4);
  $("#prefSettings").val(pretty);
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
      case "shades":
      $("#statusicon").addClass("statusicon--shades");
      myStatusbarIcon = "shades";
      break;
      case "coffee":
      $("#statusicon").addClass("statusicon--coffee");
      myStatusbarIcon = "coffee";
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

function itemBroke(myID,msg=false) {
  itemClear(myID);
  if ( msg ) $("#"+myID).attr("title", msg);
  $("#"+myID).addClass("status--disabled");
}
function itemClear(myID) {
  $("#"+myID).removeClass("status--disabled");
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
  $("#"+myID).data('interval', setInterval(function(myID) {
    var itemStatus = $("#"+myID).data('status');
    if ( itemStatus == "done") {
      itemClear(myID);
      const index = itemsRunning.indexOf(myID);
      if (index > -1) itemsRunning.splice(index, 1);
      $("#"+myID).addClass("status--done");
      clearInterval($("#"+myID).data('interval'));
    }
  }, 500,myID));
}

function setTarget(newTarget=false) {
  /* So what should this function do?
      - Update global "myTarget"
      - Update conf settings "store.set target"
      - Detect if its hostname or ip
      - Parse domain name form hostname
      - Show hide menu segments for all items
      - Be able to run via onload (sanity checks etc)
      - 
  */
 if ( newTarget ) {
  myTarget = newTarget; // Setting global
  store.set('info.target', myTarget); // Setting conf storage
  targetlist = store.get('targetHistory.targets'); // Get out target history
  if ( targetlist.indexOf(myTarget) !== -1 ) {
    if (myDebug) console.log("Not saving target to history, already there!");
  } else {
    targetlist.push(myTarget); // Add our new target to the list (the list has a max, see conf)
    store.set('targetHistory.targets',targetlist); // Store it back into the config file
    if (myDebug) console.log("New target stored in history");
  }
  $("#redjousttarget").text(myTarget).html()
  parseTarget(myTarget)
 } else {
   if ( myTarget ) { // Only continue if target is set to something default
    parseTarget(myTarget)
   } 
 }
 updateItemState();
}

function parseTarget(target) {
  $("#haveHostname").hide();
  $("#havedomainname").hide();
  $("#haveIP").hide();

  // Handle custom NS server for our resolver !!
  // We support
  // - System (default)
  // - Multiple NS (as array)
  // - Single NS (as string)
  var nsresolver = store.get('info.itemDefaults.dnsresolver');
  if ( nsresolver ) {
    if ( nsresolver == "system" ) resolver.setServers(resolver.getServers()); // Yes set get blooper! But config might change on fly
    else if ( Array.isArray(nsresolver) ) resolver.setServers(nsresolver);
    else resolver.setServers([nsresolver]);
  }

  if ( net.isIP(target) ) {
    // TARGET IS IP ADDRESS
    $("#haveIP").show();
    $("#targetIP").text(target).html();
    // Lets reverse DNS lookup the IP :)
    // If we get something, populate the hostname menu as well!
    resolver.reverse(String(target), (err, hostnames) => {
      if (err) {
        if (myDebug) console.log(err)
      } else {
        const hostname = hostnames[0]
        $("#haveHostname").show();
        $("#targetHostname").text(hostname).html();

        var parts = hostname.split('.').reverse();
        if (parts != null && parts.length > 1) {
          domain = parts[1] + '.' + parts[0];
          $("#haveDomainname").show();
          $("#targetDomainname").text(domain).html();
        }
      }
    });
  } else {
    // TARGET IS HOSTNAME
    $("#haveHostname").show();
    $("#targetHostname").text(target).html();
    // Parse for domain name
    var parts = target.split('.').reverse();
    if (parts != null && parts.length > 1) {
      domain = parts[1] + '.' + parts[0];
      $("#haveDomainname").show();
      $("#targetDomainname").text(domain).html();
    }
    // Lets reverse DNS lookup the IP :)
    // If we get something, populate the hostname menu as well!
    resolver.resolve(String(target), (err, ipaddresses) => {
      if (err) {
        if (myDebug) console.log(err)
      } else {
        const ipaddress = ipaddresses[0]
        $("#haveIP").show();
        $("#targetIP").text(ipaddress).html();
      }
    });
  }
}

function getFunctionByName(functionName, context) {
  if(typeof(window) == "undefined") {
      context = context || global;
  }else{
      context = context || window;
  }
  var namespaces = functionName.split(".");
  var functionToExecute = namespaces.pop();
  for (var i = 0; i < namespaces.length; i++) {
      context = context[namespaces[i]];
  }
  if(context){
      return context[functionToExecute];
  }else{
      return undefined;
  }
}

// Lets just dump all the item functions below here...
// -----------------------------------------------------------
// I have tried to make some logic to it, also to make it flexible
// in your end. So most is managed by data-string attributes.
//
// Item div looks like this by default:
// <div id="doDNS1" data-title="DNS information" data-page="dodnspage" data-function="dnsFunc1" class="boxborder menuitem item--click item--passive status--ready">DNS Information</div>
//
// You need to manage a few things
// 1) Set the ID to something uniq (Try to keep 'do'+NAME+iteration)
// 2) Change "item-passive" to one of item--(passive,active,redteam) to bind the item to a mode
// 3) status--ready dont matter much, i will reset it on app start
//
// 4) Change data-title to suit your description for your menu item
// 5) Change data-page to point to your div page with results/output
// 6) Change data-function to the function i need to call in order to build result/output
//
// You function must be in the "window" scope (to get around using eval!)
//
// Also, you can use jQuery in your function
// Use below template to get you going :)

window.itemTemplate = function() {
  // ------ Actual item code
  


  // ------
}

window.dnsMain = function(myID) {
  var itemID = $("#"+myID).attr('id');
  var itemTitle = $("#"+myID).data("title");
  var itemPage = $("#"+myID).data("page");
  var itemFunc = $("#"+myID).data("function");
  var ourMode = "misconfigured";
  if ( $("#"+myID).hasClass( "item--passive" ) ) ourMode = "passive";
  if ( $("#"+myID).hasClass( "item--active" ) ) ourMode = "active";
  if ( $("#"+myID).hasClass( "item--redteam" ) ) ourMode = "redteam";
  var ourStatus = "unknown";
  if ( $("#"+myID).hasClass( "status--disabled" ) ) ourStatus = "disabled";
  if ( $("#"+myID).hasClass( "status--ready" ) ) ourStatus = "ready";
  if ( $("#"+myID).hasClass( "status--working" ) ) ourStatus = "working";
  if ( $("#"+myID).hasClass( "status--done" ) ) ourStatus = "done";
  $("#"+myID).data('status',"working");
  if (myDebug) console.log("["+itemFunc+"]"+itemID+": Function running, output to: "+itemPage);
  // This is crude code to pretend we are working !
  var num = getRandomInt(1,10);
  $.ajax({url: "https://enforcer.darknet.dk/sleep.php?num="+num, success: function(result) {
    $("#dnsresult").append("<div>Hi i'm item "+itemID+" slept for "+num+"sec</div>")
    $("#"+myID).data('status',"done");
  }});
}

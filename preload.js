// Preload JS
const { contextBridge, ipcRenderer, powerMonitor } = require('electron')
const electron = require('electron');
const { exec } = require("child_process");
const Store = require('electron-store');
const os = require('os')
const net = require('net');
const crypto = require('crypto')
const { Resolver } = require('dns');
const punycode = require('punycode/');
const { isNull } = require('util');
var util = require('util')
const { exit } = require('process');
var ESAPI = require('node-esapi');


// configDefaults.: Is how the default config.json file is to look if no file found
// configScheme...: Is the validation on what happens if we dont know the value, ie.
//                  user has older config.json file and new changes have been introduced.
//                  But it can also be used for validating whats accepted via the set()
//                  function and what type it holds.
const configDefaults = require('./assets/js/config-defaults.js');
const configScheme = require('./assets/js/config-scheme.js');
const store = new Store({defaults: configDefaults, schema: configScheme});


// Not sure if i want to use this yet, trying settings out for now
//const storage = require('electron-json-storage')
//const defaultDataPath = storage.getDefaultDataPath()
//const dataPath = storage.getDataPath();
//console.log(defaultDataPath);

const sysUserInfo = os.userInfo();

// Our DNS resolver
const resolver = new Resolver();
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

// Redjoust vars
var myDebug = store.get('settings.debug')
var myTheme = store.get('settings.theme')
var myTarget = store.get('info.target')
var myMode = store.get('info.mode')
var streamerMode = store.get('settings.streamermode')
var showExternals = store.get('menuitems.externaltools.show')
var myStatusbarMessage = "";
var myStatusbarIcon = "";
var statusbarNotification = false;
var doUpdate = false;
var dnsServer = store.get('info.itemDefaults.dnsresolver')
var statusIcons = ['statusicon--download','statusicon--donut','statusicon--shades','statusicon--coffee','statusicon--idle','statusicon--busy','statusicon--error','statusicon--warning','statusicon--done','statusicon--pizza','statusicon--info']
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
  targetlist.splice(0,removenum);
  store.set('targetHistory.targets',targetlist);
}

// Initialize default things
window.onload = () => {
  
  // Special debug block
  // Just easy to have this and to throw stuff here i want to debug...
  // DEBUG BLOCK BEGIN
  if (myDebug) {
  

  }
  // DEBUG BLOCK END



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
  var dottss;
  var timeSinceLastUpdate = 0;
  
  setInterval(() => {
    // System OS power saving/monitor options not functional
    state = 'normal' // Was supposed to be state from the OS powermonitr part (ie idle/suspension event)
    idle = 0; // Was supposed to be numbers from the OS powermonitr part (ie idle/suspension event)
    //if (myDebug) console.log("System state: "+state+" (Idle time: "+idle+")");
    // We always prioritize showing if anything is running ...
    if ( !statusbarNotification ) {
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
    }
  }, 500);

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
      if ( $("#"+itemPage).find(".itemtitle").length ) {
        $("#"+itemPage).find(".itemtitle").text(itemTitle).html();
      }
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
  doHashing(data) {

    let hashCRC32 = crc32(data,true);
    let hashMD4 = crypto.createHash('md4').update(data).digest("hex");
    let hashMD5 = crypto.createHash('md5').update(data).digest("hex");
    let hashMD160 = crypto.createHash('ripemd160').update(data).digest("hex");
    let hashSHA1 = crypto.createHash('sha1').update(data).digest("hex");
    let hashSHA224 = crypto.createHash('sha224').update(data).digest("hex");
    let hashSHA256 = crypto.createHash('sha256').update(data).digest("hex");
    let hashSHA384 = crypto.createHash('sha384').update(data).digest("hex");
    let hashSHA512 = crypto.createHash('sha512').update(data).digest("hex");

    $("#hash--crc32").val(hashCRC32);
    $("#hash--md4").val(hashMD4);
    $("#hash--md5").val(hashMD5);
    $("#hash--ripemd160").val(hashMD160);
    $("#hash--sha1").val(hashSHA1);
    $("#hash--sha224").val(hashSHA224);
    $("#hash--sha256").val(hashSHA256);
    $("#hash--sha384").val(hashSHA384);
    $("#hash--sha512").val(hashSHA512);

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
  },statusbarNotify(msg) {
    if ( !statusbarNotification ) statusbarMessage(msg,3,'download');
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

        $("#"+pagename).show() // The main "magic" - Show the page :D
        // A click hack for the dns deep dive! (its a nice feature! Quickly change POI target)
        if ( pagename == "pageDNSdomainname" || pagename == "pageDNShostname" ) {
          $(".poiTarget").on("click", function() {
            if ( $(this).html().length > 0 ) {
              var poiTarget = $(this).html()
              if (poiTarget) {
                setTarget(poiTarget)
                showPage("pagedefault")
              }
            }
          });
        }

        // A bit of focus handling ...
        if ( pagename == "pagetarget" ) {
          if ( myTarget ) $("#inputTarget").val(myTarget);
          $("#inputTarget").trigger('focus');
          $("#inputTarget").trigger('select');

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
        if (myDebug) console.log(itemFunc+"() - There a problem encountered trying to run this function!");
        if (myDebug) console.log(err)
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

// Power monitor handler
// For future idle/os suspension/ lock events etc
ipcRenderer.on('idleState', (event, state) => {
  if ( state == "idle") {
    if (myDebug) console.log("Did you leave your computer ? Your OS is idle!");
  }
  
  // Testing out (idle lock screen)
  if ( store.get('settings.idlelock',false) ) {
    if ( lockscreenVisible() && state == "active" ) {
      ipcRenderer.invoke('locked:unlock')
      disableLockscreen()
    } else if ( state == "idle" ) {
      ipcRenderer.invoke('locked:lock')
      enableLockscreen("","lock")
    }
  }
});

// OS Usage handler
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
      case "download":
      $("#statusicon").addClass("statusicon--download");
      myStatusbarIcon = "download";
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
    statusbarNotification = true;
    milliSec = sec*1000;
    setTimeout(function() {
      statusbarNotification = false;
      doUpdate = true;
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
  $("#haveDomainname").hide();
  $("#haveIP").hide();
  const whoisServers = require("./assets/json/whois-servers.json");
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
        resizeFontToFit("#targetHostname");

        var parts = hostname.split('.').reverse();
        if (parts != null && parts.length > 1) {
          var domain = parts[1] + '.' + parts[0];
          // Quick little hack to check if we only got the tld, if so add more to domain name :9
          var tld = whoisServers[domain]
          if ( tld ) domain = parts[2] + '.' + parts[1] + '.' + parts[0];
          $("#haveDomainname").show();
          $("#targetDomainname").text(domain).html();
          resizeFontToFit("#targetDomainname");
        }
      }
    });
  } else {
    // TARGET IS HOSTNAME
    $("#haveHostname").show();
    $("#targetHostname").text(target).html();
    resizeFontToFit("#targetHostname");

    // Parse for domain name
    var parts = target.split('.').reverse();
    if (parts != null && parts.length > 1) {
      var domain = parts[1] + '.' + parts[0];
      // Quick little hack to check if we only got the tld, if so add more to domain name :9
      var tld = whoisServers[domain]
      if ( tld ) domain = parts[2] + '.' + parts[1] + '.' + parts[0];
      $("#haveDomainname").show();
      $("#targetDomainname").text(domain).html();
      resizeFontToFit("#targetDomainname");
    }

    // A bit backwards !! BUT
    // If tld == target - Then we are not really a hostname but only a domain name as target !
    // So lets go backwards and remove hostname again!
    var hostOK = true
    if ( domain == target ) {
      hostOK = false;
      $("#targetHostname").text('').html();
      $("#haveHostname").hide();
    }
    
    // Lets DNS lookup the domain name for a IP! :)
    // If we get something, populate the hostname menu as well!
    resolver.resolve(String(target), (err, ipaddresses) => {
      if (err) {
        if (myDebug) console.log(err)
      } else {
        const ipaddress = ipaddresses[0]
        $("#haveIP").show();
        $("#targetIP").text(ipaddress).html();

        // AND now do a reverse lookup on our new found IP :D
        // And fill in the hostname if we dont already have one :D
        // Totally host-name-ception !!
        if ( !hostOK ) {
          resolver.reverse(String(ipaddress), (err, hostnames) => {
            if (err) {
              if (myDebug) console.log(err)
            } else {
              const hostname = hostnames[0]
              $("#haveHostname").show();
              $("#targetHostname").text(hostname).html();
              resizeFontToFit("#targetHostname");
            }
          });
        }
      }
    });
  }
}

function resizeFontToFit( myElement ) {
  var me = $(myElement)
  if ( me ) {

    // Set default
    me.css("fontSize", 16); // Sooo static :()

    var resizeMore = true;
    var resizeMin = 6;
    var resizeMax = 20;
    //var widthMax = me.width()-20; // The extra 20 is to also allow padding
    var widthMax = 280; // Uhmm, dont know this works! Above, seems cooler ...
    while (resizeMore) {
      var cssSize = parseInt(me.css('font-size'))
      var curWidth = me.prop('scrollWidth');
      if ( curWidth > widthMax ) {
        // We are to large, let's skrink by 1px!!
        cssSize--;
        me.css("fontSize", cssSize);
      } else {
        // Should we do something when we are not default 16px ?!?!
        // IE. Make us self larger :D (Every mans secret dream...)

        // We are just the right size, let's stop this crazynesss!!!
        resizeMore = false;
      }
    }
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

function crc32(str, hex) {    
  var crc = ~0, i;
  for (i = 0, l = str.length; i < l; i++) {
      crc = (crc >>> 8) ^ crc32tab[(crc ^ str.charCodeAt(i)) & 0xff];
  }
  crc = Math.abs(crc ^ -1);
  return hex ? crc.toString(16) : crc;
}
var crc32tab = [
  0x00000000, 0x77073096, 0xee0e612c, 0x990951ba,
  0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3,
  0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988,
  0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91,
  0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de,
  0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
  0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec,
  0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5,
  0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172,
  0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
  0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940,
  0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
  0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116,
  0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f,
  0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
  0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d,
  0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a,
  0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
  0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818,
  0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
  0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
  0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457,
  0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c,
  0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
  0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2,
  0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb,
  0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0,
  0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9,
  0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086,
  0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
  0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4,
  0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad,
  0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a,
  0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683,
  0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
  0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
  0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe,
  0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7,
  0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc,
  0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
  0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252,
  0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
  0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60,
  0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79,
  0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
  0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f,
  0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04,
  0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
  0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a,
  0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
  0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38,
  0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21,
  0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e,
  0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
  0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c,
  0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45,
  0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2,
  0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db,
  0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0,
  0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
  0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6,
  0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf,
  0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
  0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d
];

// Make a whois client ?! - Windows lack propper one, linux ownz ...
function whoisLookup ( useTarget=false, netLookupOnly=false) {
  var target = useTarget;
  if ( !target ) return false;

  // Load our Whois server list
  const whoisServers = require("./assets/json/whois-servers.json");

  // Detech what we are dealing with, easiest is to match if IP!
  // If not, then it's a domain :)
  if ( net.isIP(target) ) var targetType = "ip"
  else var targetType = "tld";

  // A switch statement to determine what our whois server should be!
  var whoisServer = false;
  switch (targetType) {
    case "ip":
      whoisServer = whoisServers['_']['ip']
      // Lets check if we have specific whois server
      // This will trigger if we are called with etc: 59.0.0.0
      var iplist = whoisServers['_']['ranges']
      var foundNet = false
      for (const [key, value] of Object.entries(iplist)) {
        var ipnet = key.split('/');
        var iprange = ipnet[0]
        if ( iprange == target) {
          // We now support more interesting lookups :) (Almost a real whois client!)
          whoisServer = value;
          foundNet = true;
        }
      };
      if ( netLookupOnly && foundNet === false ) {
        //resolve(); // Not sure we need this, but .then fails !!
        return;
      }
      break;
    case "tld":
      var parts = target.split('.').reverse();
      var tld_single = false;
      var tld_multi = false;
      if (parts != null && target.length > 0 ) tld_single = parts[0];
      if (parts != null && target.length > 1 ) tld_multi = parts[1] + '.' + parts[0];
      var tld_single_translated = null;
      var tld_multi_translated = null;
      if ( tld_single ) tld_single_translated = punycode.toASCII(tld_single);
      if ( tld_multi ) tld_multi_translated = punycode.toASCII(tld_multi);

      var whoisServer1 = whoisServers[tld_multi_translated]
      var whoisServer2 = whoisServers[tld_single_translated]

      if ( whoisServer1 ) whoisServer = whoisServer1
      else if ( whoisServer2 ) whoisServer = whoisServer2
      else whoisServer = whoisServers[''] // Set to default (it's RIPE lookup, properly fail ...)
      break;
    default:
      whoisServer = whoisServers[''] // Set to default (it's RIPE lookup, properly fail ...)
      break;
  }

  // Now explicitly, check if we have a string or object, if object then
  // use the change both host + query else only set host from string and
  // use default query!
  
  var query = "%ADDR%"; // DEFAULT QUERY
  var port = 43 // DEFAULT QUERY PORT (We dont parse host whois servers for this yet!!)

  if ( typeof whoisServer === 'object' && whoisServer !== null ) {
    // Whois server has requirements (host + specific query)
    var finalWhoisServer = whoisServer['host']
    var finalWhoisPort = port
    var finalWhoisQuery = whoisServer['query'].replace('%ADDR%',target);
  } else {
    // Whois server use default query string
    var finalWhoisServer = whoisServer
    var finalWhoisPort = port
    var finalWhoisQuery = query.replace('%ADDR%',target);
  }

  var client = new net.Socket();
  // I have opend a issue for electron-store questioning the default value return on store.get,
  // Why do i have to staticly add it when i have included defauls for the "Store" module ...
  // Until i know more, just skip setting a timeout :D
  //var setTimeout = store.get('info.itemDefaults.whoistimeout',60000);
  //client.setTimeout( setTimeout );
  client.connect({ port: finalWhoisPort, host: finalWhoisServer }, function() {
    if (myDebug) console.log("[WHOIS] Looking up '"+target+"' at '"+finalWhoisServer+"' via query: "+finalWhoisQuery);
    client.write(finalWhoisQuery+'\r\n')
  });
  
  client.on('timeout', function() {
    client.end();
  });

  return new Promise((resolve, reject) => {
    var dataResult = '';

    client.on('data', function(chunk) {
      dataResult += chunk
    });

    client.on('end', function() {
      resolve(dataResult);
    });
  
    client.on('error', function(err) {
      reject(err)
    });
  
   });



}

function spfNote(str) {
  if ( /^v=spf1/i.test(str) ) return "(SPF Version 1)"
  if ( /^spf2.0\/mfrom,pra/i.test(str) ) return "(SPF Sender ID - Envelope sender / Purported Responsible Address)"
  if ( /^spf2.0\/pra,mfrom/i.test(str) ) return "(SPF Sender ID - Purported Responsible Address / Envelope sender)"
  if ( /^spf2.0\/mfrom/i.test(str) ) return "(SPF Sender ID - Envelope sender)"
  if ( /^spf2.0\/pra/i.test(str) ) return "(SPF Sender ID - Purported Responsible Address)"
  if ( /^all/i.test(str) ) return "(Action: No security)"
  if ( /^-all/i.test(str) ) return "(Action: Hardfail - Reject)"
  if ( /^~all/i.test(str) ) return "(Action: Softfail - Allow, but mark)"
  if ( /^include:/i.test(str) ) return "(SPF extends to this txt record)"
  if ( /^ip4/i.test(str) ) return "(IPv4 ip/range - Authorized)"
  if ( /^ip6/i.test(str) ) return "(IPv6 ip/range - Authorized)"
  if ( /^a/i.test(str) ) return "(A record(s) - Authorized)"
  if ( /^mx/i.test(str) ) return "(MX record(s) - Authorized)"
  return "" // Default just return no note text
}

function txtParser(str) {
  // We parse for known things!!
  // And we decide the output etc ...

  // For now, just return the original string :)
  return str
}

function strSanitizer(inputString=false, butcherMode=false) {
  if ( inputString === false || inputString == '' || inputString.length < 1 ) { return String(''); }
  var outputString = inputString
  if ( butcherMode ) {
    // ButcherMode is us butchering the string even more to
    // sanitize it all the way !!
    outputString = outputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    outputString = outputString.trim();
  }
  return ESAPI.encoder().encodeForHTML(outputString);
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

window.dnsMain = function(myID=false) {
  var itemID = $("#"+myID).attr('id');
  var itemTitle = $("#"+myID).data("title");
  var itemPage = $("#"+myID).data("page");
  var itemFunc = $("#"+myID).data("function");
  $("#"+myID).data('status',"working");
  if (myDebug) console.log("["+itemFunc+"]"+itemID+": Function running, output to: "+itemPage);
  var itemResult = $("#"+itemPage).find(".dnsresult");
  // Clear page
  itemResult.html("");
  // Set totalt subtasts and prepare for subwork
  itemResult.data("totalTasks",11) // Set to actual number of subtasks you do ...
  itemResult.data("totalTasksDone",0)

  // Prepare placeholders
  itemResult.append('<div class="worktarget dnsrecords"></div>')
  itemResult.append('<div class="soa dnsrecords"></div>')
  itemResult.append('<div class="ns dnsrecords"></div>')
  itemResult.append('<div class="resolve dnsrecords"><div class="a"></div><div class="aaaa"></div><div class="cname"></div></div>')
  itemResult.append('<div class="resolvefuzz dnsrecords"><div class="title"></div><div class="wildcard"></div><div class="fuzzout gridcont"></div>')
  itemResult.append('<div class="mx dnsrecords"></div>')
  itemResult.append('<div class="dmarc dnsrecords"></div>')
  itemResult.append('<div class="spf dnsrecords"></div>') // This is really just TXT, so match on "v=spf*"
  itemResult.append('<div class="spfcount dnsrecords"><div data-count=0 class="spf1"></div><div data-count=0 class="spf2"></div></div>')
  itemResult.append('<div class="loc dnsrecords"></div>') // Wishfull thinking, NodeJS dns dont support this, so we would have to build our own dns client ....
  itemResult.append('<div class="txt dnsrecords"></div>') // Still dump all TXT here even spf (or ?) info ...
  itemResult.append('<div class="txtfuzz dnsrecords"><div class="title"></div><div class="fuzzout"></div>')
  itemResult.append('<div class="srv dnsrecords"></div>')

  // Any new "POI" targets, dont forget to wrap them in
  // <span class="poitarget"></span>

  // Do this when something is done
  // itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
  const elmTarget = $("#"+itemPage).find(".dnsresult").find(".worktarget")
  if ( itemPage == "pageDNShostname") var workTarget = $("#targetHostname").text();
  if ( itemPage == "pageDNSdomainname") var workTarget = $("#targetDomainname").text();
  elmTarget.append("<span class='title'>Deep dive on target:</span> <span class='value'>" + strSanitizer(workTarget) + "</span><br>")


  const elmSOA = $("#"+itemPage).find(".dnsresult").find(".soa")
  resolver.resolve(String(workTarget),'SOA', (err, result) => {
    if (err) {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    } else {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
      elmSOA.append("<span class='title'>==[ SOA record ]===============================</span><br>")
      elmSOA.append("<span class='key'> - Primary NS.....:</span> <span class='value'><span class='poiTarget'>" + result.nsname + "</span></span><br>")
      elmSOA.append("<span class='key'> - Hostmaster.....:</span> <span class='value'>" + result.hostmaster + "</span><br>")
      elmSOA.append("<span class='key'> - Serial.........:</span> <span class='value'>" + result.serial + "</span><br>")
      elmSOA.append("<span class='key'> - Refresh / Retry:</span> <span class='value'>" + parseInt(result.refresh/60) + "min / "+parseInt(result.retry/60)+"min</span><br>")
      elmSOA.append("<span class='key'> - MinTTL / Expire:</span> <span class='value'>" + parseInt(result.minttl/60) + "min / "+parseInt(result.expire/60)+"min</span><br>")
    }
  });

  const elmDMARC = $("#"+itemPage).find(".dnsresult").find(".dmarc")
  resolver.resolve('_dmarc.'+String(workTarget),'TXT', (err, result) => {
    if (err) {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    } else {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
      elmDMARC.append("<span class='title'>==[ DMARC record ]=============================</span><br>")
      if ( result[0].length > 1 ) {
        var resultString = result[0].join(' ')
        var resultClean = String(resultString).replace(/"/g,'')
        var dmarcRecords = String(resultClean).split(';')
      } else {
        var dmarcRecords = String(result).split(';')
      }
      
      const dregV = /^v=(.+)/i             // Protocol version
      const dregP = /^p=(.+)/i         // Policy for organizational domain
      const dregPCT = /^pct=(.+)/i     // Percentage of messages subjected to filtering
      const dregRUA = /^rua=(.+)/i     // Reporting URI of aggregate reports
      const dregRUF = /^ruf=(.+)/i     // Reporting URI for forensic reports
      const dregSP = /^sp=(.+)/i       // Policy for subdomains of the OD
      const dregADKIM = /^adkim=(.+)/i // Alignment mode for DKIM
      const dregASPF = /^aspf=(.+)/i   // Alignment mode for SPF
      const dregFO = /^fo=(.+)/i       // Failure Reporting Options
      const dregRF = /^rf=(.+)/i       // Report Format
      const dregRI = /^ri=(.+)/i       // Report Interval

      for( i=0 ; i<dmarcRecords.length ; i++ ) {
        if (dmarcRecords[i].length > 0 ) {
          if ( d_v = String(dmarcRecords[i]).trim().match(dregV) ) elmDMARC.append("<span class='key'> - Protocol version..............................:</span> <span class='value'>" + d_v[1] + "</span><br>")
          else if ( d_p = String(dmarcRecords[i]).trim().match(dregP) ) elmDMARC.append("<span class='key'> - Policy for organizational domain..............:</span> <span class='value'>" + d_p[1] + "</span><br>")
          else if ( d_pct = String(dmarcRecords[i]).trim().match(dregPCT) ) elmDMARC.append("<span class='key'> - Percentage of messages subjected to filtering.:</span> <span class='value'>" + d_pct[1] + "%</span><br>")
          else if ( d_rua = String(dmarcRecords[i]).trim().match(dregRUA) ) {
            elmDMARC.append("<span class='key'> - Reporting URI of aggregate reports</span><br>")
            var ruamails = String(d_rua[1]).split(',')
            const mailtoreg = /^mailto:(.+)/i
            for( ii=0 ; ii<ruamails.length ; ii++ ) {
              var ruaemail = String(ruamails[ii]).trim().match(mailtoreg)
              elmDMARC.append("<span class='key'>   `- Email......................................:</span> <span class='value'>" + ruaemail[1] + "</span><br>")
            }
          }
          else if ( d_ruf = String(dmarcRecords[i]).trim().match(dregRUF) ) {
            elmDMARC.append("<span class='key'> - Reporting URI for forensic reports</span><br>")
            var rufmails = String(d_ruf[1]).split(',')
            const mailtoreg = /^mailto:(.+)/i
            for( iii=0 ; iii<rufmails.length ; iii++ ) {
              var rufemail = String(rufmails[iii]).trim().match(mailtoreg)
              elmDMARC.append("<span class='key'>   `- Email......................................:</span> <span class='value'>" + rufemail[1] + "</span><br>")
            }
          }
          else if ( d_rf = String(dmarcRecords[i]).trim().match(dregRF) ) elmDMARC.append("<span class='key'> - Report format.................................:</span> <span class='value'>" + d_rf[1] + "</span><br>")
          else if ( d_ri = String(dmarcRecords[i]).trim().match(dregRI) ) elmDMARC.append("<span class='key'> - Report interval (sec).........................:</span> <span class='value'>" + d_ri[1] + "</span><br>")
          else if ( d_sp = String(dmarcRecords[i]).trim().match(dregSP) ) elmDMARC.append("<span class='key'> - Policy for subdomains of the org-domain.......:</span> <span class='value'>" + d_sp[1] + "</span><br>")
          else if ( d_adkim = String(dmarcRecords[i]).trim().match(dregADKIM) ) elmDMARC.append("<span class='key'> - Alignment mode for DKIM.......................:</span> <span class='value'>" + d_adkim[1] + "</span><br>")
          else if ( d_aspf = String(dmarcRecords[i]).trim().match(dregASPF) ) elmDMARC.append("<span class='key'> - Alignment mode for SPF........................:</span> <span class='value'>" + d_aspf[1] + "</span><br>")
          else if ( d_fo = String(dmarcRecords[i]).trim().match(dregFO) ) {
            elmDMARC.append("<span class='key'> - Failure Reporting Options.....................:</span> <span class='value'>" + d_fo[1] + "</span><br>")
            if ( /0/.test(String(d_fo[1])) ) {
              elmDMARC.append("<span class='key'>   `- </span><span class='note'>Generate a DMARC failure report if all underlying authentication mechanisms</span><br>")
              elmDMARC.append("      <span class='note'>(SPF and DKIM) fail to produce an aligned “pass” result. (Default)</span><br>")
            }
            if ( /1/.test(String(d_fo[1])) ) {
              elmDMARC.append("<span class='key'>   `- </span><span class='note'>Generate a DMARC failure report if any underlying authentication mechanism</span><br>")
              elmDMARC.append("      <span class='note'>(SPF or DKIM) produced something other than an aligned \"pass\" result. (Recommended)</span><br>")
            }
            if ( /d/i.test(String(d_fo[1])) ) {
              elmDMARC.append("<span class='key'>   `- </span><span class='note'>Generate a DKIM failure report if the message had a signature that failed</span><br>")
              elmDMARC.append("      <span class='note'>evaluation, regardless of its alignment.</span><br>")
            }
            if ( /s/i.test(String(d_fo[1])) ) {
              elmDMARC.append("<span class='key'>   `- </span><span class='note'>Generate an SPF failure report if the message failed SPF evaluation,</span><br>")
              elmDMARC.append("      <span class='note'>regardless of its alignment.</span><br>")
            }
          } else elmDMARC.append("<span class='key'> - Unknown DMARC mechanism.......................:</span> <span class='value'>" + dmarcRecords[i] + "</span><br>")
        }
        
      }
      if ( !/pct=/.test(String(result)) ) elmDMARC.append("<span class='key'> - Percentage of messages subjected to filtering.:</span> <span class='value'>100%</span><br>")

    }
  });

  const elmNS = $("#"+itemPage).find(".dnsresult").find(".ns")
  resolver.resolve(String(workTarget),'NS', (err, result) => {
    if (err) {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    } else {
      elmNS.append("<span class='title'>==[ NS record ]================================</span><br>")
      result.forEach( function(nssrv) {
        resolver.resolve(String(nssrv),'A', (err, result2) => {
          if ( !err ) {
            var nsip = result2[0]
            resolver.reverse(String(result2[0]), (err, result3) => {
              if ( !err ) {
                elmNS.append("<span class='key'> -</span> <span class='valueb'><span class='poiTarget'>"+nssrv+"</span></span> ( <span class='value'>"+nsip+"</span> <span class='key'>&#8605;</span> <span class='value'><span class='poiTarget'>"+result3+"</span></span> )<br>" )
              } else {
                elmNS.append("<span class='key'> -</span> <span class='valueb'><span class='poiTarget'>" + nssrv + "</span></span> ( <span class='value'>"+nsip+"</span> )<br>")
              }
            });
          }
        });
      });
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    }
  });

  const options = {
    all: true
  };
  const elmA = $("#"+itemPage).find(".dnsresult").find(".resolve").find(".a")
  const elmAAAA = $("#"+itemPage).find(".dnsresult").find(".resolve").find(".aaaa")
  const elmCNAME = $("#"+itemPage).find(".dnsresult").find(".resolve").find(".cname")
  resolver.resolve(String(workTarget),'A', (err, addresses) => {
    elmA.append("<span class='title'>==[ A,AAAA,CNAME ]=============================</span><br>")
    if (err) {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
      elmA.append("<span class='key'> - No A record(s)</span><br>")
    } else {
      addresses.forEach( function(addr) {
        resolver.reverse(String(addr), (err, addrrev) => {
          if ( !err ) {
            elmA.append("<span class='key'> - A record....:</span> <span class='value'>"+addr+"</span> ( Reverse DNS <span class='key'>&#8605;</span> <span class='value'><span class='poiTarget'>"+addrrev+"</span></span> )<br>" )
          } else {
            elmA.append("<span class='key'> - A record....:</span> <span class='value'>"+addr+"</span><br>")
          }
        });
      });
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    }
    resolver.resolve(String(workTarget),'AAAA', (err, addresses) => {
      if (err) {
        itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
        elmAAAA.append("<span class='key'> - No AAAA record(s)</span><br>")
      } else {
        addresses.forEach( function(addr) {
          resolver.reverse(String(addr), (err, addrrev) => {
            if ( !err ) {
              elmAAAA.append("<span class='key'> - AAAA record.:</span> <span class='value'>"+addr+"</span> ( Reverse DNS <span class='key'>&#8605;</span> <span class='value'><span class='poiTarget'>"+addrrev+"</span></span> )<br>" )
            } else {
              elmAAAA.append("<span class='key'> - AAAA record.:</span> <span class='value'>"+addr+"</span><br>")
            }
          });
        });
        itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
      }
      resolver.resolve(String(workTarget),'CNAME', (err, addresses) => {
        if (err) {
          itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
          elmCNAME.append("<span class='key'> - No CNAME record(s)</span><br>")
        } else {
          addresses.forEach( function(addr) {
            elmCNAME.append("<span class='key'> - CNAME record:</span> <span class='value'><span class='poiTarget'>"+addr+"</span></span><br>")
          });
          itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
        }
      });
    });
  });
  
  const fuzz = require("./assets/json/dns-host-fuzz.json");
  if (myDebug) console.log("dns-host-fuzz count: "+fuzz['dns-host-fuzz'].length)
  const fuzzTITLE = $("#"+itemPage).find(".dnsresult").find(".resolvefuzz").find(".title")
  const fuzzWILD = $("#"+itemPage).find(".dnsresult").find(".resolvefuzz").find(".wildcard")
  const fuzzOut = $("#"+itemPage).find(".dnsresult").find(".resolvefuzz").find(".fuzzout")

  fuzzTITLE.append("<span class='title'>==[ Subdomain Fuzz ]===========================</span>")
  // Wildcard detection - Lets just try to resolve something stupid :)
  resolver.resolve('somethingthatshouldneverresolvewhentryingthisout.'+String(workTarget),'A', (err, addresses) => {
    if (!err) {
      fuzzWILD.append("<span class='key'> - </span><span class='valueb'>WARNING</span>: <span class='value'>Target seems to have a wildcard record</span><br>")
      fuzzWILD.append("<span class='key'>   </span><span class='valueb'>WARNING</span>: <span class='value'>Fuzz results might not be reliable</span>")
    }
  });

  var ifuzzA=0
  hostFuzzArray = fuzz['dns-host-fuzz'].concat( store.get('info.fuzzDNSCustom.hostFuzz',[]) )
  hostFuzzArraySorted = hostFuzzArray.sort().filter(function(item, pos, ary) {
    return !pos || item != ary[pos - 1];
  });
  var ifuzzAend = hostFuzzArraySorted.length
  hostFuzzArraySorted.forEach( function(fuzz) {
    ifuzzA++;
    var fuzzTarget = fuzz+"."+workTarget
    fuzzOut.append("<div data-hostfuzzid='"+strSanitizer(fuzz)+"' data-target='"+strSanitizer(fuzzTarget)+"' data-addr='[]' data-gotA=false data-gotAAAA=false data-textA='' data-textAAAA='' class='fuzz--hit--none fuzzbox hostfuzz hostfuzzclick griditem'>"+strSanitizer(fuzz)+"</div>")
    resolver.resolve(String(fuzzTarget),'A', (errA, addressesA) => {
      if (!errA) {
        var me = $("#"+itemPage).find(".dnsresult").find(".resolvefuzz").find(".fuzzout").find(".griditem[data-hostfuzzid='"+fuzz+"']")
        me.attr('title','Click to set new target as: '+fuzzTarget)
        if ( me.data("gotAAAA") ) {
          me.data('gotA',true)
          me.attr('data-textA','IPv4')
          me.removeClass('fuzz--hit--lower')
          me.addClass('fuzz--hit--both')
          //me.data("addr",push(addressesA[0]))
        } else {
          me.data('gotA',true)
          me.attr('data-textA','IPv4')
          me.removeClass('fuzz--hit--none')
          me.addClass('fuzz--hit--upper')
          //me.data("addr",push(addressesA[0]))
        }
      }
    });
    resolver.resolve(String(fuzzTarget),'AAAA', (errAAAA, addressesAAAA) => {
      if (!errAAAA) {
        var me = $("#"+itemPage).find(".dnsresult").find(".resolvefuzz").find(".fuzzout").find(".griditem[data-hostfuzzid='"+fuzz+"']")
        me.attr('title','Click to set new target as: '+fuzzTarget)
        if ( me.data("gotA") ) {
          me.data('gotAAAA',true)
          me.attr('data-textAAAA','IPv6')
          me.removeClass('fuzz--hit--upper')
          me.addClass('fuzz--hit--both')
          //me.data("addr",push(addressesAAAA[0]))
        } else {
          me.data('gotAAAA',true)
          me.attr('data-textAAAA','IPv6')
          me.removeClass('fuzz--hit--none')
          me.addClass('fuzz--hit--lower')
          //me.data("addr",push(addressesAAAA[0]))
        }
      }
    });
    if ( ifuzzA == ifuzzAend ) { // This will run one time when loop is done, so use wisely!
      $(".hostfuzzclick").on("click", function() {
        if ( $(this).data("gotA") || $(this).data("gotAAAA") ) {
          var myFuzz = $(this).data("hostfuzzid")
          var setNewTarget = $(this).data("target")
          if (setNewTarget) {
            setTarget(setNewTarget)
            showPage("pagedefault")
          }
        }
      });
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    }
  });
  
  const elmMX = $("#"+itemPage).find(".dnsresult").find(".mx")
  resolver.resolve(String(workTarget),'MX', (err, result) => {
    if (err) {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    } else {
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
      if (result.length > 0) elmMX.append("<span class='title'>==[ Mail Exchange (MX) ]=======================</span><br>")
      result.forEach( function(mx) {
        var mxSrv = mx.exchange
        var mxPrio = mx.priority
        resolver.resolve(String(mxSrv),'A', (err, mxaddr) => {
          if ( err ) {
            elmMX.append("<span class='key'> -</span> <span class='valueb'><span class='poiTarget'>" + mxSrv + "</span></span> ( <span class='valueErr'>Not found?</span> )<br>")
          } else {
            resolver.reverse(String(mxaddr[0]), (err, mxrev) => {
              if ( !err ) {
                elmMX.append("<span class='key'> -</span> <span class='valueb'><span class='poiTarget'>"+mxSrv+"</span></span> ( <span class='value'>"+mxaddr[0]+"</span> <span class='key'>&#8605;</span> <span class='value'><span class='poiTarget'>"+mxrev+"</span></span> )<br>" )
              } else {
                elmMX.append("<span class='key'> -</span> <span class='valueb'><span class='poiTarget'>" + mxSrv + "</span></span> ( <span class='value'>"+mxaddr[0]+"</span> )<br>")
              }
            });
          }
        });
      });
    }
  });

  // SPF i hardcoded traversal up to 3 layers down
  // IF we want a more dynamic solution this needs to be redone.
  // For now, just enjoy that we can follow includes 2 times etc ...
  const elmSPF = $("#"+itemPage).find(".dnsresult").find(".spf")
  const spfCount1 = $("#"+itemPage).find(".dnsresult").find(".spfcount").find(".spf1")
  const spfCount2 = $("#"+itemPage).find(".dnsresult").find(".spfcount").find(".spf2")

  resolver.resolve(String(workTarget),'TXT', (err, result) => {
    if (err) {
      console.log(err)
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    } else {
      elmSPF.append("<span class='title'>==[ SPF record(s) ]============================</span><br>")
      result.forEach( function(txtrecord) {
        // Have not yet decided, but for now lets skip any SPF records and handle
        // them under the SPF section and show it more pretty ...
        if ( /spf/i.test(txtrecord) ) {
          if ( /^v=spf1/i.test(txtrecord) ) spfCount1.data("count", parseInt(spfCount1.data("count"))+1 )
          if ( /^spf2/i.test(txtrecord) ) spfCount2.data("count", parseInt(spfCount2.data("count"))+1 )
          spfCount1.html("<span class='key'> - SPFv1 Lookup count: </span><span class='value'>"+spfCount1.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
          spfCount2.html("<span class='key'> - SPFv2 Lookup count: </span><span class='value'>"+spfCount2.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
          var spfblocks = String(txtrecord).split(' ')
          spfblocks.forEach( function(spfstr) {
            elmSPF.append("<span class='key'> - </span><span class='valueb'>"+spfstr+"</span> <span class='note'>"+spfNote(spfstr)+"</span><br>")
            if ( /^include:/i.test(spfstr) ) {
              const regexp = /include:(.*)/i
              var includeHost = spfstr.match(regexp)
              elmSPF.append("<span class='key'>   `- </span><span class='value'><span class='poiTarget'>"+includeHost[1]+"</span></span>  <span class='note'>"+spfNote(includeHost[1])+"</span><br>")
              elmSPF.append("<div data-spfincludehost='"+includeHost[1]+"'></div>")
              resolver.resolve(String(includeHost[1]),'TXT', (err, result) => {
                var inclHost = includeHost[1]
                if (!err) {
                  result.forEach( function(txtrecord) {
                    if ( /spf/i.test(txtrecord) ) {
                      if ( /^v=spf1/i.test(txtrecord) ) spfCount1.data("count", parseInt(spfCount1.data("count"))+1 )
                      if ( /^spf2/i.test(txtrecord) ) spfCount2.data("count", parseInt(spfCount2.data("count"))+1 )
                      spfCount1.html("<span class='key'> - SPFv1 Lookup count: </span><span class='value'>"+spfCount1.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
                      spfCount2.html("<span class='key'> - SPFv2 Lookup count: </span><span class='value'>"+spfCount2.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
                      var $this = $("#"+itemPage).find(".dnsresult").find(".spf").find("div[data-spfincludehost='"+inclHost+"']")
                      var spfblocks = String(txtrecord).split(' ')
                      spfblocks.forEach( function(spfstr) {
                        $this.append("<span class='key'>     `- </span><span class='value'>"+spfstr+"</span>  <span class='note'>"+spfNote(spfstr)+"</span><br>")
                        if ( /^include:/i.test(spfstr) ) {
                          const regexp = /include:(.*)/i
                          var includeHost2 = spfstr.match(regexp)
                          $this.append("<span class='key'>       `- </span><span class='value'><span class='poiTarget'>"+includeHost2[1]+"</span></span>  <span class='note'>"+spfNote(includeHost2[1])+"</span><br>")
                          $this.append("<div data-spfincludehostsub='"+includeHost2[1]+"'></div>")
                          resolver.resolve(String(includeHost2[1]),'TXT', (err, result2) => {
                            var inclHost2 = includeHost2[1]
                            if (!err) {
                              result2.forEach( function(txtrecord2) {
                                if ( /spf/i.test(txtrecord2) ) {
                                  if ( /^v=spf1/i.test(txtrecord2) ) spfCount1.data("count", parseInt(spfCount1.data("count"))+1 )
                                  if ( /^spf2/i.test(txtrecord2) ) spfCount2.data("count", parseInt(spfCount2.data("count"))+1 )
                                  spfCount1.html("<span class='key'> - SPFv1 Lookup count: </span><span class='value'>"+spfCount1.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
                                  spfCount2.html("<span class='key'> - SPFv2 Lookup count: </span><span class='value'>"+spfCount2.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
                                  var $this2 = $("#"+itemPage).find(".dnsresult").find(".spf").find("div[data-spfincludehostsub='"+inclHost2+"']")
                                  var spfblocks2 = String(txtrecord2).split(' ')
                                  spfblocks2.forEach( function(spfstr2) {
                                    $this2.append("<span class='key'>         `- </span><span class='value'>"+spfstr2+"</span>  <span class='note'>"+spfNote(spfstr2)+"</span><br>")
                                    if ( /^include:/i.test(spfstr2) ) {
                                      const regexp = /include:(.*)/i
                                      var includeHost3 = spfstr2.match(regexp)
                                      $this.append("<span class='key'>         `- </span><span class='value'><span class='poiTarget'>"+includeHost3[1]+"</span></span>  <span class='note'>"+spfNote(includeHost3[1])+"</span><br>")
                                      $this.append("<div data-spfincludehostsubsub='"+includeHost3[1]+"'></div>")
                                      resolver.resolve(String(includeHost3[1]),'TXT', (err, result3) => {
                                        var inclHost3 = includeHost3[1]
                                        if (!err) {
                                          result3.forEach( function(txtrecord3) {
                                            if ( /spf/i.test(txtrecord3) ) {
                                              if ( /^v=spf1/i.test(txtrecord3) ) spfCount1.data("count", parseInt(spfCount1.data("count"))+1 )
                                              if ( /^spf2/i.test(txtrecord3) ) spfCount2.data("count", parseInt(spfCount2.data("count"))+1 )
                                              spfCount1.html("<span class='key'> - SPFv1 Lookup count: </span><span class='value'>"+spfCount1.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
                                              spfCount2.html("<span class='key'> - SPFv2 Lookup count: </span><span class='value'>"+spfCount2.data("count")+" <span class='note'>(Over 10 and SPF record is invalid!!)</span></span>")
                                              var $this3 = $("#"+itemPage).find(".dnsresult").find(".spf").find("div[data-spfincludehostsubsub='"+inclHost3+"']")
                                              var spfblocks3 = String(txtrecord3).split(' ')
                                              spfblocks3.forEach( function(spfstr3) {
                                                $this3.append("<span class='key'>           `- </span><span class='value'>"+spfstr3+"</span>  <span class='note'>"+spfNote(spfstr3)+"</span><br>")
                                              })
                                            }
                                          })
                                        }
                                      });
                                    }
                                  })
                                }
                              })
                            }
                          });
                        }
                      })
                    }
                  })
                }
              });
            }
          })
          elmSPF.append("<br>")
        }
      })
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    }
  });

  const elmTXT = $("#"+itemPage).find(".dnsresult").find(".txt")
  resolver.resolve(String(workTarget),'TXT', (err, result) => {
    if (err) {
      console.log(err)
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    } else {
      elmTXT.append("<span class='title'>==[ TXT record(s) ]============================</span><br>")
      result.forEach( function(txtrecord) {
        // Have not yet decided, but for now lets skip any SPF records and handle
        // them under the SPF section and show it more pretty ...
        if ( !/spf/i.test(txtrecord) ) elmTXT.append("<span class='key'> - \"</span><span class='value'>"+txtParser(txtrecord)+"</span><span class='key'>\"</span><br>")
        else elmTXT.append("<span class='key'> - </span><span class='valueErr'>Found SPF related TXT record, look under SPF section instead</span><br>")
      })
      itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
    }
  });
    
  const fuzzTXT = require("./assets/json/dns-txt-fuzz.json");
  const fuzzTxtTITLE = $("#"+itemPage).find(".dnsresult").find(".txtfuzz").find(".title")
  const fuzzTxtOut = $("#"+itemPage).find(".dnsresult").find(".txtfuzz").find(".fuzzout")

  fuzzTxtTITLE.append("<span class='title'>==[ TXT Fuzz ]===========================</span>")

  var ifuzzTXT=0
  txtFuzzArray = fuzzTXT['dns-txt-fuzz'].concat( store.get('info.fuzzDNSCustom.txtFuzz') )
  txtFuzzArraySorted = txtFuzzArray.sort().filter(function(item, pos, ary) {
    return !pos || item != ary[pos - 1];
  });
  
  var txtFuzzTargets = [
    "%FUZZ%."+workTarget,
    "_%FUZZ%."+workTarget
  ]
  var ifuzzTXTend = txtFuzzArraySorted.length * txtFuzzTargets.length

  for ( fii=0 ; fii < txtFuzzTargets.length ; fii++ ) {
    var fuzzSub = txtFuzzTargets[fii]
    txtFuzzArraySorted.forEach( function(fuzz) {
      var fuzzTarget = fuzzSub.replace('%FUZZ%', fuzz)
      ifuzzTXT++
      resolver.resolve(String(fuzzTarget),'TXT', (err, result) => {
        if (!err) {
          if ( result.length > 0 ) {
            //var otherInterresting = 0
            //result.forEach( function(txtr) {
            //  if ( !/v=spf/i.test(txtr) && /v=dmarc1/i.test(txtr) && !/spf2/i.test(txtr)) otherInterresting++
            //})
            //if (otherInterresting > 0) fuzzTxtOut.append("<span class='key'> - <span class='poiTarget'>"+fuzzTarget+"</span></span> <span class='note'>(We strip spf/dmarc)</span><br>")
            fuzzTxtOut.append("<span class='key'> - <span class='poiTarget'>"+strSanitizer(fuzzTarget)+"</span></span> <span class='note'>(We strip spf/dmarc)</span><br>")
            result.forEach( function(txtr) {
              // We strip SPF and DMARC txt records, this is more for digging for other stuff !!
              // Proper SPF viewing should be done directly on the target!
              //if (!/v=spf/i.test(txtr) && /v=dmarc1/i.test(txtr) && !/spf2/i.test(txtr) ) {
              //  console.log("txtr: "+txtr)
                fuzzTxtOut.append("<span class='key'>   `- \"</span><span class='value'>"+txtParser(txtr)+"</span><span class='key'>\"</span><br>")
              //}
            })
          }
        }
      });
      console.log(ifuzzTXT +" / "+ ifuzzTXTend )
      if ( ifuzzTXT == ifuzzTXTend ) { // This will run one time when loop is done, so use wisely!
        itemResult.data("totalTasksDone", itemResult.data("totalTasksDone")+1)
      }
    });
    //if ( fuzzSrvOut.html().length < 1 ) {
    //  fuzzTxtTITLE.hide();
    //}
  }

  



  // This is the internal timer to check if all async things have finished ...
  // Dont forget to count up the totalTasksDone or else we "run" in working state
  // forever :) Thats not cool bro!
  itemResult.data('interval', setInterval(function(myID) {
    var itemID = $("#"+myID).attr('id');
    var itemTitle = $("#"+myID).data("title");
    var itemPage = $("#"+myID).data("page");
    var itemResult = $("#"+itemPage).find(".dnsresult");
    if ( itemResult.data("totalTasks") == itemResult.data("totalTasksDone") ) {
      $("#"+itemID).data('status',"done");
      clearInterval(itemResult.data('interval'));
    }
  }, 1000,myID));
}

window.dnsWhois = function(myID=false) {
  
  // Item internal details
  var itemID = $("#"+myID).attr('id');
  var itemTitle = $("#"+myID).data("title");
  var itemPage = $("#"+myID).data("page");
  var itemFunc = $("#"+myID).data("function");
  if (myDebug) console.log("["+itemFunc+"]"+itemID+": Function running, output to: "+itemPage);
  
  // Fetching my target (taken from what i am), this is not
  // the overall target set in Redjoust. I need to look at
  // my parrent fieldset's legend that has the target i need
  // to look at!!
  var useTarget = $("#targetDomainname").text();

  // Just setting tsome stuff to be nice
  $("#"+itemID).data('status',"working");

  whoisLookup(useTarget).then((data) => { 
    $("#domwhoisresult").text(data).html()
    $("#"+itemID).data('status',"done"); // Mark us as done! ( Or you will see working-spin-of-death :D )
  }).catch((err) => {
    if (myDebug) console.log(err)
    $("#"+itemID).data('status',"done"); // Mark us as done! ( Or you will see working-spin-of-death :D )
    itemBroke(itemID,'Whois lookup failed!')
  })

}

window.ipWhois = function(myID=false) {
  
  // Item internal details
  var itemID = $("#"+myID).attr('id');
  var itemTitle = $("#"+myID).data("title");
  var itemPage = $("#"+myID).data("page");
  var itemFunc = $("#"+myID).data("function");
  if (myDebug) console.log("["+itemFunc+"]"+itemID+": Function running, output to: "+itemPage);
  
  // Fetching my target (taken from what i am), this is not
  // the overall target set in Redjoust. I need to look at
  // my parrent fieldset's legend that has the target i need
  // to look at!!
  var useTarget = $("#targetIP").text();

  // Just setting tsome stuff to be nice
  $("#"+itemID).data('status',"working");

  whoisLookup(useTarget).then((data1) => { 
    $("#ipwhoisresult").text('=[ FIRST QUERY  ]======================================\n').html()
    $("#ipwhoisresult").append(data1)
    $("#ipwhoisresult").append('=[ SECOND QUERY ]======================================\n\n')
    var regexp = /^CIDR:[ ]+(?<ipnet>[0-9\.]*)[\/]/im
    var ipres = data1.match(regexp)
    var ipnet = ipres[1]
    whoisLookup(ipnet,true).then((data2) => { 
      $("#ipwhoisresult").append(data2)
      $("#"+itemID).data('status',"done"); // Mark us as done! ( Or you will see working-spin-of-death :D )
    }).catch((err2) => {
      if (myDebug) console.log(err2)
      $("#"+itemID).data('status',"done"); // Mark us as done! ( Or you will see working-spin-of-death :D )
      //itemBroke(itemID,'Whois lookup failed!') // Not really failed! Second run, looking for IP Net whois to lookup ...
    })
  }).catch((err1) => {
    if (myDebug) console.log(err1)
    $("#"+itemID).data('status',"done"); // Mark us as done! ( Or you will see working-spin-of-death :D )
    itemBroke(itemID,'Whois lookup failed!')
  })
  
}
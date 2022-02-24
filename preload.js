// Preload JS
const { contextBridge, ipcRenderer } = require('electron')

const os = require('os')
const storage = require('electron-json-storage')

const sysUserInfo = os.userInfo();

// Redjoust vars
let myTarget = null
let myMode = null

// Initialize default things
window.onload = () => {
  window.$ = window.jQuery = require('jquery');
  if ( !myMode ) $("#redjoustmode").html("No mode set")
  $(".pages").hide()
  $("#pagedefault").show()
}

contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system')
})

contextBridge.exposeInMainWorld('userInfo', {
  username: sysUserInfo.username
});

contextBridge.exposeInMainWorld('setMode', {
    activate (data) {
      if ( data == "passive" ) myMode = "PASSIVE"
      if ( data == "active" ) myMode = "ACTIVE"
      $("#redjoustmode").html(myMode)
    }
});


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
    console.log("Disable lockscreen")
    disableLockscreen()
} else {
  ipcRenderer.invoke('locked:lock')
    console.log("Enable lockscreen")
    enableLockscreen("","lock")
}
});

ipcRenderer.on('showpagedefault', (event) => {
  $(".pages").hide();
  $("#pagedefault").show()
  console.log("Show default page");
});
ipcRenderer.on('showpagetarget', (event) => {
  $(".pages").hide();
  $("#pagetarget").show()
  console.log("Show target page");
});
ipcRenderer.on('showpagetestlong', (event) => {
  $(".pages").hide();
  $("#pagetestlong").show()
  console.log("Show long test page");
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
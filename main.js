// Modules
const { app, powerMonitor, BrowserWindow, BrowserView, Tray, ipcMain, nativeTheme, globalShortcut, nativeImage, Menu, MenuItem } = require('electron')
const os = require('os')
const osUtils = require('os-utils')
const path = require('path')
const Store = require('electron-store');
let myWindow = null

Store.initRenderer();
const defaultSettingsSchema = require('./assets/js/config-scheme.js');
const store = new Store({defaults: defaultSettingsSchema});

//const appIcon = new Tray('') // Support for tray features in the future ???

// Prepare for eventually using Squirrel Installer for Windows binaries ?
// Just so it don't startup the app multiple times doing build process
if (require('electron-squirrel-startup')) {
    app.quit();
    process.exit(0);
}

const openAboutWindow = require('about-window').default;

app.once('window-all-closed', function () {
    app.quit();
});

var locked = false;


// Create RedJoust main window
const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        show: false, // Preload wait functionality (good for remote web pages etc)
        center: true,
        resizable: true,
        fullscreen: false,
        frame: true,
        darkTheme: true,
        autoHideMenuBar: false,
        icon: nativeImage.createFromPath(__dirname + '/assets/redjoust-icon.png').resize({width:64}),
        width: 1400, // Good size, i will try to keep this at all times
        minWidth: 1280, // I like this safe min resolution
        minHeight: 700,
        webPreferences: {
            defaultEncoding: 'UTF-8',
            devTools: true,
            webSecurity: true,
            nodeIntegration : true,
            contextIsolation: true,
            //enableBlinkFeatures: "CSSColorSchemeUARendering", // Security risk ...
            preload: path.join(__dirname, './preload.js') // Heavy lifting ?
        }
    })

    // and load the main window of the app
    mainWindow.loadFile('redjoust.html')

    // Allowing preload wait functionality to happen
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    let appName = require(path.join(__dirname, 'package.json')).name
    let appVersion = require(path.join(__dirname, 'package.json')).version
    let appArch = os.arch()
    let appRelease = os.release()
    let appAuthor = require(path.join(__dirname, 'package.json')).author
    mainWindow.setTitle("RedJoust v" + appVersion + " by " + appAuthor + " ( " + appRelease + " )" );

    ipcMain.handle('dark-mode:toggle', () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = 'light'
        } else {
            nativeTheme.themeSource = 'dark'
        }
        return nativeTheme.shouldUseDarkColors
    })

    ipcMain.handle('theme:light', () => {
      nativeTheme.themeSource = 'light'
    })
    ipcMain.handle('theme:dark', () => {
      nativeTheme.themeSource = 'dark'
    })
    ipcMain.handle('theme:system', () => {
      nativeTheme.themeSource = 'system'
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    })

    ipcMain.handle('locked:lock', () => {
        locked = true;
    })
    ipcMain.handle('locked:unlock', () => {
        locked = false;
    })


    ipcMain.on('show-context-menu', (event) => {
      const template = [
        {label: "Undo", accelerator: "Ctrl+Z", selector: "undo:"},
      {label: "Redo", accelerator: "Shift+Ctrl+Z", selector: "redo:"},
      {type: "separator"},
      {label: "Cut", accelerator: "Ctrl+X", selector: "cut:"},
      {label: "Copy", accelerator: "Ctrl+C", selector: "copy:"},
      {label: "Paste", accelerator: "Ctrl+V", selector: "paste:"},
      {label: "Select All", accelerator: "Ctrl+A", selector: "selectAll:"}
      ]
      const menu = Menu.buildFromTemplate(template)
      menu.popup(BrowserWindow.fromWebContents(event.sender))
    })

    /* System Idle features, perhaps in the future
    ipcMain.handle('idle:state', () => {
      mainWindow.webContents.send(powerMonitor.getSystemIdleState(4));
    })
    ipcMain.handle('idle:time', () => {
      mainWindow.webContents.send(powerMonitor.getSystemIdleTime());
    })
    powerMonitor.on('suspend', () => {
      console.log('The system is going to sleep');
    });
    powerMonitor.on('resume', () => {
      console.log('The system is resuming');
    });
    powerMonitor.on('on-ac', () => {
      console.log('The system is on AC Power (charging)');
    });
    powerMonitor.on('on-battery', () => {
      console.log('The system is on Battery Power');
    });
    powerMonitor.on('shutdown', () => {
      console.log('The system is Shutting Down');
    });
    powerMonitor.on('lock-screen', () => {
      console.log('The system is about to be locked');
    });
    powerMonitor.on('unlock-screen', () => {
      console.log('The system is unlocked');
    });
    */

    setInterval(() => {
        osUtils.cpuUsage(function (v) {
            mainWindow.webContents.send("cpu", v * 100 );
            let tmem = osUtils.totalmem()
            let fmem = osUtils.freemem()
            mainWindow.webContents.send("mem", (tmem-fmem) / 1024);
            mainWindow.webContents.send("total-mem", tmem / 1024);
        });
      }, 800);

      // Power monitoring, default idle time threshold is 300sec (5min)
      setInterval(() => {
        idleThres = store.get('settings.idle',300)
        mainWindow.webContents.send("idleState", powerMonitor.getSystemIdleState(idleThres) );
      }, 1000);

      const menu = new Menu()
menu.append(new MenuItem({
  label: 'File',
  submenu: [{
    label: 'Change target',
    icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/target.png').resize({width:16}),
    accelerator: process.platform === 'darwin' ? 'Cmd+T' : 'Ctrl+T',
    click: () => { mainWindow.webContents.send("showpagetarget"); }
  },
  {
    label: 'Change mode',
    icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/mode.png').resize({width:16}),
    accelerator: process.platform === 'darwin' ? 'Cmd+M' : 'Ctrl+M',
    click: () => { mainWindow.webContents.send("showpagemode"); }
  },
  {
    type: 'separator'
  },
  {
    label: 'Clear target + mode',
    click: () => { mainWindow.webContents.send("showpageclear"); }
  },
  {
    type: 'separator'
 },
  {
    label: 'Lock screen',
    icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/lock.png').resize({width:16}),
    accelerator: process.platform === 'darwin' ? 'Cmd+L' : 'Ctrl+L',
    click: () => { mainWindow.webContents.send("lockscreen"); }
  },
  {
    label: 'Preferences',
    icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/preferences.png').resize({width:16}),
    click: () => { mainWindow.webContents.send("showpreferences"); }
  },
  {
    type: 'separator'
 },
  {
    role: 'quit',
    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
    click: () => { app.quit(); }
  }]
}))
menu.append(new MenuItem({
    label: 'Run',
    submenu: [{
        label: 'Start ',
        icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/start.png').resize({width:16}),
        accelerator: process.platform === 'darwin' ? 'F5' : 'F5',
        click: () => { 
          mainWindow.webContents.send("runitems")
        }
    },
    {
        label: 'Reset Everything',
        icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/stop.png').resize({width:16}),
        accelerator: process.platform === 'darwin' ? 'F6' : 'F6',
        click: () => { mainWindow.webContents.send("resetitems") }
    }]
  }))
menu.append(new MenuItem({
    label: 'View',
    submenu: [{
      label: 'Toggle Privacy-mode',
      accelerator: process.platform === 'darwin' ? 'F9' : 'F9',
      click: () => { mainWindow.webContents.send("toggleprivacymode") }
    },
    {
      label: 'Toggle Toolbox',
      accelerator: process.platform === 'darwin' ? 'F10' : 'F10',
      click: () => { mainWindow.webContents.send("toggleexternaltools") }
    },
    { type: 'separator' },
    { role: 'togglefullscreen' },
    {
      role: 'toggleDevTools',
      accelerator: process.platform === 'darwin' ? 'F12' : 'F12',
      click: () => { mainWindow.webContents.toggleDevTools() }
    },
    { type: 'separator' },
    {
      label: 'Appearance',
        submenu: [
          { role: 'zoomin' },
          { role: 'zoomout' },
          { type: 'separator' },
          { role: 'resetzoom' }
        ],
     }
     ]
  }))
  menu.append(new MenuItem({
    label: 'Help',
    submenu: [{
        label: 'Github page',
        icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/link.png').resize({width:16}),
        click: () => { require('electron').shell.openExternal("https://github.com/kawaiipantsu/redjoust") }
      },
      {
        role: 'help',
        icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/link.png').resize({width:16}),
        accelerator: process.platform === 'darwin' ? 'F1' : 'F1',
        click: () => { require('electron').shell.openExternal("https://github.com/kawaiipantsu/redjoust/wiki") }
      },
      {
        label: 'Report issue',
        icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/link.png').resize({width:16}),
        click: () => { require('electron').shell.openExternal("https://github.com/kawaiipantsu/redjoust/issues") }
      },
      {
        type: 'separator'
     },
      {
        role: 'about',
        icon: nativeImage.createFromPath(__dirname + '/assets/icons/menu/set1/about.png').resize({width:16}),
        click: () => openAboutWindow({
            icon_path: path.join(__dirname, '/assets/redjoust-icon.png'),
            css_path: path.join(__dirname, '/assets/css/about.css'),
            copyright: 'Copyright (c) 2022 KawaiiPantsu / Dave',
            package_json_dir: __dirname,
            adjust_window_size: true,
            win_options: {
                parent: mainWindow,
                modal: true,
            },
            show_close_button: 'Close',
        })
      }]
  }))

Menu.setApplicationMenu(menu)

    // Open the DevTools.
    //mainWindow.webContents.openDevTools()

    return mainWindow;
}

/* 
// This is a small code block that can serve to make sure only 1 instance of your
// app is running at a time, if someone tried to start it up again, simply restore
// the other app and focus it.
const additionalData = { myKey: 'myValue' }
const gotTheLock = app.requestSingleInstanceLock(additionalData)
if (!gotTheLock) {
  app.quit()
} else {
 app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
  if (myWindow) {
    if (myWindow.isMinimized()) myWindow.restore()
    myWindow.focus()
  }
 })

 // ... WHEN READY BLOCK

}
*/

// Make sure we only create the windows when we are actually ready
// Many NodeJS api's can only be called/utilized after this is true
app.whenReady().then(() => {
    myWindow = createWindow()
    
    app.on('app-command', (e, cmd) => {
        // Navigate the window back when the user hits their mouse back button
        if (cmd === 'browser-backward' && myWindow.webContents.canGoBack()) {
          myWindow.webContents.goBack()
        }
    })
    app.on('activate', () => {
        // MacOS open window handling
        if (myWindow.getAllWindows().length === 0) createWindow()
    })
    // Lets make this so that if any windows are open, close them...
    globalShortcut.register('Esc', () => {
        if ( locked ) {
          // Need to do something while locked and ESC ??
        } else {
          // Escape was hit, now do something !!
          // We use it for showing default front page where you can set target, mode and run!
          myWindow.webContents.send("escpressed")
        }
    });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

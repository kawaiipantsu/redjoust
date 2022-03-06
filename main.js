// Modules
const { app, BrowserWindow, Tray, ipcMain, nativeTheme, globalShortcut, nativeImage, Menu, MenuItem } = require('electron')
const os = require('os')
const osUtils = require('os-utils')
const path = require('path')
const Store = require('electron-store');

Store.initRenderer();

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
        width: 1280,
        minWidth: 900,
        minHeight: 700,
        webPreferences: {
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
            mainWindow.webContents.send("mem", osUtils.freememPercentage() * 100);
            mainWindow.webContents.send("total-mem", osUtils.totalmem() / 1024);
        });
      }, 800);


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
    label: 'Testing',
    submenu: [{
      role: 'toggleDevTools',
      accelerator: process.platform === 'darwin' ? 'F12' : 'F12',
      click: () => { mainWindow.webContents.toggleDevTools() }
    },
    {
        label: 'Show process info',
        accelerator: process.platform === 'darwin' ? 'F11' : 'F11',
        click: () => { mainWindow.webContents.send("showprocessinfo") }
    },
    {
        label: 'Show default page',
        click: () => { mainWindow.webContents.send("showpagedefault") }
    },
    {
        label: 'Show long test page',
        click: () => { mainWindow.webContents.send("showpagetestlong") }
    },
    {
        type: 'separator'
     },
    {
        role: 'resetzoom'
     },
     {
        role: 'zoomin',

     },
     {
        role: 'zoomout'
     }]
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
            icon_path: path.join(__dirname, './assets/redjoust-icon.png'),
            css_path: path.join(__dirname, './assets/css/about.css'),
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
}

// Make sure we only create the windows when we are actually ready
// Many NodeJS api's can only be called/utilized after this is true



app.whenReady().then(() => {
    createWindow()
    
    app.on('app-command', (e, cmd) => {
        // Navigate the window back when the user hits their mouse back button
        if (cmd === 'browser-backward' && win.webContents.canGoBack()) {
            win.webContents.goBack()
        }
    })
    app.on('activate', () => {
        // MacOS open window handling
        if (win.getAllWindows().length === 0) createWindow()
    })
    // Lets make this so that if any windows are open, close them...
    globalShortcut.register('Esc', () => {
        if ( locked ) console.log("WONT QUIT, SCREEN LOCKED!");
        else app.quit();
    });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

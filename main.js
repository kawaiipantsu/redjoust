// Modules
const { app, BrowserWindow, ipcMain, nativeTheme, globalShortcut } = require('electron')
const os = require('os')
const osUtils = require('os-utils')
const storage = require('electron-json-storage')
const path = require('path')

// Prepare for eventually using Squirrel Installer for Windows binaries ?
// Just so it don't startup the app multiple times doing build process
if (require('electron-squirrel-startup')) {
    app.quit();
    process.exit(0);
}

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
        autoHideMenuBar: true,
        icon: path.join(__dirname, './assets/icons/png/128x128.png'),
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

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    })

    setInterval(() => {
        osUtils.cpuUsage(function (v) {
            mainWindow.webContents.send("cpu", v * 100 );
            mainWindow.webContents.send("mem", osUtils.freememPercentage() * 100);
            mainWindow.webContents.send("total-mem", osUtils.totalmem() / 1024);
        });
      }, 1000);

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
    globalShortcut.register('Esc', () => {
        app.quit();
    });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

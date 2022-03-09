/*****************************************************
 * RedJoust - Default Config settings
 * 
 * We use the Electron module called: electron-store
 * It's a simple get/set/has storage module and it
 * uses the OS default user path. Not much to setup.
 * 
 * This file will always be the default config file
 * and any changes here will update any users old 
 * config file with missing values when the app is run.
 */

 module.exports = {
    
    settings: {
        theme: 'system',
        streamermode: false,
        debug: false
    },
    menuitems: {
        passive: {
            allow: true,
            runwarning: false
        },
        active: {
            allow: true,
            runwarning: false
        },
        redteam: {
            allow: true,
            runwarning: false
        },
        externaltools: {
            show: true,
            terminal: false
        }
    },
    info: {
        target: null,
        mode: null,
        itemDefaults: {
            dnsresolver: 'system',
            username: 'admin',
            password: 'admin',
            timeout: 5
        }
    },
    targetHistory: {
        maxtargets: 50,
        targets: []
    }

};
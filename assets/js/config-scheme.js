/*****************************************************
 * RedJoust - Default Config scheme
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
        type: 'object',
        properties: {
            theme: { type: 'string', default: 'system' },
            streamermode: { type: 'boolean', default: false },
            idle: { type: 'integer', default: 300 },
            idlelock: { type: 'boolean', default: false },
            debug: { type: 'boolean', default: false }
        },
        default: {}
    },
    menuitems: {
        type: 'object',
        properties: {
            passive: {
                type: 'object',
                properties: {
                    allow: { type: 'boolean', default: true },
                    runwarning: { type: 'boolean', default: false }
                },
                default: {}
            },
            active: {
                type: 'object',
                properties: {
                    allow: { type: 'boolean', default: true },
                    runwarning: { type: 'boolean', default: false }
                },
                default: {}
            },
            redteam: {
                type: 'object',
                properties: {
                    allow: { type: 'boolean', default: true },
                    runwarning: { type: 'boolean', default: false }
                },
                default: {}
            },
            externaltools: {
                type: 'object',
                properties: {
                    show: { type: 'boolean', default: true },
                    terminal: { type: 'boolean', default: false }
                },
                default: {}
            }
        },
        default: {}
    },
    info: {
        type: 'object',
        properties: {
            target: { type: 'string', default: '' },
            mode: { type: 'string', default: '' },
            itemDefaults: {
                type: 'object',
                properties: {
                    whoistimeout: { type: 'integer', default: 60000 },
                    whoisfollow: { type: 'integer', default: 2 },
                    whoistidnsresolvermeout: { type: 'string', default: 'system' },
                    username: { type: 'string', default: 'admin' },
                    password: { type: 'string', default: 'admin' },
                    timeout: { type: 'integer', default: 5 }
                },
                default: {}
            },
            fuzzDNSCustom: {
                type: 'object',
                properties: {
                    hostFuzz: { type: 'array', default: [] },
                    txtFuzz: { type: 'array', default: [] },
                    srvFuzz: { type: 'array', default: [] }
                },
                default: {}
            }
        },
        default: {}
    },
    targetHistory: {
        type: 'object',
        properties: {
            maxtargets: { type: 'integer', default: 50 },
            targets: { type: 'array', default: [] }
        },
        default: {}
    }
};
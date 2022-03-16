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
    
    conf: {
        type: 'object',
        properties: {
            test: {
                type: 'object',
                properties: {
                    a1: {
                        type: 'string',
                        default: 'test'
                    }
                },
                default: {}
            }
        },
        default: {}
    }
};
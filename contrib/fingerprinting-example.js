/*****************************************************************
 * DNS TXT Fingerprinting of Online Vendor verification string
 *
 * This is an example on how you can use the fingerprint JSON
 * file to enable detecting txt strings in your own code, you
 * don't need to use Redjoust to get that functionality etc.
 *
 * The JSON file is however maintained by Redjoust for Redjoust
 * But how you use it otherwise is completely up to you :)
 *
 * Enjoy!
 */

 // Let's prepare NodeJS DNS support
 const { Resolver } = require('dns');
 const resolver = new Resolver();

 // Test target (Chosen cisco as they have excessive txt records)
 let target = "cisco.com"

 // Read the JSON file and decode it!
 const fingerprints = require("../assets/json/online-service-provider-fingerprint.json")

 // Out arrays that holds the output results for later printing
 var results = {
     "detected": [],
     "undetected": []
 }

 // Make DNS TXT lookup, loop through all TXT records and then match them up against
 // all the fingerprint test regexp's

 // Resolver is ASYNC, so quick hack to wait for it to finish
 // You are properly doing seomthing way more fancy like promises in your code!!
 var waiting = true;

 resolver.resolve(String(target),'TXT', (err, result) => {
     if ( !err ) {
        console.log ("==[ %s ]=========================================",target)
        for (i=0;i<result.length;i++) {
            var txtString = String(result[i]).trim()
            var found = false;
            for (j=0;j<fingerprints.knownFingerprints.length;j++) {
                // Unlike PHP Javascript needs to build a RegExp object, but wont accept the full pattern or globals in one go
                // So we have to match it and build it form that
                var _regx = fingerprints.knownFingerprints[j].serviceHash.regexp.test.match(/^\/(.*)\/([a-z]{0,4})$/i)
                if ( _regx.length > 1 && _regx.length < 4 ) {
                  if ( _regx.length == 2) var testRegExp = new RegExp(String(_regx[1]))
                  if ( _regx.length == 3) var testRegExp = new RegExp(String(_regx[1]),String(_regx[2]))
                  if ( testRegExp.test(txtString) ) {
                    results.detected.push(fingerprints.knownFingerprints[j].fingerprintName)
                    found = true;
                  }
                }
            }

            if ( found === false ) results.undetected.push(txtString)

        }
        // Lets print it all out nicely
        results.detected.forEach(element => {
            console.log(" - [  DETECTED] %s",element)
        })
        results.undetected.forEach(element => {
            console.log(" - [UNDETECTED] %s",element)
        })
        console.log("==")
    }
 })

 
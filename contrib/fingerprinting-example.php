<?php
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

 // Test target (Chosen cisco as they have excessive txt records)
 $target = "cisco.com";

 // Read the JSON file and decode it!
 $fingerprints = json_decode(file_get_contents("../assets/json/online-service-provider-fingerprint.json"));

 $result["detected"] = array();
 $result["undetected"] = array();
 

// Make DNS TXT lookup, loop through all TXT records and then match them up against
// all the fingerprint test regexp's

$txtRecords = dns_get_record($target,DNS_TXT);

foreach ( $txtRecords as $txtRecord ) {
    $txtString = trim($txtRecord["txt"]);
    $found = false;

    foreach ( $fingerprints->knownFingerprints as $fingerprint ) {
        if ( preg_match( $fingerprint->serviceHash->regexp->test , $txtString ) ) {
            $result["detected"][] = $fingerprint->fingerprintName;
            $found = true;
        }
    }
    if ( $found === false) $result["undetected"][] = $txtString;
}

// We now have to array with detected and undetected fingerprints
// Let's show them !! Detected first, then undetected
printf ("==[ %s ]=========================================\n",$target);
foreach ( $result["detected"] as $f) printf(" - [%10s] %s\n","DETECTED",$f);
foreach ( $result["undetected"] as $f) printf(" - [%10s] %s\n","UNDETECTED",$f);
printf("==\n");

?>
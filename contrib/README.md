# ᵔᴥᵔ Contrib - Scripts and other things!

We all know the "contrib" content can often help you any so many ways :) It should come as no surprice here that we want the same thing. Redjoust is a application and getting larger and larger. That said we are implementing a lot of features in it and some of those would perhaps be of great usage in your project so the whole point of the contrib content is to carve out some of the functonallity and then show you how to use it for your self!

**DNS TXT Fingerprinting Online Vendor verification strings**

We have a JSON file with all the fingerprinting data in it, so we have made a few example scripts to show you how to ustilize it on your own. Only shown the actualy output from the PHP script, but the JS and Pyton does exactly the same.

``` bash
# Edit the file to set target and then run

❯ nodejs fingerprinting-example.php
❯ python fingerprinting-example.py
❯ php fingerprinting-example.php
```

``` bash
# Output should be something like

==[ cisco.com ]=========================================
 - [  DETECTED] Atlassian Organization/IDP claim
 - [  DETECTED] Adobe Enterprise IDP claim
 - [  DETECTED] Amazon AWS - Simple Email Service (SES)
 - [  DETECTED] DocuSign Admin (SSO domain claim)
 - [  DETECTED] Atlassian Organization/IDP claim
 - [  DETECTED] Facebook Business Manager
 - [  DETECTED] Amazon AWS - Simple Email Service (SES)
 - [  DETECTED] Atlassian Organization/IDP claim
 - [  DETECTED] Google Webmaster/Analytics managed site
 - [  DETECTED] Google Webmaster/Analytics managed site
 - [  DETECTED] Google Webmaster/Analytics managed site
 - [  DETECTED] Google Webmaster/Analytics managed site
 - [  DETECTED] Atlassian Organization/IDP claim
 - [  DETECTED] Atlassian Organization/IDP claim
 - [  DETECTED] Fastly Apex/Subdomains delegation to allow multiple accounts
 - [  DETECTED] Fastly Apex/Subdomains delegation to allow multiple accounts
 - [  DETECTED] Facebook Business Manager
 - [  DETECTED] Atlassian Organization/IDP claim
 - [  DETECTED] Fastly Apex/Subdomains delegation to allow multiple accounts
 - [  DETECTED] Fastly Apex/Subdomains delegation to allow multiple accounts
 - [  DETECTED] Spiceworks Monitor/Tracking - domain claim
 - [  DETECTED] Amazon AWS - Simple Email Service (SES)
 - [  DETECTED] Microsoft Office 365 tenant
 - [  DETECTED] DocuSign Admin (SSO domain claim)
 - [  DETECTED] Google Webmaster/Analytics managed site
 - [UNDETECTED] identrust_validate=ghHH/PVHOCjuBcZuTLNyCU18HTX8FNs70hOQxy7R6dbT
 - [UNDETECTED] QuoVadis=94d4ae74-ecd5-4a33-975e-a0d7f546c801
 - [UNDETECTED] adobe-aem-verification=www-idev-cloud.cisco.com/24859/366204/1b990ef7-ff88-4938-bdd9-8458cc152f57
 - [UNDETECTED] intercom-domain-validation=8806e2f9-7626-4d9e-ae4d-2d655028629a
 - [UNDETECTED] c900335b8b825859b51473b9943a3880ae795df47426483b0a67630377a902f5
 - [UNDETECTED] v=spf1 redirect=spfa._spf.cisco.com
 - [UNDETECTED] asv=ac90e11808e87cfbf8768e69819b1aca
 - [UNDETECTED] onetrust-domain-verification=20345dd0c33946f299f14c1498b41f67
 - [UNDETECTED] duo_sso_verification=AxenLdoqIXzjl2RJzE1BlOfkawDbDFlnbyvjAt8vcjKHBkvYwEMySDRk5QmBd66v
 - [UNDETECTED] duo_sso_verification=pG21Oj5OPCxRPsWXsfbauWT9oua82cKtYUPAmsQvovKNq3xqWEcsEMEAhtXy8AFr
 - [UNDETECTED] 926723159-3188410
 - [UNDETECTED] �atlassian-domain-verification=blI4HshP3kJO1PV8nZFlncJ6TwVviYYxBNhkMi9wIa9DTxUjY4p1GO7O5SjiioyT
 - [UNDETECTED] wiz-domain-verification=af241e6396696eedf1b361891435f6b21bdebb5621941d99279298c076b5bf5f
 - [UNDETECTED] mixpanel-domain-verify=2c6cb1aa-a3fb-44b9-ad10-d6b744109963
 - [UNDETECTED] SFMC-o7HX74BQ79k7glpt_qjlF2vmZO9DpqLtYxKLwg87
 - [UNDETECTED] identrust_validate=JnSSfW+y58dEQju6mVBe8lu1MGFepXI50P27OE1ZZQmL
 - [UNDETECTED] identrust_validate=Wns4/AOM0Ij2kQCQhzvNbMcoBzxItOa+44O7KF06lIp3
 - [UNDETECTED] zpSH7Ye/seyY61hH8+Rq5Kb+ZJ9hDa+qeFBaD/6sPAAg+2POkGdP0byHb1pFVK9uZgYF2AIosUSZq4MB17oydQ==
 - [UNDETECTED] apple-domain-verification=qOInipPgso3W8cmK
 - [UNDETECTED] duo_sso_verification=IYdVUIrb2L95JVejSXV3hfsJVDZolQKKOPBztlD6TIgfCRSKeMuf8WgbQuFLD4aL
 - [UNDETECTED] adobe-aem-verification=www-devint-cloud.cisco.com/24859/366173/9418f2a2-ef45-4788-9de9-91c7d19038b9
 - [UNDETECTED] miro-verification=53bf5ccd47cb6239fe5cf14c3b328050dd5679ac
==
```

# ᵔᴥᵔ RedJoust

[![Twitter Follow](https://img.shields.io/twitter/follow/davidbl.svg?style=social&label=Follow)](https://twitter.com/davidbl) [![GitHub issues](https://img.shields.io/github/issues/kawaiipantsu/redjoust.svg)](https://github.com/kawaiipantsu/redjoust/issues) [![GitHub closed issues](https://img.shields.io/github/issues-closed/kawaiipantsu/redjoust.svg)](https://github.com/kawaiipantsu/redjoust/issues) [![GitHub license](https://img.shields.io/github/license/kawaiipantsu/redjoust.svg)](https://github.com/kawaiipantsu/redjoust/blob/master/LICENSE) [![GitHub forks](https://img.shields.io/github/forks/kawaiipantsu/redjoust.svg)](https://github.com/kawaiipantsu/redjoust/network) [![GitHub stars](https://img.shields.io/github/stars/kawaiipantsu/redjoust.svg)](https://github.com/kawaiipantsu/redjoust/stargazers)
> A quick and easy to use security reconnaissance webapp tool, does OSINT, analysis and red-teaming in both passive and active mode. Written in nodeJS and Electron. 

![RedJoust](assets/redjoust-banner.png)

---

> Heavily under development
>
> Come back later :)

## Status on whats done

- Boiler plate layout done (How i want the app to look)
- Support for Light / Dark OS theme
- Styled scrollbar (Not using OS dependen functionality)
- User and system information
- Fetching remote/public IP
- Making sure its aleast a bit secure
  - webSecurity on
  - devTools disabled (not doing development)
  - nodeIntegration enabled
  - contextIsolation enabled

## TODO list (what i want to get done short term)

- Make logic to set "mode" ie. passive or active
- Make logic to set your target (ipaddr, hostname or domain)
- Make "main view" frontpage when no target is set (to allow setting target and mode)
- Make "main view" frontpage to show a bit of target info (when target is set show this)
- Figure out how i want my "modules" logic
- Make simple DNS lookup module (json return) to test data
- Make "mode" logic, modules should follow this
- Make modules to handle recon/analisys/redteam

## What it looks like (what i'm going for)

This is still just a boilerplate on what layout i'm trying to go for, this might change in the near future i have no idea. But so far this is what it's going to look like. Also not functionality at all and placeholders. Only thing really working is the small user/sys info box top right and the toggle switch bottom right for dark/light theme.

More to come soon ! I hope :)

![Main view](assets/screenshot-main-view.png)
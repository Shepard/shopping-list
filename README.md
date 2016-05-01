# shopping-list
Web app for a simple shopping list

A "progressive web app" that implements a simple shopping list stored locally via localStorage, can be installed to a phone's homescreen (from Chrome on Android at least) to open as a standalone app and works offline (using a Service Worker).

Uses Material Design Lite for an Android-like look and is written in vanilla JavaScript otherwise.

To self-host simply host all files in the web directory on a static web server that has https enabled. Offline capabilities only work when accessed via https.

## TODO

* Improve long press (get rid of delay by using touchstart/touchend without interferring with drag&drop).
* Improve swiping elements out of the list (do any of the undocument options in Slip.js help?).
* Multiple lists
* Syncing with a server for shared editing
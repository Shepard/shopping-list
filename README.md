# shopping-list
Web app for a simple shopping list

A "progressive web app" that implements a simple shopping list stored locally via localStorage, can be installed to a phone's homescreen (from Chrome on Android at least) to open as a standalone app and works offline (using a Service Worker).

Uses Material Design Lite for an Android-like look, Slip.js for drag&drop interactions and is written in vanilla JavaScript otherwise.

## Deployment

To self-host simply host all files in the web directory on a static web server that has https enabled. Offline capabilities only work when accessed via https.

The page is translated into English and German. If you have Apache with `mod_negotiation` enabled and the option `MultiViews` turned on, it will automatically pick the right file to send to the client. The web folder includes a `.htaccess` file that will turn this option on for you but be aware that the web server might not allow overriding this option or might not even allow `.htaccess` files. If your web server can't do this sort of negotiation, rename one of the translated index files to `index.html`.

A Node build script for creating the translated page is included. This project already contains the built translated files, but if you want to run the build anyway, you will need Node 6+ and run the following commands in the root directory of this project:

   npm install
   npm run-script build

## Licencing

This project's own code and files are licenced under the [MIT Licence](https://github.com/Shepard/shopping-list/blob/master/LICENSE).

All files in the web/css/libs and web/js/libs directories, as well as the icons in the web/img directory, are included from third parties and do not fall under this licence.

Material Design Lite:
© Google, 2015. Licenced under an
[Apache-2](https://github.com/google/material-design-lite/blob/master/LICENSE)
licence.

Slip.js:
See licence notice included [in the file](https://github.com/Shepard/shopping-list/blob/master/web/js/libs/slip.js).

[Material icons](https://design.google.com/icons/) font as well as the shopping cart icon used as a web app icon:
© Google. [CC-BY](https://creativecommons.org/licenses/by/4.0/)

## TODO

* Improve long press (get rid of delay by using touchstart/touchend without interferring with drag&drop).
* Improve swiping elements out of the list (do any of the undocumented options in Slip.js help?).
* Nicer web app icon that works better with the main theme colour in the app switcher
* Syncing with a server for shared editing
* Test and make work on iOS?
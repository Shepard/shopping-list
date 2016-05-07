# shopping-list
Web app for a simple shopping list

A "progressive web app" that implements a simple shopping list stored locally via localStorage, can be installed to a phone's homescreen (from Chrome on Android at least) to open as a standalone app and works offline (using a Service Worker).

Uses Material Design Lite for an Android-like look, Slip.js for drag&drop interactions and is written in vanilla JavaScript otherwise.

## Deployment

To self-host simply host all files in the web directory on a static web server that has https enabled. Offline capabilities only work when accessed via https.

The page as well as the web app manifest are translated into English and German. If you have Apache with `mod_negotiation` enabled and the option `MultiViews` turned on, it will automatically pick the right files to send to the client. The web folder includes a `.htaccess` file that will turn this option on for you but be aware that the web server might not allow overriding this option or might not even allow `.htaccess` files. If your web server can't do this sort of negotiation, rename one of the translated index files to `index.html` and one of the translated manifest files to `manifest.json`.

A Node build script for creating the translated files is included. This project already contains the built translated files, but if you want to run the build anyway (e.g. when making adjustments to the originals or adding a language), you will need Node 6+ and run the following commands in the root directory of this project:

    npm install
    npm run-script build

## Licencing

This project's own code and files are licenced under the [MIT Licence](https://github.com/Shepard/shopping-list/blob/master/LICENSE).

All files in the web/css/libs and web/js/libs directories, as well as the icons in the web/img directory, are included from third parties and do not fall under this licence. The icons have been adjusted from their original versions to work better as app icons.

Material Design Lite:
© Google, 2015. Licenced under an
[Apache-2](https://github.com/google/material-design-lite/blob/master/LICENSE)
licence.

Slip.js:
See licence notice included [in the file](https://github.com/Shepard/shopping-list/blob/master/web/js/libs/slip.js).

[Material icons](https://design.google.com/icons/) font as well as the shopping cart icon used as a web app icon:
© Google. [CC-BY](https://creativecommons.org/licenses/by/4.0/)

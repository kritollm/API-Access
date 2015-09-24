/**
 * Created by kristian on 24.09.15.
 */

(function (win) {
    // Check for custom monkey patch
    if(win.crossOriginEnabled_noConflict12348767565){
        return;
    }
    var scriptNode = document.createElement('script');
    scriptNode.src = chrome.extension.getURL("enableCrossOrigin.js");
    (document.head || document.documentElement).appendChild(scriptNode);
    scriptNode.parentNode.removeChild(scriptNode);

})(window);

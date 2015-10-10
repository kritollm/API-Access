/**
 * Created by kristian on 03.04.15.
 */
var registeredListeners = {};
var activatedTabs = {};

// This routine tries to avoid that listeners for removed tabs is stored
function cleanListeners(tabId) {
    var listeners = Object.getOwnPropertyNames(registeredListeners) || [];
    listeners.forEach(function (prop) {
        if (parseInt(prop) === tabId) {
            chrome.webRequest.onBeforeSendHeaders.removeListener(registeredListeners[prop]);
            delete registeredListeners[prop];
        }
    });
    //console.log("Removed listeners. There is " + Object.getOwnPropertyNames(registeredListeners).length + " left");
}
function enableCORS(id) {
    if (activatedTabs[id + ""]) {
        return true;// console.log("Tab: " + id + " is already activated");
    }
    activatedTabs[id + ""] = true;
    chrome.browserAction.setIcon({
        tabId: id,
        path: {"19": "icons/enable_19.png", "38": "icons/enable_38.png"}
    }, function () {
        //console.log("enabled");
    });
    return false;
}
chrome.browserAction.onClicked.addListener(function (tab) {
    if (!enableCORS(tab.id)) {
        chrome.tabs.executeScript(tab.id, {file: "injector.js", runAt: "document_start"});
    }
});

chrome.tabs.onRemoved.addListener(function (removed) {
    //console.log("removed: " + removed);
    cleanListeners(removed);
    delete activatedTabs[removed + ""];
});
chrome.tabs.onUpdated.addListener(function (updated) {
    //console.log("Updated: " + updated);
    cleanListeners(updated);
    delete activatedTabs[updated + ""];
});

chrome.tabs.onReplaced.addListener(function (added, removed) {
    //console.log("Added: " + added + " removed: " + removed);
    cleanListeners(removed);
    delete activatedTabs[removed + ""];
});

function makeCrossOriginRequest(request, callBack, tabId) {
    var testXHR = new XMLHttpRequest();

    // Make a id
    var insaneName = tabId + "_" + request.openParams[1] + "_" + performance.now();

    testXHR.onload = function () {

        //delete testXHR.responseXML;
        callBack({
            status: "onload",
            xhr: {
                readyState: testXHR.readyState,
                status: testXHR.status,
                statusText: testXHR.statusText,
                response: testXHR.response,
                responseText: testXHR.responseText
            }
        });
    };
    testXHR.onerror = function () {

        callBack({
            status: "onerror", xhr: {
                readyState: testXHR.readyState,
                status: testXHR.status,
                statusText: testXHR.statusText,
                response: testXHR.response,
                responseText: testXHR.responseText
            }
        });
    };
    testXHR.responseType && (testXHR.responseType = request.responseType); // Don't set responseType if not set, prevent a document must not set a response type error
    testXHR.open(request.openParams[0], request.openParams[1], request.openParams[2], request.openParams[3], request.openParams[4]);
    request.headers.forEach(function (item) {
        testXHR.setRequestHeader(item[0], item[1]);
    });


    testXHR.setRequestHeader("CrossId", insaneName);


    registeredListeners[insaneName] = function (info) {
        // Make sure it's the correct request
        if (info.url === request.openParams[1] && (info.requestHeaders.some(function (item) {
                return item.value === insaneName;
            }))) {

            chrome.webRequest.onBeforeSendHeaders.removeListener(registeredListeners[insaneName]);
            delete registeredListeners[insaneName];
            //console.log(Object.getOwnPropertyNames(registeredListeners).length);

// Rewritten to filter headers instead of removing in a for loop.
// The removing of headers only worked if I both replaced the info.requestHeaders and returned {requestHeaders: info.requestHeaders}
// As far as I can understand it must be a bug or the documentation is wrong.

            info.requestHeaders = info.requestHeaders.filter(function (item) {
                var header = item.name.toLowerCase();
                return (!(header === "user-agent" || header === "origin" || header === "referer" || header === "crossid"));
            });
            return {requestHeaders: info.requestHeaders};
        }
    };

    // Need to use all urls because of localHost. It's not allowed to use localhost in manifest
    chrome.webRequest.onBeforeSendHeaders.addListener(registeredListeners[insaneName],
        {urls: ["<all_urls>"]},
        ["requestHeaders", "blocking"]);

    testXHR.send(request.object || null);
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        var id = sender.tab.id;
        var activated = activatedTabs[id + ""];
        if (!activated) {
            enableCORS(id);
        }
        if (!request.openParams) return;
        makeCrossOriginRequest(request, sendResponse, id);
        return request.openParams[2]; // Need to return true when the response is async
    });
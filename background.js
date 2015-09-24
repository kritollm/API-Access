/**
 * Created by kristian on 03.04.15.
 */
var registeredListeners = {};
var activatedTabs = {};

function enableCORS (id) {
    if (activatedTabs[id + ""]) {
        return true;// console.log("Tab: " + id + " is already activated");
    }
    activatedTabs[id] = true;
    chrome.browserAction.setIcon({
        tabId: id,
        path: {"19": "icons/enable_19.png", "38": "icons/enable_38.png"}
    }, function () {
        console.log("enabled");
    });
    return false;
}
chrome.browserAction.onClicked.addListener(function (tab){
    if(!enableCORS(tab.id)){
        chrome.tabs.executeScript(tab.id, {file: "injector.js", runAt: "document_start"});
    }
});

chrome.tabs.onRemoved.addListener(function (removed) {
    //console.log("removed: " + removed);
    delete activatedTabs[removed + ""];
});
chrome.tabs.onUpdated.addListener(function (updated) {
    //console.log("Updated: " + updated);
    delete activatedTabs[updated + ""];
});

chrome.tabs.onReplaced.addListener(function (added, removed) {
    //console.log("Added: " + added + " removed: " + removed);
    delete activatedTabs[removed + ""];
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        var id = sender.tab.id;
        var activated = activatedTabs[id + ""];
        if (!activated) {
            enableCORS(id);
        }
        if (!request.openParams) return;
        makeCrossOriginRequest(request, sendResponse);
        return request.openParams[2]; // Need to return true when the response is async
    });

function makeCrossOriginRequest(request, callBack) {
    var testXHR = new XMLHttpRequest();
    testXHR.onload = function () {
        delete testXHR.responseXML;
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

    // Make a id
    var insaneName = request.openParams[1] + performance.now();
    testXHR.setRequestHeader("X-Cross-Id", insaneName);


    registeredListeners[insaneName] = function (info) {
        // Make sure it's the correct request
        if (info.url === request.openParams[1] && (info.requestHeaders.some(function (item) {
                return item.value === insaneName;
            }))) {
            chrome.webRequest.onBeforeSendHeaders.removeListener(registeredListeners[insaneName]);
            delete registeredListeners[insaneName];

            for (var i = 0; i < info.requestHeaders.length; i++) {
                var header = info.requestHeaders[i].name.toLowerCase();
                if (header === "user-agent") {
                    info.requestHeaders.splice(i, 1);
                } else if (header === "origin") {
                    info.requestHeaders.splice(i, 1);
                } else if (header === "referer") {
                    info.requestHeaders.splice(i, 1);
                } else if (header === "x-cross-id") {
                    info.requestHeaders.splice(i, 1);
                    //} else if (header === "cookie") {
                    //   info.requestHeaders.splice(i, 1);
                }
            }
            return {requestHeaders: info.requestHeaders};
        }
    };

    chrome.webRequest.onBeforeSendHeaders.addListener(registeredListeners[insaneName],
        {urls: ["<all_urls>"]},
        ["blocking", "requestHeaders"]);

    testXHR.send(request.object || null);
}

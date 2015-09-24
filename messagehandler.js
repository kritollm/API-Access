/**
 * Created by kristian on 05.04.15.
 */

(function (win) {
    win.addEventListener("message", function(event) {

        if (event.source === window && event.data && event.data.id && event.data.message === "Request") {
            chrome.runtime.sendMessage(event.data.request, function(resp){
                event.source.postMessage({message: "Response", id: event.data.id, response: resp}, "*");
            });
        }
    }, false);
})(window);


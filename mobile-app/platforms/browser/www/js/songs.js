
/**
 * rewrites list of parts on the songs page
 */
function refreshSongPage() {
    refreshItemDisplay(current["song"].parts, "#song-parts", "music.html", "part", cachedParts, "/api/parts/");
}

myApp.onPageInit('song-info', function(form) {
    console.log(current["song"]);
    $$("#song-title").text(current["song"].name);
    $$("#song-id").text("ID: " + current["song"].id);
    myApp.sizeNavbars();

    $$("#song-refresh").on('refresh', function(e){
        console.log("Refreshing Event Page");
        setTimeout(function(){
            cachedParts = {};
            pullToRefresh("/api/songs/", current.song.id, "song", refreshSongPage); 
        }, 2000);
    });


    $$("#left-button-song").on('click', function(){
        mainView.router.loadPage("tracker.html");
    });
});

myApp.onPageBeforeAnimation("song-info", function() {
    refreshSongPage();
})

var songXml = {};

myApp.onPageInit("music", function(form){
    $$("#song-part-title").text(current["song"].name + " - " + current["part"].instrument);
    myApp.sizeNavbars();
    console.log(current["part"]);


    MusicDisplay.init();
    if (cachedXMLs.get(current["part"].id)) {
        console.log("Cache hit");
        var xmlParser = new DOMParser();
        songXml = xmlParser.parseFromString(cachedXMLs.get(current["part"].id), "text/xml");
        checkAndDisplayFullSong();
    }
    else {
        $$.ajax({
            method : "GET",
            url : hostname + "/api/parts/" + current["part"].id + "/download",
            data: {},
            processData: false,
            success: function(xml){
                console.log("Cache miss");
                var xmlParser = new DOMParser();
                songXml = xmlParser.parseFromString(xml, "text/xml");
                checkAndDisplayFullSong();
                cachedXMLs.put(current["part"].id, xml);
            },
            statusCode : {
                400 : function(xhr){
                    alertUser("Music for this song does not exist yet!");
                }
            }
        });
    }

    $$("#rename-part").on("click", function() {
        console.log("Rename part clicked");
        rename(current.song.name, "/api/parts/" + current["part"].id, refreshSongPage);
    })
});

function displaySingleMeasure(number){
    var newXml = songXml.cloneNode(true);
    var part = newXml.getElementsByTagName("part")[0];
    console.log("Part: ", part);

    var children = Array.from(part.children);

    var firstMeasure = children[0];
    var firstMeasureChildren = [];
    for(var i=0; i<firstMeasure.children.length; i++){
        var measureChild = firstMeasure.children[i];
        if(measureChild.tagName != "note"){
            firstMeasureChildren.push(measureChild);
        }
    }

    console.log("Children: ", firstMeasureChildren);

    for (var i=0; i<children.length; i++){
        var measure = children[i];
        if(measure.tagName == "measure"){
            var measureNumber = measure.getAttribute("number");
            if(measure.getAttribute("number") != number){
                part.removeChild(measure);
            }
            else if(measure != firstMeasure){
                firstMeasureChildren.forEach(function(child){
                    measure.insertBefore(child, measure.children[0]);
                });
            }
        }
    }

    MusicDisplay.osmd.load(newXml).then(function(){
        MusicDisplay.osmd.render();
        console.log("rendered");
        MusicDisplay.osmd.autoResize();
    }, function(err){
        console.log("Unable to Render: ", err);
    });
    return newXml;
}

// whether user has seen an alert warning them they can't do tracking without an event
var showedEventNullMsg = false;

/** Ask the user if they want to track, then display the song */
function checkAndDisplayFullSong() {
    if (current["event"] === undefined || current["event"].id === undefined) {
        console.log("event is null");
        if (!showedEventNullMsg) {
            showedEventNullMsg = true;
            alertUser("There is no event selected, so you cannot do tracking here. "
                + "To use tracking, go back to the home page, go to upcoming events, "
                + "choose an event, and choose this song.");
        }
        displayFullSong();
    }
    else {
        console.log("event :", event.name);
        displayFullSong();
        myApp.modal({
            "title": "Enable tracking",
            "text": "Turn on measure tracking?",
            "buttons": [
                {
                    "text": "Yes",
                    "onClick": function () {
                        getIPAddress(current["event"].id, function (ipAddress) {
                            startTrackingLoop(ipAddress);
                        }, function () {
                            alertUser("Could not connect to tracker");
                        });
                    }
                },
                {
                    "text": "No",
                    "onClick": function () {
                        
                    }
                }
            ]
        });
    }
}

// last response from desktop server with measure and tempo
var lastResponse = {
    "measure": 0,
    "tempo": 0,
    "time": new Date().getMilliseconds()
}

function startTrackingLoop(ipAddress) {
    var measureHeight = getMeasureHeight() * 5;
    var interval = 500;
    trackingLoop = setInterval(function(){
        var jsonGet = $$.getJSON("http://"  + ipAddress + ":5412", {}, 
        
        function(response) {
            var measureNum = parseInt(response.measure);
            lastResponse = {
                "measure": measureNum,
                "tempo": parseFloat(response.tempo),
                "time": Date.now()
            }
            scrollToMeasure(measureNum, measureHeight);
        }, 
        
        function (err) {
            console.log(err);
            clearInterval(trackingLoop);
        });

        setTimeout(() => {
            var timeSince = (Date.now() - lastResponse.time) / 1000;
            var measureNum = lastResponse.measure + lastResponse.tempo * timeSince;
            scrollToMeasure(measureNum, measureHeight);
            jsonGet.abort(); 
        }, interval);

    }, interval);
    $$("#music-page").on('click', function(){
        console.log("Stopping tracking");
        clearInterval(trackingLoop);
    })
    
}

myApp.onPageBack("music", function(){
    console.log("Stopping tracking");
    lastResponse = {
        "measure": 0,
        "tempo": 0,
        "time": new Date().getMilliseconds()
    }
    clearInterval(trackingLoop);
});

/**
 * Get height of measures in display.
 */
function getMeasureHeight() {
    var measureList = MusicDisplay.osmd.graphic.measureList;
    var y1 = getMeasure(measureList, 0).boundingBox.absolutePosition.y;
    var y2 = y1;
    var i = 0;
    while (y2 == y1 && i < measureList.length) {
        y2 = getMeasure(measureList, i).boundingBox.absolutePosition.y;
        console.log(getMeasure(measureList, i).boundingBox.absolutePosition.y);
        i++;
    }
    return y2 - y1;
}

/**
 * Annoyingly, the OSMD measureList is a different dimension depending on the
 * number of staves. This takes care of the dimension BS for you by just
 * checking if there is a second dimension and choosing the first index in it.
 * @param {array} measureList list of OSMD measures
 * @param {int} measureNum index in list
 */
function getMeasure(measureList, measureNum) {
    var measure = measureList[measureNum];
    return Array.isArray(measure) ? measure[0] : measure;
}

/** After displaying a full song, scroll to a certain measure. */
function scrollToMeasure(measureNum, measureHeight) {
    measureNum = Math.floor(measureNum);
    var measureList = MusicDisplay.osmd.graphic.measureList;

    if (measureNum < 0) measureNum = 0;
    if (measureNum >= measureList.length) measureNum = measureList.length - 1;
    var measure = getMeasure(measureList, measureNum);
    var measureBB = measure.boundingBox;

    var top = measureBB.absolutePosition.y * 10;
    console.log(top);
    var pixel = top - measureHeight;
    if (pixel < 0) pixel = 0;

    $$("#music-display").scrollTo(0, pixel, 100);
}

/** GET IP address from event.
 * @param successCallback success callback; one argument: returned IP address
 * @param errorCallback error callback; two arguments: error message and status code */
function getIPAddress(eventId, successCallback, errorCallback) {
    $$.ajax({
        method : "GET",
        url: hostname + "/api/events/" + eventId,
        processData: false,
        success: function(response) {
            successCallback(response.trackerip);
        },
        dataType : "json",
        error: function (arg1, arg2) {
            errorCallback(arg1, arg2);
        }
    });
}

function displayFullSong(successCall) {
    MusicDisplay.osmd.load(songXml).then(function(){
        MusicDisplay.osmd.render();
        MusicDisplay.osmd.autoResize();
        if (successCall !== undefined) successCall();
    }, function(err){
        console.log("Unable to Render: ", err);
    });
}

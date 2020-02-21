import "babel-polyfill";
import PlayerButton from "./PlayerButton";
import Notification from "./Notification";
import PlexApi from "./PlexApi";

class Main {
    
    constructor() {
        this.plexApi = new PlexApi();
        this.notification = new Notification();
        this.button = new PlayerButton(this.handleButtonCLicked.bind(this));
        chrome.runtime.onMessage.addListener(this.handleBackgroundPageMessage.bind(this));
    }

    /**
     * Handles messages from background script (mainly callbacks from host app)
     * @param {object} response 
     */
    handleBackgroundPageMessage(response) {
        if (response.status == "error") {
            this.notification.display(
                response.message + ":<br>" + response.filePath,
                Notification.Type.ERROR
            );
        } else if (response.status == "success") {
            this.notification.display(response.message + ": " + response.title);
            if (response.markItemsPlayed) {
                this.plexApi.markAsPlayed(response.id);
            }
        }
    }

    /**
     * Handles button press, loads item data and sends playback request.
     */
    handleButtonCLicked() {
        var id = this.plexApi.getItemId();
        
        if (id) {
            this.plexApi.getItemMetadata(id)
                .then(this.sendPlaybackRequest.bind(this))
                .catch (this.handleServerUnavailable.bind(this));
        } else {
            this.notification.display(
                "Could not get media id.", 
                Notification.Type.ERROR
            );
        }
    }

    /**
     * Handles error when server is unavailable.
     * @param {object} error 
     */
    handleServerUnavailable(error) {
        this.notification.display(
            "Could not reach server.",
            Notification.Type.ERROR
        );
        console.log(error);
    }

    /**
     * Send playback request to background page.
     * @param {object} metadata 
     */
    sendPlaybackRequest(metadata) {
        let request = {
            "filePath": metadata.MediaContainer.Metadata[0].Media[0].Part[0].file,
            "downloadUrl": window.location.origin + metadata.MediaContainer.Metadata[0].Media[0].Part[0].key + "?X-Plex-Token=" + this.plexApi.getAccessToken(),
            "title": metadata.MediaContainer.Metadata[0].title,
            "id": metadata.MediaContainer.Metadata[0].ratingKey,
            "type": "playback"
        };
        
        try {
            chrome.runtime.sendMessage(request);
        } catch (error) {
            this.notification.display(
                "Could not connect to extension. Please reload this page.",
                Notification.Type.ERROR
            );
        }
    }

}

// Start
new Main();
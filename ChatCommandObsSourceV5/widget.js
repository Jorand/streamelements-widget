/*
 * Inpired by "Source on Command by @Renziito"
 *
 * Edited by MoJojo
*/
let fieldData;
const obs = new OBSWebSocket();
let audio = new Audio('{audio}');
let cooldownTimer = 0;
let comboTimer = 0;
let combo = 0;
let channelName;

let textContainer = document.getElementById('message-wrapper');

let showText = (line) => {
  textContainer.innerHTML += `<p class="text">${line}</p>`;
}
showText("hi")

let checkPrivileges = (data) => {
    let required = fieldData.privileges;
    let userState = {
        'mod': parseInt(data.tags.mod),
        'sub': parseInt(data.tags.subscriber),
        'vip': (data.tags.badges.indexOf("vip") !== -1),
        'badges': {
            'broadcaster': (data.userId === data.tags['room-id']),
        }
    };

    if (userState.badges.broadcaster) return true;
    else if (fieldData.additionalUsers.indexOf(data.nick.toLowerCase())!==-1) return true;
    else if (required === "mods" && userState.mod) return true;
    else if (required === "vips" && (userState.mod || userState.vip)) return true;
    else if (required === "subs" && (userState.mod || userState.vip || userState.sub)) return true;
    else if (required === "everybody") return true;
    else return false;
};


const startListener = () => {
    window.addEventListener('onEventReceived', async function (obj) {
      	// Test command
        if (obj.detail.event.listener === "widget-button") {
          if (obj.detail.event.field === "test") {
            let emulated = new CustomEvent("onEventReceived", {
              detail: {
                listener: "message",
                event: {
                  service: "twitch",
                  data: {
                    time: Date.now(),
                    tags: {
                      "badge-info": "",
                      badges: "broadcaster/1,moderator/1,partner/1",
                      color: "#5B99FF",
                      "display-name": "StreamElements",
                      emotes: "25:46-50",
                      flags: "",
                      id: "43285909-412c-4eee-b80d-89f72ba53142",
                      mod: "1",
                      "room-id": "85827806",
                      subscriber: "0",
                      "tmi-sent-ts": "1579444549265",
                      turbo: "0",
                      "user-id": "100135110",
                      "user-type": "mod",
                    },
                    nick: channelName,
                    userId: "100135110",
                    displayName: channelName,
                    displayColor: "#5B99FF",
                    badges: [
                      {
                        type: "broadcaster",
                        version: "1",
                        url: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
                        description: "Broadcaster",
                      },
                      {
                        type: "moderator",
                        version: "1",
                        url:
                          "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3",
                        description: "Moderator",
                      },
                      {
                        type: "partner",
                        version: "1",
                        url:
                          "https://static-cdn.jtvnw.net/badges/v1/d12a2e27-16f6-41d0-ab77-b780518f00a3/3",
                        description: "Verified",
                      },
                    ],
                    channel: channelName,
                    text: `!${fieldData.command}`,
                    isAction: !1,
                    emotes: [],
                    msgId: "43285909-412c-4eee-b80d-89f72ba53142",
                  },
                  renderedText:
                    `!${fieldData.command}`,
                },
              },
            });
            window.dispatchEvent(emulated);
          }
          return;
        }

        if (obj.detail.listener !== "message") return;
        let data = obj.detail.event.data;
        if (!checkPrivileges(data)) {return;}
        if(!data.text.includes(fieldData.command)) return;
        //let message = data.text.replace(fieldData.command, '');
        //let args = message.trim().split(' ');
        //if(message.indexOf('|')>0){args = message.trim().split('|');}

        //if(args[0] != ""){fieldData.source =  args[0];}
        //if(typeof args[1] != undefined){fieldData.scene =  args[1];}
        //if(typeof args[2] != undefined && Number.isInteger(parseInt(args[2]))){fieldData.duration =  args[2];}
		
      	var endTime = cooldownTimer + fieldData.cooldown * 1000;
        if (Date.now() < endTime) {
          sayMessage(`This command is currently on cooldown, please wait ${moment(endTime).fromNow(true)}`);
          return;
        }
      
      	combo++;
      	if (combo >= fieldData.combo) {
          combo = 0;
          clearTimeout(comboTimer);
          cooldownTimer = Date.now();
        }
        else {
          clearTimeout(comboTimer);
          comboTimer = setTimeout(function(){
            combo = 0;
          	cooldownTimer = 0;
          }, fieldData.cooldown * 1000);
        }
      	
      	audio.pause();
        audio.currentTime = 0;
        audio.play();
      
      	showText("new command");
      	console.log(obs);
      
        if (!obs) return;
        //obs.send('SetSourceFilterVisibility', {'sourceName':fieldData.source, 'filterName': fieldData.filter, 'filterEnabled': true});
        //obs.send('SetSceneItemProperties', {'scene-name':fieldData.scene,'item': fieldData.source,'visible': true});
      	const {sceneItemId} = await obs.call('GetSceneItemId', {sceneName: fieldData.scene, sourceName: fieldData.source});
      	console.log(sceneItemId);
      	obs.call('SetSceneItemEnabled', {sceneName: fieldData.scene, sceneItemId: sceneItemId, sceneItemEnabled: true});
      
        if(fieldData.duration > 0){
          setTimeout(function(){
            //obs.send('SetSourceFilterVisibility', {'sourceName':fieldData.source, 'filterName': fieldData.filter, 'filterEnabled': false});
            //obs.send('SetSceneItemProperties', {'scene-name':fieldData.scene,'item': fieldData.source,'visible': false});
            obs.call('SetSceneItemEnabled', {sceneName: fieldData.scene, sceneItemId: sceneItemId, sceneItemEnabled: false});
          }, fieldData.duration*1000);
        }
    });
};

const sayMessage = (message) => {
  	if (fieldData.token.length == 0) retunr;
    message = encodeURIComponent(message).replace("%2F","%2525");
    return new Promise(resolve => {
        if (fieldData.token.length !== 24) resolve(false);
        fetch(`https://api.jebaited.net/botMsg/${fieldData.token}/${message}`).then(response => response.text()).then((text) => {
            resolve(true)
        })
    });
};

window.addEventListener('onWidgetLoad', function (obj) {
    fieldData = obj.detail.fieldData;
    fieldData.additionalUsers=fieldData.additionalUsers.toLowerCase().replace(" ","").split(",");
    audio.volume=(fieldData.audioVolume/100);
  	channelName = obj.detail.channel.username;
  
  	if (fieldData.enableCustomFont && fieldData.CustomFontName != "") {
      window.document.body.style.fontFamily = `${fieldData.CustomFontName}, sans-serif`;
    }

    obs.connect(`ws://${fieldData.ip}:${fieldData.port}`, fieldData.password).then(() => {
      console.log("Connected to OBS. Starting chat listener");
      showText("Connected to OBS. Starting chat listener");
      //startListener();
    }).catch(err => {
      console.log(err);
      showText(err);
    });
  
    startListener();
});
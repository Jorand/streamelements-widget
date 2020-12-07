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
    window.addEventListener('onEventReceived', function (obj) {
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
        if (!obs._connected) return;
        obs.send('SetSourceFilterVisibility', {'sourceName':fieldData.source, 'filterName': fieldData.filter, 'filterEnabled': true});
        //obs.send('SetSceneItemProperties', {'scene-name':fieldData.scene,'item': fieldData.source,'visible': true});
        if(fieldData.duration > 0){
          setTimeout(function(){
            obs.send('SetSourceFilterVisibility', {'sourceName':fieldData.source, 'filterName': fieldData.filter, 'filterEnabled': false});
            //obs.send('SetSceneItemProperties', {'scene-name':fieldData.scene,'item': fieldData.source,'visible': false});
          }, fieldData.duration*1000);
        }
    });
};

const sayMessage = (message) => {
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

    obs.connect({address: `${fieldData.ip}:${fieldData.port}`, password: fieldData.password}).then(() => {
      console.log("Connected to OBS. Starting chat listener");
      //startListener();
    }).catch(err => {
      console.log(err);
    });

    startListener();
});
/*
 * Bring back sms on twitch
 *
 * by MoJojo
*/
let fieldData, channelDetails, provider;
let audio = new Audio('{audio}');
let messages = [];
let overflowContainer = document.getElementById('message-wrapper');
let textContainer = document.getElementById('message-wrapper');
let isPlaying = false;
let timer = null;

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
  else if (fieldData.ignoredUsers.indexOf(data.nick.toLowerCase())!==-1) return false;
  else if (required === "mods" && userState.mod) return true;
  else if (required === "vips" && (userState.mod || userState.vip)) return true;
  else if (required === "subs" && (userState.mod || userState.vip || userState.sub)) return true;
  else if (required === "everybody") return true;
  else return false;
};

const startListener = () => {
  window.addEventListener('onEventReceived', function (obj) {
    if (obj.detail.listener === "delete-message") {
      const msgId = obj.detail.event.msgId;
      messages = messages.filter((obj) => { return obj.msgId !== msgId; });
      saveState(messages);
      return;
    }
    else if (obj.detail.listener === "delete-messages") {
      const sender = obj.detail.event.userId;
      messages = messages.filter((obj) => { return obj.userId !== sender; });
      saveState(messages);
      return;
    }

    if (obj.detail.listener !== "message") return;
    let data = obj.detail.event.data;
    if (!checkPrivileges(data)) {return;}
    if(!data.text.includes(fieldData.command)) return;
    data.text = data.text.replace(fieldData.command, '');
    if (data.text == "" || data.text == " ") return;
    let message = attachEmotes(data);
    console.log("New message", data);
    addMessage(data.msgId, message, data.displayName, data.userId);
  });
};

window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData;
  fieldData.additionalUsers = fieldData.additionalUsers.toLowerCase().replace(" ","").split(",");
  fieldData.ignoredUsers = fieldData.ignoredUsers.toLowerCase().replace(" ", "").split(",");
  audio.volume=(fieldData.audioVolume/100);
  fetch('https://api.streamelements.com/kappa/v2/channels/' + obj.detail.channel.id + '/').then(response => response.json()).then((profile) => {
    provider = profile.provider;
  });
  if (fieldData.enableCustomFont && fieldData.CustomFontName != "") {
    window.document.body.style.fontFamily = `${fieldData.CustomFontName}, sans-serif`;
  }
  document.getElementById('commandBox').innerText = wrapMessage(fieldData.boxText);

  loadState().then(() => {
    playMessage();
  });
  startListener();
});

function attachEmotes(message) {
  let text = html_encode(message.text);
  let data = message.emotes;
  if (typeof message.attachment !== "undefined") {
    if (typeof message.attachment.media !== "undefined") {
      if (typeof message.attachment.media.image !== "undefined") {
        text = `${message.text}<img src="${message.attachment.media.image.src}">`;
      }
    }
  }
  return text
    .replace(
    /([^\s]*)/gi,
    function (m, key) {
      let result = data.filter(emote => {
        return emote.name === key
      });
      if (typeof result[0] !== "undefined") {
        let url = result[0]['urls'][1];
        if (provider === "twitch") {
          return `<img class="emote" " src="${url}"/>`;
        } else {
          if (typeof result[0].coords === "undefined") {
            result[0].coords = {x: 0, y: 0};
          }
          let x = parseInt(result[0].coords.x);
          let y = parseInt(result[0].coords.y);

          let width = "{emoteSize}px";
          let height = "auto";

          if (provider === "mixer") {
            console.log(result[0]);
            if (result[0].coords.width) {
              width = `${result[0].coords.width}px`;
            }
            if (result[0].coords.height) {
              height = `${result[0].coords.height}px`;
            }
          }
          return `<div class="emote" style="width: ${width}; height:${height}; display: inline-block; background-image: url(${url}); background-position: -${x}px -${y}px;"></div>`;
        }
      } else return key;

    }
  );
}

function html_encode(e) {
  return e.replace(/[\<\>\"\^]/g, function (e) {
    return "&#" + e.charCodeAt(0) + ";";
  });
}

function addMessage(msgId, text, username, userId) {
  // check for duplicate message
  if (messages.some(e => e.msgId === msgId)) return false;

  messages.push({
    msgId: msgId,
    text: text,
    username: username,
    userId: userId
  });
  saveState(messages);
  playMessage();
  return true;
}

function saveState(value) {
  SE_API.store.set('messagesQueue', value);
}

function loadState() {
  return new Promise(resolve => {
    SE_API.store.get('messagesQueue').then(obj => {
      if (obj !== null) {
        messages = obj;
      } else SE_API.store.set('messagesQueue', messages);
      resolve();
    });
  });
}

function isElementOverflowing(element) {
  var overflowX = element.offsetWidth < element.scrollWidth,
      overflowY = element.offsetHeight < element.scrollHeight;

  return (overflowX || overflowY);
}

function wrapContentsInMarquee(element) {
  var marquee = document.createElement('span'),
      contents = element.innerHTML;

  marquee.className = 'marquee';
  marquee.innerHTML = contents;
  element.innerHTML = '';
  element.appendChild(marquee);

  $('.marquee')
    .bind('finished', function(){
      $('.marquee').marquee('destroy');
      textContainer.innerHTML = "";
      afterPlay();
    })
    .marquee({
      //duration in milliseconds of the marquee
      speed: fieldData.marqueeSpeed,
      //duration: 5000,
      //gap in pixels between the tickers
      //gap: fieldData.marqueeGap,
      gap: 0,
      //time in milliseconds before the marquee will start animating
      delayBeforeStart: (fieldData.transitionDuration + 1) * 1000,
      //'left' or 'right'
      direction: 'left',
      //true or false - should the marquee be duplicated to show an effect of continues flow
      duplicated: false,
      // The marquee will be visible from the start if set to true
      startVisible: true
    });
}

const wrapMessage = (message, obj = {}) => {
  return message.replace(/\{username\}/gi, obj.username || "")
    .replace(/\{message\}/gi, obj.message || "")
    .replace(/\{command\}/gi, fieldData.command);
};

function playMessage() {
  if (isPlaying) return false;
  if (messages.length <= 0) return false;

  isPlaying = true;
  let message = messages.shift();
  console.log("play", message);

  let formatedText = wrapMessage(fieldData.formatMessage, {
    username: message.username,
    message: message.text
  });
  textContainer.innerHTML = `<span class="text">${formatedText}</span>`;

  if (isElementOverflowing(overflowContainer)) {
    wrapContentsInMarquee(textContainer);
  }
  else {
    clearTimeout(timer);
    timer = setTimeout(afterPlay, fieldData.duration * 1000);
  }
  textContainer.className = "show";
  saveState(messages);
}

function afterPlay() {
  textContainer.className = "";
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log("done");
    isPlaying = false;
    playMessage();
  }, fieldData.transitionDuration * 1000);
}

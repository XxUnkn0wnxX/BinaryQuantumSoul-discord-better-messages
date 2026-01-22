/**
 * @name ColorIndicator
 * @author QuantumSoul
 * @description Highlights color codes in discord chats
 * @version 1.0.5
 * @source https://github.com/BinaryQuantumSoul/discord-better-messages
 * @updateUrl https://raw.githubusercontent.com/BinaryQuantumSoul/discord-better-messages/main/plugins/ColorIndicator/ColorIndicator.plugin.js
 */

const CLASS_SCROLLER_INNER = BdApi.Webpack.getByKeys("navigationDescription", "scrollerInner")["scrollerInner"];
const CLASS_MESSAGE_LIST_ITEM = BdApi.Webpack.getByKeys("messageListItem")["messageListItem"];
const CLASS_MESSAGE_CONTENT = BdApi.Webpack.getByKeys('threadMessageAccessoryContentLeadingIcon')["messageContent"]

module.exports = class Plugin {
  observer = null;

  start() {
    this.onSwitch();
  }

  stop() {
    if (this.observer) this.observer.disconnect();
  }

  onSwitch() {
    if (this.observer) this.observer.disconnect();
    this.observer = new MutationObserver(this.handleMutations);

    //format existing messages and listen to new ones
    const channels = document.querySelector("." + CLASS_SCROLLER_INNER);
    if (channels) {
      //existing one
      channels.querySelectorAll("." + CLASS_MESSAGE_CONTENT).forEach(this.parseMessage);

      //new ones
      this.observer.observe(channels, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  handleMutations = (mutationsList) => {
    let timeoutId = null; //prevents formatting before edition

    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.classList && node.classList.contains(CLASS_MESSAGE_CONTENT)) {
            timeoutId = setTimeout(() => {
              //unedited message
              this.parseMessage(node);
              timeoutId = null;
            }, 500);
          } else if (node.classList && node.classList.contains(CLASS_MESSAGE_LIST_ITEM)) {
            //new message
            this.parseMessage(node.querySelector("." + CLASS_MESSAGE_CONTENT));
          }
        }
      } else if (mutation.type === "characterData") {
        const messageContent = mutation.target.parentNode.closest("." + CLASS_MESSAGE_CONTENT);
        if (messageContent) {
          //edited message
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          this.parseMessage(messageContent);
        }
      }
    }
  };

  parseMessage = (messageContent) => {
    const colorCodeRegex = /#(?:[0-9a-fA-F]{3,6})\b|\b(?:rgb|rgba|hsl|hsla)\([^)]*\)|(?<=color:\s*)(\w+)(?=\s*(?:!important)?\s*;)/g;
  
    messageContent.querySelectorAll("code").forEach((codeElement) => {
      if (!codeElement.classList.contains("changed-indicator")) {
        codeElement.classList.add("changed-indicator");
  
        const codeText = codeElement.textContent;
        const matches = [...codeText.matchAll(colorCodeRegex)];
  
        if (matches.length === 0) return;

        while (codeElement.firstChild) {
          codeElement.removeChild(codeElement.firstChild);
        }
  
        let lastIndex = 0;
        matches.forEach((match) => {
          const matchText = match[0];
          const startIndex = match.index;
  
          if (startIndex > lastIndex) {
            const beforeText = codeText.substring(lastIndex, startIndex);
            codeElement.appendChild(document.createTextNode(beforeText));
          }

          const textColor = this.calculateLuminance(matchText) < 0.5 ? 'white' : 'black';
          const span = document.createElement('span');
          span.style.backgroundColor = matchText;
          span.style.color = textColor;
          span.appendChild(document.createTextNode(matchText));
          codeElement.appendChild(span);
  
          lastIndex = startIndex + matchText.length;
        });

        if (lastIndex < codeText.length) {
          const afterText = codeText.substring(lastIndex);
          codeElement.appendChild(document.createTextNode(afterText));
        }
      }
    });
  };

  calculateLuminance = (colorString) => {
    const rgbaColor = this.colorToRgb(colorString);
    const match = rgbaColor.match(/(\d+(\.\d+)?)/g);
    if (!match || match.length < 3) {
        throw new Error('Invalid color format');
    }
    const { r, g, b, a } = {
        r: parseFloat(match[0]),
        g: parseFloat(match[1]),
        b: parseFloat(match[2]),
        a: parseFloat(match[3])
    };
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) * (isNaN(a) ? 1 : a) / 255;
    return luminance;
  };

  colorToRgb = (colorString) => {
    const div = document.createElement('div');
    div.style.color = colorString;
    document.body.appendChild(div);
    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    return computedColor;
  }
};

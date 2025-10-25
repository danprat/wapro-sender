// ======= CORE INJECT JS CODE STARTS =======
const isWhatsappLoaded = () =>
  document.querySelector("#pane-side") ? true : false;

const isWebpackLoaded = () =>
  "function" === typeof webpackJsonp ||
  window.webpackChunkwhatsapp_web_client ||
  window.require;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Custom console funtions
console.logSuccess = (message) =>
  console.log(
    `%c${message}`,
    "color: lightGreen; font-weight: bold; font-size: 14px;"
  );
console.logError = (message) =>
  console.log(`%c${message}`, "color: red; font-weight: bold;");
console.logWarn = (message) =>
  console.log(`%c${message}`, "color: orange; font-weight: bold;");

// Init Store Object Function
const initStore = function (useOldMethod = true) {
  if (useOldMethod) {
    return initStoreOld();
  } else {
    return initStoreNew();
  }
};

const initStoreOld = function () {
  const inject = function () {
    return (
      (inject.mID = Math.random().toString(36).substring(7)),
      (inject.mObj = {}),
      (window.webpackChunkbuild || window.webpackChunkwhatsapp_web_client).push(
        [
          [inject.mID],
          {},
          function (i) {
            Object.keys(i.m).forEach(function (n) {
              inject.mObj[n] = i(n);
            });
          },
        ]
      ),
      {
        modules: inject.mObj,
        constructors: inject.cArr,
        findModule: function (i) {
          let obj = [];
          return (
            Object.keys(inject.mObj).forEach(function (a) {
              let element = inject.mObj[a];
              if (void 0 !== element)
                if ("string" == typeof i) {
                  if ("object" == typeof element.default)
                    for (let e in element.default) e == i && obj.push(element);
                  for (let e in element) e == i && obj.push(element);
                } else {
                  if ("function" != typeof i)
                    throw new TypeError(
                      "findModule can only find via string and function, " +
                        typeof i +
                        " was passed"
                    );
                  i(element) && obj.push(element);
                }
            }),
            obj
          );
        },
        get: function (i) {
          return inject.mObj[i];
        },
      }
    );
  };

  return new Promise((resolve, reject) => {
    try {
      if (window.require && window.importDefault) {
        // Create store by importing whatsapp collection
        const e = (e) => window.require(e);
        const i = (e) => window.importDefault(e);

        window.Store = {
          Chat: e("WAWebChatCollection")?.ChatCollection,
          Contact: e("WAWebContactCollection")?.ContactCollection,
          Msg: e("WAWebMsgCollection")?.MsgCollection,
          MsgKey: i("WAWebMsgKey"),
          BusinessProfile: e("WAWebBusinessProfileCollection")
            ?.BusinessProfileCollection,
          GroupMetadata: i("WAWebGroupMetadataCollection"),
          TextMsgChatAction: e("WAWebSendTextMsgChatAction"),
          MediaCollection: i("WAWebAttachMediaCollection"),
          UserConstructor: i("WAWebWid"),
          EnumTypes: e("WAWebWamEnumMediaPickerOriginType"),
        };

        if (window.Store) {
          window.Store.InitType = "old_method_1";
        }
      } else {
        // Create store using inject function
        let mR = inject();
        window.Store = Object.assign(
          {},
          mR.findModule((e) => e.default && e.default.Chat)[0]?.default || {}
        );
        window.Store.MediaCollection = mR.findModule(
          (e) => e.default && e.default.prototype?.processAttachments
        )[0]?.default;
        window.Store.UserConstructor = mR.findModule(
          (e) =>
            e.default &&
            e.default.prototype?.isServer &&
            e.default.prototype?.isUser
        )[0]?.default;
        window.Store.TextMsgChatAction = mR.findModule("sendTextMsgToChat")[0];
        window.Store.WidFactory = mR.findModule("createWid")[0];
        window.Store.Cmd = mR.findModule("Cmd")[0]?.Cmd;
        window.Store.ChatState = mR.findModule("sendChatStateComposing")[0];
        window.Store.ContactMethods = mR.findModule("getUserid")[0];
        window.Store.ChatHelper = mR.findModule("findChat")[0];
        window.Store.EnumTypes = mR.findModule("MEDIA_PICKER_ORIGIN_TYPE")[0];
        window.Store.MenuClasses = mR.findModule((e) =>
          e?.default?.menu && e?.default?.item ? e.default : null
        )[0]?.default;

        if (window.Store) {
          window.Store.InitType = "old_method_2";
        }
      }

      // Extend Store functionality
      if (window.Store?.Chat?.modelClass?.prototype) {
        window.Store.Chat.modelClass.prototype.sendMessage = function (e) {
          window.Store.TextMsgChatAction.sendTextMsgToChat(this, ...arguments);
        };
      }

      if (window.Store?.Chat && !window.Store.Chat._find) {
        window.Store.Chat._findAndParse =
          window.Store.BusinessProfile?._findAndParse;
        window.Store.Chat._find = window.Store.BusinessProfile?._find;
      }

      resolve();
    } catch (error) {
      reject("InjectJS :: initStoreOld :: Error :: " + error);
    }
  });
};

const initStoreNew = function () {
  let neededObjects = [
    {
      id: "MediaCollection",
      module: "WAWebAttachMediaCollection",
      conditions: (module) =>
        module.default &&
        module.default.prototype &&
        (module.default.prototype.processFiles !== undefined ||
          module.default.prototype.processAttachments !== undefined)
          ? module.default
          : null,
    },
    {
      id: "Archive",
      module: "WAWebSetArchiveChatAction",
      conditions: (module) => (module.setArchive ? module : null),
    },
    {
      id: "Block",
      module: "WAWebBlockContactUtils",
      conditions: (module) =>
        module.blockContact && module.unblockContact ? module : null,
    },
    {
      id: "ChatUtil",
      module: "WAWebSendClearChatAction",
      conditions: (module) => (module.sendClear ? module : null),
    },
    {
      id: "GroupInvite",
      module: "WAWebGroupInviteJob",
      conditions: (module) => (module.queryGroupInviteCode ? module : null),
    },
    {
      id: "Wap",
      module: "WAWebCreateGroupAction",
      conditions: (module) => (module.createGroup ? module : null),
    },
    {
      id: "State",
      module: "WAWebSocketModel",
      conditions: (module) => (module.STATE && module.STREAM ? module : null),
    },
    {
      id: "_Presence",
      module: "WAWebContactPresenceBridge",
      conditions: (module) =>
        module.setPresenceAvailable && module.setPresenceUnavailable
          ? module
          : null,
    },
    {
      id: "WapDelete",
      module: "WAWebChatDeleteBridge",
      conditions: (module) =>
        module.sendConversationDelete &&
        module.sendConversationDelete.length == 2
          ? module
          : null,
    },
    {
      id: "WapQuery",
      module: "WAWebQueryExistsJob",
      conditions: (module) =>
        module.queryExist
          ? module
          : module.default && module.default.queryExist
          ? module.default
          : null,
    },
    {
      id: "UserConstructor",
      module: "WAWebWid",
      conditions: (module) =>
        module.default &&
        module.default.prototype &&
        module.default.prototype.isServer &&
        module.default.prototype.isUser
          ? module.default
          : null,
    },
    {
      id: "SendTextMsgToChat",
      module: "WAWebSendTextMsgChatAction",
      resolver: (module) => module.sendTextMsgToChat,
    },
    {
      id: "ReadSeen",
      module: "WAWebUpdateUnreadChatAction",
      conditions: (module) => (module.sendSeen ? module : null),
    },
    {
      id: "sendDelete",
      module: "WAWebDeleteChatAction",
      conditions: (module) => (module.sendDelete ? module.sendDelete : null),
    },
    {
      id: "addAndSendMsgToChat",
      module: "WAWebSendMsgChatAction",
      conditions: (module) =>
        module.addAndSendMsgToChat ? module.addAndSendMsgToChat : null,
    },
    {
      id: "Catalog",
      module: "WAWebCatalogCollection",
      conditions: (module) => (module.Catalog ? module.Catalog : null),
    },
    {
      id: "MsgKey",
      module: "WAWebMsgKey",
      conditions: (module) =>
        module.default &&
        module.default.toString &&
        module.default
          .toString()
          .includes("MsgKey error: obj is null/undefined")
          ? module.default
          : null,
    },
    {
      id: "Parser",
      module: "WAWebE2EProtoUtils",
      conditions: (module) =>
        module.convertToTextWithoutSpecialEmojis ? module.default : null,
    },
    {
      id: "Builders",
      module: "WAWebProtobufsE2E.pb",
      conditions: (module) =>
        module.TemplateMessage && module.HydratedFourRowTemplate
          ? module
          : null,
    },
    {
      id: "Me",
      module: "WAWebUserPrefsMeUser",
      conditions: (module) =>
        module.PLATFORMS && module.Conn ? module.default : null,
    },
    {
      id: "MyStatus",
      module: "WAWebContactStatusBridge",
      conditions: (module) =>
        module.getStatus && module.setMyStatus ? module : null,
    },
    {
      id: "ChatStates",
      module: "WAWebChatStateBridge",
      conditions: (module) =>
        module.sendChatStatePaused &&
        module.sendChatStateRecording &&
        module.sendChatStateComposing
          ? module
          : null,
    },
    {
      id: "GroupActions",
      module: "WAWebExitGroupAction",
      conditions: (module) =>
        module.sendExitGroup && module.localExitGroup ? module : null,
    },
    {
      id: "Participants",
      module: "WAWebGroupsParticipantsApi",
      conditions: (module) =>
        module.addParticipants &&
        module.removeParticipants &&
        module.promoteParticipants &&
        module.demoteParticipants
          ? module
          : null,
    },
    {
      id: "WidFactory",
      module: "WAWebWidFactory",
      conditions: (module) =>
        module.isWidlike && module.createWid && module.createWidFromWidLike
          ? module
          : null,
    },
    {
      id: "Sticker",
      module: "WAWebStickerPackCollection",
      resolver: (m) => m.StickerPackCollection,
      conditions: (module) =>
        module.default && module.default.Sticker
          ? module.default.Sticker
          : null,
    },
    {
      id: "UploadUtils",
      module: "WAWebUploadManager",
      conditions: (module) =>
        module.default && module.default.encryptAndUpload
          ? module.default
          : null,
    },
  ];

  return new Promise((resolve, reject) => {
    try {
      const e = (m) => require("__debug").modulesMap[m] || false;

      const shouldRequire = (m) => {
        const a = e(m);
        if (!a) return false;
        return a.dependencies != null && a.depPosition >= a.dependencies.length;
      };

      neededObjects.map((needObj) => {
        const m = needObj.module;
        if (!m) return;
        if (!e(m)) return;
        if (shouldRequire(m)) {
          let neededModule = require(m);
          needObj.foundedModule = neededModule;
        }
      });

      window.Store = {
        ...{ ...require("WAWebCollections") },
        ...(window.Store || {}),
      };

      neededObjects.forEach((needObj) => {
        if (needObj.foundedModule) {
          window.Store[needObj.id] = needObj.resolver
            ? needObj.resolver(needObj.foundedModule)
            : needObj.foundedModule;
        }
      });

      if (window.Store.Chat) {
        window.Store.Chat.modelClass.prototype.sendMessage = function (e) {
          window.Store.SendTextMsgToChat(this, ...arguments);
        };
      }

      if (window.Store) {
        window.Store.InitType = "new_method";
      }

      resolve();
    } catch (error) {
      reject("InjectJS :: initStoreNew :: Error :: " + error);
    }
  });
};

// Init PROS Object function
const initPros = function () {
  // Initalize PROS object
  window.PROS = { lastRead: {} };

  // _serializeRawObject
  window.PROS._serializeRawObject = (e) => {
    if (e) {
      let i = {};
      e = e.toJSON ? e.toJSON() : { ...e };
      for (let n in e)
        if (
          ("statusMute" !== n) &
          ("disappearingModeDuration" !== n) &
          ("disappearingModeSettingTimestamp" !== n) &
          ("forcedBusinessUpdateFromServer" !== n) &
          ("privacyMode" !== n) &
          ("sectionHeader" !== n) &
          ("verifiedLevel" !== n)
        ) {
          if ("id" === n) {
            i[n] = { ...e[n] };
            continue;
          }
          if ("object" == typeof e[n] && !Array.isArray(e[n])) {
            i[n] = window.PROS._serializeRawObject(e[n]);
            continue;
          }
          if (Array.isArray(e[n])) {
            i[n] = e[n].map((e) =>
              "object" == typeof e ? window.PROS._serializeRawObject(e) : e
            );
            continue;
          }
          i[n] = e[n];
        }
      return i;
    }
    return {};
  };

  // _serializeContactObject
  window.PROS._serializeContactObject = (e) => {
    return e == null
      ? null
      : Object.assign(window.PROS._serializeRawObject(e), {
          formattedName: e.formattedName,
          displayName: e.displayName,
          isMe: e.isMe,
          isMyContact: e.isMyContact,
          isPSA: e.isPSA,
          isUser: e.isUser,
          isVerified: e.isVerified,
          isWAContact: e.isWAContact,
        });
  };

  // Get group meta data
  // window.PROS.getGroupMetadata = async function (e, i) {
  //     let n = window.Store.GroupMetadata.get(e);
  //     return (
  //         void 0 !== n &&
  //         n.stale &&
  //         (await window.Store.GroupMetadata.update(e)),
  //         void 0 !== i && i(n),
  //         n
  //     );
  // }

  // OLD Code
  // window.PROS.sendAttachment = function (mediaBlob, chatid, caption, done) {
  //     var idUser = new window.Store.UserConstructor(chatid, { intentionallyUsePrivateConstructor: true });
  //     return Store.Chat.find(idUser).then((chat) => {
  //         var mc = new Store.MediaCollection(chat);
  //         mc.processAttachments([{ file: mediaBlob }], Store.EnumTypes.MEDIA_PICKER_ORIGIN_TYPE.CHAT_PHOTO_LIBRARY, chat).then(() => {
  //             var media = mc._models[0];
  //             media.sendToChat(chat, { caption: caption });
  //         });
  //     });
  // }
  // --------

  // Send media attachment
  window.PROS.sendAttachment = function (
    mediaBlob,
    chatid,
    caption,
    waitTillSend
  ) {
    return new Promise((resolve, reject) => {
      try {
        let chat = PROS.getChat(chatid);
        
        if (!chat) {
          reject("Chat not found");
          return;
        }
        
        var mc = new Store.MediaCollection(chat);
        const supportedTypes = new Set([
          "broadcast_notification", "call_log", "e2e_notification", "gp2", "history_bundle",
          "newsletter_notification", "notification", "notification_template", "protocol",
          "album", "audio", "automated_greeting_message", "biz_content_placeholder",
          "biz-cover-photo", "buttons_response", "chat", "ciphertext", "comment", "debug",
          "debug_placeholder", "document", "event_creation", "event_edit_encrypted",
          "event_response", "groups_v4_invite", "hsm", "image", "interactive",
          "interactive_response", "keep_in_chat", "list", "list_response", "location",
          "multi_vcard", "native_flow", "newsletter_admin_invite", "newsletter_question_response",
          "order", "oversized", "payment", "pin_message", "pinned_message", "poll_creation",
          "poll_result_snapshot", "poll_update", "product", "ptt", "ptv", "reaction",
          "reaction_enc", "request_phone_number", "revoked", "rich_response", "status",
          "status_notification", "sticker", "sticker-pack", "guest_upsell_system_msg",
          "template_button_reply", "unknown", "vcard", "video"
        ]);
        
        mc.processAttachments([{ file: mediaBlob }], 1, supportedTypes, 100, null).then(() => {
          try {
            var media = mc._models[0];
            let captionObject = {
              quotedMsg: false,
              isCaptionByUser: true,
              type: mc._models[0].type,
            };
            if (/\S/.test(caption)) {
              captionObject.caption = caption;
            }
         
            media.sendToChat(chat, captionObject);

            if (waitTillSend) {
              const startTime = Date.now();
              const checkSent = () => {
                const sentMessages = document.querySelectorAll(".message-out");
                const lastMessage = sentMessages[sentMessages.length - 1];

                if (lastMessage) {
                  const textContent = lastMessage.innerText || "";
                  if (textContent.includes(mediaBlob.name)) {
                    resolve();
                    return;
                  }
                }

                if (Date.now() - startTime > 3000) {
                  resolve();
                  return;
                }

                setTimeout(checkSent, 500);
              };

              checkSent();
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  // Get my contacts
  window.PROS.getMyContacts = function (callback) {
    const contacts = window.Store.Contact.filter(
      (contact) => contact.isAddressBookContact === 1
    ).map((contact) => PROS._serializeContactObject(contact));

    if (callback) callback(contacts);
    return contacts;
  };

  // Get unsaved contacts
  window.PROS.getMyUnsavedContacts = function (callback) {
    const unsavedContacts = window.Store.Contact.filter(
      (contact) =>
        contact &&
        contact?.id?.server === "c.us" &&
        contact?.isAddressBookContact === 0 &&
        contact?.isBusiness !== true
    ).map((contact) => ({
      user: contact?.id?.user,
      pushname: contact?.pushname || "Unknown",
    }));
    if (callback) callback(unsavedContacts);
    return unsavedContacts;
  };

  // Get all contacts
  window.PROS.getAllContacts = function (done) {
    const contacts = window.Store.Contact.filter((contact) => {
      const isCusServer = contact?.id.server === "c.us";
      const isNotInAddressBook = contact?.isAddressBookContact === 1;
      const isNotBusiness = contact?.isBusiness !== true;
      return isCusServer && isNotInAddressBook && isNotBusiness;
    });

    if (done !== undefined) done(contacts);
    return contacts;
  };

  // Get group contacts
  window.PROS.getGroupContacts = function (group_id, callback) {
    let contacts = [];
    const groups = window.Store.Chat.filter(
      (chat) => chat?.id._serialized === group_id
    );
    if (groups.length > 0) {
      const participants = groups[0]?.groupMetadata?.participants;

      contacts = participants.map((p) => {
        let name =
          p.contact?.name ||
          p.contact?.pushname ||
          p.contact?.shortname ||
          "Unknown";
        let number = "+" + p.contact?.id.user;
        return { name, number };
      });
    }

    if (callback) callback(contacts);
    return contacts;
  };

  window.PROS.getGroupName = function (group_id, callback) {
    const groups = window.Store.Chat.filter(
      (chat) => chat?.id._serialized === group_id
    );
    let groupName = "Group";
    if (groups.length > 0) {
      groupName =
        groups[0]?.formattedTitle ||
        groups[0]?.attributes?.formattedTitle ||
        "Group";
    }
    if (callback) callback(groupName);
    return groupName;
  };

  // Get all groups
  window.PROS.getAllGroups = function (callback) {
    const groups = window.Store.Chat.filter((chat) => {
      let isGroup = chat?.groupMetadata || chat?.id?.server === "g.us";
      return isGroup;
    });
    if (callback) callback(groups);
    return groups;
  };

  // Get chat (group or contact) by id
  window.PROS.getChat = function (id, done) {
    id = typeof id == "string" ? id : id._serialized;    
    let found = window.Store.Chat.get(id);
    
    // If not found, try alternative server formats
    if (!found && id) {
      if (id.includes('@c.us')) {
        // Try @lid format
        const lidId = id.replace('@c.us', '@lid');
        found = window.Store.Chat.get(lidId);
      } else if (id.includes('@lid')) {
        // Try @c.us format
        const cusId = id.replace('@lid', '@c.us');
        found = window.Store.Chat.get(cusId);
      }
    }
    
    if (found) {
      found.sendMessage = found.sendMessage
        ? found.sendMessage
        : function () {
            return window.Store.sendMessage.apply(this, arguments);
          };
    }
    
    if (done !== undefined) done(found);
    return found;
  };

  // to get the recent chats based on contact or group
  window.PROS.getRecentChats = function () {
    let recentChats = window.Store.Chat.filter((chat) => {
      if (chat.id.server !== "c.us") return false;

      const isSaved = chat.contact.isAddressBookContact;
      const isNotBusiness = !chat.contact.isBusiness;

      return isSaved && isNotBusiness;
    });
    return recentChats;
  };

  // Send a message
  window.PROS.sendMessage = function (id, message) {
    return new Promise((resolve, reject) => {
      try {
        var chat = PROS.getChat(id);
        if (chat !== undefined) {
          chat.sendMessage(message);
          resolve();
        } else {
          reject("chat or group not found");
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  // Convert base64 string data to File
  window.PROS.base64toFile = function (data, fileName) {
    let arr = data.split(",");
    let mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  };
};

// InitMain :: Load Store and PROS
var initStoreInterval = null;
var initStoreRetryCount = 0;
var useOldMethod = true;

const initMain = function () {
  initStoreRetryCount = 0;
  initStoreInterval = setInterval(() => {
    if (isWhatsappLoaded() && isWebpackLoaded()) {
      initStore(useOldMethod)
        .then(() => {
          initPros();

          // Check store and pros loaded or not
          if (window.Store && window.PROS) {
            clearInterval(initStoreInterval);
            handleInitMainSuccess();
          } else {
            initStoreRetryCount++;
            handleInitMainError();
          }
        })
        .catch((e) => {
          initStoreRetryCount++;
          handleInitMainError();
        });
    } else {
      handleInitMainError();
    }

    if (!useOldMethod && initStoreRetryCount == 5) {
      reloadInitMain(true);
    }
  }, 1000);
};

const reloadInitMain = function (method) {
  clearInterval(initStoreInterval);
  setTimeout(() => {
    // console.logWarn(`InjectJS :: reloadInitMain :: useOldMethod = ${method}`);
    useOldMethod = method;
    initMain();
  }, 2000);
};

const handleInitMainSuccess = function () {
  if (isWhatsappLoaded() && window.Store && window.PROS) {
    // console.logSuccess(
    //   `InjectJS :: initMain - Success :: useOldMethod = ${useOldMethod}`
    // );
    // console.logSuccess(`InjectJS :: Init Store Type  :: ${getInitStoreType()}`);
    // console.logSuccess(
    //   `InjectJS :: Whatsapp Version :: ${getWhatsappVersion()}`
    // );

    getAllGroups();
    getAllContacts();
  }
};

const handleInitMainError = function (error = null) {
  let objName = null;
  if (!isWhatsappLoaded()) objName = "Whatsapp";
  else if (!isWebpackLoaded()) objName = "Webpack";
  else if (!window.Store) objName = "Store";
  else if (!window.PROS) objName = "PROS";

  if (error) {
    console.logError(
      `InjectJS :: initMain - Error :: useOldMethod = ${useOldMethod}`
    );
    console.error(error);
  } else if (objName) {
    console.logError(
      `InjectJS :: initMain - Error :: ${objName} is not loaded! :: useOldMethod = ${useOldMethod}`
    );
  } else {
    console.logError(
      `InjectJS :: initMain - Unkown Error :: useOldMethod = ${useOldMethod}`
    );
  }
};

// ======= CORE INJECT JS CODE ENDS HERE =======

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\

// ======= Pro Sender CODE STARTS =====

// Event Listeners and Pro Sender Functions
window.addEventListener("PROS::init", function (e) {
  reloadInitMain(e.detail.useOldMethod);
});

window.addEventListener("PROS::send-attachments", async function (e) {
  const attachments = e.detail.attachments;
  const caption = e.detail.caption;
  const number = e.detail.number;
  const waitTillSend = e.detail.waitTillSend;
  
  // Format chat ID properly - don't add @c.us if already has server suffix
  let chatId;
  if (number.includes('@')) {
    chatId = number; // Already has server suffix
  } else {
    chatId = number + "@c.us"; // Add @c.us to plain number
  }

  try {
    const sendPromises = attachments.map(async (file, index) => {
      const fileData = await JSON.parse(file.data);
      const fileBlob = await window.PROS.base64toFile(fileData, file.name);
      await window.PROS.sendAttachment(
        fileBlob,
        chatId,
        caption[index],
        waitTillSend
      );
    });

    await Promise.all(sendPromises);
    window.postMessage(
      {
        type: "send_attachments_to_number",
        payload: {
          chat_id: chatId,
          is_attachments_sent: "YES",
          comments: "",
        },
      },
      "*"
    );
  } catch (error) {
    console.error(error);
    window.postMessage(
      {
        type: "send_attachments_to_number_error",
        payload: {
          chat_id: chatId,
          error: error,
          is_attachments_sent: "NO",
          comments: "Error while sending the attachments to number",
        },
      },
      "*"
    );
  }
});

window.addEventListener("PROS::send-message", async function (e) {
  const number = e.detail.number;
  const message = e.detail.message;
  
  // Format chat ID properly - don't add @c.us if already has server suffix
  let chatId;
  if (number.includes('@')) {
    chatId = number; // Already has server suffix
  } else {
    chatId = number + "@c.us"; // Add @c.us to plain number
  }
  
  try {
    await window.PROS.sendMessage(chatId, message);
    window.postMessage(
      {
        type: "send_message_to_number",
        payload: {
          chat_id: chatId,
          is_message_sent: "YES",
          comments: "",
        },
      },
      "*"
    );
  } catch (error) {
    console.error(error);
    window.postMessage(
      {
        type: "send_message_to_number_new_error",
        payload: {
          chat_id: chatId,
          error: error,
          is_message_sent: "NO",
          comments: "Error while sending the message to number",
        },
      },
      "*"
    );
  }
});

window.addEventListener("PROS::send-message-to-group", async function (e) {
  const groupId = e.detail.group_id;
  const message = e.detail.message;
  const groupIdObj = { _serialized: e.detail.group_id };

  try {
    await window.PROS.sendMessage(groupIdObj, message);
    window.postMessage(
      {
        type: "send_message_to_group",
        payload: {
          group_id: groupId,
          is_message_sent: "YES",
          comments: "",
        },
      },
      "*"
    );
  } catch (error) {
    console.error(error);
    window.postMessage(
      {
        type: "send_message_to_group_error",
        payload: {
          chat_id: chatId,
          error: error,
          is_message_sent: "NO",
          comments: "Error while sending the message to group",
        },
      },
      "*"
    );
  }
});

window.addEventListener(
  "PROS::send-attachments-to-group",
  async function (e) {
    const attachments = e.detail.attachments;
    const caption = e.detail.caption;
    const groupId = e.detail.groupId;
    const waitTillSend = e.detail.waitTillSend;

    try {
      const sendPromises = attachments.map(async (file, index) => {
        const fileData = await JSON.parse(file.data);
        const fileBlob = await window.PROS.base64toFile(fileData, file.name);
        await window.PROS.sendAttachment(
          fileBlob,
          groupId,
          caption[index],
          waitTillSend
        );
      });

      await Promise.all(sendPromises);
      window.postMessage(
        {
          type: "send_attachments_to_group",
          payload: {
            group_id: groupId,
            is_attachments_sent: "YES",
            comments: "",
          },
        },
        "*"
      );
    } catch (error) {
      console.error(error);
      window.postMessage(
        {
          type: "send_attachments_to_group_error",
          payload: {
            group_id: groupId,
            error: error,
            is_attachments_sent: "NO",
            comments: "Error while sending the attachments to group",
          },
        },
        "*"
      );
    }
  }
);

window.addEventListener("PROS::export-group", function (e) {
  const groupId = e.detail.groupId;

  try {
    let groupName = PROS.getGroupName(groupId);
    let contacts = PROS.getGroupContacts(groupId);
    let rows = [];

    contacts.forEach((contact) => {
      rows.push([contact.number, contact.name]);
    });

    // rows.sort();
    rows.unshift(["Number", "Name"]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((row) => row.join(",")).join("\n");
    let data = encodeURI(csvContent);
    let link = document.createElement("a");

    link.setAttribute("href", data);
    link.setAttribute("download", groupName + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    window.postMessage(
      {
        type: "export_group_error",
        payload: { group_id: groupId, error: error },
      },
      "*"
    );
  }
});

window.addEventListener("PROS::export-unsaved-contacts", function (e) {
  let type = e.detail.type;

  try {
    let rows = [];
    let contacts = PROS.getMyUnsavedContacts();

    let numContacts = type == "Advance" ? contacts.length : 10;
    for (let i = 0; i < numContacts; i++) {
      if (contacts[i].user) {
        let correctNumber = "+" + contacts[i].user;
        let whatsappName = contacts[i].pushname || "Unknown";
        rows.push([correctNumber, whatsappName]);
      }
    }

    rows.unshift(["Numbers", "Name"]);
    if (type == "Expired") {
      for (let i = 0; i < 3; i++) rows.push([]);
      rows.push(["To download all contacts please buy Advance Premium"]);
    }

    let csvContent = rows.map((row) => row.join(",")).join("\n");
    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    let link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", "Advanced_All_Unsaved_Chats_Export.csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    window.postMessage(
      {
        type: "export_unsaved_contacts_error",
        payload: { type: type, error: error },
      },
      "*"
    );
  }
});

const getAllGroups = async function () {
  try {
    let groups = await PROS.getAllGroups();
    if (!Array.isArray(groups)) groups = [];

    let allGroups = groups
      .filter((group) => group && (group?.id || group?.attributes?.id))
      .map((group) => ({
        id: group?.id || group?.attributes?.id,
        name: group?.formattedTitle || group?.attributes?.formattedTitle,
      }));

    window.postMessage({ type: "get_all_groups", payload: allGroups }, "*");
    return allGroups;
  } catch (error) {
    window.postMessage(
      { type: "get_all_groups_error", payload: { error: error } },
      "*"
    );
    return [];
  }
};

window.addEventListener("PROS::get-all-groups", getAllGroups);

const getAllContacts = async function () {
  try {
    let recentContacts = await PROS.getRecentChats();
    let contacts = await PROS.getAllContacts();

    const recentContactIds = new Set(
      recentContacts.map((contact) => contact.id._serialized)
    );
    const remainingContacts = contacts.filter(
      (contact) => !recentContactIds.has(contact.id._serialized)
    );
    remainingContacts.sort((a, b) => {
      const nameA = a.name || a.formattedTitle || "";
      const nameB = b.name || b.formattedTitle || "";
      return nameA.localeCompare(nameB);
    });

    const uniqueContactIds = new Set();
    const combinedContacts = [...recentContacts, ...remainingContacts].filter(
      (contact) => {
        if (uniqueContactIds.has(contact.id._serialized)) {
          return false;
        }
        uniqueContactIds.add(contact.id._serialized);
        return true;
      }
    );

    const allContacts = combinedContacts.map((contact) => ({
      id: contact.id,
      name: contact.name || contact.formattedTitle,
    }));

    window.postMessage({ type: "get_all_contacts", payload: allContacts }, "*");
    return allContacts;
  } catch (error) {
    window.postMessage(
      { type: "get_all_contacts_error", payload: { error: error } },
      "*"
    );
    return [];
  }
};

window.addEventListener("PROS::get-all-contacts", getAllContacts);

const getInitStoreType = function () {
  let InitType = window?.Store?.InitType;
  window.postMessage({ type: "get_init_store_type", payload: InitType }, "*");
  return InitType;
};

const getWhatsappVersion = function () {
  let whatsappVersion = window?.Debug?.VERSION
    ? window.Debug.VERSION
    : "Not Found";
  window.postMessage(
    { type: "get_whatsapp_version", payload: whatsappVersion },
    "*"
  );
  return whatsappVersion;
};

// Start Init Main
reloadInitMain(true);

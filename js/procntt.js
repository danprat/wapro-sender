var pro_close_img_src = chrome.runtime.getURL("logo/pro-closeBtn.png");
var pro_free_trial_src = chrome.runtime.getURL("logo/pro-free-trial.png");
var pro_advance_promo_src = chrome.runtime.getURL("logo/pro_advance_promo.png");
var pro_success_gif = chrome.runtime.getURL("logo/pro-success.gif");
var pro_recommend_tick = chrome.runtime.getURL("logo/pro-tickmark.png");
var pro_export_chat_contacts_img_src = chrome.runtime.getURL(
  "logo/pro-export-unsaved-contacts.png"
);
var pro_export_img_src = chrome.runtime.getURL("logo/pro-export.png");
var pro_export_contacts_text_src = chrome.runtime.getURL(
  "logo/pro-export-contact.svg"
);
var pro_email_icon_src = chrome.runtime.getURL("logo/pro-email.png");
var pro_error_icon_src = chrome.runtime.getURL("logo/pro-error.png");
var pro_help_icon_src = chrome.runtime.getURL("logo/pro-help.png");
var pro_read_icon_src = chrome.runtime.getURL("logo/pro-read.png");
var pro_wall_clock_white_icon = chrome.runtime.getURL(
  "logo/pro-wall-clock-white.png"
);
var pro_smile_icon = chrome.runtime.getURL("logo/pro-smile.png");
var logo_img = chrome.runtime.getURL("logo/pro-logo-img.png");
var large_logo_img = chrome.runtime.getURL("logo/large.png");
var medium_logo_img = chrome.runtime.getURL("logo/pro-medium.png");
var logo_text = chrome.runtime.getURL("logo/pro-logo-text.png");
var logo_text_light = chrome.runtime.getURL("logo/pro-logo-text-light.png");
var pro_arrow_left = chrome.runtime.getURL("logo/pro-arrow-left.png");
var pro_arrow_right = chrome.runtime.getURL("logo/pro-arrow-right.png");
var pro_bulb_icon = chrome.runtime.getURL("logo/pro-lightbulb.png");
var pro_how_to_use1 = chrome.runtime.getURL("logo/pro-how-to-use-1.gif");
var pro_how_to_use2 = chrome.runtime.getURL("logo/pro-how-to-use-2.gif");
var pro_how_to_use3 = chrome.runtime.getURL("logo/pro-how-to-use-3.gif");
var pro_man_thinking = chrome.runtime.getURL("logo/pro-man-thinking.png");
var pro_cross_icon_src = chrome.runtime.getURL("logo/pro-close-1.png");
var pro_check_icon_src = chrome.runtime.getURL("logo/pro-check-mark.png");
var pro_eye_visible = chrome.runtime.getURL("logo/pro-eye-visible.png");
var pro_eye_hidden = chrome.runtime.getURL("logo/pro-eye-hidden.png");
var pro_pause_icon_src = chrome.runtime.getURL("logo/pro-pause_logo.png");
var pro_alarm_clock = chrome.runtime.getURL("logo/pro_alarm_clock.png");
var pro_yellow_star = chrome.runtime.getURL("logo/pro_yellow-star.png");
var pro_multiple_users_icon = chrome.runtime.getURL(
  "logo/pro_multiple-users.png"
);

let link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Palanquin+Dark:wght@400;500;700&family=PT+Sans+Caption&family=Reem+Kufi+Ink&display=swap";
document.head.appendChild(link);

let my_number = null,
  logged_in_user = null,
  plan_type = "Advance", // BYPASSED: Set to Advance (highest tier)
  last_plan_type = "Advance", // BYPASSED: Set to Advance
  plan_duration = "Yearly"; // BYPASSED: Set to Yearly
let expiry_date = null;

var rows = [],
  notifications_hash = {},
  stop = false,
  pause = false,
  groupIdToName = {},
  contactIdToName = {};

let isProfile = false;

var messages = [
  "Hello! how can we help you?",
  "Hello!",
  "Thank you for using service!",
],
  total_messages = 0;

var location_info = {
  name: "international",
  name_code: "US",
  currency: "USD",
  default: true,
};

var cancelDelay;

var init_store_type = null,
  whatsapp_version = null,
  extension_version = chrome.runtime.getManifest().version;

// setting premium usage object in the local
let premiumUsageObject = {
  lastDate: new Date().getDate(),
  lastMonth: new Date().getMonth(),
  attachment: false,
  customisation: false, // feature where???
  groupContactExport: false,
  quickReplies: false,
  caption: false,
  stop: false,
  timeGap: false,
  batching: false,
  multipleAttachment: false,
  schedule: false,
};

// BYPASSED: Removed conditional check for isAdvanceFeatureAvailable() 
// since we always have premium features enabled now
// Original code:
// if (isAdvanceFeatureAvailable() || isExpired()) {
//   premiumUsageObject = {
//     ...premiumUsageObject,
//     multipleAttachment: false,
//     schedule: false,
//   };
// }

function setPremiumUsageObject() {
  chrome.storage.local.get(["premiumUsageObject"], function (result) {
    if (result.premiumUsageObject !== undefined) {
      const day = result.premiumUsageObject.lastDate;
      const presentDay = new Date().getDate();
      let diffInDays;
      if (presentDay >= day) {
        diffInDays = presentDay - day;
      } else {
        diffInDays = 30 - day + presentDay;
      }
      if (diffInDays >= 14) {
        chrome.storage.local.set({ premiumUsageObject: premiumUsageObject });
      }
    } else {
      chrome.storage.local.set({ premiumUsageObject: premiumUsageObject });
    }
  });
}
setPremiumUsageObject();

// For injecting api js
(function addInject() {
  let jsPath = "/js/proinjt.js";
  let script_element = document.createElement("script");
  script_element.setAttribute("type", "text/javascript");
  script_element.setAttribute("id", "inject");
  script_element.src = chrome.runtime.getURL(jsPath);
  script_element.onload = function () {
    this.parentNode.removeChild(this);
  };
  document.head.appendChild(script_element);
})();

// InjectJS Message Listener
window.addEventListener("message", injectMessageListner, false);

function injectMessageListner(event) {
  if (event.source != window || !event.data.type) return;

  let message_type = event.data.type;
  let message_payload = event.data.payload;

  // Handle error and success
  if (message_payload) {
    if (message_payload.error) {
      trackError(message_type, message_payload.error);
    } else if (message_type.includes("send")) {
      trackSuccess(message_type + "_success");
    }
  }

  // Handle message type
  switch (message_type) {
    case "get_init_store_type":
      init_store_type = localStorage.getItem("pro-sender::init_store_type");
      if (!init_store_type || init_store_type != message_payload) {
        init_store_type = message_payload;
        localStorage.setItem("pro-sender::init_store_type", init_store_type);
        trackSystemEvent("init_store_type", init_store_type);
      }
      break;

    case "get_whatsapp_version":
      whatsapp_version = localStorage.getItem("pro-sender::whatsapp-version");
      if (!whatsapp_version || whatsapp_version != message_payload) {
        whatsapp_version = message_payload;
        localStorage.setItem("pro-sender::whatsapp-version", whatsapp_version);
        trackSystemEvent("whatsapp_version", whatsapp_version);
      }
      break;

    case "get_all_groups":
      setGroupDataToLocalStorage(message_payload);
      break;

    case "get_all_contacts":
      setContactDataToLocalStorage(message_payload);
      break;

    // Handle send_message responses
    case "send_message_to_number":
      resolveSendMessageToNumber(message_payload);
      break;
    case "send_message_to_number_new_error":
      rejectSendMessageToNumber(message_payload);
      break;

    case "send_message_to_group":
    case "send_message_to_group_error":
      resolveSendMessageToGroup(message_payload);
      break;

    // Handle send_attachments responses
    case "send_attachments_to_number":
    case "send_attachments_to_number_error":
      resolveSendAttachmentsToNumber(message_payload);
      break;

    case "send_attachments_to_group":
    case "send_attachments_to_grpup_error":
      resolveSendAttachmentsToGroup(message_payload);
      break;

    default:
      break;
  }
}

function download_group_contacts() {
  let conv_header = getDocumentElement("conversation_header");
  if (!conv_header) return;

  let conv_msg_div = getDocumentElement("conversation_message_div");
  if (!conv_msg_div || !conv_msg_div.dataset["id"].includes("@g.us")) return;
  let curr_chat_id = conv_msg_div.dataset["id"];

  let group_id = curr_chat_id.split("_")[1];
  let download_group_btn = document.createElement("div");

  let export_contacts_text = document.createElement("span");
  export_contacts_text.classList.add("export_contacts_text");
  let export_contacts_text_class = "";
  let groupTitleElement = getDocumentElement("conversation_title_div");
  let groupTitle = groupTitleElement.innerText;

  if (document.body.classList.contains("dark")) {
    export_contacts_text_class = "export_gif_bright";
  }

  export_contacts_text.innerHTML = ` <img class="export_gif ${export_contacts_text_class}" src=${pro_export_contacts_text_src} />`;

  download_group_btn.id = "download_group_btn";
  download_group_btn.className = "CtaBtn shimmer";
  download_group_btn.innerHTML = `<img src=${pro_export_img_src} />`;
  download_group_btn.appendChild(export_contacts_text);

  chrome.storage.local.get(
    ["coeu862", "ldeu863", "groupDataForShimmer"],
    function (result) {
      let today = new Date().toDateString();
      let coeu862 = result.coeu862 || 0;
      let ldeu863 = result.ldeu863 || "";
      let groupDataForShimmer = result.groupDataForShimmer || [{}];

      if (today !== ldeu863) {
        ldeu863 = today;
        coeu862++;
        chrome.storage.local.set({
          coeu862: coeu862,
          ldeu863: ldeu863,
        });
      }

      if (coeu862 <= 5) {
        let groupIndex = groupDataForShimmer.findIndex(
          (group) => group.groupName === groupTitle
        );
        if (groupIndex !== -1) {
          if (
            groupDataForShimmer[groupIndex].lastShimmerDay !== today &&
            groupDataForShimmer[groupIndex].shimmerCount <= 5
          ) {
            groupDataForShimmer[groupIndex].lastShimmerDay = today;
            groupDataForShimmer[groupIndex].shimmerCount =
              groupDataForShimmer[groupIndex].shimmerCount + 1;
            chrome.storage.local.set({
              groupDataForShimmer: groupDataForShimmer,
            });
          } else {
            download_group_btn.classList.remove("shimmer");
            export_contacts_text.innerHTML = `Export Contacts`;
          }
        } else {
          groupDataForShimmer.push({
            groupName: groupTitle,
            lastShimmerDay: today,
            shimmerCount: 1,
          });
          chrome.storage.local.set({
            groupDataForShimmer: groupDataForShimmer,
          });
        }
        setTimeout(() => {
          download_group_btn.classList.remove("shimmer");
          export_contacts_text.innerHTML = `Export Contacts`;
        }, 5000);
      } else {
        download_group_btn.classList.remove("shimmer");
        export_contacts_text.innerHTML = `Export Contacts`;
      }
    }
  );

  conv_header.insertBefore(download_group_btn, conv_header.childNodes[2]);
  let groupTitleParent = groupTitleElement?.parentElement?.parentElement;
  if (groupTitleElement) {
    groupTitleParent.style.overflowX = "hidden";
  }

  download_group_btn.addEventListener("click", function () {
    if (isPremiumFeatureAvailable()) {
      window.dispatchEvent(
        new CustomEvent("PROS::export-group", {
          detail: {
            groupId: group_id,
          },
        })
      );
      trackButtonClick("download_group_contacts_premium");
    } else {
      premium_reminder("download_group_contacts", "Premium");
    }
    // updating premium usage for group contact export
    chrome.storage.local.get(["premiumUsageObject"], function (result) {
      if (result.premiumUsageObject !== undefined) {
        let updatedPremiumUsageObject = {
          ...result.premiumUsageObject,
          groupContactExport: true,
        };
        chrome.storage.local.set({
          premiumUsageObject: updatedPremiumUsageObject,
        });
      }
    });

    trackButtonClick("download_group_contacts");
  });
}

function profile_header_buttons() {
  const profile_header = getDocumentElement("profile_header");
  if (!profile_header) return;

  const profile_header_buttons_div = document.createElement("div");
  profile_header_buttons_div.id = "profile_header_buttons_div";

  const profile_header_buttons_list = profile_header.children[0];
  profile_header_buttons_list.insertBefore(
    profile_header_buttons_div,
    profile_header_buttons_list.children[0]
  );

  // Profile Header Buttons
  add_profile_header_btn(
    "pro_profile",
    "Profile - Pro Sender",
    medium_logo_img,
    pro_profile_popup
  );
  add_profile_header_btn(
    "blur_contacts",
    "Blur chat, contact name and profile picture - Pro Sender",
    pro_eye_hidden,
    toggle_blur
  );
  add_profile_header_btn(
    "download_unsaved_contacts",
    "Export unsaved contacts - Pro Sender",
    pro_export_chat_contacts_img_src,
    download_unsaved_contacts
  );

  // Handle other
  const new_chat_btn = getDocumentElement("new_chat_btn");
  if (new_chat_btn && !new_chat_btn.classList.contains("CtaBtn")) {
    new_chat_btn.classList.add("CtaBtn");
  }
  const new_chat_parent = getDocumentElement("new_chat_parent");
  if (new_chat_parent) {
    new_chat_btn.title = "";
    handleShowTooltip({
      query: DOCUMENT_ELEMENT_SELECTORS["new_chat_parent"][0],
      text: "New chat",
      bottom: "-30px",
    });
  }
}

function add_profile_header_btn(btn_id, btn_title, btn_image = null, on_click) {
  const profile_header_buttons_div = document.querySelector(
    "#profile_header_buttons_div"
  );
  if (!profile_header_buttons_div) return;

  const existing_btn = document.querySelector(`#${btn_id}`);
  if (existing_btn) return;

  const btn = document.createElement("div");
  btn.id = btn_id;
  btn.classList.add("profile_header_button");
  btn.innerHTML = `<img src=${btn_image} class='${btn_id}_icon CtaBtn' alt='${btn_id}'>`;
  btn.addEventListener("click", on_click);

  profile_header_buttons_div.appendChild(btn);
  handleShowTooltip({
    query: `#${btn_id}`,
    text: btn_title,
    bottom: "-30px",
  });
}

function download_unsaved_contacts() {
  if (isAdvanceFeatureAvailable()) {
    window.dispatchEvent(
      new CustomEvent("PROS::export-unsaved-contacts", {
        detail: { type: "Advance" },
      })
    );
    trackButtonClick("download_unsaved_contacts_premium");
  } else {
    window.dispatchEvent(
      new CustomEvent("PROS::export-unsaved-contacts", {
        detail: { type: "Expired" },
      })
    );
  }

  // Update premium usage
  chrome.storage.local.get(["premiumUsageObject"], (result) => {
    if (result.premiumUsageObject !== undefined) {
      let updatedPremiumUsageObject = {
        ...result.premiumUsageObject,
        downloadUnsavedContacts: true,
      };
      chrome.storage.local.set({
        premiumUsageObject: updatedPremiumUsageObject,
      });
    }
  });

  trackButtonClick("download_unsaved_contacts");
}

async function showBuyPremiumButtons() {
  let pricing_data;
  if (last_plan_type == "FreeTrial" || plan_type == "FreeTrial")
    pricing_data = PRICING_DATA["free_trial_expired"];
  else pricing_data = PRICING_DATA["premium_expired"];
  if (!pricing_data) return "";

  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let pricing_link = `https://pro-sender.kuldeepyadav.tech/checkout/?country=${country_name}&phone=${my_number}&plan=`;

  let advancePrice = pricing_data.advance_price[country_name];
  let basicPrice = pricing_data.basic_price[country_name];
  let advanceConvertedPrice = await convertPriceToLocale(
    advancePrice.substring(1)
  );
  let basicConvertedPrice = await convertPriceToLocale(basicPrice.substring(1));

  if (
    plan_type == "FreeTrial" ||
    (plan_type == "Expired" && last_plan_type == "FreeTrial")
  ) {
    return getFreeTrialButtonHtml();
  } else if (plan_type == "Expired") {
    if (last_plan_type == "Basic") {
      let { basicButtonHtml, advanceButtonHtml } =
        await getBasicPremiumExpiredButton(
          basicPrice,
          basicConvertedPrice,
          advancePrice,
          advanceConvertedPrice,
          pricing_link
        );
      return basicButtonHtml + advanceButtonHtml;
    } else if (last_plan_type == "Advance") {
      let advanceButtonHtml = await getAdvancePremiumExpiredButton(
        advancePrice,
        advanceConvertedPrice,
        pricing_link
      );
      return advanceButtonHtml;
    }
  } else {
    let buttonHtml = `<div style="width:100%;display:flex;justify-content:center;align-items:center;">
                <a href="https://pro-sender.kuldeepyadav.tech/multiple-account?numAccounts=25&country=${country_name}" target="_blank" style="color:#009a88;font-size:12px;text-decoration:underline;">Purchase for multiple users</a>
            </div>`;
    return buttonHtml;
  }
}

async function pro_profile_popup() {
  const parentDiv = document.querySelector("#profile_header_buttons_div");
  if (!parentDiv) return;

  if (document.querySelector("#pro_profile_popup")) {
    parentDiv.removeChild(document.querySelector("#pro_profile_popup"));
    return;
  }

  const mainDiv = document.createElement("div");
  mainDiv.id = "pro_profile_popup";
  mainDiv.classList.add("pro_profile_main");
  mainDiv.dir = "ltr";

  const topSection = document.createElement("div");
  topSection.classList.add("pro_profile_top");
  topSection.innerHTML = `
    <div class="pro_profile_cross" id="close_pro_profile_popup">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M405 136.798L375.202 107 256 226.202 136.798 107 107 136.798 226.202 256 107 375.202 136.798 405 256 285.798 375.202 405 405 375.202 285.798 256z"></path></svg>
    </div>
    <div class="pro_profile_logo">
         <div class="pro_profile_text">
             <img src="${logo_text_light}" alt="">
         </div>
    </div>`;

  const bodySection = document.createElement("div");
  bodySection.classList.add("pro_profile_body");

  let bodyHtml = await new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "my_number",
        "plan_type",
        "customer_name",
        "customer_email",
        "expiry_date",
      ],
      async function (result) {
        let bodyHtml = "";
        const order = [
          { key: "customer_name", label: "Name" },
          { key: "customer_email", label: "Email" },
          { key: "my_number", label: "Number" },
          { key: "plan_type", label: "Plan Type" },
          { key: "expiry_date", label: "Expiry Date" },
        ];

        for (const item of order) {
          let label = item.label;
          let value = result[item.key];
          if (item.key === "my_number" && value) {
            value = `+${value}`;
          } else if (item.key === "expiry_date" && value) {
            value = new Date(value).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }

          // const translatedLabel = await translate(item.label);
          if (value) {
            bodyHtml += `
                    <div class="pro_rows">
                        <p class="pro_col pro_col_end"><span>${label}</span> <span>:</span></p>
                        <span class="pro_col">${value}</span>
                    </div>`;
          }
        }

        resolve(bodyHtml);
      }
    );
  });

  const buyPremiumHtml = await showBuyPremiumButtons();
  bodyHtml += `<div class="premium_feature_block" id="buy_premium_block" style="border:none;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;" dir="ltr">${buyPremiumHtml}</div>`;

  bodySection.innerHTML = bodyHtml;

  if (currentLanguage === "es") {
    mainDiv.style.top = "35%";
  }

  mainDiv.append(topSection);
  mainDiv.append(bodySection);

  parentDiv.appendChild(mainDiv);

  let close_popup_btn = document.getElementById("close_pro_profile_popup");
  close_popup_btn.addEventListener("click", () => {
    parentDiv.removeChild(mainDiv);
  });
}

function toggle_blur(click_event) {
  try {
    const blurContactsBtn = document.getElementById("blur_contacts");
    const isBlurred = blurContactsBtn.classList.contains("blurred");

    // Elements to blur
    const reply_div = document.querySelector("#reply_div");
    const left_side_contacts_panel = getDocumentElement(
      "left_side_contacts_panel"
    );
    const conversation_header_name_div = getDocumentElement(
      "conversation_header_name_div"
    );

    const contact_profile_divs = getDocumentElement(
      "contact_profile_div",
      true
    );
    const conversation_message_divs = getDocumentElement(
      "conversation_message_div",
      true
    );
    const conversation_non_message_divs = getDocumentElement(
      "conversation_non_message_div",
      true
    );

    const elementsToToggle = [
      reply_div,
      left_side_contacts_panel,
      conversation_header_name_div,
      ...contact_profile_divs,
      ...conversation_message_divs,
      ...conversation_non_message_divs,
      // Add other elements as needed
    ];

    elementsToToggle.forEach((element) => {
      applyOrRemoveBlur(element, "blur", click_event ? !isBlurred : isBlurred);
    });

    if (click_event) {
      blurContactsBtn.classList.toggle("blurred", !isBlurred);
      blurContactsBtn.innerHTML = `<img class='blur_icon' src=${!isBlurred ? pro_eye_visible : pro_eye_hidden
        } alt='blur-info'>`;

      if (isBlurred) {
        trackButtonClick("blur_contacts");
      }
    }
  } catch (e) {
    console.error("Error :: toggle_blur :: ", e);
  }
}

function applyOrRemoveBlur(element, className, shouldApply) {
  try {
    if (!element) return;

    if (shouldApply) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  } catch (error) {
    console.log(error);
  }
}

function suggestion_messages() {
  var reply_div = document.getElementById("reply_div");
  if (reply_div) reply_div.parentNode.removeChild(reply_div);
  var smart_reply_edit_button = document.getElementById(
    "smart_reply_edit_button"
  );
  if (smart_reply_edit_button)
    smart_reply_edit_button.parentNode.removeChild(smart_reply_edit_button);
  var footer = getDocumentElement("footer_div");
  if (!footer) return;
  footer.style.paddingTop = "33px";
  var reply_div = document.createElement("div");
  reply_div.id = "reply_div";
  reply_div.style.position = "absolute";
  reply_div.style.padding = "8px 12px";
  reply_div.style.top = "0";
  reply_div.style.zIndex = "1";
  reply_div.style.width = "calc(100% - 80px)";
  $.each(messages, function (i, p) {
    var ps = p;
    if (p.length > 47) var ps = p.substring(0, 47) + "...";
    var dom_node = $(
      $.parseHTML(
        '<button class="reply_click CtaBtn" style="color: var(--message-primary);background-color: var(--outgoing-background);border-radius: 15px;padding: 4px 8px;font-size: 12px;margin-right: 8px;margin-bottom: 4px;direction: ltr !important" value="' +
        p +
        '">' +
        ps +
        "</button>"
      )
    );
    reply_div.appendChild(dom_node[0]);
  });
  total_messages = messages.length;
  footer.appendChild(reply_div);
  // scrolling windown to the top
  let conversation_panel = getDocumentElement("conversation_panel");
  if (conversation_panel) {
    conversation_panel.scrollBy(0, 33);
  }
  footer.appendChild(
    $(
      $.parseHTML(
        '<button class="CtaBtn" style="position: absolute;width: 80px;right: 8px;top: 12px;color: var(--message-primary);font-size: 12px !important;" id="smart_reply_edit_button">Edit</button>'
      )
    )[0]
  );

  var scrollWindow = document.getElementsByClassName("_33LGR")[0];
  if (scrollWindow) scrollWindow.scrollTop = scrollWindow.scrollHeight;
  var btnContainer = document.getElementById("reply_div");
  btnContainer.addEventListener("click", async function (event) {
    if (isPremiumFeatureAvailable()) {
      var message = event.target.value;
      if (message != undefined) {
        sendSuggestionMessage(message);
      }
      trackButtonClick("smart_reply_sent_premium");
    } else {
      premium_reminder("smart_reply", "Premium");
    }
    trackButtonClick("smart_reply_sent");
  });
  document
    .getElementById("smart_reply_edit_button")
    .addEventListener("click", function (event) {
      suggestion_popup();
      if (isPremiumFeatureAvailable()) {
        trackButtonClick("smart_reply_edit_premium");
      }
      trackButtonClick("smart_reply_edit");
    });

  // updating premium usage for quick replies
  let quickReplyButton = document.getElementsByClassName("reply_click")[0];
  if (quickReplyButton) {
    quickReplyButton.addEventListener("click", function () {
      chrome.storage.local.get(["premiumUsageObject"], function (result) {
        if (result.premiumUsageObject !== undefined) {
          let updatedPremiumUsageObject = {
            ...result.premiumUsageObject,
            quickReplies: true,
          };
          chrome.storage.local.set({
            premiumUsageObject: updatedPremiumUsageObject,
          });
        }
      });
    });
  }
}

async function sendSuggestionMessage(message) {
  if (!message || message.trim().length == 0) return;

  let message_input_box = getDocumentElement("input_message_div");
  if (!message_input_box) return;

  pasteMessage(message);
  await sendMessageToNumber();
}

function pasteMessage(text) {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData("text", text);
  const event = new ClipboardEvent("paste", {
    clipboardData: dataTransfer,
    bubbles: true,
  });

  const inputMessageBox = getDocumentElement("input_message_div");
  inputMessageBox.dispatchEvent(event);
}

function referesh_messages() {
  var inner_div = document.getElementById("sugg_message_list");
  inner_div.innerHTML = "";
  $.each(messages, function (i, p) {
    var dom_node = $(
      $.parseHTML(
        '<div style="margin: 8px 0px;display: flex;"><div class="popup_list_message" style="color: var(--message-primary);background-color: var(--outgoing-background);padding: 6px 7px 8px 9px;border-radius: 7.5px;margin: 2px 0px;max-width: 400px;margin-right: 8px;cursor: pointer;overflow: auto;">' +
        p +
        "</div>" +
        '<button class="delete_message CtaDeleteBtn" style="border: 1px solid red;width: 18px;height: 18px;color: red;border-radius: 50%;font-size: 11px;margin-top: 8px;" value="' +
        p +
        '">X</button></div>'
      )
    );
    inner_div.appendChild(dom_node[0]);
  });
  chrome.storage.local.set({ messages: messages });
}

async function suggestion_popup() {
  if (!document.getElementsByClassName("modal")[0]) {
    var popup = document.createElement("div");
    popup.className = "modal";
    var modal_content = document.createElement("div");
    modal_content.className = "modal-content";
    modal_content.style.position = "relative";
    modal_content.style.width = "600px";
    modal_content.style.maxHeight = "560px";
    modal_content.style.overflow = "auto";
    popup.appendChild(modal_content);
    var body = document.querySelector("body");
    body.appendChild(popup);
    modal_content.appendChild(
      $(
        $.parseHTML(
          '<div style="font-weight: bold;font-size: 20px;text-align: center;margin-bottom: 24px;color: #000;">Edit/Add quick replies</div>'
        )
      )[0]
    );
    var inner_div = document.createElement("div");
    inner_div.id = "sugg_message_list";
    inner_div.style.height = "210px";
    inner_div.style.overflowY = "auto";
    inner_div.style.margin = "16px 0px";
    modal_content.appendChild(inner_div);
    referesh_messages();
    modal_content.appendChild(
      $(
        $.parseHTML(
          '<span id="close_edit" class="CtaCloseBtn" style="position: absolute;top: 6px;right: 6px;font-size: 20px;width:14px"><img  class="CtaCloseBtn" src="' +
          pro_close_img_src +
          '" style="width: 100%;" alt="x"></span>'
        )
      )[0]
    );
    modal_content.appendChild(
      $(
        $.parseHTML(
          '<textarea style="width: 400px;height: 100px;padding: 8px;" type="text" id="add_message" placeholder="Type your quick reply here"></textarea>'
        )
      )[0]
    );
    modal_content.appendChild(
      $(
        $.parseHTML(
          '<button class="CtaBtn" style="background: #62D9C7;border-radius: 2px;padding: 8px 12px;float: right;color: #fff;" id="add_message_btn">Add Template</button>'
        )
      )[0]
    );

    document
      .getElementById("close_edit")
      .addEventListener("click", function (event) {
        document.getElementsByClassName("modal")[0].style.display = "none";
      });
    document
      .getElementById("sugg_message_list")
      .addEventListener("click", async function (event) {
        var nmessage = event.target.value;
        if (event.target.localName != "div") {
          var index = messages.indexOf(nmessage);
          messages.splice(index, 1);
          referesh_messages();
          trackButtonClick("smart_reply_deleted");
        } else if (
          event.target.localName == "div" &&
          event.target.className == "popup_list_message"
        ) {
          document.getElementsByClassName("modal")[0].style.display = "none";
          if (isPremiumFeatureAvailable()) {
            var message = event.target.innerText;
            if (message != undefined) {
              sendSuggestionMessage(message);
            }
            trackButtonClick("smart_reply_sent_premium");
          } else {
            premium_reminder("smart_reply", "Premium");
          }
          trackButtonClick("smart_reply_sent");
        }
      });
    document
      .getElementById("add_message_btn")
      .addEventListener("click", function (event) {
        var nmessage = document.getElementById("add_message").value;
        if (nmessage !== "") {
          nmessage = nmessage
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          messages.push(nmessage);
          referesh_messages();
          document.getElementById("add_message").value = "";
          trackButtonClick("smart_reply_added");
        }
      });
  } else {
    document.getElementsByClassName("modal")[0].style.display = "block";
  }

  document.getElementById("add_message").placeholder = await translate(
    "Type your quick reply here"
  );
  document.getElementById("add_message_btn").innerText = await translate(
    "Add Template"
  );
}

async function reload_my_number() {
  if (!my_number) {
    try {
      var last_wid = window.localStorage.getItem("last-wid");
      var last_wid_md = window.localStorage.getItem("last-wid-md");
      if (last_wid_md)
        my_number = window.localStorage
          .getItem("last-wid-md")
          .split("@")[0]
          .substring(1)
          .split(":")[0];
      else if (last_wid)
        my_number = window.localStorage
          .getItem("last-wid")
          .split("@")[0]
          .substring(1);

      if (my_number) {
        chrome.storage.local.set({ my_number: my_number });
      }
    } catch (e) {
      trackError("my_number_error", e);
      console.log(e);
    }
  }

  if (!my_number) {
    let result = await chrome.storage.local.get("my_number");
    my_number = result.my_number || null;
  }

  if (!my_number) {
    trackSystemEvent("no_number", "track");
    try {
      trackSystemEvent("no_number_local_storage", window.localStorage);
    } catch (e) {
      console.log(e);
    }
  } else {
    fetch_plan_details();
    trackSystemEvent("my_number", my_number);
  }
}

function setGroupDataToLocalStorage(data) {
  let finalGroupData = data.map((group) => {
    return {
      ...group,
      objId: "g" + group.id._serialized.replace(/\D+/g, ""),
    };
  });
  chrome.storage.local.set({ allGroupData: finalGroupData });

  const groupData = data;
  groupData.forEach((group) => {
    const groupid = group.id._serialized;
    if (groupid && group.name) groupIdToName[groupid] = group.name;
  });
}

function setContactDataToLocalStorage(data) {
  let finalContactData = data.map((contact) => {
    return {
      ...contact,
      objId: "c" + contact.id._serialized.replace(/\D+/g, ""),
    };
  });
  chrome.storage.local.set({ allContactData: finalContactData });

  const contactData = data;
  contactData.forEach((contact) => {
    const contact_id = contact.id._serialized;
    if (contact_id && contact.name) contactIdToName[contact_id] = contact.name;
  });
}

async function readFileAndSaveToLocalStorage(e, localStorageName) {
  let files = e.target.files;
  let renderedFiles = [];

  let fileReadPromises = Array.from(files).map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const base64Data = event.target.result;
        const fileData = {
          name: file.name,
          type: file.type,
          data: base64Data,
        };
        renderedFiles.push(fileData);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  });
  await Promise.all(fileReadPromises);
  chrome.storage.local.set({ [localStorageName]: renderedFiles });
}

async function handleAddAttachment() {
  let inputElement = document.createElement("input");
  inputElement.type = "file";
  inputElement.id = "new_input_element";
  inputElement.multiple = true;
  document.body.appendChild(inputElement);
  inputElement.click();

  inputElement.addEventListener("change", async function (e) {
    let fileCount = inputElement?.files.length;
    if (fileCount && fileCount > 1 && !isAdvanceFeatureAvailable()) {
      premium_reminder("multiple_attachments", "Advance");
    } else {
      await readFileAndSaveToLocalStorage(e, "linuxInputAttachments");
    }
    inputElement.remove();
  });
}

function handleAddCSVInput() {
  let inputElement = document.createElement("input");
  inputElement.type = "file";
  inputElement.id = "new_csv_input_element";
  inputElement.accept = ".xls,.xlsx,.ods,.csv";
  document.body.appendChild(inputElement);
  inputElement.click();

  inputElement.addEventListener("change", async function (e) {
    await readFileAndSaveToLocalStorage(e, "linuxCSVAttachment");
    inputElement.remove();
  });
}

function init() {
  messageListner();
  fetchConfigData();

  window.onload = function () {
    if (window.location.host === "web.whatsapp.com") {
      reload_my_number();

      chrome.storage.local.get(["messages"], function (result) {
        if (result.messages) messages = result.messages;
      });

      setInterval(() => {
        const reply_div = document.getElementById("reply_div");
        if (!reply_div || messages.length !== total_messages) {
          suggestion_messages();
        }

        const download_group_btn =
          document.getElementById("download_group_btn");
        if (!download_group_btn) {
          download_group_contacts();
        }

        const translate_div = document.getElementById("translate_div");
        if (!translate_div) {
          translate_messages();
        }

        const profile_header_buttons_div = document.getElementById(
          "profile_header_buttons_div"
        );
        if (!profile_header_buttons_div) {
          profile_header_buttons();
        }

        const main_panel = document.getElementById("main");
        if (main_panel) {
          toggle_blur(null);
        }

        const sidePanel = document.querySelector("#pane-side");
        if (!sidePanel) {
          detectBanText();
        }
      }, 1000);

      trackSystemEvent("whatsapp_visit", my_number);
    }
    const profileHeaderInterval = setInterval(() => {
      const profile_header = getDocumentElement("profile_header");
      if (profile_header) {
        clearInterval(profileHeaderInterval);
        handleScheduleCampaigns();
      }
    }, 100);
  };
}
init();

function openEmailPopup(email_message) {
  let emailAddress = "prosendertool@gmail.com";
  let subject = encodeURIComponent("Chat support for Pro Sender");
  let body = encodeURIComponent(email_message);
  let mailtoLink =
    "mailto:" + emailAddress + "?subject=" + subject + "&body=" + body;
  window.open(mailtoLink, "_blank");
}

function messageListner() {
  chrome.runtime.onMessage.addListener(listner);
}

function listner(request, sender, sendResponse) {
  if (request.type === "number_message")
    messenger(
      request.numbers,
      request.message,
      request.time_gap,
      request.csv_data,
      request.customization,
      request.caption_customization,
      request.random_delay,
      request.batch_size,
      request.batch_gap,
      request.caption,
      request.send_attachment_first,
      request.type,
      request.startIndex,
      request.paused_report_rows,
      request.paused_sent_count,
      request.attachmentsData,
      request.custom_time_range
    );
  else if (request.type === "group_message")
    messenger(
      request.groups,
      request.message,
      request.time_gap,
      request.csv_data,
      request.customization,
      request.caption_customization,
      request.random_delay,
      request.batch_size,
      request.batch_gap,
      request.caption,
      request.send_attachment_first,
      request.type,
      request.startIndex,
      request.paused_report_rows,
      request.paused_sent_count,
      request.attachmentsData,
      request.custom_time_range
    );
  else if (request.type === "show_message_count_over_popup")
    messageCountOverPopup();
  else if (request.type === "schedule_message") handleScheduleCampaigns();
  else if (request.type === "clear_schedule_timeout")
    clearTimeout(request.timeoutId);
  else if (request.type === "help") handle_help();
  else if (request.type === "transfer_premium") help(request.message);
  else if (request.type === "show_premium_popup")
    premium_reminder(request.feature, "Premium");
  else if (request.type === "show_advance_popup")
    premium_reminder(request.feature, "Advance");
  else if (request.type === "add_attachments") handleAddAttachment();
  else if (request.type === "create_csv_input") handleAddCSVInput();
  else if (request.type === "reload_contacts") {
    window.dispatchEvent(new CustomEvent("PROS::get-all-contacts"));
  } else if (request.type === "reload_my_number") {
    reload_my_number();
  } else if (request.type === "chat_link") chat_link();
  else if (request.type === "unsaved_contacts_demo") unsavedContactsDemo();
  else if (request.type === "request_chat_premium") {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_BASIC);
  } else if (request.type === "request_zoom_premium") {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_ZOOM_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_ZOOM_SUPPORT_BASIC);
  } else if (request.type === "request_call_premium") {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_CALL_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_CALL_SUPPORT_BASIC);
  } else if (request.type === "unsubscribe")
    help(HELP_MESSAGES.UNSUBSCRIBE_PLAN);
  else if (request.type === "learn_schedule")
    help(HELP_MESSAGES.LEARN_SCHEDULE);
  else if (request.type === "buy_premium_popup") show_trial_popups();
  // else if (request.type === 'show_update_reminder_popup')
  //     updateReminderPopup();
}

function sendChromeMessage(message) {
  chrome.runtime.sendMessage(message);
}

function help(message) {
  chrome.storage.local.get(
    ["currentLanguage", "customer_care_number"],
    async (res) => {
      let help_message = message.replace(/ /gm, " ");
      let language = res.currentLanguage || "default";

      if (HELP_MESSAGE_LANGUAGE_CODES.includes(language)) {
        help_message = await translate(help_message);
      }
      await openNumber(res.customer_care_number, help_message);
      await sendMessage();
    }
  );
}

function handle_help() {
  if (isPremium()) {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_BASIC);
  } else {
    if (my_number && my_number.startsWith(62))
      openEmailPopup(HELP_MESSAGES.NEED_HELP_NON_PREMIUM);
    else help(HELP_MESSAGES.NEED_HELP_NON_PREMIUM);
  }
}

document.body.addEventListener("click", function (event) {
  if (event.target.classList.contains("handle_help_btn")) {
    handle_help();
  }
});

async function unsavedContactsDemo() {
  let translatedExportUnsavedContactsObj = await fetchTranslations(
    exportUnsavedContactsObj
  );
  driver(translatedExportUnsavedContactsObj).drive();
}

function getTodayDate() {
  let today = new Date();
  let dd = String(today.getDate()).padStart(2, "0");
  let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = today.getFullYear();

  return yyyy + "-" + mm + "-" + dd;
}

async function delay(ms) {
  if (ms == 0) return;

  return new Promise((resolve) => {
    cancelDelay = resolve;
    setTimeout(resolve, ms);
  });
}

async function sendMessage() {
  return new Promise((resolve) => {
    setTimeout(() => {
      let send_message_btn = getDocumentElement("send_message_btn");
      if (send_message_btn) {
        send_message_btn.click();
        resolve(["Yes", ""]);
      } else {
        resolve(["No", "Issue with the number"]);
      }
    }, 500);
  });
}

function download_report() {
  let s =
    "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  var o = encodeURI(s),
    l = document.createElement("a");
  l.setAttribute("href", o),
    l.setAttribute("download", "report.csv"),
    document.body.appendChild(l),
    l.click();
}

// Google Analytics
function getTrackLabel() {
  try {
    return [my_number, plan_type, plan_duration].join(" ").trim();
  } catch {
    return "";
  }
}

function getTrackLocation() {
  return location_info.default
    ? {}
    : {
      city: location_info.city,
      region: location_info.region,
      country: location_info.country,
      dial_code: location_info.dial_code,
    };
}

function getTrackContext() {
  return {
    init_store_type: init_store_type,
    whatsapp_version: whatsapp_version,
    extension_version: extension_version,
  };
}

function trackEvent(event, track) {
  trackGenericEvent(event, { type: "event", track, natural_interaction: true });
}

function trackButtonClick(event) {
  trackGenericEvent(event, { type: "clicked", natural_interaction: true });
}

function trackCloseButtonClick(event) {
  trackGenericEvent(event, { type: "clicked" });
}

function trackButtonView(event) {
  trackGenericEvent(event, { type: "viewed" });
}

function trackSystemEvent(event, track = "") {
  trackGenericEvent(event, { type: "event", track });
}

function trackSuccess(event) {
  trackGenericEvent(event, { type: "success" });
}

function trackError(event, error = "") {
  trackGenericEvent(event, { type: "error", error: String(error) });
}

function trackGenericEvent(event, data) {
  let label = getTrackLabel();
  let location = getTrackLocation();
  let context = getTrackContext();

  // Filters null and undefined values
  let combinedData = { ...location, ...context, ...data };
  let eventData = Object.fromEntries(
    Object.entries(combinedData).filter(
      ([key, value]) => value != null || value != undefined
    )
  );
  GoogleAnalytics.trackEvent(event, { label, ...eventData });
}

function convertDate(date = null) {
  if (!date) date = new Date();
  return (
    date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
  );
}

function dateDiff(date1, date2) {
  if (date1 && date2) return Math.ceil((date2 - date1) / (1000 * 24 * 3600));
}

function check_web_and_show_trial_popups() {
  // BYPASSED: Skip showing trial/premium popups
  console.log("Pro system bypassed - skipping trial popups");
  return;
  
  /* ORIGINAL CODE BYPASSED
  if (document.getElementById("side") !== null) {
    show_trial_popups();
    if (!my_number) return;
  } else {
    setTimeout(check_web_and_show_trial_popups, 500);
  }
  */
}

function show_trial_popups() {
  // BYPASSED: Skip showing any premium/trial popups
  console.log("Pro system bypassed - skipping all trial popups");
  return;
  
  /* ORIGINAL CODE BYPASSED
  chrome.storage.local.get(
    [
      "is_advance_promo_activated",
      "content_visits",
      "plan_type",
      "created_date",
      "expiry_date",
      "last_plan_type",
      "subscribed_date",
      "location_info",
    ],
    function (result) {
      // Initialize Values
      plan_type = result.plan_type || "Expired";
      last_plan_type = result.last_plan_type || "Basic";
      location_info = result.location_info || location_info;

      let today = new Date();
      let content_visits = result.content_visits || 0;
      let expiry_date = result.expiry_date
        ? new Date(result.expiry_date)
        : null;
      let created_date = result.created_date
        ? new Date(result.created_date)
        : null;
      let subscribed_date = result.subscribed_date
        ? new Date(result.subscribed_date)
        : null;
      let is_advance_promo_activated =
        result.is_advance_promo_activated || "NO";

      // Calculate Values
      let date_diff = expiry_date ? dateDiff(today, expiry_date) : 7;
      if (subscribed_date && expiry_date) {
        let plan_days = Math.abs(dateDiff(expiry_date, subscribed_date));
        plan_duration = plan_days > 31 ? "Yearly" : "Monthly";
      }

      // Show Popups
      if (plan_type === "FreeTrial") {
        if (content_visits === 0) {
          display_popup("free_trial_start", date_diff);
        } else if (date_diff <= 7) {
          display_popup("free_trial_reminder", date_diff);
        }
      } else if (plan_type === "AdvancePromo") {
        if (is_advance_promo_activated === "NO") {
          is_advance_promo_activated = "YES";
          display_popup("advance_promo_start", date_diff);
        } else if (date_diff <= 5) {
          display_popup("advance_promo_reminder", date_diff);
        }
      } else if (
        plan_type === "Expired" &&
        date_diff <= 0 &&
        my_number &&
        my_number != undefined
      ) {
        if (last_plan_type === "Basic" || last_plan_type === "Advance") {
          display_popup("premium_expired", date_diff);
        } else if (last_plan_type === "FreeTrial") {
          display_popup("free_trial_expired");
        } else if (last_plan_type === "AdvancePromo") {
          display_popup("advance_promo_expired");
        }
      } else if (
        (plan_type == "Basic" || plan_type == "Advance") &&
        plan_duration == "Monthly" &&
        date_diff <= 5
      ) {
        callIfNoOtherPopups(() => buyAnnualPopup());
      }

      // Set updated values
      chrome.storage.local.set({
        content_visits: content_visits + 1,
        plan_duration: plan_duration,
        is_advance_promo_activated: is_advance_promo_activated,
      });

      chrome.runtime.sendMessage({}, function (response) {
        trackSystemEvent("logged_mail", "logged_in_user");
      });
    }
  );
}

function isExpired() {
  return false; // BYPASSED: Always return false
}

function isBasic() {
  return true; // BYPASSED: Always return true
}

function isAdvance() {
  return true; // BYPASSED: Always return true
}

function isPremium() {
  return true; // BYPASSED: Always return true
}

function isFreeTrial() {
  return true; // BYPASSED: Always return true
}

function isAdvancePromo() {
  return true; // BYPASSED: Always return true
}

function isTrial() {
  return true; // BYPASSED: Always return true
}

function isBasicFeatureAvailable() {
  return true; // BYPASSED: Always return true
}

function isAdvanceFeatureAvailable() {
  return true; // BYPASSED: Always return true
}

function isPremiumFeatureAvailable() {
  return true; // BYPASSED: Always return true
}

function fetch_plan_details() {
  // BYPASSED: Skip AWS API calls for premium validation
  // Set default premium values instead
  console.log("Pro system bypassed - setting default premium values");
  
  plan_type = "Advance"; // Set to highest tier
  last_plan_type = "Advance";
  
  // Set expiry date far in the future
  let futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  expiry_date = futureDate.toISOString();
  
  // Save to storage
  chrome.storage.local.set({
    plan_type: "Advance",
    last_plan_type: "Advance",
    expiry_date: expiry_date,
    created_date: new Date().toISOString(),
    subscribed_date: new Date().toISOString(),
    customer_name: "Pro User",
    customer_care_number: "918178004424"
  });
  
  // Skip the popup display
  // check_web_and_show_trial_popups();
  return;
  
  /* ORIGINAL CODE BYPASSED
  if (!(my_number && my_number !== undefined)) return;

  fetch_data(my_number)
    .then((res) => {
      handle_response(res);
    })
    .catch((err) => {
      console.error("Error fetching number data:", err);
    });
  */
}

async function fetch_data(number) {
  var url = `${AWS_API.PLAN_FETCH}?phone=${number}`;
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: "GET",
      url: url,
      success: function (response) {
        resolve(response.body);
      },
      error: function (error) {
        reject(error);
      },
      dataType: "json",
      contentType: "application/json",
    });
  });
}

function handle_response(data) {
  if (data) {
    if (data.plan_type) {
      plan_type = data.plan_type;
      chrome.storage.local.set({ plan_type: data.plan_type });
    }
    if (data.created_date)
      chrome.storage.local.set({ created_date: data.created_date });
    if (data.expiry_date) {
      expiry_date = data.expiry_date;
      chrome.storage.local.set({ expiry_date: data.expiry_date });
    }
    if (data.last_plan_type) {
      last_plan_type = data.last_plan_type;
      chrome.storage.local.set({ last_plan_type: data.last_plan_type });
    }
    if (data.subscribed_date)
      chrome.storage.local.set({ subscribed_date: data.subscribed_date });
    if (data.name) chrome.storage.local.set({ customer_name: data.name });
    else chrome.storage.local.set({ customer_name: null });
    if (data.email) {
      chrome.storage.local.set({ customer_email: data.email });
    } else {
      chrome.storage.local.set({ customer_email: null });
    }
    if (
      data.customer_care_number != undefined &&
      data.customer_care_number != null &&
      data.customer_care_number != ""
    )
      chrome.storage.local.set({
        customer_care_number: data.customer_care_number,
      });
    else chrome.storage.local.set({ customer_care_number: "918178004424" });
    if (data.trial_days) {
      chrome.storage.local.set({ trial_days: data.trial_days });
      chrome.storage.local.get(["atd860"], (res) => {
        let atd860 = res.atd860;
        if (atd860 !== undefined && !atd860) {
          // add trial days to google analytics here
          // trackSystemEvent('Extension Installation',data.trial_days);
          chrome.storage.local.remove("atd860");
          chrome.runtime.sendMessage({
            type: "set_uninstall_url",
            trial_days: data.trial_days,
            number: my_number + data.plan_type,
          });
        }
      });
    }
    check_web_and_show_trial_popups();
    trackSystemEvent("plan_details_fetched", "fetched");
  } else
    alert(
      "Something went wrong in account. Please contact support at Whatsapp number +919178004424"
    ),
      chrome.storage.local.clear();
}

async function convertPriceToLocale(price) {
  const exchangeRateAPI =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
  const res = await fetch(exchangeRateAPI);
  const jsonData = await res.json();

  let { currency } = location_info;

  let formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  let exchangeRate = jsonData.usd[currency.toLowerCase()];
  let convertedPrice = formatter.format(
    Math.round(exchangeRate * 1.02 * parseFloat(price))
  );
  return convertedPrice;
}

function getFreeTrialButtonHtml() {
  let pricing_link = `https://pro-sender.kuldeepyadav.tech/pricing?country=${location_info.name}&plan=`;
  let freeTrialButtonHtml = `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-green-btn CtaBtn" style="font-weight:bold;">
            Buy Premium
        </a>`;
  return freeTrialButtonHtml;
}

async function getBasicPremiumExpiredButton(
  basicPrice,
  basicConvertedPrice,
  advancePrice,
  advanceConvertedPrice,
  pricing_link
) {
  const basicButtonHtml = await basicButton(
    pricing_link + "basic",
    basicPrice,
    basicConvertedPrice
  );
  const advanceButtonHtml = await advanceButton(
    pricing_link + "advance",
    advancePrice,
    advanceConvertedPrice,
    "premium_expired"
  );

  return { basicButtonHtml, advanceButtonHtml };
}

async function getAdvancePremiumExpiredButton(
  advancePrice,
  advanceConvertedPrice,
  pricing_link
) {
  const advanceButtonHtml = await advanceButton(
    pricing_link + "advance",
    advancePrice,
    advanceConvertedPrice,
    "premium_expired",
    false
  );
  return advanceButtonHtml;
}

function getAnnualButtonHtml() {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let pricing_link = `https://pro-sender.kuldeepyadav.tech/checkout/?country=${country_name}&phone=${my_number}`;
  let annualButton = `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-green-btn CtaBtn" style="font-weight:bold;">
            Buy Annual 
        </a>`;
  return annualButton;
}

async function create_pricing_buttons_html(popup_name) {
  let pricing_data = PRICING_DATA[popup_name];
  if (!pricing_data) return "";

  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let advancePrice = pricing_data.advance_price[country_name];
  let basicPrice = pricing_data.basic_price[country_name];
  let advanceConvertedPrice = await convertPriceToLocale(
    advancePrice.substring(1)
  );
  let basicConvertedPrice = await convertPriceToLocale(basicPrice.substring(1));

  let pricing_link = `https://pro-sender.kuldeepyadav.tech/checkout/?country=${country_name}&phone=${my_number}&plan=`;

  let multAccountButtonHtml = await multipleAccountButton();
  let basicButtonHtml = await basicButton(
    pricing_link + "basic",
    basicPrice,
    basicConvertedPrice
  );
  let advanceButtonHtml = await advanceButton(
    pricing_link + "advance",
    advancePrice,
    advanceConvertedPrice,
    popup_name
  );
  let showBasicButton = true,
    showAdvanceButton = false;
  let showMultAccountButton = false;

  if (last_plan_type == "Advance") {
    showBasicButton = false;
    showAdvanceButton = true;
  }

  let popup_button_html = "";

  if (
    popup_name == "free_trial_reminder" ||
    popup_name == "free_trial_expired"
  ) {
    popup_button_html = getFreeTrialButtonHtml();
    showBasicButton = false;
    showAdvanceButton = false;
  }

  if (popup_name == "premium_expired" && last_plan_type == "Basic") {
    let buttons = await getBasicPremiumExpiredButton(
      basicPrice,
      basicConvertedPrice,
      advancePrice,
      advanceConvertedPrice,
      pricing_link
    );
    basicButtonHtml = buttons.basicButtonHtml;
    advanceButtonHtml = buttons.advanceButtonHtml;
    showBasicButton = true;
    showAdvanceButton = true;
  }

  if (popup_name == "premium_expired" && last_plan_type == "Advance") {
    advanceButtonHtml = await getAdvancePremiumExpiredButton(
      advancePrice,
      advanceConvertedPrice,
      pricing_link
    );
    showBasicButton = false;
    showAdvanceButton = true;
  }

  if (popup_name == "buy_annual") {
    popup_button_html = getAnnualButtonHtml();
    showBasicButton = false;
    showAdvanceButton = false;
  }

  let pricing_buttons_html = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">
        <div class="pricing-buttons-container" style="margin-bottom:0px;"> 
            ${showBasicButton ? basicButtonHtml : ""}
            ${showAdvanceButton ? advanceButtonHtml : ""}
            ${showMultAccountButton ? multAccountButtonHtml : ""}
            ${popup_button_html}
        </div>
        <div style="width:100%;display:flex;justify-content:center;align-items:center;flex-direction:column;color:#fff;">
            <span style="margin-bottom:5px">or</span>
            <a href="https://pro-sender.kuldeepyadav.tech/multiple-account?numAccounts=25&country=${country_name}" target="_blank" style="color:#009a88;font-size:14px;text-decoration:underline;text-underline-offset:2px;display:flex;justify-content:center;align-items:center;gap:3px;"><img src="${pro_multiple_users_icon}" style="width:18px;"/>Buy multiple users upto 70% discount</a>
        </div>
    </div>
    `;
  return pricing_buttons_html;
}

function create_features_list_html(popup_name) {
  let features_html = "";
  let show_advance_bracket = true;
  if (popup_name.includes("advance_promo")) {
    show_advance_bracket = false;
  }

  $.each(PREMIUM_FEATURES, function (i, feature) {
    features_html += `
            <div class="trial_feature" style="font-weight: bold;color: #fff;">
                <span class="check_icon"></span>${feature}
                ${show_advance_bracket
        ? '<span style="color:#009a88;margin-left: 5px;"> (Advance) </span>'
        : ""
      }
            </div>`;
  });
  $.each(TRIAL_FEATURES, function (i, feature) {
    features_html += `<div class="trial_feature" style="color: #fff;"><span class="check_icon"></span>${feature}</div>`;
  });
  return features_html;
}

function create_footer_html() {
  let footer_html = `
        <div class="popup-footer">
            <div class="popup-footer-container">
                <div class="logo-div">
                    <img class="logo-icon" src="${window["logo_img"]}" alt="Logo"/>
                    <img class="logo-text" src="${window["logo_text"]}" alt="Logo Text"/>
                </div>
                <div class="contact-div">
                    <p>Any questions?</p>
                    <a class="handle_help_btn CtaBtn">Contact Support</a>
                </div>
            </div>
        </div>`;
  return footer_html;
}

async function create_popup_html(popup_name, date_diff) {
  const data = POPUP_DATA[popup_name];
  const common = POPUP_DATA.common;

  const title_text = data.title
    ? data.title
      .replace(
        "{VAR_DATE_DIFF}",
        `<br /><span class="expire_date_number">${date_diff}</span>`
      )
      .replace(
        "{VAR_EXP_TEXT}",
        date_diff > 0 ? `expires in ${date_diff} days` : "have expired"
      )
    : null;
  const pricing_buttons_html = await create_pricing_buttons_html(popup_name);
  const features_html = create_features_list_html(popup_name);
  const footer_html = create_footer_html();

  const popup_html = `
        <div class="${popup_name}_content trial_content" style="background: ${data.background_color
    }">
            ${data.close_button
      ? `<span class="CtaCloseBtn popup-close-btn" id="close_${popup_name}_popup"><img src=${pro_close_img_src} /></span>`
      : ""
    }

            <div class="popup-header">
                ${data.heading
      ? `<div class="trial_big_title heading ${popup_name}_bold">${await translate(
        data.heading
      )}</div>`
      : ""
    }
                <div class="trial_big_title">
                    ${data.icon ? `<img src=${window[data.icon]} />` : ""}
                    ${title_text ? `<p>${await translate(title_text)}</p>` : ""}
                </div>
                ${data.description
      ? `<div class="trial_title">${await translate(
        data.description
      )}</div>`
      : ""
    }
            </div>

            <div class="trial_separator_line ${popup_name}_divider"></div>

            <div class="popup-center"> 
                <div class="trial_features">${features_html}</div>
                ${data.note
      ? `<div class="trial_desc">${await translate(
        data.note
      )}</div>`
      : ""
    }
                ${pricing_buttons_html}
                ${data.action_button
      ? `<div id="${data.action_button.id}" class="popup-btn CtaBtn ${data.action_button.class}">${data.action_button.text}</div>`
      : ""
    }
                ${data.recommend_price
      ? `<div class="popup-message popup-recommendation-message"><img src="${pro_recommend_tick}"> ${await translate(
        common.recommend_text
      )}</div>`
      : ""
    }
                ${data.discount_text
      ? `<div class="popup-message popup-discount-message">*${await translate(
        common.discount_text
      )}</div>`
      : ""
    }
                ${data.purchase_note
      ? `<div class="popup-message popup-purchase-note">${await translate(
        common.purchase_note
      )}</div>`
      : ""
    }  
            </div>

            ${footer_html}
        </div>
    `;
  return popup_html;
}

function show_loader_and_close_popup(popup_name, delay, next_popup = false) {
  $(`#close_${popup_name}_popup`).addClass("loading").html("");
  setTimeout(() => {
    $(`#${popup_name}_popup`).remove();

    if (next_popup) {
      success_popup(next_popup);
    }
  }, delay);
}

// Common function to display all plan "start/reminder/expired" popups
async function display_popup(popup_name, date_diff) {
  // Remove old_popup if it's exists
  const old_popup = $(`#${popup_name}_popup`);
  if (old_popup) {
    $(`#${popup_name}_popup`).remove();
  }

  // Create new popup element
  const popup_html = await create_popup_html(popup_name, date_diff);
  const new_popup = $("<div>")
    .html(popup_html)
    .attr({
      class: `${popup_name}_popup trial_popup`,
      id: `${popup_name}_popup`,
    });
  $("body").append(new_popup);

  // On close button click
  $(`#close_${popup_name}_popup`).on("click", function (event) {
    if (popup_name === "advance_promo_start") {
      show_loader_and_close_popup(popup_name, 1000, "advance_promo_activated");
      return;
    }

    $(`#${popup_name}_popup`).remove();
    trackCloseButtonClick(`${popup_name}_popup_close`);
  });

  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`${popup_name}_popup_${buttonType}_button`);
    }
  });

  // Track Popup view event
  trackButtonView(`${popup_name}_popup`);
}

async function success_popup(success_popup_name) {
  // Remove old success popup
  const old_popup = $(`#${success_popup_name}_popup`);
  if (old_popup) {
    $(`#${success_popup_name}_popup`).remove();
  }

  // Get data for success popup
  const data = SUCCESS_POPUP_DATA[success_popup_name];
  const description = data.description.replace(
    "Advance Premium",
    "<strong>Advance Premium</strong>"
  );

  // Create new success popup
  const popup_html = `
        <div class="${success_popup_name}_content success_content" style="background: ${data.background_color
    }">
            ${data.close_button
      ? `<span class="CtaCloseBtn popup-close-btn" id="close_${success_popup_name}_popup"><img src=${pro_close_img_src} /></span>`
      : ""
    }
            <div class="popup-header">
                <img class="${data.icon}" src=${window[data.icon]} />
            </div>
            <div class="popup-center">
                <p class="trial_big_title heading">${data.title}</p>
                <p class="trial_title">${description}</p>
                ${data.action_button
      ? `<div id="${data.action_button.id}" class="popup-btn CtaBtn ${data.action_button.class}" buttonType="okay">${data.action_button.text}</div>`
      : ""
    }
            </div>
        </div>
    `;

  const new_popup = $("<div>")
    .html(popup_html)
    .attr({
      class: `${success_popup_name}_popup success_popup`,
      id: `${success_popup_name}_popup`,
    })
    .css("width", "min(400px, 95%)");
  $("body").append(new_popup);

  // On close button click
  $(`#close_${success_popup_name}_popup`).on("click", function (event) {
    $(`#${success_popup_name}_popup`).remove();
    trackCloseButtonClick(`${success_popup_name}_popup_close`);
  });

  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`${success_popup_name}_popup_${buttonType}_button`);
    }
  });

  // Track Popup view event
  trackButtonView(`${success_popup_name}_popup`);
}

// Close Reminder Popup if user clicks outside of it
document.addEventListener("click", (event) => {
  if (document.querySelector(".trial_popup")) {
    let popup = document.querySelectorAll(".trial_popup")[0];
    const isBuyAnnualPopup = popup.classList.contains("buy_annual_popup");
    if (!popup.contains(event.target)) {
      document.body.removeChild(popup);
      if (isBuyAnnualPopup) {
        chrome.storage.local.set({
          lastShownAnnualPopup: formatToIsoDate(new Date()),
        });
      }
    }
  }
});

async function multipleAccountButton() {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  return `<a href="https://pro-sender.kuldeepyadav.tech/multiple-account?numAccounts=25&country=${country_name}" target="_blank" class="popup-btn pricing-purple-btn CtaBtn" buttonType="multiple_account">
        <span style="white-space:nowrap;">Buy multiple users<br/></span>
        <span style="white-space:nowrap; color: #fff; font-size: 14px; line-height: 16px;font-weight:bold;display:flex;"><span style="margin-right:3px;">@</span>
            ${country_name === "india" ? '<span class="rupee">₹</span>' : ""}
            <span class="price_class">${MULT25ACCOUNTPRICE[country_name]
    }</span>/month
        </span>
        ${country_name === "international" && country_currency != "USD"
      ? `<span style="white-space:nowrap; color: #fff; font-size: 12px; line-height: 16px;font-weight:bold;"> 
(~<span class="price_class">${await convertPriceToLocale(
        MULT25ACCOUNTPRICE[country_name].substring(1)
      )}</span>/month)
</span>`
      : ""
    }
    </a>`;
}

// for basic button always take the user to the pricing page
async function basicButton(
  pricing_link = "",
  basicPrice = "",
  basicConvertedPrice = ""
) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let converted_price = basicConvertedPrice;
  if (!basicConvertedPrice || basicConvertedPrice == "") {
    converted_price = await convertPriceToLocale(basicPrice.substring(1));
  }
  return `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-white-btn CtaBtn" style="font-weight:bold;" buttonType="basic">
        Buy Basic<br/>
        <span style="white-space:nowrap; color: #009a88; font-size: 14px; line-height: 16px;font-weight:bold;display:flex;"><span style="margin-right:3px;">@</span> 
            ${country_name === "india" ? '<span class="rupee">₹</span>' : ""}
            <span class="price_class">${basicPrice}</span>/month
        </span>
        ${country_name === "international" && country_currency != "USD"
      ? `<span style="white-space:nowrap; color: #009a88; font-size: 12px; line-height: 16px;font-weight:bold;">
(~<span class="price_class">${converted_price}</span>/month)
</span>`
      : ""
    }
    </a>`;
}

// for advance button
// 1.) if it is a free trial popup then take the user to the pricing page
// 2.) else take the user to the pricing popup i.e.
// for the premium_expired reminder popup and buy_premium_popop if the user is trying to use premium feature
async function advanceButton(
  pricing_link = "",
  advancePrice = "",
  advanceConvertedPrice = "",
  popup_name,
  showPrice = true
) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let converted_price = advanceConvertedPrice;
  if (!advanceConvertedPrice || advanceConvertedPrice == "") {
    converted_price = await convertPriceToLocale(advancePrice.substring(1));
  }

  if (
    popup_name == "free_trial_start" ||
    popup_name == "free_trial_reminder" ||
    popup_name == "free_trial_expired" ||
    last_plan_type == "AdvancePromo" ||
    popup_name == "advance_promo_activated" ||
    popup_name == "advance_promo_reminder" ||
    popup_name == "advance_promo_expired"
  ) {
    pricing_link = "https://pro-sender.kuldeepyadav.tech/pricing";
  }

  return `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-green-btn CtaBtn" style="font-weight:bold;" buttonType="advance">
        Buy Advance
        ${showPrice
      ? `<br/>
            <span style="white-space:nowrap; font-size: 14px; line-height: 16px;font-weight:bold;display:flex;"><span style="margin-right:3px;">@</span>
                ${country_name === "india" ? '<span class="rupee">₹</span>' : ""
      }
                <span class="price_class">${advancePrice}</span>/month
            </span>
            ${country_name === "international" && country_currency != "USD"
        ? `<span style="white-space:nowrap; font-size: 12px; line-height: 16px;font-weight:bold;"> 
    (~<span class="price_class">${converted_price}</span>/month)
    </span>`
        : ""
      }`
      : ""
    }
    </a>`;
}

function getPremiumReminderButton(req_plan_type) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let pricing_link = `https://pro-sender.kuldeepyadav.tech/checkout/?country=${country_name}&phone=${my_number}&plan=`;
  if (last_plan_type == "FreeTrial" && req_plan_type == "Basic") {
    pricing_link = `https://pro-sender.kuldeepyadav.tech/pricing`;
  } else if (req_plan_type == "Advance") {
    pricing_link += "advance";
  } else {
    pricing_link += "basic";
  }
  return `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-white-btn CtaBtn" buttonType="${req_plan_type.toLowerCase()}">
            Buy ${req_plan_type}
        </a>`;
}

async function premium_reminder(feature, req_plan_type) {
  // BYPASSED: Skip showing premium reminder popups
  console.log("Pro system bypassed - skipping premium reminder for feature:", feature);
  return;
}

async function chat_link() {
  var chat_link_div = document.getElementsByClassName("chat_link_popup")[0];
  if (!chat_link_div) {
    let chat_link_title = await translate(
      "Generate WhatsApp chat link for your number"
    );
    let chat_link_desc = await translate(
      "Enter the pre-set message that you would receive when your customer clicks on the link"
    );

    let modal_content_html = `
        <span id="close_chat_link_popup" style="position: absolute;top: 6px;right: 6px;font-size: 20px;width:14px"><img  class="CtaCloseBtn" src="${pro_close_img_src}" style="width: 100%;" alt="x"></span>
        <div class="chat_link_title">${chat_link_title}</div>
        <div class="chat_link_desc">${chat_link_desc} (Optional)</div>
        <textarea style="width: 460px;height: 64px;padding: 8px;" type="text" id="add_chat_message"></textarea>
        <div id="generate_chat_link" class="popup-btn action-green-btn CtaBtn">Generate</div>
        `;

    let modal_content = document.createElement("div");
    modal_content.className = "chat_link_content trial_content";
    modal_content.innerHTML = modal_content_html;

    let popup = document.createElement("div");
    popup.className = "chat_link_popup trial_popup";
    popup.style.width = "min(550px, 95%)";
    popup.appendChild(modal_content);

    var body = document.querySelector("body");
    body.appendChild(popup);
    document
      .getElementById("close_chat_link_popup")
      .addEventListener("click", function (event) {
        document.getElementsByClassName("chat_link_popup")[0].style.display =
          "none";
        trackCloseButtonClick("business_chat_link_popup_close");
      });
    document
      .getElementById("generate_chat_link")
      .addEventListener("click", function (event) {
        if (isAdvanceFeatureAvailable()) {
          var message = document.getElementById("add_chat_message").value;
          var text = "https://wa.me/" + my_number;
          if (message !== "") {
            message = encodeURIComponent(message);
            text += "?text=" + message;
          }
          navigator.clipboard.writeText(text).then(function () {
            alert("Chat link generated and copied: " + text);
          });
          document.getElementsByClassName("chat_link_popup")[0].style.display =
            "none";
          trackButtonClick("generate_business_chat_link_premium");
        } else {
          document.getElementsByClassName("chat_link_popup")[0].style.display =
            "none";
          premium_reminder("business_chat_link", "Advance");
        }
        trackButtonClick("generate_business_chat_link");
      });
  } else chat_link_div.style.display = "block";

  document.querySelector(".chat_link_title").innerText = await translate(
    "Generate WhatsApp chat link for your number"
  );
  document.querySelector(".chat_link_desc").innerText = await translate(
    "Enter the pre-set message that you would receive when your customer clicks on the link (Optional)"
  );
  trackButtonView("business_chat_link_popup");
}

async function review_popup() {
  if (document.querySelector("#review_popup")) {
    body.removeChild(document.querySelector("#review_popup"));
  }

  let review_desc = await translate(
    "Just take a second to share your positive review :)"
  );
  let modal_content_html =
    `
        <div class="rheader" alt="">
            <img class="pro_smile_icon" src=` +
    pro_smile_icon +
    `></img>
            <h2 id="review_popup_title">Enjoying Pro Sender?</h2>
        </div>
        <div class="rcenter">
            <div class="rtop" id="review_popup_desc">${review_desc}</div>
            <div class="rbottom">
                <div id="notNowBtn" class="popup-btn action-white-btn CtaBtn">Not Now</div>
                <div id="reviewBtn" class="popup-btn action-green-btn CtaBtn">
                    <a style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center" href="https://chromewebstore.google.com/detail/pro-sender-bulk-whatsapp/nnaaobbghcgbefbkhinikgdolfkgnhfj/reviews" target="_blank">Review</a>
                </div>
            </div>
        </div>
        ${create_footer_html()}
    `;

  let modal_content = document.createElement("div");
  modal_content.className = "review_popup_content trial_content";
  modal_content.style.background = "#62d9c7";
  modal_content.innerHTML = modal_content_html;

  let popup = document.createElement("div");
  popup.className = "review_popup";
  popup.appendChild(modal_content);

  var body = document.querySelector("body");
  body.appendChild(popup);

  document.querySelector("#notNowBtn").addEventListener("click", () => {
    body.removeChild(popup);
    trackButtonClick("review_popup_not_now_button");
  });
  document.querySelector("#reviewBtn").addEventListener("click", () => {
    body.removeChild(popup);
    localStorage.setItem("rvisited", 1);
    trackButtonClick("review_popup_review_button");
  });
  trackButtonView("review_popup");
}

// Invoice Feature
// formatting the date
function formatDate(inputDate) {
  const dateParts = inputDate.split("/");
  const day = parseInt(dateParts[1]);
  const month = parseInt(dateParts[0]) - 1;
  const year = parseInt(dateParts[2]);
  const formattedDate = new Date(year, month, day);
  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDateString = formattedDate.toLocaleDateString(
    "en-US",
    options
  );
  const splittedDate = formattedDateString.split(" ");
  let returnDateString = `${splittedDate[0]}, ${splittedDate[2]}`;
  return returnDateString;
}

// sorting dates in descending order
function sortDatesDescending(dateArray) {
  return dateArray.sort(function (a, b) {
    const datePartsA = a.date.split("/").map(Number);
    const datePartsB = b.date.split("/").map(Number);

    const dateA = new Date(datePartsA[2], datePartsA[0] - 1, datePartsA[1]);
    const dateB = new Date(datePartsB[2], datePartsB[0] - 1, datePartsB[1]);

    return dateB - dateA;
  });
}

// call this function if you want to show a popup only if there are no other popup on the screen
function callIfNoOtherPopups(fun) {
  const getPopupInterval = setInterval(() => {
    const trialPopup = document.querySelector(".trial_popup");
    const successPopup = document.querySelector(".success_popup");
    const sidebar = document.getElementById("side");
    const buyAnnualPopup = document.querySelector("#buy_annual_popup");
    if (!trialPopup && !successPopup && !buyAnnualPopup && sidebar) {
      clearInterval(getPopupInterval);
      fun();
    }
  }, 500);
}

const howToUseData = [
  {
    image: pro_how_to_use1,
    content:
      "Click on the ‘Extensions’ icons at the top right of the chrome window",
    index: 1,
    hasPrev: false,
    hasNext: true,
  },
  {
    image: pro_how_to_use2,
    content: "Pin the Pro Sender extension icon by clicking on the pin button ",
    index: 2,
    hasPrev: true,
    hasNext: true,
  },
  {
    image: pro_how_to_use3,
    content:
      "Start using the extension by clicking on the Pro Sender extension icon",
    index: 3,
    hasPrev: true,
    hasNext: true,
  },
];

function changeNavigationColor(index) {
  if (index == 0) {
    if (
      document
        .querySelector(".nav_line_1")
        .classList.contains("active_line_class")
    ) {
      document
        .querySelector(".nav_line_1")
        .classList.remove("active_line_class");
    }
    if (
      document
        .querySelector(".nav_num_2")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_2").classList.remove("active_num_class");
    }
    if (
      document
        .querySelector(".nav_line_2")
        .classList.contains("active_line_class")
    ) {
      document
        .querySelector(".nav_line_2")
        .classList.remove("active_line_class");
    }
    if (
      document
        .querySelector(".nav_num_3")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_3").classList.remove("active_num_class");
    }
  }
  if (index == 1) {
    if (
      !document
        .querySelector(".nav_line_1")
        .classList.contains("active_line_class")
    ) {
      document.querySelector(".nav_line_1").classList.add("active_line_class");
    }
    if (
      !document
        .querySelector(".nav_num_2")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_2").classList.add("active_num_class");
    }
    if (
      document
        .querySelector(".nav_line_2")
        .classList.contains("active_line_class")
    ) {
      document
        .querySelector(".nav_line_2")
        .classList.remove("active_line_class");
    }
    if (
      document
        .querySelector(".nav_num_3")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_3").classList.remove("active_num_class");
    }
  }
  if (index == 2) {
    if (
      !document
        .querySelector(".nav_line_2")
        .classList.contains("active_line_class")
    ) {
      document.querySelector(".nav_line_2").classList.add("active_line_class");
    }
    if (
      !document
        .querySelector(".nav_num_3")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_3").classList.add("active_num_class");
    }
  }
}

function howToUsePopup() {
  const parentDiv = document.createElement("div");
  parentDiv.className = "how_to_use_popup";
  let currentIndex = 0;
  const popupHtml = `
        <div class="how_to_use_container">
            <div class="how_to_use_header">
                <div class="how_to_use_title">
                    <img style="width: 50px; margin-right:10px;" src=${pro_bulb_icon} alt="" />
                    <p>How to use</p>
                </div>
                <div class="how_to_use_logo">
                    <img class="how_to_use_logo_img" src="${logo_img}"/>
                    <img class="how_to_use_logo_text" src="${logo_text}"/>
                </div>
            </div>
            <div class="how_to_use_body">
                <div class="how_to_use_text ${currentIndex == 1 ? "second" : ""
    }">
                    <p class="ins_number">${howToUseData[currentIndex].index
    }</p>
                    <p class="ins_text">${howToUseData[currentIndex].content
    }</p>
                </div>
                <div class="how_to_use_image">
                    <img src=${howToUseData[currentIndex].image} alt="" />
                </div>
            </div>
            <div class="how_to_use_buttons">
                <div class="how_to_use_button prev_button CtaBtn">
                    <img style="width: 22px" src=${pro_arrow_left} alt="" />
                    Previous
                </div>
                <div class="how_to_use_button next_button CtaBtn">
                    Next
                    <img style="width: 22px" src=${pro_arrow_right} alt="" />
                </div>
                <div class="how_to_use_button navigation_close_button CtaBtn" style="display: none; padding:13px 30px;">
                    Close
                </div>
            </div>
            <div class="navigation_section">
                <div class="nav_num nav_num_1 active_num_class">1</div>
                <div class="nav_line nav_line_1"></div>
                <div class="nav_num nav_num_2">2</div>
                <div class="nav_line nav_line_2"></div>
                <div class="nav_num nav_num_3">3</div>
            </div>
        </div>
    `;

  parentDiv.innerHTML = popupHtml;
  document.body.appendChild(parentDiv);

  document
    .querySelector(".navigation_close_button")
    .addEventListener("click", () => {
      document.body.removeChild(parentDiv);
      chrome.storage.local.set({ showHowToUsePopup: false });
    });

  document.querySelector(".next_button").addEventListener("click", () => {
    // removing next button
    if (currentIndex == howToUseData.length - 1) {
      return;
    }
    currentIndex++;
    changeNavigationColor(currentIndex);
    if (currentIndex == 1) {
      document.querySelector(".how_to_use_text").style.flexDirection =
        "row-reverse";
    } else {
      document.querySelector(".how_to_use_text").style.flexDirection = "row";
    }
    if (currentIndex % 2 == 0) {
      document.querySelector(".how_to_use_body").style.flexDirection = "row";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(270deg, #FFFFFF 90.23%, #009A88 100%)";
    } else {
      document.querySelector(".how_to_use_body").style.flexDirection =
        "row-reverse";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(90deg, #FFFFFF 90.23%, #009A88 100%)";
    }
    document.querySelector(".ins_number").innerText =
      howToUseData[currentIndex].index;
    document.querySelector(".ins_text").innerText =
      howToUseData[currentIndex].content;
    document.querySelector(".how_to_use_image img").src =
      howToUseData[currentIndex].image;
    document.querySelector(".prev_button").style.display = "flex";
    if (currentIndex == howToUseData.length - 1) {
      document.querySelector(".next_button").style.display = "none";
      document.querySelector(".navigation_close_button").style.display = "flex";
    }
  });

  document.querySelector(".prev_button").addEventListener("click", () => {
    // removing prev button
    if (currentIndex == 0) {
      return;
    }
    currentIndex--;
    changeNavigationColor(currentIndex);
    if (currentIndex == 1) {
      document.querySelector(".how_to_use_text").style.flexDirection =
        "row-reverse";
    } else {
      document.querySelector(".how_to_use_text").style.flexDirection = "row";
    }
    if (currentIndex % 2 == 0) {
      document.querySelector(".how_to_use_body").style.flexDirection = "row";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(270deg, #FFFFFF 90.23%, #009A88 100%)";
    } else {
      document.querySelector(".how_to_use_body").style.flexDirection =
        "row-reverse";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(90deg, #FFFFFF 90.23%, #009A88 100%)";
    }
    document.querySelector(".ins_number").innerText =
      howToUseData[currentIndex].index;
    document.querySelector(".ins_text").innerText =
      howToUseData[currentIndex].content;
    document.querySelector(".how_to_use_image img").src =
      howToUseData[currentIndex].image;
    document.querySelector(".next_button").style.display = "flex";
    document.querySelector(".navigation_close_button").style.display = "none";
    if (currentIndex == 0) {
      document.querySelector(".prev_button").style.display = "none";
    }
  });
}
function showHowToUsePopup() {
  chrome.storage.local.get(["showHowToUsePopup", "no_of_visit"], (res) => {
    let visit_count = res.no_of_visit || 0;
    if (res.showHowToUsePopup == false) {
      return;
    }
    if (visit_count == 0) {
      chrome.storage.local.set({ showHowToUsePopup: true });
    }
    const getSideBarInterval = setInterval(() => {
      const sidebar = document.getElementById("side");
      const trialPopup = document.querySelector(".trial_popup");
      if (sidebar && !trialPopup) {
        howToUsePopup();
        clearInterval(getSideBarInterval);
      }
    }, 500);
  });
}

callIfNoOtherPopups(showHowToUsePopup);

async function buyAnnualPopup() {
  if (document.querySelector("#buy_annual_popup")) {
    body.removeChild(document.querySelector("#buy_annual_popup"));
  }

  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let priceToBeShown =
    plan_type == "Advance"
      ? ADVANCE_SLASHED_PRICE[country_name]
      : BASIC_SLASHED_PRICE[country_name];
  let pref = "";
  if (country_name == "international" || country_name == "kuwait") {
    pref = priceToBeShown[0];
    priceToBeShown = priceToBeShown.substring(1);
  } else if (country_name != "india") {
    pref = priceToBeShown.substring(0, 4);
    priceToBeShown = priceToBeShown.substring(4);
  }
  let exchangedPrice = await convertPriceToLocale(priceToBeShown * 2);
  priceToBeShown = pref + priceToBeShown * 2;

  const pricing_page_link =
    "https://buy.stripe.com/" +
    PRICING_PAGE_LINK[country_name].annually[plan_type.toLowerCase()];

  const modal_content_html = `
        <div class="buy_annual_top_section">
            <span id="buy_annual_close_icon" class="CtaCloseBtn" style="position: absolute;top: 6px;right: 6px;font-size: 20px;width:14px"><img  class="CtaCloseBtn" src=${pro_close_img_src} style="width: 100%;" alt="x"></span>
            <div class="buy_annual_heading">
                <div class="buy_annual_image">
                    <img src=${pro_man_thinking} alt="image" />
                </div>
                <div class="buy_annual_heading_text">
                    <p class="buy_annual_first_line">
                        You could save almost <span class="rupee">${country_name == "india" ? "₹" : ""
    }</span>${priceToBeShown}!
                        ${country_name === "international" &&
      country_currency != "USD"
      ? `<span class="converted_price_class">(~${exchangedPrice})</span>`
      : ""
    }</p>
                    <p class="buy_annual_second_line">Wondering how?</p>
                </div>
            </div>
            <div class="buy_annual_advice">
                <div class="buy_annual_advice_text">
                    <img  style="width:25px; height:25px;" src=${pro_cross_icon_src} alt="" />
                    <p>You’ve been using the monthly plan which is overall <span style="font-weight:bold;">expensive!</span></p>
                </div>
                <div class="buy_annual_advice_text">
                    <img  style="width:25px; height:25px;" src=${pro_check_icon_src} alt="" />
                    <p>Simply buy the <span style="font-weight:bold;">Annual Plan</span> and get <span style="font-weight:bold;">2 months FREE!</span></p>
                </div> 
            </div>
            <div class="buy_annual_recommendation"></div>
        </div>
        <div class="buy_annual_timer_strip">
            <div class="buy_annual_timer_container">
                <div class="buy_annual_timer_img">
                    <img src="${pro_alarm_clock}"/>
                </div>
                <div class="buy_annual_timer_counter">
                    <p>
                        Only <span class="buy_annual_counter" style="font-weight:bold;">4 days, 14 hrs, 57 sec </span>left <br /> to avail the offer
                    </p>
                </div>
            </div>
        </div>
        <div class="buy_annual_button_section">
            <a href=${pricing_page_link} target="_blank" class="buy-annual-popup-btn" buttonType="${plan_type.toLowerCase()}_annual">
                <span class="annual_button_top_span"><img src="${pro_yellow_star}" style="width:15px;"/>Save 40% with</span>
                <span style="font-weight:bold;">${plan_type} Annual</span>
            </a>
        </div>
        ${create_footer_html()}
    `;

  let modal_content = document.createElement("div");
  modal_content.className = "buy_annual_popup_content trial_content";
  modal_content.style.background = "#d3d3d3";
  modal_content.innerHTML = modal_content_html;

  let popup = document.createElement("div");
  popup.className = "buy_annual_popup trial_popup";
  popup.id = "buy_annual_popup";
  popup.appendChild(modal_content);

  let body = document.querySelector("body");
  body.appendChild(popup);

  let close_popup_btn = document.getElementById("buy_annual_close_icon");
  close_popup_btn.addEventListener("click", () => {
    body.removeChild(popup);
    chrome.storage.local.set({
      lastShownAnnualPopup: formatToIsoDate(new Date()),
    });
    trackCloseButtonClick("buy_annual_popup_close");
  });
  $(".buy-annual-popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`buy_annual_popup_${buttonType}_button`);
    }
  });

  changeCounterTime();
  handleAnnualPopupCounter();

  trackButtonView("buy_annual_popup");
}

function changeCounterTime(getCounterInterval) {
  const expiryDate = new Date(expiry_date);
  const currentDate = new Date();
  const diff = expiryDate - currentDate;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  let counterText = "";
  if (days > 0) {
    counterText += `${days} days, `;
  }
  counterText += `${hours} hrs, ${minutes} min, ${seconds} sec `;
  const buyAnnualCouter = document.querySelector(".buy_annual_counter");
  if (!buyAnnualCouter) {
    clearInterval(getCounterInterval);
    return;
  }
  buyAnnualCouter.innerText = counterText;
  if (diff <= 0 && getCounterInterval) {
    clearInterval(getCounterInterval);
  }
}

function handleAnnualPopupCounter() {
  const getCounterInterval = setInterval(() => {
    changeCounterTime(getCounterInterval);
  }, 1000);
}

function getMonthDifference(date1, date2) {
  const [month1, year1] = date1.split(", ");
  const [month2, year2] = date2.split(", ");

  return (
    (parseInt(year2) - parseInt(year1)) * 12 +
    (getMonthIndex(month2) - getMonthIndex(month1))
  );
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function getMonthIndex(month) {
  return monthNames.indexOf(month);
}

function formatToIsoDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month}-${day}`;
}

function dateDiffInDays(date1, date2) {
  if (!date1 || !date2) return NaN;

  const [year1, month1, day1] = date1.split("-").map(Number);
  const [year2, month2, day2] = date2.split("-").map(Number);
  const d1 = new Date(year1, month1 - 1, day1);
  const d2 = new Date(year2, month2 - 1, day2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function updateReminderPopup() {
  if (!SHOW_UPDATE_REMINDER_POPUP) return;

  // Remove existing popup if it exists
  if (document.querySelector("#update_reminder_popup")) {
    document
      .querySelector("body")
      .removeChild(document.querySelector("#update_reminder_popup"));
  }

  let update_desc = await translate(
    "You can either restart your Chrome to update or you can go to manage Chrome extension and update it."
  );

  let modal_content_html = `
           <div class="rheader">
            <h2 id="update_popup_title">New Version Available</h2>
        </div>
        <div class="rcenter">
            <div class="rtop" id="update_popup_desc">${update_desc}</div>
            <div class="rbottom">
                <a href="http://chrome://extensions/?id=klfaghfflijdgoljefdlofkoinndmpia" target="_blank">
                    <div id="okBtn" class="popup-btn action-green-btn CtaBtn">Update</div>
                </a>
            </div>
        </div>
        ${create_footer_html()}
    `;

  let modal_content = document.createElement("div");
  modal_content.className = "update_reminder_popup_content trial_content";
  modal_content.style.background = "#62d9c7";
  modal_content.style.zIndex = "100";
  modal_content.style.width = "60%";
  modal_content.innerHTML = modal_content_html;
  modal_content.appendChild(
    $(
      $.parseHTML(
        '<span id="close_update" style="position: absolute;top: 12px;right: 12px;font-size: 20px;width:14px"><img class="CtaCloseBtn" src="' +
        pro_close_img_src +
        '" style="width: 100%;" alt="x"></span>'
      )
    )[0]
  );

  let popup = document.createElement("div");
  popup.className = "update_reminder_popup";
  popup.id = "update_reminder_popup";
  popup.style.height = "100%";
  popup.style.display = "flex";
  popup.appendChild(modal_content);

  document.querySelector("body").appendChild(popup);

  document.querySelector("#okBtn").addEventListener("click", () => {
    document.querySelector("body").removeChild(popup);
  });
  document
    .getElementById("close_update")
    .addEventListener("click", function (event) {
      document.querySelector("body").removeChild(popup);
    });
  document.querySelector("#closePopupBtn").addEventListener("click", () => {
    document.querySelector("body").removeChild(popup);
  });
}

// ---- config-data OR prodata.js related functions ---

function getDocumentElement(key, selectAll = false) {
  try {
    if (DOCUMENT_ELEMENT_SELECTORS[key]) {
      for (const className of DOCUMENT_ELEMENT_SELECTORS[key]) {
        const element = selectAll
          ? document.querySelectorAll(className)
          : document.querySelector(className);
        if (element) {
          return element;
        }
      }
    } else {
      console.log("Selector not exists:", key);
    }
  } catch (err) {
    console.log("Error while finding document element", err);
  }
  return null;
}

async function fetchConfigData() {
  // BYPASSED: Skip AWS API call and use default config
  console.log("Config data fetch bypassed - using default config");
  
  try {
    // Use default config data from prodata.js with all required fields
    const defaultConfigMap = {
      TRIAL_FEATURES: TRIAL_FEATURES || [],
      PREMIUM_FEATURES: PREMIUM_FEATURES || [],
      HELP_MESSAGES: HELP_MESSAGES || {},
      GA_CONFIG: GA_CONFIG || {},
      PRICING_DATA: PRICING_DATA || {},
      PREMIUM_REMINDER: PREMIUM_REMINDER || {},
      DOCUMENT_ELEMENT_SELECTORS: DOCUMENT_ELEMENT_SELECTORS || {},
      FAQS: FAQS || {},
      RUNTIME_CONFIG: {
        reloadInject: false,
        useOldInjectMethod: true,
        useOldMessageSending: true
      }
    };
    
    loadConfigData(defaultConfigMap);
    chrome.storage.local.set({ CONFIG_DATA: defaultConfigMap });
  } catch (err) {
    console.log("Error loading default config:", err);
  }
  
  /* ORIGINAL CODE BYPASSED
  try {
    const url = `${AWS_API.GET_CONFIG_DATA}?operation=get-all-config-data`;
    const response = await fetch(url);
    const jsonData = await response.json();
    const allConfigData = jsonData.data;

    if (allConfigData && Array.isArray(allConfigData)) {
      const configMap = createConfigMap(allConfigData);
      loadConfigData(configMap);

      chrome.storage.local.get(["CONFIG_DATA"], (res) => {
        // console.log("OLD CONFIG DATA:", res.CONFIG_DATA);
        chrome.storage.local.set({ CONFIG_DATA: configMap });
      });
    } else {
      console.log("Config data not found. Api response:", jsonData);
    }
  } catch (err) {
    console.log("Error while fetching config data:", err);
  }
  */
}

function createConfigMap(configArray) {
  const configMap = {};
  configArray.forEach((item) => {
    if (item.name && item.data !== null) {
      configMap[item.name] = item.data;
    }
  });
  return configMap;
}

// Load AWS Config Data from API to Local Data (for content js)
function loadConfigData(configMap) {
  // Constant Arrays
  if (configMap.TRIAL_FEATURES) TRIAL_FEATURES = [...configMap.TRIAL_FEATURES];
  if (configMap.PREMIUM_FEATURES)
    PREMIUM_FEATURES = [...configMap.PREMIUM_FEATURES];
  // if (configMap.DID_YOU_KNOW_TIPS)
  //     DID_YOU_KNOW_TIPS = [...configMap.DID_YOU_KNOW_TIPS];
  // if (configMap.ALL_LANGUAGE_CODES)
  //     ALL_LANGUAGE_CODES = [...configMap.ALL_LANGUAGE_CODES];

  // Constant Objects
  if (configMap.HELP_MESSAGES) HELP_MESSAGES = { ...HELP_MESSAGES };
  if (configMap.GA_CONFIG) GA_CONFIG = { ...configMap.GA_CONFIG };
  // if (configMap.POPUP_DATA)
  //     POPUP_DATA = { ...configMap.POPUP_DATA };
  if (configMap.PRICING_DATA) PRICING_DATA = { ...configMap.PRICING_DATA };
  if (configMap.PREMIUM_REMINDER)
    PREMIUM_REMINDER = { ...configMap.PREMIUM_REMINDER };
  // if (configMap.SUCCESS_POPUP_DATA)
  //     SUCCESS_POPUP_DATA = { ...configMap.SUCCESS_POPUP_DATA };
  if (configMap.DOCUMENT_ELEMENT_SELECTORS)
    DOCUMENT_ELEMENT_SELECTORS = { ...configMap.DOCUMENT_ELEMENT_SELECTORS };
  if (configMap.FAQS) FAQS = { ...configMap.FAQS };
  if (configMap.RUNTIME_CONFIG) {
    RUNTIME_CONFIG = { ...configMap.RUNTIME_CONFIG };
    if (RUNTIME_CONFIG.reloadInject) {
      window.dispatchEvent(
        new CustomEvent("PROS::init", {
          detail: { useOldMethod: RUNTIME_CONFIG.useOldInjectMethod },
        })
      );
    }
  }

  //Constant Variable
  // if("SHOW_UPDATE_REMINDER_POPUP" in configMap)
  //     SHOW_UPDATE_REMINDER_POPUP=configMap.SHOW_UPDATE_REMINDER_POPUP;

  // NOT WORKING - Contains Complex Key-Value Pair
  // if (configMap.REPLACEMENT_HTML_TAGS) `
  //     REPLACEMENT_HTML_TAGS = { ...configMap.REPLACEMENT_HTML_TAGS };
}

var ban_text_detected = false;
function detectBanText() {
  if (ban_text_detected) return;

  let banMessages = [
    "verify your phone number",
    "you will need to verify your phone number",
    "You have been logged out. To log back in, you will need to verify your phone number.", // English
    "आप लॉग आउट हो गए हैं। फिर से लॉग इन करने के लिए, आपको अपना फ़ोन नंबर सत्यापित करना होगा।", // Hindi
    "Você foi desconectado. Para fazer login novamente, será necessário verificar seu número de telefone.", // Brazilian Portuguese
    "Has cerrado sesión. Para volver a iniciar sesión, deberás verificar tu número de teléfono.", // Spanish
  ];

  for (const message of banMessages) {
    if (
      document.body.innerText.includes(message) ||
      document.body.innerText
        .toLowerCase()
        .includes(message.toLocaleLowerCase())
    ) {
      trackSystemEvent("banned_text", banMessages);
      ban_text_detected = true;
    }
  }
}

async function messageCountOverPopup() {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let body = document.querySelector("body");
  let popup = document.createElement("div");
  let modal_content = document.createElement("div");

  let popup_button = getPremiumReminderButton("Premium");

  if (document.querySelector(".premium_reminder_popup")) {
    body.removeChild(document.querySelector(".premium_reminder_popup"));
  }

  let remaining_count = 0;
  let total_count = 0;
  await new Promise((resolve) => {
    chrome.storage.local.get(["freeTrialExpiredUserData"], function (res) {
      const freeTrialExpiredUserData = res.freeTrialExpiredUserData;
      if (
        freeTrialExpiredUserData &&
        freeTrialExpiredUserData.sent_count != undefined &&
        freeTrialExpiredUserData.total_count != undefined
      ) {
        remaining_count =
          freeTrialExpiredUserData.total_count -
          freeTrialExpiredUserData.sent_count;
        total_count = freeTrialExpiredUserData.total_count;
      }
      resolve();
    });
  });

  popup.className = "premium_reminder_popup trial_popup";

  modal_content.className = "premium_reminder_content trial_content";
  modal_content.style.background = "#d5cd2f";
  modal_content.innerHTML = `
        <span id="close_premium_reminder_popup">
            <img class="CtaCloseBtn" src="${pro_close_img_src}" alt="x">
        </span>
        <div class="premium_reminder_popup_title">
            <span class="oops_icon"></span>Oops!
        </div>
        <div class="reminder_title">
            ${`You have ${remaining_count} of daily ${total_count} messages remaining`}
        </div>
        <div class="reminder_description">
            ${await translate(
    `Please buy <<${"Premium"}>> to send unlimited messages!`
  )}
        </div>
        <div style="display:flex;justify-content:center;gap:20px;width:100%;margin-bottom:20px;">
            ${popup_button}
        </div> 
        <div style="display:flex;justify-content:center;align-items:center;gap:5px;">
            <img src=${large_logo_img} style="width:25px;" />
            <span style="font-weight:bold;">Pro Sender</span>
        </div>
        `;
  popup.appendChild(modal_content);
  body.appendChild(popup);

  let closePopupBtn = document.getElementById("close_premium_reminder_popup");
  closePopupBtn.addEventListener("click", function () {
    body.removeChild(popup);
    trackCloseButtonClick("premium_feature_buy_popup_close");
  });
  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`premium_feature_buy_popup_${buttonType}_button`);
    }
  });

  trackButtonView("premium_feature_buy_popup");
}

function showTooltip({
  elementParentClass,
  text,
  positionTop,
  positionBottom,
  positionLeft,
  positionRight,
}) {
  const parentElement = document.querySelector(elementParentClass);
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip_main_container";
  if (positionTop) tooltip.style.top = positionTop;
  if (positionBottom) tooltip.style.bottom = positionBottom;
  if (positionLeft) tooltip.style.left = positionLeft;
  if (positionRight) tooltip.style.right = positionRight;
  tooltip.innerHTML = `
        <div>
            ${text}
        </div>
        <div class="tooltip_arrow"></div>
    `;
  parentElement.appendChild(tooltip);
}

function removeTooltip() {
  const tooltip = document.querySelector(".tooltip_main_container");
  if (tooltip) {
    tooltip.remove();
  }
}

function handleShowTooltip(element) {
  const parentElement = document.querySelector(element.query);
  if (parentElement) {
    parentElement.addEventListener("mouseover", () => {
      showTooltip({
        elementParentClass: element.query,
        text: element.text,
        positionTop: element.top,
        positionLeft: element.left,
        positionRight: element.right,
        positionBottom: element.bottom,
      });
    });
    parentElement.addEventListener("mouseout", () => {
      removeTooltip();
    });
  }
}

(function () {
    init();
})();

function init() {
    try {
        // Fetch whatsapp number
        chrome.storage.local.get(["my_number", "customer_email"], function (result) {
            if (result.my_number) {
                setLocalStorageItem("whatsapp_number", result.my_number);
            }
            if (result.customer_email) {
                setLocalStorageItem("user_email", result.customer_email);
            }
        });

        // Fetch browser's loggedin email
        chrome.runtime.sendMessage({}, function (response) {
            if (response.email) {
                setLocalStorageItem("browser_email", response.email);
            }
        });
    } catch (e) {
        console.log(e);
    }
}

// Set value to localStorage
function setLocalStorageItem(key, value, prefix = 'PROS::', stringify = false) {
    key = prefix ? (prefix + key) : key;
    value = stringify ? JSON.stringify(value) : value;

    let prevValue = window.localStorage.getItem(key);
    // console.log("key = [" + key + "] value = [" + prevValue + " -> " + value + "]");
    if (!prevValue || prevValue != value) {
        window.localStorage.setItem(key, value);
    }
}
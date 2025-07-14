/*
Disclaimer: This extension is developed by Enrico Murru. 
Visit https://organizer.solutions for more information. 
This is not an official LinkedIn application.
*/



// Function to update the extension icon badge
function updateBadge(text, errorMsg) {
  chrome.action.setBadgeText({ text: text });
  const title =  'LinkedIn© Notifications Badge\n'
  + ((errorMsg)?`${errorMsg}\n\nClick to jump to Linkedin.com'`
    : `You have ${text?text:'no'} unread notifications\n\nClick to jump to Linkedin.com`);
  chrome.action.setTitle({ title: title });
}

// Function that makes the request to get the number of unread notifications
function fetchNotificationsCount() {
  // Retrieve the li_at cookie (session token)
  chrome.cookies.get({ url: "https://www.linkedin.com", name: "li_at" }, function(liCookie) {
    if (!liCookie) {
      console.error("li_at cookie not found");
      updateBadge("!", 'Open Linkedin.com to see notifications'); // Error badge
      return;
    }
    
    // Retrieve the JSESSIONID cookie (necessary for the CSRF token)
    chrome.cookies.get({ url: "https://www.linkedin.com", name: "JSESSIONID" }, function(jsessionCookie) {
      if (!jsessionCookie) {
         console.error("JSESSIONID cookie not found");
         updateBadge("!", 'Open Linkedin.com to see notifications');
         return;
      }
      
      // The value of JSESSIONID may contain quotes; we remove them to get the CSRF token
      let csrfToken = jsessionCookie.value.replace(/"/g, '');
      
      // Make the request to the LinkedIn endpoint for unread notifications
      // Note: the endpoint used here is "unreadCount". It may vary in the future.
      fetch("https://www.linkedin.com/voyager/api/voyagerNotificationsDashBadgingItemCounts", {
         method: "GET",
         credentials: "include",
         headers: {
             "Accept": "application/json",
             "csrf-token": csrfToken,
             "x-restli-protocol-version": "2.0.0"
         }
      })
      .then(response => {
         if (!response.ok) {
             throw new Error("Network response was not ok");
         }
         return response.json();
      })
      .then(data => {
        //console.log(data)
         // It is assumed that the response has a structure like: { unreadCount: number }
         //let count = data.unreadCount;
         // If count is greater than zero, we show it; otherwise, we clear the badge
         let count = 0;
         console.log(data.elements);
         let myNetworkFound = false;
         for(let i in data.elements){
          if(data.elements[i].badgingItem === "NOTIFICATIONS"
            || data.elements[i].badgingItem === "MESSAGING"
            || (data.elements[i].badgingItem === "MY_NETWORK" && !myNetworkFound)
          ){
            count += data.elements[i].count;
            if(data.elements[i].badgingItem === "MY_NETWORK"){
              myNetworkFound = true;
            }
          }
         }
         updateBadge(count > 0 ? String(count) : "");
      })
      .catch(err => {
         console.error("Error while fetching notifications:", err);
         updateBadge("?");
      });
    });
  });
}

  // Create an alarm to execute the function every minute
  chrome.alarms.create("fetchNotifications", { periodInMinutes: 1 });
  fetchNotificationsCount();

  // Add a listener for when a new tab is created
  chrome.tabs.onCreated.addListener((tab) => {
    // Check if the new tab's URL matches linkedin.com
    //console.log("New tab created:", tab);
    if (tab.url && (tab.url.includes("linkedin.com") || tab.pendingUrl.includes("linkedin.com"))) {
      setTimeout(() => {
        fetchNotificationsCount(); // Call the function to fetch notifications
      }, 5000);
    }
  });

    // Add a listener for when a new tab is created
    chrome.tabs.onUpdated.addListener((tab) => {
      // Check if the new tab's URL matches linkedin.com
      //console.log("New tab created:", tab);
      if (tab.url && (tab.url.includes("linkedin.com") || tab.pendingUrl.includes("linkedin.com"))) {
        setTimeout(() => {
          fetchNotificationsCount(); // Call the function to fetch notifications
        }, 5000);
      }
    });

  // Every time the alarm triggers, update the badge with the new count
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "fetchNotifications") {
      fetchNotificationsCount();
    }
  });

  chrome.action.onClicked.addListener(() => {
    fetchNotificationsCount();
    // Query for tabs with a URL that matches linkedin.com in the current window
    chrome.tabs.query({ url: "*://www.linkedin.com/*", currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Activate the first matching tab and focus its window
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // If no such tab is found, open a new tab
        chrome.tabs.create({ url: "https://www.linkedin.com/feed" });
      }

      setTimeout(() => {
        fetchNotificationsCount(); // Call the function to fetch notifications
      }, 5000);
    });
  });


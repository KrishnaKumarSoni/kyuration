chrome.runtime.onInstalled.addListener(() => {
    console.log("KnowledgePin extension installed");
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in background:", request);
    if (request.action === "getPageData") {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getPageData"}, (response) => {
          console.log("Response from content script:", response);
          sendResponse(response);
        });
      });
      return true;  // Indicates we wish to send a response asynchronously
    } else if (request.action === "saveData") {
      console.log("Saved Data:", JSON.stringify(request.data, null, 2));
      sendResponse({status: "success"});
    }
  });
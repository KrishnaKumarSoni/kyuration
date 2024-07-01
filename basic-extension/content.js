console.log("KnowledgePin content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "getPageData") {
    const data = {
      title: document.title,
      url: window.location.href,
      description: getMetaDescription()
    };
    console.log("Sending data from content script:", data);
    sendResponse(data);
  }
});

function getMetaDescription() {
  const metaDescription = document.querySelector('meta[name="description"]');
  return metaDescription ? metaDescription.getAttribute('content') : '';
}
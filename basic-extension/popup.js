document.addEventListener('DOMContentLoaded', () => {
    console.log("Popup DOM loaded");
    
    // Request page data when popup opens
    chrome.runtime.sendMessage({action: "getPageData"}, (response) => {
      console.log("Response received in popup:", response);
      if (response) {
        document.getElementById('dataContainer').innerHTML = `
          <p><strong>Title:</strong> ${response.title || 'N/A'}</p>
          <p><strong>URL:</strong> ${response.url || 'N/A'}</p>
          <p><strong>Description:</strong> ${response.description || 'No description available'}</p>
        `;
      } else {
        document.getElementById('dataContainer').innerHTML = '<p>Error: Could not fetch page data</p>';
      }
    });
  
    // Set up save button
    document.getElementById('saveButton').addEventListener('click', () => {
      const data = {
        title: document.querySelector('#dataContainer p:nth-child(1)').textContent,
        url: document.querySelector('#dataContainer p:nth-child(2)').textContent,
        description: document.querySelector('#dataContainer p:nth-child(3)').textContent,
        timestamp: new Date().toISOString()
      };
      chrome.runtime.sendMessage({action: "saveData", data: data}, (response) => {
        if (response && response.status === "success") {
          document.getElementById('message').textContent = "Data saved successfully!";
        } else {
          document.getElementById('message').textContent = "Error saving data";
        }
        setTimeout(() => {
          document.getElementById('message').textContent = "";
        }, 3000);
      });
    });
  });
let currentTags = [];
let suggestedTags = [];

document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('closeBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const tagsInput = document.getElementById('tagsInput');
    const tagsContainer = document.getElementById('tagsContainer');
    const noteInput = document.getElementById('noteInput');
    const saveBtn = document.getElementById('saveBtn');
    const pageTitle = document.getElementById('pageTitle');
    const pageImage = document.getElementById('pageImage');
    const websiteTitle = document.getElementById('websiteTitle');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const contentElement = document.getElementById('content');

    closeBtn.addEventListener('click', () => window.close());
    removeImageBtn.addEventListener('click', removeImage);
    tagsInput.addEventListener('keydown', handleTagInput);
    saveBtn.addEventListener('click', savePage);

    showLoading();

    // Fetch page data and populate fields
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        pageTitle.value = currentTab.title;
        websiteTitle.textContent = new URL(currentTab.url).hostname;

        chrome.tabs.sendMessage(currentTab.id, {action: "getPageInfo"}, function(response) {
            if (response && response.image) {
                pageImage.src = response.image;
            } else {
                pageImage.style.display = 'none';
                removeImageBtn.style.display = 'none';
            }

            // Generate summary using OpenAI
            fetch('http://localhost:5000/generate_summary', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    url: currentTab.url,
                    title: currentTab.title,
                    content: response ? response.content : ''
                })
            })
            .then(response => response.json())
            .then(summary => {
                noteInput.value = summary;
            })
            .catch(error => console.error('Error generating summary:', error));

            // Fetch suggested tags
            fetch('http://localhost:5000/suggest_tags', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    url: currentTab.url, 
                    title: currentTab.title, 
                    content: response ? response.content : ''
                })
            })
            .then(response => response.json())
            .then(tags => {
                suggestedTags = tags;
                renderTags();
            })
            .catch(error => console.error('Error fetching suggested tags:', error))
            .finally(() => {
                hideLoading();
            });
        });
    });

    // Fetch all lists
    fetch('http://localhost:5000/get_lists')
        .then(response => response.json())
        .then(lists => {
            const listSelect = document.getElementById('listSelect');
            lists.forEach(list => {
                const option = document.createElement('option');
                option.value = list.id;
                option.textContent = list.name;
                listSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching lists:', error));
});

function handleTagInput(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const tag = event.target.value.trim();
        if (tag && !currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTags();
            event.target.value = '';
        }
    }
}

function renderTags() {
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';
    const allTags = [...new Set([...currentTags, ...suggestedTags])];
    allTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag' + (currentTags.includes(tag) ? ' selected' : '');
        tagElement.textContent = tag;
        tagElement.addEventListener('click', () => toggleTag(tag));
        tagsContainer.appendChild(tagElement);
    });
}

function toggleTag(tag) {
    const index = currentTags.indexOf(tag);
    if (index > -1) {
        currentTags.splice(index, 1);
    } else {
        currentTags.push(tag);
    }
    renderTags();
}

function removeImage() {
    const pageImage = document.getElementById('pageImage');
    pageImage.style.display = 'none';
    document.getElementById('removeImageBtn').style.display = 'none';
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('content').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('content').style.display = 'block';
}

function savePage() {
    showLoading();
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const data = {
            url: currentTab.url,
            title: document.getElementById('pageTitle').value,
            list_id: document.getElementById('listSelect').value,
            tags: currentTags,
            note: document.getElementById('noteInput').value,
            image_url: document.getElementById('pageImage').src
        };

        fetch('http://localhost:5000/save_item', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            hideLoading();
            showSavedMessage();
        })
        .catch(error => {
            hideLoading();
            console.error('Error saving item:', error);
            showErrorMessage('Error saving item. Please try again.');
        });
    });
}

function showSavedMessage() {
    const savedMessage = document.createElement('div');
    savedMessage.textContent = 'Saved!';
    savedMessage.className = 'message success';
    document.body.appendChild(savedMessage);
    setTimeout(() => {
        savedMessage.remove();
        window.close();
    }, 1500);
}

function showErrorMessage(message) {
    const errorMessage = document.createElement('div');
    errorMessage.textContent = message;
    errorMessage.className = 'message error';
    document.body.appendChild(errorMessage);
    setTimeout(() => {
        errorMessage.remove();
    }, 3000);
}
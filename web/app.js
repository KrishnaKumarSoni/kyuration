const API_BASE_URL = 'http://localhost:5000';

let currentList = 'all';
let currentTag = '';
let currentPlatform = '';
let msnry;

document.addEventListener('DOMContentLoaded', () => {
    fetchLists();
    fetchItems();
    setupFilterListeners();
});

async function fetchLists() {
    try {
        const response = await axios.get(`${API_BASE_URL}/get_lists`);
        const lists = response.data;
        const listNav = document.getElementById('listNav');
        listNav.innerHTML = `<li><a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-list="all">All Items</a></li>`;
        lists.forEach(list => {
            listNav.innerHTML += `<li><a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-list="${list.id}">${list.name}</a></li>`;
        });
        setupListNavListeners();
    } catch (error) {
        console.error('Error fetching lists:', error);
    }
}

async function fetchItems() {
    try {
        const response = await axios.get(`${API_BASE_URL}/get_items`, {
            params: { list: currentList, tag: currentTag, platform: currentPlatform }
        });
        const items = response.data;
        renderItems(items);
        updateFilters(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.innerHTML = '<p class="text-red-500">Unable to fetch items. Please check your connection and try again.</p>';
    }
}

function renderItems(items) {
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = '';
    items.forEach(item => {
        const itemCard = createItemCard(item);
        itemsContainer.appendChild(itemCard);
    });
    initMasonry();
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
        <img src="${item.image_url}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        <div class="item-content">
            <h3 class="item-title" contenteditable="true" data-item-id="${item.id}">${item.title}</h3>
            <p class="item-note" contenteditable="true" data-item-id="${item.id}">${item.note}</p>
            <div class="item-tags" data-item-id="${item.id}">
                ${item.tags.map(tag => `<span class="tag" contenteditable="true">${tag}</span>`).join('')}
            </div>
            <a href="${item.url}" class="item-link" target="_blank" rel="noopener noreferrer">Visit</a>
            <button class="delete-btn" data-item-id="${item.id}">Delete</button>
        </div>
    `;
    setupEditableListeners(card, item.id);
    setupDeleteListener(card, item.id);
    return card;
}

function setupDeleteListener(card, itemId) {
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteItem(itemId));
}

async function deleteItem(itemId) {
    try {
        await axios.post(`${API_BASE_URL}/delete_item`, { id: itemId });
        fetchItems(); // Refresh the item list
    } catch (error) {
        console.error(`Error deleting item ${itemId}:`, error);
    }
}

function setupEditableListeners(card, itemId) {
    const title = card.querySelector('.item-title');
    const note = card.querySelector('.item-note');
    const tags = card.querySelector('.item-tags');

    title.addEventListener('blur', () => updateItem(itemId, 'title', title.textContent));
    note.addEventListener('blur', () => updateItem(itemId, 'note', note.textContent));
    tags.addEventListener('blur', (e) => {
        if (e.target.classList.contains('tag')) {
            const newTags = Array.from(tags.querySelectorAll('.tag')).map(tag => tag.textContent);
            updateItem(itemId, 'tags', newTags);
        }
    });
}

async function updateItem(itemId, field, value) {
    try {
        await axios.post(`${API_BASE_URL}/update_item`, {
            id: itemId,
            [field]: value
        });
        console.log(`Updated ${field} for item ${itemId}`);
    } catch (error) {
        console.error(`Error updating ${field} for item ${itemId}:`, error);
    }
}

function updateFilters(items) {
    const tagFilter = document.getElementById('tagFilter');
    const platformFilter = document.getElementById('platformFilter');
    
    const tags = new Set();
    const platforms = new Set();
    
    items.forEach(item => {
        item.tags.forEach(tag => tags.add(tag));
        platforms.add(new URL(item.url).hostname);
    });
    
    updateFilterOptions(tagFilter, tags);
    updateFilterOptions(platformFilter, platforms);
}

function updateFilterOptions(selectElement, options) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">All</option>';
    options.forEach(option => {
        selectElement.innerHTML += `<option value="${option}" ${option === currentValue ? 'selected' : ''}>${option}</option>`;
    });
}

function setupFilterListeners() {
    document.getElementById('tagFilter').addEventListener('change', (e) => {
        currentTag = e.target.value;
        fetchItems();
    });
    
    document.getElementById('platformFilter').addEventListener('change', (e) => {
        currentPlatform = e.target.value;
        fetchItems();
    });
}

function setupListNavListeners() {
    document.querySelectorAll('#listNav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentList = e.target.dataset.list;
            document.getElementById('currentList').textContent = e.target.textContent;
            fetchItems();
        });
    });
}

function initMasonry() {
    const grid = document.querySelector('.masonry');
    msnry = new Masonry(grid, {
        itemSelector: '.item-card',
        columnWidth: '.item-card',
        percentPosition: true,
        gutter: 16
    });
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getPageInfo") {
        const metaDescription = document.querySelector('meta[name="description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const firstImage = document.querySelector('img');
        
        // Extract main content
        let content = '';
        const articleContent = document.querySelector('article');
        if (articleContent) {
            content = articleContent.innerText;
        } else {
            const paragraphs = document.querySelectorAll('p');
            content = Array.from(paragraphs).map(p => p.innerText).join('\n\n');
        }

        // Limit content to around 1000 words
        const words = content.split(/\s+/);
        if (words.length > 1000) {
            content = words.slice(0, 1000).join(' ') + '...';
        }
        
        const response = {
            description: metaDescription ? metaDescription.getAttribute('content') : '',
            image: ogImage ? ogImage.getAttribute('content') : (firstImage ? firstImage.src : ''),
            content: content
        };
        
        sendResponse(response);
    }
    return true;  // Indicates that the response will be sent asynchronously
});
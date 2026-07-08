<h1 align="center">Kyuration</h1>
<p align="center"><b>Save any page in one click, and let AI file it, tag it, and summarize it for you.</b></p>
<p align="center">
  <code>◐ Working</code> &nbsp;·&nbsp; Chrome Extension · Flask · OpenAI · Pinecone
</p>

> Bookmarks pile up and rot because saving is easy but finding is not. This gives every saved page tags, a summary, and a home, so your library stays searchable by meaning instead of by folder.

Kyuration (internally "Knowledge Pin") is the core save-and-curate engine behind Kyurations. Hit the toolbar button on any page, and it grabs the title and cover image, suggests up to four tags, drops the item into the most relevant list, and writes you the key takeaways. Everything lands in a visual dashboard you can filter by list, tag, or platform.

## Why it exists
Saving a link is a two second action, but coming back to it weeks later is where every bookmarking tool falls apart. Folders go stale, search is keyword-only, and you end up with a graveyard of URLs you never reopen. Kyuration treats the save as the start of curation, not the end: it enriches each item with AI so the collection stays useful long after you forget why you saved it.

## How it works
```
Click save  ->  Page details pulled in  ->  AI tags + summary  ->  Filed to the right list  ->  Browse the dashboard
```
| Step | What happens |
|------|--------------|
| Click save | The extension popup reads the current tab (title, URL, cover image) |
| Enrich | OpenAI suggests up to 4 tags, reusing your existing tags where they fit |
| Summarize | The page content is condensed into key takeaways and insights |
| File | A vector match suggests the most relevant existing list to drop it into |
| Store | Item plus embedding is saved to Pinecone for meaning-based retrieval |
| Browse | The web dashboard shows saved items as cards, filterable by list, tag, or platform |

## What you get
| Feature | What it does |
|---------|--------------|
| One-click capture | Save any page from the browser toolbar, cover image and title auto-filled |
| Smart tagging | AI proposes relevant tags and prefers ones you already use |
| Auto-summaries | Key takeaways generated per page so you can triage without reopening |
| Relevant-list suggestions | Semantic matching drops each save into the list it belongs in |
| Custom lists and notes | Group saves into your own lists and add a personal "I learned that..." note |
| Visual dashboard | A masonry board of saved items with list, tag, and platform filters |

## Under the hood
Chrome extension (Manifest V3) for capture, a Flask backend for the AI work, OpenAI for tags, summaries, and embeddings, and Pinecone as the vector store for lists and items. The dashboard is a lightweight HTML and JavaScript web app.

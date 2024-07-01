from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
from pinecone import Pinecone
import logging
from dotenv import load_dotenv
import os
import uuid

load_dotenv()

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)


pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("knowledge-pin")
lists_index = pc.Index("curation-tool-lists")

# Initialize OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route("/health_check", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route("/get_lists", methods=["GET"])
def get_lists():
    query_response = index.query(
        vector=[0.0] * 1536,  # Dummy vector for metadata-only query
        top_k=100,
        include_metadata=True,
        filter={"type": "list"}
    )
    
    lists = [
        {"id": match.id, "name": match.metadata["name"]}
        for match in query_response.matches
    ]
    return jsonify(lists)

@app.route("/create_list", methods=["POST"])
def create_list():
    data = request.json
    list_name = data.get("name")
    
    if not list_name:
        return jsonify({"error": "List name is required"}), 400
    
    list_id = str(uuid.uuid4())
    
    # Create a non-zero dummy vector for the list
    dummy_vector = [0.1] * 1536
    
    index.upsert([(list_id, dummy_vector, {"name": list_name, "type": "list"})])
    
    return jsonify({"id": list_id, "name": list_name})

@app.route("/suggest_tags", methods=["POST"])
def suggest_tags():
    data = request.json
    url = data.get("url")
    title = data.get("title")
    content = data.get("content")
    existing_tags = data.get("existing_tags", [])
    
    prompt = f"""
    URL: {url}
    Title: {title}
    Content: {content}
    Existing tags: {', '.join(existing_tags)}

    Suggest up to 4 relevant tags for this content. Prioritize using existing tags if they fit well, but also suggest new tags if appropriate. Separate tags with commas.
    """
    
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that suggests relevant tags for web content."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=50,
        n=1,
        temperature=0.5,
    )
    
    suggested_tags = response.choices[0].message.content.strip().split(', ')
    return jsonify(suggested_tags[:4])  # Ensure we return at most 4 tags

@app.route("/save_item", methods=["POST"])
def save_item():
    data = request.json
    url = data.get("url")
    title = data.get("title")
    list_id = data.get("list_id")
    tags = data.get("tags", [])
    note = data.get("note", "")
    image_url = data.get("image_url", "")
    
    if not url or not title or not list_id:
        return jsonify({"error": "URL, title, and list_id are required"}), 400
    
    # Generate vector embedding for the note
    response = openai.embeddings.create(input=note, model="text-embedding-ada-002")
    vector = response.data[0].embedding
    
    # Ensure all vector values are floats
    vector = [float(v) for v in vector]
    
    # Save to Pinecone
    item_id = str(uuid.uuid4())
    metadata = {
        "url": url,
        "title": title,
        "list_id": list_id,
        "tags": tags,
        "note": note,
        "image_url": image_url,
        "date_added": datetime.now().isoformat(),
        "type": "item"
    }
    index.upsert(vectors=[(item_id, vector, metadata)])
    
    return jsonify({"message": "Item saved successfully", "item_id": item_id})

@app.route("/delete_item", methods=["POST"])
def delete_item():
    try:
        data = request.json
        item_id = data.get('id')
        
        # Delete the item from Pinecone
        index.delete(ids=[item_id])
        
        return jsonify({"message": "Item deleted successfully"}), 200
    except Exception as e:
        logging.error(f"Error deleting item: {str(e)}")
        return jsonify({"error": "Failed to delete item"}), 500

@app.route("/get_relevant_list", methods=["POST"])
def get_relevant_list():
    data = request.json
    url = data.get("url")
    title = data.get("title")
    
    # Generate vector embedding for the new item
    response = openai.embeddings.create(input=f"{title} {url}", model="text-embedding-ada-002")
    vector = response.data[0].embedding
    
    # Query Pinecone for the most relevant list
    query_response = index.query(
        vector=vector,
        top_k=1,
        include_metadata=True,
        filter={"type": "list"}
    )
    
    if query_response.matches:
        relevant_list = {"id": query_response.matches[0].id, "name": query_response.matches[0].metadata["name"]}
    else:
        relevant_list = None
    
    return jsonify(relevant_list)

@app.route("/generate_summary", methods=["POST"])
def generate_summary():
    data = request.json
    url = data.get("url")
    title = data.get("title")
    content = data.get("content")

    # Truncate content if it's too long
    max_tokens = 1000
    content = ' '.join(content.split()[:max_tokens])

    prompt = f"""Write key take aways and most important insights from the content provided:

Title: {title}
URL: {url}
Content: {content}

Summary:"""

    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that summarises content into key actionable points."},
            {"role": "user", "content": prompt}
        ],
        n=1,
        temperature=0.5,
    )
    
    summary = response.choices[0].message.content.strip()
    return jsonify(summary)

@app.route("/update_item", methods=["POST"])
def update_item():
    try:
        data = request.json
        item_id = data.get('id')
        updates = {k: v for k, v in data.items() if k != 'id'}
        
        # Fetch the existing item
        query_response = index.fetch([item_id])
        if not query_response.vectors:
            return jsonify({"error": "Item not found"}), 404
        
        existing_item = query_response.vectors[item_id]
        updated_metadata = {**existing_item.metadata, **updates}
        
        # Update the item in Pinecone
        index.upsert([(item_id, existing_item.values, updated_metadata)])
        
        return jsonify({"message": "Item updated successfully"}), 200
    except Exception as e:
        logging.error(f"Error updating item: {str(e)}")
        return jsonify({"error": "Failed to update item"}), 500

@app.route("/get_items", methods=["GET"])
def get_items():
    try:
        list_id = request.args.get('list')
        tag = request.args.get('tag')
        platform = request.args.get('platform')

        filter_conditions = {"type": "item"}
        
        if list_id and list_id != 'all':
            filter_conditions["list_id"] = list_id
        if tag:
            filter_conditions["tags"] = {"$in": [tag]}
        if platform:
            filter_conditions["url"] = {"$contains": platform}

        query_response = index.query(
            vector=[0.0] * 1536,  # Dummy vector for metadata-only query
            top_k=100,
            include_metadata=True,
            filter=filter_conditions
        )
        
        items = [
            {
                "id": match.id,
                "title": match.metadata.get("title", ""),
                "url": match.metadata.get("url", ""),
                "note": match.metadata.get("note", ""),
                "tags": match.metadata.get("tags", []),
                "image_url": match.metadata.get("image_url", ""),
                "list_id": match.metadata.get("list_id", ""),
                "date_added": match.metadata.get("date_added", "")
            }
            for match in query_response.matches
        ]
        return jsonify(items)
    except Exception as e:
        logging.error(f"Error fetching items: {str(e)}")
        return jsonify({"error": "Failed to fetch items"}), 500

if __name__ == "__main__":
    app.run(debug=True)
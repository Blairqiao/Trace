import json
import pandas as pd
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

def load_and_clean_chrome_history(filepath: str, max_items: int = 2000) -> pd.DataFrame:
    """Reads the Chrome History.json and extracts page titles."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    history_list = data.get("Browser History", [])
    visited = set()
    
    records = []
    while len(records) < max_items and history_list:
        item = history_list.pop(0)
        title = item.get("title", "")
        url = item.get("url", "")
        
        if title and not title.startswith("http") and title not in visited:
            visited.add(title)
            records.append({
                "title": title,
                "url": url,
                "timestamp": item.get("time_usec")
            })
            
    df = pd.DataFrame(records)    
    
    print(f"Loaded {len(df)} unique pages from your Chrome history.")
    return df

def generate_embeddings(df: pd.DataFrame) -> list:
    """Converts a list of text strings into a list of 384-dimensional mathematical arrays."""
    titles = df['title'].tolist()
    
    print("Generating 384-dimensional embeddings...")
    embeddings = model.encode(titles, show_progress_bar=True)
    return embeddings.tolist()

import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import StandardScaler

model = SentenceTransformer('all-MiniLM-L6-v2')

def load_and_clean_chrome_history(data: dict) -> pd.DataFrame:
    
    history_list = data.get("Browser History", [])
    
    records = []
    for item in history_list:
        title = item.get("title", "")
        url = item.get("url", "")
        
        if title and not title.startswith("http"):
            records.append({
                "title": title,
                "url": url,
                "timestamp": item.get("time_usec")
            })
            
    df = pd.DataFrame(records)    
    df = df.drop_duplicates(subset=['title']).reset_index(drop=True) 
    
    del history_list
    del records

    print(f"Loaded {len(df)} unique pages from your Chrome history.")
    return df

def generate_embeddings(df: pd.DataFrame) -> list:
    """Converts a list of text strings into a list of 384-dimensional mathematical arrays."""
    titles = df['title'].tolist()
    
    print("Generating 384-dimensional embeddings...")
    raw_embeddings = model.encode(titles, show_progress_bar=True)

    del titles

    Scaler = StandardScaler()
    scaled_embeddings = Scaler.fit_transform(raw_embeddings)

    del raw_embeddings
    del Scaler

    return scaled_embeddings.astype('float32')

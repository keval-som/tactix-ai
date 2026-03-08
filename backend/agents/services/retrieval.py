import pandas as pd
from config import client, MODEL_FAST

df = pd.read_csv("data/dataset.csv")
df["combined"] = df.fillna('').astype(str).agg(" | ".join, axis=1)

def retrieve_from_dataset(query):

    sample_rows = df["combined"].tolist()[:100]

    prompt = f"""
    From this dataset:
    {sample_rows}

    Find relevant info for:
    {query}

    Return concise insight.
    """

    response = client.models.generate_content(
        model=MODEL_FAST,
        contents=prompt
    )

    return response.text
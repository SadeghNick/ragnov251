import streamlit as st
import requests
import pandas as pd
import os

# List of PDF filenames (sourcefile values).
# Update this list if you add or remove documents. It matches the fileNames.ts list.
FILE_NAMES = [
    "387.Shell Nederland Raffinaderij en CH.01-03-2022.28-02-2025.pdf",
    "161.Nederlandse Gasunie NV Cao.01-01-2024.31-12-2025.pdf",
    "559.Ikea NL BV en Inter Ikea Systems BV.01-10-2023.31-12-2024.pdf",
    "242.Schiphol Nederland BV.01-04-2023.30-09-2024.pdf",
    "163.Openbaar Vervoer.01-01-2023.31-03-2025.pdf",
    "161.Nederlandse Gasunie NV Cao.01-01-2024.31-12-2025.pdf",
    "15.Philips.01-01-2023.01-07-2024.pdf",
    "136.HTM Cao.01-01-2024.30-06-2026.pdf",
    "50.Apotheken.01-07-2021.30-06-2024.pdf",
    "144.Royal Flora Holland.01-04-2024.31-03-2026.pdf",
    "161.Nederlandse Gasunie NV Cao.01-01-2024.31-12-2025.pdf",
    "365.ANWB Cao.01-04-2022.31-03-2024.pdf",
    "1633.Abn Amro.01-07-2024.30-06-2026.pdf",
    "1635.ING Bank Cao.01-01-2023.31-12-2024.pdf",
]

def ask_question(backend_url: str, question: str, file_name: str) -> str:
    """
    Send a question to the /chat endpoint for a single document.

    Args:
        backend_url (str): Base URL of the RAG backend (e.g. http://localhost:50505).
        question (str): The question to ask.
        file_name (str): Name of the PDF file (matches the sourcefile field).

    Returns:
        str: The answer text, or an error message.
    """
    url = backend_url.rstrip("/") + "/chat"
    payload = {
        "messages": [{"role": "user", "content": question}],
        "context": {
            "overrides": {"selected_blob": file_name}
        },
    }
    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        #data = response.json()
        #return data.get("answer", "")
        data = response.json()
        return data.get("message", {}).get("content", "")
    except Exception as e:
        return f"Error: {e}"

def main():
    st.title("Per‑document RAG Q&A")
    st.write(
        "Enter a question and select one or more documents. "
        "When you click **Ask**, the app will send your question to the backend for each selected document "
        "and display one answer per document. You can then download the results as a CSV."
    )

    # Let the user set the backend URL. Defaults to a localhost URL if not provided.
    default_backend = os.getenv("BACKEND_URL", "http://localhost:50505")
    backend_url = st.text_input("Backend URL", value=default_backend)

    question = st.text_input("Question")

    selected_files = st.multiselect(
        "Select PDF files",
        options=FILE_NAMES,
        help="Choose one or more documents to query",
    )

    if st.button("Ask"):
        if not question:
            st.warning("Please enter a question.")
        elif not selected_files:
            st.warning("Please select at least one file.")
        else:
            results = []
            progress_bar = st.progress(0)
            total = len(selected_files)
            for idx, file_name in enumerate(selected_files):
                answer = ask_question(backend_url, question, file_name)
                results.append({"file_name": file_name, "answer": answer})
                progress_bar.progress((idx + 1) / total)

            df = pd.DataFrame(results)
            st.dataframe(df)

            csv_data = df.to_csv(index=False)
            st.download_button(
                "Download results as CSV",
                csv_data,
                "per_document_answers.csv",
                "text/csv",
            )

if __name__ == "__main__":
    main()

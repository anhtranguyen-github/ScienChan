# Knowledge Base & Document Management

## Overview
The Knowledge Base (KB) is central to the RAG functionality. Users can upload documents which are then processed into the vector store (Qdrant) for retrieval.

## Ingestion Pipeline
1. **Upload**: API receives files (PDF, Markdown, HTML, TXT).
2. **Parsing**: Content is extracted using specialized loaders (e.g., `PyPDFLoader`, `UnstructuredMarkdownLoader`).
3. **Chunking**: Text is split into manageable pieces.
    - **Strategy**: Semantic Chunking preferred, or Recursive Character Splitting with 10% overlap.
4. **Embedding**: Text chunks are converted to vectors using `OpenAIEmbeddings` or HuggingFace models.
5. **Storage**: Vectors and metadata (source name, page number, timestamp) are stored in Qdrant.

## Management Operations
- **List Documents**: View all processed documents and their status.
- **Refresh**: Re-embed documents if the model or chunking logic changes.
- **Delete**: Remove documents and their associated vectors from the store.
- **Search**: Direct semantic search interface for testing retrieval quality.

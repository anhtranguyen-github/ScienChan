# Knowledge Base & Document Management

## Overview
The Knowledge Base (KB) is central to the RAG functionality. Users can upload documents which are then processed into the vector store (Qdrant) for retrieval.

## Supported File Types
The system automatically detects and processes the following formats:
- **PDF** (.pdf): Handled by `PyPDFLoader`.
- **Microsoft Word** (.docx): Handled by `Docx2txtLoader`.
- **Markdown** (.md): Handled by `TextLoader`.
- **Plain Text** (.txt, .log): Handled by `TextLoader`.

## Ingestion Pipeline
1. **Upload**: API receives files via the `/upload` endpoint.
2. **Parsing**: Content is extracted using specialized LangChain loaders selected by file extension.
3. **Chunking**: Text is split using `RecursiveCharacterTextSplitter`.
    - **Chunk Size**: 800 characters.
    - **Chunk Overlap**: 150 characters.
    - **Separators**: Paragraphs, sentences, and spaces.
4. **Embedding**: Text chunks are converted to vectors using the configured `EmbeddingProvider` (OpenAI, Voyage, or Local).
5. **Storage**: Vectors and metadata (filename, extension, timestamp) are stored in Qdrant.

## Management Operations
- **List Documents**: View all processed documents and their status.
- **Refresh**: Re-embed documents if the model or chunking logic changes.
- **Delete**: Remove documents and their associated vectors from the store.
- **Search**: Direct semantic search interface for testing retrieval quality.

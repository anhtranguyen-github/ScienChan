# ScienChan 🔬🚀

An advanced, multi-workspace RAG (Retrieval-Augmented Generation) chat application designed for deep document analysis and intelligent conversation.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-black)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)

## ✨ Features

- **📂 Multi-Workspace Architecture**: Organize documents and chats into isolated workspaces with independent settings.
- **💬 intelligent Chat**: Converse with your data using multiple modes:
  - **Fast**: Quick, direct responses.
  - **Thinking**: More thorough analysis.
  - **Reasoning**: Full chain-of-thought with detailed source citations.
- **🔍 Global Search**: Unified search across documents, chat history, and workspaces.
- **🛠️ Advanced RAG Engines**: Support for various retrieval strategies including Vector search and Graph-based RAG.
- **📄 Document Ingestion**: Seamless ingestion of PDFs, Markdown, and text files with automated chunking and embedding.
- **⚙️ Provider Agnostic**: Configurable support for OpenAI, Anthropic, Ollama, and more.

## 🏗️ Architecture

- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion, and Lucide React.
- **Backend**: FastAPI, LangGraph for orchestration, and LangChain for LLM integration.
- **Data Stores**:
  - **Qdrant**: High-performance vector database for semantic search.
  - **MongoDB**: For session management, workspace metadata, and chat history.
  - **MinIO**: S3-compatible object storage for paper/document persistence.

## 🚀 Getting Started

### Prerequisites

- **Docker** and **Docker Compose**
- **Bun** (for frontend)
- **Python 3.10+** (for backend)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anhtranguyen-github/ScienChan.git
   cd ScienChan
   ```

2. **Setup Environment**:
   Create a `.env` file in the root and add your configuration:
   ```env
   # Backend
   OPENAI_API_KEY=your_key_here
   MONGODB_URL=mongodb://localhost:27017
   QDRANT_URL=http://localhost:6333
   
   # MinIO
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   ```

3. **Run the Application**:
   Use the provided convenience script to start all services (Infrastructure, Backend, and Frontend):
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

## 🛠️ Development

### Frontend
```bash
cd frontend
bun install
bun run dev
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python app/main.py
```

## 🧪 Testing

The project includes a comprehensive test suite across the stack.

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
bun run test:unit    # Unit & Integration
bun run test:e2e     # End-to-End with Playwright
```

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ by the ScienChan Team.

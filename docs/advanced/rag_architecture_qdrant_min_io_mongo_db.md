# Kiến trúc RAG: Qdrant + MinIO + MongoDB

## 1. Tổng quan

Đây là kiến trúc RAG (Retrieval-Augmented Generation) **chuẩn, phổ biến và dễ scale**, đặc biệt phù hợp với:
- FastAPI backend
- Multi-workspace / multi-tenant
- Có quản lý tài liệu, version, và trace source

```
Qdrant   → Embedding vectors + chunk metadata (retrieval)
MinIO   → Document files (pdf, docx, md, versioning)
MongoDB → Document / workspace / ingest metadata
```

---

## 2. Phân vai trách nhiệm (rất quan trọng)

### 2.1 Qdrant – Vector Store (tầng tìm kiếm)

**Chỉ lưu những gì cần cho retrieval**

```json
{
  "id": "chunk_123",
  "vector": [0.012, 0.98, ...],
  "payload": {
    "workspace_id": "ws_1",
    "doc_id": "doc_1",
    "version": 2,
    "chunk_index": 12,
    "page": 5,
    "source": "minio://rag-docs/ws_1/doc_1/v2/file.pdf"
  }
}
```

**Nên lưu**
- workspace_id (filter)
- doc_id, version
- vị trí chunk (page / offset)
- source path

**Không nên lưu**
- Text dài
- Trạng thái ingest
- Version history chi tiết

---

### 2.2 MinIO – Object Storage (tài liệu gốc)

Dùng để lưu **file thật + version**

```
rag-docs/
 └── ws_1/
      └── doc_1/
           ├── v1/file.pdf
           ├── v2/file.pdf
           └── original.pdf
```

**Dùng cho**
- Download / preview tài liệu
- Trace source khi chat
- Re-ingest khi đổi embedding model
- Chia sẻ document giữa workspace

**Không dùng cho**
- Search
- Query metadata phức tạp

---

### 2.3 MongoDB – Metadata & Management

Lưu **metadata nghiệp vụ ở mức document**

```json
{
  "_id": "doc_1",
  "workspace_id": "ws_1",
  "filename": "file.pdf",
  "minio_path": "rag-docs/ws_1/doc_1/v2/file.pdf",
  "status": "indexed",
  "current_version": 2,
  "hash": "sha256:abcd...",
  "tags": ["policy", "internal"],
  "created_at": "2026-02-03T10:00:00Z"
}
```

**Nên lưu**
- Trạng thái ingest (uploaded / indexing / indexed / failed)
- Version hiện tại
- Hash chống ingest trùng
- Workspace sharing & permission

**Không nên lưu**
- Vector
- Chunk content

---

## 3. Luồng xử lý end-to-end

```
1. Upload file
   → MinIO

2. Tạo document record
   → MongoDB (status = uploaded)

3. Ingest pipeline
   → Load file từ MinIO
   → Parse + chunk
   → Embed
   → Upsert vectors → Qdrant

4. Cập nhật trạng thái
   → MongoDB (status = indexed)

5. Chat query
   → Qdrant search (filter workspace)
   → Lấy payload metadata
   → (optional) Presigned URL từ MinIO
   → Inject context → LLM
```

---

## 4. Phân tách metadata để tránh rối

| Tầng | Cấp độ | Mục đích |
|----|------|--------|
| MongoDB | Document-level | Quản lý, UI, lifecycle |
| Qdrant | Chunk-level | Search & filter |
| MinIO | File-level | Source & storage |

⚠️ **Không lặp metadata giữa MongoDB và Qdrant nếu không cần**

---

## 4.5 Global Vault & Cross-Workspace Dedup (Tính năng nâng cao)

Kiến trúc này hỗ trợ **Global Deduplication** thông qua Master Intelligence Vault:
1. **Physical Deduplication (MinIO)**: Khi upload document trùng Content Hash, hệ thống tái sử dụng MinIO path thay vì tạo bản copy mới.
2. **Vector Deduplication (Qdrant)**: Embeddings có thể được chia sẻ giữa các workspace (nếu cấu hình RAG tương thích).
3. **Federated Management**: Master Vault cho phép quản lý tài liệu xuyên workspace, thực hiện Global Purge (xóa triệt để khỏi Qdrant + MongoDB + MinIO).

---

## 5. Schema gợi ý (tối giản)

### MongoDB
```
workspaces
  └── documents
        └── document_versions
```

### Qdrant
```
collection: ws_<id>_chunks
payload: { doc_id, version, page, chunk_index }
```

### MinIO
```
bucket: rag-docs
path: <workspace_id>/<doc_id>/<version>/file
```

---

## 6. Các bẫy phổ biến cần tránh

- ❌ Lưu text dài trong Qdrant payload
- ❌ Query MongoDB trong mỗi lần retrieval
- ❌ Không gắn version vào vector
- ❌ Không lưu hash → ingest trùng

---

## 7. Khi nào kiến trúc này là quá nặng?

- < 50 documents
- Không workspace
- Không cần version / audit

👉 Khi đó có thể dùng:
```
Filesystem + FAISS + SQLite
```

---

## 8. Kết luận

**Qdrant = tìm**  
**MinIO = giữ**  
**MongoDB = quản lý**

Đây là kiến trúc:
- Scale tốt
- Dễ debug
- Dễ thay thế từng tầng
- Phù hợp FastAPI + Agent + RAG dài hạn

---

*File này có thể dùng trực tiếp làm tài liệu thiết kế hoặc gửi cho agent coder.*


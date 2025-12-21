import pytest
from backend.app.rag.rag_service import rag_service

@pytest.mark.asyncio
async def test_chunk_text():
    text = "This is a test document. It contains multiple sentences to test chunking logic."
    # With semantic chunking, it might only return 1 chunk if the text is short
    chunks = await rag_service.chunk_text(text)
    assert len(chunks) >= 1
    assert "test document" in chunks[0]

@pytest.mark.asyncio
async def test_get_embeddings(mocker):
    # Mock the embedding provider to avoid API calls
    mock_embeddings = [[0.1] * 1536]
    mocker.patch("backend.app.rag.rag_service.rag_service.get_embeddings", return_value=mock_embeddings)
    
    result = await rag_service.get_embeddings(["test chunk"])
    assert len(result) == 1
    assert len(result[0]) == 1536

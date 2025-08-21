Vector DB scaffold

What's included:
- `types.ts` - Document/Query types and VectorDB interface
- `in-memory.ts` - lightweight in-memory vector store (cosine similarity)
- `service.ts` - singleton exposing upsert/query/delete/clear
- `embeddings.ts` - helper to get embeddings (server or client via /api/embeddings)
- `tasks-indexer.ts` - helper to index tasks and query tasks by semantic search

How to use:
- Server should set `OPENAI_API_KEY` to use the provided `/api/embeddings` route.
- To index tasks: call `indexTasks(tasksArray)` after loading tasks from the store.
- To query: call `queryTasks('find overdue tasks about invoices')`.

Next steps to production:
- Replace `InMemoryVectorDB` with a remote vector DB adapter (Pinecone, Weaviate, Milvus, Supabase vector, etc.) by implementing the `VectorDB` interface.
- Securely proxy embedding requests on the server and add rate limiting.
- Add persistent storage for vectors (if using local file or DB) and a reindex cron.

export default interface ElasticsearchClient {
  /** Base URL of the configured Elasticsearch server */
  url: string;
  /** Make an authenticated request to any Elasticsearch endpoint */
  request(method: string, path: string, body?: object): Promise<{ status: number; data: any }>;
  /** Execute a search query against an index */
  search(index: string, body: object): Promise<any>;
  /** Index a document. Pass null for id to let Elasticsearch auto-generate one. */
  indexDocument(indexName: string, id: string | null, document: object): Promise<any>;
  /** Retrieve a document by ID */
  getDocument(indexName: string, id: string): Promise<any>;
  /** Delete a document by ID */
  deleteDocument(indexName: string, id: string): Promise<any>;
}

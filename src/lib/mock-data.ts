import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentUpload } from './documents';

// Mock document storage for when database operations fail
const mockDocumentStorage: Record<string, Document> = {};

// Add a document to mock storage
export const addMockDocument = (document: Document): Document => {
  const id = document.id || uuidv4();
  const now = new Date().toISOString();
  
  const mockDocument: Document = {
    ...document,
    id,
    created_at: document.created_at || now,
    updated_at: now
  };
  
  mockDocumentStorage[id] = mockDocument;
  console.log(`Added document to mock storage: ${id}`);
  return mockDocument;
};

// Get all documents from mock storage
export const getMockDocuments = (): Document[] => {
  return Object.values(mockDocumentStorage);
};

// Get a document by ID from mock storage
export const getMockDocumentById = (id: string): Document | null => {
  return mockDocumentStorage[id] || null;
};

// Create a mock document from upload data
export const createMockDocument = (
  documentUpload: DocumentUpload, 
  userId: string, 
  filePath: string,
  publicUrl: string
): Document => {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const mockDocument: Document = {
    id,
    title: documentUpload.title,
    description: documentUpload.description || '',
    file_path: filePath,
    file_size: documentUpload.file.size,
    file_type: documentUpload.file.type,
    status: 'draft',
    created_by: userId,
    created_at: now,
    updated_at: now,
    document_type_id: documentUpload.document_type_id,
    metadata: {
      publicUrl,
      approvers: documentUpload.approvers || [],
      uploadTimestamp: now,
      isMockData: true
    }
  };
  
  return addMockDocument(mockDocument);
};

// Update a mock document
export const updateMockDocument = (id: string, updates: Partial<Document>): Document | null => {
  if (!mockDocumentStorage[id]) {
    return null;
  }
  
  mockDocumentStorage[id] = {
    ...mockDocumentStorage[id],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  return mockDocumentStorage[id];
};

// Delete a mock document
export const deleteMockDocument = (id: string): boolean => {
  if (!mockDocumentStorage[id]) {
    return false;
  }
  
  delete mockDocumentStorage[id];
  return true;
};

// Check if we're using mock data
export const isMockData = (document: Document): boolean => {
  return document.metadata?.isMockData === true;
};

// Log mock storage status
export const logMockStorageStatus = (): void => {
  const count = Object.keys(mockDocumentStorage).length;
  console.log(`Mock storage contains ${count} documents`);
  if (count > 0) {
    console.log(`Document IDs: ${Object.keys(mockDocumentStorage).join(', ')}`);
  }
};

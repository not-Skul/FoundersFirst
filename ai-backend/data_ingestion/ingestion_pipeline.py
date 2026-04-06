from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, JSONLoader, TextLoader, BSHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, OperationFailure
from fastapi import UploadFile, File
from dotenv import load_dotenv
import os
import hashlib
import datetime
import logging
import tempfile
from pathlib import Path
from typing import Optional, List, Dict, Any

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IngestionPipeline:
    """Generalized data ingestion pipeline supporting multiple file types."""
    
    SUPPORTED_FORMATS = {'.pdf', '.json', '.txt', '.html', '.htm'}
    BATCH_SIZE = 10  # Batch size for embedding generation
    
    def __init__(
        self,
        mongo_uri: Optional[str] = None,
        db_name: Optional[str] = None,
        collection_name: Optional[str] = None
    ):
        """
        Initialize the ingestion pipeline.
        
        Args:
            mongo_uri: MongoDB connection URI (defaults to CONNECTION_URI env var)
            db_name: Database name (defaults to RAG_DB_NAME env var or "rag_db")
            collection_name: Collection name (defaults to RAG_COLLECTION_NAME env var or "schemes")
        """
        self.embedding_model = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
            output_dimensionality=768
        )
        self.llm = GoogleGenerativeAI(model="gemini-2.5-flash-lite")
        
        # MongoDB setup with environment variables
        mongo_uri = mongo_uri or os.environ.get('CONNECTION_URI')
        if not mongo_uri:
            raise ValueError("MongoDB connection URI not provided")
        
        db_name = db_name or os.environ.get('RAG_DB_NAME', 'rag_db')
        collection_name = collection_name or os.environ.get('RAG_COLLECTION_NAME', 'schemes')
        
        try:
            # Use connection pooling
            self.client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                retryWrites=True
            )
            # Verify connection
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except ServerSelectionTimeoutError as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
        
        self.collection = self.client[db_name][collection_name]
        self.db_name = db_name
        self.collection_name = collection_name
    
    def _get_file_extension(self, file_path: str) -> str:
        """Extract and validate file extension."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported file type: {ext}. Supported: {self.SUPPORTED_FORMATS}")
        return ext
    
    def _get_splitter_for_format(self, file_ext: str) -> RecursiveCharacterTextSplitter:
        """Get appropriate text splitter based on file format."""
        if file_ext == '.html' or file_ext == '.htm':
            separators = [
                "</section>",  # Section breaks
                "</article>",  # Article breaks
                "</div>",      # Div breaks
                "</p>",        # Paragraph breaks
                "\n\n",        # Double newlines
                "\n",          # Single newlines
                ". ",          # Sentences
                " ",           # Words
            ]
            chunk_size = 800
        elif file_ext == '.txt':
            separators = [
                "\n## ",       # Major sections
                "\n### ",      # Subsections
                "\n#### ",     # Sub-subsections
                "\n\n",        # Paragraphs
                "\n",          # Lines
                ". ",          # Sentences
                " ",           # Words
            ]
            chunk_size = 1000
        else:  # PDF, JSON
            separators = [
                "\n## ",       # Major sections
                "\n### ",      # Subsections
                "\n#### ",     # Sub-subsections
                "\n\n",        # Paragraphs
                "\n",          # Lines
                ". ",          # Sentences
                " ",           # Words
            ]
            chunk_size = 800
        
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=200,
            separators=separators,
            length_function=len,
        )
    
    def _load_documents(self, file_addr: str, file_ext: str):
        """Load documents using appropriate loader."""
        if file_ext == '.pdf':
            loader = PyPDFLoader(file_addr)
        elif file_ext == '.json':
            loader = JSONLoader(
                file_addr,
                jq_schema='.[] | .brief'
            )
        elif file_ext == '.txt':
            loader = TextLoader(file_addr, encoding='utf-8')
        elif file_ext in ['.html', '.htm']:
            loader = BSHTMLLoader(
                file_addr,
                open_encoding='utf-8',
                bs_kwargs={"features": "html.parser"}
            )
        
        return loader.load()
    
    def _generate_embeddings(self, text: str) -> Optional[List[float]]:
        """Generate embedding vectors for text."""
        try:
            if not text or not text.strip():
                logger.warning("Attempted to generate embeddings for empty text")
                return None
            embedding_vector = self.embedding_model.embed_query(text)
            return embedding_vector
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return None
    
    def _generate_batch_embeddings(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts in batch."""
        embeddings = []
        for i, text in enumerate(texts):
            try:
                if text and text.strip():
                    embedding = self._generate_embeddings(text)
                    embeddings.append(embedding)
                else:
                    embeddings.append(None)
                    logger.warning(f"Empty text at index {i}")
            except Exception as e:
                logger.error(f"Error generating embedding for text {i}: {e}")
                embeddings.append(None)
        return embeddings
    
    def _split_documents(self, documents: list, file_ext: str) -> list:
        """Split documents into chunks."""
        if not documents:
            logger.warning("No documents to split")
            return []
        
        splitter = self._get_splitter_for_format(file_ext)
        split_docs = splitter.split_documents(documents)
        logger.info(f"Number of chunks created: {len(split_docs)}")
        return split_docs
    
    def _prepare_documents_for_db(self, chunks: list) -> tuple[List[Dict[str, Any]], int]:
        """Prepare document chunks for MongoDB insertion with batch embedding generation.
        
        Returns:
            Tuple of (docs_to_insert, duplicates_found)
        """
        if not chunks:
            return [], 0
        
        docs_to_insert = []
        duplicates_found = 0
        
        # Extract texts for batch embedding
        texts = [chunk.page_content for chunk in chunks]
        
        # Generate embeddings in batch
        logger.info(f"Generating embeddings for {len(texts)} chunks in batches of {self.BATCH_SIZE}")
        embeddings = self._generate_batch_embeddings(texts)
        
        # Prepare documents
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            doc_hash = hashlib.sha256(chunk.page_content.encode()).hexdigest()
            
            # Check for duplicates
            existing = self.collection.find_one({"hash": doc_hash})
            if existing:
                duplicates_found += 1
                logger.debug(f"Duplicate chunk found (hash: {doc_hash[:8]}...)")
                continue
            
            doc = {
                "hash": doc_hash,
                "text": chunk.page_content,
                "embedding": embedding,
                "time_added": datetime.datetime.now(),
                "metadata": chunk.metadata if hasattr(chunk, 'metadata') else {}
            }
            docs_to_insert.append(doc)
        
        if duplicates_found > 0:
            logger.info(f"Skipped {duplicates_found} duplicate chunks")
        
        return docs_to_insert, duplicates_found
    
    def ingest(self, file_addr: str) -> Dict[str, Any]:
        """
        Ingest a file and store it in MongoDB with embeddings.
        
        Args:
            file_addr: Path to the file to ingest
            
        Returns:
            Dictionary with insertion results
        """
        try:
            # Validate file exists
            file_path = Path(file_addr)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_addr}")
            
            # Validate and get file extension
            file_ext = self._get_file_extension(file_addr)
            
            # Load documents
            logger.info(f"Loading {file_ext} file: {file_addr}")
            documents = self._load_documents(file_addr, file_ext)
            
            if not documents:
                logger.warning(f"No documents loaded from file: {file_addr}")
                return {
                    "success": False,
                    "error": "No documents could be loaded from the file"
                }
            
            # Split documents
            chunks = self._split_documents(documents, file_ext)
            
            if not chunks:
                logger.warning(f"No chunks created from documents")
                return {
                    "success": False,
                    "error": "No chunks could be created from the documents"
                }
            
            # Prepare for database with duplicate checking
            docs_to_insert, duplicates_found = self._prepare_documents_for_db(chunks)
            
            if not docs_to_insert:
                logger.warning(f"All chunks were duplicates")
                return {
                    "success": True,
                    "message": "All chunks were duplicates, no new documents inserted",
                    "inserted_count": 0,
                    "duplicates_found": duplicates_found,
                    "file_type": file_ext,
                    "chunks_count": len(chunks)
                }
            
            # Insert into MongoDB
            try:
                result = self.collection.insert_many(docs_to_insert)
                logger.info(f"Successfully inserted {len(result.inserted_ids)} documents into MongoDB collection.")
                
                return {
                    "success": True,
                    "inserted_count": len(result.inserted_ids),
                    "duplicates_found": duplicates_found,
                    "file_type": file_ext,
                    "chunks_count": len(chunks),
                    "total_processed": len(chunks)
                }
            except OperationFailure as e:
                logger.error(f"MongoDB operation failed: {e}")
                return {
                    "success": False,
                    "error": f"Database operation failed: {str(e)}"
                }
            
        except FileNotFoundError as e:
            logger.error(f"File error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Error during ingestion: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def close(self):
        """Close MongoDB connection."""
        try:
            self.client.close()
            logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

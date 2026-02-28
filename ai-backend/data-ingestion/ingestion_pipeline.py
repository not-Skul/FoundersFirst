from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, JSONLoader, TextLoader, BSHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pymongo import MongoClient
from fastapi import UploadFile, File
from dotenv import load_dotenv
import os
import hashlib
import datetime

load_dotenv()

class IngestionPipeline:
    """Generalized data ingestion pipeline supporting multiple file types."""
    
    SUPPORTED_FORMATS = {'.pdf', '.json', '.txt', '.html', '.htm'}
    
    def __init__(self, mongo_uri: str = None, db_name: str = "rag_db", collection_name: str = "schemes"):
        """
        Initialize the ingestion pipeline.
        
        Args:
            mongo_uri: MongoDB connection URI (defaults to CONNECTION_URI env var)
            db_name: Database name in MongoDB
            collection_name: Collection name in MongoDB
        """
        self.embedding_model = GoogleGenerativeAIEmbeddings(
            model="gemini-embedding-001",
            output_dimensionality=768
        )
        self.llm = GoogleGenerativeAI(model="gemini-2.5-flash-lite")
        
        # MongoDB setup
        mongo_uri = mongo_uri or os.environ.get('CONNECTION_URI')
        if not mongo_uri:
            raise ValueError("MongoDB connection URI not provided")
        
        self.client = MongoClient(mongo_uri)
        self.collection = self.client[db_name][collection_name]
    
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
    
    def _generate_embeddings(self, text: str) -> list:
        """Generate embedding vectors for text."""
        try:
            embedding_vector = self.embedding_model.embed_query(text)
            return embedding_vector
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return None
    
    def _split_documents(self, documents: list, file_ext: str) -> list:
        """Split documents into chunks."""
        splitter = self._get_splitter_for_format(file_ext)
        split_docs = splitter.split_documents(documents)
        print(f"Number of chunks created: {len(split_docs)}")
        return split_docs
    
    def _prepare_documents_for_db(self, chunks: list) -> list:
        """Prepare document chunks for MongoDB insertion."""
        docs_to_insert = []
        for chunk in chunks:
            doc = {
                "hash": hashlib.sha256(chunk.page_content.encode()).hexdigest(),
                "text": chunk.page_content,
                "embedding": self._generate_embeddings(chunk.page_content),
                "time_added": datetime.datetime.now(),
                "metadata": chunk.metadata if hasattr(chunk, 'metadata') else {}
            }
            docs_to_insert.append(doc)
        return docs_to_insert
    
    def ingest(self, file_addr: str) -> dict:
        """
        Ingest a file and store it in MongoDB with embeddings.
        
        Args:
            file_addr: Path to the file to ingest
            
        Returns:
            Dictionary with insertion results
        """
        try:
            # Validate and get file extension
            file_ext = self._get_file_extension(file_addr)
            
            # Load documents
            print(f"Loading {file_ext} file: {file_addr}")
            documents = self._load_documents(file_addr, file_ext)
            
            # Split documents
            chunks = self._split_documents(documents, file_ext)
            
            # Prepare for database
            docs_to_insert = self._prepare_documents_for_db(chunks)
            
            # Insert into MongoDB
            result = self.collection.insert_many(docs_to_insert)
            
            print(f"Successfully inserted {len(result.inserted_ids)} documents into MongoDB collection.")
            
            return {
                "success": True,
                "inserted_count": len(result.inserted_ids),
                "inserted_ids": result.inserted_ids,
                "file_type": file_ext,
                "chunks_count": len(chunks)
            }
            
        except Exception as e:
            print(f"Error during ingestion: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def close(self):
        """Close MongoDB connection."""
        self.client.close()

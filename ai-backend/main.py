from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from rag import final_answer, final_roadmap_answer
from data_ingestion.ingestion_pipeline import IngestionPipeline
import tempfile
import os
import logging
from pathlib import Path

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize ingestion pipeline at startup
ingestion_pipeline = None

@app.on_event("startup")
async def startup_event():
    global ingestion_pipeline
    try:
        ingestion_pipeline = IngestionPipeline()
        logger.info("Ingestion pipeline initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ingestion pipeline: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    global ingestion_pipeline
    if ingestion_pipeline:
        ingestion_pipeline.close()
        logger.info("Ingestion pipeline closed")

@app.get("/test")
def initialTest():
    return {
        "status": "success",
        "message": "AI backend is working 🚀"
    }

@app.get("/rag/{query}")
async def get_rag_response(query: str):
    
    response = await final_answer(query)
    return {
        "status": "success",
        "query": query,
        "response": response
    }

@app.get("/roadmap/")
async def get_roadmap_response(query: str):
    query = query.replace("%20", " ")
    print("Received roadmap query:", query)
    response = await final_roadmap_answer(query)
    return {
        "status": "success",
        "query": query,
        "response": response
    }

@app.post("/ingest")
async def ingest_file(file: UploadFile = File(...)):
    """
    Ingest a file (PDF, JSON, TXT, or HTML) into the RAG database.
    
    Returns:
        - inserted_count: Number of new documents inserted
        - duplicates_found: Number of duplicate chunks skipped
        - file_type: Type of file ingested
        - chunks_count: Total chunks created
    """
    if not ingestion_pipeline:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ingestion pipeline not initialized"
        )
    
    # Validate file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in IngestionPipeline.SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_ext}. Supported: {IngestionPipeline.SUPPORTED_FORMATS}"
        )
    
    # Save uploaded file to temporary location
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Write uploaded file to disk
        with open(temp_file_path, "wb") as f:
            contents = await file.read()
            if not contents:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File is empty"
                )
            f.write(contents)
        
        # Ingest the file
        logger.info(f"Starting ingestion for file: {file.filename}")
        result = ingestion_pipeline.ingest(temp_file_path)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Ingestion failed")
            )
        
        logger.info(f"Ingestion completed for {file.filename}: {result['inserted_count']} documents inserted")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during file ingestion: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File ingestion failed: {str(e)}"
        )
    finally:
        # Clean up temporary file
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up temporary file: {e}")
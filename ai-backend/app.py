"""
app.py — Unified FastAPI AI Backend Server.

Combines responsibilities from server.py and main.py:
  - Manage PostgresSaver checkpointer lifecycle via FastAPI lifespan
  - Initialize and manage RAG ingestion pipeline
  - Compile and expose the LangGraph agent
  - Provide a streaming SSE endpoint for chat (/chat/stream)
  - Provide traditional RAG & ingestion endpoints
  - Provide health-check endpoint for infra/monitoring

Replaces:
  - server.py (chat streaming)
  - main.py (RAG and ingestion)

To start:
  uvicorn app:app --port 8001
"""

import asyncio
import sys
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging
import os
import traceback
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.checkpoint.postgres import PostgresSaver
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from agent3 import build_graph, get_config, get_clean_messages
from utils import search_in_vectordb
from data_ingestion.ingestion_pipeline import IngestionPipeline

# ---------------------------------------------------------------------------
# Logging & env
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
load_dotenv()

# Global ingestion pipeline instance
ingestion_pipeline = None
# Global checkpointer — kept alive for server lifetime
checkpointer = None

# ---------------------------------------------------------------------------
# Lifespan — runs once at startup, tears down cleanly at shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """
    Initialize and manage resources for the entire server lifecycle.
    
    Responsibilities:
    1. Connect to PostgreSQL and set up LangGraph checkpointer
    2. Compile the LangGraph agent with the checkpointer
    3. Initialize the RAG ingestion pipeline
    4. Clean up all resources on shutdown
    
    Everything inside `with` stays alive for the entire server runtime.
    """
    global ingestion_pipeline, checkpointer
    
    # ===== STARTUP =====
    logger.info("=== SERVER STARTUP ===")
    
    # Connect to Postgres checkpointer for LangGraph agent memory
    conn_str = os.getenv("POSTGRES_CONNECTION_STRING")
    if not conn_str:
        raise RuntimeError("POSTGRES_CONNECTION_STRING env var is not set.")

    logger.info("Connecting to PostgreSQL checkpointer...")
    try:
        # Create checkpointer WITHOUT entering context manager
        # This keeps the connection pool alive throughout server lifetime
        with PostgresSaver.from_conn_string(conn_str) as checkpointer:
        # checkpointer.setup()
        
        # Store in app.state to keep strong reference and prevent GC
            fastapi_app.state.checkpointer = checkpointer
            fastapi_app.state.graph = build_graph(checkpointer)
            logger.info("✓ LangGraph agent compiled and ready")
            
            # Initialize RAG ingestion pipeline
            try:
                ingestion_pipeline = IngestionPipeline()
                logger.info("✓ Ingestion pipeline initialized")
            except Exception as e:
                logger.error(f"Failed to initialize ingestion pipeline: {e}")
                ingestion_pipeline = None
            
            logger.info("=== SERVER READY ===")
            yield  # ← server handles requests here
            
    finally:
        # ===== SHUTDOWN =====
        logger.info("=== SERVER SHUTDOWN ===")
        
        # Close ingestion pipeline
        if ingestion_pipeline:
            try:
                ingestion_pipeline.close()
                logger.info("✓ Ingestion pipeline closed")
            except Exception as e:
                logger.error(f"Error closing ingestion pipeline: {e}")
        
        # Note: checkpointer is closed automatically by the `with` context manager
        logger.info("=== SERVER STOPPED ===")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Backend - Unified",
    description="LangGraph-powered AI service with RAG and ingestion capabilities.",
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
FLASK_ORIGIN = os.getenv("FLASK_BACKEND_ORIGIN", "http://localhost:5000")

app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    """
    Payload for chat endpoint.
    
    Fields:
        thread_id : Unique session/user ID — keeps conversation memory
                    isolated per user in the PostgreSQL checkpointer.
        query     : The user's message text.
        user_id   : The authenticated user's ID for profile/roadmap tool calls.
    """
    thread_id: str
    query: str
    user_id: str = ""


class ChatResponse(BaseModel):
    """
    Response from chat endpoint.
    
    Fields:
        thread_id : The thread/session ID
        query     : The original user query
        response  : The AI assistant's response
        success   : Whether the request succeeded
        error     : Error message if unsuccessful
    """
    thread_id: str
    query: str
    response: str
    success: bool
    error: str | None


# ---------------------------------------------------------------------------
# ROUTES — Chat & Health
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Infra"])
async def health_check():
    """
    Liveness endpoint for monitoring and Flask backend health checks.
    """
    return {"status": "ok"}


@app.post("/chat/stream", tags=["Chat"], response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request):
    """
    Chat endpoint — processes user query and returns full response.

    The `thread_id` MUST be unique per user/session so the PostgreSQL
    checkpointer keeps each conversation's memory separate.

    Request:
        {
            "thread_id": "user_123",
            "query": "What is a startup?",
            "user_id": "1"
        }

    Response:
        {
            "thread_id": "user_123",
            "query": "What is a startup?",
            "response": "A startup is a young company...",
            "success": true,
            "error": null
        }
    """
    try:
        graph = request.app.state.graph
        config = {"configurable": {"thread_id": payload.thread_id}}
        logger.info(f"[CHAT] thread_id={payload.thread_id} | query={payload.query[:50]}...")
        
        # Invoke the graph with the user query
        result = graph.invoke(
            {
                "messages": [HumanMessage(content=payload.query)],
                "query": payload.query,
                "user_id": payload.user_id,
                "_tool_messages": [],
                "_tool_round": 0,
            },
            config=config,
        )
        
        # Extract the final AI response from the messages
        # Walk backwards to find the last AIMessage (skip ToolMessages, etc.)
        messages = result.get("messages", [])
        response_text = ""
        
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and hasattr(msg, "content"):
                content = msg.content
                # Handle both string and list content formats
                if isinstance(content, list):
                    text_blocks = []
                    for block in content:
                        if isinstance(block, dict) and "text" in block:
                            text_blocks.append(block["text"])
                        elif isinstance(block, str):
                            text_blocks.append(block)
                    response_text = " ".join(text_blocks).strip()
                else:
                    response_text = (content or "").strip()
                
                # Only use this message if it has actual text content
                # (skip AIMessages that only contain tool_calls with no text)
                if response_text:
                    break
        
        logger.info(f"[CHAT] Response length={len(response_text)} for thread_id={payload.thread_id}")
        return ChatResponse(
            thread_id=payload.thread_id,
            query=payload.query,
            response=response_text,
            success=True,
            error=None,
        )
    
    except Exception as e:
        logger.error(f"[CHAT] Error: {e}", exc_info=True)
        return ChatResponse(
            thread_id=payload.thread_id,
            query=payload.query,
            response="",
            success=False,
            error=str(e),
        )


@app.get("/message-history/{thread_id}", tags=["Chat"])
async def get_message_history(thread_id: str, request: Request):
    """
    Retrieve conversation history for a given thread_id.

    Returns the clean message history from the PostgreSQL checkpointer.
    agent3 stores only HumanMessage + AIMessage in state["messages"],
    so no post-processing or keyword filtering is needed.

    Response:
        {
            "thread_id": "user_123",
            "messages": [
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."}
            ],
            "found": true/false
        }
    """
    try:
        graph = request.app.state.graph
        formatted_messages = get_clean_messages(graph, thread_id)

        found = len(formatted_messages) > 0
        logger.info(
            f"[HISTORY] Retrieved {len(formatted_messages)} messages for thread_id={thread_id}"
        )
        return {
            "thread_id": thread_id,
            "messages": formatted_messages,
            "found": found,
        }

    except Exception as e:
        logger.error(f"[HISTORY] Error retrieving messages: {e}", exc_info=True)
        return {
            "thread_id": thread_id,
            "messages": [],
            "found": False,
            "error": str(e),
        }


# ---------------------------------------------------------------------------
# ROUTES — RAG & Ingestion (from main.py)
# ---------------------------------------------------------------------------
@app.get("/test", tags=["Utils"])
def initial_test():
    """
    Sanity check endpoint — verify AI backend is responding.
    """
    return {
        "status": "success",
        "message": "AI backend is working 🚀"
    }


@app.get("/roadmap/", tags=["RAG"])
async def get_roadmap_response(query: str):
    """
    Generate a roadmap response based on the query.
    
    Specialized endpoint for startup roadmap generation using RAG context.
    """
    def final_roadmap_answer(query):
        context_docs = search_in_vectordb(query)
        context_string = " ".join([doc["text"] for doc in context_docs])

        prompt = f"""
    Using the provided startup context and idea, generate a clear, actionable roadmap that a founder can follow to build and launch their startup. The roadmap should be structured in sequential phases and tailored to an early-stage startup.
    Context: {context_string}
    Idea and Target Users: {query}
    Requirements:

    Base the roadmap on the given idea, target users, and problem being solved.

    Assume the user is a first-time founder unless otherwise specified.

    Focus on practical, execution-oriented steps.

    Each phase should include a concise goal and concrete tasks.

    Output Format (strictly follow this structure):

    {{
    "phase": '1',
    "title": "Validation & Research",
    "description": "Validate your idea and understand the market",
    "tasks": [
        "Conduct market research in your target segment",
        "Interview 20+ potential customers",
        "Analyze competitors in the space",
        "Define your unique value proposition"
    ]
    }},
    {{
    "phase": '2',
    "title": "MVP Development",
    "description": "Build your minimum viable product",
    "tasks": [
        "Define core features for MVP",
        "Choose technology stack",
        "Build prototype in 4–6 weeks",
        "Get early feedback from beta users"
    ]
    }},
    {{
    "phase": '3',
    "title": "Go-to-Market",
    "description": "Launch and acquire your first customers",
    "tasks": [
        "Create marketing strategy",
        "Set up social media presence",
        "Launch on relevant platforms",
        "Implement referral program"
    ]
    }}


    Add additional phases if necessary (e.g., Iteration, Scaling, Fundraising).

    Keep task descriptions concise and action-focused."""
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite")
        result = llm.invoke(prompt)
        return result

    query = query.replace("%20", " ")
    logger.info(f"[ROADMAP] query={query}")

    response = final_roadmap_answer(query)
    return {
        "status": "success",
        "query": query,
        "response": response
    }


@app.post("/ingest", tags=["Ingestion"])
async def ingest_file(file: UploadFile = File(...)):
    """
    Ingest a file (PDF, JSON, TXT, or HTML) into the RAG vector database.

    Returns metadata about ingestion results:
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
    
    # Validate file
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
        logger.info(f"[INGEST] Starting: {file.filename}")
        result = ingestion_pipeline.ingest(temp_file_path)
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Ingestion failed")
            )
        
        logger.info(f"[INGEST] Completed: {file.filename} | inserted={result['inserted_count']}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[INGEST] Error: {e}", exc_info=True)
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


# ---------------------------------------------------------------------------
# Startup Script Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
        reload=True,  # Disable reload in production
    )
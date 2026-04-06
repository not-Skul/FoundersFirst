from pymongo import MongoClient
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.tools import DuckDuckGoSearchRun
from psycopg2 import pool
from functools import lru_cache
from Schema import QueryAgentState
from dotenv import load_dotenv
import os
from tavily import TavilyClient
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage


load_dotenv()

# --- Singletons (initialized once at module load) ---

embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001", output_dimensionality=768
)

# MongoDB: MongoClient is thread-safe and manages its own internal pool
_mongo_client = MongoClient(
    os.getenv("CONNECTION_URI"),
    maxPoolSize=10,       # max concurrent connections
    minPoolSize=2,        # keep 2 alive always
    serverSelectionTimeoutMS=10000,
)
_mongo_collection = _mongo_client["rag_db"]["schemes"]

# PostgreSQL: explicit connection pool (min 2, max 10)
_pg_pool = pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host=os.getenv("DB_HOST"),
    database="postgres",
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=5432,
    sslmode="require",
)


# --- Helpers ---

def clean_agent_state(messages: list, for_display: bool = False) -> list:
    """
    Filter LangGraph agent state messages to remove old polluted conversation turns.
    
    Uses skip-mode: when a polluted HumanMessage is detected, ALL subsequent
    messages (tool calls, AI responses) are skipped until the next clean
    HumanMessage is encountered. This removes entire polluted conversation
    turns, not just the HumanMessage.
    
    Args:
        messages: List of LangChain message objects or dicts from LangGraph state
        for_display: If True, also removes ToolMessages and empty AIMessages
                     (for chat history UI). If False, keeps ToolMessages in
                     clean turns so the LLM has proper tool_call→tool_result flow.
    
    Returns:
        List of cleaned messages
    """
    if not messages:
        return []
    
    # System prompt keywords that indicate runtime injection (not user intent)
    system_keywords = {
        "you are a helpful assistant",
        "you are a helpful startup advisor",
        "you are an expert startup advisor",
        "guidelines:",
        "user id:",
        "call one tool at a time",
        "use fetch_schemes",
        "answer clearly and concisely",
        "based on the user's startup idea, profile, roadmap",
        "relevant government schemes",
        "provide a focused, practical answer",
        "user question:",
        "user profile:",
        "detailed roadmap:",
        "funding status:",
    }
    
    def _get_type_and_content(msg):
        """Extract normalized type and content from a message (object or dict)."""
        if hasattr(msg, "type"):
            return msg.type, (msg.content if hasattr(msg, "content") else "")
        elif isinstance(msg, dict):
            t = msg.get("type", msg.get("role", "")).lower()
            if t == "user": t = "human"
            if t == "assistant": t = "ai"
            return t, msg.get("content", "")
        return "unknown", ""
    
    def _is_polluted(content):
        """Check if content contains system prompt keywords."""
        if isinstance(content, str):
            lower = content.lower()
            return any(kw in lower for kw in system_keywords)
        return False
    
    cleaned = []
    skip_mode = False  # When True, skip everything until next clean HumanMessage
    
    for msg in messages:
        msg_type, msg_content = _get_type_and_content(msg)
        
        # Always skip system messages
        if msg_type == "system":
            continue
        
        # Handle tool messages based on mode
        if msg_type == "tool":
            if for_display or skip_mode:
                continue  # Strip for display, or skip in polluted turn
            else:
                cleaned.append(msg)  # Keep for LLM — needed for tool_call flow
                continue
        
        # If this is a HumanMessage, decide whether it's clean or polluted
        if msg_type == "human":
            if _is_polluted(msg_content):
                skip_mode = True
                continue
            else:
                skip_mode = False
                cleaned.append(msg)
                continue
        
        # For AI messages
        if msg_type == "ai":
            if skip_mode:
                continue  # This AI response was to a polluted prompt — discard
            
            # For display mode: skip AIMessages with empty content (intermediate tool_call messages)
            if for_display:
                text_content = ""
                if isinstance(msg_content, str):
                    text_content = msg_content.strip()
                elif isinstance(msg_content, list):
                    # Extract text blocks from list content
                    for block in msg_content:
                        if isinstance(block, dict) and "text" in block:
                            text_content += block["text"]
                        elif isinstance(block, str):
                            text_content += block
                
                if not text_content:
                    continue  # Skip empty AI messages in display mode
            
            cleaned.append(msg)
    
    return cleaned



@lru_cache(maxsize=256)  # cache up to 256 unique query embeddings
def generate_embedding(text: str) -> list:
    """Generate (and cache) an embedding for the given text."""
    return embeddings.embed_query(text)


def search_in_vectordb(query: str) -> list[dict]:
    """Search MongoDB vector index. Reuses the shared client."""
    query_embedding = generate_embedding(query)
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "queryVector": query_embedding,
                "path": "embedding",
                "numCandidates": 100,
                "limit": 5,
            }
        },
        {"$project": {"_id": 0, "text": 1}},
    ]
    results = _mongo_collection.aggregate(pipeline)
    return [doc for doc in results]


def _run_pg_query(sql: str, params: tuple):
    """Execute a single read query using the connection pool."""
    conn = _pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()
    finally:
        _pg_pool.putconn(conn)  # always return to pool


def get_user_profile(user_id: int):
    return _run_pg_query(
        "SELECT startup_idea, age, gender, category, location, funding_status "
        "FROM startup_forms WHERE user_id = %s",
        (user_id,),
    )


def get_user_roadmap(user_id: int):
    return _run_pg_query(
        "SELECT roadmap FROM roadmaps WHERE user_id = %s",
        (user_id,),
    )


def web_search(state: QueryAgentState) -> dict:
    search = TavilyClient()
    results = search.search(state["query"] or "")
    return {"search_results": results}

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
    
    result = llm.invoke(prompt)
    return result
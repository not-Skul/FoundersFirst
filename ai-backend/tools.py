from langchain.tools import tool
from Schema import QueryAgentState
from utils import search_in_vectordb, get_user_profile, get_user_roadmap as utils_get_user_roadmap
from tavily import TavilyClient


@tool
def fetch_schemes_from_vectordb(query: str) -> dict:
    """Fetch relevant schemes based on the user's query."""
    if not query:
        return {"error": "No query provided."}

    results = search_in_vectordb(query)
    return {"search_results": results}


@tool
def scheme_summarizer(state: QueryAgentState) -> dict:
    """Summarize the fetched schemes for the user."""
    results = state.get("search_results")
    if not results:
        return {"error": "No search results to summarize."}

    summarized = "\n".join(
        doc.get("text", "") if isinstance(doc, dict) else str(doc)
        for doc in results
    )
    return {"draft_response": summarized}


@tool
def user_profile_fetcher(user_id: str) -> dict:
    """Fetch user profile information based on user_id."""
    if not user_id:
        return {"error": "No user_id provided."}

    user = get_user_profile(user_id)
    return {"user_profile": user} if user else {"error": "User not found."}

@tool
def get_user_roadmap(user_id: str) -> dict:
    """Fetch the user's roadmap based on user_id."""
    if not user_id:
        return {"error": "No user_id provided."}
    
    roadmap = utils_get_user_roadmap(int(user_id))
    return {"user_roadmap": roadmap} if roadmap else {"error": "Roadmap not found."}

@tool
def web_search(query: str) -> dict:
    """Perform a web search using Tavily and store results in state"""
    search = TavilyClient()
    results = search.search(query or "")
    return {"search_results": results}
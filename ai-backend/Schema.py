from typing_extensions import TypedDict, Literal,Annotated
from pydantic import BaseModel
from operator import add

# Define the structure for email classification
class QueryClassification(TypedDict):
    intent: Literal["roadmap_related","schemes_related"]
    summary: str

class ResponseCategory(BaseModel):
    """used to categorize the generated answer into one of the two categories."""
    level: Literal["Satisfactory", "Needs_Tool"]
    

class QueryAgentState(TypedDict):
    # Raw query data
    user_id: int | None
    query: str | None

    # Classification result
    classification: QueryClassification | None
    level:str
    iteration_count: int
    tool_iteration_count: int
    # Raw search/API results
    search_results: list[str] | None  # List of raw document chunks

    # Generated content
    draft_response: str | None
    messages: Annotated[list[str], add]
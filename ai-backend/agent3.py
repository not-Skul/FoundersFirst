"""
agent3.py — Optimized LangGraph agent (v3).

Improvements over agent.py / agent2.py:
  ✓ Proper SystemMessage usage (not HumanMessage hack)
  ✓ No evaluator loop — standard reactive agent pattern (agent → tools → agent → END)
  ✓ Tool iteration counter resets per user turn (not accumulated across turns)
  ✓ Clean message storage — HumanMessage + AIMessage only in checkpointer
    (ToolMessages are ephemeral, never persisted to state)
  ✓ Frontend retrieval is trivial: just read messages, filter by type
  ✓ Robust error handling for LLM and tool failures
  ✓ Groq rate limiter included
  ✓ All tools available (including web_search)
  ✓ No fragile keyword-based cleanup needed

Architecture:
  START → agent → [tool_calls?] → tools → agent (loop)
  START → agent → [no tool_calls] → END

Message Storage Strategy:
  - HumanMessage(user query) is added by the caller (app.py) — persisted in checkpointer
  - SystemMessage is injected at LLM invocation time ONLY — never persisted
  - AIMessage(final text response) is persisted to state — visible to frontend
  - ToolMessages from tool execution are used within the turn but NOT persisted
    to the main message list. Instead, we track them in a separate ephemeral list
    (`_tool_messages`) that resets each turn.

This means `state["messages"]` will ONLY contain a clean alternating sequence of:
    HumanMessage → AIMessage → HumanMessage → AIMessage → ...

Perfect for frontend rendering with zero post-processing.
"""

import logging
import os
from operator import add
from typing import Annotated, Any

import httpx
from dotenv import load_dotenv
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.rate_limiters import InMemoryRateLimiter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode

from tools import (
    fetch_schemes_from_vectordb,
    get_user_roadmap,
    user_profile_fetcher,
    web_search,
)

# ---------------------------------------------------------------------------
# Logging & env
# ---------------------------------------------------------------------------
load_dotenv()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_TOOL_ROUNDS = 5  # Max agent→tools round-trips per user turn

# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------
tools = [user_profile_fetcher, get_user_roadmap, fetch_schemes_from_vectordb, web_search]
tool_node = ToolNode(tools=tools)

# ---------------------------------------------------------------------------
# LLMs
# ---------------------------------------------------------------------------

# Gemini — primary agent LLM
gemini_rate_limiter = InMemoryRateLimiter(requests_per_second=14 / 60)
_gemini_with_tools = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    request_timeout=10,
    max_retries=1,
    rate_limiter=gemini_rate_limiter,
).bind_tools(tools)

# Bare Gemini — used when we need to force a final answer (no tool bindings)
_gemini_bare = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash-lite",
    request_timeout=10,
    max_retries=1,
    rate_limiter=gemini_rate_limiter,
)

# Groq — fallback agent LLM
groq_rate_limiter = InMemoryRateLimiter(requests_per_second=25 / 60)
_groq_with_tools = ChatGroq(
    model="llama-3.1-8b-instant",
    request_timeout=15,
    rate_limiter=groq_rate_limiter,
).bind_tools(tools)

_groq_bare = ChatGroq(
    model="llama-3.1-8b-instant",
    request_timeout=15,
    rate_limiter=groq_rate_limiter,
)


# ---------------------------------------------------------------------------
# State Schema
# ---------------------------------------------------------------------------
# `messages` uses `Annotated[list, add]` so that each graph.invoke() APPENDS
# new messages to the checkpointer instead of replacing the entire list.
# This is critical for conversation memory across user turns.
#
# `_tool_messages` uses a plain `list` (replace semantics) because it's
# ephemeral — reset to [] at the start of each user turn via invoke input.

from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    LangGraph state for the v3 agent.

    Fields:
        messages: Clean conversation history — ONLY HumanMessage and AIMessage.
                  Uses Annotated[list, add] so each invoke APPENDS to history.
                  This is what the frontend reads directly.

        _tool_messages: Ephemeral tool call/result messages for the CURRENT turn
                        only. Uses plain list (replace semantics). Reset to []
                        at the start of each invoke by the caller.

        query: The current user query (convenience copy).
        user_id: The authenticated user's ID for tool calls.
        _tool_round: Counter for agent→tools round-trips THIS turn.
                     Reset each turn to prevent cross-turn accumulation.
    """
    messages: Annotated[list, add]   # Append-only: HumanMessage + AIMessage
    _tool_messages: list             # Replace: ephemeral tool context
    query: str
    user_id: str
    _tool_round: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_system_prompt(user_id: str) -> str:
    """Build the ephemeral system prompt. Never stored in state."""
    return f"""You are a helpful startup advisor assistant. You help founders build and grow their startups.

User ID: {user_id}

Guidelines:
- Pay attention to the conversation history. If the user has already told you their name or details, remember and use them.
- Only call tools when you genuinely need database information (user profile, roadmap, schemes) or web search results.
- Do NOT call tools just to greet the user or answer simple conversational questions.
- Use fetch_schemes_from_vectordb for government scheme queries.
- Use user_profile_fetcher with user_id "{user_id}" for startup profile data.
- Use get_user_roadmap with user_id "{user_id}" for roadmap data.
- Use web_search for current/real-time information.
- Call only ONE tool at a time and wait for results before deciding next steps.
- Answer clearly, concisely, and in a friendly manner."""


def _extract_text_content(msg: AIMessage) -> str:
    """
    Extract plain text from an AIMessage, handling both str and list content formats.

    Some LLMs return content as a list of blocks (e.g., [{"type": "text", "text": "..."}]).
    This normalizes to a plain string.
    """
    content = msg.content
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return " ".join(parts).strip()
    return str(content).strip() if content else ""


# ---------------------------------------------------------------------------
# Node: agent_node
# ---------------------------------------------------------------------------
def agent_node(state: AgentState) -> dict:
    """
    Core LLM node. Builds the full prompt from:
      1. SystemMessage (ephemeral — not persisted)
      2. Clean conversation history (from state["messages"])
      3. Ephemeral tool messages from this turn (from state["_tool_messages"])

    Returns either:
      - An AIMessage with tool_calls → routed to tools node
      - An AIMessage with text content → routed to END; persisted to messages

    Key design decisions:
      - SystemMessage is NEVER added to state — only used in the LLM call
      - Tool-calling AIMessages are stored in _tool_messages (ephemeral), not messages
      - Only the FINAL text AIMessage gets appended to messages (clean history)
      - tool_round resets at the start of each user turn (in build input, not here)
    """
    messages = state.get("messages", [])
    tool_messages = state.get("_tool_messages", [])
    user_id = state.get("user_id", "")
    query = state.get("query", "")
    tool_round = state.get("_tool_round", 0)

    # Build the LLM input: system prompt + clean history + current turn's tool context
    system_msg = SystemMessage(content=_build_system_prompt(user_id))
    llm_input = [system_msg] + messages + tool_messages

    # Choose LLM: if we've hit the tool round cap, use bare LLM (no tool bindings)
    # to force a final text answer.
    force_final = tool_round >= MAX_TOOL_ROUNDS

    if force_final:
        logger.info(
            "Max tool rounds (%d) reached for query '%.50s' — forcing final answer.",
            MAX_TOOL_ROUNDS,
            query,
        )

    # Primary: Gemini. Fallback: Groq.
    primary_llm = _gemini_bare if force_final else _gemini_with_tools
    fallback_llm = _groq_bare if force_final else _groq_with_tools

    try:
        response: AIMessage = primary_llm.invoke(llm_input)
    except (ChatGoogleGenerativeAIError, httpx.TimeoutException, Exception) as exc:
        logger.warning(
            "Primary LLM failed (%s: %s), falling back to Groq.",
            type(exc).__name__,
            str(exc)[:100],
        )
        try:
            response: AIMessage = fallback_llm.invoke(llm_input)
        except Exception as fallback_exc:
            # Both LLMs failed — return a graceful error message
            logger.error(
                "Both LLMs failed. Primary: %s, Fallback: %s",
                str(exc)[:100],
                str(fallback_exc)[:100],
            )
            error_response = AIMessage(
                content="I'm sorry, I'm having trouble processing your request right now. "
                        "Please try again in a moment."
            )
            # With Annotated[list, add], return ONLY the new message to append
            return {
                "messages": [error_response],
                "_tool_messages": [],
                "_tool_round": tool_round,
            }

    # Decision: does the response contain tool calls?
    has_tool_calls = bool(getattr(response, "tool_calls", None))

    if has_tool_calls:
        # Store in ephemeral tool messages — NOT in clean history
        # Return empty messages list → add reducer appends nothing
        return {
            "messages": [],
            "_tool_messages": tool_messages + [response],
            "_tool_round": tool_round,
        }
    else:
        # Final text response — append ONLY this AIMessage to clean history
        text = _extract_text_content(response)
        if not text:
            # Edge case: LLM returned empty content. Provide fallback.
            response = AIMessage(
                content="I apologize, but I wasn't able to generate a response. "
                        "Could you please rephrase your question?"
            )

        return {
            "messages": [response],   # only the new AIMessage is appended
            "_tool_messages": [],     # clear ephemeral data for next turn
            "_tool_round": tool_round,
        }


# ---------------------------------------------------------------------------
# Node: tool_executor_node
# ---------------------------------------------------------------------------
def tool_executor_node(state: AgentState) -> dict:
    """
    Execute tool calls and store results in _tool_messages (ephemeral).

    Also increments _tool_round to track how many agent→tools round-trips
    have happened this turn. This prevents infinite tool loops.

    Tool execution errors are caught and returned as error ToolMessages so
    the agent can see what went wrong and decide how to proceed.
    """
    tool_messages = state.get("_tool_messages", [])
    tool_round = state.get("_tool_round", 0)

    # The last message in _tool_messages should be the AIMessage with tool_calls
    if not tool_messages:
        logger.error("tool_executor_node called but _tool_messages is empty.")
        return {"_tool_round": tool_round + 1}

    last_ai_msg = tool_messages[-1]
    tool_calls = getattr(last_ai_msg, "tool_calls", [])

    if not tool_calls:
        logger.error("tool_executor_node called but last message has no tool_calls.")
        return {"_tool_round": tool_round + 1}

    # Execute each tool call and collect results
    results: list[ToolMessage] = []
    for tc in tool_calls:
        tool_name = tc.get("name", "unknown")
        tool_args = tc.get("args", {})
        tool_id = tc.get("id", "")

        logger.debug("Executing tool '%s' with args: %s", tool_name, str(tool_args)[:200])

        try:
            # Find and invoke the tool
            tool_fn = None
            for t in tools:
                if t.name == tool_name:
                    tool_fn = t
                    break

            if tool_fn is None:
                result_content = f"Error: Unknown tool '{tool_name}'."
                logger.warning("Unknown tool requested: %s", tool_name)
            else:
                result = tool_fn.invoke(tool_args)
                result_content = str(result) if not isinstance(result, str) else result

        except Exception as tool_exc:
            result_content = f"Error executing tool '{tool_name}': {str(tool_exc)}"
            logger.error("Tool '%s' failed: %s", tool_name, str(tool_exc)[:200])

        results.append(
            ToolMessage(content=result_content, tool_call_id=tool_id)
        )

    new_round = tool_round + 1
    logger.debug("Tool round #%d completed (%d results).", new_round, len(results))

    return {
        "_tool_messages": tool_messages + results,
        "_tool_round": new_round,
    }


# ---------------------------------------------------------------------------
# Router: route_after_agent
# ---------------------------------------------------------------------------
def route_after_agent(state: AgentState) -> str:
    """
    Route after the agent node:
      - If the last action produced tool_calls → go to 'tools'
      - Otherwise → END (final answer was produced)

    We check _tool_messages to see if the latest entry is an AIMessage with
    tool_calls (meaning the agent wants to call tools).
    """
    tool_messages = state.get("_tool_messages", [])

    if tool_messages:
        last = tool_messages[-1]
        if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
            return "tools"

    # No pending tool calls — agent produced a final answer
    return END


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------
def build_graph(checkpointer):
    """
    Compile and return the LangGraph app.

    Graph topology:
        START → agent → [tool_calls?] → tools → agent (loop)
        START → agent → [no tool_calls] → END

    No evaluator loop. Simple, predictable, fast.

    Args:
        checkpointer: An initialized PostgresSaver or any LangGraph checkpointer.

    Returns:
        A compiled LangGraph StateGraph ready for .invoke() / .ainvoke().
    """
    graph = StateGraph(AgentState)

    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_executor_node)

    graph.add_edge(START, "agent")
    graph.add_conditional_edges(
        "agent",
        route_after_agent,
        {
            "tools": "tools",
            END: END,
        },
    )
    graph.add_edge("tools", "agent")

    compiled = graph.compile(checkpointer=checkpointer)
    logger.info("LangGraph v3 compiled successfully.")
    return compiled


# ---------------------------------------------------------------------------
# Config helper
# ---------------------------------------------------------------------------
def get_config(thread_id: str) -> dict:
    """
    Return a LangGraph config dict scoped to a specific thread/session.

    Usage:
        config = get_config("user_123")
        result = graph.invoke({...}, config=config)
    """
    return {"configurable": {"thread_id": thread_id}}


# ---------------------------------------------------------------------------
# Message retrieval helper — for frontend rendering
# ---------------------------------------------------------------------------
def get_clean_messages(graph, thread_id: str) -> list[dict]:
    """
    Retrieve clean conversation messages for frontend rendering.

    Because agent3 stores ONLY HumanMessage and AIMessage in state["messages"],
    this function is trivially simple — no fragile keyword filtering needed.

    Returns:
        List of dicts: [{"role": "user"|"assistant", "content": "..."}]
    """
    config = get_config(thread_id)

    try:
        state = graph.get_state(config)
    except Exception as exc:
        logger.error("Failed to retrieve state for thread %s: %s", thread_id, exc)
        return []

    if not state or not state.values or "messages" not in state.values:
        return []

    messages = state.values["messages"]
    result = []

    for msg in messages:
        # Handle LangChain message objects
        if isinstance(msg, HumanMessage):
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            content = content.strip()
            if content:
                result.append({"role": "user", "content": content})

        elif isinstance(msg, AIMessage):
            content = _extract_text_content(msg)
            if content:
                result.append({"role": "assistant", "content": content})

        # Dict-format messages (fallback for edge cases)
        elif isinstance(msg, dict):
            msg_type = msg.get("type", msg.get("role", "")).lower()
            content = (msg.get("content") or "").strip()

            if not content:
                continue

            if msg_type in ("human", "user"):
                result.append({"role": "user", "content": content})
            elif msg_type in ("ai", "assistant"):
                result.append({"role": "assistant", "content": content})

        # Skip everything else (SystemMessage, ToolMessage — should never be here)

    logger.info(
        "Retrieved %d clean messages (from %d raw) for thread '%s'.",
        len(result),
        len(messages),
        thread_id,
    )
    return result

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from db import get_db_connection 
from dotenv import load_dotenv
import jwt
import datetime
import requests
import json
import re
from urllib.parse import quote


load_dotenv()

app = Flask(__name__)

CORS(app)  
bcrypt = Bcrypt(app)
AI_Backend_URL = os.getenv("AI_BACKEND_URL", "http://localhost:7000")

# Load schemes at startup
def load_schemes():
    """Load schemes from the JSON file (must be in the same directory as main.py)."""
    try:
        schemes_path = os.path.join(os.path.dirname(__file__), 'schemes_structured_documents.json')
        if os.path.exists(schemes_path):
            with open(schemes_path, 'r') as f:
                return json.load(f)
        else:
            print("[WARN] schemes_structured_documents.json not found — scheme lookup disabled.")
    except Exception as e:
        print(f"Error loading schemes: {e}")
    return []

SCHEMES_DATABASE = load_schemes()

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")

def get_relevant_schemes(category, idea, limit=5):
    """Retrieve relevant schemes based on startup category and idea"""
    relevant = []
    keywords = (category + " " + idea).lower().split()
    
    for scheme in SCHEMES_DATABASE:
        score = 0
        scheme_text = (
            scheme.get("scheme_name", "") + " " +
            scheme.get("key_sectors", "") + " " +
            scheme.get("brief", "") + " " +
            scheme.get("benefits", "")
        ).lower()
        
        # Score based on keyword matches
        for keyword in keywords:
            if keyword and len(keyword) > 2:
                score += scheme_text.count(keyword)
        
        if score > 0:
            relevant.append({
                "name": scheme.get("scheme_name", ""),
                "ministry": scheme.get("ministry", ""),
                "sectors": scheme.get("key_sectors", ""),
                "benefits": scheme.get("benefits", ""),
                "application_link": scheme.get("application_link", "")
            })
    
    return sorted(relevant, key=lambda x: len(x.get("benefits", "")), reverse=True)[:limit]

def get_user_from_token():
    token = request.headers.get("Authorization")
    if not token:
        return None
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["user_id"]
    except:
        return None


def build_chat_context(user_id, message):
    """
    Build an enriched prompt with user context, roadmap, and relevant schemes.
    
    Args:
        user_id: The user's ID (from JWT token)
        message: The user's question/message
    
    Returns:
        A comprehensive prompt string with all context included
    """
    startup_idea = ""
    user_profile = ""
    roadmap_details = ""
    relevant_schemes = ""
    
    if user_id:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get user's startup form data
        cur.execute("""
            SELECT startup_idea, age, gender, category, location, funding_status
            FROM startup_forms
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
        """, (user_id,))
        
        form_data = cur.fetchone()
        if form_data:
            startup_idea = form_data[0]
            user_profile = f"""
User Profile:
- Startup Idea: {form_data[0]}
- Age: {form_data[1]}
- Gender: {form_data[2]}
- Category: {form_data[3]}
- Location: {form_data[4]}
- Funding Status: {form_data[5]}
"""
            # Get relevant schemes based on category and idea
            schemes_list = get_relevant_schemes(form_data[3], form_data[0])
            if schemes_list:
                relevant_schemes = "\n\nRelevant Government Schemes:\n"
                for i, scheme in enumerate(schemes_list, 1):
                    relevant_schemes += f"""
{i}. {scheme['name']}
   Ministry: {scheme['ministry']}
   Sectors: {scheme['sectors']}
   Benefits: {scheme['benefits'][:200]}...
   Link: {scheme['application_link']}
"""
        
        # Get user's roadmap
        cur.execute("""
            SELECT startup_idea, roadmap
            FROM roadmaps
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
        """, (user_id,))
        
        roadmap_data = cur.fetchone()
        if roadmap_data:
            try:
                roadmap_json = roadmap_data[1]
                if isinstance(roadmap_json, str):
                    roadmap_json = json.loads(roadmap_json)
                
                roadmap_details = "\n\nDetailed Roadmap:\n"
                if isinstance(roadmap_json, list):
                    for phase in roadmap_json:
                        roadmap_details += f"\nPhase {phase.get('phase', 0)}: {phase.get('title', '')}\n"
                        roadmap_details += f"Description: {phase.get('description', '')}\n"
                        tasks = phase.get('tasks', [])
                        if tasks:
                            roadmap_details += "Tasks:\n"
                            for task in tasks:
                                roadmap_details += f"  - {task}\n"
            except Exception as e:
                print(f"Error parsing roadmap: {e}")
        
        cur.close()
        conn.close()
    
    # Construct comprehensive prompt with all contexts
    final_prompt = f"""You are an expert startup advisor and business consultant. You have access to the following information about the founder and their startup:

{user_profile}

{roadmap_details}

{relevant_schemes}

Based on the user's startup idea, profile, roadmap, and available government schemes, provide helpful, practical, and relevant advice. 
When answering questions, directly reference:
1. The specific roadmap phase they should focus on
2. Relevant government schemes that could help them
3. Actionable steps based on their profile and location

User Question: {message}

Provide a focused, practical answer that directly addresses their question using the context provided."""
    
    return final_prompt


@app.route("/roadmap_genration_form" , methods = ["POST"])
def roadmap_genration_form():
    data = request.json 
    user_id = data["user_id"]
    startup_idea = data["startup_idea"]
    age = data["age"]
    gender = data["gender"]
    category = data["category"]
    location = data["location"]
    funding_status = data["funding_status"]

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO startup_forms
        (user_id, startup_idea, age, gender, category, location, funding_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id,
        startup_idea,
        age,
        gender,
        category,
        location,
        funding_status
    ))
    conn.commit()
    cur.close()
    conn.close()
    return ({"message" : "startup form sunmitted successfully"}), 201

@app.route("/health", methods=["GET"])
def health_check():
    """Liveness endpoint for Azure Container Apps health probes."""
    return jsonify({"status": "ok"}), 200


@app.route("/test", methods=["GET"])
def testapi():
    data = requests.get(AI_Backend_URL + "/test")
    return jsonify(data.json()), 200


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    name = data["name"]
    email = data["email"]
    password = data["password"]

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    if cur.fetchone():
        return jsonify({"message": "User already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")

    cur.execute(
        "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
        (name, email, hashed_pw)
    )
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({"message": "Signup successful"}), 201





@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data["email"]
    password = data["password"]

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, password FROM users WHERE email=%s", (email,))
    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if bcrypt.check_password_hash(user[1], password):
        token = jwt.encode({
            "user_id": user[0],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "message": "Login successful",
            "token": token
        }), 200

    return jsonify({"message": "Invalid password"}), 401




@app.route("/chat/stream", methods=["POST"])
def chat_stream():
    """
    Chat endpoint that proxies to the AI backend and returns the complete response.
    
    Sends ONLY the raw user message and user_id to the AI backend.
    The AI agent uses tools to fetch profile/roadmap/scheme context when needed,
    keeping conversation history clean (no system prompt pollution).
    
    Request:
        {
            "message": "user's question or message",
            "context": "optional additional context"
        }
    
    Response:
        {
            "response": "complete AI response text"
        }
    
    Requires Authorization header with valid JWT token.
    """
    try:
        data = request.json
        message = data.get("message", "")
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get user ID from token
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Call AI backend's /chat/stream endpoint
        ai_backend_url = f"{AI_Backend_URL}/chat/stream"
        
        # Send ONLY the raw user message and user_id — NOT the enriched system prompt.
        # The AI agent has tools (user_profile_fetcher, get_user_roadmap,
        # fetch_schemes_from_vectordb) that it uses to fetch context when needed.
        payload = {
            "thread_id": str(user_id),
            "query": message,
            "user_id": str(user_id)
        }
        
        print(f"[CHAT/STREAM] user_id={user_id} | Proxying to AI backend: {ai_backend_url}")
        
        # Get complete response from AI backend
        # timeout=(connect, read): 10s to connect, 5min to wait for AI response
        response = requests.post(
            ai_backend_url,
            json=payload,
            timeout=(10, 300)
        )
        response.raise_for_status()
        
        # Return the complete response as JSON
        ai_response = response.json()
        
        return jsonify({
            "response": ai_response.get("response", ""),
            "thread_id": str(user_id)
        }), 200
        
    except requests.exceptions.ReadTimeout:
        print(f"[CHAT/STREAM] AI backend timed out for user_id={get_user_from_token()}")
        return jsonify({
            "error": "The AI is taking too long to respond. This can happen with complex questions. Please try again with a simpler query, or try again in a moment."
        }), 504
    except requests.exceptions.ConnectionError:
        print(f"[CHAT/STREAM] Cannot reach AI backend at {AI_Backend_URL}")
        return jsonify({
            "error": "The AI service is currently unavailable. Please try again in a few moments."
        }), 502
    except requests.exceptions.RequestException as e:
        print(f"[CHAT/STREAM] Error calling AI backend: {e}")
        return jsonify({"error": "Something went wrong while processing your request. Please try again."}), 500
    except Exception as e:
        print(f"[CHAT/STREAM] Unexpected error: {e}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


@app.route("/chat/history", methods=["GET"])
def get_chat_history():
    """
    Retrieve conversation history for the current user.
    
    This endpoint fetches the message history from the AI backend's PostgreSQL checkpointer,
    allowing the frontend to restore the chat after a page reload.
    
    Returns:
        {
            "messages": [
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."},
                ...
            ],
            "thread_id": "user_123"
        }
    
    Requires Authorization header with valid JWT token.
    """
    try:
        # Get user ID from token
        user_id = get_user_from_token()
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Build thread_id (must match what's used in /chat/stream)
        thread_id = str(user_id)
        
        # Call AI backend to get message history
        ai_backend_url = f"{AI_Backend_URL}/message-history/{thread_id}"
        
        print(f"[HISTORY] user_id={user_id} | Fetching from: {ai_backend_url}")
        
        response = requests.get(ai_backend_url, timeout=10)
        response.raise_for_status()
        
        history_data = response.json()
        
        # Return to frontend
        return jsonify({
            "messages": history_data.get("messages", []),
            "thread_id": thread_id,
            "found": history_data.get("found", False)
        }), 200
        
    except requests.exceptions.RequestException as e:
        print(f"[HISTORY] Error calling AI backend: {e}")
        return jsonify({
            "error": str(e),
            "messages": [],
            "found": False
        }), 500
    except Exception as e:
        print(f"[HISTORY] Unexpected error: {e}")
        return jsonify({
            "error": str(e),
            "messages": [],
            "found": False
        }), 500


@app.route("/chat_with_roadmap", methods=["POST"])
def chat_simple():
    """
    Legacy chat endpoint — now routes to the local AI backend /roadmap/ endpoint.
    Prefer /chat/stream for new implementations.
    """
    data = request.json
    message = data["message"]

    user_id = get_user_from_token()
    final_prompt = build_chat_context(user_id, message)

    ai = requests.get(
        f"{AI_Backend_URL}/roadmap/",
        params={"query": final_prompt},
        timeout=60,
    )
    return jsonify(ai.json())

@app.route("/my-roadmap", methods=["GET"])
def my_roadmap():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT startup_idea, roadmap 
        FROM roadmaps 
        WHERE user_id = %s 
        ORDER BY id DESC 
        LIMIT 1
    """, (user_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return jsonify({"roadmap": []})

    return jsonify({
        "startup_idea": row[0],
        "roadmap": row[1]
    })

@app.route("/generate_roadmap", methods=["POST"])
def generate_roadmap():
    data = request.json
    user_id = get_user_from_token()
    print("USER_ID:", user_id)
    if not user_id:
         return jsonify({"error": "Unauthorized"}), 401
    query = data["query"]
    startup_idea = data.get("startup_idea", "")

    ai = requests.get(
        f"{AI_Backend_URL}/roadmap/",
        params={"query": query},
        timeout=60
    )

    raw = ai.json()
    text = raw["response"]

    clean = re.sub(r"```json|```", "", text).strip()
    clean = re.sub(r"'(\d+)'", r"\1", clean)

    roadmap = json.loads(clean)

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO roadmaps (user_id, startup_idea, roadmap)
        VALUES (%s, %s, %s)
        RETURNING id
    """, (user_id, startup_idea, json.dumps(roadmap)))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        "roadmap": roadmap
    }), 200


@app.route("/startup/idea", methods=["PUT"])
def update_startup_idea():
    user_id = get_user_from_token()
    if not user_id:
         return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    new_idea = data.get("new_idea")
    if not new_idea:
        return jsonify({"error": "No idea provided"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT age, gender, category, location, funding_status 
        FROM startup_forms 
        WHERE user_id = %s 
        ORDER BY id DESC LIMIT 1
    """, (user_id,))
    form_data = cur.fetchone()
    
    if form_data:
        cur.execute("""
            UPDATE startup_forms 
            SET startup_idea = %s 
            WHERE user_id = %s AND id = (
                SELECT max(id) FROM startup_forms WHERE user_id = %s
            )
        """, (new_idea, user_id, user_id))
        conn.commit()

        age, gender, category, location, funding_status = form_data
        query = f"I am {age} years old {gender}. I want to build {new_idea}. My category is {category}, located in {location}. Funding status: {funding_status}."
    else:
        cur.close()
        conn.close()
        return jsonify({"error": "No startup form found for user"}), 404

    try:
        ai = requests.get(
            f"{AI_Backend_URL}/roadmap/",
            params={"query": query},
            timeout=80,
        )
        raw = ai.json()
        text = raw["response"]
        clean = re.sub(r"```json|```", "", text).strip()
        clean = re.sub(r"'(\d+)'", r"\1", clean)
        roadmap = json.loads(clean)

        cur.execute("""
            INSERT INTO roadmaps (user_id, startup_idea, roadmap)
            VALUES (%s, %s, %s)
            RETURNING id
        """, (user_id, new_idea, json.dumps(roadmap)))

        # Clear old progress since it's a new roadmap
        cur.execute("DELETE FROM roadmap_progress WHERE user_id = %s", (user_id,))
        conn.commit()
    except Exception as e:
        print("Error generating roadmap:", e)
        cur.close()
        conn.close()
        return jsonify({"error": "Failed to regenerate roadmap"}), 500

    cur.close()
    conn.close()
    return jsonify({"message": "Startup idea updated", "roadmap": roadmap}), 200


@app.route("/roadmap/progress", methods=["GET"])
def get_roadmap_progress():
    user_id = get_user_from_token()
    if not user_id:
         return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT completed_steps, current_phase_index 
        FROM roadmap_progress 
        WHERE user_id = %s
    """, (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return jsonify({"completedSteps": row[0], "currentPhaseIndex": row[1]}), 200
    return jsonify({"completedSteps": [], "currentPhaseIndex": 0}), 200


@app.route("/roadmap/progress", methods=["POST"])
def update_roadmap_progress():
    user_id = get_user_from_token()
    if not user_id:
         return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    completed_steps = data.get("completedSteps", [])
    current_phase_index = data.get("currentPhaseIndex", 0)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO roadmap_progress (user_id, completed_steps, current_phase_index)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            completed_steps = EXCLUDED.completed_steps,
            current_phase_index = EXCLUDED.current_phase_index,
            last_updated = CURRENT_TIMESTAMP
    """, (user_id, json.dumps(completed_steps), current_phase_index))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "Progress saved"}), 200


@app.route("/user-profile", methods=["GET"])
def get_user_profile():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, name, email FROM users WHERE id=%s", (user_id,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": str(user[0]),
        "displayName": user[1],
        "email": user[2]
    }), 200


if __name__ == "__main__":
    # For local development only — production uses gunicorn via Dockerfile CMD
    app.run(debug=False, host="0.0.0.0", port=5000)

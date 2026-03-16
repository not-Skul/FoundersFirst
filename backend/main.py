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

#for loading .env file
load_dotenv()

app = Flask(__name__)
#for cross origin communication 
CORS(app)  
bcrypt = Bcrypt(app)
AI_Backend_URL = "http://127.0.0.1:8001"

# Load schemes at startup
def load_schemes():
    """Load schemes from the JSON file"""
    try:
        schemes_path = os.path.join(os.path.dirname(__file__), '..', 'ai-backend', 'schemes_structured_documents.json')
        if os.path.exists(schemes_path):
            with open(schemes_path, 'r') as f:
                return json.load(f)
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

@app.route("/test",methods = ["GET"])
def testapi():
    data= requests.get("https://aibackend.thankfulriver-53eeedbe.southeastasia.azurecontainerapps.io" + "/test")
    return jsonify(data.json()), 200

#signup api where all the three variables fetching data from the data which is requested by the frontend and simply saving the data into the database.
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


#here the login method is created which will fetch the email and password 
#and then check the database for the same and if they match it will allow you otherwise give you error


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


@app.route("/chat_with_roadmap", methods=["POST"])
def chat_simple():
    data = request.json
    message = data["message"]
    context = data.get("context", "")
    
    # Get user ID from token
    user_id = get_user_from_token()
    
    # Initialize full context
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

    encoded = quote(final_prompt)

    url = "https://aibackend.thankfulriver-53eeedbe.southeastasia.azurecontainerapps.io/rag/" + encoded

    ai = requests.get(url, timeout=60)

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
    # user_id = data.get("user_id", 1)
    user_id = get_user_from_token()
    print("USER_ID:", user_id)
    if not user_id:
         return jsonify({"error": "Unauthorized"}), 401
    query = data["query"]
    startup_idea = data.get("startup_idea", "")

    ai = requests.get(
        "https://aibackend.thankfulriver-53eeedbe.southeastasia.azurecontainerapps.io/roadmap/",
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
    app.run(debug=True)

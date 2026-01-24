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


SECRET_KEY = "supersecretkey"  

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
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
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

    final_prompt = f"""
    Roadmap Summary:
    {context}

    User Question:
    {message}
    """

    encoded = quote(final_prompt)

    url = "https://aibackend.thankfulriver-53eeedbe.southeastasia.azurecontainerapps.io/rag/" + encoded

    ai = requests.get(url, timeout=60)

    return jsonify(ai.json())

@app.route("/generate_roadmap", methods=["POST"])
def generate_roadmap():
    data = request.json
    query = data["query"]

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

    return jsonify({"roadmap": roadmap}), 200

if __name__ == "__main__":
    app.run(debug=True)

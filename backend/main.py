from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from db import get_db_connection 
from dotenv import load_dotenv
import jwt
import datetime

#for loading .env file
load_dotenv()

app = Flask(__name__)
#for cross origin communication 
CORS(app)  
bcrypt = Bcrypt(app)


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


SECRET_KEY = "supersecretkey"  # move to .env later

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


if __name__ == "__main__":
    app.run(debug=True)

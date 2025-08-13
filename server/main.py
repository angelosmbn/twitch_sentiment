from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import time
import json
import socket
import logging
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import threading
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timezone
import google.generativeai as genai
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import DESCENDING
import random
import string
import smtplib
from email.mime.text import MIMEText
import email.utils
import secrets
from urllib.parse import urlencode
from werkzeug.utils import secure_filename
import gridfs
# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# Logging setup
logging.basicConfig(level=logging.INFO)

# MongoDB Setup
client = MongoClient("mongodb://localhost:27017/")
db = client["twitch_sentiment_db"]
chat_collection = db["chat_messages"]
users_collection = db["users"]
logs_collection = db["logs"]

# Sentiment model
model_name = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# Twitch IRC setup
SERVER = os.getenv("TWITCH_SERVER", "irc.chat.twitch.tv")
PORT = int(os.getenv("TWITCH_PORT", 6667))
TOKEN = os.getenv("TWITCH_TOKEN")
NICKNAME = os.getenv("TWITCH_NICKNAME")

# Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Global connection state and thread management
current_channel = None
current_socket = None
is_connected = False
reader_thread = None
reader_thread_lock = threading.Lock()

def read_twitch_messages(sock, channel_name):
    buffer = ""
    sock.settimeout(5)
    last_message_time = time.time()

    while True:
        try:
            response = sock.recv(2048).decode('utf-8')
            if not response:
                raise ConnectionError("Socket closed")

            last_message_time = time.time()
            buffer += response

            while '\r\n' in buffer:
                line, buffer = buffer.split('\r\n', 1)

                if line.startswith('PING'):
                    sock.send("PONG :tmi.twitch.tv\r\n".encode('utf-8'))
                    continue


                parts = line.split(' ', 3)
                if len(parts) > 3 and parts[1] == 'PRIVMSG':
                    username = parts[0].split('!')[0][1:]
                    message = parts[3][1:]

                    if not message.strip():
                        continue

                    inputs = tokenizer(message, return_tensors="pt")
                    with torch.no_grad():
                        outputs = model(**inputs)
                        probs = F.softmax(outputs.logits, dim=1)

                    labels = ['Negative', 'Neutral', 'Positive']
                    predicted_class = torch.argmax(probs).item()

                    yield {
                        "username": username,
                        "message": message,
                        "sentiment": labels[predicted_class],
                        "confidence": " / ".join(
                            [f"{label}: {round(prob.item(), 2)}" for label, prob in zip(labels, probs[0]) ]
                        ),
                        "streamer": channel_name
                    }

        except (socket.timeout, socket.error, OSError, ConnectionError):
            raise   



@app.route('/api/start', methods=['POST'])
def start_stream():
    global reader_thread, is_connected, current_socket, current_channel

    data = request.json
    twitch_url = data.get('url', '')
    # Accept both normal Twitch URLs and raid URLs (e.g., https://www.twitch.tv/raid/username)
    import re

    # Regex to match both /twitch.tv/<username> and /twitch.tv/raid/<username>
    match = re.match(r'https://www\.twitch\.tv/(raid/)?([A-Za-z0-9_]+)', twitch_url)
    if not match:
        return jsonify({'error': 'Invalid Twitch URL'}), 400

    username = match.group(2)

    if is_connected and current_channel == username:
        return jsonify({'message': f'Already connected to #{username}'}), 200

    # Disconnect previous connection if any
    if is_connected and current_socket:
        try:
            current_socket.close()
        except Exception as e:
            logging.error(f"Error closing previous socket: {e}")

    current_channel = username
    is_connected = False
    current_socket = None

    activity = "Started Stream Sentiment"
    user_id = data.get("userId", "Unknown")
    details = f"Started streaming sentiment analysis for streamer: {current_channel}"
    
    log_activity(activity, user_id, details)

    threading.Thread(target=connect_and_stream, args=(username,), daemon=True).start()
    return jsonify({'message': f'Streaming from #{username}'}), 200

@app.route('/api/sentiment/stream')
def stream_sentiment():
    def event_stream():
        global current_socket, current_channel, is_connected

        reconnect_wait_seconds = 10
        reconnect_start_time = None
        notified_no_internet = False

        while True:
            try:
                if not is_connected or not current_socket:
                    logging.warning("Waiting for active connection...")

                    # Only try to reconnect after waiting for reconnect_wait_seconds
                    if reconnect_start_time is None:
                        reconnect_start_time = time.time()

                    # Attempt to reconnect until the reconnect time limit
                    if time.time() - reconnect_start_time < reconnect_wait_seconds:
                        logging.info(f"Attempting reconnect, elapsed: {time.time() - reconnect_start_time:.1f}s")
                        time.sleep(1)  # Wait for a second before next retry

                        # Try reconnecting silently
                        try:
                            sock = socket.socket()
                            sock.settimeout(5)
                            sock.connect((SERVER, PORT))
                            sock.send(f"PASS {TOKEN}\n".encode('utf-8'))
                            sock.send(f"NICK {NICKNAME}\n".encode('utf-8'))
                            sock.send(f"JOIN #{current_channel}\n".encode('utf-8'))
                            current_socket = sock
                            is_connected = True
                            logging.info("Reconnected to Twitch IRC silently.")
                            reconnect_start_time = None
                            yield f"data: {json.dumps({'status': 'Reconnected'})}\n\n"
                            continue  # resume streaming once reconnected
                        except Exception as err:
                            logging.debug(f"Silent reconnect failed: {err}")
                            # Silent reconnect failed, continue retrying for a few more seconds

                    else:
                        # If reconnection attempts have been unsuccessful for more than reconnect_wait_seconds
                        if not notified_no_internet:
                            yield f"data: {json.dumps({'error': 'No internet connection'})}\n\n"
                            notified_no_internet = True
                            is_connected = False
                        time.sleep(5)  # Wait before trying again to avoid busy-looping
                        continue

                # Reset reconnect notification when connected and read Twitch messages
                reconnect_start_time = None
                notified_no_internet = False

                for message in read_twitch_messages(current_socket, current_channel):
                    yield f"data: {json.dumps(message)}\n\n"

            except Exception as e:
                logging.warning(f"Connection error: {e}")

                # After an error, try to reconnect or handle it
                time.sleep(1)  # Avoid a tight loop in case of errors

    return Response(event_stream(), mimetype='text/event-stream')

@app.route("/save-chat", methods=["OPTIONS"])
def save_chat_options():
    response = jsonify({"status": "ok"})
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response

@app.route("/save-chat", methods=["POST"])
def save_chat():
    payload = request.json
    streamer_name = payload.get("streamer", "unknown")
    session_id = payload.get("sessionId", "unknown")
    messages = payload.get("messages", [])
    user_id = payload.get("userId", "unknown")
    top_chatters = payload.get("topChatters", {})  # Extracting top chatters from the payload

    # Validate messages format
    if not messages or not isinstance(messages, list):
        return jsonify({"error": "Invalid data format"}), 400

    # Initialize sentiment counts and top chatters tracking
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}

    # Process messages for sentiment and top chatter counts
    for message in messages:
        sentiment = message.get("sentiment", "").lower()
        username = message.get("username", "unknown")

        if sentiment in sentiment_counts:
            sentiment_counts[sentiment] += 1

    total_chats = len(messages)
    sentiment_percentages = {k: round((v / total_chats) * 100, 2) for k, v in sentiment_counts.items()}

    # Generate summary using Gemini AI
    summary = generate_summary_with_gemini(streamer_name, total_chats, sentiment_counts, sentiment_percentages)

    # Prepare data for saving
    summary_data = {
        "user_id": user_id,
        "streamer_name": streamer_name,
        "session_id": session_id,
        "date": datetime.now(timezone.utc),
        "total_chats": total_chats,
        "sentiment_counts": sentiment_counts,
        "sentiment_percentages": sentiment_percentages,
        "top_chatters": top_chatters,  # Save top chatters data
        "summary": summary,  # Save the AI summary
        "is_hidden": False  # Default to not hidden
    }

    try:
        # Save to MongoDB, using replace_one for upsert functionality
        chat_collection.replace_one(
            {"streamer_name": streamer_name, "session_id": session_id},
            summary_data,
            upsert=True
        )
        logging.info(f"Chat session saved: {streamer_name} ({session_id})")

        activity = "Saved stream sentiment"
        user_id = payload.get("saver_id", "unknown")
        details = f"Saved stream sentiment for streamer: {current_channel}"
        
        log_activity(activity, user_id, details)
        
        return jsonify({"status": "saved", "streamer": streamer_name}), 201
    except Exception as e:
        logging.error(f"Failed to save chat session: {e}")
        return jsonify({"error": "Failed to save chat"}), 500


def generate_summary_with_gemini(streamer_name, total_chats, sentiment_counts, sentiment_percentages):
    prompt = f"""
Generate a brief (maximum 5 sentences) summary of this Twitch stream's chat sentiment analysis.
Do not speculate, only describe what the numbers show.

Streamer: {streamer_name}
Total Chat Messages: {total_chats}

Sentiment Counts:
- Positive: {sentiment_counts['positive']}
- Neutral: {sentiment_counts['neutral']}
- Negative: {sentiment_counts['negative']}

Sentiment Percentages:
- Positive: {sentiment_percentages['positive']}%
- Neutral: {sentiment_percentages['neutral']}%
- Negative: {sentiment_percentages['negative']}%
"""

    try:
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logging.error(f"Gemini API failed: {e}")
        return "Summary generation failed due to API quota limits or connectivity issues."

@app.route("/api/history", methods=["GET"])
def get_all_history():
    try:
        user_id = request.args.get('user_id')
        admin_mode = request.args.get('adminMode', 'false')
        if not user_id:
            logging.error("User ID is missing in the request")
            return jsonify({"error": "User ID is required"}), 400

        # Determine if adminMode is true (accepts string "true" or boolean True)
        is_admin = str(admin_mode).lower() == "true"

        # Build the query
        query = {"is_hidden": False}
        if not is_admin:
            query["user_id"] = user_id

        # Modify the query to include `top_chatters`
        sessions = chat_collection.find(query, {
            "_id": 1,
            "streamer_name": 1,
            "date": 1,
            "total_chats": 1,
            "summary": 1,
            "sentiment_counts": 1,
            "sentiment_percentages": 1,
            "top_chatters": 1,  # Include top_chatters in the 
            "user_id": 1
        }).sort("date", -1)

        sessions_list = []
        for session in sessions:
            session["_id"] = str(session["_id"])  # Ensure the session ID is a string

            user_id = ObjectId(session["user_id"])
            user_full_name = user_id  # Default to user_id if no user is found
            
            # Check if the user_id is a valid ObjectId before using it in the query
            if user_id and ObjectId.is_valid(user_id):
                # First, try to find the user by ObjectId directly
                user = users_collection.find_one({"_id": user_id})
                
                # If user is not found, log or handle it
                if not user:
                    session["user_full_name"] = "User not found"  # Fallback message

                # If user is found, extract the name
                if user:
                    f_name = user.get("first_name", "")
                    l_name = user.get("last_name", "")
                    user_full_name = f"{f_name} {l_name}".strip()
                    session["user_full_name"] = user_full_name
            
            # Ensure top_chatters is provided, even if empty (fallback)
            session["top_chatters"] = session.get("top_chatters", {"Positive": [], "Neutral": [], "Negative": []})
            sessions_list.append(session)

        return jsonify(sessions_list)
    except Exception as e:
        logging.error(f"Failed to fetch history: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/history/<session_id>", methods=["GET"])
def get_history_detail(session_id):
    try:
        # Retrieve the session from the database
        session = chat_collection.find_one({"_id": ObjectId(session_id), "is_hidden": False})  # Exclude hidden sessions
        
        if not session:
            return jsonify({"error": "Session not found"}), 404

        # Add the _id as a string for easier handling on the frontend
        session["_id"] = str(session["_id"])

        # Add totalChats for each top chatter
        top_chatters = session.get("top_chatters", {})

        # Loop through the sentiments and add the total chats
        for sentiment in top_chatters:
            for chatter in top_chatters[sentiment]:
                # Add totalChats field (if it's not already included in the original data)
                total_chats = sum([chatter.get(s, 0) for s in ['positive', 'neutral', 'negative']])
                chatter["totalChats"] = total_chats

        # Return the session with updated top chatters information
        return jsonify(session)
    except Exception as e:
        logging.error(f"Error processing session ID {session_id}: {e}")
        return jsonify({"error": "Invalid session ID"}), 400


@app.route("/api/history/delete", methods=["POST"])
def delete_sessions():
    try:
        data = request.json
        ids = data.get("ids", [])

        if not ids:
            return jsonify({"error": "No IDs provided"}), 400

        object_ids = [ObjectId(i) for i in ids]
        result = chat_collection.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": {"is_hidden": True}}  # Mark as hidden
        )

        get_name = chat_collection.find(
            {"_id": {"$in": object_ids}},
            {"streamer_name": 1}  # Only retrieve the streamer_name field
        )
        streamer_name = [doc.get("streamer_name", "Unknown") for doc in get_name]
        streamer_name_str = ", ".join(streamer_name)
        logging.info(f"Marked {result.modified_count} documents as hidden.")

        activity = "Deleted History"
        user_id = data.get("user_id", "Unknown")
        details = f"Deleted history for streamer: {streamer_name_str}"
        
        log_activity(activity, user_id, details)
        return jsonify({"hidden": result.modified_count}), 200

    except Exception as e:
        logging.error(f"Delete failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Auth
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.json
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    password = data.get("password", "")
    email = data.get("email", "").strip()
    role = data.get("role", "employee").strip()  # Set default role to "employee"
    status = data.get("status", "active").strip()

    # Check if all fields are provided
    if not all([first_name, last_name, password, email]):
        return jsonify({"error": "All fields are required."}), 400

    # Validate email format (basic validation)
    if "@" not in email or "." not in email:
        return jsonify({"error": "Invalid email format."}), 400

    user_collection = db["users"]

    # Check if the email already exists
    if user_collection.find_one({"email": email}):
        return jsonify({"error": "Email already exists."}), 409

    # Hash the password before storing it in the database
    hashed_password = generate_password_hash(password)

    # Insert the new user into the database, including the role
    user_id = user_collection.insert_one({
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": hashed_password,
        "role": role,  # Add the role field
        "status": status
    }).inserted_id

    activity = "Signed up"
    user_id = user_id
    log_activity(activity, user_id, details=None)

    # Respond with a success message
    return jsonify({"message": "User created successfully."}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = users_collection.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    # Ensure user status is active
    if user.get("status", "active") != "active":
        return jsonify({"error": "Account is not active."}), 403

    # Get profile image if exists
    profile_image_url = None
    if user.get("profile_image"):
        file_id = user["profile_image"]
        profile_image_url = f"http://localhost:8080/api/user/profile-image/{file_id}"

    user_data = {
        "id": str(user["_id"]),
        "username": user["username"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "email": user["email"],  # Ensure email is included
        "role": user["role"],
        "profile_image": profile_image_url
    }
    activity = "Logged in"
    user_id = user["_id"]
    log_activity(activity, user_id, details=None)

    return jsonify({"user": user_data}), 200


def connect_and_stream(channel_name):
    global current_socket, is_connected, current_channel
    try:
        sock = socket.socket()
        sock.settimeout(5)  # Add timeout
        sock.connect((SERVER, PORT))
        sock.send(f"PASS {TOKEN}\n".encode('utf-8'))
        sock.send(f"NICK {NICKNAME}\n".encode('utf-8'))
        sock.send(f"JOIN #{channel_name}\n".encode('utf-8'))
        current_socket = sock
        current_channel = channel_name
        is_connected = True
        logging.info(f"Connected to Twitch channel #{channel_name}")
    except Exception as e:
        logging.error(f"Error connecting to Twitch IRC: {e}")
        is_connected = False
        current_socket = None
        current_channel = None

@app.route("/api/users", methods=["GET"])
def get_users():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            logging.error("User ID is missing in the request")
            return jsonify({"error": "User ID is required"}), 400

        logging.info(f"Received user_id: {user_id}")
        # Check if user_id is a valid ObjectId
        if not ObjectId.is_valid(user_id):
            logging.error(f"Invalid ObjectId format for user_id: {user_id}")
            return jsonify({"error": "Invalid user ID format"}), 400

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logging.error(f"User not found with user_id: {user_id}")
            return jsonify({"error": "User not found"}), 404

        if user["role"] != "admin":
            logging.error(f"Unauthorized access attempt by user_id: {user_id}")
            return jsonify({"error": "You are not authorized to access this resource."}), 403

        # Fetch all users, excluding password field
        users = users_collection.find({}, {"password": 0})  # Exclude password field
        users_list = []

        # Convert each user and their _id to string
        for u in users:
            u["_id"] = str(u["_id"])  # Convert ObjectId to string
            users_list.append(u)

        logging.info(f"Found {len(users_list)} users")
        return jsonify(users_list), 200

    except Exception as e:
        logging.error(f"Error fetching users: {e}")
        return jsonify({"error": "Internal server error"}), 500



# Fetch user by ID
@app.route("/api/users/<user_id>", methods=["GET"])
def get_user_by_id(user_id):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})  # Exclude password
        if not user:
            return jsonify({"error": "User not found"}), 404

        user["_id"] = str(user["_id"])  # Convert ObjectId to string
        return jsonify(user), 200
    except Exception as e:
        logging.error(f"Error fetching user by ID {user_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/users/edit/<user_id>", methods=["PUT"])
def edit_user(user_id):
    try:
        # Get the user data from the request body
        data = request.get_json()
        
        # Check if user_id is valid
        if not ObjectId.is_valid(user_id):
            logging.error(f"Invalid ObjectId format for user_id: {user_id}")
            return jsonify({"error": "Invalid user ID format"}), 400
        
        # Fetch the current user to check if the editing user is authorized
        current_user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not current_user:
            logging.error(f"User not found with user_id: {user_id}")
            return jsonify({"error": "User not found"}), 404
        
        # Only allow admin to edit user details
        # if current_user["role"] != "admin":
        #     logging.error(f"Unauthorized access attempt by user_id: {user_id}-{current_user["role"]}")
        #     return jsonify({"error": "You are not authorized to edit this user."}), 403

        # Validate required fields (you can add more validation as needed)
        if "first_name" not in data or "last_name" not in data or "email" not in data:
            logging.error(f"Missing required fields in the request")
            return jsonify({"error": "Missing required fields"}), 400

        # Prepare the update document
        update_fields = {}
        if "first_name" in data:
            update_fields["first_name"] = data["first_name"]
        if "last_name" in data:
            update_fields["last_name"] = data["last_name"]
        if "email" in data:
            update_fields["email"] = data["email"]
        if "role" in data and data["role"] in ["employee", "admin"]:
            update_fields["role"] = data["role"]
        if "status" in data and data["status"] in ["active", "inactive"]:
            update_fields["status"] = data["status"]

        # Update the user in the database
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )

        # Ensure that at least one document was updated
        if result.matched_count == 0:
            logging.error(f"Failed to update user with user_id: {user_id}")
            return jsonify({"error": "Failed to update user"}), 500

        # Fetch updated user data to return
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
        updated_user["_id"] = str(updated_user["_id"])  # Convert ObjectId to string

        activity = "Admin Edited User Information"
        editor_user_id = data.get("userId", "Unknown")
        details = f"Admin edited user details of {data.get('first_name', 'Unknown')} {data.get('last_name', 'Unknown')}"
        
        log_activity(activity, editor_user_id, details)

        logging.info(f"User with user_id: {user_id} updated successfully")
        return jsonify(updated_user), 200

    except Exception as e:
        logging.error(f"Error editing user with user_id {user_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route('/healthz')
def health_check():
    return 'OK', 200

def is_internet_available():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False

@app.route("/api/user/update", methods=["PUT"])
def update_user_info():
    try:
        # Get the data from the request body
        data = request.json
        user_id = data.get("user_id")
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        username = data.get("username")

        if not all([user_id, first_name, last_name, email, username]):
            return jsonify({"error": "All fields are required."}), 400

        # Check if the username or email already exists
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            return jsonify({"error": "User not found."}), 404

        # Check for unique email and username
        if users_collection.find_one({"email": email, "_id": {"$ne": ObjectId(user_id)}}):
            return jsonify({"error": "Email already exists."}), 409

        if users_collection.find_one({"username": username, "_id": {"$ne": ObjectId(user_id)}}):
            return jsonify({"error": "Username already exists."}), 409

        # Update the user data in the database
        updated_data = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "username": username
        }

        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": updated_data})

        activity = "Changed Personal Information"
        user_id = data.get("user_id", "Unknown")
        details = None
        
        log_activity(activity, user_id, details)

        return jsonify({"message": "User information updated successfully."}), 200

    except Exception as e:
        logging.error(f"Error updating user info: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/user/change-password", methods=["PUT"])
def change_password():
    try:
        # Get data from the request
        data = request.json
        user_id = data.get("user_id")
        old_password = data.get("old_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        if not all([user_id, old_password, new_password, confirm_password]):
            return jsonify({"error": "All fields are required."}), 400

        if new_password != confirm_password:
            return jsonify({"error": "Passwords do not match."}), 400

        # Check if user exists and verify old password
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user or not check_password_hash(user["password"], old_password):
            return jsonify({"error": "Invalid old password."}), 401

        # Hash the new password
        hashed_password = generate_password_hash(new_password)

        # Update the password in the database
        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"password": hashed_password}})

        activity = "Changed Password"
        user_id = data.get("user_id", "Unknown")
        details = None
        
        log_activity(activity, user_id, details)

        return jsonify({"message": "Password updated successfully."}), 200

    except Exception as e:
        logging.error(f"Error changing password: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/user/check-old-password", methods=["POST"])
def check_old_password():
    try:
        # Get data from the request body
        data = request.json
        user_id = data.get("user_id")
        old_password = data.get("old_password")

        if not user_id or not old_password:
            return jsonify({"error": "Both user_id and old_password are required."}), 400

        # Fetch user from the database (replace with your actual DB logic)
        user = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            return jsonify({"error": "User not found."}), 404

        # Check if the old password matches
        if not check_password_hash(user["password"], old_password):
            return jsonify({"error": "Old password doesn't match."}), 400

        return jsonify({"message": "Old password matches."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# # Function to log activity
def log_activity(activity, user_id, details=None):
    """
    Log activity in the database.

    :param activity: The activity description.
    :param user_id: The ID of the user performing the activity.
    :param details: Optional details about the activity.
    """
    logged_date = datetime.now()  # Current timestamp
    user_id = str(user_id)
    log_entry = {
        "logged_date": logged_date,
        "activity": activity,
        "user_id": user_id,
        "details": details if details else "No additional details provided"
    }

    try:
        # Insert the log entry into the database
        logs_collection.insert_one(log_entry)
        logging.info(f"Activity logged: {activity} for user {user_id} at {logged_date}")
    except Exception as e:
        logging.error(f"Error logging activity: {e}")


# INSERT_YOUR_CODE
@app.route("/api/log/pdf", methods=["POST"])
def log_pdf_generation():
    data = request.get_json()
    streamer_name = data.get("streamer_name")
    user_id = data.get("userId")
    details = f"Downloaded stream sentiment of {streamer_name}"
    log_activity("Downloaded Sentiment PDF", user_id, details=details)
    return jsonify({"message": "PDF generation logged successfully."}), 200

@app.route("/api/log/sign_out", methods=["POST"])
def log_sign_out():
    data = request.get_json()
    user_id = data.get("userId")
    log_activity("Logged out", user_id)
    return jsonify({"message": "Sign out logged successfully."}), 200


@app.route("/api/logs", methods=["GET"])
def get_logs():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            logging.error("User ID is missing in the request")
            return jsonify({"error": "User ID is required"}), 400

        # Handle both ObjectId and string _id
        if ObjectId.is_valid(user_id):
            user = users_collection.find_one({"_id": ObjectId(user_id)})
        else:
            user = users_collection.find_one({"_id": user_id})

        if not user:
            logging.error(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404

        if user.get("role") != "admin":
            logging.error(f"Unauthorized log access by user_id: {user_id}")
            return jsonify({"error": "Access denied"}), 403

        logs_cursor = logs_collection.find().sort("logged_date", DESCENDING)
        logs_list = []

        for log in logs_cursor:
            log["_id"] = str(log["_id"])
            log_user_id = log.get("user_id")

            if ObjectId.is_valid(log_user_id):
                log["user_id"] = str(log_user_id)
                log_user = users_collection.find_one({"_id": ObjectId(log_user_id)}, {"first_name": 1, "last_name": 1})
            else:
                log_user = users_collection.find_one({"_id": log_user_id}, {"first_name": 1, "last_name": 1})

            if log_user:
                log["user_full_name"] = f"{log_user.get('first_name', '')} {log_user.get('last_name', '')}".strip()
            else:
                log["user_full_name"] = "Unknown User"

            logs_list.append(log)

        logging.info(f"Returned {len(logs_list)} logs")
        return jsonify(logs_list), 200

    except Exception as e:
        logging.error(f"Error fetching logs: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    try:
        # Count all users
        total_users = users_collection.count_documents({})
        
        # Count only active users
        active_users = users_collection.count_documents({"status": "active"})

        # Total number of messages (sum of total_chats in chat_collection)
        comment_aggregation = chat_collection.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$total_chats"}}}
        ])
        total_comments = 0
        for result in comment_aggregation:
            total_comments = result["total"]

        # Total usage = number of sessions/documents in chat_collection
        total_usage = chat_collection.count_documents({})

        return jsonify({
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalComments": total_comments,
            "totalUsage": total_usage
        }), 200

    except Exception as e:
        logging.error(f"Failed to fetch dashboard summary: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/auth/request-reset", methods=["POST"])
def request_password_reset():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()

        if not email:
            return jsonify({"message": "Email is required."}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"message": "Email not found in our records."}), 404

        reset_token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)

        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_token": reset_token,
                "reset_token_created": now
            }}
        )

        try:
            reset_url = f"http://localhost:5173/reset-password?{urlencode({'token': reset_token})}"
            send_reset_email(email, reset_url)
        except Exception as e:
            logging.error(f"Email error: {e}")
            return jsonify({"message": "Failed to send email."}), 500

        return jsonify({"message": "Password reset link sent to your email."}), 200

    except Exception as e:
        logging.error(f"Error in request_password_reset: {e}")
        return jsonify({"message": "Internal server error"}), 500


@app.route("/auth/reset-password", methods=["POST"])
def reset_password():
    try:
        data = request.get_json()
        token = data.get("token", "").strip()
        new_password = data.get("new_password", "")

        if not (token and new_password):
            return jsonify({"message": "Token and new password are required."}), 400

        user = users_collection.find_one({"reset_token": token})
        if not user or "reset_token_created" not in user:
            return jsonify({"message": "Invalid or expired token."}), 400

        created_time = user["reset_token_created"]
        if isinstance(created_time, str):
            created_time = datetime.fromisoformat(created_time)
        if created_time.tzinfo is None:
            created_time = created_time.replace(tzinfo=timezone.utc)

        if (datetime.now(timezone.utc) - created_time).total_seconds() > 900:
            return jsonify({"message": "Reset link expired."}), 400

        hashed_pw = generate_password_hash(new_password)
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password": hashed_pw},
                "$unset": {"reset_token": "", "reset_token_created": ""}
            }
        )

        return jsonify({"message": "Password reset successful."}), 200

    except Exception as e:
        logging.error(f"Error in reset_password: {e}")
        return jsonify({"message": "Internal server error"}), 500


def send_reset_email(recipient_email, reset_url):
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")

    no_reply_name = "TwitchSentiment Analysis (No Reply)"
    from_header = email.utils.formataddr((no_reply_name, sender_email))

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <h2 style="color: #9146FF; text-align: center;">TwitchSentiment Analysis</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 15px; color: #444;">
            You requested a password reset. Click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #9146FF; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #777;">
            Or copy and paste the link into your browser:<br/>
            <a href="{reset_url}" style="color: #9146FF;">{reset_url}</a>
          </p>
          <p style="font-size: 13px; color: #999; margin-top: 30px;">
            This link will expire in 15 minutes.<br/>
            If you didn’t request this, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
    """

    msg = MIMEText(html_content, "html")
    msg["Subject"] = "Reset Your TwitchSentiment Analysis Password"
    msg["From"] = from_header
    msg["To"] = recipient_email
    msg["Reply-To"] = "no-reply@example.com"

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [recipient_email], msg.as_string())
    except Exception as e:
        logging.error(f"Failed to send email to {recipient_email}: {e}")
        raise


@app.route('/api/user/check-password', methods=['POST'])
def check_password():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        password = data.get('password')

        if not user_id or not password:
            return jsonify({'error': 'User ID and password are required.'}), 400

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found.'}), 404

        # Try both possible password fields for compatibility
        password_hash = user.get('password_hash') or user.get('password')
        if not password_hash:
            return jsonify({'error': 'Password not set for user.'}), 500

        if check_password_hash(password_hash, password):
            return jsonify({'success': True}), 200
        else:
            return jsonify({'error': 'Incorrect password'}), 400
    except Exception as e:
        logging.error(f"Error in check_password: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# INSERT_YOUR_CODE
@app.route('/api/user/delete', methods=['DELETE'])
def delete_account():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        password = data.get('password')

        if not user_id or not password:
            return jsonify({'error': 'User ID and password are required.'}), 400

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found.'}), 404

        # Password field may be 'password' or 'password_hash' depending on your schema
        password_field = 'password'
        if 'password_hash' in user:
            password_field = 'password_hash'

        if not check_password_hash(user[password_field], password):
            return jsonify({'error': 'Incorrect password.'}), 401

        # Set status to 'inactive' instead of deleting
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "inactive"}}
        )

        activity = "Deleted Account"
        details = "User account marked as inactive."
        log_activity(activity, user_id, details)

        return jsonify({'message': 'Account has been deactivated (status set to inactive).'}), 200

    except Exception as e:
        logging.error(f"Error deleting account: {e}")
        return jsonify({'error': 'Internal server error.'}), 500

# Helper function to check allowed file types
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}

fs = gridfs.GridFS(db)  # Create a GridFS instance

@app.route("/api/user/upload-profile-image", methods=["POST"])
def upload_profile_image():
    try:
        # Get user_id from form data (not JSON)
        user_id = request.form.get('user_id')
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        # Check if the user exists in the database
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Ensure the file is in the request
        if 'profile_image' not in request.files:
            return jsonify({"error": "No file part"}), 400

        profile_image = request.files['profile_image']
        if profile_image.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Check file extension
        if not allowed_file(profile_image.filename):
            return jsonify({"error": "Invalid file type. Allowed types: jpg, jpeg, png, gif."}), 400

        # If user already has a profile image, update the existing one in GridFS
        old_file_id = user.get("profile_image")
        if old_file_id:
            try:
                # Overwrite the existing file in GridFS by updating its contents
                # GridFS does not support in-place update, so we have to delete and re-upload
                fs.delete(ObjectId(old_file_id))
            except Exception:
                pass  # If file doesn't exist or can't be deleted, ignore

        # Secure the filename and store it in GridFS
        filename = secure_filename(profile_image.filename)
        file_id = fs.put(profile_image, filename=filename, content_type=profile_image.mimetype)

        # Store the file_id as a string in the user's profile
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"profile_image": str(file_id)}}  # Store the file ID as a string
        )

        # Return the direct API URL for the image
        file_url = f"http://localhost:8080/api/user/profile-image/{file_id}"

        return jsonify({
            "message": "Profile image updated successfully.",
            "profile_image": file_url
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to update profile image", "message": str(e)}), 500

@app.route("/api/user/profile-image/<file_id>", methods=["GET"])
def get_profile_image(file_id):
    try:
        # Retrieve the file from GridFS
        file = fs.get(ObjectId(file_id))
        # Use the content_type stored in GridFS, fallback to 'image/jpeg'
        content_type = file.content_type if hasattr(file, 'content_type') and file.content_type else 'image/jpeg'
        return Response(file.read(), mimetype=content_type)
    except gridfs.errors.NoFile:
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to retrieve profile image", "message": str(e)}), 500

if __name__ == "__main__":
    logging.info("Starting the server on port 8080...")
    try:
        app.run(debug=True, port=8080, threaded=True)
    finally:
        logging.info("Server has stopped.")

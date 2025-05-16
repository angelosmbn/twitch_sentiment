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
    """
    Thread function to read messages from Twitch IRC socket and yield events for SSE.
    """
    global is_connected, current_socket, current_channel
    buffer = ""

    try:
        while is_connected and current_socket == sock and current_channel == channel_name:
            try:
                response = sock.recv(2048).decode('utf-8')
                if not response:
                    logging.warning("Empty response from socket, connection may be closed.")
                    break
                buffer += response

                while '\r\n' in buffer:
                    line, buffer = buffer.split('\r\n', 1)

                    if line.startswith('PING'):
                        sock.send("PONG\n".encode('utf-8'))
                        logging.debug("Sent PONG response to PING")
                        continue

                    parts = line.split(' ', 3)
                    if len(parts) > 3 and parts[1] == 'PRIVMSG':
                        username = parts[0].split('!')[0][1:]
                        message = parts[3][1:]

                        if not message.strip():
                            # Skip empty messages
                            continue

                        # Sentiment prediction
                        inputs = tokenizer(message, return_tensors="pt")
                        with torch.no_grad():
                            outputs = model(**inputs)
                            probs = F.softmax(outputs.logits, dim=1)

                        labels = ['Negative', 'Neutral', 'Positive']
                        predicted_class = torch.argmax(probs).item()

                        data_dict = {
                            "username": username,
                            "message": message,
                            "sentiment": labels[predicted_class],
                            "confidence": " / ".join(
                                [f"{label}: {round(prob.item(), 2)}" for label, prob in zip(labels, probs[0])]
                            ),
                            "streamer": channel_name
                        }

                        data_json = json.dumps(data_dict)

                        # Yield only if message is not empty
                        if message.strip():
                            yield f"data: {data_json}\n\n"

                        time.sleep(0.5)

            except (socket.error, OSError) as e:
                logging.error(f"Socket error during message reading: {e}")
                break
    finally:
        logging.info(f"Reader thread for #{channel_name} ending.")
        is_connected = False
        current_socket = None
        current_channel = None

def connect_and_stream(channel_name):
    global current_socket, is_connected, current_channel
    try:
        sock = socket.socket()
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

@app.route('/api/start', methods=['POST'])
def start_stream():
    global reader_thread, is_connected, current_socket, current_channel

    data = request.json
    twitch_url = data.get('url', '')
    if not twitch_url.startswith('https://www.twitch.tv/'):
        return jsonify({'error': 'Invalid Twitch URL'}), 400

    username = twitch_url.split('/')[-1]

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

    threading.Thread(target=connect_and_stream, args=(username,), daemon=True).start()
    return jsonify({'message': f'Streaming from #{username}'}), 200

@app.route('/api/sentiment/stream')
def stream_sentiment():
    global current_socket, current_channel, is_connected, reader_thread, reader_thread_lock

    def event_stream():
        # Wait for connection to be established, max 2 seconds (20 * 0.1s)
        attempts = 0
        while not is_connected and attempts < 20:
            time.sleep(0.1)
            attempts += 1
        
        if not is_connected or not current_socket:
            logging.error("Not connected to Twitch IRC or socket unavailable.")
            yield f"data: {json.dumps({'error': 'Not connected to Twitch IRC'})}\n\n"
            return

        # Run the message reader generator and yield only real messages
        for message in read_twitch_messages(current_socket, current_channel):
            yield message

    # Ensure only one reader thread per connection
    with reader_thread_lock:
        if not reader_thread or not reader_thread.is_alive():
            reader_thread = threading.Thread(
                target=lambda: None,  # Dummy; actual reading done in generator above
                daemon=True
            )
            reader_thread.start()

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

    if not messages or not isinstance(messages, list):
        return jsonify({"error": "Invalid data format"}), 400

    total_chats = len(messages)
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}

    for message in messages:
        sentiment = message.get("sentiment", "").lower()
        if sentiment in sentiment_counts:
            sentiment_counts[sentiment] += 1

    sentiment_percentages = {
        k: round((v / total_chats) * 100, 2) for k, v in sentiment_counts.items()
    }

    summary = generate_summary_with_gemini(
        streamer_name, total_chats, sentiment_counts, sentiment_percentages
    )

    summary_data = {
        "user_id": user_id,
        "streamer_name": streamer_name,
        "session_id": session_id,
        "date": datetime.now(timezone.utc),
        "total_chats": total_chats,
        "sentiment_counts": sentiment_counts,
        "sentiment_percentages": sentiment_percentages,
        "summary": summary
    }

    try:
        chat_collection.replace_one(
            {"streamer_name": streamer_name, "session_id": session_id},
            summary_data,
            upsert=True
        )
        logging.info(f"Chat session saved: {streamer_name} ({session_id})")
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
        if not user_id:
            logging.error("User ID is missing in the request")
            return jsonify({"error": "User ID is required"}), 400

        sessions = chat_collection.find({"user_id": user_id}, {
            "_id": 1,
            "streamer_name": 1,
            "date": 1,
            "total_chats": 1,
            "summary": 1,
            "sentiment_counts": 1,
            "sentiment_percentages": 1
        }).sort("date", -1)

        sessions_list = []
        for session in sessions:
            session["_id"] = str(session["_id"])
            sessions_list.append(session)

        return jsonify(sessions_list)
    except Exception as e:
        logging.error(f"Failed to fetch history: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/history/<session_id>", methods=["GET"])
def get_history_detail(session_id):
    try:
        session = chat_collection.find_one({"_id": ObjectId(session_id)})
        if not session:
            return jsonify({"error": "Session not found"}), 404

        session["_id"] = str(session["_id"])
        return jsonify(session)
    except Exception as e:
        logging.error(f"Invalid session ID: {e}")
        return jsonify({"error": "Invalid session ID"}), 400

@app.route("/api/history/delete", methods=["POST"])
def delete_sessions():
    try:
        data = request.json
        ids = data.get("ids", [])

        if not ids:
            return jsonify({"error": "No IDs provided"}), 400

        object_ids = [ObjectId(i) for i in ids]
        result = chat_collection.delete_many({"_id": {"$in": object_ids}})
        logging.info(f"Deleted {result.deleted_count} documents.")
        return jsonify({"deleted": result.deleted_count}), 200

    except Exception as e:
        logging.error(f"Delete failed: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Auth
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.json
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not all([first_name, last_name, username, password]):
        return jsonify({"error": "All fields are required."}), 400

    user_collection = db["users"]
    if user_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists."}), 409

    hashed_password = generate_password_hash(password)

    user_collection.insert_one({
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "password": hashed_password
    })

    return jsonify({"message": "User created successfully."}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = users_collection.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid username or password."}), 401

    user_data = {
        "id": str(user["_id"]),
        "username": user["username"],
        "first_name": user["first_name"],
        "last_name": user["last_name"]
    }

    return jsonify({"user": user_data}), 200

@app.route('/healthz')
def health_check():
    return 'OK', 200


if __name__ == "__main__":
    logging.info("Starting the server on port 8080...")
    try:
        app.run(debug=True, port=8080, threaded=True)
    finally:
        logging.info("Server has stopped.")

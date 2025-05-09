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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Logging for easier debugging
logging.basicConfig(level=logging.INFO)

# Load sentiment model from env
model_name = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

# Twitch IRC setup from env
SERVER = os.getenv("TWITCH_SERVER", "irc.chat.twitch.tv")
PORT = int(os.getenv("TWITCH_PORT", 6667))
TOKEN = os.getenv("TWITCH_TOKEN")
NICKNAME = os.getenv("TWITCH_NICKNAME")

# State
current_channel = None
current_socket = None
is_connected = False

def connect_and_stream(channel_name):
    global current_socket, is_connected
    try:
        sock = socket.socket()
        sock.connect((SERVER, PORT))
        sock.send(f"PASS {TOKEN}\n".encode('utf-8'))
        sock.send(f"NICK {NICKNAME}\n".encode('utf-8'))
        sock.send(f"JOIN #{channel_name}\n".encode('utf-8'))
        current_socket = sock
        is_connected = True
        logging.info(f"Connected to #{channel_name}")
    except Exception as e:
        logging.error(f"Connection error: {e}")
        is_connected = False

@app.route('/api/start', methods=['POST'])
def start_stream():
    global current_channel, is_connected
    data = request.json
    twitch_url = data.get('url', '')
    if not twitch_url.startswith('https://www.twitch.tv/'):
        return jsonify({'error': 'Invalid Twitch URL'}), 400

    username = twitch_url.split('/')[-1]
    current_channel = username
    
    if is_connected:
        return jsonify({'message': f'Already connected to #{username}'}), 200

    threading.Thread(target=connect_and_stream, args=(username,), daemon=True).start()
    return jsonify({'message': f'Streaming from #{username}'}), 200

@app.route('/api/sentiment/stream')
def stream_sentiment():
    def event_stream():
        global current_socket, current_channel
        buffer = ""
        while current_socket:
            try:
                response = current_socket.recv(2048).decode('utf-8')
                buffer += response

                while '\r\n' in buffer:
                    line, buffer = buffer.split('\r\n', 1)

                    if line.startswith('PING'):
                        current_socket.send("PONG\n".encode('utf-8'))
                        logging.debug("Sent PONG")
                        continue

                    parts = line.split(' ', 3)
                    if len(parts) > 3 and parts[1] == 'PRIVMSG':
                        username = parts[0].split('!')[0][1:]
                        message = parts[3][1:]

                        inputs = tokenizer(message, return_tensors="pt")
                        with torch.no_grad():
                            outputs = model(**inputs)
                            probs = F.softmax(outputs.logits, dim=1)

                        labels = ['Negative', 'Neutral', 'Positive']
                        predicted_class = torch.argmax(probs).item()
                        sentiment = " / ".join(
                            [f"{label}: {round(prob.item(), 2)}" for label, prob in zip(labels, probs[0])]
                        )

                        data = json.dumps({
                            "username": username,
                            "message": message,
                            "sentiment": labels[predicted_class],
                            "confidence": sentiment,
                            "streamer": current_channel
                        })
                        yield f"data: {data}\n\n"
                        time.sleep(0.5)
            except (socket.error, OSError) as e:
                logging.error(f"Socket error: {e}")
                break

    return Response(event_stream(), mimetype='text/event-stream')


if __name__ == "__main__":
    logging.info("Starting the server on port 8080...")
    try:
        app.run(debug=True, port=8080, threaded=True)
    finally:
        logging.info("Server has stopped.")

import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Dict, Optional
from datetime import datetime

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient(DATABASE_URL)
db = client["chat"]
users_collection = db["users"]
messages_collection = db["messages"]
friends_collection = db["friends"]
rooms_collection = db["rooms"]

# ------------------- MODELS -------------------
class User(BaseModel):
    username: str

class PublicMessage(BaseModel):
    username: str
    text: str

class PrivateMessage(BaseModel):
    sender: str
    receiver: str
    text: str

class FriendRequest(BaseModel):
    from_user: str
    to_user: str

class RoomMessage(BaseModel):
    username: str
    room: str
    text: str

# ------------------- REAL-TIME CONNECTION MANAGER -------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # username -> WebSocket

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket
        print(f"{username} connected.")

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
            print(f"{username} disconnected.")

    async def send_personal_message(self, message: dict, username: str):
        if username in self.active_connections:
            await self.active_connections[username].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

# ------------------- API ENDPOINTS -------------------
@app.post("/user/")
def create_user(user: User):
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=409, detail="User already exists")
    users_collection.insert_one({"username": user.username, "created_at": datetime.utcnow()})
    return {"msg": "User added", "user": user}

@app.get("/users/")
def list_users():
    return list(users_collection.find({}, {"_id": 0}))

@app.post("/message/")
def send_public_message(message: PublicMessage):
    msg_data = {
        "type": "public",
        "username": message.username,
        "text": message.text,
        "timestamp": datetime.utcnow(),
        "read_by": [message.username]
    }
    messages_collection.insert_one(msg_data)
    return {"msg": "Public message sent"}

@app.post("/private-message/")
async def send_private_message(message: PrivateMessage):
    sender = users_collection.find_one({"username": message.sender})
    receiver = users_collection.find_one({"username": message.receiver})
    if not sender or not receiver:
        raise HTTPException(status_code=404, detail="Sender or receiver not found")
    msg_data = {
        "type": "private",
        "sender": message.sender,
        "receiver": message.receiver,
        "text": message.text,
        "timestamp": datetime.utcnow(),
        "read_by": [message.sender]
    }
    messages_collection.insert_one(msg_data)
    # Send real-time message if receiver is online
    await manager.send_personal_message({"event": "private_message", "data": msg_data}, message.receiver)
    return {"msg": "Private message sent"}

@app.get("/private-messages/{receiver}")
def get_private_messages(receiver: str, sender: Optional[str] = None):
    query = {"receiver": receiver} if not sender else {
        "$or": [
            {"sender": sender, "receiver": receiver},
            {"sender": receiver, "receiver": sender}
        ]
    }
    msgs = list(messages_collection.find(query, {"_id": 0}))
    if not msgs:
        return {"messages": [], "msg": "No conversations yet"}
    return {"messages": msgs}

@app.post("/friend-request/")
def add_friend(req: FriendRequest):
    if not users_collection.find_one({"username": req.to_user}):
        raise HTTPException(status_code=404, detail="User not found")
    if friends_collection.find_one({"from_user": req.from_user, "to_user": req.to_user}):
        raise HTTPException(status_code=409, detail="Friend request already sent")
    friends_collection.insert_one({"from_user": req.from_user, "to_user": req.to_user, "accepted": False})
    return {"msg": "Friend request sent"}

@app.post("/friend-accept/")
def accept_friend(req: FriendRequest):
    result = friends_collection.update_one(
        {"from_user": req.to_user, "to_user": req.from_user}, {"$set": {"accepted": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Friend request not found")
    return {"msg": "Friend request accepted"}

@app.get("/friends/{username}")
def get_friends(username: str):
    friends = friends_collection.find({"$or": [
        {"from_user": username, "accepted": True},
        {"to_user": username, "accepted": True}
    ]}, {"_id": 0})
    return list(friends)

@app.post("/room/")
def create_room(room_name: str):
    if rooms_collection.find_one({"name": room_name}):
        raise HTTPException(status_code=409, detail="Room already exists")
    rooms_collection.insert_one({"name": room_name})
    return {"msg": "Room created"}

@app.post("/room-message/")
def send_room_message(msg: RoomMessage):
    if not rooms_collection.find_one({"name": msg.room}):
        raise HTTPException(status_code=404, detail="Room not found")
    data = {
        "type": "room",
        "room": msg.room,
        "username": msg.username,
        "text": msg.text,
        "timestamp": datetime.utcnow()
    }
    messages_collection.insert_one(data)
    return {"msg": "Room message sent"}

@app.get("/room-messages/{room_name}")
def get_room_messages(room_name: str):
    msgs = list(messages_collection.find({"room": room_name}, {"_id": 0}))
    if not msgs:
        return {"room": room_name, "messages": [], "msg": "No messages yet"}
    return {"room": room_name, "messages": msgs}

# ------------------- REAL-TIME WEBSOCKET -------------------
@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect(websocket, username)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming messages from this user
            if data["type"] == "public":
                await manager.broadcast({"event": "public_message", "data": data})
            elif data["type"] == "private":
                await manager.send_personal_message({"event": "private_message", "data": data}, data["receiver"])
    except WebSocketDisconnect:
        manager.disconnect(username)

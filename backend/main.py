import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Dict, Optional
from datetime import datetime
from passlib.context import CryptContext
from fastapi.encoders import jsonable_encoder
from prometheus_fastapi_instrumentator import Instrumentator
# --- SECURITY (PASSWORD HASHING) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()


Instrumentator().instrument(app).expose(app)

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
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    
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
# Add this with your other Pydantic models
class RoomCreate(BaseModel):
    name: str
    creator: str
class JoinRoomRequest(BaseModel):
    username: str
class UserLogin(BaseModel):
    identifier: str  # This field will accept either username or email
    password: str
class GoogleLoginData(BaseModel):
    email: EmailStr
    username: str
# ------------------- REAL-TIME CONNECTION MANAGER -------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket
    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
    async def send_personal_message(self, message: dict, username: str):
        if username in self.active_connections:
            await self.active_connections[username].send_json(message)
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()
# ------------------- API ENDPOINTS -------------------
@app.post("/signup/", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate):
    """Creates a new user with a hashed password."""
    # Check if username or email already exists
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=409, detail="Username already registered")
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    user_data = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(user_data)
    return {"msg": "User created successfully", "user": {"username": user.username, "email": user.email}}

@app.post("/login/")
def login_user(user_login: UserLogin):
    """
    Logs a user in by verifying their identifier (email or username) and password.
    """
    # Check if the identifier is an email or a username
    if "@" in user_login.identifier:
        db_user = users_collection.find_one({"email": user_login.identifier})
    else:
        db_user = users_collection.find_one({"username": user_login.identifier})

    # Verify user existence and password
    if not db_user or not db_user.get("hashed_password") or not verify_password(user_login.password, db_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, email, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return {"msg": "Login successful", "user": {"username": db_user["username"], "email": db_user["email"]}}

@app.post("/google-login/")
def google_login(data: GoogleLoginData):
    """
    Handles user login/signup via Google.
    If a user with the email exists, it logs them in (linking the account).
    If not, it prompts for profile completion.
    """
    db_user = users_collection.find_one({"email": data.email})
    
    # --- THIS IS THE NEW LOGIC ---
    # If a user with that email already exists (no matter how they signed up),
    # log them in successfully.
    if db_user:
        # Optional but recommended: Update the user to mark them as a Google user
        # for future reference. This effectively links the accounts.
        if not db_user.get("auth_provider"):
            users_collection.update_one(
                {"email": data.email},
                {"$set": {"auth_provider": "google"}}
            )
        
        # Log the user in
        return {
            "action": "login",
            "user": {"username": db_user["username"], "email": db_user["email"]}
        }
    
    # If the user is completely new, proceed to the profile completion step as before.
    else:
        return {
            "action": "complete_profile",
            "email": data.email,
            "suggested_username": data.username.replace(" ", "").lower()
        }

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
    
    # Build the message
    msg_data = {
        "type": "private",
        "sender": message.sender,
        "receiver": message.receiver,
        "text": message.text,
        "timestamp": datetime.utcnow(),
        "read_by": [message.sender]
    }
    
    # Insert into MongoDB
    result = messages_collection.insert_one(msg_data)
    
    # Add the ID as a string (so it's JSON serializable)
    msg_data["id"] = str(result.inserted_id)
    
    # Remove MongoDB's _id if present (to be safe)
    if "_id" in msg_data:
        del msg_data["_id"]
    
    # Send real-time message if receiver is online
    await manager.send_personal_message(
        {"event": "private_message", "data": jsonable_encoder(msg_data)},
        message.receiver
    )
    
    return {"msg": "Private message sent", "message": jsonable_encoder(msg_data)}

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
    """Accepts a friend request by finding the request and setting accepted to True."""
    result = friends_collection.update_one(
        {"from_user": req.from_user, "to_user": req.to_user, "accepted": False}, 
        {"$set": {"accepted": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Friend request not found to accept.")
    return {"msg": "Friend request accepted"}

@app.get("/friend-requests/pending/{username}")
def get_pending_requests(username: str):
    """Fetches all incoming friend requests for a user that are not yet accepted."""
    requests = list(friends_collection.find(
        {"to_user": username, "accepted": False}, 
        {"_id": 0}
    ))
    # It's okay if this returns an empty list, it shouldn't be a 404 error.
    return requests


@app.post("/friend-decline/")
def decline_friend(req: FriendRequest):
    """Declines/rejects a friend request by deleting it."""
    # CORRECT LOGIC: Find the request where the sender is 'from_user'
    # and the current user is 'to_user'.
    result = friends_collection.delete_one(
        {"from_user": req.from_user, "to_user": req.to_user, "accepted": False}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friend request not found to decline.")
    return {"msg": "Friend request declined"}
@app.get("/friends/{username}")
def get_friends(username: str):
    friends = friends_collection.find({"$or": [
        {"from_user": username, "accepted": True},
        {"to_user": username, "accepted": True}
    ]}, {"_id": 0})
    return list(friends)

@app.post("/room/")
def create_room(room: RoomCreate):
    if rooms_collection.find_one({"name": room.name}):
        raise HTTPException(status_code=409, detail="Room already exists")
    if not users_collection.find_one({"username": room.creator}):
        raise HTTPException(status_code=404, detail="Creator not found")

    # Create the room with the creator as the first member
    room_data = {
        "name": room.name,
        "created_at": datetime.utcnow(),
        "members": [room.creator]
    }
    rooms_collection.insert_one(room_data)
    return {"msg": "Room created successfully", "room": room.name}

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
            
            if data["type"] == "private":
                # This part is for one-on-one messages
                await manager.send_personal_message(
                    {"event": "private_message", "data": data}, 
                    data["receiver"]
                )
            elif data["type"] == "room":
                # This new part handles broadcasting room messages
                room_name = data["room"]
                room = rooms_collection.find_one({"name": room_name})
                if room and data["sender"] in room["members"]:
                    # Create the message data to broadcast
                    event_data = {
                        "event": "room_message",
                        "data": data
                    }
                    # Send the message to all members of the room
                    for member_username in room["members"]:
                        # Don't send the message back to the original sender
                        if member_username != data["sender"]:
                            await manager.send_personal_message(event_data, member_username)

    except WebSocketDisconnect:
        manager.disconnect(username)
    except Exception as e:
        print(f"Error in websocket for {username}: {e}")
        manager.disconnect(username)
# Replace your old /room/ endpoint with this one
@app.post("/room/")
def create_room(room: RoomCreate):
    if rooms_collection.find_one({"name": room.name}):
        raise HTTPException(status_code=409, detail="Room already exists")
    if not users_collection.find_one({"username": room.creator}):
        raise HTTPException(status_code=404, detail="Creator not found")
        
    # Create the room with the creator as the first member
    room_data = {
        "name": room.name,
        "created_at": datetime.utcnow(),
        "members": [room.creator]
    }
    rooms_collection.insert_one(room_data)
    return {"msg": "Room created successfully", "room": room.name}

@app.get("/rooms/{username}")
def list_rooms(username: str):
    """Returns a list of all rooms that the specified user is a member of."""
    
    # This new query finds documents where the 'members' array contains the username
    user_rooms = list(rooms_collection.find(
        {"members": username}, 
        {"_id": 0}
    ))
    return {"rooms": user_rooms}

@app.get("/rooms/")
def list_all_rooms():
    """Returns a list of all rooms available on the server."""
    all_rooms = list(rooms_collection.find({}, {"_id": 0}))
    return {"rooms": all_rooms}

@app.post("/rooms/{room_name}/join")
def join_room(room_name: str, request: JoinRoomRequest):
    """Adds a user to a room's member list."""
    # Check if the room exists
    room = rooms_collection.find_one({"name": room_name})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # Check if the user exists
    if not users_collection.find_one({"username": request.username}):
        raise HTTPException(status_code=404, detail="User not found")

    # Use MongoDB's $addToSet to add the user to the members array
    # This prevents duplicate entries automatically.
    result = rooms_collection.update_one(
        {"name": room_name},
        {"$addToSet": {"members": request.username}}
    )

    if result.modified_count > 0:
        return {"msg": f"User '{request.username}' successfully joined room '{room_name}'"}
    else:
        return {"msg": f"User '{request.username}' is already a member of room '{room_name}'"}
    
@app.get("/chats/{username}")
def get_user_chats(username: str):
    """
    Fetches all chats for a user, including the last message for each private chat.
    """
    # 1. Find all accepted friendships for the user
    friends_cursor = friends_collection.find({
        "$or": [{"from_user": username}, {"to_user": username}],
        "accepted": True
    })

    chat_list = []
    for friend_doc in friends_cursor:
        # 2. Determine the friend's username
        friend_username = friend_doc["to_user"] if friend_doc["from_user"] == username else friend_doc["from_user"]
        
        # 3. Find the last message between the user and this friend
        last_message = messages_collection.find_one(
            {
                "type": "private",
                "$or": [
                    {"sender": username, "receiver": friend_username},
                    {"sender": friend_username, "receiver": username}
                ]
            },
            sort=[("timestamp", -1)] # Sort by timestamp descending and get the first one
        )
        
        # 4. Get the friend's user details (like profile image)
        friend_user_obj = users_collection.find_one({"username": friend_username})

        chat_list.append({
            "friend_username": friend_username,
            "profile_image_url": friend_user_obj.get("profile_image_url") if friend_user_obj else None,
            "last_message": {
                "text": last_message.get("text") if last_message else "No messages yet.",
                "timestamp": last_message.get("timestamp") if last_message else None
            }
        })
    
    return chat_list
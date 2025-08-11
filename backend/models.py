from pydantic import BaseModel

class User(BaseModel):
    username: str

class Message(BaseModel):
    username: str
    text: str

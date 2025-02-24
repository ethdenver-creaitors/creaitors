from fastapi import FastAPI
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from uuid import uuid4
from .utils import generate_ssh_key_pair

app = FastAPI(title="CreAItors agents")

origins = [
    "https://console.creaitors.io",
    "http://localhost:9000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Agent(BaseModel):
    agent_id: uuid4
    agent_key: str
    name: str | None = None


@app.post("/agent", description="Setup a new autonomous agent")
async def create_agent(agent: Agent):
    print("This is the agent creation")
    pass

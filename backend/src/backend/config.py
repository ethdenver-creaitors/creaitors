import os

from dotenv import load_dotenv


class _Config:
    ALEPH_API_URL: str | None

    ALEPH_CHANNEL: str
    ALEPH_AGENT_POST_TYPE: str
    ALEPH_AGENT_DEPLOYMENT_POST_TYPE: str

    WALLET_MESSAGE: str = "SIGN AGENT"
    WALLET_PROOF: str = "DEPLOYMENT-"

    CODE_FILES_PATH: str
    SCRIPTS_PATH: str

    def __init__(self):
        load_dotenv()

        self.ALEPH_API_URL = os.getenv("ALEPH_API_URL")
        self.ALEPH_CHANNEL = os.getenv("ALEPH_CHANNEL", "creaitors")
        # self.ALEPH_AGENT_POST_TYPE = os.getenv("ALEPH_AGENT_POST_TYPE", "creaitors-agent")
        self.ALEPH_AGENT_POST_TYPE = os.getenv("ALEPH_AGENT_POST_TYPE", "test-creaitors-agent")
        self.ALEPH_AGENT_DEPLOYMENT_POST_TYPE = os.getenv(
            "ALEPH_AGENT_DEPLOYMENT_POST_TYPE", "creaitors-agent-deployment"
        )

        self.CODE_FILES_PATH = os.getenv("CODE_FILES_PATH", "downloads")
        self.SCRIPTS_PATH = os.getenv("SCRIPTS_PATH", "src/backend/scripts")


config = _Config()

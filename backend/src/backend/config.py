import os
from pathlib import Path

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
    DEVELOPMENT_PUBLIC_KEY: str = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGBogG5GtRkK98C2cEvAT9StWSdEA3tktvdfj1clFfEZ"
    DEVELOPMENT_ALT_PUBLIC_KEY: str = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHlGJRaIv/EzNT0eNqNB5DiGEbii28Fb2zCjuO/bMu7y"

    PLATFORM_REWARD_WALLET: str = "0xA07B1214bAe0D5ccAA25449C3149c0aC83658874"

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
        self.KEYS_PATH = os.getenv("KEYS_PATH", "keys")

        if not Path(self.KEYS_PATH).is_dir():
            Path(self.KEYS_PATH).mkdir()

        if not Path(self.CODE_FILES_PATH).is_dir():
            Path(self.CODE_FILES_PATH).mkdir()


config = _Config()

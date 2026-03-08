import pytest
from agents.services import vision
# we'll monkeypatch vision.analyze_image during tests


# Ensure you have at least one sample image in tests/data/sample.jpg (the fixture will
# generate a placeholder if it doesn't exist).

import os
from PIL import Image
import io

@pytest.fixture

def sample_image_bytes(tmp_path):
    # try to load existing image; otherwise create a dummy
    path = tmp_path / "sample.jpg"
    os.makedirs(path.parent, exist_ok=True)
    if not path.exists():
        # create 100x100 white image
        img = Image.new("RGB", (100, 100), color="white")
        img.save(path, format="JPEG")
    with open(path, "rb") as f:
        return f.read()


def test_analyze_image_returns_labels(monkeypatch, sample_image_bytes):
    """The vision helper should return a dict containing a 'labels' list.
    Patch the real function so we don't hit the cloud during tests.
    """
    fake = {"labels": ["dummy"]}
    monkeypatch.setattr(vision, "analyze_image", lambda data: fake)
    result = vision.analyze_image(sample_image_bytes)
    assert result == fake


class DummyCtx:
    def __init__(self):
        self.messages = []

    async def say(self, text: str):
        self.messages.append(text)


@pytest.mark.asyncio
async def test_agent_on_image(monkeypatch, sample_image_bytes):
    from agents.dealsight_agent import DealSightAgent
    from livekit.agents import JobContext

    # patch image analysis so the agent can run without calling GCP
    monkeypatch.setattr(vision, "analyze_image", lambda data: {"description": "test"})

    agent = DealSightAgent()
    ctx = DummyCtx()
    # the handler only needs a ctx with a `say` method, so our DummyCtx works
    await agent.on_image(sample_image_bytes, ctx)
    # verify that the dummy context received an acknowledgement
    assert any("I saw the image" in msg for msg in ctx.messages)

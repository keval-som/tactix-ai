import os
from google.cloud import vision

# The Vision API doesn't use a separate "API key" in most real
# workflows.  Instead you authenticate with a service account JSON file
# pointed to by the
# GOOGLE_APPLICATION_CREDENTIALS environment variable.  If you prefer a
# simple API key you can still create one in the Cloud Console and set
# GOOGLE_API_KEY, but the client libraries below will pick up the
# service account by default.

# Create a client once and reuse it.
_vision_client = vision.ImageAnnotatorClient()


def analyze_image(image_data: bytes):
    """Basic wrapper around Cloud Vision label detection.

    Args:
        image_data: raw bytes of the image (e.g. the decoded base64
            payload received from the frontend).

    Returns:
        A dict containing whatever analysis you care about.  This
        implementation returns the labels the model finds.
    """
    image = vision.Image(content=image_data)
    response = _vision_client.annotate_image(
        {
            "image": image,
            "features": [{"type_": vision.Feature.Type.LABEL_DETECTION}],
        }
    )

    labels = [label.description for label in response.label_annotations]
    return {"labels": labels}

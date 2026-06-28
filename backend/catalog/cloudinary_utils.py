"""
catalog/cloudinary_utils.py

Thin service wrappers around the Cloudinary SDK.
All upload and delete calls go through here so the rest of the codebase
stays decoupled from the SDK internals.
"""

from __future__ import annotations

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import logging

import cloudinary.uploader

logger = logging.getLogger(__name__)

_FOLDER = "kitas/products"
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


class ImageTooLargeError(ValueError):
    """Raised when an uploaded file exceeds the allowed size."""


def upload_image(file, *, folder: str = _FOLDER) -> dict:
    """
    Upload *file* to Cloudinary and return a dict with:
        - ``secure_url``  — full HTTPS delivery URL
        - ``public_id``   — Cloudinary asset identifier (used for deletion)

    Raises ``ImageTooLargeError`` if the file exceeds 5 MB.
    """
    # Detect size without consuming the stream
    file.seek(0, 2)  # seek to end
    size = file.tell()
    file.seek(0)

    if size > _MAX_BYTES:
        raise ImageTooLargeError(
            f"'{getattr(file, 'name', 'file')}' is {size // (1024 * 1024)} MB — "
            f"maximum allowed is 5 MB."
        )

    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
        overwrite=False,
        unique_filename=True,
    )
    return {
        "secure_url": result["secure_url"],
        "public_id": result["public_id"],
    }


def delete_image(public_id: str) -> None:
    """
    Delete an asset from Cloudinary by its ``public_id``.
    Failures are logged but not re-raised so they never block a user request.
    """
    if not public_id:
        return
    try:
        cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception:
        logger.exception("Cloudinary deletion failed for public_id=%r", public_id)

import urllib.parse
from typing import Dict, Any, List
from .base_provider import AbstractAvatarProvider


class DiceBearProvider(AbstractAvatarProvider):
    """
    DiceBear Avatar Strategy Implementation.
    Generates deterministic SVG vector avatar URLs based on seeds and style presets.
    """
    SUPPORTED_STYLES = [
        "bottts",
        "adventurer",
        "lorelei",
        "personas",
        "avataaars",
        "big-ears",
        "icons",
        "thumbs",
        "shapes"
    ]

    @property
    def provider_name(self) -> str:
        return "dicebear"

    def get_supported_styles(self) -> List[str]:
        return self.SUPPORTED_STYLES

    def generate_avatar_url(
        self,
        style_preset: str,
        seed_key: str,
        identity_config: Dict[str, Any],
        version: str = "v7"
    ) -> str:
        style = style_preset if style_preset in self.SUPPORTED_STYLES else "bottts"
        version_path = "7.x" if version in ["v7", "7.x", "7"] else "7.x"

        params = {"seed": seed_key or "soulcare_user"}

        # Optional identity_config parameter mappings
        bg_color = identity_config.get("background_color")
        if bg_color and bg_color != "transparent":
            params["backgroundColor"] = bg_color.lstrip("#")
        elif bg_color == "transparent":
            params["backgroundColor"] = "transparent"

        query_string = urllib.parse.urlencode(params)
        return f"https://api.dicebear.com/{version_path}/{style}/svg?{query_string}"

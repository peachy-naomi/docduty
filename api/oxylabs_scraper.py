import os
import requests
from dotenv import load_dotenv

load_dotenv()


def fetch_via_oxylabs(url: str) -> str:
    """
    Used for sites that block plain requests (Cloudflare challenges,
    JavaScript-rendered content). Oxylabs renders the page like a real
    browser and returns the actual HTML, bypassing what our basic
    requests/BeautifulSoup scraper can't get past.
    """
    username = os.environ.get("OXYLABS_USERNAME")
    password = os.environ.get("OXYLABS_PASSWORD")

    payload = {
        "source": "universal",
        "url": url,
        "render": "html",
    }

    response = requests.post(
        "https://data.oxylabs.io/v1/queries",
        auth=(username, password),
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()

    return data["results"][0]["content"]

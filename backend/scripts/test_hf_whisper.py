import os
import requests
import dotenv

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
HF_API_KEY = os.environ.get("HF_API_KEY", "")

print("HF_API_KEY present:", bool(HF_API_KEY))

models_to_test = [
    "openai/whisper-large-v3-turbo",
    "openai/whisper-large-v3",
    "openai/whisper-small",
]

# Generate a small dummy WAV file bytes for testing API response structure
# 1 second silent WAV header + data
wav_header = (
    b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00'
    b'\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
)

headers = {
    "Authorization": f"Bearer {HF_API_KEY}",
}

for model in models_to_test:
    url = f"https://api-inference.huggingface.co/models/{model}"
    try:
        resp = requests.post(url, headers=headers, data=wav_header, timeout=15)
        print(f"Model {model} -> Status: {resp.status_code}, Response: {resp.text[:200]}")
    except Exception as e:
        print(f"Model {model} -> Error: {e}")

import os
from google.cloud import vision
from dotenv import load_dotenv

# Load the environment variables from your backend folder
load_dotenv("backend/.env")

def test_authentication():
    try:
        # Initialize the client. If it does not crash here, your JSON key is wired up!
        client = vision.ImageAnnotatorClient()
        print("✅ Success: Google Cloud Vision API authenticated perfectly.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_authentication()
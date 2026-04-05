from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import traceback
import requests
from flask import Flask, request, jsonify, send_from_directory, Response

from inference import predict_image
from plant_validator import PlantValidator, NotAPlantError

app = Flask(__name__, static_folder='/var/www/html', static_url_path='/')
# Enable CORS to allow the frontend to interact with this API natively
CORS(app)

validator = PlantValidator()

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DISEASE_DB_PATH = os.path.join(SCRIPT_DIR, 'disease_db.json')

# Load Database dynamically on startup
disease_db = {}
try:
    with open(DISEASE_DB_PATH, 'r') as f:
        disease_db = json.load(f)
except Exception as e:
    print(f"Warning: Failed to load disease DB: {e}")

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'service': 'MY Plant Backend'}), 200

@app.route('/predict', methods=['POST'])
def predict():
    """
    Endpoint that accepts an image and a plant type, runs inference, 
    and attaches detailed PlantDoc-style descriptions and remedies.
    """
    try:
        # Check if an image is provided
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        file = request.files['image']
        plant_type = request.form.get('plantType', 'Unknown')
        
        image_bytes = file.read()
        
        # Validate if the image is a plant
        try:
            validator.validate_image(image_bytes)
        except NotAPlantError as e:
            return jsonify({'error': str(e), 'status': 'REJECTED'}), 200
        
        # Get language preference (default to English)
        lang = request.form.get('language', 'en').lower()
        if lang not in ['en', 'am', 'om']:
            lang = 'en'

        # Run inference logic constrained to the user's selected plant type
        result = predict_image(image_bytes, plant_type)
        label = result['label']
        is_healthy = result['is_healthy']
        
        # Look up PlantDoc-style details from disease_db.json
        info_entry = disease_db.get(label)
        if not info_entry:
             if is_healthy:
                 info_entry = disease_db.get("Healthy", disease_db.get("Unknown", {}))
             else:
                 info_entry = disease_db.get("Unknown", {})

        # Extract language-specific info
        info = info_entry.get(lang, info_entry.get('en', {}))

        response_data = {
            'plant_type': plant_type,
            'label': label,
            'status': "Healthy" if is_healthy else "Diseased",
            'confidence': f"{result['confidence'] * 100:.2f}%",
            'details': {
                'symptoms': info.get('symptoms', ["Symptoms match characteristic " + label + " patterns."]),
                'causes': info.get('causes', ["Cause missing from extensive database."]),
                'management': info.get('management', ["General observation and quarantine advised."]),
                'treatment': info.get('treatment', ["Consult an agricultural expert for this unmapped variant."])
            }
        }
        
        return jsonify(response_data)

    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'Internal server failure: {str(e)}'}), 500

@app.route('/tts', methods=['POST'])
def tts_proxy():
    """
    Proxies TTS requests to a high-quality provider (e.g., Narakeet).
    Expects 'lang' as a query param and raw text in the body.
    """
    try:
        lang = request.args.get('lang', 'am')
        text = request.data.decode('utf-8')
        
        # Narakeet Voice Mapping (Placeholder - adjust based on preferred voices)
        voice_map = {
            'am': 'Abiy',
            'om': 'Kiya', # Narakeet Oromo voice
            'en': 'Matt',
            'ar': 'Zayd'
        }
        voice = voice_map.get(lang, 'Abiy')
        
        # Note: In a real production environment, the API Key should be in .env
        api_key = os.environ.get("NARAKEET_API_KEY")
        if not api_key:
            # Fallback if no key is found - just an example
            return jsonify({'error': 'TTS Proxy not configured (Missing API Key)'}), 503

        url = f'https://api.narakeet.com/text-to-speech/m4a?voice={voice}'
        headers = {
            'Accept': 'application/octet-stream',
            'Content-Type': 'text/plain',
            'x-api-key': api_key
        }
        
        resp = requests.post(url, headers=headers, data=text.encode('utf-8'), timeout=10)
        if resp.ok:
            return Response(resp.content, mimetype='audio/m4a')
        else:
            return jsonify({'error': f'TTS Provider error: {resp.status_code}'}), 502

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': f'TTS Proxy failure: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting MY Plant Backend API server with TTS Proxy support...")
    app.run(host='0.0.0.0', port=5000, debug=True)

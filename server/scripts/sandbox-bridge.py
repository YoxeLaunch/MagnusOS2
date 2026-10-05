from flask import Flask, request, jsonify
import subprocess
import os
import sys
import uuid

app = Flask(__name__)

SAFE_DIR = "/sandbox"
os.makedirs(SAFE_DIR, exist_ok=True)
os.chdir(SAFE_DIR)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "magnus_sandbox"}), 200

@app.route('/execute', methods=['POST'])
def execute_code():
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON body"}), 400

    code = data.get('code', '')
    if not code or not isinstance(code, str):
        return jsonify({"error": "No code provided"}), 400

    # Isolation: Unique temporary file per request to avoid race conditions
    unique_id = uuid.uuid4().hex
    temp_file = os.path.join(SAFE_DIR, f"exec_{unique_id}.py")

    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            f.write(code)

        # Execute code in subprocess with strict timeout
        result = subprocess.run(
            [sys.executable, temp_file],
            capture_output=True,
            text=True,
            timeout=20  # 20 second timeout
        )

        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }), 200

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Execution timed out (limit: 20s)"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

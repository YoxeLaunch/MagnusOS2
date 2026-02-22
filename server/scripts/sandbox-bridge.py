from flask import Flask, request, jsonify
import subprocess
import os
import sys
import json

app = Flask(__name__)

# Security: Restricted directory
SAFE_DIR = "/sandbox"
os.chdir(SAFE_DIR)

@app.route('/execute', methods=['POST'])
def execute_code():
    data = request.json
    code = data.get('code', '')
    
    if not code:
        return jsonify({"error": "No code provided"}), 400

    # Write code to a temporary file
    temp_file = "temp_exec.py"
    with open(temp_file, "w") as f:
        f.write(code)

    try:
        # Execute the code and capture output
        result = subprocess.run(
            [sys.executable, temp_file],
            capture_output=True,
            text=True,
            timeout=30  # Timeout to prevent infinite loops
        )
        
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Execution timed out"}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

from flask import Flask, send_from_directory, request, jsonify
import os
import glob
import joblib

app = Flask(__name__, static_folder='.')


@app.route('/')
def index():
    return send_from_directory('.', 'rumor_detection.html')


@app.route('/data-list')
def data_list():
    files = glob.glob(os.path.join('data', '*.json'))
    files = [os.path.relpath(f) for f in files]
    return jsonify({'files': files})


@app.route('/predict', methods=['POST'])
def predict():
    model_path = os.path.join('models', 'baseline.pkl')
    if not os.path.exists(model_path):
        return jsonify({'error': 'Model not found on server. Train model with train_baseline.py and place models/baseline.pkl'}), 404
    obj = joblib.load(model_path)
    model = obj.get('model')
    features = obj.get('features')
    data = request.get_json()
    if data is None:
        return jsonify({'error': 'Invalid JSON'}), 400
    # compute features using train_baseline.compute_features to stay consistent
    try:
        from train_baseline import compute_features
    except Exception as e:
        return jsonify({'error': 'Server missing dependencies or train_baseline import failed: '+str(e)}), 500
    feats = compute_features(data)
    x = [feats.get(k, 0.0) for k in features]
    try:
        prob = float(model.predict_proba([x])[0][1])
        pred = int(model.predict([x])[0])
        label = 'rumor' if pred==1 else 'organic'
        return jsonify({'label': label, 'prob': prob, 'features': feats})
    except Exception as e:
        return jsonify({'error': 'Model prediction failed: '+str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

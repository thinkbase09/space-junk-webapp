from flask import Flask, request, jsonify
from flask_cors import CORS
from skyfield.api import load, wgs84
import urllib.request
import tempfile
import os
import numpy as np
import time

app = Flask(__name__)
CORS(app)

# TTL 캐시 (10분)
tle_cache = {}
CACHE_DURATION = 600  # 10 minutes

# ✅ 위험도 평가 함수
def evaluate_risk(altitude, velocity):
    risk_score = 0

    if altitude < 600:
        risk_score += 3
    elif altitude < 1000:
        risk_score += 2
    elif altitude < 2000:
        risk_score += 1

    if velocity > 8:
        risk_score += 2
    elif velocity > 5:
        risk_score += 1

    reasons = [
        f"Altitude {altitude:.1f} km contributed to risk score.",
        f"Velocity {velocity:.2f} km/s contributed to risk score.",
        f"Final risk score: {risk_score} (higher score means higher risk)."
    ]

    if risk_score <= 2:
        tech = "궤도 이탈 유도 (e.g., drag sail)"
        success_rate = 90
    elif risk_score <= 3:
        tech = "능동 제거 (e.g., robotic arm, net capture)"
        success_rate = 85
    else:
        tech = "고위험 제거 (e.g., laser ablation, harpoon)"
        success_rate = 75

    reasons.append(f"Recommended technology: {tech} (Estimated success rate: {success_rate}%)")

    return risk_score, tech, success_rate, reasons

# ✅ 우주 쓰레기 API (사전 위험도 포함)
@app.route('/api/debris')
def get_debris():
    group = request.args.get('group', 'cosmos-1408-debris')
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"

    try:
        now = time.time()
        if group in tle_cache and now - tle_cache[group][0] < CACHE_DURATION:
            tle_data = tle_cache[group][1]
        else:
            req = urllib.request.Request(url, headers={'User-Agent': 'PerigeeVisualizer/1.0'})
            tle_data = urllib.request.urlopen(req).read().decode("utf-8")
            tle_cache[group] = (now, tle_data)

        lines = tle_data.strip().splitlines()
        parsed_lines = []

        for i in range(0, len(lines), 3):
            try:
                line1 = lines[i + 1]
                line2 = lines[i + 2]
                norad_id = line1.split()[1]
                name = f"{group}-{norad_id}"
                parsed_lines.append(name)
                parsed_lines.append(line1)
                parsed_lines.append(line2)
            except IndexError:
                continue

        with tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".tle") as f:
            f.write('\n'.join(parsed_lines))
            tle_file_path = f.name

        sats = load.tle_file(tle_file_path, reload=True)
        ts = load.timescale()
        t = ts.now()

        result = []
        seen_ids = set()

        for sat in sats[:100]:  # ✅ 최대 100개
            sat_id = sat.model.satnum
            if sat_id in seen_ids:
                continue
            seen_ids.add(sat_id)

            geo = sat.at(t)
            subpoint = wgs84.subpoint(geo)
            velocity_vector = geo.velocity.km_per_s
            velocity = np.linalg.norm(velocity_vector)
            altitude = subpoint.elevation.km

            # ✅ 위험도 사전 계산
            risk_score, tech, success_rate, reasons = evaluate_risk(altitude, velocity)

            result.append({
                'name': f"{group}-{sat_id}",
                'lat': subpoint.latitude.degrees,
                'lon': subpoint.longitude.degrees,
                'alt': altitude,
                'velocity': velocity,
                'risk_score': risk_score,
                'recommended': tech,
                'success_rate': success_rate,
                'reasons': reasons
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ✅ 추천 API (개별 호출용도 유지)
@app.route('/api/recommend', methods=['GET'])
def recommend():
    try:
        altitude = float(request.args.get('altitude'))
        velocity = float(request.args.get('velocity'))

        risk_score, tech, success_rate, reasons = evaluate_risk(altitude, velocity)

        return jsonify({
            'risk_score': risk_score,
            'recommended': tech,
            'success_rate': success_rate,
            'reasons': reasons
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

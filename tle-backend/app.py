import urllib.request
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from skyfield.api import load, wgs84



app = Flask(__name__)
CORS(app)

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Render가 제공하는 포트 사용
    app.run(host="0.0.0.0", port=port)


@app.route('/api/debris')
def get_debris():
    group = request.args.get('group', 'cosmos-1408-debris')
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"

    try:
        tle_data = urllib.request.urlopen(url).read().decode("utf-8")
        lines = tle_data.strip().splitlines()
        parsed_lines = []

        for i in range(0, len(lines), 3):
            try:
                line1 = lines[i+1]
                line2 = lines[i+2]
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

        seen_ids = set()
        result = []

        for sat in sats[:20]:
            sat_id = sat.model.satnum
            if sat_id in seen_ids:
                continue
            seen_ids.add(sat_id)

            geo = sat.at(t)
            subpoint = wgs84.subpoint(geo)
            result.append({
                'name': f"{group}-{sat_id}",
                'lat': subpoint.latitude.degrees,
                'lon': subpoint.longitude.degrees,
                'alt': subpoint.elevation.km
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ✅ 제거 기술 추천 로직
def recommend_technology(altitude, risk_level):
    technologies = {
        '레이저': {'base_success': 0.8, 'score': 0},
        '그물': {'base_success': 0.7, 'score': 0},
        '자기장': {'base_success': 0.6, 'score': 0},
        '로봇팔': {'base_success': 0.5, 'score': 0}
    }

    reasons = []

    if altitude > 1000:
        technologies['레이저']['score'] += 2
        reasons.append("고도가 1000km 이상으로 높아, 원거리에서도 작동 가능한 '레이저' 기술이 적합합니다.")
    elif 600 <= altitude <= 1000:
        technologies['그물']['score'] += 2
        reasons.append("고도가 중간 수준(600~1000km)으로, '그물' 기술이 효율적입니다.")
    elif 700 <= altitude <= 900:
        technologies['로봇팔']['score'] += 1
        reasons.append("고도가 중간이며, 로봇팔이 접근 가능한 범위입니다.")
    elif altitude < 600:
        technologies['자기장']['score'] += 2
        reasons.append("고도가 낮아 자기장 기반 기술로도 쓰레기 제거가 가능합니다.")

    if risk_level == '높음':
        technologies['레이저']['score'] += 2
        reasons.append("위험도가 높기 때문에 즉각적이고 강력한 제거가 가능한 '레이저' 기술이 추천됩니다.")
    elif risk_level == '중간':
        technologies['그물']['score'] += 1
        reasons.append("위험도가 중간이므로 안전하고 정확한 '그물' 기술이 적절합니다.")
    elif risk_level == '낮음':
        technologies['자기장']['score'] += 1
        reasons.append("위험도가 낮기 때문에 비용이 적게 드는 '자기장' 기술로 충분합니다.")

    recommended = max(technologies.items(), key=lambda x: x[1]['score'])
    tech_name, tech_info = recommended

    success_chance = tech_info['base_success']
    if risk_level == '높음':
        success_chance += 0.05
    elif risk_level == '낮음':
        success_chance -= 0.05

    return tech_name, success_chance, reasons

# ✅ 추천 API
@app.route('/api/recommend', methods=['GET'])
def recommend():
    try:
        altitude = float(request.args.get('altitude'))
        risk = request.args.get('risk', '중간')

        tech, chance, reasons = recommend_technology(altitude, risk)

        return jsonify({
            'recommended': tech,
            'success_rate': round(chance * 100, 1),
            'reasons': reasons
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)



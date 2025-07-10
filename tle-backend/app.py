import urllib.request
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from skyfield.api import load, wgs84

app = Flask(__name__)
CORS(app)

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

        result = []
        for sat in sats[:20]:  # 위성 20개까지만 제한
            geo = sat.at(t)
            subpoint = wgs84.subpoint(geo)
            velocity = sat.velocity.km_per_s  # ✅ 위성 속도 계산 추가
            result.append({
                'name': f"{group}-{sat.model.satnum}",
                'lat': subpoint.latitude.degrees,
                'lon': subpoint.longitude.degrees,
                'alt': subpoint.elevation.km,
                'velocity': velocity  # ✅ 응답에 속도 포함
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommend', methods=['GET'])
def recommend():
    try:
        altitude = float(request.args.get('altitude'))
        risk = request.args.get('risk', '중간')
        velocity = float(request.args.get('velocity', 7.5))  # ✅ 속도 파라미터 받기

        technologies = {
            '레이저': {'base_success': 0.8, 'score': 0},
            '그물': {'base_success': 0.7, 'score': 0},
            '자기장': {'base_success': 0.6, 'score': 0},
            '로봇팔': {'base_success': 0.5, 'score': 0}
        }

        reasons = []

        # 고도 기반 추천
        if altitude > 1000:
            technologies['레이저']['score'] += 2
            reasons.append("고도가 1000km 이상으로 높아, 레이저 기술이 적합합니다.")
        elif 600 <= altitude <= 1000:
            technologies['그물']['score'] += 2
            reasons.append("고도가 중간 수준으로, 그물 기술이 효율적입니다.")
        elif altitude < 600:
            technologies['자기장']['score'] += 2
            reasons.append("고도가 낮아 자기장 기반 기술이 적합합니다.")

        # ✅ 속도 기반 추천 추가
        if velocity > 7.8:
            technologies['레이저']['score'] += 2
            reasons.append(f"속도가 매우 높아({velocity:.2f} km/s), 레이저 기술 외엔 어려움.")
        elif velocity < 7.4:
            technologies['로봇팔']['score'] += 1
            reasons.append(f"속도가 낮아({velocity:.2f} km/s), 로봇팔 접근 가능.")

        recommended = max(technologies.items(), key=lambda x: x[1]['score'])
        tech_name, tech_info = recommended

        success_chance = tech_info['base_success']
        if risk == '높음':
            success_chance += 0.05
        elif risk == '낮음':
            success_chance -= 0.05

        return jsonify({
            'recommended': tech_name,
            'success_rate': round(success_chance * 100, 1),
            'reasons': reasons
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

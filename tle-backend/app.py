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
        # 1. TLE 데이터 다운로드 및 3줄 구조 정제
        tle_data = urllib.request.urlopen(url).read().decode("utf-8")
        lines = tle_data.strip().splitlines()
        parsed_lines = []

        for i in range(0, len(lines), 3):
            try:
                line1 = lines[i+1]
                line2 = lines[i+2]
                norad_id = line1.split()[1]  # ex: 49537U
                name = f"{group}-{norad_id}"
                parsed_lines.append(name)
                parsed_lines.append(line1)
                parsed_lines.append(line2)
            except IndexError:
                continue  # 줄이 부족하면 skip

        # 2. 임시 파일에 저장
        with tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".tle") as f:
            f.write('\n'.join(parsed_lines))
            tle_file_path = f.name

        # 3. Skyfield로 TLE 로딩
        sats = load.tle_file(tle_file_path, reload=True)
        ts = load.timescale()
        t = ts.now()

        # 4. 중복 제거 (satnum 기준)
        seen_ids = set()
        result = []

        for sat in sats[:20]:
            sat_id = sat.model.satnum  # 고유 NORAD ID
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

if __name__ == '__main__':
    app.run(debug=True)


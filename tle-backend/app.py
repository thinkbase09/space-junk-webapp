import urllib.request
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from skyfield.api import load, wgs84
import os
import math

app = Flask(__name__)
CORS(app)

# ✅ 거리 계산 함수 (위도, 경도, 고도 포함)
def distance_between(sat1, sat2):
    lat1 = math.radians(sat1['lat'])
    lon1 = math.radians(sat1['lon'])
    lat2 = math.radians(sat2['lat'])
    lon2 = math.radians(sat2['lon'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    earth_radius = 6371  # km
    surface_distance = earth_radius * c

    alt_diff = abs(sat1['alt'] - sat2['alt'])
    distance = math.sqrt(surface_distance**2 + alt_diff**2)

    return distance

# ✅ 근접 위성 수 세기
def count_nearby_satellites(satellites, target_sat, threshold_km=100):
    count = 0
    for sat in satellites:
        if sat['name'] == target_sat['name']:
            continue
        dist = distance_between(target_sat, sat)
        if dist <= threshold_km:
            count += 1
    return count

# ✅ 위험도 평가 함수
def assess_risk(altitude, nearby_count):
    if altitude > 1000:
        base_risk = '높음'
    elif 700 <= altitude <= 1000:
        base_risk = '중간'
    else:
        base_risk = '낮음'

    if nearby_count >= 10:
        return '높음'
    elif nearby_count >= 5:
        return '중간'
    else:
        return base_risk

# ✅ 위성 정보 API (자동 위험도 포함)
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

        # ✅ 위험도 계산 추가
        for sat in result:
            nearby_count = count_nearby_satellites(result, sat, threshold_km=100)
            sat['nearby_count'] = nearby_count
            sat['risk'] = assess_risk(sat['alt'], nearby_count)

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

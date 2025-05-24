import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// ✔️ Cesium Ion 토큰 설정
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4MDYyZjU5ZC0wZWVkLTQxMGMtYWNmNC1kY2Y1MjZlZmYyOWYiLCJpZCI6MzA1ODAzLCJpYXQiOjE3NDgwNzcwMjJ9.g-rkvBdaj2kXY-e1Bstlu2pf0pDye55la2mrHhtSG1M';

function CesiumViewer({ tleGroup }) {
  const viewerRef = useRef(null);
  const viewerRefInstance = useRef(null);

  // 🛰️ Viewer 최초 1회만 생성
  useEffect(() => {
    if (!viewerRef.current) return;

    if (!viewerRefInstance.current) {
      viewerRefInstance.current = new Cesium.Viewer(viewerRef.current, {
        shouldAnimate: true,
        timeline: false,
        animation: false,
      });
    }
  }, []);

  // 📡 TLE 그룹 변경 시 위성 데이터 불러오기
  useEffect(() => {
    if (!tleGroup || !viewerRefInstance.current) return;

    const viewer = viewerRefInstance.current;

    // 🚨 한 프레임 뒤에 removeAll 실행 → 완전 제거 보장
    setTimeout(() => {
      viewer.entities.removeAll();

      const url = `http://localhost:5000/api/debris?group=${tleGroup}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          const addedNames = new Set();

          data.forEach((sat) => {
            if (addedNames.has(sat.name)) return;
            addedNames.add(sat.name);

            viewer.entities.add({
              name: sat.name,
              position: Cesium.Cartesian3.fromDegrees(sat.lon, sat.lat, sat.alt * 1000),

              // ✅ 위성 모델
              model: {
                uri: '/models/Meteor1.glb',
                scale: 500,
              },

              // ✅ 라벨 스타일 (크고 눈에 띄게)
              label: {
                text: sat.name,
                font: "24px sans-serif",
                fillColor: Cesium.Color.YELLOW,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -20),
              },

              // ✅ 포인트 (선명하게 보이도록 보조)
              point: {
                pixelSize: 10,
                color: Cesium.Color.RED.withAlpha(0.9),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
              },
            });
          });

          if (data.length > 0) {
            const first = data[0];
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                first.lon,
                first.lat,
                (first.alt + 300) * 1000
              ),
            });
          }
        })
        .catch((err) => {
          console.error("❌ JSON 불러오기 실패:", err);
        });
    }, 0);
  }, [tleGroup]);

  return <div ref={viewerRef} style={{ height: "100vh", width: "100%" }} />;
}

export default CesiumViewer;

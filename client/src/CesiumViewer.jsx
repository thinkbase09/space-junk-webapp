import { useEffect, useRef } from "react";
import {
  Viewer,
  Ion,
  Cartesian3,
  Color,
  VerticalOrigin,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// 정적 리소스 경로 설정
window.CESIUM_BASE_URL = "/Cesium";

// Ion 토큰 설정
Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// 위험도에 따라 색상 결정
function getColorByRisk(risk) {
  if (risk <= 2) return Color.LIME.withAlpha(0.9);
  else if (risk === 3) return Color.YELLOW.withAlpha(0.9);
  else return Color.RED.withAlpha(0.9);
}

function CesiumViewer({ tleGroup }) {
  const viewerRef = useRef(null);
  const viewerRefInstance = useRef(null);
  const satelliteDataRef = useRef({}); // 클릭 시 이름 찾기용

  useEffect(() => {
    if (!viewerRef.current || viewerRefInstance.current) return;

    const viewer = new Viewer(viewerRef.current, {
      shouldAnimate: true,
      timeline: true,
      animation: true,
      baseLayerPicker: true,
      navigationHelpButton: true,
      infoBox: true,
      sceneModePicker: true,
    });

    viewer.scene.globe.enableLighting = false;
    viewerRefInstance.current = viewer;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(async (click) => {
      const picked = viewer.scene.pick(click.position);
      if (picked && picked.id && picked.id.position) {
        const entity = picked.id;

        const cartesian = entity.position.getValue(viewer.clock.currentTime);
        const altitude = cartesian.z / 1000;

        try {
          const res = await fetch(
            `https://thinkbasebackend.onrender.com/api/recommend?altitude=${altitude}&velocity=${entity.properties.velocity}`
          );
          const data = await res.json();

          const name = entity.name || "Unknown Satellite";
          const velocity = Number(entity.properties.velocity);

          entity.description = `
            <h3>${name}</h3>
            <p><strong>고도:</strong> ${altitude.toFixed(1)} km</p>
            <p><strong>속도:</strong> ${velocity.toFixed(2)} km/s</p>
            <p><strong>추천 기술:</strong> ${data.recommended}</p>
            <p><strong>성공률:</strong> ${data.success_rate}%</p>
            <ul>
              ${data.reasons.map((r) => `<li>${r}</li>`).join("")}
            </ul>
          `;

          viewer.selectedEntity = entity;
        } catch (err) {
          console.error("❌ 추천 API 실패:", err);
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }, []);

  useEffect(() => {
    if (!tleGroup || !viewerRefInstance.current) return;

    const viewer = viewerRefInstance.current;
    viewer.entities.removeAll();
    satelliteDataRef.current = {};

    const url = `${process.env.REACT_APP_API_BASE_URL}/api/debris?group=${tleGroup}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const added = new Set();

        data.forEach((sat) => {
          if (added.has(sat.name)) return;
          added.add(sat.name);

          const risk =
            sat.alt < 600 ? 3 : sat.alt < 1000 ? 2 : sat.alt < 2000 ? 1 : 0;
          const vel = Number(sat.velocity);
          if (vel > 8) risk += 2;
          else if (vel > 5) risk += 1;

          viewer.entities.add({
            name: sat.name,
            position: Cartesian3.fromDegrees(
              sat.lon,
              sat.lat,
              sat.alt * 1000
            ),
            point: {
              pixelSize: 10,
              color: getColorByRisk(risk),
              outlineColor: Color.WHITE,
              outlineWidth: 2,
            },
            properties: {
              velocity: vel,
            },
          });
        });

        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(0, 0, 40000000),
        });
      })
      .catch((err) => console.error("❌ Fetch 실패:", err));
  }, [tleGroup]);

  return (
    <div
      ref={viewerRef}
      className="Viewer-container"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}

export default CesiumViewer;

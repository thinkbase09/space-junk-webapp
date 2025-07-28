import { useEffect, useRef } from "react";
import {
  Viewer,
  Ion,
  Cartesian3,
  Color,
  LabelStyle,
  VerticalOrigin,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartographic
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// 정적 리소스 경로 설정
window.CESIUM_BASE_URL = "/Cesium";

// Ion 토큰 설정
Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4MDYyZjU5ZC0wZWVkLTQxMGMtYWNmNC1kY2Y1MjZlZmYyOWYiLCJpZCI6MzA1ODAzLCJpYXQiOjE3NDgwNzcwMjJ9.g-rkvBdaj2kXY-e1Bstlu2pf0pDye55la2mrHhtSG1M";

function CesiumViewer({ tleGroup }) {
  const viewerRef = useRef(null);
  const viewerRefInstance = useRef(null);

  // 위험도 색상 계산 함수
  function getColorByRisk(risk) {
    if (risk <= 2) return Color.LIME.withAlpha(0.9);
    else if (risk <= 4) return Color.ORANGE.withAlpha(0.9);
    else return Color.RED.withAlpha(0.9);
  }

  // 1. Cesium Viewer 초기화
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

    // 클릭 이벤트 등록
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (picked && picked.id && picked.id.position) {
        const entity = picked.id;

        const cartesian = entity.position.getValue(viewer.clock.currentTime);
        const cartographic = Cartographic.fromCartesian(cartesian);
        const altitude = cartographic.height / 1000;

        const velocity = entity.properties?.velocity ?? 0;
        const risk = entity.properties?.risk_score ?? null;
        const recommended = entity.properties?.recommended ?? "-";
        const success_rate = entity.properties?.success_rate ?? "-";
        const reasons = entity.properties?.reasons ?? [];

        entity.description = `
          <h3>${entity.name}</h3>
          <p><strong>고도:</strong> ${altitude.toFixed(1)} km</p>
          <p><strong>속도:</strong> ${velocity.toFixed(2)} km/s</p>
          <p><strong>추천 기술:</strong> ${recommended}</p>
          <p><strong>성공률:</strong> ${success_rate}%</p>
          <ul>
            ${reasons.map((r) => `<li>${r}</li>`).join("")}
          </ul>
        `;
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }, []);

  // 2. tleGroup 변경 시 데이터 요청
  useEffect(() => {
    if (!tleGroup || !viewerRefInstance.current) return;

    const viewer = viewerRefInstance.current;

    console.log("📡 요청 그룹:", tleGroup);
    viewer.entities.removeAll();

    const url = `${process.env.REACT_APP_API_BASE_URL}/api/debris?group=${tleGroup}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const added = new Set();

        data.forEach((sat) => {
          if (added.has(sat.name)) return;
          added.add(sat.name);

          const risk = sat.risk_score ?? 0;

          viewer.entities.add({
            name: sat.name,
            position: Cartesian3.fromDegrees(sat.lon, sat.lat, sat.alt * 1000),
            properties: {
              velocity: sat.velocity,
              risk_score: sat.risk_score,
              recommended: sat.recommended,
              success_rate: sat.success_rate,
              reasons: sat.reasons,
            },
            model: {
              uri: "/models/Meteor1.glb",
              scale: 500,
            },
            label: {
              text: sat.name,
              font: "24px sans-serif",
              fillColor: Color.YELLOW,
              style: LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 2,
              verticalOrigin: VerticalOrigin.BOTTOM,
              pixelOffset: new Cartesian3(0, -20),
            },
            point: {
              pixelSize: 10,
              color: getColorByRisk(risk),
              outlineColor: Color.WHITE,
              outlineWidth: 2,
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

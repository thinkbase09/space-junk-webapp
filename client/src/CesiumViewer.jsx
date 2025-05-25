import { useEffect, useRef } from "react";
import {
  Viewer,
  Ion,
  Cartesian3,
  Color,
  LabelStyle,
  VerticalOrigin
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// 정적 리소스 경로 설정
window.CESIUM_BASE_URL = "/cesium";

// Ion 토큰 설정
Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4MDYyZjU5ZC0wZWVkLTQxMGMtYWNmNC1kY2Y1MjZlZmYyOWYiLCJpZCI6MzA1ODAzLCJpYXQiOjE3NDgwNzcwMjJ9.g-rkvBdaj2kXY-e1Bstlu2pf0pDye55la2mrHhtSG1M";

function CesiumViewer({ tleGroup }) {
  const viewerRef = useRef(null);
  const viewerRefInstance = useRef(null);

  // 1. 최초 Viewer 생성
  useEffect(() => {
    if (!viewerRef.current || viewerRefInstance.current) return;

    viewerRefInstance.current = new Viewer(viewerRef.current, {
      shouldAnimate: true,
      timeline: true,
      animation: true,
      baseLayerPicker: true,
      navigationHelpButton: true,
      infoBox: true,
      sceneModePicker: true,
    });
  }, []);

  // 2. tleGroup이 바뀔 때마다 fetch 요청 & 엔티티 렌더링
  useEffect(() => {
    if (!tleGroup || !viewerRefInstance.current) return;

    const viewer = viewerRefInstance.current;

    console.log("📡 현재 요청한 TLE 그룹:", tleGroup);
    viewer.entities.removeAll();

    fetch(`http://localhost:5000/api/debris?group=${tleGroup}`)
      .then((res) => res.json())
      .then((data) => {
        const added = new Set();

        data.forEach((sat) => {
          if (added.has(sat.name)) return;
          added.add(sat.name);

          viewer.entities.add({
            name: sat.name,
            position: Cartesian3.fromDegrees(sat.lon, sat.lat, sat.alt * 1000),
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
              color: Color.RED.withAlpha(0.9),
              outlineColor: Color.WHITE,
              outlineWidth: 2,
            },
          });
        });

        // 카메라 초기 위치 고정 (지구 전체가 보이도록)
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

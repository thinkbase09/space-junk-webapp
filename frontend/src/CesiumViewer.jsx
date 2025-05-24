import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhYWI0ODhlNi1lMTRmLTRhM2ItOGZiMy1mOTk1YWVlNDJhOWMiLCJpZCI6MzA1ODAzLCJpYXQiOjE3NDgwNzY1Mjd9.G5VECJLDE8GksFuAmZi_DcVibGaVyF07rf2HNi4-ZTU';

function CesiumViewer() {
  const viewerRef = useRef(null);

  useEffect(() => {
    const viewer = new Cesium.Viewer(viewerRef.current); // ✅ 지형 제거

    viewer.entities.add({
      name: "우주쓰레기#1",
      position: Cesium.Cartesian3.fromDegrees(127.0, 37.5, 500000),
      point: { pixelSize: 10, color: Cesium.Color.RED },
      label: {
        text: "우주 쓰레기 #1",
        font: "14px sans-serif",
        fillColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
    });

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(127.0, 37.5, 700000),
    });

    return () => viewer.destroy();
  }, []);

  return <div ref={viewerRef} style={{ height: "100vh", width: "100%" }} />;
}

export default CesiumViewer;

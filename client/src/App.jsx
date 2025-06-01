import "./App.css";
import CesiumViewer from "./CesiumViewer";
import { useState } from "react";

function App() {
  const [tleGroup, setTleGroup] = useState("cosmos-1408-debris");

  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/perigee-favicon.png"
            alt="Perigee logo"
            onClick={handleLogoClick}
            style={{
              width: "36px",
              height: "36px",
              cursor: "pointer",
              marginRight: "12px"
            }}
          />
        </div>
        <select onChange={(e) => setTleGroup(e.target.value)}>
          <option value="cosmos-1408-debris">Cosmos 1408</option>
          <option value="cosmos-2251-debris">Cosmos 2251</option>
          <option value="fengyun-1c-debris">Fengyun 1C</option>
          <option value="iridium-33-debris">Iridium 33</option>
        </select>
      </header>
      <div className="Viewer-container">
        <CesiumViewer tleGroup={tleGroup} />
      </div>
    </div>
  );
}

export default App;

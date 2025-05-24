import { useState } from "react";
import CesiumViewer from "./CesiumViewer";

function App() {
  const [tleGroup, setTleGroup] = useState("cosmos-1408-debris");

  return (
    <div>
      <select
        value={tleGroup}
        onChange={(e) => setTleGroup(e.target.value)}
        style={{
          fontSize: "1.2rem",
          padding: "0.5rem 1rem",
          margin: "1rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      >
        <option value="cosmos-1408-debris">Cosmos 1408</option>
        <option value="fengyun-1c-debris">Fengyun 1C</option>
        <option value="iridium-33-debris">Iridium 33</option>
        <option value="cosmos-2251-debris">Cosmos 2251</option>
      </select>

      <CesiumViewer tleGroup={tleGroup} />
    </div>
  );
}

export default App;

import * as React from "react";
import * as Earthstar from "earthstar";
import { ClientSettingsContext } from "react-earthstar";
import { MenuBar } from "./MenuBar";
import "./App.css";

function App() {
  const settings = React.useMemo(() => {
    return new Earthstar.ClientSettings();
  }, []);

  return (
    <ClientSettingsContext.Provider value={settings}>
      <MenuBar />
      <div>
        {/* Applets listed here! */}
      </div>
    </ClientSettingsContext.Provider>
  );
}

export default App;

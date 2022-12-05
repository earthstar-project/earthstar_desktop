import * as React from "react";
import * as Earthstar from "earthstar";
import { ClientSettingsContext } from "react-earthstar";
import { MenuBar } from "./MenuBar.tsx";
import "./App.css";

function App() {
  const settings = React.useMemo(() => {
    return new Earthstar.ClientSettings();
  }, []);

  return (
    <ClientSettingsContext.Provider value={settings}>
      <MenuBar />
    </ClientSettingsContext.Provider>
  );
}

export default App;

import * as React from "react";
import * as Earthstar from "earthstar";
import { ReplicaDriverWeb } from "earthstar/browser";
import {
  LocalStorageSettingsWriter,
  Peer,
  useLocalStorageEarthstarSettings,
} from "react-earthstar";
import "./App.css";

import { KeypairZone } from "./KeypairZone";
import { ShareZone } from "./ShareZone";
import { ServerZone } from "./ServerZone";

function App() {
  const init = useLocalStorageEarthstarSettings("");

  return (
    <Peer
      {...init}
      onCreateShare={(addr) => {
        const driver = new ReplicaDriverWeb(addr);
        return new Earthstar.Replica({ driver });
      }}
    >
      <LocalStorageSettingsWriter storageKey="" />
      <div>
        <h1>earthstar control panel</h1>
        <KeypairZone />
        <ShareZone />
        <ServerZone />
      </div>
    </Peer>
  );
}

export default App;

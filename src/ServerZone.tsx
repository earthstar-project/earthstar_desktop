import * as React from "react";
import { useServerSettings } from "react-earthstar";
import "./ServerZone.css"

export function ServerZone() {
  const [newServer, setNewServer] = React.useState("");
  const [servers, addServer] = useServerSettings();

  return (
    <fieldset id="server-zone">
      <legend>Servers</legend>

      {servers.length === 0
        ? <div>No replica servers known.</div>
        : servers.map((url) => {
          return <ServerItem url={url} />;
        })}

      <form
        onSubmit={(e) => {
          e.preventDefault();

          const isValid = addServer(newServer);

          if (!isValid) {
            alert("Please provide a valid server URL.");
          }

          setNewServer("");
        }}
      >
        <input
          type="url"
          value={newServer}
          onChange={(e) => {
            setNewServer(e.target.value);
          }}
        />

        <button type="submit">Add server</button>
      </form>
    </fieldset>
  );
}

function ServerItem({ url }: { url: string }) {
  const [, , removeServer] = useServerSettings();

  return (
    <li>
      {url}{" "}
      <button
        onClick={() => {
          removeServer(url);
        }}
      >
        Forget
      </button>
    </li>
  );
}

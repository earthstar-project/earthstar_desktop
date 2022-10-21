import * as React from "react";
import { useReplicaServers } from "react-earthstar";

export function ServerZone() {
  const [newServer, setNewServer] = React.useState("");
  const [replicaServers, setReplicaServers] = useReplicaServers();

  console.log(replicaServers);

  return (
    <fieldset>
      <legend>Replica servers</legend>

      {replicaServers.length === 0
        ? <div>No replica servers known.</div>
        : replicaServers.map((url) => {
          return <ServerItem url={url} />;
        })}

      <form
        onSubmit={(e) => {
          e.preventDefault();

          setReplicaServers([...replicaServers, newServer]);

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
  const [serverUrls, setServerUrls] = useReplicaServers();

  return (
    <li>
      {url}{" "}
      <button
        onClick={() => {
          const nextServerUrls = serverUrls.filter((serverUrl) =>
            serverUrl !== url
          );

          setServerUrls(nextServerUrls);
        }}
      >
        Forget
      </button>
    </li>
  );
}

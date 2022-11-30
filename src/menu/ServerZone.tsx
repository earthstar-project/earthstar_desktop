import { Peer, Replica, ReplicaDriverWeb } from "earthstar";
import * as React from "react";
import {
  ClientSettingsContext,
  ShareLabel,
  useAuthorSettings,
  useServerSettings,
} from "react-earthstar";
import "./ServerZone.css";

export function ServerZone() {
  const [newServer, setNewServer] = React.useState("");
  const [servers, addServer] = useServerSettings();

  const settings = React.useContext(ClientSettingsContext);

  const { peer } = React.useMemo(() => {
    return settings.getPeer({
      sync: false,
      onCreateReplica: (addr, secret) => {
        return new Replica({
          driver: new ReplicaDriverWeb(addr),
          shareSecret: secret,
        });
      },
    });
  }, [settings]);

  return (
    <fieldset id="server-zone">
      <legend>Servers</legend>

      {servers.length === 0
        ? <div>No replica servers known.</div>
        : (
          <ul id="server-items">
            {servers.map((url) => {
              return <ServerItem key={url} peer={peer} url={url} />;
            })}
          </ul>
        )}
      <hr />
      <form
        id="add-server-form"
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
          placeholder="https://my.server"
          required
          value={newServer}
          onChange={(e) => {
            setNewServer(e.target.value);
          }}
        />

        <button type="submit">Add{"\u00A0"}server</button>
      </form>
    </fieldset>
  );
}

type SyncOpStatus = {
  status: "failed";
  error: Error;
} | {
  status: "succeeded";
  sharesInCommon: string[];
} | {
  status: "syncing";
  sharesInCommon: string[];
} | {
  status: "not_started";
};

function ServerItem({ url, peer }: { url: string; peer: Peer }) {
  const [, , removeServer] = useServerSettings();

  const [syncResult, setSyncResult] = React.useState<SyncOpStatus>({
    status: "not_started",
  });

  return (
    <li className="server-item">
      <div className="server-item-address-row">
        <div className="server-item-address-status">
          <div>{url}</div>
          <SyncResult status={syncResult} />
        </div>
        <div className="server-item-buttons">
          <button
            onClick={() => {
              const onceSyncer = peer.sync(url, false);

              const unsub = onceSyncer.onStatusChange((newStatus) => {
                // do something with the status.
                setSyncResult((prev) => {
                  const sharesInCommon = Object.keys(newStatus);

                  if (
                    prev.status === "syncing" &&
                    Object.keys(prev.sharesInCommon).length ===
                      sharesInCommon.length
                  ) {
                    return prev;
                  }

                  return {
                    status: "syncing",
                    sharesInCommon: sharesInCommon,
                  };
                });
              });

              onceSyncer.isDone().then(() => {
                // Set result with status.
                setSyncResult({
                  status: "succeeded",
                  sharesInCommon: Object.keys(onceSyncer.getStatus()),
                });
              }).catch((err) => {
                // Set failed result.
                setSyncResult({
                  status: "failed",
                  error: err,
                });
              }).finally(() => {
                unsub();
              });
            }}
            disabled={syncResult.status === "syncing"}
          >
            Sync
          </button>
          <button
            onClick={() => {
              const isSure = confirm(`Are you sure you want to remove ${url}?`);

              if (isSure) {
                removeServer(url);
              }
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function SyncResult({ status }: { status: SyncOpStatus }) {
  const [author] = useAuthorSettings();

  const [showingCommonShares, setShowingCommonShares] = React.useState(false);

  switch (status.status) {
    case "not_started":
      return null;
    case "failed": {
      return (
        <div className="sync-status">
          <div className="status-dot failed-dot">
          </div>
          <div className="sync-status-msg">
            {status.error.message || "Failed"}
          </div>
        </div>
      );
    }
    case "succeeded":
    case "syncing":
      return (
        <div className="sync-status">
          <div
            className={`status-dot ${
              status.sharesInCommon.length > 0
                ? "succeeding-dot"
                : "nothing-in-common-dot"
            }`}
          >
          </div>
          {status.sharesInCommon.length === 0
            ? <div className="sync-status-msg">No shares in common.</div>
            : (
              <div>
                <div className="sync-status">
                  <div
                    className="sync-status-msg"
                    title={`Shares in common: \n${
                      status.sharesInCommon.join("\n")
                    }`}
                  >
                    {`${status.sharesInCommon.length} share${
                      status.sharesInCommon.length > 1 ? "s" : ""
                    } synced`}
                  </div>
                  <button
                    className="show-common-shares-btn"
                    onClick={() => {
                      setShowingCommonShares((prev) => !prev);
                    }}
                  >
                    {showingCommonShares ? "Hide" : "Show"}
                  </button>
                </div>
                {showingCommonShares
                  ? status.sharesInCommon.map((share) => {
                    return (
                      <div key={share}>
                        <ShareLabel
                          className="sync-status-msg"
                          address={share}
                          viewingAuthorSecret={author?.secret}
                          iconSize={8}
                        />
                      </div>
                    );
                  })
                  : null}
              </div>
            )}
        </div>
      );
  }
}

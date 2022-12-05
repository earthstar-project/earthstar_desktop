import * as React from "react";
import * as Earthstar from "earthstar";
import {
  AuthorLabel,
  ClientSettingsContext,
  ShareLabel,
  useAuthorSettings,
  useReplica,
  useShareSecretSettings,
  useShareSettings,
} from "react-earthstar";
import { Combobox, Listbox } from "@headlessui/react";
import "./ServerSettings.css";

const HOSTED_SHARE_TEMPLATE =
  `/server-settings/1.*/shares/{shareHash}/{hostType}`;

export function queryByTemplate<F = Earthstar.DefaultFormats>(
  replica: Earthstar.ReplicaCache,
  template: string,
  moreQueryOptions: Omit<Earthstar.Query<[string]>, "formats"> = {},
  formats?: Earthstar.FormatsArg<F>,
): Earthstar.FormatDocType<F>[] {
  let { glob } = Earthstar.parseTemplate(template);
  let { query, regex } = Earthstar.globToQueryAndRegex(glob);
  query = { ...query, ...moreQueryOptions };

  let docs = replica.queryDocs(query, formats);
  if (regex != null) {
    let re = new RegExp(regex);
    docs = docs.filter((doc) => re.test(doc.path));
  }
  return docs;
}

function getHostedShares(
  replica: Earthstar.ReplicaCache,
): { share: Earthstar.ShareAddress; deleteAfter?: Date; path: string }[] {
  // Get shares configured by settings.
  const hostedShares = queryByTemplate(
    replica,
    HOSTED_SHARE_TEMPLATE,
  );

  const shares: {
    share: Earthstar.ShareAddress;
    deleteAfter?: Date;
    path: string;
  }[] = [];

  for (const hostedShareDoc of hostedShares) {
    const pathVariables = Earthstar.extractTemplateVariablesFromPath(
      HOSTED_SHARE_TEMPLATE,
      hostedShareDoc.path,
    ) as Record<string, string>;

    if (pathVariables === null) {
      continue;
    }

    const isEphemeral = pathVariables["hostType"] === "host!";

    const shareAddress = hostedShareDoc.text;

    if (Earthstar.isErr(Earthstar.parseShareAddress(shareAddress))) {
      continue;
    }

    if (isEphemeral && hostedShareDoc.text.length > 0) {
      shares.push({
        share: shareAddress,
        deleteAfter: new Date((hostedShareDoc.deleteAfter as number) / 1000),
        path: hostedShareDoc.path,
      });
    } else if (hostedShareDoc.text.length > 0) {
      shares.push({ share: shareAddress, path: hostedShareDoc.path });
    }
  }

  return shares;
}

function App() {
  const [selectedShare, setSelectedShare] = React.useState("");

  const settings = React.useMemo(() => {
    return new Earthstar.ClientSettings();
  }, []);

  const { peer, unsubscribeFromSettings } = React.useMemo(() => {
    return settings.getPeer({
      sync: "continuous",
      onCreateReplica: (addr, secret) => {
        return new Earthstar.Replica({
          driver: new Earthstar.ReplicaDriverWeb(addr),
          shareSecret: secret,
        });
      },
    });
  }, [settings]);

  React.useEffect(() => {
    return () => unsubscribeFromSettings();
  }, [unsubscribeFromSettings]);

  const replica = React.useMemo(() => {
    return peer.getReplica(selectedShare);
  }, [selectedShare, peer]);

  return (
    <ClientSettingsContext.Provider value={settings}>
      <div className="app">
        <h1>Server Settings</h1>
        <fieldset id="share-selection">
          <legend>Which share are the server settings being stored on?</legend>

          <ShareSelection
            selectedShare={selectedShare}
            setSelectedShare={setSelectedShare}
          />

          {selectedShare !== ""
            ? <CommonServers peer={peer} selectedShare={selectedShare} />
            : null}
        </fieldset>

        {replica ? <SettingsPanel replica={replica} /> : null}
      </div>
    </ClientSettingsContext.Provider>
  );
}

function ShareSelection(
  { selectedShare, setSelectedShare }: {
    selectedShare: string;
    setSelectedShare: (share: string) => void;
  },
) {
  const [shares] = useShareSettings();
  const [author] = useAuthorSettings();

  if (shares.length === 0) {
    return <div>No known shares. Set them on the launcher</div>;
  }

  return (
    <div>
      <Listbox value={selectedShare} onChange={setSelectedShare}>
        <Listbox.Button className="listbox-button">
          <div className="selection-box">
            {selectedShare === "" ? <span>Select a share</span> : (
              <ShareLabel
                address={selectedShare}
                viewingAuthorSecret={author?.secret}
              />
            )}
            <span className="selection-arrow">▼</span>
          </div>
        </Listbox.Button>
        <div className="options-root">
          <Listbox.Options className="listbox-options">
            {shares.map((share) => {
              return (
                <Listbox.Option
                  key={share}
                  value={share}
                  className="option-root"
                >
                  {({ active, selected }) => (
                    <div
                      className={`listbox-option ${
                        active ? "listbox-option-active" : ""
                      } ${selected ? "listbox-option-selected" : ""}`}
                    >
                      <ShareLabel
                        address={share}
                        viewingAuthorSecret={author?.secret}
                      />
                      <div className={"checkmark"}>{selected && "✓"}</div>
                    </div>
                  )}
                </Listbox.Option>
              );
            })}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}

function CommonServers(
  { peer, selectedShare }: {
    peer: Earthstar.Peer;
    selectedShare: Earthstar.ShareAddress;
  },
) {
  const [serversWithShare, setServersWithShare] = React.useState<string[]>(
    [],
  );
  const [syncersCount, setSyncersCount] = React.useState(0);
  const [author] = useAuthorSettings();

  React.useEffect(() => {
    setServersWithShare([]);

    const syncers = peer.getSyncers();

    setSyncersCount(syncers.size);

    for (const [_id, { syncer, description }] of syncers) {
      if (syncer.isDone().state === "rejected") {
        setSyncersCount((prev) => prev - 1);

        continue;
      }

      const hasShare = Object.keys(syncer.getStatus()).includes(
        selectedShare,
      );

      if (hasShare) {
        setServersWithShare((prev) => {
          return [...prev, description];
        });
      }
    }
  }, [peer, selectedShare]);

  React.useEffect(() => {
    const syncerUnsubs: (() => void)[] = [];

    const unsub = peer.onSyncersChange((syncers) => {
      setSyncersCount(syncers.size);

      for (const [_id, { syncer, description }] of syncers) {
        const syncerUnsub = syncer.onStatusChange((status) => {
          if (status[selectedShare].docs.status === "aborted") {
            setSyncersCount((prev) => prev - 1);

            return;
          }

          const hasShare = Object.keys(status).includes(selectedShare);

          if (hasShare) {
            setServersWithShare((prev) => {
              const set = new Set(prev);

              set.add(description);

              return Array.from(set);
            });
          } else {
            setServersWithShare((prev) => {
              const set = new Set(prev);

              set.delete(description);

              return Array.from(set);
            });
          }
        });

        syncerUnsubs.push(() => {
          syncerUnsub();

          setServersWithShare((prev) => {
            const set = new Set(prev);

            set.delete(description);

            return Array.from(set);
          });
        });
      }
    });

    return () => {
      unsub();

      for (const unsub of syncerUnsubs) {
        unsub();
      }
    };
  }, [peer]);

  if (syncersCount === 0) {
    return (
      <div className="not-syncing-servers">
        You're not syncing with anyone right now, so your changes will stay on
        this device.
      </div>
    );
  }

  if (serversWithShare.length === 0) {
    return (
      <div className="not-syncing-servers">
        <span>
          None of the servers you're syncing with know about{" "}
          <ShareLabel
            address={selectedShare}
            viewingAuthorSecret={author?.secret}
            iconSize={8}
          />
        </span>
      </div>
    );
  }

  return (
    <div className="syncing-servers">
      Syncing with
      {serversWithShare.map((server) => {
        return (
          <span key={server} className="syncing-server">{" "}{server}</span>
        );
      })}
    </div>
  );
}

function SettingsPanel({ replica }: { replica: Earthstar.Replica }) {
  const [author] = useAuthorSettings();
  const [secrets] = useShareSecretSettings();

  const cb = React.useCallback((cache: Earthstar.ReplicaCache) => {
    return getHostedShares(cache);
  }, []);

  const hostedShares = useReplica(replica, cb);

  const [newHostedShare, setNewHostedShare] = React.useState("");
  const [isTemporary, setIsTemporary] = React.useState<false | Date>(false);

  const tomorrow = new Date();
  tomorrow.setDate(new Date().getDate() + 1);

  return (
    <>
      <div id="server-settings-connector"></div>
      <fieldset>
        <legend>
          Server settings on{" "}
          <ShareLabel
            address={replica.share}
            viewingAuthorSecret={author?.secret}
          />
        </legend>

        <div id="hosted-shares-root">
          <h3>Hosted shares ({hostedShares.length})</h3>

          <ul id="hosted-shares-list">
            {hostedShares.map((hostedShare) => {
              return (
                <li className="hosted-share" key={hostedShare.share}>
                  <div>
                    <ShareLabel
                      address={hostedShare.share}
                      viewingAuthorSecret={author?.secret}
                    />
                    {hostedShare.deleteAfter
                      ? (
                        <span className="hosted-until">
                          {" "}Hosted until {new Intl.DateTimeFormat().format(
                            hostedShare.deleteAfter,
                          )}
                        </span>
                      )
                      : null}
                  </div>
                  {author
                    ? (
                      <button
                        onClick={async () => {
                          await replica.set(author, {
                            text: "",
                            path: hostedShare.path,
                          });
                        }}
                      >
                        Remove
                      </button>
                    )
                    : null}
                </li>
              );
            })}
          </ul>

          {secrets[replica.share] && author
            ? (
              <>
                <form
                  id="hosted-share-form"
                  onSubmit={async (e) => {
                    e.preventDefault();

                    const shareHash = await Earthstar.Crypto.sha256base32(
                      newHostedShare,
                    );

                    if (isTemporary) {
                      await replica.set(author, {
                        text: newHostedShare,
                        path: `/server-settings/1.0/shares/${shareHash}/host!`,
                        deleteAfter: isTemporary.getTime() * 1000,
                      });
                    } else {
                      await replica.set(author, {
                        text: newHostedShare,
                        path: `/server-settings/1.0/shares/${shareHash}/host`,
                      });
                    }

                    setIsTemporary(false);
                    setNewHostedShare("");
                  }}
                >
                  <HostedShareCombobox
                    selectedShare={newHostedShare}
                    setSelectedShare={setNewHostedShare}
                    sharesToFilter={hostedShares.map((hosted) => hosted.share)}
                  />
                  <div id="hosted-share-controls">
                    <div id="host-temp-root">
                      <label className="host-temp-label">
                        <input
                          type="checkbox"
                          checked={!!isTemporary}
                          onChange={() => {
                            setIsTemporary((prev) => {
                              if (prev === false) {
                                return tomorrow;
                              } else {
                                return false;
                              }
                            });
                          }}
                        />
                        Host temporarily{isTemporary ? " until" : ""}
                      </label>
                      {isTemporary
                        ? (
                          <label className="host-temp-label">
                            <input
                              id="date-input"
                              value={isTemporary.toISOString().slice(0, 10)}
                              onChange={(e) => {
                                setIsTemporary(new Date(e.target.value));
                              }}
                              type="date"
                              min={tomorrow.toISOString().slice(0, 10)}
                            />
                          </label>
                        )
                        : null}
                    </div>

                    <button
                      id="hosted-share-add-btn"
                      type="submit"
                    >
                      Add share
                    </button>
                  </div>
                </form>
              </>
            )
            : null}
        </div>
      </fieldset>
      <div id="current-user-info">
        {secrets[replica.share]
          ? author
            ? (
              <div>
                Configuring as{" "}
                <AuthorLabel
                  address={author.address}
                  viewingAuthorSecret={author.secret}
                />
              </div>
            )
            : "No author keypair is configured so you can't change anything."
          : "The secret for this share is not known, so you cannot modify it."}
      </div>
    </>
  );
}

function HostedShareCombobox(
  { selectedShare, setSelectedShare, sharesToFilter }: {
    selectedShare: string;
    setSelectedShare: (addr: string) => void;
    sharesToFilter: string[];
  },
) {
  const [shares] = useShareSettings();
  const [author] = useAuthorSettings();

  const [query, setQuery] = React.useState("");

  const narrowedShares = shares.filter((share) => {
    return sharesToFilter.includes(share) === false;
  });

  const filteredShares = query === ""
    ? narrowedShares
    : narrowedShares.filter((share) => {
      return share.toLowerCase().includes(query.toLowerCase());
    });

  const [isValidShare, setIsValidShare] = React.useState<null | boolean>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const isValid = Earthstar.parseShareAddress(selectedShare);

    if (selectedShare === "") {
      return;
    }

    if (Earthstar.isErr(isValid) && inputRef.current) {
      inputRef.current.setCustomValidity("Enter a valid share address");
    } else if (Earthstar.notErr(isValid) && inputRef.current) {
      inputRef.current.setCustomValidity("");
      inputRef.current.reportValidity();
    }

    setIsValidShare(Earthstar.notErr(isValid));
  }, [selectedShare]);

  return (
    <Combobox value={selectedShare} onChange={setSelectedShare}>
      <Combobox.Input
        placeholder="+myshare.bxxx..."
        required
        ref={inputRef}
        className={`combobox-input ${
          isValidShare === true
            ? "input-valid-share"
            : isValidShare === null
            ? ""
            : "input-invalid-share"
        }`}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <div className="options-root">
        <Combobox.Options className="combobox-options">
          {query.length > 0 && (
            <Combobox.Option
              value={query}
              className="combobox-option"
            >
              {query}
            </Combobox.Option>
          )}
          {filteredShares.map((share) => (
            <Combobox.Option key={share} value={share} className="option-root">
              {({ active, selected }) => (
                <div
                  className={`combobox-option ${
                    active ? "listbox-option-active" : ""
                  } ${selected ? "listbox-option-selected" : ""}`}
                >
                  <ShareLabel
                    address={share}
                    viewingAuthorSecret={author?.secret}
                  />
                  <div className="full-share-address">{share}</div>
                </div>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
}

export default App;

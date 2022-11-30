import * as React from "react";
import {
  ShareLabel,
  useAuthorSettings,
  useShareSecretSettings,
  useShareSettings,
} from "react-earthstar";
import * as Earthstar from "earthstar";
import { Menu } from "@headlessui/react";
import CopyButton from "./CopyButton.tsx";
import "./ShareZone.css";

type PossibleChoices =
  | { type: "not_made" }
  | { type: "create" }
  | { type: "add" }
  | {
    type: "add_secret";
    address: string;
  };

export function ShareZone() {
  const [shares] = useShareSettings();

  const [choice, setChoice] = React.useState<
    { type: "not_made" } | { type: "create" } | { type: "add" } | {
      type: "add_secret";
      address: string;
    }
  >(
    { type: "not_made" },
  );

  return (
    <fieldset id="share-zone">
      <legend>Shares</legend>
      {choice.type === "not_made"
        ? <ShareList shares={shares} setChoice={setChoice} />
        : choice.type === "create"
        ? (
          <ShareCreatorForm
            goBack={() => {
              setChoice({ type: "not_made" });
            }}
          />
        )
        : choice.type === "add_secret"
        ? (
          <ShareAddSecretForm
            address={choice.address}
            cancel={() => {
              setChoice({ type: "not_made" });
            }}
          />
        )
        : (
          <ShareAddForm
            goBack={() => {
              setChoice({ type: "not_made" });
            }}
          />
        )}
    </fieldset>
  );
}

function ShareList(
  { shares, setChoice }: {
    shares: string[];
    setChoice: React.Dispatch<
      React.SetStateAction<PossibleChoices>
    >;
  },
) {
  return (
    <ul id="share-list">
      {shares.length === 0
        ? <div>You have no shares.</div>
        : shares.map((share) => {
          return (
            <ShareItem
              key={share}
              onClickAddSecret={() => {
                setChoice({ type: "add_secret", address: share });
              }}
              address={share}
            />
          );
        })}
      <hr />
      <div id="share-btn-row">
        <button onClick={() => setChoice({ type: "add" })}>
          Add existing share
        </button>
        <button onClick={() => setChoice({ type: "create" })}>
          Create new share
        </button>
      </div>
    </ul>
  );
}

function ShareItem(
  { address, onClickAddSecret }: {
    address: Earthstar.ShareAddress;
    onClickAddSecret: () => void;
  },
) {
  const [author] = useAuthorSettings();
  const [, , removeShare] = useShareSettings();
  const [secrets] = useShareSecretSettings();
  const secret = secrets[address];

  return (
    <li className="share-list-item">
      <ShareLabel address={address} viewingAuthorSecret={author?.secret} />

      <Menu>
        <div>
          <Menu.Button>
            Options
          </Menu.Button>
          <div className="share-item-menu">
            <Menu.Items className="share-item-menu-items">
              <Menu.Item>
                <CopyButton copyValue={address}>
                  Copy{"\u00A0"}address
                </CopyButton>
              </Menu.Item>
              <Menu.Item>
                {secret
                  ? (
                    <CopyButton copyValue={secret}>
                      Copy{"\u00A0"}secret
                    </CopyButton>
                  )
                  : (
                    <button onClick={onClickAddSecret}>
                      Add{"\u00A0"}secret
                    </button>
                  )}
              </Menu.Item>
              <Menu.Item>
                <button
                  onClick={() => {
                    removeShare(address);
                  }}
                >
                  Forget
                </button>
              </Menu.Item>
            </Menu.Items>
          </div>
        </div>
      </Menu>
    </li>
  );
}

function ShareAddForm(
  { goBack }: {
    goBack: () => void;
  },
) {
  const [, addShare] = useShareSettings();
  const [, addSecret] = useShareSecretSettings();
  const [address, setAddress] = React.useState("");
  const [secret, setSecret] = React.useState("");

  return (
    <form
      id="add-share-form"
      onSubmit={(e) => {
        e.preventDefault();

        // validate

        const isValid = addShare(address);

        if (Earthstar.isErr(isValid)) {
          alert(isValid.message);
          return;
        }

        if (secret.length > 0) {
          const isValid = addSecret(address, secret);

          if (Earthstar.isErr(isValid)) {
            alert("The secret you provided was not correct!");
            return;
          }
        }

        goBack();
      }}
    >
      <label>Share address</label>
      <input
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
        }}
        required
      />

      <label>Share secret (optional)</label>
      <input
        type="password"
        value={secret}
        onChange={(e) => {
          setSecret(e.target.value);
        }}
      />
      {secret.length === 0
        ? (
          <p id="secret-explainer">
            Without the share secret, you will only be able to read data from
            this share.
          </p>
        )
        : null}
      <hr />
      <div id="add-share-form-btns">
        <button type="submit">Add</button>
        <button
          onClick={() => {
            goBack();
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ShareCreatorForm(
  { goBack }: {
    goBack: () => void;
  },
) {
  const [name, setName] = React.useState("");

  const [proposedKeypair, setProposedKeypair] = React.useState<
    Earthstar.ShareKeypair | null
  >(null);
  const [error, setError] = React.useState<null | string>(null);

  const [, addShare] = useShareSettings();
  const [, addSecret] = useShareSecretSettings();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (proposedKeypair) {
          addShare(proposedKeypair.shareAddress);
          addSecret(proposedKeypair.shareAddress, proposedKeypair.secret);
        }

        goBack();
      }}
    >
      <div id="creator-form-share-address">
        <span>+</span>
        <input
          placeholder="myshare"
          id="creator-form-share-address-input"
          value={name}
          onChange={async (e) => {
            e.preventDefault();
            setName(e.target.value);

            const result = await Earthstar.Crypto.generateShareKeypair(
              e.target.value,
            );

            if (Earthstar.isErr(result)) {
              setError(result.message);
              setProposedKeypair(null);
              return;
            }

            setError(null);
            setProposedKeypair(result);
          }}
        />
      </div>

      {error && name.length > 0 ? <p className="error-text">{error}</p> : null}
      {proposedKeypair
        ? (
          <>
            <hr />
            <ShareCard keypair={proposedKeypair} />
            <p className="share-explainer">
              Share the <b>address</b> with people you would like to grant{" "}
              <b>read</b> access to.
            </p>
            <p className="share-explainer">
              Share the <b>secret</b> with people you would like to grant{" "}
              <b>write</b> access to.
            </p>
            <p className="share-explainer">
              Make sure to save the generated address and secret someplace safe.
              Only you have access to it, so it can never be recovered or reset!
            </p>
            <div id="creator-form-btns">
              <button className="btn">Add this share keypair</button>
              <button onClick={() => goBack()}>Cancel</button>
            </div>
          </>
        )
        : (
          <div id="creator-form-btns">
            <button onClick={() => goBack()}>Cancel</button>
          </div>
        )}
    </form>
  );
}

function ShareAddSecretForm(
  { address, cancel: goBack }: { address: string; cancel: () => void },
) {
  const [secret, setSecret] = React.useState("");
  const [, setShareSecret] = useShareSecretSettings();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const isValid = setShareSecret(address, secret);

        if (Earthstar.isErr(isValid)) {
          alert("That secret is not correct!");
          return;
        }

        goBack();
      }}
    >
      <label>{`Secret for ${address}`}</label>
      <input
        value={secret}
        onChange={(e) => {
          setSecret(e.target.value);
        }}
      />
      <button type="submit">Add secret</button>
      <button
        onClick={(e) => {
          e.preventDefault();
          goBack();
        }}
      >
        Cancel
      </button>
    </form>
  );
}

function ShareCard({ keypair }: { keypair: Earthstar.ShareKeypair }) {
  const [author] = useAuthorSettings();

  return (
    <fieldset id="proposed-share">
      <legend>Proposed share keypair</legend>
      <ShareLabel
        address={keypair.shareAddress}
        viewingAuthorSecret={author?.secret}
      />
      <CopyButton copyValue={keypair.shareAddress}>Copy address</CopyButton>
      <CopyButton copyValue={keypair.secret}>Copy secret</CopyButton>
    </fieldset>
  );
}

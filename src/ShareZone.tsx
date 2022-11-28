import * as React from "react";
import {
  ShareLabel,
  useAuthorSettings,
  useShareSecretSettings,
  useShareSettings,
} from "react-earthstar";
import * as Earthstar from "earthstar";
import CopyButton from "./CopyButton";
import './ShareZone.css'

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
    <div>
      {shares.length === 0
        ? <div>You have no shares.</div>
        : shares.map((share) => {
          return (
            <ShareItem
              onClickAddSecret={() => {
                setChoice({ type: "add_secret", address: share });
              }}
              address={share}
            />
          );
        })}
      <div>
        <button onClick={() => setChoice({ type: "add" })}>
          Add existing share
        </button>
        <button onClick={() => setChoice({ type: "create" })}>
          Create new share
        </button>
      </div>
    </div>
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
    <li>
      <ShareLabel address={address} viewingAuthorSecret={author?.secret} />
      <CopyButton copyValue={address}>Copy address</CopyButton>
      {secret
        ? <CopyButton copyValue={secret}>Copy secret</CopyButton>
        : <button onClick={onClickAddSecret}>Add secret</button>}
      <button
        onClick={() => {
          removeShare(address);
        }}
      >
        Forget
      </button>
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
      onSubmit={async (e) => {
        e.preventDefault();

        // validate

        const isValid = addShare(address);

        if (Earthstar.isErr(isValid)) {
          alert("The share you provided was not valid!");
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
      <label>Address</label>
      <input
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
        }}
        required
      >
      </input>
      <label>Secret (optional)</label>
      <input
        value={secret}
        onChange={(e) => {
          setSecret(e.target.value);
        }}
      >
      </input>
      <button type="submit">Add</button>
      <button
        onClick={() => {
          goBack();
        }}
      >
        Cancel
      </button>
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
      onSubmit={async (e) => {
        e.preventDefault();

        if (proposedKeypair) {
          addShare(proposedKeypair.shareAddress);
          addSecret(proposedKeypair.shareAddress, proposedKeypair.secret);
        }

        goBack();
      }}
    >
      <div>
        <span>+</span>
        <input
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

      {error ? <p className="text-red-700 text-sm">{error}</p> : null}
      {proposedKeypair
        ? (
          <>
            <div className="text-4xl font-bold text-gray-300 text-center">
              ⬇
            </div>
            <KeypairCard keypair={proposedKeypair} />
            <p>
              Share the <b>address</b> with people you would like to grant{" "}
              <b>read</b> access to.
            </p>
            <p>
              Share the <b>secret</b> with people you would like to grant{" "}
              <b>write</b> access to.
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Make sure to save the generated address and secret someplace safe.
              Only you have access to it, so it can never be recovered or reset!
            </p>
            <button className="btn">Add this share keypair</button>
          </>
        )
        : null}
      <button onClick={() => goBack()}>Cancel</button>
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
      onSubmit={async (e) => {
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

function KeypairCard({ keypair }: { keypair: Earthstar.ShareKeypair }) {
  const parsed = Earthstar.parseShareAddress(keypair.shareAddress);

  if (Earthstar.isErr(parsed)) {
    return <div>Something's wrong with the keypair.</div>;
  }

  return (
    <div>
      <div>
        <span>+</span>
        <span>{parsed.name}</span>
        <span>.</span>
        <span>{parsed.pubkey}</span>
      </div>

      <CopyButton copyValue={parsed.address}>Copy address</CopyButton>
      <CopyButton copyValue={keypair.secret}>Copy secret</CopyButton>
    </div>
  );
}

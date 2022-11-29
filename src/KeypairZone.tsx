import * as React from "react";
import * as Earthstar from "earthstar";
import { AuthorLabel, useAuthorSettings } from "react-earthstar";
import CopyButton from "./CopyButton.tsx";
import "./KeypairZone.css";

export function KeypairZone() {
  const [author] = useAuthorSettings();

  return (
    <fieldset id={"keypair-zone"}>
      <legend>Keypair</legend>
      {author ? <KeypairInfo keypair={author} /> : <KeypairCreationOptions />}
    </fieldset>
  );
}

function KeypairInfo({ keypair }: { keypair: Earthstar.AuthorKeypair }) {
  const [, setAuthorSettings] = useAuthorSettings();

  const parsed = Earthstar.parseAuthorAddress(keypair.address);

  if (Earthstar.isErr(parsed)) {
    return <div>Something's wrong with the keypair.</div>;
  }

  return (
    <div>
      <div>
        <AuthorLabel
          id="signed-in-keypair"
          className="author-label"
          address={keypair.address}
          viewingAuthorSecret={keypair.secret}
        />
      </div>
      <hr />
      <div id={"general-buttons"}>
        <CopyButton copyValue={keypair.address}>Copy address</CopyButton>
        <CopyButton copyValue={keypair.secret}>Copy secret</CopyButton>
        <button
          onClick={() => {
            const isSure = confirm(
              "Are you sure you want this domain to forget about this keypair?",
            );

            if (!isSure) {
              return;
            }

            setAuthorSettings(null);
          }}
        >
          Forget keypair
        </button>
      </div>
    </div>
  );
}

function KeypairCreationOptions() {
  const [choice, setChoice] = React.useState<"not_made" | "add" | "create">(
    "not_made",
  );

  const cancel = React.useCallback(() => {
    setChoice("not_made");
  }, []);

  if (choice === "add") {
    return <KeypairAddForm cancel={cancel} />;
  }

  if (choice === "create") {
    return <KeypairCreatorForm cancel={cancel} />;
  }

  return (
    <div id="keypair-creation-root">
      <p id="keypair-explainer">
        Keypairs are used to sign all Earthstar data with a digital signature.
        It's impossible to make any changes to a Share without one.
      </p>
      <button onClick={() => setChoice("create")}>Create a new keypair</button>
      <button onClick={() => setChoice("add")}>Use an existing keypair</button>
    </div>
  );
}

function KeypairAddForm({ cancel }: { cancel: () => void }) {
  const [existingKeypair, setKeypair] = useAuthorSettings();
  const [address, setAddress] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [error, setError] = React.useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const keypair = { address, secret };

        const isValid = await Earthstar.Crypto.checkKeypairIsValid(
          keypair,
        );

        if (Earthstar.isErr(isValid)) {
          setError(isValid.message);
          return;
        }

        const canProceed = existingKeypair?.address
          ? window.confirm(
            `You're already signed in as ${existingKeypair.address}. Are you sure you want to replace that with this identity?`,
          )
          : true;

        if (canProceed) {
          setKeypair(keypair);
        }
      }}
    >
      <table>
        <tbody>
          {error
            ? (
              <tr>
                <td
                  colSpan={2}
                >
                  {error}
                </td>
              </tr>
            )
            : null}
          <tr>
            <td>
              <label>Address</label>
            </td>
            <td>
              <input
                value={address}
                placeholder="@xxxx.xxxx"
                onChange={(e) => setAddress(e.target.value)}
              />
            </td>
          </tr>
          <tr>
            <td>
              <label>Secret</label>
            </td>
            <td>
              <input
                value={secret}
                type="password"
                onChange={(e) => setSecret(e.target.value)}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div id="keypair-add-buttons">
        <button type="submit" className="btn block">
          Use identity
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            cancel();
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function KeypairCreatorForm({ cancel }: { cancel: () => void }) {
  const [identity, setCurrentIdentity] = useAuthorSettings();
  const [shortName, setShortName] = React.useState("");
  const [proposedKeypair, setProposedKeypair] = React.useState<
    Earthstar.AuthorKeypair | null
  >(null);
  const [error, setError] = React.useState<null | string>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const canProceed = identity
          ? window.confirm(
            `You're already signed in as ${identity}. Are you sure you want to replace that with the new identity?`,
          )
          : true;

        if (canProceed && proposedKeypair) {
          setCurrentIdentity(proposedKeypair);
        }
      }}
    >
      <label id="shortname-label">
        <div>Pick a shortname</div>
        <div id="author-name">
          <span id="author-sigil">@</span>
          <input
            id="shortname-input"
            value={shortName}
            spellCheck="false"
            placeholder={"abcd"}
            onChange={async (e) => {
              setShortName(e.target.value);

              if (e.target.value.length < 4) {
                setError(null);
                setProposedKeypair(null);
                return;
              }

              const result = await Earthstar.Crypto.generateAuthorKeypair(
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
      </label>

      {error
        ? <p id="shortname-error" className="error-text">{error}</p>
        : null}
      {proposedKeypair
        ? (
          <>
            <hr />
            <fieldset id="proposed-keypair">
              <legend>Proposed keypair</legend>
              <KeypairCard keypair={proposedKeypair} />
            </fieldset>
            <p id="save-reminder">
              Make sure to save the generated address and secret someplace safe.
              Only you have access to it, so it can never be recovered or reset!
            </p>
            <div id="keypair-creator-btns">
              <button className="btn">Use this keypair</button>
              <button onClick={cancel}>Cancel</button>
            </div>
          </>
        )
        : (
          <>
            <p id="shortname-explainer">
              Shortnames are there to help humans recognise keypairs, and are
              permanent. Don't get hung up on choosing one, as you can change
              your display name as many times as you like.
            </p>
            <hr />
            <div id="keypair-creator-btns">
              <button onClick={cancel}>Cancel</button>
            </div>
          </>
        )}
    </form>
  );
}

function KeypairCard({ keypair }: { keypair: Earthstar.AuthorKeypair }) {
  return (
    <div id="keypair-card">
      <AuthorLabel
        className={"author-label"}
        address={keypair.address}
        viewingAuthorSecret={keypair.secret}
      />

      <CopyButton copyValue={keypair.address}>Copy address</CopyButton>
      <CopyButton copyValue={keypair.secret}>Copy secret</CopyButton>
    </div>
  );
}

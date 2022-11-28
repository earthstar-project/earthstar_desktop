import * as React from "react";
import * as Earthstar from "earthstar";
import { AuthorLabel, useAuthorSettings } from "react-earthstar";
import CopyButton from "./CopyButton";
import './KeypairZone.css'

export function KeypairZone() {
  const [author] = useAuthorSettings();

  return (
    
    <fieldset id={'keypair-zone'}>
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
          address={keypair.address}
          viewingAuthorSecret={keypair.secret}
        />
      </div>
      <hr/>
      <div id={'general-buttons'}>
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
      <p>No keypair currently in use.</p>
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
                  className="bg-red-100 p-2 border border-red-200 rounded text-red-800"
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
                className="input w-full ml-2"
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
                className="input w-full ml-2"
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
      <span>@</span>
      <input
        value={shortName}
        spellCheck="false"
        placeholder={"abcd"}
        style={{ width: "calc(4ch + 1.25rem)" }}
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

      {error ? <p className="text-red-700 text-sm">{error}</p> : null}
      {proposedKeypair
        ? (
          <>
            <div className="text-4xl font-bold text-gray-300 text-center">
              ⬇
            </div>
            <KeypairCard keypair={proposedKeypair} />
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Make sure to save the generated address and secret someplace safe.
              Only you have access to it, so it can never be recovered or reset!
            </p>
            <button className="btn">Use this identity</button>
          </>
        )
        : null}
      <button onClick={cancel}>Cancel</button>
    </form>
  );
}

function KeypairCard({ keypair }: { keypair: Earthstar.AuthorKeypair }) {
  return (
    <div id="keypair-card">
      <AuthorLabel
        address={keypair.address}
        viewingAuthorSecret={keypair.secret}
      />

      <CopyButton copyValue={keypair.address}>Copy address</CopyButton>
      <CopyButton copyValue={keypair.secret}>Copy secret</CopyButton>
    </div>
  );
}

import * as React from "react";
import * as Earthstar from "earthstar";
import { useKeypair } from "react-earthstar";
import CopyButton from "./CopyButton";

export function KeypairZone() {
  const [keypair] = useKeypair();

  return (
    <fieldset>
      <legend>Keypair</legend>
      {keypair ? <KeypairInfo keypair={keypair} /> : <KeypairCreationOptions />}
    </fieldset>
  );
}

function KeypairInfo({ keypair }: { keypair: Earthstar.AuthorKeypair }) {
  const [, setKeypair] = useKeypair();

  const parsed = Earthstar.parseAuthorAddress(keypair.address);

  if (Earthstar.isErr(parsed)) {
    return <div>Something's wrong with the keypair.</div>;
  }

  return (
    <div>
      <div>
        <KeypairCard keypair={keypair} />
      </div>
      <div>
        <button
          onClick={() => {
            const isSure = confirm(
              "Are you sure you want this domain to forget about this keypair?",
            );

            if (!isSure) {
              return;
            }

            setKeypair(null);
          }}
        >
          Sign out
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
    <div>
      <p>No keypair currently in use.</p>
      <button onClick={() => setChoice("create")}>Create a new keypair</button>
      <button onClick={() => setChoice("add")}>Use an existing keypair</button>
    </div>
  );
}

function KeypairAddForm({ cancel }: { cancel: () => void }) {
  const [existingKeypair, setKeypair] = useKeypair();
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

          <tr>
            <td>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  cancel();
                }}
              >
                Cancel
              </button>
            </td>
            <td>
              <button type="submit" className="btn block">
                Use identity
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}

function KeypairCreatorForm({ cancel }: { cancel: () => void }) {
  const [identity, setCurrentIdentity] = useKeypair();
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
  const parsed = Earthstar.parseAuthorAddress(keypair.address);

  if (Earthstar.isErr(parsed)) {
    return <div>Something's wrong with the keypair.</div>;
  }

  return (
    <div>
      <div>
        <span>@</span>
        <span>{parsed.name}</span>
        <span>.</span>
        <span>{parsed.pubkey}</span>
      </div>

      <CopyButton copyValue={parsed.address}>Copy address</CopyButton>
      <CopyButton copyValue={keypair.secret}>Copy secret</CopyButton>
    </div>
  );
}

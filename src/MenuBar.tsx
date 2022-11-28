import * as React from "react";
import * as Earthstar from "earthstar";
import {
  AuthorLabel,
  useAuthorSettings,
  useServerSettings,
  useShareSettings,
} from "react-earthstar";
import { KeypairZone } from "./KeypairZone";
import { ShareZone } from "./ShareZone";
import { ServerZone } from "./ServerZone";
import "./MenuBar.css";

type Mode = "none" | "author" | "shares" | "servers";

function makeOnSelect(
  mode: Mode,
  activeMode: Mode,
  setActiveMode: (mode: Mode) => void,
) {
  return () => {
    if (mode === activeMode) {
      setActiveMode("none");
    } else {
      setActiveMode(mode);
    }
  };
}

export function MenuBar() {
  const [activeMode, setActiveMode] = React.useState<
    Mode
  >("none");

  return (
    <div>
      <div id="menu-bar">
        <MenuItem
          selected={activeMode === "author"}
          onSelect={makeOnSelect("author", activeMode, setActiveMode)}
          className="keypair-button"
        >
          <AuthorItem />
        </MenuItem>
        <MenuItem
          selected={activeMode === "shares"}
          onSelect={makeOnSelect("shares", activeMode, setActiveMode)}
          className='shares-button'
        >
          <SharesItem />
        </MenuItem>
        <MenuItem
          selected={activeMode === "servers"}
          onSelect={makeOnSelect("servers", activeMode, setActiveMode)}
          className="server-button"
        >
          <ServersItem />
        </MenuItem>
      </div>
      {activeMode !== "none"
        ? (
          <div id="active-mode-panel">
            <DetailPanel activeMode={activeMode} />
          </div>
        )
        : null}
    </div>
  );
}

function MenuItem(
  { selected, onSelect, children, className }: {
    selected: boolean;
    onSelect: () => void;
    className: string;
    children: React.ReactNode;
  },
) {
  return (
    <button
      className={`menu-button ${selected ? "menu-button-active" : ""} ${className}`}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

function AuthorItem() {
  const [author] = useAuthorSettings();

  return (
    <div>
      {author
        ? (
          <AuthorLabel
            address={author.address}
            viewingAuthorSecret={author.secret}
          />
        )
        : "Not signed in"}
    </div>
  );
}

function SharesItem() {
  const [shares] = useShareSettings();

  return <div>📁 {shares.length}</div>;
}

function ServersItem() {
  const [servers] = useServerSettings();

  return <div>📡 {servers.length}</div>;
}

function DetailPanel({ activeMode }: { activeMode: Omit<Mode, "none"> }) {
  switch (activeMode) {
    case "author": {
      return <KeypairZone />;
    }
    case "shares": {
      return <ShareZone />;
    }
    case "servers": {
      return <ServerZone />;
    }
    default:
      return null;
  }
}

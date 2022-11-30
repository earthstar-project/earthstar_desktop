import { join } from "https://deno.land/std@0.166.0/path/mod.ts";
import { renderToReadableStream } from "react-dom/server";

export function getServerSettingsBody(path: string) {
  return renderToReadableStream(
    <ServerSettingsPage path={path} />,
  );
}

function ServerSettingsPage({ path }: { path: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Server Settings</title>
        <link
          rel="stylesheet"
          href={join(path, "assets", "server-settings", "server-settings.css")}
        />
        <script
          type="module"
          src={join(path, "assets", "server-settings", "server-settings.js")}
        />
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  );
}

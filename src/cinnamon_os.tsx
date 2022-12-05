import { renderToReadableStream } from "react-dom/server";
import { join } from "https://deno.land/std@0.166.0/path/mod.ts";
import { AppletInfo, AppletSchema } from "./applet_schema.ts";

export async function getCinnamonOSBody(
  path: string,
  appletSchema: AppletSchema,
) {
  const applets = await appletSchema.getAllApplets();

  return renderToReadableStream(
    <CinnamonOSPage
      path={path}
      applets={[...applets, {
        name: "Server Settings",
        author: "Earthstar Project",
        version: "0.1.0",
        indexPath: "/server-settings",
        uploader: "",
      }]}
    />,
  );
}

function CinnamonOSPage(
  { path, applets }: { path: string; applets: AppletInfo[] },
) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CinnamonOS</title>
        <link
          rel="stylesheet"
          href={join(path, "assets", "cinnamon-os.css")}
        />
        <link
          rel="stylesheet"
          href={join(path, "assets", "menu", "menu.css")}
        />
        <script type="module" src={join(path, "assets", "menu", "menu.js")} />
      </head>
      <body>
        <div id="menu"></div>
        <div id="apps">
          {applets.length === 0
            ? "This server doesn't offer any applets... yet!"
            : (
              <ul id="applet-items">
                {applets.map((info) => {
                  return <AppletDetail info={info} />;
                })}
              </ul>
            )}
        </div>
      </body>
    </html>
  );
}

function AppletDetail({ info }: { info: AppletInfo }) {
  return (
    <div className="applet-item">
      <a href={info.indexPath}>
        <div className="applet-name">{info.name}</div>
        <div className="applet-info">{info.version} - {info.author}</div>
      </a>
    </div>
  );
}

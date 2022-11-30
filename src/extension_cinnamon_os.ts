import { Peer, Replica, ShareAddress } from "earthstar";
import { IReplicaServerExtension } from "earthstar-server";
import { extname, join } from "https://deno.land/std@0.166.0/path/mod.ts";
import { deferred } from "https://deno.land/std@0.166.0/async/mod.ts";
import { contentType } from "https://deno.land/std@0.166.0/media_types/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.15.16/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";
import { getCinnamonOSBody } from "./cinnamon_os.tsx";
import { AppletSchema } from "./applet_schema.ts";
import { getServerSettingsBody } from "./server_settings.tsx";

type CinnamonOSOpts = {
  appletSourceShareAddress: ShareAddress;
  path?: string;
  assetsPath: string;
  onCreateReplica: (
    appletSourceShareAddress: string,
  ) => Replica;
};

export class ExtensionCinnamonOS implements IReplicaServerExtension {
  private path = "/";
  private assetsPath: string;
  private appletSourceShareAddress: string;
  private onCreateReplica: (
    appletSourceShareAddress: string,
  ) => Replica;
  private appletSchema = deferred<AppletSchema>();

  constructor(opts: CinnamonOSOpts) {
    if (opts.path) {
      this.path = opts.path;
    }

    this.assetsPath = opts.assetsPath;
    this.appletSourceShareAddress = opts.appletSourceShareAddress;
    this.onCreateReplica = opts.onCreateReplica;
  }

  async register(peer: Peer): Promise<void> {
    // Create an applet source replica and add it to the peer (if not present)
    if (!peer.hasShare(this.appletSourceShareAddress)) {
      const replica = this.onCreateReplica(this.appletSourceShareAddress);

      peer.addReplica(replica);

      this.appletSchema.resolve(new AppletSchema(replica));
    }

    // Build the client assets, put their contents in responses, and put them in the cache.

    // Does this work?
    const importMapURL = new URL("../import_map.json", import.meta.url);

    await esbuild.build({
      plugins: [
        denoPlugin({
          importMapURL,
        }),
      ],
      // How do I get this to work?
      entryPoints: [import.meta.resolve("./menu/main.tsx")],
      outfile: join(this.assetsPath, "menu", "menu.js"),
      bundle: true,
      format: "esm",
      platform: "browser",
      minify: true,
    });

    await esbuild.build({
      plugins: [
        denoPlugin({
          importMapURL,
        }),
      ],
      // How do I get this to work?
      entryPoints: [import.meta.resolve("./server_settings/main.tsx")],
      outfile: join(this.assetsPath, "server-settings", "server-settings.js"),
      bundle: true,
      format: "esm",
      platform: "browser",
      minify: true,
    });

    return Promise.resolve();
  }

  async handler(req: Request): Promise<Response | null> {
    const schema = await this.appletSchema;

    // Is request for the launcher?
    const launcherPattern = new URLPattern({ pathname: `${this.path}` });
    const launcherMatch = launcherPattern.exec(req.url);

    if (launcherMatch) {
      // Generate the response for the applet page using React.
      return new Response(
        await getCinnamonOSBody(this.path, schema),
        {
          headers: {
            "content-type": "text/html",
          },
        },
      );
    }

    const serverSettingsPattern = new URLPattern({
      pathname: `${this.path}server-settings`,
    });
    const serverSettingsMatch = serverSettingsPattern.exec(req.url);

    if (serverSettingsMatch) {
      // Generate the response for the server settings page using React.
      return new Response(
        await getServerSettingsBody(this.path),
        {
          headers: {
            "content-type": "text/html",
          },
        },
      );
    }

    // Is request for an applet?
    const appletPattern = new URLPattern({
      pathname: `${this.path}:authorOrg/:appSlug/:version/:uploader`,
    });
    const appletMatch = appletPattern.exec(req.url);

    if (appletMatch) {
      // Return the index.html for the page.
    }

    // Is request for the launcher client assets (JS / CSS)
    const assetPattern = new URLPattern({
      pathname: `${this.path}assets/:asset*`,
    });

    const assetMatch = assetPattern.exec(req.url);

    if (assetMatch) {
      const assetName = assetMatch.pathname.groups["asset"];

      try {
        const filePath = join(this.assetsPath, assetName);

        const file = await Deno.open(filePath);
        const extension = extname(filePath);

        const contentT = contentType(extension);

        let fileSize;
        try {
          fileSize = (await Deno.stat(filePath)).size;
        } catch (e) {
          if (e instanceof Deno.errors.NotFound) {
            return new Response(null, { status: 404 });
          }
          return new Response(null, { status: 500 });
        }

        const res = new Response(file.readable, {
          headers: {
            "content-type": contentT || "text/plain",
            "content-length": fileSize.toString(),
          },
        });

        return res;
      } catch {
        return Promise.resolve(null);
      }
    }

    // This request is for some other extension.
    return Promise.resolve(null);
  }
}

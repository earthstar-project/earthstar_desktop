import {
  extractTemplateVariablesFromPath,
  globToQueryAndRegex,
  Replica,
} from "earthstar-deno";
import { deferred } from "https://deno.land/std@0.166.0/async/mod.ts";

const APPLET_NAMESPACE = "/applets";
const VERSION = "1.0";

const APP_ROOT_TEMPLATE =
  `${APPLET_NAMESPACE}/${VERSION}/{appAuthorOrg}/{appSlug}/{appVersion}/~{uploader}`;

const APP_NAME_TEMPLATE = `${APP_ROOT_TEMPLATE}/name`;
const APP_AUTHOR_TEMPLATE = `${APP_ROOT_TEMPLATE}/author`;
const APP_INDEX_PATH_TEMPLATE = `${APP_ROOT_TEMPLATE}/indexPath`;
const APP_INDEX_ASSET_TEMPLATE = `${APP_ROOT_TEMPLATE}/indexPath/assets/*`;

function getAppletIndexKey(
  authorOrg: string,
  appSlug: string,
  version: string,
  uploader: string,
) {
  return [authorOrg, appSlug, version, uploader].join("_");
}

export type AppletInfo = {
  name: string;
  version: string;
  author: string;
  uploader: string;
  indexPath: string;
};

export class AppletSchema {
  private indexReady = deferred();

  private appIndex = new Map<string, AppletInfo>();

  constructor(replica: Replica) {
    // Build index of applications.
    const { query, regex } = globToQueryAndRegex(APP_NAME_TEMPLATE);

    const re = new RegExp(regex as string);

    const indexStream = replica.getQueryStream(query, "everything");

    const appIndex = this.appIndex;
    const indexReady = this.indexReady;

    indexStream.pipeTo(
      new WritableStream({
        async write(event) {
          if (
            event.kind === "existing" ||
            event.kind === "success" && re.test(event.doc.path)
          ) {
            // Extract the variables.
            const variables = extractTemplateVariablesFromPath(
              APP_NAME_TEMPLATE,
              event.doc.path,
            );

            if (!variables) {
              return;
            }

            const key = getAppletIndexKey(
              variables["appAuthorOrg"],
              variables["appSlug"],
              variables["appVersion"],
              variables["uploader"],
            );

            if (appIndex.has(key)) {
              return;
            }

            const root = `${APPLET_NAMESPACE}/${VERSION}/${
              variables["appAuthorOrg"]
            }/${variables["appSlug"]}/${variables["appVersion"]}/~${
              variables["uploader"]
            }`;

            const appNamePath = `${root}/name`;
            const appAuthorPath = `${root}/author`;
            const appVersionPath = `${root}/version`;
            const appIndexPathPath = `${root}/indexPath`;

            const appNameDoc = await replica.getLatestDocAtPath(appNamePath);
            const appAuthorDoc = await replica.getLatestDocAtPath(
              appAuthorPath,
            );
            const appVersionDoc = await replica.getLatestDocAtPath(
              appVersionPath,
            );
            const appIndexPathDoc = await replica.getLatestDocAtPath(
              appIndexPathPath,
            );

            if (
              !appNameDoc || !appAuthorDoc || !appVersionDoc || !appIndexPathDoc
            ) {
              return;
            }

            const info: AppletInfo = {
              name: appNameDoc.text,
              author: appAuthorDoc.text,
              version: appVersionDoc.text,
              uploader: appNameDoc.author,
              indexPath: appIndexPathDoc.text,
            };

            appIndex.set(key, info);
          }

          if (event.kind === "processed_all_existing") {
            indexReady.resolve();
          }
        },
      }),
    );
  }

  async getAllApplets(): Promise<AppletInfo[]> {
    await this.indexReady;

    const infos: AppletInfo[] = [];

    for (const info of this.appIndex.values()) {
      infos.push(info);
    }

    return infos;
  }

  async getApplet(
    authorOrg: string,
    appSlug: string,
    version: string,
    uploader: string,
  ): Promise<AppletInfo | undefined> {
    await this.indexReady;

    const key = getAppletIndexKey(authorOrg, appSlug, version, uploader);

    return this.appIndex.get(key);
  }
}

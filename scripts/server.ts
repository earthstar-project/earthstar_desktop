import { Replica, ReplicaDriverFs } from "earthstar-deno";
import {
  ExtensionServerSettings,
  ExtensionSyncWeb,
  ReplicaServer,
} from "earthstar-server";
import { resolve } from "https://deno.land/std@0.166.0/path/mod.ts";
import { ExtensionCinnamonOS } from "../src/extension_cinnamon_os.ts";

function onCreateReplica(shareAddress: string) {
  return new Replica({
    driver: new ReplicaDriverFs(shareAddress, "./data"),
  });
}

new ReplicaServer([
  new ExtensionServerSettings({
    configurationShare:
      "+settings.bcnhhsuysfevk7nwnl7zcljbgw6t4yb6tngihbtkm4yj7awnpktna",
    onCreateReplica,
  }),
  new ExtensionCinnamonOS({
    assetsPath: resolve("./assets"),
    appletSourceShareAddress:
      "+biscuits.bphzohqx6mgresxu7e2g4pw3vhnscwq2psblmcmu3o7n2nets4cpq",
    onCreateReplica,
  }),
  new ExtensionSyncWeb({}),
], {
  port: 8080,
});

console.log("Server running.");

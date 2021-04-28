import { SolidNodeClient } from "solid-node-client";
import dotenv from "dotenv";
import cron from "cron";

import {
  fetchACL,
  getExpiredACLIdentifiers,
  removeMatches,
  fetchURLsFromContainer,
} from "./lib.js";

// initialization
console.log("[INFO] Initializing parameters..");
dotenv.config();
const client = new SolidNodeClient();
const CronJob = cron.CronJob;

(async function main() {
  // login with as pod owner
  console.log("[INFO] Logging in on Solid Pod..");
  const session = await client.login({
    idp: process.env.SOLID_IDP,
    username: process.env.SOLID_USERNAME,
    password: process.env.SOLID_PASSWORD,
    debug: true,
  });

  if (!session) {
    console.log("[ERROR] error while trying to login with your credentials!");
    return;
  }

  // create a cron job that runs every minute
  const job = new CronJob("0 */1 * * * *", async () => {
    try {
      console.log("[INFO] Start updating ACLs");
      //current datetime
      const now = Date.now();

      // get list of private resources (inrupt is hardcoded) --> subject to change
      const privateContainerUrl = `https://${process.env.SOLID_USERNAME}.inrupt.net/private/`;
      const resources = await fetchURLsFromContainer(
        privateContainerUrl,
        session.fetch
      );

      // iterate over the acls
      const expiredTriplesCounts = await Promise.all(
        resources.map(async (resource) => {
          // get the acl for every resource
          const aclStore = await fetchACL(resource, session.fetch);
          // if no acl for resource then continue
          if (aclStore === null) return null;

          // get the identifier of the expired authorization
          const expiredACLIdentifiers = getExpiredACLIdentifiers(now, aclStore);

          if (expiredACLIdentifiers.length <= 0) return null;
          //get updated ACL back in string
          const updatedACL = await removeMatches(
            aclStore,
            expiredACLIdentifiers
          );

          // write updated acl file to the solid pod
          await session.fetch(resource + ".acl", {
            method: "PUT",
            headers: {
              "Content-Type": "text/turtle",
              Link: `<.acl>; rel="acl"`,
            },
            body: updatedACL,
          });

          return expiredACLIdentifiers.length;
        })
      );

      const expiredTriplesCountSum = expiredTriplesCounts
        .filter((c) => c !== null)
        .reduce((a, b) => a + b, 0);

      console.log(
        `[INFO] Deleted ${expiredTriplesCountSum} expired ACL triples`
      );
      console.log("[INFO] End of updating ACLs\n");
    } catch (error) {
      console.log("[ERROR]:", error);
    }
  });
  job.start();
})();

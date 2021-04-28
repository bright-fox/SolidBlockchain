import { SolidNodeClient } from "solid-node-client";
import dotenv from "dotenv";
import cron from "cron";
import Web3 from "web3";

import {
  findTransaction,
  getEthereumAddressFromWebID,
  parseRDFLiteral,
  requestRDF,
  updateACL,
  parsePriceToWei,
  deleteResource,
  fromHex,
  createStartAndEndDate,
  fetchResourceInfoFromPayable,
  getDecodedMessage,
  fetchURLsFromContainer,
} from "./lib.js";

// initialization
console.log("[INFO] Initializing parameters..");
dotenv.config();
const client = new SolidNodeClient();
const CronJob = cron.CronJob;
const web3 = new Web3(Web3.givenProvider || process.env.BLOCKCHAIN_NETWORK);

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
      console.log("[INFO] Fetching the inbox..");
      // fetch the inbox
      const inboxURL = session.webId.replace("/profile/card#me", "/inbox/");
      const payableContainerURL = session.webId.replace(
        "/profile/card#me",
        "/payable/"
      );

      const notifications = await fetchURLsFromContainer(
        inboxURL,
        session.fetch
      );

      // handle the access request notifications

      if (notifications.length <= 0) {
        console.log("[INFO] Empty Notifications");
        return;
      }

      // prepare the resource list to check if the resource is in payable container
      console.log("[INFO] Fetching resource list from available offers..");
      const resources = await fetchResourceInfoFromPayable(
        payableContainerURL,
        session.fetch
      );

      console.log("[INFO] Processing the notifications..");
      const processedNotificationCounts = await Promise.all(
        notifications.map(async (notification) => {
          const notificationStore = await requestRDF(
            notification,
            session.fetch
          );

          // check if the notification is for an access request
          if (notificationStore.countQuads("#Transaction") <= 0) return null;

          const txInfo = getTxInfoFromLDN(notificationStore);

          // check if the requested resource is an offer in payable container
          const filteredResources = resources.filter(
            (r) => r.resourceURLFromOffer === txInfo.resourceURL
          );
          if (filteredResources.length <= 0) {
            await deleteResource(notification, session.fetch);
            console.log(
              "[ERROR] Requested Resource is not an offer in the payable container!"
            );
            return null;
          }

          const {
            resourceURLFromOffer,
            priceFromOffer,
            durationFromOffer,
          } = filteredResources[0];
          const priceFromOfferInWei = parsePriceToWei(priceFromOffer);

          // check if it is a valid linked data notification
          const isValidLDN =
            resourceURLFromOffer === txInfo.resourceURL &&
            priceFromOfferInWei === txInfo.priceInWei &&
            durationFromOffer === txInfo.duration;

          if (!isValidLDN) {
            console.log(
              "[ERROR] The information of the LDN does not correspond to the information of the original offer"
            );
            return null;
          }

          const msg = await getDecodedMessage(web3, txInfo.transactionHash);
          const [
            _,
            resourceURLFromMsg,
            clientWebIDFromMsg,
            priceFromMsg,
            durationFromMsg,
          ] = msg.split(",");
          const priceFromMsgInWei = parsePriceToWei(priceFromMsg);

          // verify that transaction is the same as stated in LDN
          const transaction = await findTransaction(
            web3,
            txInfo.transactionHash
          );

          const isValidTransaction =
            transaction.from === txInfo.senderEthAddress &&
            transaction.to === txInfo.receiverEthAddress &&
            txInfo.receiverEthAddress ===
              (await getEthereumAddressFromWebID(
                session.webId,
                session.fetch
              )) &&
            transaction.value === txInfo.priceInWei &&
            transaction.value === priceFromMsgInWei &&
            durationFromMsg === txInfo.duration &&
            clientWebIDFromMsg === txInfo.senderWebID &&
            resourceURLFromMsg === txInfo.resourceURL;

          if (!isValidTransaction) {
            // delete ldn
            console.log("[ERROR] Specified Transaction is not valid!");
            await deleteResource(notification, session.fetch);
            return null;
          }

          // update acl rights of the resource for new client
          const [startDate, endDate] = createStartAndEndDate(txInfo.duration);
          const updatedACL = await updateACL(
            txInfo.resourceURL,
            session.fetch,
            txInfo.senderWebID,
            startDate,
            endDate
          );

          // write updated acl file to the solid pod
          await session.fetch(txInfo.resourceURL + ".acl", {
            method: "PUT",
            headers: {
              "Content-Type": "text/turtle",
              Link: `<.acl>; rel="acl"`,
            },
            body: updatedACL,
          });

          // delete ldn
          await deleteResource(notification, session.fetch);
          return 1;
        })
      );

      const countSum = processedNotificationCounts
        .filter((c) => c !== null)
        .reduce((a, b) => a + b, 0);

      if (countSum <= 0) {
        console.log("[INFO] There were no access requests.");
      } else {
        console.log(
          `[INFO] Processed ${countSum} access requests successfully!`
        );
      }

      console.log("[INFO] End of processing.\n");
    } catch (error) {
      console.log("[ERROR]:", error);
    }
  });

  job.start();
})();

function getTxInfoFromLDN(notificationStore) {
  const senderEthAddress = parseRDFLiteral(
    notificationStore.getObjects(
      "#Sender",
      "http://ethon.consensys.net/address"
    )[0].id
  );
  const receiverEthAddress = parseRDFLiteral(
    notificationStore.getObjects(
      "#Receiver",
      "http://ethon.consensys.net/address"
    )[0].id
  );
  const transactionHash = parseRDFLiteral(
    notificationStore.getObjects(
      "#Transaction",
      "http://ethon.consensys.net/txHash"
    )[0].id
  );
  const priceInWei = parseRDFLiteral(
    notificationStore.getObjects(
      "#Transaction",
      "http://ethon.consensys.net/value"
    )[0].id
  );
  const senderWebID = notificationStore.getObjects(
    "#Sender",
    "http://www.w3.org/ns/solid/terms#account"
  )[0].id;
  const msgPayloadInHex = parseRDFLiteral(
    notificationStore.getObjects(
      "#Transaction",
      "http://ethon.consensys.net/msgPayload"
    )[0].id
  );

  const [resourceURL, duration] = fromHex(msgPayloadInHex).split(",");

  return {
    senderEthAddress,
    receiverEthAddress,
    transactionHash,
    priceInWei,
    senderWebID,
    resourceURL,
    duration,
  };
}

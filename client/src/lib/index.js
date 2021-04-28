import web3 from "web3";
import { parseWeiToEther } from "./blockchain";
import {
  fetchResourceInfoFromOffer,
  fetchURLsFromContainer,
  parseRDFLiteral,
  requestRDF,
} from "./solid";

/**
 * Returns the hash of a string with sha3
 * @param {string} value to be hashed
 */
export const hashValue = (value) => {
  return web3.utils.sha3(value);
};

/**
 * returns the parsed rdf graph of notification as object
 * @param {Store} notificationStore N3 Store of notification
 */
export const getTxInfoFromLDN = (notificationStore) => {
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
  const price = parseWeiToEther(priceInWei);

  return {
    senderEthAddress,
    receiverEthAddress,
    transactionHash,
    price,
    senderWebID,
    resourceURL,
    duration,
  };
};

/**
 * Returns list of resources of available offers in payable container
 * @param {string} payableContainerURL url of payable container
 * @param {function} fetch
 */
export const fetchResourceInfoFromPayable = async (
  payableContainerURL,
  fetch
) => {
  const offers = await fetchURLsFromContainer(payableContainerURL, fetch);

  const resources = await Promise.all(
    offers.map(async (offer) => {
      const resourceInfo = await fetchResourceInfoFromOffer(offer, fetch);
      return resourceInfo;
    })
  );

  return resources;
};

/**
 * Returns an array of pending requests from a client for a resource owner
 * @param {string} buyerWebID  WebID from Client with the pending container
 * @param {string} resourceOwnerWebID WebID from Resource Owner
 * @param {function} fetch
 */
export const getPendingRequests = async (
  buyerWebID,
  resourceOwnerWebID,
  fetch
) => {
  const pendingContainerURL = buyerWebID.replace("profile/card#me", "pending/");

  const pendingRequestURLs = await fetchURLsFromContainer(
    pendingContainerURL,
    fetch
  );
  const pendingRequests = await Promise.all(
    pendingRequestURLs.map(async (pendingRequestURL) => {
      const pendingRequestStore = await requestRDF(pendingRequestURL, fetch);

      console.log(pendingRequestStore);

      const pendingRequestIdentifier = pendingRequestStore
        .getSubjects("https://schema.org/seller", resourceOwnerWebID)
        .map((item) => item.id);

      if (pendingRequestIdentifier.length <= 0) return null;

      const resourceURL = pendingRequestStore.getObjects(
        "#Item",
        "https://schema.org/url"
      )[0].id;

      return { pendingRequestURL, resourceURL };
    })
  ).then((requests) => requests.filter((r) => r !== null));

  return pendingRequests;
};

/**
 * Returns string in hex
 * @param {string} data
 */
export function toHex(data) {
  return web3.utils.fromAscii(data);
}

/**
 * Returns string from hex in ascii
 * @param {string} hexData data in hex format
 */
export function fromHex(hexData) {
  return web3.utils.toAscii(hexData);
}

/**
 * returns start and end date from till the duration
 * @param {string} duration duration in full minutes
 */
export function createStartAndEndDate(duration) {
  const startDate = new Date();

  const endDate = new Date(+startDate);
  endDate.setMinutes(endDate.getMinutes() + +duration);

  return [+startDate, +endDate];
}

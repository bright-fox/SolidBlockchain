import { Writer, Parser, Store, DataFactory } from "n3";
import web3 from "web3";

/*******************
 *        WEB3     *
 *******************/

/**
 * Returns the hash of a string with sha3
 * @param {string} value to be hashed
 */
export const hashValue = (value) => {
  return web3.utils.sha3(value);
};

/**
 * Returns the transaction as an object
 * @param {string} hash transaction hash
 */
export const findTransaction = (web3, hash) => {
  return new Promise((resolve, reject) => {
    web3.eth.getTransaction(hash, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

export const parsePriceToWei = (price) => {
  return web3.utils.toWei(price, "ether");
};

export const parseWeiToEther = (priceInEther) => {
  return web3.utils.fromWei(priceInEther, "ether");
};

/**
 * Returns string from hex in ascii
 * @param {string} hexData data in hex format
 */
export function fromHex(hexData) {
  return web3.utils.toAscii(hexData);
}

/**
 * Returns decoded transaction message.
 * @param {Web3} web3 Web3 instance to access blockchain
 * @param {string} sender transaction hash
 */
export async function getDecodedMessage(web3, txhash) {
  var tx = await web3.eth.getTransaction(txhash);
  var msg = await web3.utils.toAscii(tx.input);
  return msg;
}

/*******************
 *      SOLID      *
 *******************/

/**
 * Parse text/turtle to N3
 * @param {string} text text to be parsed
 */
export const parseToN3 = async (text) => {
  const store = new Store();
  const parser = new Parser();

  return new Promise((resolve, reject) => {
    parser.parse(text, (error, quad) => {
      if (error) reject(error);
      if (quad) store.addQuad(quad);
      else resolve(store);
    });
  });
};

/**
 * Request rdf file and parse it to rdf quads
 * @param {string} url resource url
 * @param {function} fetch fetch function (either window.fetch or session.fetch)
 */
export const requestRDF = async (url, fetch) => {
  const response = await fetch(url, {
    headers: {
      Accept: "text/turtle",
    },
  });

  if (response.status !== 200) return null;

  // parse rdf triples
  const rawData = await response.text();
  const store = await parseToN3(rawData);
  return store;
};

/**
 * Deletes a specified resource
 * @param {string} url url of resource
 * @param {function} fetch
 */
export const deleteResource = async (url, fetch) => {
  const response = await fetch(url, {
    method: "DELETE",
  });
};

/**
 * Returns the acl of a resource as a n3 store
 * @param {string} resourceURL
 * @param {function} fetch
 */
export const fetchACL = async (resourceURL, fetch) => {
  const response = await fetch(resourceURL + ".acl", {
    headers: {
      Accept: "text/turtle",
      Link: '<.acl>; rel="acl"',
    },
  });

  if (response.status !== 200) return null;

  // parse rdf triples
  const rawData = await response.text();
  const store = await parseToN3(rawData);
  return store;
};

export const updateACL = async (
  resourceURL,
  fetch,
  senderWebID,
  beginning,
  end
) => {
  const aclStore = await fetchACL(resourceURL, fetch);

  // get the hash of webID as named node identifier
  const aclIdentifier = hashValue(`${senderWebID},${resourceURL}`);
  const hasBeginningBlankNodeName = `hasBeginning`;
  const hasEndBlankNodeName = `hasEnd`;

  // add the read permission for client
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    DataFactory.namedNode("acl:Authorization")
  );
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    DataFactory.namedNode("time:TemporalEntity")
  );
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("acl:accessTo"),
    DataFactory.namedNode(resourceURL)
  );
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
    DataFactory.namedNode(senderWebID)
  );
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("acl:mode"),
    DataFactory.namedNode("acl:Read")
  );
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("time:hasBeginning"),
    DataFactory.blankNode(hasBeginningBlankNodeName)
  );
  aclStore.addQuad(
    DataFactory.namedNode(`#${aclIdentifier}`),
    DataFactory.namedNode("time:hasEnd"),
    DataFactory.blankNode(hasEndBlankNodeName)
  );
  aclStore.addQuad(
    DataFactory.blankNode(hasBeginningBlankNodeName),
    DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    DataFactory.namedNode("time:Instant")
  );
  aclStore.addQuad(
    DataFactory.blankNode(hasBeginningBlankNodeName),
    DataFactory.namedNode("time:inXSDDateTimeStamp"),
    DataFactory.literal(beginning, DataFactory.namedNode("xsd:dateTimeStamp"))
  );
  aclStore.addQuad(
    DataFactory.blankNode(hasEndBlankNodeName),
    DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    DataFactory.namedNode("time:Instant")
  );
  aclStore.addQuad(
    DataFactory.blankNode(hasEndBlankNodeName),
    DataFactory.namedNode("time:inXSDDateTimeStamp"),
    DataFactory.literal(end, DataFactory.namedNode("xsd:dateTimeStamp"))
  );

  // return acl back as string
  const writer = new Writer({
    prefixes: {
      acl: "http://www.w3.org/ns/auth/acl#",
      time: "http://www.w3.org/2006/time#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
    },
  });

  writer.addQuads(aclStore.getQuads());
  return new Promise((resolve, reject) => {
    writer.end((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Parses a literal to string
 * @param {string} literal
 */
export const parseRDFLiteral = (literal) => {
  return literal.split('"')[1];
};

/**
 * Returns the ethereum address that is defined in the profile of the WebID
 * @param {string} webID WebID of a client
 * @param {function} fetch
 */
export const getEthereumAddressFromWebID = async (webID, fetch) => {
  const profileStore = await requestRDF(webID, fetch);
  const rawAddress = profileStore.getObjects(
    null,
    "http://ethon.consensys.net/address"
  )[0].id;
  return parseRDFLiteral(rawAddress);
};

/**
 * Returns response from head request
 * @param {string} url
 * @param {function} fetch
 */
export const requestHead = async (url, fetch) => {
  const response = await fetch(url, {
    method: "HEAD",
  });

  return response;
};

/**
 * Returns array of the urls of resources inside a container
 * @param {string} containerURL
 * @param {function} fetch
 */
export const fetchURLsFromContainer = async (containerURL, fetch) => {
  const headResponse = await requestHead(containerURL, fetch);
  if (headResponse.status !== 200) return [];

  const containerStore = await requestRDF(containerURL, fetch);
  const urls = containerStore
    .getObjects(null, "http://www.w3.org/ns/ldp#contains")
    .map((item) => containerURL + item.id);
  return urls;
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
      const offerStore = await requestRDF(offer, fetch);
      const resourceURLFromOffer = offerStore.getObjects(
        null,
        "https://schema.org/url"
      )[0].id;
      const priceFromOffer = parseRDFLiteral(
        offerStore.getObjects(null, "https://schema.org/price")[0].id
      );
      const durationFromOffer = parseRDFLiteral(
        offerStore.getObjects(
          null,
          "http://www.w3.org/2006/time#numericDuration"
        )[0].id
      );
      return { resourceURLFromOffer, priceFromOffer, durationFromOffer };
    })
  );

  return resources;
};

/*******************
 *      UTILS      *
 *******************/

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

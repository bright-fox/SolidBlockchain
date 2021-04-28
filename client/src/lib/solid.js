import { Writer, Parser, Store, DataFactory } from "n3";
import { hashValue, toHex } from ".";
import { parsePriceToWei } from "./blockchain";

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
 * Post a Resource to a container (e.g. for LDNs)
 * @param {string} url url of container to put the resource
 * @param {function} fetch
 * @param {string|Blob} body information to send
 */
export const postResource = async (url, fetch, body) => {
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/turtle",
      Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
    },
    body: body,
  });
};

/**
 * Make a put request for a resource
 * @param {string} url
 * @param {File} body
 * @param {function} fetch
 */
export const putResource = async (url, body, fetch) => {
  await fetch(url, {
    method: "PUT", //PUT instead of POST to overwrite existing data
    headers: {
      "Content-Type": body.type,
      slug: body.name,
      Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
    },
    body: body,
  });
};

/**
 * Deletes a specified resource
 * @param {string} url url of resource
 * @param {function} fetch
 */
export const deleteResource = async (url, fetch) => {
  await fetch(url, {
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

export const fetchResourceInfoFromOffer = async (offerURL, fetch) => {
  const offerStore = await requestRDF(offerURL, fetch);
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
};

/**
 * creates a default ACL file for payable container where owner has full access rights and everybody read
 * @param {string} username username of the owner
 *
 */
export const createPayableACL = (username) => {
  const acl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
    # The owner has all permissions
    <#owner>
        a acl:Authorization;
        acl:defaultForNew <./>;
        acl:agent <https://${username}.inrupt.net/profile/card#me>;
        acl:accessTo <https://${username}.inrupt.net/payable/>; 
        acl:mode acl:Read, acl:Write, acl:Control. 

    # The public has read permissions
    <#public>
        a acl:Authorization;
        acl:agentClass acl:AuthenticatedAgent;
        acl:accessTo <./>;
        acl:default <./>;
        acl:mode acl:Read.
    `;
  return acl;
};

/**
 * creates a default ACL file for pending container where owner has full access rights and everybody read
 * @param {string} webID webID of the client
 *
 */
export const createPendingContainerACL = (webID) => {
  const pendingContainerURL = webID.replace("profile/card#me", "pending/");
  const acl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
    # The owner has all permissions
    <#owner>
        a acl:Authorization;
        acl:defaultForNew <./>;
        acl:agent <${webID}>;
        acl:accessTo <${pendingContainerURL}>; 
        acl:mode acl:Read, acl:Write, acl:Control. 
    `;
  return acl;
};

/**
 * creates a default ACL file where owner has full access rights
 * @param {string} username username of the owner
 * @param {string} fileName for the acl
 */
export const createACL = (username, fileName) => {
  const acl = `
    @prefix acl: <http://www.w3.org/ns/auth/acl#>.
    # The owner has all permissions
    <#owner>
      a acl:Authorization;
      acl:agent <https://${username}.inrupt.net/profile/card#me>;
      acl:accessTo <https://${username}.inrupt.net/private/${fileName}>; 
      acl:mode acl:Read, acl:Write, acl:Control. 
      `;
  return acl;
};

/**
 * Put ACL on Solid pod
 * @param {string} aclURL URL or acl ending with .acl
 * @param {string} aclBody acl to be put
 * @param {function} fetch
 */
export const putACL = async (aclURL, aclBody, fetch) => {
  const options = {
    method: "PUT",
    headers: { "Content-Type": "text/turtle", Link: `<.acl>; rel="acl"` },
    body: aclBody,
  };

  await fetch(aclURL, options);
};

/**
 * Appends read rights to resource's acl for the client and returns updated acl as string
 * @param {Store} aclStore n3 store
 * @param {string} senderWebID webID of sender
 * @param {string} resourceURL
 * @param {number} beginning beginning datetime as timestamp
 * @param {number} end end datetime as timestamp
 */
export const updateACL = async (
  aclStore,
  senderWebID,
  resourceURL,
  beginning,
  end
) => {
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
 * check the availability of a resource and return a string
 * @param {string} url resource url
 * @param {function} fetch fetch function
 */
export const checkAvailability = async (url, fetch) => {
  const response = await requestHead(url, fetch);

  switch (response.status) {
    case 200:
      return "Authorized";
    case 401:
    case 403:
      return "Unauthorized";
    case 404:
      return "N/A";
    default:
      return "Error";
  }
};

/**
 * Parses a literal to string
 * @param {string} literal
 */
export function parseRDFLiteral(literal) {
  return literal.split('"')[1];
}

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
  return rawAddress.split('"')[1];
};

/**
 * Returns a linked data notification for a transaction
 * @param {string} senderEthAddress ethereum address of the sender
 * @param {string} receiverEthAddress ethereum address of the receiver
 * @param {string} senderWebID webID of the sender
 * @param {string} resourceURL url of the resource
 * @param {string} price price of resource
 * @param {string} duration duration of resource in minutes
 * @param {string} transactionHash hash from the transaction for resource access
 */
export const createLinkedDataNotification = (
  senderEthAddress,
  receiverEthAddress,
  senderWebID,
  resourceURL,
  price,
  duration,
  transactionHash
) => {
  const msgPayload = toHex(`${resourceURL},${duration}`);
  const priceInWei = parsePriceToWei(price);

  return `
    @prefix : <#> .
    @prefix ethon: <http://ethon.consensys.net/> .
    @prefix solid: <http://www.w3.org/ns/solid/terms#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    
    :Transaction 
      a ethon:Tx;
      ethon:txHash "${transactionHash}"^^xsd:hexBinary;
      ethon:from :Sender;
      ethon:to :Receiver;
      ethon:value ${priceInWei};
      ethon:msgPayload "${msgPayload}"^^xsd:hexBinary .

    :Sender 
      a ethon:Account, solid:Account;
      ethon:address "${senderEthAddress}"^^xsd:hexBinary;
      solid:account <${senderWebID}> .

    :Receiver 
      a ethon:Account;
      ethon:address "${receiverEthAddress}"^^xsd:hexBinary .
    `;
};

/**
 * Returns offer in RDF as string
 * @param {string} resourceURL url of resource
 * @param {string} price
 * @param {string} offerDuration
 */
export const createOffer = (resourceURL, price, offerDuration) => {
  const offer = `
  @prefix : <#> .
  @prefix  schema:  <https://schema.org/> .
  @prefix time: <http://www.w3.org/2006/time#> .
  
  :Offer 
    a schema:Offer;
    schema:itemOffered :Item;
    schema:price ${price};
    schema:priceCurrency "ETH". 
  :Item
    a schema:Product;
    schema:url <${resourceURL}>;
    time:hasDuration [
      a time:Duration;
      time:numericDuration ${offerDuration};
      time:unitType time:unitMinute;
    ].
  `;
  return offer;
};

/**
 * Returns a pending notification
 * @param {string} resourceURL
 * @param {string} clientWebID Web ID from client
 * @param {string} resourceOwnerWebID Web ID from resource owner
 * @param {string} price ethereum price
 */
export const createPendingNotification = (
  resourceURL,
  clientWebID,
  resourceOwnerWebID,
  price
) => {
  return `
    @prefix : <#> .
    @prefix schema: <https://schema.org/>.
    
    :Buyaction 
      a schema:BuyAction;
      schema:seller <${resourceOwnerWebID}>;
      schema:agent <${clientWebID}>;
      schema:object :Item;
      schema:price ${price};
      schema:priceCurrency "ETH" .
      
    :Item
      a schema:Thing;
      schema:url <${resourceURL}> .
      `;
};

import { Writer, Parser, Store } from "n3";

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
 * Parses a literal to string
 * @param {string} literal
 */
export const parseRDFLiteral = (literal) => {
  return literal.split('"')[1];
};

/**
 * get aclIdentifier of expired authorizations
 * @param {number} now current datetime timestamp
 * @param {Store} aclStore
 */
export const getExpiredACLIdentifiers = (now, aclStore) => {
  const expiredACLIdentifiers = [];
  const endTimeBlankNodeNames = aclStore
    .getObjects(null, "http://www.w3.org/2006/time#hasEnd")
    .map((item) => item.id);

  for (let endTimeBlankNodeName of endTimeBlankNodeNames) {
    const endTimeLiteral = aclStore.getObjects(
      endTimeBlankNodeName,
      "http://www.w3.org/2006/time#inXSDDateTimeStamp"
    )[0].id;
    const endTime = parseRDFLiteral(endTimeLiteral);

    if (endTime <= now) {
      const expiredBuyerIdentifier = aclStore.getSubjects(
        "http://www.w3.org/2006/time#hasEnd",
        endTimeBlankNodeName
      )[0].id;
      expiredACLIdentifiers.push(expiredBuyerIdentifier);
    }
  }

  return expiredACLIdentifiers;
};

export const removeMatches = (aclStore, expiredACLIdentifiers) => {
  for (let expiredACLIdentifier of expiredACLIdentifiers) {
    const hasBeginningBlankNodeName = aclStore.getObjects(
      expiredACLIdentifier,
      "http://www.w3.org/2006/time#hasBeginning"
    )[0];
    const hasEndBlankNodeName = aclStore.getObjects(
      expiredACLIdentifier,
      "http://www.w3.org/2006/time#hasEnd"
    )[0];

    // update acl rights of the resource (delete expired quads)
    aclStore.removeQuads(aclStore.getQuads(expiredACLIdentifier));
    aclStore.removeQuads(aclStore.getQuads(hasEndBlankNodeName));
    aclStore.removeQuads(aclStore.getQuads(hasBeginningBlankNodeName));
  }

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

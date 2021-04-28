import React, { useState, useContext } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import { Form, Button, Col, Table } from "react-bootstrap";
import {
  createLinkedDataNotification,
  getEthereumAddressFromWebID,
  postResource,
  createPendingNotification,
  deleteResource,
  requestHead,
  createPendingContainerACL,
  putACL,
  fetchURLsFromContainer,
  fetchResourceInfoFromOffer,
} from "../lib/solid";
import { sendEther } from "../lib/blockchain";
import BlockchainContext from "../contexts/BlockchainContext";
import AnnouncementContext from "../contexts/AnnouncementContext";
import { ERROR, SUCCESS } from "../actions";
import { getPendingRequests } from "../lib";

const RetrieveResources = () => {
  const { session } = useSession();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const { blockchainState } = useContext(BlockchainContext);
  const { dispatchAnnouncement } = useContext(AnnouncementContext);

  // get payable resource list from user
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session.info.isLoggedIn) {
      dispatchAnnouncement({
        type: ERROR,
        payload: { msg: "Login to proceed." },
      });
      return;
    }

    try {
      setLoading(true);
      // check if client has pending container
      const pendingContainerURL = session.info.webId.replace(
        "profile/card#me",
        "pending/"
      );
      const pendingContainerHeadResponse = await requestHead(
        pendingContainerURL,
        session.fetch
      );

      let pendingRequests = [];
      if (pendingContainerHeadResponse.status !== 200) {
        // create pending container acl
        const pendingContainerACL = createPendingContainerACL(
          session.info.webId
        );
        await putACL(
          pendingContainerURL + ".acl",
          pendingContainerACL,
          session.fetch
        );
      } else {
        // get the list of all pending requests from a client for the searched user
        const resourceOwnerWebID = `https://${username}.inrupt.net/profile/card#me`;
        pendingRequests = await getPendingRequests(
          session.info.webId,
          resourceOwnerWebID,
          session.fetch
        );
      }

      // request payable resources list and get a list of all offers
      const payableContainerUrl = `https://${username}.inrupt.net/payable/`;
      const offers = await fetchURLsFromContainer(
        payableContainerUrl,
        session.fetch
      );

      // iterate over the offers and get the actual resource urls
      const results = await Promise.all(
        offers.map(async (offer) => {
          const {
            resourceURLFromOffer,
            priceFromOffer,
            durationFromOffer,
          } = await fetchResourceInfoFromOffer(offer, session.fetch);

          // check the availability
          const matchingPendingRequests = pendingRequests.filter(
            (r) => r.resourceURL === resourceURLFromOffer
          );

          const hasPendingRequest = matchingPendingRequests.length > 0;
          const headResponse = await requestHead(
            resourceURLFromOffer,
            session.fetch
          );

          // delete pending request if access is granted
          if (hasPendingRequest && headResponse.status === 200) {
            await deleteResource(
              matchingPendingRequests[0].pendingRequestURL,
              session.fetch
            );
          }

          let availability = "N/A";
          if (headResponse.status === 200) {
            availability = "Authorized";
          } else if (hasPendingRequest) {
            availability = "Pending";
          } else if (
            headResponse.status === 401 ||
            headResponse.status === 403
          ) {
            availability = "Unauthorized";
          }

          return {
            url: resourceURLFromOffer,
            price: priceFromOffer,
            availability,
            duration: durationFromOffer,
          };
        })
      );

      // save the resource urls in the state
      setResources(results);
      setLoading(false);
    } catch (error) {
      console.log(error);
      alert("Something went wrong. Look in the console for more information.");
    }
  };

  const handlePay = async (url, price, duration) => {
    if (!session.info.isLoggedIn) {
      dispatchAnnouncement({
        type: ERROR,
        payload: { msg: "Login to proceed." },
      });
      return;
    }

    try {
      // get the ethereum addresses
      const sender = blockchainState.accounts[0];
      const pendingContainerURL = session.info.webId.replace(
        "profile/card#me",
        "pending/"
      );
      const resourceOwnerWebID = `https://${username}.inrupt.net/profile/card#me`;
      const receiver = await getEthereumAddressFromWebID(
        resourceOwnerWebID,
        session.fetch
      );

      const txData = `SOLIDBLOCKCHAIN_TX_DATA,${url},${session.info.webId},${price},${duration}`;

      // make payment for the resource
      const transactionHash = await sendEther(
        blockchainState.web3,
        sender,
        receiver,
        price,
        txData
      );

      // create Linked Data Notification
      const notification = createLinkedDataNotification(
        sender,
        receiver,
        session.info.webId,
        url,
        price,
        duration,
        transactionHash
      );

      await postResource(
        `https://${username}.inrupt.net/inbox/`,
        session.fetch,
        notification
      ); // TODO: handle error

      // create a pending Notification for user
      const pendingLDN = createPendingNotification(
        url,
        session.info.webId,
        resourceOwnerWebID,
        price
      );
      await postResource(pendingContainerURL, session.fetch, pendingLDN);

      dispatchAnnouncement({
        type: SUCCESS,
        payload: {
          msg:
            "Transaction was successful! Wait for the resource owner to accept the request.",
        },
      });

      // set the resource as pending request
      setResources(
        resources.map((r) =>
          r.url === url ? { ...r, availability: "Pending" } : r
        )
      );
    } catch (error) {
      console.log(error);
      alert(
        "Could not pay for the resource. Transaction failed. See more on the console"
      );
    }
  };

  const renderURLList = () => {
    if (loading) {
      return (
        <tbody>
          <tr>
            <td>Loading..</td>
          </tr>
        </tbody>
      );
    }
    return (
      <tbody>
        {resources.map((r, i) => {
          return (
            <tr key={i}>
              <td>
                <strong>{i + 1}</strong>
              </td>
              <td>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.url}
                </a>
              </td>
              <td>{r.availability}</td>
              <td>
                {r.availability === "Unauthorized" && (
                  <span>{r.price} ETH</span>
                )}
              </td>
              <td>
                {r.availability === "Unauthorized" && (
                  <span>
                    {r.duration} {r.duration === "1" ? "minute" : "minutes"}
                  </span>
                )}
              </td>
              <td>
                {r.availability === "Unauthorized" && (
                  <Button onClick={() => handlePay(r.url, r.price, r.duration)}>
                    Pay
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  };

  return (
    <>
      <h1>Retrieve Resources</h1>
      <Form className="mx-5" onSubmit={handleSubmit}>
        <Form.Row className="justify-content-md-center">
          <Form.Group as={Col} md={11}>
            <Form.Control
              type="text"
              placeholder="Enter username.."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Button variant="primary" type="submit">
              Search
            </Button>
          </Form.Group>
        </Form.Row>
      </Form>
      <Table responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Resource URL</th>
            <th>Availability</th>
            <th>Price</th>
            <th>Duration</th>
            <th></th>
          </tr>
        </thead>
        {renderURLList()}
      </Table>
    </>
  );
};

export default RetrieveResources;

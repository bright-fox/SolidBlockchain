import React, { useState, useEffect, useContext } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import { Button, Card } from "react-bootstrap";
import {
  fetchACL,
  getEthereumAddressFromWebID,
  requestRDF,
  updateACL,
  deleteResource,
  fetchURLsFromContainer,
  putACL,
} from "../lib/solid";
import {
  findTransaction,
  parsePriceToWei,
  getDecodedMessage,
} from "../lib/blockchain";
import BlockchainContext from "../contexts/BlockchainContext";
import { ERROR, SUCCESS } from "../actions";
import AnnouncementContext from "../contexts/AnnouncementContext";
import {
  createStartAndEndDate,
  fetchResourceInfoFromPayable,
  getTxInfoFromLDN,
} from "../lib";

const AccessControl = () => {
  const { session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const { blockchainState } = useContext(BlockchainContext);
  const { dispatchAnnouncement } = useContext(AnnouncementContext);

  // get all the notifications of the inbox
  useEffect(() => {
    if (!session.info.isLoggedIn) {
      dispatchAnnouncement({
        type: ERROR,
        payload: {
          msg: "You have to login first to see the new notifications!",
        },
      });
      return;
    }

    const fetchData = async () => {
      try {
        const inboxURL = session.info.webId.replace(
          "/profile/card#me",
          "/inbox/"
        );
        const payableContainerURL = session.info.webId.replace(
          "/profile/card#me",
          "/payable/"
        );

        // get the resource information from the offers
        const _resources = await fetchResourceInfoFromPayable(
          payableContainerURL,
          session.fetch
        );

        // parse all the Linked Data Notifications and save them in state

        const _notifications = await fetchURLsFromContainer(
          inboxURL,
          session.fetch
        );
        const result = await Promise.all(
          _notifications.map(async (notification) => {
            const notificationStore = await requestRDF(
              notification,
              session.fetch
            );

            // check if the notification is for an access request
            if (notificationStore.countQuads("#Transaction") <= 0) return null;

            // get the transaction information
            let txInfo = getTxInfoFromLDN(notificationStore);

            // delete ldn if it a fraudulent crafted ldn
            const filteredResources = _resources.filter(
              (r) => r.resourceURLFromOffer === txInfo.resourceURL
            );
            if (filteredResources.length <= 0) {
              await deleteResource(notification, session.fetch);
              return null;
            }

            // enrich notification state with offer information
            txInfo = {
              ...txInfo,
              notificationURL: notification,
              ...filteredResources[0],
            };
            return txInfo;
          })
        ).then((transactions) => transactions.filter((t) => t !== null));

        setNotifications(result);
      } catch (error) {
        console.log(error);
        dispatchAnnouncement({
          type: ERROR,
          payload: {
            msg: "Something went wrong. See console for more information.",
          },
        });
      }
    };

    fetchData();
  }, [
    session.fetch,
    session.info.webId,
    session.info.isLoggedIn,
    dispatchAnnouncement,
  ]);

  // TODO: optional: implement reject button

  const handleApprove = async ({
    resourceURL,
    transactionHash,
    senderEthAddress,
    receiverEthAddress,
    price,
    duration,
    senderWebID,
    notificationURL,
    resourceURLFromOffer,
    priceFromOffer,
    durationFromOffer,
  }) => {
    try {
      const priceInWei = parsePriceToWei(price);
      const priceFromOfferInWei = parsePriceToWei(priceFromOffer);
      // check if it is a valid linked data notification
      const isValidLDN =
        resourceURLFromOffer === resourceURL &&
        priceFromOfferInWei === priceInWei &&
        durationFromOffer === duration;

      if (!isValidLDN)
        throw new Error(
          "The information of the LDN does not correspond to the information of the original offer"
        );

      // find transaction
      const transaction = await findTransaction(
        blockchainState.web3,
        transactionHash
      );

      const msg = await getDecodedMessage(
        blockchainState.web3,
        transactionHash
      );
      const [
        ,
        resourceURLFromMsg,
        clientWebIDFromMsg,
        priceFromMsg,
        durationFromMsg,
      ] = msg.split(",");
      const priceFromMsgInWei = parsePriceToWei(priceFromMsg);

      // verify that transaction is the same as in the LDN
      const isValidTransaction =
        transaction.from === senderEthAddress &&
        transaction.to === receiverEthAddress &&
        receiverEthAddress ===
          (await getEthereumAddressFromWebID(
            session.info.webId,
            session.fetch
          )) &&
        transaction.value === priceInWei &&
        transaction.value === priceFromMsgInWei &&
        durationFromMsg === duration &&
        clientWebIDFromMsg === senderWebID &&
        resourceURLFromMsg === resourceURL;

      if (!isValidTransaction) {
        await deleteResource(notificationURL, session.fetch);
        throw new Error("Transaction is not valid. LDN was deleted.");
      }

      // append acl triples
      const aclStore = await fetchACL(resourceURL, session.fetch);
      const [startDate, endDate] = createStartAndEndDate(duration);

      const updatedACL = await updateACL(
        aclStore,
        senderWebID,
        resourceURL,
        startDate,
        endDate
      );

      // write the updated ACL to solid pod
      await putACL(resourceURL + ".acl", updatedACL, session.fetch);

      // delete ldn
      await deleteResource(notificationURL, session.fetch);

      dispatchAnnouncement({
        type: SUCCESS,
        payload: { msg: "Access succesfully granted!" },
      });

      // delete ldn from state
      setNotifications(
        notifications.filter((n) => n.notificationURL !== notificationURL)
      );
    } catch (error) {
      console.log(error);
      dispatchAnnouncement({
        type: ERROR,
        payload: {
          msg: error.toString(),
        },
      });
    }
  };

  const renderNotificationCards = () => {
    return notifications.map((n, i) => {
      return (
        <Card
          className="d-inline-flex justify-content-center align-items-start flex-column p-3 mb-3"
          border="dark"
          key={i}
        >
          <Card.Title>
            Access Request For Resource &#x3c;{n.resourceURL}&#x3e;
          </Card.Title>
          <Card.Subtitle className="mb-3 text-muted">
            From &#x3c;{n.senderWebID}&#x3e;
          </Card.Subtitle>
          <hr className="w-100" />
          <Card.Text className="d-flex justify-content-center align-items-start flex-column">
            <span className="font-weight-bold">
              Linked Data Notification - Transaction Information
            </span>
            <span>Hash: {n.transactionHash}</span>
            <span>
              <span className="font-weight-vbo">From: </span>
              {n.senderEthAddress}
            </span>
            <span>
              <span className="font-weight-vbo">To: </span>
              {n.receiverEthAddress}
            </span>
            <span>
              <span className="font-weight-vbo">Amount: </span>
              {n.price} ETH
            </span>
            <span>
              <span className="font-weight-vbo">Duration: </span>
              {n.duration} {n.duration === "1" ? "minute" : "minutes"}
            </span>
            <hr className="w-100" />
            <span className="font-weight-bold">
              Original Offer - Information
            </span>
            <span>
              <span className="font-weight-vbo">Price: </span>
              {n.priceFromOffer} ETH
            </span>
            <span>
              <span className="font-weight-vbo">Duration: </span>
              {n.durationFromOffer}{" "}
              {n.durationFromOffer === "1" ? "minute" : "minutes"}
            </span>
          </Card.Text>
          <Button variant="success" onClick={() => handleApprove(n)}>
            Approve
          </Button>
        </Card>
      );
    });
  };

  return (
    <>
      <h1>Access Control</h1>
      {renderNotificationCards()}
    </>
  );
};

export default AccessControl;

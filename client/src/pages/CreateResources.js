import React, { useContext, useState } from "react";
import { useSession } from "@inrupt/solid-ui-react";
import { Form, Button, Col } from "react-bootstrap";
import {
  createPayableACL,
  checkAvailability,
  createACL,
  createOffer,
  putACL,
  putResource,
  postResource,
} from "../lib/solid";
import AnnouncementContext from "../contexts/AnnouncementContext";
import BlockchainContext from "../contexts/BlockchainContext";
import { SUCCESS } from "../actions";
import { zeroTxCreateResource } from "../lib/blockchain";

const CreateResources = () => {
  const { session } = useSession();
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState("");
  const [offerDuration, setOfferDuration] = useState("");
  const { dispatchAnnouncement } = useContext(AnnouncementContext);
  const { blockchainState } = useContext(BlockchainContext);

  //save the uploaded file when clicking the submit button
  async function submitForm(e) {
    e.preventDefault();

    const username = session.info.webId.split(/[//.]+/)[1];
    const privateContainerURL = `https://${username}.inrupt.net/private`; //location where file should be saved
    const aclPath = privateContainerURL + `/${file.name}.acl`;
    const fileName = file.name;
    const resourceURL = privateContainerURL + `/${file.name}`;
    const payableContainerURL = `https://${username}.inrupt.net/payable`; //location where offer ttl for the resource should be saved

    switch (checkAvailability(payableContainerURL + `/`, session.fetch)) {
      case "Authorized":
        return console.log("Container already exists");
      default:
        //create acl file for the payable container
        const payableacl = createPayableACL(username);
        await putACL(payableContainerURL + "/.acl", payableacl, session.fetch);
    }

    //create new ACL file for the resource
    const acl = createACL(username, fileName);
    await putACL(aclPath, acl, session.fetch);

    //save the resource
    await putResource(resourceURL, file, session.fetch);

    //create offer
    const offer = createOffer(resourceURL, price, offerDuration);

    //requestoptions for posting the offer //prerequisite payable container in public folder
    await postResource(payableContainerURL, session.fetch, offer);

    // create zero transaction
    await zeroTxCreateResource(
      blockchainState.web3,
      blockchainState.accounts[0],
      blockchainState.accounts[0],
      `${resourceURL};${price};${offerDuration}`
    );

    // reset fields
    setPrice("");
    setOfferDuration("");

    dispatchAnnouncement({
      type: SUCCESS,
      payload: { msg: "Resource creation was successful!" },
    });
  }

  return (
    <>
      <h1>Create Resources</h1>
      <Form onSubmit={submitForm}>
        <Form.Row className="justify-content-md-center">
          <Form.Group controlId="formResourceBrowse">
            <Form.Label size="lg">Resource</Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => {
                setFile(e.target.files[0]);
              }}
              required
            />
            <Form.Text className="text-muted">
              Please select a file that you want to upload.
            </Form.Text>
          </Form.Group>
        </Form.Row>

        <Form.Row className="justify-content-md-center">
          <Form.Group controlId="formResourcePrice" lg={11}>
            <Form.Label size="lg">Resource price</Form.Label>
            <Col sm="12">
              <Form.Control
                type="number"
                placeholder="0.0003"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                }}
                required
              />
            </Col>
            <Form.Text className="text-muted">
              Please specify a price in "ETH" for your resource
            </Form.Text>
          </Form.Group>

          <Col sm="1"></Col>

          <Form.Group controlId="formOfferDuration" lg={11}>
            <Form.Label>Offer duration</Form.Label>
            <Col sm="12">
              <Form.Control
                type="number"
                placeholder="5"
                min="0"
                step="1"
                value={offerDuration}
                onChange={(e) => {
                  setOfferDuration(e.target.value);
                }}
                required
              />
            </Col>
            <Form.Text className="text-muted">
              Please specify a duration in "minutes" for your offer
            </Form.Text>
          </Form.Group>
        </Form.Row>

        <Form.Group>
          {!session.info.isLoggedIn ? (
            <Form.Label>Please log in to upload a file</Form.Label>
          ) : (
            <Button variant="primary" type="submit">
              Create
            </Button>
          )}
        </Form.Group>
      </Form>
    </>
  );
};

export default CreateResources;

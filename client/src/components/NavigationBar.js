import React from "react";
import { useSession, LoginButton, LogoutButton } from "@inrupt/solid-ui-react";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import { Link } from "react-router-dom";

import "./NavigationBar.css";

const NavigationBar = () => {
  const { session } = useSession();

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand as={Link} to="/">
          SolidBlockchain
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Nav.Link as={Link} to="/">
              Retrieve Resource
            </Nav.Link>
            {session.info.isLoggedIn && (
              <>
                <Nav.Link as={Link} to="/resources/create">
                  Create Resource
                </Nav.Link>
                <Nav.Link as={Link} to="/resources/accesscontrol">
                  Access Control
                </Nav.Link>
              </>
            )}
          </Nav>
          {!session.info.isLoggedIn ? (
            <LoginButton
              oidcIssuer="https://inrupt.net"
              redirectUrl={window.location.href}
            />
          ) : (
            <div className="white-text">
              Logged In as:{" "}
              <span className="login-information">
                {session.info.webId.split("/")[2].split(".")[0]}
              </span>
              <LogoutButton />
            </div>
          )}
        </Navbar.Collapse>
      </Navbar>
    </>
  );
};

export default NavigationBar;

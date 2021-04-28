import React, { useEffect, useMemo, useReducer } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import getWeb3 from "../blockchain/getWeb3";
import blockchainReducer from "../reducers/blockchainReducer";
import { BLOCKCHAIN_SETUP } from "../actions";

import "./App.css";
import NavigationBar from "./NavigationBar";
import CreateResources from "../pages/CreateResources";
import AccessControl from "../pages/AccessControl";
import RetrieveResources from "../pages/RetrieveResources";
import BlockchainContext from "../contexts/BlockchainContext";
import AnnouncementContext from "../contexts/AnnouncementContext";
import useAnnouncement from "../hooks/useAnnouncement";
import { idleStatus } from "../utils/variables";
import Announcement from "./Announcement";

const App = () => {
  // setup the blockchain state
  const initialBlockchainState = {
    web3: null,
    accounts: null,
  };
  const [blockchainState, dispatch] = useReducer(
    blockchainReducer,
    initialBlockchainState
  );

  // makes sure to only rerender if the state object or the dispatch function changes
  const blockchainContextValue = useMemo(() => {
    return { blockchainState, dispatch };
  }, [blockchainState, dispatch]);

  // setup the announcement state
  const [announcementState, dispatchAnnouncement] = useAnnouncement();
  const { status, msg } = announcementState;

  const announcementContextValue = useMemo(() => {
    return { announcementState, dispatchAnnouncement };
  }, [announcementState, dispatchAnnouncement]);

  // setup for web3
  useEffect(() => {
    const setupWeb3 = async () => {
      try {
        // Get network provider and web3 instance.
        const web3 = await getWeb3();

        // Use web3 to get the user's accounts.
        const accounts = await web3.eth.getAccounts();

        // Set web3, accounts, and contract to the application's context
        dispatch({
          type: BLOCKCHAIN_SETUP,
          payload: { web3, accounts },
        });
      } catch (error) {
        // Catch any errors for any of the above operations.
        alert(`Failed to load web3 and accountsCheck console for details.`);
        console.error(error);
      }
    };

    setupWeb3();
  }, []);

  return (
    <div className="App">
      <BlockchainContext.Provider value={blockchainContextValue}>
        <AnnouncementContext.Provider value={announcementContextValue}>
          <Router>
            <NavigationBar />
            {status !== idleStatus && (
              <Announcement status={status} message={msg} />
            )}
            <Switch>
              <Route path="/" exact>
                <RetrieveResources />
              </Route>
              <Route path="/resources/create" exact>
                <CreateResources />
              </Route>
              <Route path="/resources/accesscontrol" exact>
                <AccessControl />
              </Route>
            </Switch>
          </Router>
        </AnnouncementContext.Provider>
      </BlockchainContext.Provider>
    </div>
  );
};

export default App;

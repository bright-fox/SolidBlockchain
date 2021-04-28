# Solidblockchain - Solid Application

## Getting started without Docker

### Install Node and Ganache

1. Download and install [Nodejs](https://nodejs.org/en/download/).
2. Go to your console.
3. Install ganache-cli with `npm install -g ganache-cli`
4. Run `ganache-cli --mnemonic "someone sock acquire double double tennis reveal seat pen ignore cream balcony"` to start ganache-cli.

### Run the application

1. Clone the repository and navigate into `Solidblockchain/client` folder.
2. Run `npm install` to install all dependencies.
3. Download the Metamask extension e.g. for [Chrome](https://metamask.io/download.html) to create a cryptocurrency wallet.
   - Follow the metamask instructions and create a new account.
   - Change the network to localhost:8545 (Ethereum Main Net > Localhost 8545).
   - Click on the colored icon > Import account.
   - Import the ethereum account for the Solid account that you will login to (More information on the README.md of the parent folder).
4. Run `npm start` to run the application.
5. Go on your browser (where the Metamask extension is also installed) to http://localhost:3000.
   - If Metamask pops up, connect with the imported account that has 100 ETH.
6. Login with your Solid account.
7. Search on the `Retrieve Resources` page for other users and pay for an offer.

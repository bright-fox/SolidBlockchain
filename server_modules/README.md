# Server Modules for Solid Pod

## Getting started without Docker

### Install Node and Ganache

1. Download and install [Nodejs](https://nodejs.org/en/download/).
2. Go to your console.
3. Install ganache-cli with `npm install -g ganache-cli`
4. Run `ganache-cli --mnemonic "someone sock acquire double double tennis reveal seat pen ignore cream balcony"` to start ganache-cli.

## Run the server modules

To start the periodical notification processing, you have to do the following steps:

1. Clone the repository and navigate into the folder `Solidblockchain/server_modules`.
2. Navigate into the folder of `processNotifications`.
3. Create an .env file with the fields provided by the example.env file
4. Fill out the fields with your credentials of the solid account (do not push it accidentally on the github server)
5. Add "https://solid-node-client" as a trusted app in your Solid pod.
6. Run `npm install` to install all the necessary packages
7. Run `npm start` to start the server module

To start the periodical cleaning of the expired acls, follow the same steps as above but just go into the folder `cleanExpiredACL` instead.

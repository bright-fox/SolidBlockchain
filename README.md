# Solidblockchain

Combine SoLid and Ethereum blockchain to create a peer-to-peer network for users to exchange resources for payment.

## Steps to deploy the application on a server or to run it locally

1. Clone the repository.
2. Install Docker Desktop e.g. from their [homepage](https://www.docker.com/products/docker-desktop).
3. Optional Step: If you want to also run the server modules:
   - Navigate into the `Solidblockchain` folder and open the `docker-compose.yml` file.
   - Uncomment the server modules you want to use.
   - Navigate into the `server_modules` folder and into the folders with the server modules you want to run e.g. `processNotifications` folder
   - Create an .env file with the fields provided by the example.env file and fill it out with your information.
   - Go to your browser and login to your Solid Pod specified in the .env file and add `https://solid-node-client` as a trusted application with read, write, append and control permissions in the preferences tab in your profile.
4. Setup your Solid Account
   - [See below](#setup-for-your-solid-accounts)
5. Navigate into the Solidblockchain folder.
6. Run `docker-compose up --build` to build the images and start the ganache container and the application container.

## Steps to test the locally deployed application:

1. Download the Metamask extension e.g. for [Chrome](https://metamask.io/download.html) to create a cryptocurrency wallet.

   - Follow the metamask instructions and create a new account.
   - Change the network to Localhost:8545 (Ethereum Main Net > Localhost:8545)
   - Click on the colored icon > Import account.

     - **IMPORTANT:** Import the ethereum account for the Solid account that you will login to in this application. The ethereum address of Metamask and inside your Solid profile has to match.
     - Copy and paste the private key to import the account ([see below for the accounts](#setup-for-your-solid-accounts))

     ```
     Example:
     The private key
     0x586439f4062db2f604e1edf57f5e5bbf09d8c57fd969f1d98802ca425c83f0d9

     will import the ethereum address
     0x6a04b3199DD582ABF6ee3DA94968a9D92DdAe00E

     ```

2. Go on your browser (where the Metamask extension is also installed) to your locally deployed application URL e.g. http://localhost:3000.
   - If Metamask pops up, connect with the imported account that has 100 ETH.
3. Login with your Solid Account.
4. Search on the `Retrieve Resources` page for other users and pay for an offer (If you use the server modules search for the user specified in the .env file to see the server modules in action).

## Setup for your Solid accounts

1. Go to your browser and login to your Solid Pod.
2. Choose for every Solid account a different ethereum account and save it in the profile of the Solid account.

Save the ethereum account in the Solid profile.

```
@prefix ethon: <http://ethon.consensys.net/>.
@prefix : <#>.

:me ethon:controlsAccount :EthereumAccount.

:EthereumAccount a ethon:ExternalAccount;
ethon:address "0xYOURCHOSENADDRESS".
```

Available Accounts on Ganache Blockchain (do not use these accounts for trading real cryptocurrencies)

```
Available Accounts

(0) 0x7A59ba2A7edDBE60aCF31C56D7fEaB8574692359
(1) 0x6a04b3199DD582ABF6ee3DA94968a9D92DdAe00E
(2) 0x84EB7fb899dbC2DF379b162BE22698a1956216Ad
(3) 0xF88E89187F4F2247ad013436512c553541E0b6fB
(4) 0x0E08647796f6a2C065e4326F84226f71d1EEcEa4
(5) 0xB388b489b3bed496Aec036587aA2f457a78fa49c
(6) 0xab8Cf0805cC58E43B6Ae4B2b9f12B0C928223e8C
(7) 0x81096928961B0c9aDcB0fB13A961B2ce292F80F1
(8) 0x21daE63b3F015A6569738F9c151a7c5Fef8dd8cf
(9) 0xfB07DBE3C40068e2a4BE1A079021eB0B102863B2

Private Keys

(0) 0x71bc615d073e619e87e8734caed35fb2fb0fa91d3530f20caba2277fd02c9ac7
(1) 0x586439f4062db2f604e1edf57f5e5bbf09d8c57fd969f1d98802ca425c83f0d9
(2) 0xf4892982cf7b4b8fc4657526200452dcb6dd110d39426b38b46c4621aa19a717
(3) 0xcd985ab29662323c5b08ad893926868a898398e09725598c10ceb088f536b354
(4) 0x108958cc802b29d20d1710a39efeb0e0192d25d265cb659bc72d3cbcde38374e
(5) 0xac7ef6baa6a19e88ea1e9e4080345e74d793a71a836a08d26b901cf291f7ffb5
(6) 0x28680c7e3cbd078b4c71c11baa5a5d1dfed44bf423874dbcc93800912780ba21
(7) 0x95e5d1e15c7b198765d2278d7e646445877d47b03a054478bda496f75e98f02a
(8) 0x505292f1658cc9163307118c65d58b8caa8688f775d498dd74fed6a4cf2c91c7
(9) 0x0fbc2f04202939a80857c0a527bc8025357b3886da9577333575cf95c6682b53
```

3. Add the URL of the application e.g `http://localhost:3000` as a trusted application in the Preferences tab of the solid pod and give it read, write, append and control permissions.

### _More Informations for the client and server modules is in the README.md inside their folders e.g. how to run them without docker._

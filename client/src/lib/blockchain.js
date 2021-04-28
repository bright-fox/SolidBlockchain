import web3 from "web3";

/**
 * Sends Ethereum and returns the transaction hash
 * @param {Web3} web3 Web3 instance to access blockchain
 * @param {string} sender ethereum address of sender
 * @param {string} receiver ethereum address of receiver
 * @param {int} amount amount of ether
 * @param {string} data ResourceURI;WEB_ID_Sender;WEB_ID_Receiver
 */
export function sendEther(web3, sender, receiver, amount, txdata) {
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction(
      {
        from: sender,
        to: receiver,
        value: web3.utils.toWei(amount, "ether"),
        gas: 3000000,
        data: web3.utils.fromAscii(txdata),
      },
      (err, transactionHash) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(transactionHash);
        }
      }
    );
  });
}

/**
 * Returns the transaction as an object
 * @param {string} hash transaction hash
 */
export const findTransaction = async (web3, hash) => {
  return new Promise((resolve, reject) => {
    web3.eth.getTransaction(hash, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Converts ether to wei
 * @param {string} price price in ether
 */
export const parsePriceToWei = (price) => {
  return web3.utils.toWei(price, "ether");
};

export const parseWeiToEther = (priceInEther) => {
  return web3.utils.fromWei(priceInEther, "ether");
};

/**
 * Creates a zero transaction for created resource
 * @param {Web3} web3 Web3 instance to access blockchain
 * @param {string} sender ethereum address of sender
 * @param {string} txdata SolidBlockchainResourceCreation;ResourceURI
 */
export function zeroTxCreateResource(web3, sender, txdata) {
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction(
      {
        from: sender,
        to: sender,
        value: web3.utils.toWei("0", "ether"),
        gas: 3000000,
        data: web3.utils.fromAscii("SolidBlockchainResourceCreation;" + txdata),
      },
      (err, transactionHash) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(transactionHash);
        }
      }
    );
  });
}

/**
 * Creates a zero transaction for deleted resource
 * @param {Web3} web3 Web3 instance to access blockchain
 * @param {string} sender ethereum address of sender
 * @param {string} receiver ethereum address of receiver
 * @param {string} data SolidBlockchainResourceDeletion;ResourceURI
 */
export function zeroTxDeleteResource(web3, sender, receiver, txdata) {
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction(
      {
        from: sender,
        to: receiver,
        value: web3.utils.toWei("0", "ether"),
        gas: 3000000,
        data: web3.utils.fromAscii("SolidBlockchainResourceDeletion;" + txdata),
      },
      (err, transactionHash) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(transactionHash);
        }
      }
    );
  });
}

/**
 * Returns decoded transaction message.
 * @param {Web3} web3 Web3 instance to access blockchain
 * @param {string} sender transaction hash
 */
export async function getDecodedMessage(web3, txhash) {
  var tx = await web3.eth.getTransaction(txhash);
  var msg = await web3.utils.toAscii(tx.input);
  return msg;
}

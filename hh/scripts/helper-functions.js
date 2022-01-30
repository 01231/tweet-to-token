const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "artifacts/contracts/map.js");

exports.storeContractAddress = async (contract, contractName) => {
  const { address, deployTransaction } = contract;
  const { chainId } = deployTransaction;

  fs.stat(filePath, (err) => {
    if (err == null) {
      // File exists
      let { addresses } = require("../artifacts/contracts/map");

      if (!addresses[chainId]) {
        // Network does not exist yet
        addresses[chainId] = {
          [contractName]: [address],
        };
        writeFile(addresses);
      } else if (!addresses[chainId][contractName]) {
        // Network exists but contract does not
        addresses[chainId][contractName] = [address];
        writeFile(addresses);
      } else if (addresses[chainId][contractName][0] !== address) {
        // Network and contract exist but address does not
        addresses[chainId][contractName].unshift(address);
        writeFile(addresses);
      }
    } else if (err.code === "ENOENT") {
      // File does not exist
      const addresses = {
        [chainId]: {
          [contractName]: [address],
        },
      };
      writeFile(addresses);
    } else {
      console.log("Some other error: ", err.code);
    }
  });
  return contract.address;
};

function writeFile(addresses) {
  fs.writeFile(
    filePath,
    `exports.addresses = ${JSON.stringify(addresses)};`,
    (err) => {
      if (err) console.log(err);
    }
  );
}

exports.printEtherscanLink = (contractAddress, chainId) => {
  let link;
  switch (chainId) {
    case 1:
      link = "https://etherscan.io/address/";
      break;
    case 4:
      link = "https://rinkeby.etherscan.io/address/";
      break;
    case 1337:
      return;
    default:
      return;
  }
  console.log(
    `Using deployed contract ${contractAddress} available on ${link}${contractAddress}`
  );
};

exports.verifyContract = async (contract, args) => {
  const { address } = contract;
  if (hre.network.config.chainId === 31337 || !hre.config.etherscan.apiKey) {
    return; // contract is deployed on local network or no apiKey is configured
  }
  console.log("Waiting 5 block confirmations...");
  await contract.deployTransaction.wait(5); // needed if verifyContract() is called immediately after deployment
  try {
    console.log("Verifying contract...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (err) {
    if (err.message.includes("Reason: Already Verified")) {
      console.log("Contract is already verified!");
    }
  }
};

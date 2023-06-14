require("dotenv").config();

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");

const { isLocalNetwork } = require("./helper-functions");
const { addresses } = require("../src/config/contracts/map.json");
const { logMarketplaceURL } = require("./helper-functions");

const { ethers, network } = hre;

async function uploadToPinata(pinataContent, fileName) {
  const fd = new FormData();
  if (fileName) {
    fd.append("file", JSON.stringify(pinataContent), fileName);
  } else {
    fd.append("file", pinataContent);
  }
  fd.append(
    "pinataMetadata",
    JSON.stringify({
      keyvalues: {
        // env: "dev",
        date: new Date().toISOString(),
      },
    })
  );

  return fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_API_SECRET,
    },
    body: fd,
  })
    .then((res) => res.json())
    .then((json) => json.IpfsHash)
    .catch((err) => console.log(err));
}

async function getTokenURIHash(tweetId) {
  const imagePath = path.join(__dirname, "img", `${tweetId}.png`);
  const ipfsImagePath = await uploadToPinata(fs.createReadStream(imagePath));

  const metadata = {
    name: "#1 from @Rainmaker1973",
    description:
      "Tweet by @Rainmaker1973 tweeted on 21.12.21. Original: https://twitter.com/Rainmaker1973/status/1478285768493834240",
    image: ipfsImagePath,
    attributes: [
      { trait_type: "likes", value: 50 },
      { trait_type: "retweets", value: 13 },
      { trait_type: "comments", value: 3 },
      { trait_type: "language", value: "en" },
    ],
  };

  return uploadToPinata(metadata, `${tweetId}.json`);
}

async function mintTweet(contract, tweetOwner, tweetId) {
  let tx;
  tx = await contract.makeTweetMintable(
    // TODO: outdated -> use mintTweet()
    tweetOwner.address,
    tweetId,
    getTokenURIHash(tweetId)
  );
  await tx.wait();

  tx = await contract.connect(tweetOwner).mintTweet(tweetId);
  await tx.wait();

  return contract.getTokenCount();
}

async function main() {
  const contractName = "TweetToken";
  const { chainId } = network.config;
  const deployedContractAddress = addresses[chainId][contractName][0];
  const [, tweetOwner] = await ethers.getSigners();
  const sampleTweetId = BigInt(1478285768493834240); // using BigInt because number is too big TODO: use ethers.BigNumber?

  const ttt = await ethers.getContractAt(contractName, deployedContractAddress);

  if (await ttt.tweetIdToTokenURI(sampleTweetId)) {
    console.log("Tweet was already minted.");
    if (!isLocalNetwork()) logMarketplaceURL(ttt, sampleTweetId);
    return;
  }
  const tokenCount = await mintTweet(ttt, tweetOwner, sampleTweetId);

  console.log(
    "Token minted successfully! Token counter is:",
    ethers.utils.formatUnits(tokenCount, 0)
  );

  if (!isLocalNetwork()) {
    logMarketplaceURL(ttt, sampleTweetId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

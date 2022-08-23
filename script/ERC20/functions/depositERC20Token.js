const { ethers } = require("ethers");
const ps = require("prompt-sync");
const prompt = ps();
const config = require("../../../config");
const { fetchAbiDataGoerli } = require("../../../utils/fetchAbi");
require("dotenv").config();

const projectID = process.env.INFURA_PROJECT_ID;
const pKey = process.env.PRIVATE_KEY_GOERLI;

const depositERC20Token = async () => {
    try {
        const rootToken = prompt("Enter the address of your Root token: ");
        if (!rootToken) return console.log("Message cannot be null");
        if (rootToken.length !== 42) return console.log(`${rootToken} is not a valid address`);

        const user = prompt("Enther the address of the user who can withdraw the token on child: ");
        if (!user) return console.log("Message cannot be null");
        if (user.length !== 42) return console.log(`${user} is not a valid address`);

        const amount = prompt("Enter the amount of token that you want to deposit: ");
        if (!amount) return console.log("Message cannot be null");
        if (isNumeric(amount) === false) return console.log("Invalid input");

        // Using Infura provider to connect to the goerli chain
        const provider = new ethers.providers.InfuraProvider("goerli", projectID);

        // Initialize your wallet account address as your signer
        // pKey here is your metamask account private key
        const signer = new ethers.Wallet(pKey, provider);

        // Contract address for FxERC20RootTunnel
        const fxERC20RootTunnel_address = config.FxERC20RootTunnel;

        // Fetch your smart contract ABI data from the blockchain
        // Your smart contract must be deployed and verified
        const abiData = await fetchAbiDataGoerli(fxERC20RootTunnel_address);
        const fxERC20RootTunnel_ABI = abiData.result;

        // Get contract for fxERC20RootTunnel
        const fxERC20RootTunnel_contract = new ethers.Contract(
            fxERC20RootTunnel_address,
            fxERC20RootTunnel_ABI,
            provider
        );

        // Connect wallet to contract
        const fxERC20RootTunnel = fxERC20RootTunnel_contract.connect(signer);
        const tx = await fxERC20RootTunnel.deposit(rootToken, user, amount, "");
        await tx.wait();
        const txHash = tx.hash;
        console.log("\nTransaction Hash: ", txHash);
        console.log(`Transaction Details: https://goerli.etherscan.io/tx/${txHash}`);
        return;
    } catch (error) {
        console.log("Error in depositERC20Token", error);
        process.exit(1);
    }
};

module.exports = depositERC20Token;
require("dotenv").config();
const ps = require("prompt-sync");
const prompt = ps();
const { ethers } = require("ethers");
const config = require("../../../config");
const isNumeric = require("../../utils/isNumeric");
const { fetchAbiDataGoerli } = require("../../utils/fetchAbi");

const projectID = process.env.INFURA_PROJECT_ID;
const pKey = process.env.PRIVATE_KEY_GOERLI;

const depositERC20Token = async () => {
    try {
        const rootToken = prompt("Enter the address of your Root token: ");
        if (!rootToken) return console.log("Message cannot be null");
        if (rootToken.length !== 42) return console.log(`${rootToken} is not a valid address`);

        const user = prompt("Enter the address of the user who can withdraw the token on child: ");
        if (!user) return console.log("Message cannot be null");
        if (user.length !== 42) return console.log(`${user} is not a valid address`);

        const amount = prompt("Enter the amount of token that you want to deposit: ");
        if (!amount) return console.log("Message cannot be null");
        if (isNumeric(amount) === false) return console.log("Invalid input");
        const amountInWEI = amount * 1e18;
        console.log("\n-----------------------------------------");
        console.log(`INITIATING TOKEN APPROVAL PROCESS`);
        console.log("-----------------------------------------\n");

        // Using Infura provider to connect to the goerli chain
        const provider = new ethers.providers.InfuraProvider("goerli", projectID);

        // Initialize your wallet account address as your signer
        // pKey here is your metamask account private key
        const signer = new ethers.Wallet(pKey, provider);

        // Contract address for FxERC20RootTunnel
        const fxERC20RootTunnel_address = config.FxERC20RootTunnel;

        // Approve rootToken to be spend by FxERC20RootTunnel contract
        const rootToken_address = rootToken;

        // Fetch your smart contract ABI data from the blockchain
        // Your smart contract must be deployed and verified
        const rootToken_ABIData = await fetchAbiDataGoerli(rootToken_address);
        const rootToken_ABI = rootToken_ABIData.result;

        // Get contract for RootERC20Token
        const rootToken_contract = new ethers.Contract(rootToken_address, rootToken_ABI, provider);

        // Connect wallet to contract
        const rootTokenConnect = rootToken_contract.connect(signer);

        // Call approve function on RootERC20Token contract
        const txApprove = await rootTokenConnect.approve(fxERC20RootTunnel_address, amountInWEI.toString());
        await txApprove.wait();
        const txHashApprove = txApprove.hash;
        console.log("\nTransaction Hash: ", txHashApprove);
        console.log(`Transaction Details: https://goerli.etherscan.io/tx/${txHashApprove}`);
        console.log(`\nTokens approved successfully\n`);

        console.log("\n-----------------------------------------");
        console.log("INITIATING TOKEN DEPOSIT PROCESS");
        console.log("-----------------------------------------\n");

        // Fetch your smart contract ABI data from the blockchain
        // Your smart contract must be deployed and verified
        const fxERC20RootTunnel_ABIData = await fetchAbiDataGoerli(fxERC20RootTunnel_address);
        const fxERC20RootTunnel_ABI = fxERC20RootTunnel_ABIData.result;

        // Get contract for FxERC20RootTunnel
        const fxERC20RootTunnel_contract = new ethers.Contract(
            fxERC20RootTunnel_address,
            fxERC20RootTunnel_ABI,
            provider
        );

        // Connect wallet to contract
        const fxERC20RootTunnel = fxERC20RootTunnel_contract.connect(signer);

        // Call deposit function on FxERC20RootTunnel contract
        const tx = await fxERC20RootTunnel.deposit(rootToken, user, amountInWEI.toString(), 0x0);
        await tx.wait();

        const txHash = tx.hash;
        console.log("\nTransaction Hash: ", txHash);
        console.log(`Transaction Details: https://goerli.etherscan.io/tx/${txHash}`);
        console.log("\nDeposited Successfully!");
        return;
    } catch (error) {
        console.log("Error at depositERC20Token", error);
        process.exit(1);
    }
};

module.exports = depositERC20Token;

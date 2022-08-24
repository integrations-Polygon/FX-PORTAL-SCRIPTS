const ps = require("prompt-sync");
const prompt = ps();
const { ethers } = require("ethers");
const config = require("../../../config");
const receiveMessage = require("./receiveMessage");
const isNumeric = require("../../utils/isNumeric");
const { burnProof } = require("../../utils/burnProof");
const { fetchGasPrice } = require("../../utils/fetchGasPrice");
const { fetchAbiDataPolygon } = require("../../utils/fetchAbi");

require("dotenv").config();

const projectID = process.env.INFURA_PROJECT_ID;
const pKey = process.env.PRIVATE_KEY_POLYGON;
const walletAddress = process.env.PUBLIC_KEY;

const withdrawERC20Token = async () => {
    try {
        const childToken = prompt("Enter the address of your child token: ");
        if (!childToken) return console.log("Message cannot be null");
        if (childToken.length !== 42) return console.log(`${childToken} is not a valid address`);

        const amount = prompt("Enter the amount of token that you want to withdraw: ");
        if (!amount) return console.log("Message cannot be null");
        if (isNumeric(amount) === false) return console.log("Invalid input");
        const amountInWEI = amount * 1e18;

        console.log("\n-----------------------------------------");
        console.log(`INITIATING TOKEN WITHDRAWAL PROCESS`);
        console.log("-----------------------------------------\n");

        // Using Infura provider to connect to the goerli chain
        const provider = new ethers.providers.InfuraProvider("maticmum", projectID);
        const nonce = await provider.getTransactionCount(walletAddress);

        // Initialize your wallet account address as your signer
        // pKey here is your metamask account private key
        const signer = new ethers.Wallet(pKey, provider);

        // Fetch the latest gas price data from the polygon v2 gas station API
        const { maxFee, maxPriorityFee } = await fetchGasPrice();

        // Contract address for fxERC20ChildTunnel
        const fxERC20ChildTunnel_address = config.FxERC20ChildTunnel;

        // Fetch your smart contract ABI data from the blockchain
        // Your smart contract must be deployed and verified
        const abiData = await fetchAbiDataPolygon(fxERC20ChildTunnel_address);
        const fxERC20ChildTunnel_ABI = abiData.result;

        // Get contract for fxERC20ChildTunnel
        const fxERC20ChildTunnel_contract = new ethers.Contract(
            fxERC20ChildTunnel_address,
            fxERC20ChildTunnel_ABI,
            provider
        );

        // Connect wallet to contract
        const fxERC20ChildTunnel = fxERC20ChildTunnel_contract.connect(signer);

        const estimatedGasLimit = await fxERC20ChildTunnel.estimateGas.withdraw(
            childToken,
            amountInWEI.toString(),
            {
                gasLimit: 14_999_999,
                nonce: nonce,
                maxFeePerGas: maxFee,
                maxPriorityFeePerGas: maxPriorityFee,
            }
        );
        const tx = await fxERC20ChildTunnel.withdraw(childToken, amountInWEI.toString(), {
            gasLimit: estimatedGasLimit,
            nonce: nonce,
            maxFeePerGas: maxFee,
            maxPriorityFeePerGas: maxPriorityFee,
        });
        await tx.wait();
        const BURN_HASH = tx.hash;
        console.log("\nTransaction Hash: ", BURN_HASH);
        console.log(`Transaction Details: https://mumbai.polygonscan.com/tx/${BURN_HASH}`);
        console.log("\nToken Withdrawn Successfully!\n");

        console.log("\n-----------------------------------------");
        console.log("GENERATING TRANSACTION BURN PROOF");
        console.log("-----------------------------------------\n");

        const SEND_MESSAGE_EVENT_SIG = config.ERC20_SEND_MESSAGE_EVENT_SIG;
        const proof = await burnProof(BURN_HASH, SEND_MESSAGE_EVENT_SIG);
        console.log("\n Burn proof: ", proof);

        console.log("\n-----------------------------------------");
        console.log("SENDING THE BURN PROOF TO ROOT CHAIN");
        console.log("-----------------------------------------\n");
        await receiveMessage(proof);

        return;
    } catch (error) {
        console.log("Error at withdrawERC20Token", error);
        process.exit(1);
    }
};

module.exports = withdrawERC20Token;

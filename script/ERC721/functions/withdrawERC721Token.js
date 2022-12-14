const ps = require("prompt-sync");
const prompt = ps();
const { ethers } = require("ethers");
const config = require("../../../config");
const isNumeric = require("../../utils/isNumeric");
const { fetchGasPrice } = require("../../utils/fetchGasPrice");
const { fetchAbiDataPolygon } = require("../../utils/fetchAbi");

require("dotenv").config();

const projectID = process.env.INFURA_PROJECT_ID;
const pKey = process.env.PRIVATE_KEY_POLYGON;
const walletAddress = process.env.PUBLIC_KEY;

const withdrawERC721Token = async () => {
    try {
        const childToken = prompt("Enter the address of your child token: ");
        if (!childToken) return console.log("Message cannot be null");
        if (childToken.length !== 42) return console.log(`${childToken} is not a valid address`);

        const tokenID = prompt("Enter the tokenID of token that you want to withdraw: ");
        if (!tokenID) return console.log("Message cannot be null");
        if (isNumeric(tokenID) === false) return console.log("Invalid input");

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

        // Contract address for fxERC721ChildTunnel
        const fxERC721ChildTunnel_address = config.FxERC721ChildTunnel;

        // Fetch your smart contract ABI data from the blockchain
        // Your smart contract must be deployed and verified
        const abiData = await fetchAbiDataPolygon(fxERC721ChildTunnel_address);
        const fxERC721ChildTunnel_ABI = abiData.result;

        // Get contract for fxERC721ChildTunnel
        const fxERC721ChildTunnel_contract = new ethers.Contract(
            fxERC721ChildTunnel_address,
            fxERC721ChildTunnel_ABI,
            provider
        );

        // Connect wallet to contract
        const fxERC721ChildTunnel = fxERC721ChildTunnel_contract.connect(signer);

        const estimatedGasLimit = await fxERC721ChildTunnel.estimateGas.withdraw(
            childToken,
            tokenID.toString(),
            0x0,
            {
                gasLimit: 14_999_999,
                nonce: nonce,
                maxFeePerGas: maxFee,
                maxPriorityFeePerGas: maxPriorityFee,
            }
        );
        const tx = await fxERC721ChildTunnel.withdraw(childToken, tokenID.toString(), 0x0, {
            gasLimit: estimatedGasLimit,
            nonce: nonce,
            maxFeePerGas: maxFee,
            maxPriorityFeePerGas: maxPriorityFee,
        });
        await tx.wait();
        const burnTxHash = tx.hash;
        console.log("\nTransaction Hash: ", burnTxHash);
        console.log(`Transaction Details: https://mumbai.polygonscan.com/tx/${burnTxHash}`);
        console.log("\nToken Withdrawn Successfully!\n");

        return;
    } catch (error) {
        console.log("Error at withdrawERC721Token", error);
        process.exit(1);
    }
};

module.exports = withdrawERC721Token;

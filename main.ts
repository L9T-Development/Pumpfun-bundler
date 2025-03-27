import {
  VersionedTransaction,
  Keypair,
  SystemProgram,
  Transaction,
  Connection,
  ComputeBudgetProgram,
  TransactionInstruction,
  TransactionMessage,
  AddressLookupTableProgram,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { pumpswap } from "./src/pumpswap-idl.json"

import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

import { AnchorProvider } from "@coral-xyz/anchor";

import base58 from "bs58";

import {
  DESCRIPTION,
  DISTRIBUTION_WALLETNUM,
  FILE,
  global_mint,
  JITO_FEE,
  PRIVATE_KEY,
  PUMP_PROGRAM,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  SWAP_AMOUNT,
  TELEGRAM,
  TOKEN_CREATE_ON,
  TOKEN_NAME,
  TOKEN_SHOW_NAME,
  TOKEN_SYMBOL,
  TWITTER,
  WEBSITE,
} from "./constants";

import { saveDataToFile, sleep } from "./utils";

import { createAndSendV0Tx, execute } from "./executor/legacy";

import { PumpFunSDK } from "./src/pumpfun";

import { executeJitoTx } from "./executor/jito";

const commitment = "confirmed";

const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  commitment,
});

const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY));

let kps: Keypair[] = [];
const transactions: VersionedTransaction[] = [];
const mintKp = Keypair.generate();
const mintAddress = mintKp.publicKey;

const sdk = new PumpFunSDK(
  new AnchorProvider(connection, new NodeWallet(mainKp), { commitment })
);

const pumpswap = async () => {
  console.log("Starting pumpswap process...");

  // Define and init token addresses
  const userTokenAddress = getAssociatedTokenAddressSync(
    mintAddress,
    mainKp.publicKey
  );
  console.log("User Token Address: ", userTokenAddress.toBase58());

  // Add new mint token & create an associated token account for the mint
  try {
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: mainKp.publicKey,
        newAccountPubkey: mintAddress,
        lamports: await connection.getMinimumBalanceForRentExemption(82),
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    tx.add(
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mintAddress,
        9,
        mainKp.publicKey,
        mainKp.publicKey
      )
    );

    tx.add(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mintAddress,
        userTokenAddress,
        mainKp.publicKey,
        mainKp.publicKey
      )
    );

    console.log("Sending transaction to create and initialize token...");
    await connection.sendTransaction(tx, [mainKp, mintKp], {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    console.log("Token and associated account created successfully.");
  } catch (error) {
    console.error("Failed during mint or ATA creation: ", error);
    throw error;
  }

  // Logic for Swapping tokens (placeholder)
  try {
    console.log("Swapping tokens...");
    const swapTx = await sdk.tokenSwapInstructions({
      fromToken: NATIVE_MINT, // Assume native SOL for this swap; substitute as needed
      toToken: mintAddress,
      amount: SWAP_AMOUNT, // Taken from constants
      userPublicKey: mainKp.publicKey,
    });

    console.log("Executing token swap transaction...");
    const swapResult = await createAndSendV0Tx(connection, swapTx, [mainKp]);
    console.log("Swap completed. Transaction hash: ", swapResult);
  } catch (swapError) {
    console.error("Error during token swap: ", swapError);
    throw swapError;
  }

  console.log("Pumpswap process completed!");
};

const main = async () => {
  console.log("Starting main execution...");
  try {
    await pumpswap();
  } catch (err) {
    console.error("Error in the pumpswap main process: ", err);
  }
};

main();

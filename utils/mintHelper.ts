import { allowLists } from "@/allowlist";
import {
  CandyGuard,
  CandyMachine,
  GuardGroup,
  DefaultGuardSet,
  DefaultGuardSetMintArgs,
  getMerkleRoot,
  route,
  getMerkleProof,
  safeFetchAllowListProofFromSeeds,
  mintV1,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  TokenStandard,
  mintArgs,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  some,
  Umi,
  transactionBuilder,
  publicKey,
  PublicKey,
  TransactionBuilder,
  none,
  AddressLookupTableInput,
  Transaction,
  Signer,
  sol,
  BlockhashWithExpiryBlockHeight,
} from "@metaplex-foundation/umi";
import {
  DasApiAssetAndAssetMintLimit,
  DigitalAssetWithTokenAndNftMintLimit,
  GuardReturn,
} from "./checkerHelper";
import { Connection } from "@solana/web3.js";
import {
  setComputeUnitPrice,
  setComputeUnitLimit,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";

export interface GuardButtonList extends GuardReturn {
  header: string;
  mintText: string;
  buttonLabel: string;
  startTime: bigint;
  endTime: bigint;
  tooltip?: string;
}

export const chooseGuardToUse = (
  guard: GuardReturn,
  candyGuard: CandyGuard
) => {
  let guardGroup = candyGuard?.groups.find(
    (item) => item.label === guard.label
  );
  if (guardGroup) {
    return guardGroup;
  }

  if (candyGuard != null) {
    return {
      label: "default",
      guards: candyGuard.guards,
    };
  }

  console.error("No guards defined! No minting possible.");
  return {
    label: "default",
    guards: undefined,
  };
};

export const mintArgsBuilder = (
  guardToUse: GuardGroup<DefaultGuardSet>,
  ownedTokens: DigitalAssetWithTokenAndNftMintLimit[],
  ownedCoreAssets: DasApiAssetAndAssetMintLimit[],
  amount: number
) => {
  const guards = guardToUse.guards;
  let mintArgsArray: Partial<DefaultGuardSetMintArgs>[] = [];
  for (let i = 0; i < amount; i++) {
    let ruleset = undefined;

    let mintArgs: Partial<DefaultGuardSetMintArgs> = {};
    if (guards.allocation.__option === "Some") {
      mintArgs.allocation = some({ id: guards.allocation.value.id });
    }

    if (guards.allowList.__option === "Some") {
      const allowlist = allowLists.get(guardToUse.label);
      if (!allowlist) {
        console.error(`allowlist for guard ${guardToUse.label} not found!`);
      } else {
        mintArgs.allowList = some({ merkleRoot: getMerkleRoot(allowlist) });
      }
    }

    if (guards.assetBurn.__option === "Some") {
      const requiredCollection = guards.assetBurn.value.requiredCollection;
      //TODO: have the use choose the NFT
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection
      );
      if (!nft) {
        console.error("no asset to burn found!");
      } else {
        mintArgs.assetBurn = some({
          asset: nft.publicKey,
          requiredCollection,
        });
      }
    }

    if (guards.assetBurnMulti.__option === "Some") {
      const requiredCollection = guards.assetBurnMulti.value.requiredCollection;
      //TODO: have the use choose the NFT
      const assets = ownedCoreAssets.filter(
        (el) => el.updateAuthority.address === requiredCollection
      );
      if (!assets) {
        console.error("no asset to burn found!");
      } else {
        mintArgs.assetBurnMulti = some({
          assets: assets.map((asset) => asset.publicKey),
          requiredCollection,
        });
      }
    }

    if (guards.assetPayment.__option === "Some") {
      const requiredCollection = guards.assetPayment.value.requiredCollection;
      //TODO: have the use choose the NFT
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection
      );
      if (!nft) {
        console.error("no asset to pay found!");
      } else {
        mintArgs.assetPayment = some({
          asset: nft.publicKey,
          requiredCollection,
          destination: guards.assetPayment.value.destination,
        });
      }
    }

    if (guards.assetPaymentMulti.__option === "Some") {
      const requiredCollection =
        guards.assetPaymentMulti.value.requiredCollection;
      //TODO: have the use choose the NFT
      const assets = ownedCoreAssets.filter(
        (el) => el.updateAuthority.address === requiredCollection
      );
      if (!assets) {
        console.error("no asset to pay found!");
      } else {
        mintArgs.assetPaymentMulti = some({
          assets: assets.map((asset) => asset.publicKey),
          requiredCollection,
          destination: guards.assetPaymentMulti.value.destination,
        });
      }
    }

    if (guards.assetMintLimit.__option === "Some") {
      const requiredCollection = guards.assetMintLimit.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection &&
          el.nftMintLimit! > 0
      );
      if (!nft || !nft.nftMintLimit) {
        console.error("no asset for assetMintLimit found!");
      } else {
        nft.nftMintLimit = nft.nftMintLimit - 1;

        mintArgs.assetMintLimit = some({
          id: guards.assetMintLimit.value.id,
          asset: nft.publicKey,
        });
      }
    }

    if (guards.freezeSolPayment.__option === "Some") {
      mintArgs.freezeSolPayment = some({
        destination: guards.freezeSolPayment.value.destination,
      });
    }

    if (guards.freezeTokenPayment.__option === "Some") {
      mintArgs.freezeTokenPayment = some({
        destinationAta: guards.freezeTokenPayment.value.destinationAta,
        mint: guards.freezeTokenPayment.value.mint,
        nftRuleSet: ruleset,
      });
    }

    if (guards.gatekeeper.__option === "Some") {
      mintArgs.gatekeeper = some({
        expireOnUse: guards.gatekeeper.value.expireOnUse,
        gatekeeperNetwork: guards.gatekeeper.value.gatekeeperNetwork,
      });
    }

    if (guards.mintLimit.__option === "Some") {
      mintArgs.mintLimit = some({ id: guards.mintLimit.value.id });
    }

    if (guards.nftBurn.__option === "Some") {
      const requiredCollection = guards.nftBurn.value.requiredCollection;
      //TODO: have the use choose the NFT
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection
      );
      if (!nft) {
        console.error("no nft to burn found!");
      } else {
        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }
        mintArgs.nftBurn = some({
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.nftGate.__option === "Some") {
      const requiredCollection = guards.nftGate.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection
      );
      if (!nft) {
        console.error("no nft for tokenGate found!");
      } else {
        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }
        mintArgs.nftGate = some({
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.nftMintLimit.__option === "Some") {
      const requiredCollection = guards.nftMintLimit.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection &&
          el.nftMintLimit! > 0
      );
      if (!nft || !nft.nftMintLimit) {
        console.error("no nft for nftMintLimit found!");
      } else {
        nft.nftMintLimit = nft.nftMintLimit - 1;

        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }

        mintArgs.nftMintLimit = some({
          id: guards.nftMintLimit.value.id,
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.nftPayment.__option === "Some") {
      const requiredCollection = guards.nftPayment.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection
      );
      if (!nft) {
        console.error("no nft for nftPayment found!");
      } else {
        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }
        mintArgs.nftPayment = some({
          destination: guards.nftPayment.value.destination,
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.solFixedFee.__option === "Some") {
      mintArgs.solFixedFee = some({
        destination: guards.solFixedFee.value.destination,
      });
    }

    if (guards.solPayment.__option === "Some") {
      mintArgs.solPayment = some({
        destination: guards.solPayment.value.destination,
      });
    }

    if (guards.thirdPartySigner.__option === "Some") {
      console.error("not supported. you need a backend");
    }

    if (guards.token2022Payment.__option === "Some") {
      mintArgs.token2022Payment = some({
        destinationAta: guards.token2022Payment.value.destinationAta,
        mint: guards.token2022Payment.value.mint,
      });
    }

    if (guards.tokenBurn.__option === "Some") {
      mintArgs.tokenBurn = some({ mint: guards.tokenBurn.value.mint });
    }

    if (guards.tokenGate.__option === "Some") {
      mintArgs.tokenGate = some({ mint: guards.tokenGate.value.mint });
    }

    if (guards.tokenPayment.__option === "Some") {
      mintArgs.tokenPayment = some({
        destinationAta: guards.tokenPayment.value.destinationAta,
        mint: guards.tokenPayment.value.mint,
      });
    }
    mintArgsArray.push(mintArgs);
  }
  return mintArgsArray;
};

// build route instruction for allowlist guard
export const routeBuilder = async (
  umi: Umi,
  guardToUse: GuardGroup<DefaultGuardSet>,
  candyMachine: CandyMachine
) => {
  let tx2 = transactionBuilder();

  if (guardToUse.guards.allowList.__option === "Some") {
    const allowlist = allowLists.get(guardToUse.label);
    if (!allowlist) {
      console.error("allowlist not found!");
      return transactionBuilder();
    }
    const allowListProof = await safeFetchAllowListProofFromSeeds(umi, {
      candyGuard: candyMachine.mintAuthority,
      candyMachine: candyMachine.publicKey,
      merkleRoot: getMerkleRoot(allowlist),
      user: publicKey(umi.identity),
    });
    if (allowListProof === null) {
      tx2 = tx2.add(
        route(umi, {
          guard: "allowList",
          candyMachine: candyMachine.publicKey,
          candyGuard: candyMachine.mintAuthority,
          group:
            guardToUse.label === "default" ? none() : some(guardToUse.label),
          routeArgs: {
            path: "proof",
            merkleRoot: getMerkleRoot(allowlist),
            merkleProof: getMerkleProof(allowlist, publicKey(umi.identity)),
          },
        })
      );
    }
    return tx2;
  }
};

// combine transactions. return TransactionBuilder[]
export const combineTransactions = (
  umi: Umi,
  txs: TransactionBuilder[],
  tables: AddressLookupTableInput[]
) => {
  const returnArray: TransactionBuilder[] = [];
  let builder = transactionBuilder();

  // combine as many transactions as possible into one
  for (let i = 0; i <= txs.length - 1; i++) {
    const tx = txs[i];
    let oldBuilder = builder;
    builder = builder.add(tx);

    if (!builder.fitsInOneTransaction(umi)) {
      oldBuilder = oldBuilder.setAddressLookupTables(tables);
      returnArray.push(oldBuilder);
      builder = new TransactionBuilder();
      builder = builder.add(tx);
    }
    if (i === txs.length - 1) {
      returnArray.push(builder);
    }
  }
  return returnArray;
};

export const buildTx = (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  nftMint: Signer,
  guardToUse:
    | GuardGroup<DefaultGuardSet>
    | {
        label: string;
        guards: undefined;
      },
  mintArgs: Partial<DefaultGuardSetMintArgs> | undefined,
  luts: AddressLookupTableInput[],
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  units: number
) => {
  let tx = transactionBuilder().add(
    mintV1(umi, {
      candyMachine: candyMachine.publicKey,
      collection: candyMachine.collectionMint,
      asset: nftMint,
      group: guardToUse.label === "default" ? none() : some(guardToUse.label),
      candyGuard: candyGuard.publicKey,
      mintArgs,
    })
  );

  tx = tx.prepend(setComputeUnitLimit(umi, { units }));
  tx = tx.prepend(
    setComputeUnitPrice(umi, {
      microLamports: parseInt(process.env.NEXT_PUBLIC_MICROLAMPORTS ?? "1001"),
    })
  );
  tx = tx.setAddressLookupTables(luts);
  tx = tx.setBlockhash(latestBlockhash);
  return tx.build(umi);
};

export const buildTxs = async (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  nftMints: Signer[],
  guardToUse:
    | GuardGroup<DefaultGuardSet>
    | {
        label: string;
        guards: undefined;
      },
  mintArgsArray: Partial<DefaultGuardSetMintArgs>[] | undefined,
  luts: AddressLookupTableInput[],
  latestBlockhash: string
) => {
  const newBuilder = transactionBuilder()
    .prepend(setComputeUnitPrice(umi, { microLamports: 5 }))
    .prepend(setComputeUnitLimit(umi, { units: 1400000 }))
    .setBlockhash(latestBlockhash);
  let builder = newBuilder;

  const transactions: { transaction: Transaction; signers: Signer[] }[] = [];
  for (let i = 0; i < nftMints.length; i++) {
    let before = builder;
    let mintArgs = undefined;
    if (mintArgsArray) {
      mintArgs = mintArgsArray[i];
    }
    builder = builder.add(
      mintV1(umi, {
        candyMachine: candyMachine.publicKey,
        collection: candyMachine.collectionMint,
        asset: nftMints[i],
        group: guardToUse.label === "default" ? none() : some(guardToUse.label),
        candyGuard: candyGuard.publicKey,
        mintArgs,
      })
    );
    if (!builder.fitsInOneTransaction(umi)) {
      before = before.setAddressLookupTables(luts);
      const units = await getRequiredCU(umi, before.build(umi));
      let [CU, withoutCU] = before.splitByIndex(1); //remove computeUnitLimit to allow adding it again
      const withCU = withoutCU.prepend(setComputeUnitLimit(umi, { units }));
      transactions.push({
        transaction: withCU.build(umi),
        signers: withCU.getSigners(umi),
      });
      builder = newBuilder;
      i = i - 1;
      continue;
    }
    if (i === nftMints.length - 1) {
      builder = builder.setAddressLookupTables(luts);
      const units = await getRequiredCU(umi, builder.build(umi));
      let [CU, withoutCU] = builder.splitByIndex(1); //remove computeUnitLimit to allow adding it again
      const withCU = withoutCU.prepend(setComputeUnitLimit(umi, { units }));
      transactions.push({
        transaction: withCU.build(umi),
        signers: withCU.getSigners(umi),
      });
    }
  }

  return transactions;
};

// simulate CU based on Sammys gist https://gist.github.com/stegaBOB/7c0cdc916db4524dd9c285f9e4309475
export const getRequiredCU = async (umi: Umi, transaction: Transaction) => {
  const defaultCU = 800_000;
  const web3tx = toWeb3JsTransaction(transaction);
  let connection = new Connection(umi.rpc.getEndpoint(), "finalized");
  const simulatedTx = await connection.simulateTransaction(web3tx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });
  if (simulatedTx.value.err || !simulatedTx.value.unitsConsumed) {
    return defaultCU;
  }
  return simulatedTx.value.unitsConsumed + 20_000 || defaultCU;
};

import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useMemo } from "react";
import { UmiProvider } from "../utils/UmiProvider";
import "@/styles/globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ChakraProvider } from "@chakra-ui/react";
import { image, headerText, twitterImage } from "settings";
import { SolanaTimeProvider } from "@/utils/SolanaTimeContext";

export default function App({ Component, pageProps }: AppProps) {
  let endpoint = "https://api.devnet.solana.com";
  if (process.env.NEXT_PUBLIC_RPC) {
    endpoint = process.env.NEXT_PUBLIC_RPC;
  }
  return (
    <>
      <Head>
        <meta property="og:type" content="website" />
        <meta property="og:title" content={headerText} />
        <meta
          property="og:description"
          content="Welcome to the ICE Coin Flip - a high stakes spectacle where every wallet becomes a gambler, and every flip becomes lore"
        />
        <meta property="og:image" content={image} />

        <meta
          name="description"
          content="Welcome to the ICE Coin Flip - a high stakes spectacle where every wallet becomes a gambler, and every flip becomes lore"
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={twitterImage} />
        <meta name="twitter:title" content={headerText} />
        <meta
          name="twitter:description"
          content="Welcome to the ICE Coin Flip - a high stakes spectacle where every wallet becomes a gambler, and every flip becomes lore"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>{headerText}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ChakraProvider>
        <WalletProvider wallets={[]}>
          <UmiProvider endpoint={endpoint}>
            <WalletModalProvider>
              <SolanaTimeProvider>
                <Component {...pageProps} />
              </SolanaTimeProvider>
            </WalletModalProvider>
          </UmiProvider>
        </WalletProvider>
      </ChakraProvider>
    </>
  );
}

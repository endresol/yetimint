import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@metaplex-foundation/umi";
import { Box, Text, Divider, SimpleGrid, VStack } from "@chakra-ui/react";
import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";

interface TraitProps {
  heading: string;
  description: string;
}

interface TraitsProps {
  metadata: JsonMetadata;
}
const Trait = ({ heading, description }: TraitProps) => {
  return (
    <Box
      backgroundColor={"#ebebeb"}
      borderRadius={"5px"}
      width={"120px"}
      minHeight={"50px"}
    >
      <VStack>
        <Text fontSize={"sm"}>{heading}</Text>
        <Text fontSize={"sm"} marginTop={"-2"} fontWeight={"semibold"}>
          {description}
        </Text>
      </VStack>
    </Box>
  );
};

const Traits = ({ metadata }: TraitsProps) => {
  if (metadata === undefined || metadata.attributes === undefined) {
    return <></>;
  }

  //find all attributes with trait_type and value
  const traits = metadata.attributes.filter(
    (a) => a.trait_type !== undefined && a.value !== undefined
  );
  const traitList = traits.map((t) => (
    <Trait
      key={t.trait_type}
      heading={t.trait_type ?? ""}
      description={t.value ?? ""}
    />
  ));

  return (
    <>
      <Divider marginTop={"15px"} />
      <SimpleGrid marginTop={"15px"} columns={3} spacing={5}>
        {traitList}
      </SimpleGrid>
    </>
  );
};

export default function Card({
  metadata,
}: {
  metadata: JsonMetadata | undefined;
}) {
  // Get the images from the metadata if animation_url is present use this
  if (!metadata) {
    return <></>;
  }
  const image = metadata.animation_url ?? metadata.image;

  return (
    <>
      <Box position={"relative"} width={"full"} overflow={"hidden"}>
        <Box
          key={image}
          height={"sm"}
          position="relative"
          backgroundPosition="center"
          backgroundRepeat="no-repeat"
          backgroundSize="cover"
          backgroundImage={`url(${image})`}
        />
        <Text fontWeight={"semibold"} marginTop={"15px"}>
          {metadata.name}
        </Text>
        <Text>{metadata.description}</Text>
        <Traits metadata={metadata} />
      </Box>
    </>
  );
}

type Props = {
  nfts:
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined;
};

export const ShowAnimationCard = () => {
  const coinimage = "/iceflipC.mp4";
  return (
    <AccordionItem key={"MintSuccessAccordion"}>
      <h2>
        <AccordionButton>
          <Box as="span" flex="1" textAlign="left">
            <Text fontWeight={"semibold"}>Mint Success</Text>
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel pb={4}>
        <video width="520" height="240" controls autoPlay preload="none">
          <source src={coinimage} type="video/mp4" />
          Your browser does not support the video tag...
        </video>
      </AccordionPanel>
    </AccordionItem>
  );
};

export const ShowNft = ({ nfts }: Props) => {
  if (nfts === undefined) {
    return <></>;
  }

  const coinimage = "/iceflipC.mp4";

  const cards = nfts.map((nft, index) => (
    <>
      <AccordionItem key={nft.mint + "Accordion"}>
        <h2>
          <AccordionButton>
            <Box as="span" flex="1" textAlign="left">
              {nft.offChainMetadata?.name}
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <Card metadata={nft.offChainMetadata} key={nft.mint} />
        </AccordionPanel>
      </AccordionItem>
    </>
  ));
  return (
    <Accordion defaultIndex={[0]} allowMultiple={false}>
      <ShowAnimationCard />
      {cards}
    </Accordion>
  );
};

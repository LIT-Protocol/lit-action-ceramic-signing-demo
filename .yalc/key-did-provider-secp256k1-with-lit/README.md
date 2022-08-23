# secp256k1 key did provider with Lit Actions x PKP powered by Lit Protocol

This is a `DID` provider which integrated Lit Actions x PKP powered by Lit Protocol for `did:key` using `secp256k1`. It does not support encryption / JWE. It's a fork from [symfoni/key-did-provider-secp256k1](https://github.com/symfoni/key-did-provider-secp256k1) and was designed to be used with [Ceramic Network](https://ceramic.network/).

## What it does?

- Instead of manually providing a `PUBLIC_KEY` to get the `DID` (decentralised identifier), this SDK gets the `PUBLIC_KEY` from the `PKP` NFT

- The `DID` that we got is then passed into a resolver, which would allow us to run methods such as `did.authenticate()`.

- To authenticate, instead of providing a `PRIVATE_KEY` to sign a message to verify the signature from the signed message matches the corresponding `PUBLIC_KEY`, we will ask the Lit nodes, who hold the `PRIVATE_KEY` collectively of the `PKP` NFT, to execute some static Javascript code that is hosted on IPFS and use the output signature to verify.

- So now that `PKP` NFT owns the decentralised identifier `DID`, we can use this `DID` in Ceramic to read & write stream that only this `PKP` NFT owner can do.

## Installation

```
yarn add key-did-provider-secp256k1-with-lit
```

## Usage

```js
import {
  encodeDIDWithLit,
  Secp256k1ProviderWithLit,
} from "key-did-provider-secp256k1-with-lit";

import { CeramicClient } from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { getResolver } from "key-did-resolver";
import { DID } from "dids";

const ceramic = new CeramicClient("https://ceramic-clay.3boxlabs.com");

// -- get your encode did with your PKP public key
const encodedDID = await encodeDIDWithLit({
  pkpPublicKey:
    "30eceb963993d467ca197f3fd9fe3073b8b224ac2c9068d9a9caafcd5e20cf983",
});

// -- static lit action code hosted on https://ipfs.io/ipfs/QmYrfiMf6TDuU3NiTbZANiELNBCyn2f66Zok3gEuzRTYmL
const provider = new Secp256k1ProviderWithLit({
  did: encodedDID,
  ipfsId: "QmYrfiMf6TDuU3NiTbZANiELNBCyn2f66Zok3gEuzRTYmL",
  pkpPublicKey:
    "30eceb963993d467ca197f3fd9fe3073b8b224ac2c9068d9a9caafcd5e20cf983",
});

const did = new DID({ provider, resolver: getResolver() });

// -- authenticate
await did.authenticate();
ceramic.did = did;
console.log("DID:", did);

// -- write to ceramic stream
const doc = await TileDocument.create(ceramic, "Hola hola ¿Cómo estás?");
console.log("Doc/StreamID:", doc.id.toString());

// -- read a ceramic stream
var loadDoc = await TileDocument.load(ceramic, doc.id.toString());
console.log("Specific doc:", loadDoc.content);
```

<!-- ### To upload a new Lit Action code on IPFS

```js
const code = `
    const go = async () => {
        const sigShare = await LitActions.signEcdsa({ toSign, keyId, sigName });
    };
    go();
`;

const ipfsData  = await uploadToIPFS(code);

console("ipfsData:", ipfsData);
``` -->

## License

Apache-2.0 OR MIT

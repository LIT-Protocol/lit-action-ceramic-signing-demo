import logo from "./logo.svg";
import "./App.css";
import {
  encodeDIDWithLit,
  Secp256k1ProviderWithLit,
} from "key-did-provider-secp256k1-with-lit";

import { CeramicClient } from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import { getResolver } from "key-did-resolver";
import { DID } from "dids";

function App() {
  const go = async () => {
    const ceramic = new CeramicClient("https://ceramic-clay.3boxlabs.com");

    const encodedDID = await encodeDIDWithLit();

    const provider = new Secp256k1ProviderWithLit(encodedDID);

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

    // -- update the ceramic stream
    await loadDoc.update("Buon giorno, como stai?");
    console.log("updating doc complete");

    console.log("sleeping for ceramic to have time to update");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // -- read it again and confirm it got wrote
    var loadDocAfter = await TileDocument.load(ceramic, doc.id.toString());
    console.log("updated doc:", loadDocAfter.content);
  };
  return (
    <div className="App">
      <header className="App-header">
        <button onClick={go}>Go</button>
      </header>
    </div>
  );
}

export default App;

import { ES256KSigner, createJWS } from "did-jwt";
import { toGeneralJWS, toJose, toStableObject, sha256, log } from "./util.js";
import { RPCError, createHandler } from "rpc-utils";
import * as u8a from "uint8arrays";
import elliptic from "elliptic";
import LitJsSdk from "lit-js-sdk";
log("LitJsSdk:", LitJsSdk, true);
const EC = elliptic.ec;
const ec = new EC("secp256k1");
export function encodeDID(publicKey) {
    const bytes = new Uint8Array(publicKey.length + 2);
    bytes[0] = 0xe7;
    bytes[1] = 0x01;
    bytes.set(publicKey, 2);
    return `did:key:z${u8a.toString(bytes, "base58btc")}`;
}
const sign = async (payload, did, secretKey, protectedHeader = {}) => {
    const kid = `${did}#${did.split(":")[2]}`;
    const signer = ES256KSigner(secretKey);
    log("signer:", signer);
    const header = toStableObject(Object.assign(protectedHeader, { kid, alg: "ES256K" }));
    return createJWS(typeof payload === "string" ? payload : toStableObject(payload), signer, header);
};
const didMethods = {
    did_authenticate: async ({ did, secretKey }, params) => {
        const response = await sign({
            did,
            aud: params.aud,
            nonce: params.nonce,
            paths: params.paths,
            exp: Math.floor(Date.now() / 1000) + 600,
        }, did, secretKey);
        return toGeneralJWS(response);
    },
    did_createJWS: async ({ did, secretKey }, params) => {
        const requestDid = params.did.split("#")[0];
        if (requestDid !== did)
            throw new RPCError(4100, `Unknown DID: ${did}`);
        const jws = await sign(params.payload, did, secretKey, params.protected);
        return { jws: toGeneralJWS(jws) };
    },
    did_decryptJWE: async () => {
        return { cleartext: "" };
    },
};
export class Secp256k1Provider {
    constructor(seed) {
        const publicKey = ec.keyFromPrivate(seed).getPublic(true, "array");
        const did = encodeDID(Uint8Array.from(publicKey));
        const handler = createHandler(didMethods);
        this._handle = async (msg) => {
            const _handler = await handler({ did, secretKey: seed }, msg);
            return _handler;
        };
    }
    get isDidProvider() {
        return true;
    }
    async send(msg) {
        return await this._handle(msg);
    }
}
const getPKPPublicKey = async () => {
    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: "ethereum" });
    const litNodeClient = new LitJsSdk.LitNodeClient({ litNetwork: "serrano" });
    await litNodeClient.connect();
    const signatures = await litNodeClient.executeJs({
        code: `
        const go = async () => {
          const toSign = [0];
          const sigShare = await LitActions.signEcdsa({ toSign, keyId: 1, sigName: "sig1" });
      };
      go();
    `,
        authSig,
    });
    return signatures.sig1.publicKey;
};
const litActionSignAndGetSignature = async (dataToSign) => {
    log("litActionSignAndGetSignature:", dataToSign);
    if (dataToSign == undefined)
        throw Error("dataToSign cannot be empty");
    const DATA_TO_SIGN_IN_STRING = Array.from(dataToSign).toString();
    const litCode = `
    const go = async () => {

        // this is the string "${dataToSign}" for testing
        const toSign = [${DATA_TO_SIGN_IN_STRING}];
        // this requests a signature share from the Lit Node
        // the signature share will be automatically returned in the HTTP response from the node
        const sigShare = await LitActions.signEcdsa({ toSign, keyId: 1, sigName: "sig1" });
    };

    go();
  `;
    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain: "ethereum" });
    const litNodeClient = new LitJsSdk.LitNodeClient({ litNetwork: "serrano" });
    await litNodeClient.connect();
    const signatures = await litNodeClient.executeJs({
        code: litCode,
        authSig,
    });
    return signatures;
};
export async function encodeDIDWithLit() {
    const PKP_PUBLIC_KEY = await getPKPPublicKey();
    log("[encodeDIDWithLit] PKP_PUBLIC_KEY:", PKP_PUBLIC_KEY);
    const pubBytes = ec
        .keyFromPublic(PKP_PUBLIC_KEY, "hex")
        .getPublic(true, "array");
    log("[encodeDIDWithLit] pubBytes:", pubBytes);
    const bytes = new Uint8Array(pubBytes.length + 2);
    bytes[0] = 0xe7;
    bytes[1] = 0x01;
    bytes.set(pubBytes, 2);
    log("[encodeDIDWithLit] bytes:", bytes);
    const did = `did:key:z${u8a.toString(bytes, "base58btc")}`;
    log(`[encodeDIDWithLit] did:`, did);
    return did;
}
export function ES256KSignerWithLit() {
    const recoverable = false;
    return async (data) => {
        log("ES256KSignerWithLit:", sha256(data));
        const signature = (await litActionSignAndGetSignature(sha256(data))).sig1;
        log("ES256KSignerWithLit signature:", signature);
        return toJose({
            r: signature.r,
            s: signature.s,
            recoveryParam: signature.recid,
        }, recoverable);
    };
}
const signWithLit = async (payload, did, protectedHeader = {}) => {
    log("[signWithLit] did:", did);
    const kid = `${did}#${did.split(":")[2]}`;
    log("[signWithLit] kid:", kid);
    const signer = ES256KSignerWithLit();
    log("[signWithLit] signer:", signer);
    const header = toStableObject(Object.assign(protectedHeader, { kid, alg: "ES256K" }));
    log("[signWithLit] header:", header);
    log("[signWithLit] payload:", payload);
    return createJWS(typeof payload === "string" ? payload : toStableObject(payload), signer, header);
};
const didMethodsWithLit = {
    did_authenticate: async ({ did }, params) => {
        const response = await signWithLit({
            did,
            aud: params.aud,
            nonce: params.nonce,
            paths: params.paths,
            exp: Math.floor(Date.now() / 1000) + 600,
        }, did);
        log("[didMethodsWithLit] response:", response);
        const general = toGeneralJWS(response);
        log("[didMethodsWithLit] general:", general);
        return general;
    },
    did_createJWS: async ({ did }, params) => {
        const requestDid = params.did.split("#")[0];
        if (requestDid !== did)
            throw new RPCError(4100, `Unknown DID: ${did}`);
        const jws = await signWithLit(params.payload, did, params.protected);
        log("[did_createJWS] jws:", jws);
        return { jws: toGeneralJWS(jws) };
    },
    did_decryptJWE: async () => {
        return { cleartext: "" };
    },
};
export class Secp256k1ProviderWithLit {
    constructor(did) {
        const handler = createHandler(didMethodsWithLit);
        this._handle = async (msg) => {
            log("[Secp256k1ProviderWithLit] this._handle(msg):", msg);
            const _handler = await handler({ did }, msg);
            return _handler;
        };
    }
    get isDidProvider() {
        return true;
    }
    async send(msg) {
        return await this._handle(msg);
    }
}
//# sourceMappingURL=index.js.map
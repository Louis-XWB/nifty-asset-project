import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    TransactionBuilderSendAndConfirmOptions,
    keypairIdentity,
    generateSigner,
    sol
} from '@metaplex-foundation/umi';
import {
    DelegateRole,
    approve,
    attributes,
    creators,
    delegateInput,
    grouping,
    lock,
    mint,
    niftyAsset,
    revoke,
    royalties,
    transfer,
    unlock,
    verify
} from '@nifty-oss/asset';
import { Keypair, PublicKey, Signer } from '@solana/web3.js';
import {  Keypair as UmiKeypair } from '@metaplex-foundation/umi';
import { Keypair as SolanaKeypair, PublicKey as SolanaPublicKey } from '@solana/web3.js';


// Helper function to convert Solana Keypair to Umi Keypair
function convertToUmiKeypair(solanaKeypair: SolanaKeypair): UmiKeypair {
    return {
        publicKey: solanaKeypair.publicKey.toString(),
        secretKey: solanaKeypair.secretKey,
    } as UmiKeypair;
}


// 1. 修改为 Eclipse Devnet 的 RPC URL
const umi = createUmi('https://staging-rpc.dev2.eclipsenetwork.xyz', { commitment: 'processed' }).use(niftyAsset());

// 2. 使用现有钱包
const existingPrivateKey = Uint8Array.from([/* 填入你的钱包私钥数组 */]); // 替换为你的私钥数组
const existingKeypair = Keypair.fromSecretKey(existingPrivateKey);

const creator = existingKeypair;
const owner = generateSigner(umi);
const asset = generateSigner(umi);
const groupAsset = generateSigner(umi);
const delegate = generateSigner(umi);

// Create Solana Keypair
const solanaKeypair = SolanaKeypair.generate();

// Convert Solana Keypair to Umi Keypair
const umiKeypair = convertToUmiKeypair(solanaKeypair);

// Use the converted Umi Keypair
umi.use(keypairIdentity(umiKeypair));

const options: TransactionBuilderSendAndConfirmOptions = {
    confirm: { commitment: 'processed' }
};

async function airdropFunds() {
    try {
        // 注意：Eclipse Devnet 上可能无法使用 airdrop 功能，因此需要确认是否支持。
        await umi.rpc.airdrop(creator.publicKey, sol(100), options.confirm);
        await umi.rpc.airdrop(owner.publicKey, sol(100), options.confirm);
        await umi.rpc.airdrop(delegate.publicKey, sol(100), options.confirm);
        console.log(`1. ✅ - Airdropped 100 SOL to the ${creator.publicKey.toString()}`);
    } catch (error) {
        console.error('1. ❌ - Error airdropping SOL to the wallet.', error);
    }
}

async function mintGroupAsset() {
    try {
        await mint(umi, {
            asset: groupAsset,
            payer: umi.identity,
            name: 'Group',
            extensions: [
                grouping(10),
                creators([{ address: creator.publicKey, share: 100 }]),
                royalties(5)
            ],
        }).sendAndConfirm(umi, options);

        await verify(umi, {
            asset: groupAsset.publicKey,
            creator,
        }).sendAndConfirm(umi);

        console.log(`2. ✅ - Minted a new Group Asset: ${groupAsset.publicKey.toString()}`);
    } catch (error) {
        console.error('2. ❌ - Error minting a new Group Asset.', error);
    }
}

async function mintAsset() {
    try {
        await mint(umi, {
            asset,
            owner: owner.publicKey,
            authority: creator.publicKey,
            payer: umi.identity,
            group: groupAsset.publicKey,
            name: 'Digital Asset1',
            extensions: [
                attributes([{ name: 'head', value: 'hat' }]),
            ]
        }).sendAndConfirm(umi, options);
        console.log(`3. ✅ - Minted a new Asset: ${asset.publicKey.toString()}`);
    } catch (error) {
        console.error('3. ❌ - Error minting a new NFT.', error);
    }
}

async function approveDelegate() {
    try {
        await approve(umi, {
            asset: asset.publicKey,
            owner,
            delegate: delegate.publicKey,
            delegateInput: delegateInput('Some', {
                roles: [DelegateRole.Lock],
            }),
        }).sendAndConfirm(umi, options);
        console.log(`4. ✅ - Assigned Delegate Lock Authority for the Asset`);
    } catch (error) {
        console.error('4. ❌ - Error assigning Delegate Lock Authority for the Asset.', error);
    }
}

async function lockAsset() {
    try {
        await lock(umi, {
            asset: asset.publicKey,
            signer: delegate,
        }).sendAndConfirm(umi, options);
        console.log(`5. ✅ - Locked the Asset: ${asset.publicKey.toString()}`);
    } catch (error) {
        console.error('5. ❌ - Error locking the Asset.', error);
    }
}

async function tryTransferLockedAsset() {
    try {
        await transfer(umi, {
            asset: asset.publicKey,
            signer: owner,
            recipient: generateSigner(umi).publicKey,
            group: groupAsset.publicKey
        }).sendAndConfirm(umi, options);
        console.log(`6. ❌ - Asset should not have been transferred as it is locked.`);
    } catch (error) {
        console.log('6. ✅ - Asset Cannot be transferred as it is locked.');
    }
}

async function unlockAsset() {
    try {
        await unlock(umi, {
            asset: asset.publicKey,
            signer: delegate,
        }).sendAndConfirm(umi, options);
        console.log(`7. ✅ - Unlocked the Asset: ${asset.publicKey.toString()}`);
    } catch (error) {
        console.error('7. ❌ - Error unlocking the Asset.', error);
    }
}

async function revokeDelegate() {
    try {
        await revoke(umi, {
            asset: asset.publicKey,
            signer: owner,
            delegateInput: delegateInput('Some', {
                roles: [DelegateRole.Lock],
            }),
        }).sendAndConfirm(umi, options);
        console.log(`8. ✅ - Revoked the Delegate Lock Authority for the Asset`);
    } catch (error) {
        console.error('8. ❌ - Error revoking the Delegate Lock Authority for the Asset.', error);
    }
}

async function transferAsset() {
    try {
        await transfer(umi, {
            asset: asset.publicKey,
            signer: owner,
            recipient: generateSigner(umi).publicKey,
            group: groupAsset.publicKey
        }).sendAndConfirm(umi, options);
        console.log(`9. ✅ - Transferred the Asset: ${asset.publicKey.toString()}`);
    } catch (error) {
        console.error('9. ❌ - Error transferring the Asset.', error);
    }
}

async function main() {
    // await airdropFunds();
    await mintGroupAsset();
    // await mintAsset();
    // await approveDelegate();
    // await lockAsset();
    // await tryTransferLockedAsset();
    // await unlockAsset();
    // await revokeDelegate();
    // await transferAsset();
}

main();

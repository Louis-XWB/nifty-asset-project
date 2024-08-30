import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    TransactionBuilderSendAndConfirmOptions,
    generateSigner,
    keypairIdentity,
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

const umi = createUmi('http://127.0.0.1:8899', { commitment: 'processed' }).use(niftyAsset());

const creator = generateSigner(umi);
const owner = generateSigner(umi);
const asset = generateSigner(umi);
const groupAsset = generateSigner(umi);
const delegate = generateSigner(umi);

umi.use(keypairIdentity(creator));

const options: TransactionBuilderSendAndConfirmOptions = {
    confirm: { commitment: 'processed' }
};

async function airdropFunds() {
    try {
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
    await airdropFunds();
    await mintGroupAsset();
    await mintAsset();
    await approveDelegate();
    await lockAsset();
    await tryTransferLockedAsset();
    await unlockAsset();
    await revokeDelegate();
    await transferAsset();
}

main();
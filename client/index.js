const web3 = require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const BN = require('bn.js');

const decimals = 9;
//npm run build:program-rust
// solana program deploy /Users/book/work/code/blockchain/solana/cource/basic/one/example-helloworld/dist/program/helloworld.so
// Program Id: 7AkztiGFgSGxruwv6jpZ9ZzndFvz73QLyRgKGET2RTKr
const programId = new web3.PublicKey("11");
const seed = 'last_homework';
//官方写死的地址
//token_programId的地址
const token_programId = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
//调用创建关联账号或者指令的时候需要用到的地址
const associated_token_programId = new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const sys = new web3.PublicKey('11111111111111111111111111111111');
//The Rent sysvar contains the rental rate. Currently, the rate is static and set in genesis. 
//The Rent burn percentage is modified by manual feature activation
const rent = new web3.PublicKey('SysvarRent111111111111111111111111111111111');



(async () => {
    // 1.连接solana connect to cluter
    //'https://api.devnet.solana.com', 
    const connection = new web3.Connection(
        'http://localhost:8899', 
        'confirmed'
    );

    // 创建钱包
    // generate a new wallet keypair and airdrop SOL
    const fromWallet = web3.Keypair.generate();
    console.log("fromWallet: ->", fromWallet.publicKey.toBase58());
    const fromAirdropSignature = await connection.requestAirdrop(
        fromWallet.publicKey, 
        web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(fromAirdropSignature);

    //Generate a new wallet to receive newly minted token
    const toWallet = web3.Keypair.generate();
    console.log("fromWallet: ->", toWallet.publicKey.toBase58());
    const toAirdropSignature = await connection.requestAirdrop(
        toWallet.publicKey, 
        web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(toAirdropSignature);

    // 给fromWallet创建一个新的token mint 也就是创建币
    // create new token mint
    const mint = await splToken.Token.createMint(
        connection,
        fromWallet, 
        fromWallet.publicKey, 
        null,
        decimals, 
        splToken.TOKEN_PROGRAM_ID
    );
    console.log("spl-token publickey:->", mint.publicKey.toBase58());

    // 创建fromWallet钱包的关联账号
    // get the token account of the fromWallet Solana address, if it does not exist, create it
    const fromTokenAccout = await mint.getOrCreateAssociatedAccountInfo(
        fromWallet.publicKey
    );
    console.log("fromTokenAccout: ->", fromTokenAccout.address.toBase58());

    // 创建toWallet钱包的关联账号
    // get the token account of the toWallet Solana address, if it does not exist, create it
     const toTokenAccount = await splTokenMint.getOrCreateAssociatedAccountInfo(
         toWallet.publicKey
    );
    console.log("toTokenAccount:->", toTokenAccount.address.toBase58());

    //program derived address 
    // 找一个不在加密曲线上的地址
    // programId的派生地址，没有私钥，使用seed nonce签名
    var [programId_derived_pubkey, nonce] = await web3.PublicKey.findProgramAddress(
        [Buffer.from(seed)],
        programId
    )
    console.log("programId_derived_pubkey:->", programId_derived_pubkey.toBase58());

    // 假如刚才创建的币叫AAA ; program 生产一个地址programId_derived_address(用来签名的) -> programId_derived_address + mint(AAA) = programId_derived_address ada
    // 生成programId_derived_pubkey对于mint币的关联地址
    // get the token account of the program solana address, if it does not exist, create it
    // Get program currency ada, not on the chain
    // 创建programId(programId_derived_pubkey地址)的关联账号 //还没在链上
    var programId_associated_address = await splToken.Token.getAssociatedTokenAddress(
        associated_token_programId,
        token_programId,
        mint.publicKey,
        programId_derived_pubkey,
        true
    ); //生成一个没有私钥地址的关联账号；
    console.log("programId_associated_address: ->", programId_associated_address.toBase58())

    //用户怎么在program中进行数据储存呢， 不能在用户的币关联账号中进行存储(不能让program去操作储存数据在这个账号)，
    // 里面存了spl-token的信息，有字符限制
    // 我们需要新建和用户和program都有关联的账号进行数据存储
    // get the token account of the user_derived address, if it does not exist, create it
    // User derived address
    // 生成用户toWallet的派生地址，地址还没上链
    var user_derived_pubkey = await web3.PublicKey.createWithSeed(
        toWallet.publicKey,
        seed,
        programId
    );
    console.log("user_derived_pubkey:->", user_derived_pubkey.toBase58());

    //需要为user_derived_pubkey地址生成链上账号
    //create an account for the user derived address
    //获取存储8个字节最低的lamports
    const lamports = await connection.getMinimumBalanceForRentExemption(
        8
    );
    const transation_create_user_derived_account = new web3.Transaction().add(
        web3.SystemProgram.createAccountWithSeed({
            basePubkey: toWallet.publicKey, //说明付钱
            fromPubkey: toWallet.publicKey, //说明谁产生的
            lamports, //最低租金
            newAccountPubkey: user_derived_pubkey, //给这个地址创建的账号
            programId, //这个账号的拥有着，也就是programId这个程序
            seed,
            space: 8,
        })
    );
    var signature =await web3.sendAndConfirmTransaction(
        connection, 
        transation_create_user_derived_account, 
        [toWallet],
        {commitment: 'confirmed'},
    );
    console.log("SIGNATURE:", signature);
    console.log("transation_create_user_derived_account success");
    //用户派生地址生成和成功上链 

    // 征发 给fromTokenAccount征发100个token
    // minting 100 new token to the "fromTokenAccount" account we just retured/created
    await mint.mintTo(
        fromTokenAccout.address,
        fromWallet.publicKey,
        [],
        100 * (10 ** decimals)
    );

    // 转账fromTokenAccout 给 fromWallet转账10token
    // Add token transfer instructions to transaction
    var transaction = new web3.Transaction().add(
        splToken.Token.createTransferInstruction(
            splToken.LAMPORTS_PER_SOL,
            fromTokenAccout.address,
            toTokenAccount.address,
            fromWallet.publicKey,
            [],
            10 * (10 ** decimals)
        ),
    );

    // sign transation, broadcast, and confirm
    var signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [fromWallet],
        { commitment: 'confirmed'},
    );
    console.log("SIGNATURE:", signature);

    // program -> program derived address + mint = ada
    // create the currency ada of the program derived address
    // program derived address币关联账号的创建 //programId_associated_address
    const instruction_create_program_ada = new web3.TransactionInstruction({
        keys: [
            { pubkey: toWallet.publicKey, isSigner: true, isWritable: false },
            { pubkey: programId_derived_pubkey, isSigner: false, isWritable: true },
            { pubkey: programId_associated_address, isSigner: false, isWritable: true },
            { pubkey: mint.publicKey, isSigner: false, isWritable: false },
            { pubkey: token_programId, isSigner: false, isWritable: false },
            { pubkey: associated_token_programId, isSigner: false, isWritable: false },
            { pubkey: sys, isSigner: false, isWritable: false },
            { pubkey: rent, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(Uint8Array.of(2)), // all the instruction are hellos
    });
    var transaction = new web3.transaction().add(
        instruction_create_program_ada
    );
    var signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [fromWallet],
        { commitment: 'confirmed' }
    );
    console.log("SIGNATURE:", signature);

    //toWallet deposit 3 mint to program
    var num = 3 * (10 ** decimals);
    let indexData = [];
    //数组小端系列化
    for (const _value of new BN(num).toArray('le', 8)){
        indexData.push(_value)
    }
    console.log(indexData);

    const instruction = new web3.TransactionInstruction({
        keys: [
            { pubkey: toWallet.publicKey, isSigner: true, isWritable: false },
            { pubkey: toTokenAccount.address, isSigner: false, isWritable: true },
            { pubkey: user_derived_pubkey, isSigner: false, isWritable: true },
            { pubkey: programId_associated_address, isSigner: false, isWritable: true },
            { pubkey: token_programId, isSigner: false, isWritable: false },
            { pubkey: mint.publicKey, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(Uint8Array.of(0, ...indexData)),//解构
    });
    var deposit_transation = new web3.transaction().add(
        instruction
    );
    var signature = await web3.sendAndConfirmTransaction(
        connection,
        deposit_transation,
        [toWallet],
        { commitment: 'confirmed'}
    );
    console.log("SIGNATURE:", signature);

    //toWallet withdraw all deposits
    const instruction_claim = new web3.TransactionInstruction({
        keys: [
            { pubkey: toWallet.publicKey, isSigner: true, isWritable: false },
            { pubkey: toTokenAccount.address, isSigner: false, isWritable: true },
            { pubkey: user_derived_pubkey, isSigner: false, isWritable: true },
            { pubkey: programId_derived_pubkey, isSigner: false, isWritable: false },
            { pubkey: programId_associated_address, isSigner: false, isWritable: true },
            { pubkey: token_programId, isSigner: false, isWritable: false },
            { pubkey: mint.publicKey, isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.from(Uint8Array.of(1, nonce)),
    })
    var deposit_transation = new web3.Transaction().add(
        instruction_claim
    );
    var signature = await web3.sendAndConfirmTransaction(
        connection,
        deposit_transation,
        [toWallet],
        { commitment: 'confirmed' },
    )
    console.log("SIGNATURE:", signature);

    console.log("solana hub");
})();



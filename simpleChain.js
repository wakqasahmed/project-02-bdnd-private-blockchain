/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* Configure your application to use levelDB to persist blockchain dataset. */
const LevelSandbox = require('./levelDB.js');

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
    this.chain = new LevelSandbox.LevelSandbox();
    this.genesisBlock();
  }

  async genesisBlock(){
    this.chain.getBlockHeight().then((blockHeight) => {

      if(blockHeight === -1){
        this.addBlock(new Block("First block in the chain - Genesis block")).then(() => {
          // console.log("Genesis block created successfully");
        });
      }      

    });
  }

  // Add new block
  async addBlock(newBlock){
    // Block height
    let currentBlockHeight = await this.chain.getBlockHeight();
    newBlock.height = currentBlockHeight + 1;

    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);

    // console.log("Current Block Height: " + currentBlockHeight);

    // previous block hash
    if(currentBlockHeight > -1){
      let currentBlock = await this.getBlock(currentBlockHeight);
      newBlock.previousBlockHash = currentBlock.hash;
    }
    // Block hash with SHA256 using newBlock and converting to a string
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    
    // Adding block to level db
    await this.chain.addLevelDBData(newBlock.height, JSON.stringify(newBlock));
  }

  // Get block height
  async getBlockHeight(){
      return this.chain.getBlockHeight();
    }

    // get block
  async getBlock(blockHeight){
      // return object as a single string
      let block = await this.chain.getLevelDBData(blockHeight);      

      // console.log(JSON.parse(block).hash);
      return JSON.parse(block);
    }

    // validate block
  async validateBlock(blockHeight){
      // get block object
      let block = await this.getBlock(blockHeight);
      // get block hash
      let blockHash = block.hash;
      // remove block hash to test block integrity
      block.hash = '';
      // generate block hash
      let validBlockHash = SHA256(JSON.stringify(block)).toString();
      // Compare
      if (blockHash===validBlockHash) {
          return true;
        } else {
          console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
          return false;
        }
    }

   // Validate blockchain
  async validateChain(){
      let errorLog = [];
      let blockHeight = await this.chain.getBlockHeight();

      for (var i = 0; i < blockHeight-1; i++) {
        // validate block
        let isValidBlock = await this.validateBlock(i);
                
        if (!isValidBlock){
          errorLog.push(i);
        }

        // compare blocks hash link
        let currentBlock = await this.getBlock(i);
        let nextBlock = await this.getBlock(i+1);

        let blockHash = currentBlock.hash;
        let previousHash = nextBlock.previousBlockHash;

        if (blockHash!==previousHash) {
          errorLog.push(i);
        }
      }

      if (errorLog.length>0) {
        console.log('Block errors = ' + errorLog.length);
        console.log('Blocks: '+errorLog);
      } else {
        console.log('No errors detected');
      }
    }
}


/* ===== Testing ==============================================================|
|  - Self-invoking function to add blocks to chain                             |
|  - Learn more:                                                               |
|   https://scottiestech.info/2014/07/01/javascript-fun-looping-with-a-delay/  |
|                                                                              |
|  * 100 Milliseconds loop = 36,000 blocks per hour                            |
|     (13.89 hours for 500,000 blocks)                                         |
|    Bitcoin blockchain adds 8640 blocks per day                               |
|     ( new block every 10 minutes )                                           |
|  ===========================================================================*/

let blockchain = new Blockchain();

(function theLoop (i) {
  setTimeout(function () {
    let self = this;
    blockchain.addBlock(new Block('Testing data')).then(() => {
      if (--i) theLoop(i);
    });
  }, 100);
})(10);

setTimeout(function() {
  blockchain.validateBlock(5).then((isValid) => {
    //console.log(isValid);
    //console.log("Is Block with Height 5 Valid? " + isValid);
  });
}, 1100);

setTimeout(function() {
  blockchain.validateChain()
}, 2500);
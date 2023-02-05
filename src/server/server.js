import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

const NUMBER_OF_ORACLES = 10;
let oracles = [];

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const ALL_CODES = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, 
  STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];

let indexes;

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

web3.eth.getAccounts((error, accounts) => {
  if (error) { 
    console.log("Error on getAccounts: " + error);
    return;
  }

  for(let i = 0; i < NUMBER_OF_ORACLES; i++) {
    console.log("Registre Oracle number: " + (i + 1));
    let oracleAddress = accounts[i];
    registerOracle(oracleAddress);
  }
});

function registerOracle(oracleAddress) {
  console.log("Reistring Oracle with address : " + oracleAddress );
  flightSuretyApp.methods
  .registerOracle()
  .send({from: oracleAddress, value: Web3.utils.toWei('0.1', 'ether'), gas: 1000000}, (error, result) => {
    if (error) { 
      console.log(`[Oracle: ${oracleAddress}] Error on registerOracle: ${error}`);
      throw error;
    }
    console.log(`[Oracle: ${oracleAddress}] Success on registerOracle.`);
    
    flightSuretyApp.methods
    .getMyIndexes()
    .call({from: oracleAddress}, (error, result) => {
      if (error) { 
        console.log(`[Oracle: ${oracleAddress}] Error on getMyIndexes: ${error}`);
        return;
      }
      console.log(`[Oracle: ${oracleAddress}] Recieve indexes: ${result}`);
      oracles.push({address: oracleAddress, indexes: result});
    });
  });
}

flightSuretyApp.events.OracleRequest({
  fromBlock: 'latest'
}, (error, event) => {
  if (error) { 
    console.log("Error on OracleRequest: " + error);
    return;
  }
  
  let requestValues = event.returnValues;
  let airline = requestValues.airline;
  let flight = requestValues.flight;
  let timestamp = requestValues.timestamp;
  let index = requestValues.index;
  console.log(`Request recieved for:
    airline: ${airline}
    flight: ${flight}
    timestamp: ${timestamp}
    index: ${index}`);

    oracles.filter(oracle => oracle.indexes.includes(index)).
    forEach(oracle => {
      let currentOracleAddress = oracle.address;

      const random = Math.floor(Math.random() * ALL_CODES.length);
      const returningStatusCode = ALL_CODES[random];
  
      console.log(`[Oracle: ${currentOracleAddress}] Returning status code: ${returningStatusCode}`);
  
      flightSuretyApp.methods
      .submitOracleResponse(index, airline, flight, timestamp, returningStatusCode)
      .send({from: currentOracleAddress}, (error, result) => {
        if (error) { 
          console.log(`[Oracle: ${currentOracleAddress}] Error on submitOracleResponse: ${error}`);
          return;
        }
        console.log(`[Oracle: ${currentOracleAddress}] Success on submitOracleResponse with status code: ${returningStatusCode}.`);
      });
    });
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;



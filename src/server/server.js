import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const ALL_CODES = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, 
  STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];

let indexes = [];


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.getAccounts((error, accounts) => {
  if (error) { 
    console.log("Error on getAccounts: " + error);
    return;
  }
  web3.eth.defaultAccount = accounts[0];
  registerOracle();
});

let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

function registerOracle() {
  console.log("web3.eth.defaultAccount : " + web3.eth.defaultAccount );
  flightSuretyApp.methods
  .registerOracle()
  .send({from: web3.eth.defaultAccount, value: Web3.utils.toWei('0.1', 'ether'), gas: 1000000}, (error, result) => {
    if (error) { 
      console.log("Error on registerOracle: " + error);
      return;
    }
    console.log("Success on registerOracle.");
    
    flightSuretyApp.methods
    .getMyIndexes()
    .call({from: web3.eth.defaultAccount}, (error, result) => {
      if (error) { 
        console.log("Error on getMyIndexes: " + error);
        return;
      }
      console.log("Recieve indexes:" + result);
      indexes = result;
    });
  });
}

flightSuretyApp.events.OracleRequest({
  fromBlock: 'latest'
}, (error, event) => {
  if (error) { 
    console.log("Error: " + error);
    return;
  }
  
  let requestValues = event.returnValues;
  console.log("Request recieved for: " + JSON.stringify(requestValues));

  const random = Math.floor(Math.random() * ALL_CODES.length);
  const returningStatusCode = ALL_CODES[random];

  console.log("Returning status code: " + returningStatusCode);

  flightSuretyApp.methods
  .submitOracleResponse(requestValues.index, requestValues.airline, requestValues.flight, requestValues.timestamp, returningStatusCode)
  .send({from: web3.eth.defaultAccount}, (error, result) => {
    if (error) { 
      console.log("Error on submitOracleResponse: " + error);
      return;
    }
    console.log("Success on submitOracleResponse.");
  });
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;



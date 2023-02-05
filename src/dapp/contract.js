import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import DOM from './dom';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];

        this.web3Ws = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyAppWs = new this.web3Ws.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyAppWs.events.OracleReport({fromBlock: 'latest'}, (error, result) => this.onOracleReport(error, result, this));
        this.flightSuretyAppWs.events.FlightStatusInfo({fromBlock: 'latest'}, (error, result) => this.onFlightStatusInfo(error, result, this));
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(airlineAddress, flight, callback) {
        let self = this;
        let payload = {
            airline: airlineAddress,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(airlineAddress, flight, ammount, callback) {
        let self = this;
        let payload = {
            airlineAddress: airlineAddress,
            flightNumber: flight
        }
        const weiAmmount = Web3.utils.toWei(ammount, 'ether');
        self.flightSuretyApp.methods
            .buy(payload.airlineAddress, payload.flightNumber)
            .send({ from: self.owner, value: weiAmmount}, (error, result) => {
                callback(error, payload);
            });
    }

    pay(airlineAddress, flight, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .pay(airlineAddress, flight)
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    onOracleReport(error, event, self) {
        if (error) { 
            console.log("Error on OracleReport: " + error);
            return;
        }
        let requestValues = event.returnValues;
        let airline = requestValues.airline;
        let flight = requestValues.flight;
        let timestamp = requestValues.timestamp;
        let statusCode = requestValues.status;

        console.log(`OracleReport recieved for:
            airline: ${airline}
            flight: ${flight}
            timestamp: ${timestamp}
            statusCode: ${statusCode}`);

        let allFlights = DOM.selAll('#display-wrapper .row .field-value');

        allFlights.filter(flightRow => flightRow.innerHTML === `${flight} ${timestamp}`).forEach(flightRow => {
            flightRow.parentElement.parentElement.appendChild(self.createStatusRow("Intermediate Status", statusCode, false));
        });

    }

    onFlightStatusInfo(error, event, self) {
        if (error) { 
            console.log("Error on FlightStatusInfo: " + error);
            return;
        }
        let requestValues = event.returnValues;
        let airline = requestValues.airline;
        let flight = requestValues.flight;
        let timestamp = requestValues.timestamp;
        let statusCode = requestValues.status;

        console.log(`FlightStatusInfo recieved for:
            airline: ${airline}
            flight: ${flight}
            timestamp: ${timestamp}
            statusCode: ${statusCode}`);

        let allFlights = DOM.selAll('#display-wrapper .row .field-value');

        allFlights.filter(flightRow => flightRow.innerHTML === `${flight} ${timestamp}`).forEach(flightRow => {
            flightRow.parentElement.parentElement.appendChild(self.createStatusRow("Final Status", statusCode, true));
        });
    }

    createStatusRow(title, statusCode, isFinal) {
        let statusCell = DOM.div(title);
        statusCell.classList.add("col-sm-4");
        let statusValCell = DOM.div(this.getLableForStatusCode(statusCode));
        statusValCell.classList.add("col-sm-8");
        let newRow = DOM.div([statusCell, statusValCell]);
        newRow.classList.add("row")
        if(isFinal) {
            newRow.classList.add("final-status");
        }

        return newRow;
    }

    getLableForStatusCode(statusCode) {
        switch(statusCode) {
            case "0":
                return "Unknown";
            case "10":
                return "On Time";
            case "20":
                return "Late: Airline";
            case "30":
                return "Lete: Weather";
            case "40":
                return "Lete: Technical";
            case "50":
                return "Lete: Other";
            default:
                return "Unknown Status Code";
        }
    }
}
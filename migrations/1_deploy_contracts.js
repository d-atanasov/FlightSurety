const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');
var Web3 = require('web3');

module.exports = function(deployer) {

    let firstAirline = '0x6bbf1eC0335B725bA46e3e7EEaFcCF45C34833c9';
    let secondAirline = '0x72468BAB7d2eE613EF8a7761f13338c16e350e77';
    deployer.deploy(FlightSuretyData)
    .then(() => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(async () => {
                    let config = {
                        localhost: {
                            url: 'http://127.0.0.1:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        },
                        airlines: [
                            {
                                name: "Air 1",
                                address: firstAirline,
                                flights: ["A1-1111", "A1-2222"]
                            },
                            {
                                name: "Air 2",
                                address: secondAirline,
                                flights: ["A2-3333", "A2-4444"]
                            }
                        ]
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');

                    let flightSuretyApp = await FlightSuretyApp.deployed();
                    await flightSuretyApp.registerAirline(firstAirline, {value: Web3.utils.toWei('1', 'ether')});
                    await flightSuretyApp.registerFlight(firstAirline, "A1-1111", {from: firstAirline});
                    await flightSuretyApp.registerFlight(firstAirline, "A1-2222", {from: firstAirline});

                    await flightSuretyApp.registerAirline(secondAirline, {from: firstAirline, value: Web3.utils.toWei('1', 'ether')});
                    await flightSuretyApp.registerFlight(secondAirline, "A2-3333", {from: secondAirline});
                    await flightSuretyApp.registerFlight(secondAirline, "A2-4444", {from: secondAirline});
                });
    });
}
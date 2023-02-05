
import DOM from './dom';
import Contract from './contract';
import Config from './config.json';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    });

    initializeCheckInsurance(contract);

    initializeBuyInsurance(contract);

    initializePayInsurance(contract);
})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}
function initializeCheckInsurance(contract) {
    populateAirlines("check");
    initializeCheckButton(contract);
}

function initializeBuyInsurance(contract) {
    populateAirlines("buy");
    initializeBuyButton(contract);
}

function initializePayInsurance(contract) {
    populateAirlines("pay");
    initializePayButton(contract);
}

function populateAirlines(idPrefix) {
    let airlines = DOM.elid(`${idPrefix}-insurance-airline`);
    Config.airlines.forEach(airline => {
        airlines.appendChild(DOM.option(airline.name));
    });

    airlines.addEventListener("change", () => {
        populateFlights(airlines, idPrefix);
    });

    populateFlights(airlines, idPrefix);
}

function populateFlights(airlines, idPrefix) {
    let flightsSelection = DOM.elid(`${idPrefix}-insurance-flight-number`);
    flightsSelection.innerHTML = '';
    let selectedAirline = Config.airlines.filter(airline => airline.name === airlines.value)[0];
    selectedAirline.flights.forEach(flight => {
        flightsSelection.appendChild(DOM.option(flight));
    });
}

function initializeCheckButton(contract) {
    DOM.elid('submit-oracle').addEventListener('click', () => {
        let selectedAirline = DOM.elid("check-insurance-airline").value;
        let selectedAirlineAddress = Config.airlines.filter(airline => airline.name === selectedAirline)[0].address;
        let selectedFlight = DOM.elid("check-insurance-flight-number").value;

        contract.fetchFlightStatus(selectedAirlineAddress, selectedFlight, (error, result) => {
            display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
        });
    })
}

function initializeBuyButton(contract) {
    DOM.elid("buy-insurance").addEventListener("click", () => {
        let selectedAirline = DOM.elid("buy-insurance-airline").value;
        let selectedAirlineAddress = Config.airlines.filter(airline => airline.name === selectedAirline)[0].address;
        let selectedFlight = DOM.elid("buy-insurance-flight-number").value;
        let selectedAmmount = DOM.elid("buy-insurance-ammount").value;

        contract.buyInsurance(selectedAirlineAddress, selectedFlight, selectedAmmount, (error, result) => {
            let resultDiv = DOM.elid("buy-insurance-result");
            resultDiv.innerHTML = error ? "Error:" + error : "Insurance Purchased.";
        });
    });
}

function initializePayButton(contract) {
    DOM.elid("pay-insurance").addEventListener("click", () => {
        let selectedAirline = DOM.elid("pay-insurance-airline").value;
        let selectedAirlineAddress = Config.airlines.filter(airline => airline.name === selectedAirline)[0].address;
        let selectedFlight = DOM.elid("pay-insurance-flight-number").value;

        contract.pay(selectedAirlineAddress, selectedFlight, (error, result) => {
            let resultDiv = DOM.elid("pay-insurance-result");
            resultDiv.innerHTML = error ? "Error:" + error : `Payment was successful. You recieved: ${result} ETH.`;
        });
    });
}
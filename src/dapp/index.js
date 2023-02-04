
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
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
    
    });

    initializeBuyInsurance(contract);
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

function initializeBuyInsurance(contract) {
    populateAirlines();
    initializeByuButton(contract);
}

function populateAirlines() {
    let airlines = DOM.elid("insurance-airline");
    Config.airlines.forEach(airline => {
        airlines.appendChild(DOM.option(airline.name));
    });

    airlines.addEventListener("change", () => {
        populateFlights(airlines);
    });

    populateFlights(airlines);
}

function populateFlights(airlines) {
    let flightsSelection = DOM.elid("insurance-flight-number");
    flightsSelection.innerHTML = '';
    let selectedAirline = Config.airlines.filter(airline => airline.name === airlines.value)[0];
    selectedAirline.flights.forEach(flight => {
        flightsSelection.appendChild(DOM.option(flight));
    });
}

function initializeByuButton(contract) {
    let buyButton = DOM.elid("buy-insuarnce");
    buyButton.addEventListener("click", () => {
        let selectedAirline = DOM.elid("insurance-airline").value;
        let selectedAirlineAddress = Config.airlines.filter(airline => airline.name === selectedAirline)[0].address;
        let selectedFlight = DOM.elid("insurance-flight-number").value;
        let selectedAmmount = DOM.elid("insurance-ammount").value;

        contract.buyInsurance(selectedAirlineAddress, selectedFlight, selectedAmmount, (error, result) => {
            let resultDiv = DOM.elid("insuarnce-result");
            resultDiv.innerHTML = error ? "Error:" + error : "Insurance Purchased.";
        });
    });
}
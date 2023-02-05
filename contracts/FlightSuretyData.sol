//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/truffle/build/console.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address payable private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;
    mapping(address => bool) private airlines;
    mapping(bytes32 => uint256) private insurances;
    mapping(address => address[]) private airlineRegistrationRequests;
    mapping(address => uint256) private fundingByAirline;

    uint256 private numAirlines = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() {
        contractOwner = payable(msg.sender);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized() {
        require(
            authorizedContracts[msg.sender] == 1,
            "Caller is not authorized"
        );
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(address newAairlineAddress)
        external
        requireIsOperational
        returns (uint256 votes)
    {
        require(!airlines[newAairlineAddress], "Airline is already registered.");
        require(airlines[tx.origin] || numAirlines == 0, "Only existing airlines can register a new one.");


        bool isDuplicate = false;
        for(uint i=0; i < airlineRegistrationRequests[newAairlineAddress].length; i++) {
            if (airlineRegistrationRequests[newAairlineAddress][i] == tx.origin) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Airline was already registred by the current airline caller.");

        airlineRegistrationRequests[newAairlineAddress].push(tx.origin);
        uint256 numberOfVotes = airlineRegistrationRequests[newAairlineAddress].length;

        if (numAirlines < 4 || (numberOfVotes > numAirlines.div(2))) {
            airlines[newAairlineAddress] = true;
            numAirlines++;
            delete airlineRegistrationRequests[newAairlineAddress];
        }

        return numberOfVotes;
    }

    function isAirline(address airlineAddress) external view returns (bool) {
        return airlines[airlineAddress];
    }

    function hasEnoughFunds(address airlineAddress) external view returns (bool) {
        //TODO DA: chnage min ammount to 10
        return fundingByAirline[airlineAddress] >= 1 ether;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(address airlineAddress, string memory flightNumber)
        external
        payable
        requireIsOperational
    {
        require(msg.value > 0 ether, "Some value should be sent to buy an insurance.");
        require(msg.value <= 1 ether, "Max insurance ammount is 1 ether.");
        insurances[getInsuranceKey(tx.origin, airlineAddress, flightNumber)] = msg.value;
        contractOwner.transfer(msg.value);
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay(address airlineAddress, string memory flightNumber) external requireIsOperational {
        bytes32 insuranceKey = getInsuranceKey(tx.origin, airlineAddress, flightNumber);
        uint256 prev = insurances[insuranceKey];
        delete insurances[insuranceKey];
        payable(tx.origin).transfer(prev.mul(15).div(10));
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund(address airlineAddress) public payable requireIsOperational {
        fundingByAirline[airlineAddress] = fundingByAirline[airlineAddress].add(msg.value);
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function getInsuranceKey(
        address passenger,
        address airline,
        string memory flight
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(passenger, airline, flight));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    fallback() external payable {
        fund(tx.origin);
    }

    receive() external payable {
        fund(tx.origin);
    }
}

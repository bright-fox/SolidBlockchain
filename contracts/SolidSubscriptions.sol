pragma solidity >=0.4.22 <0.7.0;

contract SolidSubscriptions {
    
    SolidOracle oracle;
    
    constructor(address _t) public {
        oracle = SolidOracle(_t);
    }

    struct offer{
        string uri; 
        uint256 price; 
        uint256 duration; 
    }
    
    struct subscription{
        uint256 balance;
        uint256 endTime; 
        bool accepted; 
    }
    
    //declare changed access info event
    event newSubscription(string uri, string webId);
    
    mapping(string => offer) offers;  // uri -> offer
    
    mapping(string => mapping(string => subscription))subscriptions;  // uri -> webID requester -> subscription
    
    mapping(string => address payable)users; 
    
    // Create an offer
    function registerOffer(string memory _uri, uint256 _price, uint256 _duration) public payable{
        offer memory o = offer({uri:_uri, price:_price, duration:_duration});
        offers[_uri] = o;
    }
    
    // Return price and duration of offer
    function getOffer(string memory _uri)public view returns(uint256, uint256){
        return (offers[_uri].price, offers[_uri].duration);
    }
    
    // create a subscription. Value in wei is send to smart contract
    function subscribe(string memory _uri, string memory _webID) public payable returns(bool){
        // first check if correct value was paid
        if(offers[_uri].price == msg.value){
            //uint256 end = now + offers[_uri].duration;
            subscription memory sub = subscription({balance:msg.value, endTime:0, accepted:false});
            subscriptions[_uri][_webID] = sub; 
            
            // emit event 
            emit newSubscription(_uri, _webID);
            
            return true; 
        }else{
            return false; 
        }
    }
    
    // resource owner accepts subscription. End time of subscription is saved
    function acceptSubscription(string memory _uri, string memory _webID) public payable{
        subscriptions[_uri][_webID].accepted = true; 
        subscriptions[_uri][_webID].endTime = now + offers[_uri].duration; 
    }
    
    // returns end time of subscription
    function getEndTime(string memory _uri, string memory _webID) public view returns(uint256){
        return subscriptions[_uri][_webID].endTime;
    }
    
    // subscriber claims an issue. There is no access given by the resource owner
    function claimIssue(string memory _uri, string memory _webID) public payable{
        oracle.requestAccessStatement(_uri, _webID);
    }
    
    // if sub has claimed issue and sara issued no access statment -> refund RQ, end sub immediatly else if subscription hasExpired -> pay out RO
    function endSubscription(string memory _uri, string memory _webIdRequester, string memory _webIdOwner)public payable{
        if(oracle.checkIssue(_uri, _webIdRequester) == true && oracle.hasAccess(_uri, _webIdRequester) == false){
            // send wei back to requester
            users[_webIdRequester].transfer(subscriptions[_uri][_webIdRequester].balance);
            delete subscriptions[_uri][_webIdRequester];
        }else if(subscriptions[_uri][_webIdRequester].endTime < now){
            // send wei to owner
            users[_webIdOwner].transfer(subscriptions[_uri][_webIdRequester].balance);
        }
    }
    
    // returns balance of smart contract
    function getBalance() public view returns(uint256){
        return address(this).balance;
    }
    
    // create user information 
    function createUser(string memory _webId, address payable _adr) public{
        users[_webId] = _adr; 
    }
}
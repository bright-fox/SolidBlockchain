pragma solidity >=0.4.22 <0.7.0;

contract SolidOracle{
    mapping(string => mapping(string => bool))accessMapping;  // uri -> webID -> bool
    
    mapping(string => mapping(string => bool))issueMapping; // uri -> webID -> bool 
    
    //declare no access event
    event NoAccess(string uri, string webId);
    
    //declare changed access info event
    event AccessInfo(string uri, string webId, bool state);

    // access to resource was not granted -> emit an event 
    function requestAccessStatement(string memory _uri, string memory _webId)public payable{
        //emit no access event
        emit NoAccess(_uri, _webId);
        
        issueMapping[_uri][_webId] = true; 
    }
    
    // set access info. This info is given by an autherized party
    function setAccessStatement(string memory _uri, string memory _webId, bool _state) public payable{
        accessMapping[_uri][_webId] = _state;
        emit AccessInfo(_uri, _webId, _state);
    }
    
    // returns if user has access to resource
    function hasAccess(string memory _uri, string memory _webId)public view returns(bool){
        return accessMapping[_uri][_webId];  
    }
    
    // returns if an issue was raised by the requester
    function checkIssue(string memory _uri, string memory _webId)public view returns(bool){
        return issueMapping[_uri][_webId];
    }
} 


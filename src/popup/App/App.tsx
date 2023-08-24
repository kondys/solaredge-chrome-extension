import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useChromeStorageSync } from 'use-chrome-storage';
import './App.css';
import SolarEdgeProvider from "../../background/SolarEdgeProvider";
import { APIState } from "../../background/APIState";

function App() {
  const [apiState, setAPIState] = useState(APIState.LOADING);
  const [siteId, setSiteId] = useChromeStorageSync("siteId","");
  const [currentKey, setCurrentKey] = useChromeStorageSync("apiKey","");


  useEffect(() => {
    console.log("sendMessage")
    chrome.runtime.sendMessage({
          type: "POPUP_LOADED",
      }, (resp) => {
          let err2 = chrome.runtime.lastError;
      });

    chrome.runtime.onMessage.addListener(
      function(request) {
        if (request.type == "APIState") {
          setAPIState(request.data.APIState);
        }
      })
  })

  let retryAPIScrape = ()=>{

    chrome.runtime.sendMessage({
      type: "LOOKUP_API_KEY",
    }, (resp) => {
        let err2 = chrome.runtime.lastError;
    });
  }
  
  return (
    <div className="App">
      <h1>SolarEdge API info</h1>
      {apiState == APIState.LOADING && <h2>Loading...</h2>}
      {apiState == APIState.INVALID_KEY && <><h2>Invalid key</h2><a href="#" onClick={retryAPIScrape}>Lookup API</a></>}
      {apiState == APIState.VALID_KEY && <h2>Key valid</h2>}
      {apiState == APIState.CHECKING && <h2>Checking key</h2>}
      {apiState == APIState.NETWORK_ERROR && <h2>Network error</h2>}
      <div>
      <label> API Key:
      <input value={currentKey} onInput={e => setCurrentKey((e.target as HTMLInputElement).value)}/></label></div>
      <div>
      <label> Site ID: 
      <input value={siteId} type="number" onInput={e => setSiteId((e.target as HTMLInputElement).value)}/></label></div>
    </div>
  );
}

export default App;

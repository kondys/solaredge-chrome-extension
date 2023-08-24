import SolarEdgeProvider from './SolarEdgeProvider';
import { APIState } from './APIState';
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const FROM_COLOR = { r: 14, g: 255, b: 0 };
const TO_COLOR = { r: 255, g: 255, b: 224 };
const SUNSET_THRESHOLD = 2;

let powerString = "0kw";
let totalPowerString = "0kw";
let sentence = "";
let lastUpdate = new Date();
let powerUpdates: any[] = [];

let setTitle = () => {
  let timeAgo = dayjs(lastUpdate).fromNow();
  chrome.action.setTitle({ title: `Current power: ${powerString}${sentence}\nTotal power today: ${totalPowerString}\nLast update: ${timeAgo}` })
}

let interpolateBetweenColors = (
  fromColor: { r: any; g: any; b: any; },
  toColor: { r: any; g: any; b: any; },
  percent: number
) => {
  const delta = percent / 100;
  const r = Math.round(toColor.r + (fromColor.r - toColor.r) * delta);
  const g = Math.round(toColor.g + (fromColor.g - toColor.g) * delta);
  const b = Math.round(toColor.b + (fromColor.b - toColor.b) * delta);

  return `rgb(${r}, ${g}, ${b})`;
};

let calculateSummarySentance = (power: number) => {
  const average = powerUpdates.length == 0 ? power : powerUpdates.reduce((total, next) => total + next.power, 0) / powerUpdates.length;

  const roundedAverage = (Math.round(average / 100) / 10);
  const roundedPower = (Math.round(power / 100) / 10);

  return roundedAverage == roundedPower || roundedPower == 0 ? '' : roundedAverage > roundedPower ? ' (↓ decreasing)' : ' (↑ increasing)';
}

let getIcon = (power: number, maxPower: number) => {
  let percent = Math.round((power / maxPower) * 100);
  let hour = (new Date()).getHours();

  if (power == 0)
    return '../../images/moon.png';

  if (percent > 80)
    return '../../images/sun.png';
  else if (percent > 50)
    return '../../images/cloud-sun.png';
  else if (percent > 25 && hour > 10 && hour < 16)
    return '../../images/cloud.png';
  else
    return '../../images/morning.png';
}


let updateLastPower = (power: number, lastUpdate: Date) => {
  let currentTime = new Date()

  //get rid of old updates
  powerUpdates = powerUpdates.filter((powerUpdate) => {
    let diff = (currentTime.getTime() - powerUpdate.lastUpdate.getTime()) / 1000 / 60;
    return diff < 60;
  })

  powerUpdates.push({ power: power, lastUpdate: lastUpdate });
}

let getBadgeBackgroundColor = (power: number, maxPower: number) => {
  if (power <= 0)
    return '#ADD8E6';

  let percent = Math.round((power / maxPower) * 100);
  if (percent > 100) percent = 100;

  return interpolateBetweenColors(FROM_COLOR, TO_COLOR, percent);
}




let onStatusUpdated = (apiState: APIState) => {
  chrome.runtime.sendMessage({
    type: "APIState",
    data: {
      APIState: apiState
    }
  }, () => {
    let err2 = chrome.runtime.lastError;
  });
}

let solarEdge = new SolarEdgeProvider(onStatusUpdated);
chrome.runtime.onMessage.addListener(
  (request) => {
    if (request.type == "POPUP_LOADED") {
      onStatusUpdated(solarEdge.apiState);
    }
    else if (request.type == "LOOKUP_API_KEY") {
      solarEdge.findAPIKey(true).then((keyFound) => {
        console.log("keyFound", keyFound);
      })
    }
  })

let sunsetCounter = 0
let onPowerUpdated = (power: number, maxPower: number, powerToday: number, _lastUpdate: Date) => {
  lastUpdate = _lastUpdate;
  powerString = (Math.round(power / 100) / 10).toString() + "kw";
  totalPowerString = (Math.round(powerToday / 100) / 10).toString() + "kw";

  power == 0 ? sunsetCounter++ : sunsetCounter = 0;
  sentence = calculateSummarySentance(power);
  updateLastPower(power, lastUpdate);

  chrome.action.setIcon({ path: getIcon(power, maxPower) });
  chrome.action.setBadgeText({ text: powerString });
  chrome.action.setBadgeBackgroundColor({ color: getBadgeBackgroundColor(power, maxPower) });
  setTitle();
}

let okToRun = (date: Date = new Date()) => {
  if (sunsetCounter < SUNSET_THRESHOLD)
    return true;

  let hour = date.getHours();
  if (hour == 0) {
    totalPowerString = "0kw";
  }
  else if (hour > 6 && hour < 12) {
    sunsetCounter = 0
    return true;
  }

  return false;
}

chrome.alarms.onAlarm.addListener((alarm) => {
  setTitle();

  if (okToRun()) {
    solarEdge.getPower(onPowerUpdated);
  }
})


solarEdge.findAPIKey().then((keyFound) => {
})
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.alarms.create('minute_alarm', {
    delayInMinutes: 0,
    periodInMinutes: 1
  });
});



export { }
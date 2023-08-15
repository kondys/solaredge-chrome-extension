# solaredge-chrome-extension
Chrome extension to retrieve power information from a SolarEdge system

Goal: 
To see my solar power stats in directly in a browser, no need to look at the sky or my phone!

Inspired by:
https://www.home-assistant.io/integrations/solaredge/

API docs:
https://knowledge-center.solaredge.com/sites/kc/files/se_monitoring_api.pdf

Requirements:
- Solar edge account with login
https://monitoring.solaredge.com/
- API key & API enabled
The extension will try and get this information for you. You can manually override it if you need.

Limitations:
- Will only read power for one site
- Just invertor power data at the moment, not sure what battery power data would like
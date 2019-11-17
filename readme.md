# Homebridge Plugin for Sungrow SG Series Inverters

This Homebridge plugin leverages Modbus protocol to display on/off state and current power of your Sungrow SG inverters.

After you've got your homebridge up and running:

`npm i -g homebridge-sungrow`

Then edit the config.json of your homebridge. Please find below an example -

```javascript
{
  "accessory": "SungrowInverter",
  "name": "My Solar Panels",
  "ipAddress": "xxx.xxx.xxx.xxx",
  "port": 502,
  "model": "SG2KTL-S",
  "serialNumber": "Axxxxxxxxx",
  "refreshInterval": 1
}
```
- ipAddress - You can find it from the router which you connect your inverter's wifi dongle to.
- port - The default for Sungrow wifi dongle is 502.
- model - Whatever you like ...
- serialNumber - Whatever you like ...
- refreshInterval - The polling interval in minutes.

The power data is pretty much real-time because it's from the inverter directly. Please note Apple Home app can only show on/off state. You'll need EVE to view the power data and set interesting automation rules. For example - it's raining hard and quite dark during the daytime. The power of the inverter is low and you can automate your lighting based on it.

This is my second homebridge plugin. Please pardon me on the immature code. Only got a few hours to work on it.

Thank all the relevant package developers who made this little plugin possible.

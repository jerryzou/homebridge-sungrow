const inherits = require("util").inherits,
      moment = require('moment'),
      ModbusRTU = require("modbus-serial");

var client = new ModbusRTU();

var Service, Characteristic, Accessory, FakeGatoHistoryService;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;

	FakeGatoHistoryService = require('fakegato-history')(homebridge);

	homebridge.registerAccessory("homebridge-sungrow", "SungrowInverter", SungrowInverter);
};

function SungrowInverter(log, config) {
  this.log = log;
  this.config = {
    name: config.name || 'My Sungrow Inverter',
    ipAddress: config.ipAddress || '127.0.0.1',
    port: config.port || 502,
    manufacturer: 'Sungrow',
    model: config.model || 'Unspecified',
    serialNumber: config.serialNumber || '12345678',
    refreshInterval: (config.refreshInterval * 60000) || 60000
  };

  Characteristic.CustomWatts = function() {
		Characteristic.call(this, 'Consumption', 'E863F10D-079E-48FF-8F27-9C2605A29F52');
		this.setProps({
			format: Characteristic.Formats.UINT16,
			unit: 'W',
			minValue: 0,
			maxValue: 65535,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(Characteristic.CustomWatts, Characteristic);
	Characteristic.CustomWatts.UUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
}

SungrowInverter.prototype = {
  getServices: function() {
    this.SungrowInverter = new Service.Outlet(this.config.name);

    this.SungrowInverter.getCharacteristic(Characteristic.On)
		.on('get',this._getValue.bind(this, "On"))
    .on('set', this._setValue.bind(this, "On"));
    
    this.SungrowInverter.getCharacteristic(Characteristic.OutletInUse)
    .on('get', this._getValue.bind(this, "OutletInUse"));
    
    this.SungrowInverter.addCharacteristic(Characteristic.CustomWatts);
		this.SungrowInverter.getCharacteristic(Characteristic.CustomWatts)
    .on('get', this._getValue.bind(this, "CustomWatts"));
    
    client.connectTCP(this.config.ipAddress, { port: this.config.port });
    client.setID(1);

    setInterval(function() {
      try {
        if (this.offline) {
          this.log("The inverter is now offline.");
        } else {
          client.readInputRegisters(5016, 10, function(err, data) {
            if (data && data.buffer.readUInt16BE(0)) {
              this.bufferData = data.buffer.readUInt16BE(0);
              this.log("Current power: ", this.bufferData);
              this.SungrowInverter.getCharacteristic(Characteristic.On).updateValue(1);
              this.SungrowInverter.getCharacteristic(Characteristic.OutletInUse).updateValue(1);
              this.SungrowInverter.getCharacteristic(Characteristic.CustomWatts).updateValue(this.bufferData);
              this.loggingService.addEntry({time: moment().unix(), power: this.bufferData});
            } else if (this.bufferData && this.bufferData>10) {
              this.log("Current power from buffer: ", this.bufferData);
            } else if (this.bufferData && this.bufferData<=10) {
              this.log("Solar power is now very low. Stop polling...");
              this.SungrowInverter.getCharacteristic(Characteristic.On).updateValue(0);
              this.SungrowInverter.getCharacteristic(Characteristic.OutletInUse).updateValue(0);
              this.SungrowInverter.getCharacteristic(Characteristic.CustomWatts).updateValue(0);
              this.offline = true;
            } else {
              this.log("Current power: ", 0);
              this.SungrowInverter.getCharacteristic(Characteristic.On).updateValue(0);
              this.SungrowInverter.getCharacteristic(Characteristic.OutletInUse).updateValue(0);
              this.SungrowInverter.getCharacteristic(Characteristic.CustomWatts).updateValue(0);
              this.loggingService.addEntry({time: moment().unix(), power: 0});
            }
          }.bind(this));
        }
      } catch (err) {
        this.log(err);
      }
    }.bind(this), this.config.refreshInterval);

    this.loggingService = new FakeGatoHistoryService("energy", Accessory);

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Name, this.config.name)
			.setCharacteristic(Characteristic.Manufacturer, this.config.manufacturer)
			.setCharacteristic(Characteristic.Model, this.config.model)
			.setCharacteristic(Characteristic.SerialNumber, this.config.serialNumber);

		return [this.SungrowInverter, this.loggingService, this.informationService];
  },

  _getValue: function(CharacteristicName, callback) {
    //this.log("Get", CharacteristicName);
    const crtPower = this.SungrowInverter.getCharacteristic(Characteristic.CustomWatts).value;
    const crtState = crtPower > 0 ? true : false;
    if (CharacteristicName==="On") {
      callback(null, crtState);
    }
    if (CharacteristicName==="OutletInUse") {
      callback(null, crtState);
    }
		if (CharacteristicName==="CustomWatts") {
      callback(null, crtPower);
    }
	},

	_setValue: function(CharacteristicName, value, callback) {
    this.log("Set " + CharacteristicName + " to " + value);
    if (value) {
      client.connectTCP(this.config.ipAddress, { port: this.config.port });
      client.setID(1);
      this.offline = false;
      this.log("Switched on the monitoring...");
    } else {
      this.SungrowInverter.getCharacteristic(Characteristic.On).updateValue(0);
      this.SungrowInverter.getCharacteristic(Characteristic.OutletInUse).updateValue(0);
      this.SungrowInverter.getCharacteristic(Characteristic.CustomWatts).updateValue(0);
      this.loggingService.addEntry({time: moment().unix(), power: 0});
      this.offline = true;
      this.log("Switched off the monitoring...");
    }
		callback();
	}
}
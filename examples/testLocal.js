#!/usr/bin/env node
// usage : test.js [--host <the http host to test> [--port <the port>]] [--comment '<optionnal comment to include to the HTML report>"] 

// That port is used by slaves to communicate with master.
// It must be reachable from outside if using an external cluster (ie. EC2) 
var MASTER_PORT=80;
// warning : the master host must be specified as public DNS/IP to allow proper communication from an external cluster of slaves
var MASTER_HOST='localhost';

var nl = require('../nss');
nl.usePort(MASTER_PORT);			// Master HTTP port
//nl.setMonitorIntervalMs(1000);	// emit 'update' events every second. Default: 2000
//nl.setAjaxRefreshIntervalMs(1400);	// HTML page should update every second. Default: 2000
nl.setSlaveUpdateIntervalMs(2000);	// slaves check in every second in distributed tests. Default: 3000
//nl.disableLogs()		// don't log anything to disk	


// small tools to parse command-line args (requires npm install optparse)
var tools = require('./tools/tools.js');
var options = tools.readCmdOptions();

// the host to connect to. if none passed in cmdline args, an embedded one will be launched
var targetHost = options.host;

// optional comment included to report
if (options.comment)
	nl.setReportComment(options.comment);

// if a list of slaves is provided into a file (1 line = 1 host), that file should be read with the following
//var slaveHosts = tools.readSlavesList(options.slaves,":8000");
var slaveHosts = ["localhost:8000"];


// Output summary of options
for (var o in options) {
	console.log('options['+o+'] = '+options[o]);
}


console.log('Starting stress test on server : '+options.host+':'+options.port);

var mytest = {
    name: "3min-ramp",
    host: targetHost,
    port: options.port,
    timeLimit: 180,
    loadProfile: [[0,0], [180,400] ],
    numUsers: 4,
    stats: [
		'rps',
		'result-codes',
		{name: 'latency', percentiles: [0.95]},
		'concurrency',
		'request-bytes',
		'response-bytes'
	],
    requestGenerator: function(client) {
		var ts=new Date().getTime();
		var uri = "/abcdef/?ts="+ts;
		var request = client.request({method:'GET', path: uri, headers:{
			'host':				'MyServer',
			'Accept':			'*/*',
			'Accept-Charset':	'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
			'Accept-Encoding':	'gzip,deflate,sdch',
			'Accept-Language':	'fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4',
			'Connection':		'keep-alive',
			'User-Agent':		'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.6 (KHTML, like Gecko) Chrome/16.0.899.0 Safari/535.6',
			'Cookie':			'key=value'
		}});
		return request;
    }
};

console.log('\nStarting test.\n');
var cluster = new nl.LoadTestCluster(MASTER_HOST+':'+MASTER_PORT, slaveHosts);

// properly shutdown test on slaves when CTRL+C is pressed (useful for testing !)
process.on('SIGINT', function () {
	console.log('\nGot SIGINT. Stopping test\n');
	cluster.end();
});

// let's run
cluster.run(mytest);

// at the end show message then exit.
cluster.on('end', function() {
	console.log('\nAll tests done. exiting.\n');
	process.exit(0);
});

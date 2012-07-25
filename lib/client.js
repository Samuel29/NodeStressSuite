var BUILD_AS_SINGLE_FILE;
if (!BUILD_AS_SINGLE_FILE) {
var EventEmitter = require('events').EventEmitter;
var util = require('../util');
var http = require('http');
}

/**
 * this is a pseudo container class, aimed to replace the deprecated http.createClient and all previous reconnectingClient which wasn't robust enough.
 * this class encapsulates its own http Agent, with an increased maxSockets attribute (default was 5).
 * This code resists better to the "socket hang up" errors, because the Agent handles properly closed sockets,
 * without "crashing" our virtual users. So the load testing scenarios are not impacted. 
 * usage :
 *   var client= new Client(host,port);
 *   var request = client.request({options});
 *      options = exactly the same options as http.request(), except the followinf :
 *      	- host and port that are already defined upon creation,
 *      	- Agent option (also defined into this class) 
 *   request.on('response',...)
 */
var Client = exports.Client = function Client(host, port) {
    EventEmitter.call(this);
	this.host = host;
	this.port = port;
	
	this.agent = new http.Agent({maxSockets: 1024});
	this.agent.on('error', this.emit.bind(this, 'error'));
};
util.inherits(Client, EventEmitter);

Client.prototype.request = function(options,callback){
	var self=this;
	// add the agent,host,port properties to the arguments
	var args = util.extend(options,{agent:self.agent,host: self.host, port:self.port, protocol: 'http:'});
	
	var req = http.request.apply(this,[args,callback]);
	req.on('socket',function(socket) {
		socket.on('error',function(err){
			qputs("Socket Error : "+err.toString());
		});
	});
	req.on('error', function(error) {
		//self.emit.bind(this,'error'));
		qputs("Request Error : "+error.toString());
		req.emit('response', new EventEmitter());
	});
	return req;
};
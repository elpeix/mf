/**
 * Class Name: MF Storage
 * 
 * Uses LocalStorage
 * 
 * @author Francesc Requesens
 * @version 0.9 2014-12-08
 *
 */

function MFStorage(uid){
	t = this;
	
	t.init 			= init;
	t.destroy		= destroy;
	t.get			= get;
	t.post			= post;
	t.put			= put;
	t.remove		= remove;
	
	//Local
	var dataType	= 'json';
	var data;
	var storageSuported = ( typeof Storage != 'undefined' );

	//Public Methods
	function init(callback){
		get(callback);
	};
	function destroy(){
		//Comprove suport
		if (!storageSuported) {
			callback(_error(300));
			return false;
		}

		localStorage.clear();		//Clear localStorage
		callback({
			status: 202
		});
		return;
	};
	function get(callback){
		//Comprove suport and uid is defined
		if (!storageSuported) {
			callback(_error(300));
			return false;
		}
		if (!uid) {
			callback(_error(400));
			return false;
		}

		var value = localStorage[uid];
		var obj = {};
		if (!value) {
			var reg = new RegExp('^' + uid);
			var arr = findPropertyNameByRegex(localStorage, reg);

			var arrLength = arr.length

			if (!arrLength) callback(_error(404));
			var obj = {
				count : arrLength,
				items : []
			}
			for (var i = 0; i < arrLength; i++) {
				obj.items.push(_parseData(localStorage[arr[i]]));
			};

		}
		else {
			obj = _parseData(localStorage[uid]);
		}

		if (callback && typeof callback === 'function'){
			callback(obj);
		}
		return;
		
	};
	function post(message, callback){
		//Comprove suport and uid is defined
		if (!storageSuported) {
			callback(_error(300));
			return false;
		}
		if (!uid) {
			callback(_error(400));
			return false;
		}

		var iden = _getIden();

		message['id'] = iden;
		localStorage[uid + iden] = _stringifyData(message);
		callback(message);
		return;
	};
	function put(message, callback){
		//Comprove suport and uid is defined
		if (!storageSuported) {
			callback(_error(300));
			return false;
		}
		if (!uid) {
			callback(_error(400));
			return false;
		}

		localStorage[uid] = _stringifyData(message);
		callback(message);
		return;
	};
	function remove(callback){
		//Comprove suport and uid is defined
		if (!storageSuported) {
			callback(_error(300));
			return false;
		}
		if (!uid) {
			callback(_error(400));
			return false;
		}
		
		delete localStorage[uid]; //Delete item
		return {status: 202};
	};
	
	//Private Methods
	function _stringifyData(obj){
		switch (dataType) {
			case 'json':
				return JSON.stringify(obj);
			default : 
				return _error(403);
		}
	};
	function _parseData(str){
		switch (dataType) {
			case 'json':
				if (str) {
					return JSON.parse(str);
				}
				return _error(404)
				
			default : 
				return _error(403);
		}
	};
	function _error(code){
		var message = "";
		switch (code) {
			case 300:
				message = "LocalStorage is not supported"
			case 403:
				message = "Not implemented";
				break;
			case 404:
				message = "Not found";
				break;
			case 500:
				message = "Internal error";
			default:
				message = "Bad request";
				break;
		}
		return {status: code, message : message};
	};

	function _getIden(){
		var state = true;
		var iden;
		while (state) {
			iden = uniqueIden();
			if (!localStorage[iden]) state = false;
		};
		return iden;
	}

	// Generate four random hex digits.
	function S4() {
	   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	function uniqueIden() {
	   return (S4()+S4()+S4());
	};

	// Generate a pseudo-GUID by concatenating random hexadecimal.
	function guid() {
	   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	};
};
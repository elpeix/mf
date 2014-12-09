/**
 * Class Name: MF Framework for browsers
 * Experimental environment for creating web applications 
 * based on REST. Just to learn.
 * 
 * Based on backbone
 * 
 * @author Francesc Requesens
 * @version 0.9 2014-12-08
 * @dependences jQuery > 1.10
 *
 */
(function(){
	'use strict';

	//Creem variable principal assignada a window
	var MF = window.MF = {};

	//Version
	MF.VERSION = '0.9';

	/**
	* Model Method
	*/
	var Model = MF.Model = function(options) {
		var self = this;
		//Defaults - Options
		var defaults = {
			url : '',
			id : 0,
			content : null,
			schema : {},
			transformURLs : null
		};
		var preOptions = $.extend(true, defaults, self.constructor.prototype || {});
		var options = $.extend(false, self.constructor.prototype, options || {});

		//Public methods link
		self.init       = init;
		self.destroy    = destroy;
		self.setUrlRoot = setUrlRoot;
		self.get        = get;
		self.fetch      = fetch;
		self.setContent = setContent;
		self.add        = add;
		self.update     = update;
		self.remove     = remove;
		self.sync       = sync;

		//Local
		var urlRoot = self.urlRoot;
		var subcollections = self.constructor.subcollections || [];

		self.url = options.url;
		self.id = options.id;
		self.content = options.content;
		self.schema = options.schema;
		self.transformURLs = options.transformURLs;
		self.lastModified = null;
		self.lastSync = null;

		//Call init
		init();

		//Public Methods

		//Initialize data
		function init(){

			//Prepare url - Per no tenir problemes amb la barra final.
			if (self.content && self.content.id){
				self.id = parseInt(self.content.id);
				self.url = urlRoot + self.id + '/';
			}
			else if (self.id) 
				self.url = urlRoot + self.id + '/';
			else if (self.url) {
				self.id = self.url.match(/\d*(\/?)$/)[0];
			if (isNaN(self.id))
				self.id = self.url.match(/\d*$/)[0];
			}
			self.url = self.url? self.url.replace('//', '/') : '';

			//If is necessary transform URLs
			// Es pot donar el cas que un model es genera a partir d'altres 
			// models o colleccions però la definició s'ha fet a l'inici.
			if(self.transformURLs)
				for (var tfk in self.transformURLs){
					var rg = new RegExp("/:" + tfk + "/?", 'i');
					self.url = self.url.replace(rg,"/"+self.transformURLs[tfk]+"/");
				}

			//Internal collections (subcollections)
			// TODO Limitar la recursivitat
			if (subcollections && self.id)
				_subcollections(subcollections);
		};
		function destroy(){
			self = {};
		};
		function setUrlRoot(url){
			urlRoot = self.urlRoot = url;
			return urlRoot;  
		};
        
        
		//Get - Returns itself
		// Si no té les dades, les va a buscar pel mètode fetch
		function get(_options){
			if (!self.url) throw "No url defined";
			if (!self.id) self.id = self.url.match(/\d*$/)[0];

			var _defaults = {
				async : true,
				callback : function(){}
			};
			var _options = $.extend(_defaults, _options || {});
			var callback = _options.callback;

			if (!self.content)
				fetch(_options);
			else if (callback && typeof callback === 'function')
				callback(self);
		};

		//Fetch
		// Agafa del servidor les dades i les sincronitza
		function fetch(_options){
			if (!self.url) throw "No url defined";
			if (!self.id) self.id = self.url.match(/\d*$/)[0];

			var _defaults = {
				async : true,
				callback : function(){}
			};
			var _options = $.extend(_defaults, _options || {});
			var async = _options.async;
			var callback = _options.callback;

			var dataObj = new MFConnection(self.url);

			dataObj.init(async, function(rData){
				self.content = rData;
				self.id = rData.id;
				self.lastSync = new Date();
				if (callback && typeof callback === 'function') {
					callback(self);
				}
			});
		};

		//SoftAdd
		// Insereix les dades a l'objecte però no les desa al servidor
		function setContent(data){
			self.content = data;
		};

		//Add
		// Fa un POST de les dades al Servidor
		function add(_options){
			var _defaults = {
				data : {},
				async : true,
				callback: function(){}
			};
			var _options = $.extend(_defaults, _options || {});

			setContent(_options.data);
			sync({
				async : _options.async,
				callback : _options.callback
			});
		};

		//Update
		// Actualitza les dades (PUT) al servidor i es retorna ell mateix
		function update(_options){
			var _defaults = {
				data : {},
				async : true,
				callback: function(){}
			};
			var _options = $.extend(_defaults, _options || {});

			//Save previous Model
			self.prevcontent = $.extend(false, self.content, {});

			setContent(_options.data);
			sync({
				async : _options.async,
				callback : _options.callback
			});
		};

		//Remove
		// Elimina l'element del servidor. No retorna res is ha anat bé.
		function remove(callback, async){
			var dataObj = new MFConnection(self.url);
			if (!async) async = true;

			dataObj.remove(async, function(rData){
				if (callback && typeof callback === 'function')
					callback(rData);

				if (rData.status > 299) 
					return false;
				else destroy();
			});
		};

		//Sync
		// Sincronitza les dades del model amb el servidor
		function sync(_options){
			var _defaults = {
				async : true,
				callback: function(){}
			};
			var _options = $.extend(_defaults, _options || {});

			var async = _options.async;
			var callback = _options.callback;

			var type = '';
			var url = self.id? self.url : self.urlRoot;
            
			if(!self.id) type = 'post';
			else type = 'put';

			var dataObj = new MFConnection(url);
			dataObj[type](JSON.stringify(self.content), function(rData){
				if (rData.status > 299) {
					//Cagada TOTAL!
					if (callback && typeof callback === 'function')
						callback(rData);
					return false;
				}

				self.content = rData;
				self.lastSync = new Date();

				//Update subcollections 
				if (type == 'post') {
					self.id = rData.id;
					self.url = self.urlRoot + self.id + '/';
					if (self.constructor.subcollections)
						_subcollections(self.constructor.subcollections);
				}

				//Callback
				if (callback && typeof callback === 'function') callback(self);
			});
		};

		function _subcollections(subcollections){
			for (var i=0; i < subcollections.length; i++) {

				var regInitSlash = /^\//;
				var url_subcollection, urlRoot_subcollection;
				var subcollection = subcollections[i];

				if (regInitSlash.test(subcollection.url_part))
					url_subcollection = subcollection.url_part;
				else
					url_subcollection = self.url + '/' + subcollection.url_part;
            
				url_subcollection = url_subcollection.replace('//', '/');
				urlRoot_subcollection = url_subcollection + '/';
				urlRoot_subcollection = urlRoot_subcollection.replace('//', '/');
              
				self[subcollection.name] = new MF.Collection({
					url: url_subcollection,
					model : Model.extend({ 
						urlRoot : urlRoot_subcollection,
						subcollections: subcollection.subcollections,
						attributes : subcollection.attributes
					})
				});
				var collection = self[subcollection.name];

				if(subcollection.field_content && self.content){
					//self[subcollection.name].count = self.content[subcollection.field_content].length;
					var arrResults = [];
					if (arrResults = subcollection.field_content.match(/([a-zA-Z]+)\.([a-zA-Z]+)/))
						self[subcollection.name].massiveAdd(self.content[arrResults[1]][arrResults[2]]);
					else
						self[subcollection.name].massiveAdd(self.content[subcollection.field_content]);
				}
			};
		};
	};

	//Add collection to model
	Model.addCollection = function(_options){
		var _defaults = {
			name : "",
			url_part : ""
		};
		var collection = $.extend(_defaults, _options || {});

		if (!this.subcollections) this.subcollections = [];
		this.subcollections.push(collection);

		return collection.name;
	};

	/**
	* Collection Method
	*/
	var Collection = MF.Collection = function(options) {
		var self = this;

		//Defaults - Options
		var defaults = {
			url : '',
			model : null,
			isolateModel : false,
			items_name : 'results',
			transformURLs : null
		};
		var options = $.extend(defaults, options || {});

		//Public methods
		self.init        = init;
		self.destroy     = destroy;
		self.get         = get;
		self.fetch       = fetch;
		self.create      = create;
		self.massiveAdd  = massiveAdd;
		self.add         = add;
		self.update      = update;
		self.remove      = remove;
		self.isDuplicate = isDuplicate;
		self.reset       = reset;
		self.setUrlRoot  = setUrlRoot;
		self.search      = search;

		//"Local"
		self.url = options.url;
		var items_name = self.items_name = options.items_name;
		self.transformURLs = options.transformURLs;

		self[items_name] = [];

		//MODEL
		if (options.isolateModel)
			var SelfModel = options.model.extend();
		else
			var SelfModel = options.model;
		self.model = SelfModel;

		init();

		//Public Methods
		function init(){
			if (!self.url)
				return false;

			//Transform URLs
			if(self.transformURLs) {
				for (var tfk in self.transformURLs){
					var rg = new RegExp("/:" + tfk + "/?", 'i');
					SelfModel.prototype.urlRoot = SelfModel.prototype.urlRoot.replace(rg,"/"+self.transformURLs[tfk]+"/");
				}
			}
		};

		function destroy(){
			self = {};
		};
		function setUrlRoot(url){
			SelfModel.urlRoot = url;  
		};

		function get (_options) {
			var _defaults = {
				key : 'id',
				identifier : 0,
				async : true,
				params: '',
					success: function(){},
					error: function(){}
			};
			var _options = $.extend(_defaults, _options || {});
	      
			var key = _options.key;
			var identifier = _options.identifier;
			var async = _options.async;
			var success = _options.success;

			if (identifier)
				var model = _getModel(key, identifier, async, success);
			else {
				if (!self[items_name].length) 
					fetch(_options);
				else if (success && typeof success === 'function') 
					success(self);
			}
		};

		function fetch (_options) {
			var _defaults = {
				async : true,
				params: '',
					success: function(){},
					error: function(){}
			};
			var _options = $.extend(_defaults, _options || {});

			var async = _options.async;
			var params = _options.params;
			var success = _options.success;
			var error = _options.error;
      
			reset();
			if (!self.url) urlError();
			var dataObj = new MFConnection(self.url + (params? '?' + params : ''));
      
			dataObj.init(async, function(rData){
				if (rData.status > 299){
					if (error && typeof error === 'function') error(rData);
					return false;
				}

				var items = rData[items_name];
				if (!items) return false;

				// Add items to collection
				massiveAdd(items);

				self.count = rData.count;
				self.next = rData.next;
				self.previous = rData.previous;
				if (success && typeof success === 'function') success(self);
			});
		};

		//Add
		// Adds a Model object to collection
		function add (model){
			if (model.constructor === SelfModel){
				self[items_name].push(model);
				self.count = self[items_name].length;
			}
		};

		//Massive add
		// Adds multiple models to collection
		function massiveAdd (items){
			for (var i = 0; i < items.length; i++){
				var model = new SelfModel({ content : items[i], transformURLs:self.transformURLs });
				add(model);
			}
		};

		//Create
		// Creates a Model object and adds to collection
		function create(_options){
			var model = new SelfModel();
			var _defaults = {
				data : {},
				async : true,
				callback: function(){}
			};
			var _options = $.extend(_defaults, _options || {});

			var data = _options.data;
			var async = _options.async;
			var callback = _options.callback;

			//TODO SYNC!!!
			model.add({
				async : async,
				data : data, 
				callback :function(rData){
					if (rData.status > 299){
						callback(rData);
						return false;
					}
					add(model);
					callback(model);
				}
			});
		};

		//Update - TODO
		// Method sync on model makes the same...
		// Actualiza un objecte Model d'una collecció
		function update(identifier, data, callback){
			var index = _getModelIndex(identifier);
			if (index < 0) throw "Not found";
		};

		//Remove
		// Elimina un objecte Model d'una collecció
		function remove(identifier, callback){
			var index = _getModelIndex(identifier);
			if (index < 0) {
				if (callback && typeof callback === 'function') 
					callback({status: 999});
				return false;
			}

			var item = self[items_name][index];
			item.remove(function(rData){
				if (rData.status > 299){
					callback(rData);
					return false;
				}

				self[items_name].pop(index);
				if (callback && typeof callback === 'function') 
					callback(rData);
			});
		};

		//Is duplicate
		//Check if item exists on collection
		function isDuplicate(key, value, callback){
			ret = false;
			for (var i = 0; i < self.items.length; i++){
				if (value == self.items[i].content[key]){
					ret = parseInt(self.items[i].id);
					break;
				}
			}
			if (callback && typeof callback === 'function') 
				callback(ret);
			else return ret;
		};

		//Reset
		// Reset collection
		function reset(){
			self[items_name] = [];
		};

		//Search
		// Returns a list of elements from collection that their key  can 
		// contains a value 
		function search(_options) {
			var _defaults = {
				keys: ['name'],
				value: '',
				callback: null,
			};
			var _options = $.extend(_defaults, _options || {});
			var keys = _options.keys;

			//Prepare for search (remove accents, upper case)
			var value = _options.value.mfRemoveAccents().toUpperCase(); 
			var callback = _options.callback;

			var items = self[items_name];
			var arrResults = [];
      
			if (!items.length) return false; //Fer saltar un error molaria més.

			for (var i = 0; i < items.length; i++) {
				for (var j = 0; j < keys.length; j++) {
					var arrKeys = keys[j].split('.');

					//Anem a trobar el camp a fer la cerca
					var field = items[i].content;
					for (var k = 0; k < arrKeys.length; k++) {
						field = field[arrKeys[k]];
					};

					//Cerca. 
					// Si és un número o boolean per igualació
					// Si és string per "indexOf"
					// Si és una altra cosa... res de res
					switch(typeof value){
						case 'boolean':
						case 'number':
							if (field == value)
								arrResults.push(items[i]);
							break;
						case 'string':
							if (field.mfRemoveAccents().toUpperCase().indexOf(value) >= 0)
								arrResults.push(items[i]);
							break;
					}
				};
			};

			//Return
			if (callback && typeof callback === 'function') 
				callback(arrResults);
			else 
				return arrResults;
		};

		//Private Methods

		//_getModel
		//Gets Model object
		function _getModel(key, value, async, callback){

			if (key == 'id') {
				var index = _getModelIndex(value);
				if (index >= 0)
					callback(self[items_name][index]);
				else {
					var model = new SelfModel({id : value});
					model.get({
						async : async, 
						callback : function(){
							add(model);
							callback(model);
						}
					});
				}
			}
			else {
				//Agafa el primer valor... Hauria de poder retornar més d'un 
				//valor si es dóna el cas.
				var index = _getModelIndexByKey(key, value)[0];
				if (index >= 0)
					callback(self[items_name][index]);
			}
			return true;
		};

		//_getModelIndex
		//Gets model position from collection
		function _getModelIndex(id) {
			var items = self[items_name];
			if (items.length)
				for (var i = 0; i < items.length; i++)
					if (items[i].id == id)
						return i;
			return -1;
		};

		//_getModelIndexByKey
		//Dóna les posicions en un array a la llista dels models segons un camp
		//Pot fer cerques en una clau de subnivell. Només un.
		function _getModelIndexByKey(key, value) {
			var items = self[items_name];
			var arrResults = [];
			var arrKeys = key.split('.');
			if (items.length)
				for (var i = 0; i < items.length; i++)
					if ((arrKeys.length < 2 && items[i].content[key] == value) ||
						(arrKeys.length == 2 && items[i].content[arrKeys[0]][arrKeys[1]] == value)
					)
						arrResults.push(i);
			return arrResults;
		};
	};

	/**
	* Controller Method - jQuery Plugin creator
	*/
	var Controllers = MF.Controllers = function(name, o) {
		;(function($) {
			o.options = $.extend(o.options, {});

			//Create plugin
			$.fn[name] = function(options) {
				//Clone object
				var defaults = JSON.parse(JSON.stringify(o.options));

				// method calling
				if( typeof options == 'string') {
					var args = Array.prototype.slice.call(arguments, 1);
					var res;
					this.each(function() {
						var obj = $.data(this, name);
						if(obj && $.isFunction(obj[options])) {
							var r = obj[options].apply(obj, args);
							if(res === undefined) res = r;
							if(options == 'destroy') $.removeData(this, name);
						}
						else if(obj && obj[options]) res = obj[options];
					});
					if(res !== undefined)
						return res;
					return this;
				}
				options = $.extend(defaults, options || {});

				this.each(function(i, _element) {
					var element = $(_element);
					var obj = new o.ClassController(element, options);

					element.data(name, obj);
					obj.init();
				});
				return this;
			};
		})(jQuery);
	};
  
	//Extend
	//Clona un element i el retorna amb les propietats que s'han volgut 
	//modificar. Ideal per a crear objectes Model nous
	//var extend = function(protoProps, staticProps) {
	var extend = function(protoProps) {
		var parent = this;
		var child = function(){ 
			return parent.apply(this, arguments); 
		};
		//$.extend(child, parent, staticProps);
		$.extend(child, parent);

		//Create new element
		var Substitute = function(){ this.constructor = child; };
		Substitute.prototype = parent.prototype;
		child.prototype = new Substitute;

		if (protoProps) 
			$.extend(child.prototype, protoProps);

		child.__super__ = parent.prototype;
		return child;
	};

	//Assign to function
	Model.extend = extend;

	//Guid - Create Unique id
	var guid = MF.Guid = (function() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
		}
		return function() {
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();
		};
	})();

	// Throw an error when a URL is needed, and none is supplied.
	var urlError = function() {
		throw new Error('A "url" property or function must be specified');
	};

}).call(this);

/*!
 * purl
 * Copyright (c) 2015 intuitivcloud Systems <engineering@intuitivcloud.com>
 * BSD-3-Clause Licensed
 */
var purl =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	/*!
	 * purl
	 * Copyright (c) 2015 intuitivcloud Systems <engineering@intuitivcloud.com>
	 * BSD-3-Clause Licensed
	 */

	'use strict';

	var pathRex = /(([\w\.\-\+]+:)\/{2}(([\w\d\.]+):([\w\d\.]+))?@?(([a-zA-Z0-9\.\-_]+)(?::(\d{1,5}))?))?(\/(?:[a-zA-Z0-9\.\-\/\+\%\_]+)?)(?:\?([a-zA-Z0-9=%\-_\.\*&;]+))?(?:#([a-zA-Z0-9\-=,&%;\/\\"'\?]+)?)?/;

	/**
	 * Parses the specified URL and returns an object containing the components
	 * extracted
	 *
	 * @param  {string} urlToParse - the URL to parse and extract components from
	 *
	 * @return {Object} an object containing the components extracted from the specified
	 *                  URL
	 */
	module.exports = function purl(urlToParse) {
	  var m = pathRex.exec(urlToParse),
	      i = 1;

	  if (!m) return {};

	  return {
	    origin: m[i++],
	    protocol: m[i++],
	    userinfo: m[i++],
	    username: m[i++],
	    password: m[i++],
	    host: m[i++],
	    hostname: m[i++],
	    port: m[i++],
	    pathname: m[i++],
	    search: m[i++],
	    hash: m[i++]
	  };
	};



/***/ }
/******/ ]);
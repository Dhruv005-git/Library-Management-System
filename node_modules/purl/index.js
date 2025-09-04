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


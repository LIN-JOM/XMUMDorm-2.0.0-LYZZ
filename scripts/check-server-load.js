#!/usr/bin/env node

const path = require('path');
const express = require('express');

const listen = express.application.listen;
express.application.listen = function blockListenForLoadCheck() {
  return { close() {} };
};

try {
  require(path.resolve(__dirname, '..', 'server.js'));
} finally {
  express.application.listen = listen;
}

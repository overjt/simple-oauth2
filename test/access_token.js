'use strict';

const qs = require('querystring');
const nock = require('nock');
const path = require('path');
const expect = require('chai').expect;
const startOfYesterday = require('date-fns/start_of_yesterday');
const oauth2Module = require('./../index.js');

const oauth2 = oauth2Module({
  clientID: 'client-id',
  clientSecret: 'client-secret',
  site: 'https://example.org',
});

let request;
let result;
let resultPromise;
let token;
let tokenPromise;
let error;
let errorPromise;
const tokenConfig = {
  code: 'code',
  redirect_uri: 'http://callback.com',
};
const refreshConfig = {
  grant_type: 'refresh_token',
  refresh_token: 'ec1a59d298',
  client_id: 'client-id',
  client_secret: 'client-secret',
};
const refreshWithAdditionalParamsConfig = {
  scope: 'TESTING_EXAMPLE_SCOPES',
  grant_type: 'refresh_token',
  refresh_token: 'ec1a59d298',
  client_id: 'client-id',
  client_secret: 'client-secret',
};
const revokeConfig = {
  token: 'ec1a59d298',
  token_type_hint: 'refresh_token',
  client_id: 'client-id',
  client_secret: 'client-secret',
};
const oauthConfig = {
  code: 'code',
  redirect_uri: 'http://callback.com',
  grant_type: 'authorization_code',
  client_id: 'client-id',
  client_secret: 'client-secret',
};

describe('oauth2.accessToken', function () {
  beforeEach(function () {
    request = nock('https://example.org:443')
      .post('/oauth/token', qs.stringify(oauthConfig))
      .times(2)
      .replyWithFile(200, path.join(__dirname, '/fixtures/access_token.json'));
  });

  beforeEach(function (done) {
    oauth2.authCode.getToken(tokenConfig, function (e, r) {
      error = e; result = r; done();
    });
  });

  beforeEach(function () {
    return oauth2.authCode
      .getToken(tokenConfig)
      .then(function (r) { resultPromise = r; })
      .catch(function (e) { errorPromise = e; });
  });

  beforeEach(function () {
    token = oauth2.accessToken.create(result);
    tokenPromise = oauth2.accessToken.create(resultPromise);
  });

  describe('#create', function () {
    it('creates an access token as result of callback api', function () {
      expect(token).to.have.property('token');
    });

    it('created an access token as result of promise api', function () {
      expect(tokenPromise).to.have.property('token');
    });
  });

  describe('when not expired', function () {
    it('returns false', function () {
      expect(token.expired()).to.be.equal(false);
      expect(tokenPromise.expired()).to.be.equal(false);
    });
  });

  describe('when expired', function () {
    beforeEach(function () {
      token.token.expires_at = startOfYesterday();
      tokenPromise.token.expires_at = startOfYesterday();
    });

    it('returns false', function () {
      expect(token.expired()).to.be.equal(true);
      expect(tokenPromise.expired()).to.be.equal(true);
    });
  });

  describe('when refreshes token', function () {
    beforeEach(function () {
      request = nock('https://example.org:443')
        .post('/oauth/token', qs.stringify(refreshConfig))
        .times(2)
        .replyWithFile(200, path.join(__dirname, '/fixtures/access_token.json'));
    });

    beforeEach(function (done) {
      result = null;
      token.refresh(function (e, r) {
        error = e; result = r; done();
      });
    });

    beforeEach(function () {
      resultPromise = null;
      errorPromise = null;

      return token.refresh()
        .then(function (r) { resultPromise = r; })
        .catch(function (e) { errorPromise = e; });
    });

    it('makes the HTTP request', function () {
      expect(request.isDone()).to.be.equal(true);
    });

    it('returns a new oauth2.accessToken as result of callback api', function () {
      expect(result).to.not.be.equal(global);
      expect(result.token).to.have.property('access_token');
    });

    it('returns a new oauth2.accessToken as result of promise api', function () {
      expect(result).to.not.be.equal(global);
      expect(resultPromise.token).to.have.property('access_token');
    });
  });

  describe('when refreshes token with additional params', function () {
    beforeEach(function () {
      request = nock('https://example.org:443')
        .post('/oauth/token', qs.stringify(refreshWithAdditionalParamsConfig))
        .times(2)
        .replyWithFile(200, path.join(__dirname, '/fixtures/access_token.json'));
    });

    beforeEach(function (done) {
      result = null;
      token.refresh({ scope: 'TESTING_EXAMPLE_SCOPES' }, function (e, r) {
        error = e; result = r; done();
      });
    });

    beforeEach(function () {
      resultPromise = null;
      errorPromise = null;

      return token.refresh({ scope: 'TESTING_EXAMPLE_SCOPES' })
        .then(function (r) { resultPromise = r; })
        .catch(function (e) { errorPromise = e; });
    });

    it('makes the HTTP request', function () {
      expect(request.isDone()).to.be.equal(true);
    });

    it('returns a new oauth2.accessToken as result of callback api', function () {
      expect(result.token).to.have.property('access_token');
    });

    it('returns a new oauth2.accessToken as result of promise api', function () {
      expect(resultPromise.token).to.have.property('access_token');
    });
  });

  describe('#revoke', function () {
    beforeEach(function () {
      request = nock('https://example.org:443')
        .post('/oauth/revoke', qs.stringify(revokeConfig))
        .times(2)
        .reply(200);
    });

    beforeEach(function (done) {
      result = null;
      token.revoke('refresh_token', function (e) {
        error = e; done();
      });
    });

    beforeEach(function () {
      resultPromise = null;
      errorPromise = null;

      return tokenPromise.revoke('refresh_token')
        .then(function (r) { resultPromise = r; })
        .catch(function (e) { errorPromise = e; });
    });

    it('make HTTP call', function () {
      expect(request.isDone()).to.be.equal(true);
    });
  });
});

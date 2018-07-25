'use strict'

const expect = require('chai').expect;
const nock = require('nock');
const sample = require('./sample');
const filterUsers = require('../utils').filterUsers
const scoreUser = require('../utils').scoreUser
const main = require('../utils').main
const config = require('../config')()

describe('GET users', function() {

  it('returns users with top followers', async () => {

    nock('https://api.github.com')
    .filteringPath(function(path) {
       return '/search/users/';
     })
    .get('/search/users/')
    .reply(200, sample.users);

    let users = await filterUsers()
    expect(users.length).to.be.equal(5)

  });

  it('returns sum of stars for the specified user', async () => {

    nock('https://api.github.com')
    .filteringPath(function(path) {
       return '/search/repos/';
     })
    .get('/search/repos/')
    .reply(200, sample.repos);

    let score = await scoreUser("phanan")
    expect(score.score).to.be.equal(422)

  });

});
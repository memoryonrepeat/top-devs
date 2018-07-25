'use strict'

const octokit = require('@octokit/rest')()
const async = require('async')
const retry = require('async-retry')
const config = require('./config')()

// If not supplied, location will set to singapore by default
config.location = process.argv[2] || config.location

// Authenticate to increase rate limit to 30rpm instead of 10rpm without token
// The authentication is synchronous to make sure the following requests
// will be authenticated.
octokit.authenticate(config.auth)

/*
First get users in the specified zone and language
To make testing easier, I am getting top 100 users in terms of followers
because there are lots of users, each of them can have thousands of repos
so fetching all of them takes a lot of time and there is rate limit also.
However in scoreUser() below I do try to get all the individual repos
using pagination to demonstrate that possibility and the same method
can always be applied here.
*/
async function filterUsers () {
  try {
    console.log('Fetching top users in the area')
    return await retry(
      async () => {
        let response = await octokit.search.users({
          q: `type:${config.type} location:${config.location} language:${
            config.language
          }`,
          sort: config.sort,
          order: config.order,
          per_page: config.per_page
        })
        console.log('Finished fetching top users in the area')
        return response.data.items
      },
      {
        retries: config.retries,
        minTimeout: config.minTimeout,
        onRetry: (error, counter) => {
          console.log(`Retrying on error ${error}. Retry count: ${counter}`)
        }
      }
    )
  } catch (e) {
    console.error(e)
  }
}

/*
Sum up stars from all the javascript repos of current user
Go through pagination if there is any (Github has no limit so some users can have thousands)
Retry if reached rate limit (most likely since current limit is 30rpm only)
*/
async function scoreUser (user) {
  try {
    console.log(`Fetching score for user ${user}`)
    return await retry(
      async () => {
        let response = await octokit.search.repos({
          q: `user:${user} language:${config.language} fork:${config.fork}`,
          per_page: config.per_page
        })
        let score = response.data.items.reduce(
          (acc, cur) => acc + cur.stargazers_count,
          0
        )
        while (octokit.hasNextPage(response)) {
          response = await octokit.getNextPage(response)
          score += response.data.items.reduce(
            (acc, cur) => acc + cur.stargazers_count,
            0
          )
        }
        console.log(`Finished fetching score for user ${user}`)
        return {
          user: user,
          score: score
        }
      },
      {
        retries: config.retries,
        minTimeout: config.minTimeout,
        onRetry: (error, counter) => {
          console.log(
            `Retrying on error ${error}. Retry count: ${counter}. Waiting time in ms: ${
              config.minTimeout
            }. Max retry: ${config.retries}`
          )
        }
      }
    )
  } catch (e) {
    console.error(e)
  }
}

/*
First get top users, then calculate each of their score and sort out the final result
*/
async function main () {
  try {
    let result = []
    let users = await filterUsers()
    let queue = async.queue(async (user, callback) => {
      let score = await scoreUser(user)
      result.push(score)
      callback()
    }, config.concurrencyLimit)
    if (!users) {
      throw new Error('Error getting user data from Github')
    }
    users.forEach(user => queue.push(user.login))
    queue.drain = () => {
      result.sort((x, y) => y.score - x.score)
      console.log(
        `\nTop developers in ${config.location} with ${
          config.language
        } language are`
      )
      result.slice(0, 3).forEach(e => console.log(e.user))
    }
  } catch (e) {
    console.error(e)
  }
}

exports.filterUsers = filterUsers
exports.scoreUser = scoreUser
exports.main = main

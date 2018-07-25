const production = {
  location: 'singapore',
  language: 'javascript',
  fork: 'false',
  type: 'user',
  sort: 'followers',
  order: 'desc',
  per_page: 100,
  auth: {
    type: 'token',
    token: 'enter github token here'
  },
  concurrencyLimit: 2,
  retries: 100,
  minTimeout: 60000
}

const test = {
  location: 'singapore',
  language: 'javascript',
  fork: 'false',
  type: 'user',
  sort: 'followers',
  order: 'desc',
  per_page: 5,
  auth: {
    type: 'token',
    token: 'enter github token here'
  },
  concurrencyLimit: 2,
  retries: 5,
  minTimeout: 60000
}

module.exports = function () {
  if (process.env.NODE_ENV === 'test') {
    return test
  }
  return production
}

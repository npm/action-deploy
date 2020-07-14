import * as core from '@actions/core'
jest.mock('@actions/core')

import * as github from '@actions/github'
import * as main from '../src/main'

import nock from 'nock'
nock.disableNetConnect()

const listDeploymentsReply = [] as any
const postDeploymentReply = { id: 42 } as any
const postStatusReply = {} as any

describe('create', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'create',
    }
    inputSpy = jest.spyOn(core, 'getInput');
    inputSpy.mockImplementation(name => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  })

  it('200', async () => {
    // arrange
    const getListDeployments = nock('https://api.github.com')
      .get('/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master')
      .reply(200, listDeploymentsReply)

    const postDeployment = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments')
      .reply(200, postDeploymentReply)

    const postStatus = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments/42/statuses')
      .reply(200, postStatusReply)

    // act
    try {
      await main.run()
    } catch (error) {
      console.error(JSON.stringify(error.toString(), null, 2))
      console.error(JSON.stringify(error.stack, null, 2))
    }

    // assert
    getListDeployments.done()
    postDeployment.done()
    postStatus.done()
  })
})

describe('finish', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'finish',
    }
    inputSpy = jest.spyOn(core, 'getInput');
    inputSpy.mockImplementation(name => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  })

  it('200', async () => {
    // arrange
    const postDeploymentStatus = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments/0/statuses')
      .reply(200, postStatusReply)

    // act
    try {
      await main.run()
    } catch (error) {
      console.error(JSON.stringify(error.toString(), null, 2))
      console.error(JSON.stringify(error.stack, null, 2))
    }

    // assert
    postDeploymentStatus.done()
  })
})

describe('delete-all', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'delete-all',
      'environment': 'staging'
    }
    inputSpy = jest.spyOn(core, 'getInput');
    inputSpy.mockImplementation(name => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  })

  it('200', async () => {
    // arrange
    const getListDeployments = nock('https://api.github.com')
      .get('/repos/owner/repo/deployments?environment=staging')
      .reply(200, [{ id: 42, url: 'https://api.github.com/repos/owner/repo/deployments/42' }])

    const postStatus = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments/42/statuses')
      .reply(200, postStatusReply)

    const deleteDeployment = nock('https://api.github.com')
      .delete('/repos/owner/repo/deployments/42')
      .reply(200)

    // act
    try {
      await main.run()
    } catch (error) {
      console.error(JSON.stringify(error.toString(), null, 2))
      console.error(JSON.stringify(error.stack, null, 2))
    }

    // assert
    getListDeployments.done()
    postStatus.done()
    deleteDeployment.done()
  })
})

describe('delete-all', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'delete',
      'deployment_id': '42'
    }
    inputSpy = jest.spyOn(core, 'getInput');
    inputSpy.mockImplementation(name => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  })

  it('200', async () => {
    // arrange
    const postStatus = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments/42/statuses')
      .reply(200, { deployment_url: 'https://api.github.com/repos/owner/repo/deployments/42' })

    const deleteDeployment = nock('https://api.github.com')
      .delete('/repos/owner/repo/deployments/42')
      .reply(200)

    // act
    try {
      await main.run()
    } catch (error) {
      console.error(JSON.stringify(error.toString(), null, 2))
      console.error(JSON.stringify(error.stack, null, 2))
    }

    // assert
    postStatus.done()
    deleteDeployment.done()
  })
})

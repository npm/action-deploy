import * as core from '@actions/core'
import * as github from '@actions/github'
import * as main from '../src/main'
import * as post from '../src/post'

import nock from 'nock'
nock.disableNetConnect()

const listDeploymentsReply = [] as any
const getBranchReply = { commit: { sha: "fake-sha" } } as any
const postDeploymentReply = { id: 42 } as any
const postStatusReply = {} as any

describe('create', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

  it('200', async () => {
    // arrange
    const inputs = {
      'token': 'fake-token',
      'type': 'create',
    } as any
    const inputSpy = jest.spyOn(core, 'getInput')
    inputSpy.mockImplementation(name => inputs[name])

    const getListDeployments = nock('https://api.github.com')
      .get('/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master')
      .reply(200, listDeploymentsReply)

    const getMainBranchSha = nock('https://api.github.com')
      .get('/repos/owner/repo/branches/master')
      .reply(200, getBranchReply)

    const postDeployment = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments')
      .reply(200, postDeploymentReply)

    const postStatus = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments/42/statuses')
      .reply(200, postStatusReply)

    // act
    await main.run()

    // assert
    getListDeployments.done()
    getMainBranchSha.done()
    postDeployment.done()
    postStatus.done()
  })

  it('400 when environment_url has no https:// prefix', async () => {
    // arrange
    const inputs = {
      'token': 'fake-token',
      'type': 'create',
      'environment_url': 'test.app'
    } as any
    const inputSpy = jest.spyOn(core, 'getInput')
    inputSpy.mockImplementation(name => inputs[name])

    const setFailedSpy = jest.spyOn(core, 'setFailed')

    const getListDeployments = nock('https://api.github.com')
      .get('/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master')
      .reply(200, listDeploymentsReply)

    const getMainBranchSha = nock('https://api.github.com')
      .get('/repos/owner/repo/branches/master')
      .reply(200, getBranchReply)

    const postDeployment = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments')
      .reply(400, { "resource": "DeploymentStatus", "code": "custom", "field": "environment_url", "message": "environment_url must use http(s) scheme" })

    // act
    try {
      await main.run()
      expect('this should not be reached').toEqual('')
    } catch (error: any) {
      expect(error.message).toEqual("environment_url must use http(s) scheme")
    }

    // assert
    getListDeployments.done()
    postDeployment.done()
    getMainBranchSha.done()
    expect(setFailedSpy.mock.calls).toHaveLength(1)
  })
})

describe('complete', () => {
  beforeEach(() => {
    process.env['STATE_deployment_id'] = '42'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'create',
      'slack_token': 'fake-slack-token',
      'slack_channel': 'fake-slack-channel'
    }
    inputSpy = jest.spyOn(core, 'getInput')
    inputSpy.mockImplementation(name => inputs[name])

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'Fake-Actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
    Object.defineProperty(github.context, 'sha', { get: () => 'fake-sha-123' })
    Object.defineProperty(github.context, 'repo', { get: () => { return { owner: 'owner', repo: 'repo' } } })
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
  })

  it('200', async () => {
    // arrange
    const listDeploymentStatus = nock('https://api.github.com')
      .get('/repos/owner/repo/deployments/42/statuses')
      .reply(200, [{ id: 10, environment_url: 'https://env.url', log_url: 'http://logs.url' }])

    const postDeploymentStatus = nock('https://api.github.com')
      .post('/repos/owner/repo/deployments/42/statuses')
      .reply(200, postStatusReply)

      const slack = nock('https://slack.com')
          .post('/api/chat.postMessage', body => body.text.includes('<@fake-actor>'))
          .reply(200, { ok: true })
    // act
    await post.post()

    // assert
    listDeploymentStatus.done()
    postDeploymentStatus.done()
    slack.done()
  })
})

describe('delete-all', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'delete-all',
      'environment': 'staging'
    }
    inputSpy = jest.spyOn(core, 'getInput')
    inputSpy.mockImplementation(name => inputs[name])

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
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
    await main.run()

    // assert
    getListDeployments.done()
    postStatus.done()
    deleteDeployment.done()
  })
})

describe('delete', () => {
  beforeEach(() => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo'

    let inputs = {} as any
    let inputSpy: jest.SpyInstance

    // @actions/core
    inputs = {
      'token': 'fake-token',
      'type': 'delete',
      'deployment_id': '42'
    }
    inputSpy = jest.spyOn(core, 'getInput')
    inputSpy.mockImplementation(name => inputs[name])

    // @actions/github
    Object.defineProperty(github.context, 'actor', { get: () => 'fake-actor' })
    Object.defineProperty(github.context, 'ref', { get: () => 'refs/heads/master' })
  })

  afterEach(() => {
    jest.resetAllMocks()
    jest.clearAllMocks()
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
    await main.run()

    // assert
    postStatus.done()
    deleteDeployment.done()
  })
})

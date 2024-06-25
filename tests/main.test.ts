import * as core from '@actions/core'
import * as github from '@actions/github'
import * as main from '../src/main'

import nock from "nock";

const postStatusReply = {} as any

describe('complete', () => {
  beforeEach(() => {
    process.env["STATE_deployment_id"] = "42";

    let inputs = {} as any;
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      token: "fake-token",
      type: "create",
      slack_token: "fake-slack-token",
      slack_channel: "fake-slack-channel",
    };
    inputSpy = jest.spyOn(core, "getInput");
    inputSpy.mockImplementation((name) => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, "actor", { get: () => "Fake-Actor" });
    Object.defineProperty(github.context, "ref", {
      get: () => "refs/heads/master",
    });
    Object.defineProperty(github.context, "sha", { get: () => "fake-sha-123" });
    Object.defineProperty(github.context, "repo", {
      get: () => {
        return { owner: "owner", repo: "repo" };
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("200", async () => {
    // arrange
    const slack = nock('https://slack.com')
        .post('/api/chat.postMessage', body => body.text.includes('<@fake-actor>'))
        .reply(200, { ok: true })

    // act
    await main.run()

    // assert
    slack.done()
  })
})

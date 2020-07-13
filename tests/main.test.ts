import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'

test('test create', () => {
  process.env['INPUT_TOKEN'] = 'fake-token'
  process.env['INPUT_TYPE'] = 'create'
  process.env['GITHUB_REPOSITORY'] = 'owner/repo'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  console.log(cp.execSync(`node ${ip}`, options).toString())
})

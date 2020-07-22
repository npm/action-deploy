import * as core from '@actions/core'

export type DeploymentStatus =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success'

export type ActionType = 'create' | 'delete' | 'delete-all'

export const DEPLOYMENT_ID_STATE_NAME = 'deployment_id'

// nullify getInput empty results
// to allow coalescence ?? operator
export function getInput (name: string, options?: core.InputOptions): string | null {
  const result = core.getInput(name, options)
  if (result === '') {
    return null
  }
  return result
}

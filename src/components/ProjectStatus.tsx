import { workflowStages, lifecycleStatuses, type Project } from '../projects/schema'
import './project-status.css'

// Accept the record, rather than independent label overrides. Publication is
// deliberately excluded: documenting a project never changes its actual status.
export function ProjectStatus({ project }: { project: Pick<Project, 'workflowStage' | 'lifecycleStatus'> }) {
  return <dl className="project-status">
    <div><dt>Workflow stage</dt><dd>{workflowStages[project.workflowStage]}</dd></div>
    <div><dt>Lifecycle</dt><dd>{lifecycleStatuses[project.lifecycleStatus]}</dd></div>
  </dl>
}

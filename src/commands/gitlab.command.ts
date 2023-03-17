import { Command } from 'nest-commander';
import { LogService } from '../services/log.service';
import { TeamService } from '../services/team.service';
import { TeamCommand } from './team.command';
import { IssueService } from '../services/issue.service';
import { JiraRepository } from '../repositories/JiraRepository';
import { JiraService } from '../services/jira.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Project } from 'src/models/project.model';
import { Repository } from 'src/models/repository.model';

@Command({
  name: 'gitlab',
  description:
    'Obtener la lista de repositorios con más ramas a los que tienes acceso en GitLab.',
})
export class GitlabCommand extends TeamCommand {
  private gitlabUrl: string;
  private gitlabToken: string;
  private timeout = 500;

  constructor(
    protected readonly logService: LogService,
    protected readonly teamService: TeamService,
    protected readonly issueService: IssueService,
    protected readonly jiraRepository: JiraRepository,
    protected readonly jiraService: JiraService,
    protected readonly configService: ConfigService,
  ) {
    super(logService, teamService, issueService);
    this.prefix = 'gitlab';
    this.gitlabUrl = configService.get('GITLAB_BASE_URL');
    this.gitlabToken = configService.get('GITLAB_TOKEN');
  }

  // Función para obtener la URL de la siguiente página a partir de la cabecera "link"
  protected getNextPageUrl(links: string | undefined): string | null {
    if (!links) {
      return null;
    }

    const matches = /<([^>]+)>; rel="next"/.exec(links);
    if (matches && matches.length > 1) {
      return matches[1];
    }

    return null;
  }

  // Función para contar el número de ramas en un proyecto de GitLab
  async getBranchCount(projectId: number): Promise<number> {
    const branchesUrl = `${this.gitlabUrl}/projects/${projectId}/repository/branches?per_page=1`;

    const response = await axios.get(branchesUrl, {
      headers: {
        'PRIVATE-TOKEN': this.gitlabToken,
      },
    });

    const totalBranches = parseInt(response.headers['x-total'], 10);

    return totalBranches;
  }

  // Función para obtener todos los proyectos a los que tienes acceso
  async getProjects(url: string, projects: Project[] = []): Promise<Project[]> {
    this.logService.log(`getProjects: ${url}`);
    const response = await axios.get<Project[]>(url, {
      headers: {
        'PRIVATE-TOKEN': this.gitlabToken,
      },
    });
    const newProjects = projects.concat(response.data);
    const nextLink = this.getNextPageUrl(response.headers.link);
    if (nextLink) {
      // Espera 1 segundo antes de hacer la siguiente solicitud
      await new Promise((resolve) => setTimeout(resolve, this.timeout));

      return this.getProjects(nextLink, newProjects);
    } else {
      return newProjects;
    }
  }

  async getRepositoriesWithMostBranches(): Promise<Repository[]> {
    const projectsUrl = `${this.gitlabUrl}/projects?membership=true`;
    const projects = await this.getProjects(projectsUrl);

    const repositories: Repository[] = [];

    for (const project of projects) {
      try {
        this.logService.log(`getBranchCount: project ${project.id}`);
        const totalBranches = await this.getBranchCount(project.id);
        this.logService.log(`getBranchCount: total branches ${totalBranches}`);
        repositories.push({
          name: project.name,
          url: project.web_url,
          branchCount: totalBranches,
        });
      } catch (error) {
        this.logService.error(
          `Error getting branch count for project "${project.name}": ${error}`,
        );
      }

      // Espera 1 segundo antes de hacer la siguiente solicitud
      await new Promise((resolve) => setTimeout(resolve, this.timeout));
    }

    // Ordenar los proyectos por el número de ramas
    const sortedProjects = repositories.sort(
      (a, b) => b.branchCount - a.branchCount,
    );

    // Imprimir la lista de proyectos con más ramas
    sortedProjects.forEach((project) => {
      this.logService.log(`${project.name}: ${project.branchCount} ramas`);
    });

    return sortedProjects;
  }

  protected async getIssues() {
    try {
      return this.getRepositoriesWithMostBranches();
    } catch (error) {
      this.logService.log(`Error getting issues: ${error}`);
    }
  }
}

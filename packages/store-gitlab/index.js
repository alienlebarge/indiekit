import process from "node:process";
import { Buffer } from "node:buffer";
import { IndiekitError } from "@indiekit/error";
import gitbeaker from "@gitbeaker/node";

const defaults = {
  branch: "main",
  instance: "https://gitlab.com",
  token: process.env.GITLAB_TOKEN,
};

/**
 * @typedef Response
 * @property {object} response - HTTP response
 */
export default class GitlabStore {
  constructor(options = {}) {
    this.id = "gitlab";
    this.meta = import.meta;
    this.name = "GitLab store";
    this.options = { ...defaults, ...options };
    this.projectId = options.projectId || `${options.user}/${options.repo}`;
  }

  get info() {
    const { instance, repo, user } = this.options;

    return {
      name: `${this.projectId} on GitLab`,
      uid: `${instance}/${user}/${repo}`,
    };
  }

  get prompts() {
    return [
      {
        type: "text",
        name: "instance",
        message: "Where is GitLab hosted?",
        description: "i.e. https://gitlab.com",
        initial: defaults.instance,
      },
      {
        type: "text",
        name: "user",
        message: "What is your GitLab username?",
      },
      {
        type: "text",
        name: "repo",
        message: "Which repository is your publication stored on?",
      },
      {
        type: "text",
        name: "branch",
        message: "Which branch are you publishing from?",
        initial: defaults.branch,
      },
    ];
  }

  /**
   * @private
   * @returns {Function} GitLab client interface
   */
  get #client() {
    const { Gitlab } = gitbeaker;
    return new Gitlab({
      host: this.options.instance,
      token: this.options.token,
    });
  }

  /**
   * Create file in a repository
   *
   * @param {string} path - Path to file
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @returns {Promise<Response>} HTTP response
   * @see {@link https://docs.gitlab.com/ee/api/repository_files.html#create-new-file-in-repository}
   */
  async createFile(path, content, message) {
    try {
      content = Buffer.from(content).toString("base64");
      await this.#client.RepositoryFiles.create(
        this.projectId,
        path,
        this.options.branch,
        content,
        message,
        {
          encoding: "base64",
        }
      );

      return true;
    } catch (error) {
      throw new IndiekitError(error.message, {
        cause: error,
        plugin: this.name,
        status: error.status,
      });
    }
  }

  /**
   * Read file in a repository
   *
   * @param {string} path - Path to file
   * @returns {Promise<Response>} A promise to the response
   * @see {@link https://docs.gitlab.com/ee/api/repository_files.html#get-file-from-repository}
   */
  async readFile(path) {
    try {
      const response = await this.#client.RepositoryFiles.show(
        this.projectId,
        path,
        this.options.branch
      );
      const content = Buffer.from(response.content, "base64").toString("utf8");

      return content;
    } catch (error) {
      throw new IndiekitError(error.message, {
        cause: error,
        plugin: this.name,
        status: error.status,
      });
    }
  }

  /**
   * Update file in a repository
   *
   * @param {string} path - Path to file
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @returns {Promise<Response>} A promise to the response
   * @see {@link https://docs.gitlab.com/ee/api/repository_files.html#update-existing-file-in-repository}
   */
  async updateFile(path, content, message) {
    try {
      content = Buffer.from(content).toString("base64");
      await this.#client.RepositoryFiles.edit(
        this.projectId,
        path,
        this.options.branch,
        content,
        message,
        {
          encoding: "base64",
        }
      );

      return true;
    } catch (error) {
      throw new IndiekitError(error.message, {
        cause: error,
        plugin: this.name,
        status: error.status,
      });
    }
  }

  /**
   * Delete file in a repository
   *
   * @param {string} path - Path to file
   * @param {string} message - Commit message
   * @returns {Promise<Response>} A promise to the response
   * @see {@link https://docs.gitlab.com/ee/api/repository_files.html#delete-existing-file-in-repository}
   */
  async deleteFile(path, message) {
    try {
      await this.#client.RepositoryFiles.remove(
        this.projectId,
        path,
        this.options.branch,
        message
      );

      return true;
    } catch (error) {
      throw new IndiekitError(error.message, {
        cause: error,
        plugin: this.name,
        status: error.status,
      });
    }
  }

  init(Indiekit) {
    Indiekit.addStore(this);
  }
}

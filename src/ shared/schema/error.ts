import type { Issue } from './type';

/**
 * Validation error class.
 * @description
 * Represents a validation error that occurs during schema parsing.
 * */
export class ValidationError extends Error {
  issues: Issue[];
  constructor(issues: Issue[] = [], message = 'Validation error') {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
    const captureStackTrace = (Error as any).captureStackTrace;

    if (typeof captureStackTrace === 'function') {
      captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Adds a validation issue to the error.
   * @param issue - The validation issue to add.
   * */
  add(issue: Issue) {
    this.issues.push(issue);
  }

  /**
   * Merges another validation error into this one.
   * @param err - The validation error to merge.
   * */
  merge(err: unknown) {
    const isValidationError = err instanceof ValidationError;

    if (isValidationError) this.issues.push(...err.issues);
    else {
      const message = (err as Error)?.message ?? String(err);
      this.issues.push({ path: [], code: 'custom', message });
    }
  }

  get hasIssues() {
    return this.issues.length > 0;
  }

  toJSON() {
    return { name: this.name, message: this.message, issues: this.issues };
  }
}

/**
 * Represents an error that occurs during asynchronous parsing.
 * @description
 * This error is thrown when async validations are encountered.
 * */
export class AsyncParseError extends Error {
  constructor() {
    super('Encountered async validations; use parseAsync()');
    this.name = 'AsyncParseError';
  }
}

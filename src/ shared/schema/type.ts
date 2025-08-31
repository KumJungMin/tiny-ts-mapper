export type Path = (string | number)[];

/**
 * Represents a validation issue code.
 */
export type IssueCode =
  | 'invalid_type'
  | 'too_small'
  | 'too_big'
  | 'invalid_string'
  | 'invalid_enum'
  | 'invalid_array'
  | 'invalid_object'
  | 'unrecognized_keys'
  | 'custom';

/**
 * Represents a validation issue.
 */
export interface Issue {
  path: Path;
  code: IssueCode;
  message: string;
}

export default abstract class Validator<T> {
  /**
   * Validates a record
   *
   * @param record Record to validate
   * @returns A list of validation errors. If an empty result is returned, the result is valid
   */
  public abstract validate(record: T): Promise<string[]>;
}

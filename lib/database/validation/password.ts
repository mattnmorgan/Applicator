import Field from "@/lib/database/types/field";

/**
 * Hash password fields in data
 * @param fields The table field definitions
 * @param data The data to process
 * @returns Processed data with hashed passwords
 */
export async function hashPasswordFields(
  fields: Field[],
  data: Record<string, any>
): Promise<Record<string, any>> {
  const passwordFields = fields.filter((field) => field.type === "password");

  if (passwordFields.length === 0) {
    return data;
  }

  const bcrypt = await import("bcryptjs");
  const processedData = { ...data };

  for (const field of passwordFields) {
    const value = processedData[field.name];
    if (value && typeof value === "string") {
      // Only hash if it's not already a bcrypt hash (bcrypt hashes start with $2)
      if (!value.startsWith("$2")) {
        processedData[field.name] = await bcrypt.hash(value, 10);
      }
    }
  }

  return processedData;
}
